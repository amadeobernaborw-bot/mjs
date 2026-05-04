-- ============================================================
-- MJ STORE — Inicialización de base de datos
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Extensions
create extension if not exists "pgcrypto";

-- ============ TABLES ============

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('iPhone','Mac','iPad','Watch','AirPods','Accesorios')),
  description text,
  price_ars numeric,
  price_usd numeric,
  stock integer default 0,
  image_url text,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists trade_in_models (
  id uuid primary key default gen_random_uuid(),
  device_model text not null,
  price_excellent numeric,
  price_good numeric,
  price_damaged numeric,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists store_profile (
  id uuid primary key default gen_random_uuid(),
  store_name text default 'MJ STORE',
  logo_url text,
  whatsapp text default '+5492994565758',
  instagram_url text,
  facebook_url text,
  google_maps_url text,
  address text,
  exchange_rate_ars_per_usd numeric,
  updated_at timestamptz default now()
);

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  notes text,
  created_at timestamptz default now()
);

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number serial,
  client_id uuid references clients(id) on delete set null,
  type text default 'presupuesto' check (type in ('presupuesto','factura')),
  items jsonb not null default '[]'::jsonb,
  total_ars numeric,
  total_usd numeric,
  status text default 'pendiente' check (status in ('pendiente','aprobado','cancelado')),
  created_at timestamptz default now()
);

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  customer_name text,
  phone_number text,
  device_interest text,
  trade_in_device_id uuid references trade_in_models(id) on delete set null,
  status text default 'nuevo' check (status in ('nuevo','contactado','cerrado')),
  notes text,
  created_at timestamptz default now()
);

-- ============ SEED ============
insert into store_profile (store_name, whatsapp)
select 'MJ STORE', '+5492994565758'
where not exists (select 1 from store_profile);

-- ============ ROW LEVEL SECURITY ============
alter table products         enable row level security;
alter table trade_in_models  enable row level security;
alter table store_profile    enable row level security;
alter table clients          enable row level security;
alter table invoices         enable row level security;
alter table leads            enable row level security;

-- Helper: drop policy if exists wrapper
do $$ begin
  -- products: público lee activos; admin todo
  drop policy if exists products_public_read on products;
  drop policy if exists products_admin_all   on products;
  drop policy if exists tradein_public_read  on trade_in_models;
  drop policy if exists tradein_admin_all    on trade_in_models;
  drop policy if exists profile_public_read  on store_profile;
  drop policy if exists profile_admin_all    on store_profile;
  drop policy if exists clients_admin_all    on clients;
  drop policy if exists invoices_admin_all   on invoices;
  drop policy if exists leads_public_insert  on leads;
  drop policy if exists leads_admin_all      on leads;
end $$;

-- products: público lee, autenticado modifica
create policy products_public_read on products
  for select using (true);
create policy products_admin_all on products
  for all to authenticated using (true) with check (true);

-- trade_in: público lee, autenticado modifica
create policy tradein_public_read on trade_in_models
  for select using (true);
create policy tradein_admin_all on trade_in_models
  for all to authenticated using (true) with check (true);

-- store_profile: público lee, autenticado modifica
create policy profile_public_read on store_profile
  for select using (true);
create policy profile_admin_all on store_profile
  for all to authenticated using (true) with check (true);

-- clients: solo admin
create policy clients_admin_all on clients
  for all to authenticated using (true) with check (true);

-- invoices: solo admin
create policy invoices_admin_all on invoices
  for all to authenticated using (true) with check (true);

-- leads: público puede insertar (formulario), solo admin lee/actualiza
create policy leads_public_insert on leads
  for insert with check (true);
create policy leads_admin_all on leads
  for all to authenticated using (true) with check (true);

-- ============ STORAGE BUCKETS ============
-- Crear desde el Dashboard (Storage → New bucket):
--   1. product-images  (Public: ON)
--   2. store-assets    (Public: ON)
--
-- O ejecutar:
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('store-assets', 'store-assets', true)
on conflict (id) do nothing;

-- Storage policies: público puede leer; autenticado puede subir/eliminar
do $$ begin
  drop policy if exists "Public read product-images" on storage.objects;
  drop policy if exists "Auth write product-images"  on storage.objects;
  drop policy if exists "Auth delete product-images" on storage.objects;
  drop policy if exists "Public read store-assets"   on storage.objects;
  drop policy if exists "Auth write store-assets"    on storage.objects;
  drop policy if exists "Auth delete store-assets"   on storage.objects;
end $$;

create policy "Public read product-images" on storage.objects
  for select using (bucket_id = 'product-images');
create policy "Auth write product-images" on storage.objects
  for insert to authenticated with check (bucket_id = 'product-images');
create policy "Auth delete product-images" on storage.objects
  for delete to authenticated using (bucket_id = 'product-images');

create policy "Public read store-assets" on storage.objects
  for select using (bucket_id = 'store-assets');
create policy "Auth write store-assets" on storage.objects
  for insert to authenticated with check (bucket_id = 'store-assets');
create policy "Auth delete store-assets" on storage.objects
  for delete to authenticated using (bucket_id = 'store-assets');
