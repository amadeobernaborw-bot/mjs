-- =====================================================================
-- MJ STORE — Migration 008: 5 clientes existentes con deuda demo
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- Requiere: migrations 001 → 007 ya ejecutadas
-- Idempotente: salta si ya hay ≥ 5 invoices con installments pendientes/vencidas.
-- =====================================================================

DO $$
DECLARE
  existing int;
  i int;
  cli_id uuid;
  prod1_id uuid;
  prod1_name text;
  prod1_price_ars numeric;
  prod1_price_usd numeric;
  prod1_image_url text;
  prod2_id uuid;
  prod2_name text;
  prod2_price_ars numeric;
  prod2_price_usd numeric;
  prod2_image_url text;
  has_prod2 boolean;
  total_ars numeric;
  total_usd numeric;
  qty1 int;
  inv_id uuid;
  items jsonb;
  picked_clients uuid[] := ARRAY[]::uuid[];
BEGIN
  -- Check: si ya hay 5+ facturas con installments vencidas → no duplicar
  SELECT count(DISTINCT i.id)
    INTO existing
    FROM invoices i
    JOIN invoice_installments ii ON ii.invoice_id = i.id
   WHERE ii.status = 'vencida';

  IF existing >= 5 THEN
    RAISE NOTICE 'Saltado: ya existen % facturas con cuotas vencidas (≥ 5).', existing;
    RETURN;
  END IF;

  FOR i IN 1..5 LOOP
    -- Cliente nuevo (evita repetir)
    SELECT id INTO cli_id
      FROM clients
      WHERE id <> ALL(picked_clients)
      ORDER BY random()
      LIMIT 1;

    IF cli_id IS NULL THEN
      RAISE NOTICE 'Sin clientes disponibles en iter %, abortando loop.', i;
      EXIT;
    END IF;

    picked_clients := array_append(picked_clients, cli_id);

    -- Producto principal
    SELECT id, name, price_ars, price_usd, image_url
      INTO prod1_id, prod1_name, prod1_price_ars, prod1_price_usd, prod1_image_url
      FROM products
      WHERE is_active = true AND price_ars IS NOT NULL AND price_ars > 0
      ORDER BY random()
      LIMIT 1;

    -- Producto secundario (40% probabilidad)
    prod2_id := NULL; has_prod2 := false;
    IF random() < 0.4 THEN
      SELECT id, name, price_ars, price_usd, image_url
        INTO prod2_id, prod2_name, prod2_price_ars, prod2_price_usd, prod2_image_url
        FROM products
        WHERE is_active = true AND price_ars IS NOT NULL AND price_ars > 0 AND id <> prod1_id
        ORDER BY random()
        LIMIT 1;
      has_prod2 := (prod2_id IS NOT NULL);
    END IF;

    qty1 := 1;
    items := jsonb_build_array(jsonb_build_object(
      'name', prod1_name,
      'qty', qty1,
      'price_ars', COALESCE(prod1_price_ars, 0),
      'price_usd', prod1_price_usd,
      'image_url', prod1_image_url
    ));
    total_ars := COALESCE(prod1_price_ars, 0) * qty1;
    total_usd := COALESCE(prod1_price_usd, 0) * qty1;

    IF has_prod2 THEN
      items := items || jsonb_build_array(jsonb_build_object(
        'name', prod2_name,
        'qty', 1,
        'price_ars', COALESCE(prod2_price_ars, 0),
        'price_usd', prod2_price_usd,
        'image_url', prod2_image_url
      ));
      total_ars := total_ars + COALESCE(prod2_price_ars, 0);
      total_usd := total_usd + COALESCE(prod2_price_usd, 0);
    END IF;

    -- Factura
    INSERT INTO invoices (client_id, type, items, total_ars, total_usd, status, payment_method, created_at)
    VALUES (
      cli_id,
      'factura',
      items,
      total_ars,
      NULLIF(total_usd, 0),
      'aprobado',
      'Crédito 6 cuotas',
      now() - interval '30 days'
    )
    RETURNING id INTO inv_id;

    -- 6 cuotas (2 vencidas, 1 próxima ≤ 3 días, 3 futuras)
    INSERT INTO invoice_installments (invoice_id, installment_num, amount, due_date, status, paid_at) VALUES
      (inv_id, 1, round(total_ars / 6, 2), CURRENT_DATE - 60, 'vencida',   NULL),
      (inv_id, 2, round(total_ars / 6, 2), CURRENT_DATE - 30, 'vencida',   NULL),
      (inv_id, 3, round(total_ars / 6, 2), CURRENT_DATE + 2,  'pendiente', NULL),
      (inv_id, 4, round(total_ars / 6, 2), CURRENT_DATE + 30, 'pendiente', NULL),
      (inv_id, 5, round(total_ars / 6, 2), CURRENT_DATE + 60, 'pendiente', NULL),
      (inv_id, 6, total_ars - round(total_ars / 6, 2) * 5, CURRENT_DATE + 90, 'pendiente', NULL);
  END LOOP;

  RAISE NOTICE 'Seeded 5 clientes con deuda (5 facturas × 6 cuotas = 30 installments).';
END $$;

-- =====================================================================
-- Verificar:
--   SELECT count(*) FROM invoice_installments WHERE status IN ('vencida','pendiente') AND due_date <= current_date + 3;
--   SELECT c.name, count(ii.*) FILTER (WHERE ii.status='vencida') vencidas, sum(ii.amount) FILTER (WHERE ii.status IN ('vencida','pendiente')) deuda
--     FROM clients c
--     JOIN invoices i ON i.client_id = c.id
--     JOIN invoice_installments ii ON ii.invoice_id = i.id
--    GROUP BY c.id, c.name
--    HAVING count(ii.*) FILTER (WHERE ii.status='vencida') > 0
--    ORDER BY deuda DESC;
-- =====================================================================
