-- ============================================================
-- 010 — Layouts de widgets por usuario y pantalla (Inicio del admin)
-- ============================================================
-- * dashboard_layouts: una fila por (usuario, pantalla) con los items en jsonb:
--   [{ widget_id, x, y, w, h, enabled, config }] en unidades de la grilla de
--   escritorio (8 columnas, filas sin límite).
-- * El catálogo de widgets vive en el código: la base no guarda títulos ni
--   límites. Los ids desconocidos se descartan al leer (mergeLayout).
-- * save_dashboard_layout es la ÚNICA vía de escritura: valida la forma, los
--   rangos y que no haya superposiciones, y hace concurrencia optimista con
--   updated_at (dos pestañas no se pisan en silencio). Los usuarios
--   autenticados solo tienen SELECT directo sobre la tabla.
-- Idempotente: se puede correr más de una vez.

create table if not exists public.dashboard_layouts (
  user_id    uuid        not null default auth.uid() references auth.users(id) on delete cascade,
  screen     text        not null,
  items      jsonb       not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, screen)
);

do $$
begin
  alter table public.dashboard_layouts
    add constraint dashboard_layouts_screen_chk check (screen ~ '^[a-z0-9_]{1,32}$');
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.dashboard_layouts
    add constraint dashboard_layouts_items_chk
    check (jsonb_typeof(items) = 'array' and octet_length(items::text) <= 262144);
exception when duplicate_object then null;
end $$;

alter table public.dashboard_layouts enable row level security;

-- Lectura directa de la fila propia; la escritura pasa por la función
revoke all on public.dashboard_layouts from anon, authenticated;
grant select on public.dashboard_layouts to authenticated;

drop policy if exists dashboard_layouts_own on public.dashboard_layouts;
drop policy if exists dashboard_layouts_own_read on public.dashboard_layouts;
create policy dashboard_layouts_own_read on public.dashboard_layouts
  for select to authenticated
  using (user_id = (select auth.uid()));

-- ------------------------------------------------------------
-- Guardado validado
-- ------------------------------------------------------------
-- SECURITY DEFINER porque authenticated no tiene INSERT/UPDATE sobre la tabla.
-- Es seguro: solo escribe la fila de auth.uid(). search_path vacío y nombres
-- calificados para que no se pueda secuestrar ningún objeto.
create or replace function public.save_dashboard_layout(
  p_screen text,
  p_items jsonb,
  p_expected_updated_at timestamptz default null
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_now     timestamptz := clock_timestamp();
  v_current timestamptz;
  v_item    jsonb;
  v_clean   jsonb := '[]'::jsonb;
  v_ids     text[] := '{}';
  v_id      text;
  v_x numeric; v_y numeric; v_w numeric; v_h numeric;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if p_screen is null or p_screen !~ '^[a-z0-9_]{1,32}$' then
    raise exception 'invalid_layout: screen';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'invalid_layout: items must be an array';
  end if;
  -- Tamaño antes de recorrer nada (64 items × config de 2 KB entra holgado)
  if octet_length(p_items::text) > 262144 then
    raise exception 'invalid_layout: payload too large';
  end if;
  if jsonb_array_length(p_items) > 64 then
    raise exception 'invalid_layout: too many items';
  end if;

  for v_item in select value from jsonb_array_elements(p_items) loop
    if coalesce(jsonb_typeof(v_item), '') <> 'object' then
      raise exception 'invalid_layout: item must be an object';
    end if;

    v_id := v_item->>'widget_id';
    if coalesce(jsonb_typeof(v_item->'widget_id'), '') <> 'string' or v_id !~ '^[a-z0-9_]{1,64}$' then
      raise exception 'invalid_layout: widget_id';
    end if;
    if v_id = any(v_ids) then
      raise exception 'invalid_layout: duplicated widget_id %', v_id;
    end if;
    v_ids := v_ids || v_id;

    if coalesce(jsonb_typeof(v_item->'x'), '') <> 'number' or coalesce(jsonb_typeof(v_item->'y'), '') <> 'number'
       or coalesce(jsonb_typeof(v_item->'w'), '') <> 'number' or coalesce(jsonb_typeof(v_item->'h'), '') <> 'number' then
      raise exception 'invalid_layout: coordinates of %', v_id;
    end if;

    -- Se valida como numeric (acepta 8.0 o 1e10 sin romper el cast) y recién después se pasa a int
    v_x := (v_item->'x')::numeric;
    v_y := (v_item->'y')::numeric;
    v_w := (v_item->'w')::numeric;
    v_h := (v_item->'h')::numeric;
    if v_x % 1 <> 0 or v_y % 1 <> 0 or v_w % 1 <> 0 or v_h % 1 <> 0 then
      raise exception 'invalid_layout: coordinates of % must be integers', v_id;
    end if;
    if v_x < 0 or v_w < 1 or v_x + v_w > 8 or v_y < 0 or v_y > 500 or v_h < 1 or v_h > 16 then
      raise exception 'invalid_layout: % out of bounds', v_id;
    end if;

    if coalesce(jsonb_typeof(v_item->'enabled'), '') <> 'boolean' then
      raise exception 'invalid_layout: enabled of %', v_id;
    end if;
    if v_item ? 'config' and (coalesce(jsonb_typeof(v_item->'config'), '') <> 'object'
       or octet_length((v_item->'config')::text) > 2048) then
      raise exception 'invalid_layout: config of %', v_id;
    end if;

    -- Solo se guardan las claves conocidas
    v_clean := v_clean || jsonb_build_array(jsonb_build_object(
      'widget_id', v_id,
      'x', v_x::int, 'y', v_y::int, 'w', v_w::int, 'h', v_h::int,
      'enabled', (v_item->>'enabled')::boolean,
      'config', coalesce(v_item->'config', '{}'::jsonb)
    ));
  end loop;

  -- Ningún par de widgets visibles puede superponerse (≤ 64 items: ≤ 2016 pares)
  if exists (
    select 1
    from jsonb_array_elements(v_clean) with ordinality as a(it, i)
    join jsonb_array_elements(v_clean) with ordinality as b(it, j) on a.i < b.j
    where (a.it->>'enabled')::boolean and (b.it->>'enabled')::boolean
      and (a.it->>'x')::int < (b.it->>'x')::int + (b.it->>'w')::int
      and (b.it->>'x')::int < (a.it->>'x')::int + (a.it->>'w')::int
      and (a.it->>'y')::int < (b.it->>'y')::int + (b.it->>'h')::int
      and (b.it->>'y')::int < (a.it->>'y')::int + (a.it->>'h')::int
  ) then
    raise exception 'invalid_layout: overlapping widgets';
  end if;

  select updated_at into v_current
  from public.dashboard_layouts
  where user_id = v_uid and screen = p_screen
  for update;

  if found then
    if p_expected_updated_at is null or v_current <> p_expected_updated_at then
      raise exception 'layout_conflict';
    end if;
    update public.dashboard_layouts
      set items = v_clean, updated_at = v_now
      where user_id = v_uid and screen = p_screen;
  else
    begin
      insert into public.dashboard_layouts (user_id, screen, items, updated_at)
      values (v_uid, p_screen, v_clean, v_now);
    exception when unique_violation then
      raise exception 'layout_conflict';
    end;
  end if;

  return v_now;
end;
$$;

revoke all on function public.save_dashboard_layout(text, jsonb, timestamptz) from public, anon;
grant execute on function public.save_dashboard_layout(text, jsonb, timestamptz) to authenticated;
