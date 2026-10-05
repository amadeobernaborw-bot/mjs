-- =====================================================================
-- MJ STORE — Migration 006: ajustes de catálogo + datos demo
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- Requiere: migrations 001 → 005 ya ejecutadas
-- =====================================================================

-- ---------- 1) Eliminar capacidades de RAM (solo memoria de teléfono) ----------
DELETE FROM catalog_capacities WHERE name ILIKE '%RAM%';

-- ---------- 2) Tres condiciones de teléfono ----------
INSERT INTO catalog_conditions (name) VALUES
  ('Excelente'),
  ('Bueno')
ON CONFLICT (name) DO NOTHING;
-- 'Nuevo sellado' ya existe desde migration 002

-- ---------- 3) Stock aleatorio 0-20 en productos activos ----------
UPDATE products
SET stock = floor(random() * 21)::int
WHERE is_active = true;

-- ---------- 4) 20 modelos iPhone demo para Plan Canje ----------
INSERT INTO trade_in_models (device_model, type_name, model, capacity, price_excellent, price_good, price_damaged, is_active) VALUES
  ('iPhone SE 2022 64GB',     'iPhone', 'iPhone SE 2022',     '64GB',    220000,  170000,  100000, true),
  ('iPhone SE 2022 128GB',    'iPhone', 'iPhone SE 2022',     '128GB',   260000,  205000,  125000, true),
  ('iPhone 12 64GB',          'iPhone', 'iPhone 12',          '64GB',    340000,  270000,  170000, true),
  ('iPhone 12 128GB',         'iPhone', 'iPhone 12',          '128GB',   390000,  310000,  195000, true),
  ('iPhone 12 Pro 128GB',     'iPhone', 'iPhone 12 Pro',      '128GB',   480000,  390000,  240000, true),
  ('iPhone 12 Pro Max 256GB', 'iPhone', 'iPhone 12 Pro Max',  '256GB',   580000,  470000,  290000, true),
  ('iPhone 13 128GB',         'iPhone', 'iPhone 13',          '128GB',   470000,  385000,  240000, true),
  ('iPhone 13 256GB',         'iPhone', 'iPhone 13',          '256GB',   540000,  445000,  280000, true),
  ('iPhone 13 mini 128GB',    'iPhone', 'iPhone 13 mini',     '128GB',   420000,  335000,  210000, true),
  ('iPhone 13 Pro 256GB',     'iPhone', 'iPhone 13 Pro',      '256GB',   680000,  555000,  340000, true),
  ('iPhone 13 Pro Max 256GB', 'iPhone', 'iPhone 13 Pro Max',  '256GB',   780000,  640000,  395000, true),
  ('iPhone 14 128GB',         'iPhone', 'iPhone 14',          '128GB',   580000,  475000,  295000, true),
  ('iPhone 14 256GB',         'iPhone', 'iPhone 14',          '256GB',   650000,  535000,  330000, true),
  ('iPhone 14 Pro 256GB',     'iPhone', 'iPhone 14 Pro',      '256GB',   850000,  700000,  430000, true),
  ('iPhone 14 Pro Max 512GB', 'iPhone', 'iPhone 14 Pro Max',  '512GB',  1080000,  890000,  555000, true),
  ('iPhone 15 128GB',         'iPhone', 'iPhone 15',          '128GB',   720000,  595000,  370000, true),
  ('iPhone 15 256GB',         'iPhone', 'iPhone 15',          '256GB',   810000,  670000,  415000, true),
  ('iPhone 15 Pro 256GB',     'iPhone', 'iPhone 15 Pro',      '256GB',  1050000,  870000,  540000, true),
  ('iPhone 15 Pro Max 512GB', 'iPhone', 'iPhone 15 Pro Max',  '512GB',  1320000, 1090000,  680000, true),
  ('iPhone 15 Pro Max 1TB',   'iPhone', 'iPhone 15 Pro Max',  '1TB',    1480000, 1220000,  760000, true)
ON CONFLICT DO NOTHING;

-- ---------- 5) 40 documentos demo (20 facturas + 20 presupuestos) ----------
DO $$
DECLARE
  cli_count int;
  prod_count int;
  i int;
  cli_id uuid;
  -- prod1
  prod1_id uuid;
  prod1_name text;
  prod1_price_ars numeric;
  prod1_price_usd numeric;
  prod1_image_url text;
  -- prod2 (opcional)
  prod2_id uuid;
  prod2_name text;
  prod2_price_ars numeric;
  prod2_price_usd numeric;
  prod2_image_url text;
  has_prod2 boolean;
  -- otros
  inv_type text;
  inv_status text;
  pay text;
  total_ars numeric;
  total_usd numeric;
  qty1 int;
  qty2 int;
  date_offset int;
  pmethods text[] := ARRAY[
    'Efectivo','Transferencia','MercadoPago','Débito',
    'Crédito 1 cuota','Crédito 3 cuotas','Crédito 6 cuotas','Crédito 12 cuotas',
    'USD efectivo','USDT'
  ];
  items jsonb;
BEGIN
  SELECT count(*) INTO cli_count FROM clients;
  SELECT count(*) INTO prod_count FROM products WHERE is_active = true;
  IF cli_count = 0 OR prod_count = 0 THEN
    RAISE NOTICE 'Saltado: necesita clientes y productos activos para sembrar documentos.';
    RETURN;
  END IF;

  FOR i IN 1..40 LOOP
    -- Reset prod2 cada iteración
    prod2_id := NULL;
    prod2_name := NULL;
    prod2_price_ars := NULL;
    prod2_price_usd := NULL;
    prod2_image_url := NULL;
    has_prod2 := false;

    SELECT id INTO cli_id FROM clients ORDER BY random() LIMIT 1;

    SELECT id, name, price_ars, price_usd, image_url
      INTO prod1_id, prod1_name, prod1_price_ars, prod1_price_usd, prod1_image_url
      FROM products WHERE is_active = true ORDER BY random() LIMIT 1;

    IF random() < 0.35 THEN
      SELECT id, name, price_ars, price_usd, image_url
        INTO prod2_id, prod2_name, prod2_price_ars, prod2_price_usd, prod2_image_url
        FROM products WHERE is_active = true AND id <> prod1_id
        ORDER BY random() LIMIT 1;
      has_prod2 := (prod2_id IS NOT NULL);
    END IF;

    qty1 := 1 + (random())::int;  -- 1 ó 2
    qty2 := 1;

    IF i <= 20 THEN
      inv_type := 'factura';
      inv_status := CASE
        WHEN i <= 12 THEN 'aprobado'
        WHEN i <= 17 THEN 'pendiente'
        ELSE 'cancelado'
      END;
    ELSE
      inv_type := 'presupuesto';
      inv_status := CASE
        WHEN i <= 34 THEN 'pendiente'
        WHEN i <= 38 THEN 'aprobado'
        ELSE 'cancelado'
      END;
    END IF;

    pay := pmethods[1 + floor(random() * array_length(pmethods, 1))::int];
    date_offset := floor(random() * 56)::int;  -- 0 a 56 días atrás

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
        'qty', qty2,
        'price_ars', COALESCE(prod2_price_ars, 0),
        'price_usd', prod2_price_usd,
        'image_url', prod2_image_url
      ));
      total_ars := total_ars + COALESCE(prod2_price_ars, 0) * qty2;
      total_usd := total_usd + COALESCE(prod2_price_usd, 0) * qty2;
    END IF;

    INSERT INTO invoices (client_id, type, items, total_ars, total_usd, status, payment_method, created_at)
    VALUES (
      cli_id,
      inv_type,
      items,
      total_ars,
      NULLIF(total_usd, 0),
      inv_status,
      pay,
      now() - (date_offset || ' days')::interval
    );
  END LOOP;

  RAISE NOTICE 'Seeded 40 demo documents (20 facturas + 20 presupuestos).';
END $$;

-- =====================================================================
-- Verificación:
--   SELECT name FROM catalog_capacities WHERE name ILIKE '%RAM%';  -- esperado: 0 filas
--   SELECT name FROM catalog_conditions ORDER BY name;             -- incluye Excelente, Bueno
--   SELECT count(*) FROM products WHERE stock > 0;                 -- la mayoría
--   SELECT count(*) FROM trade_in_models WHERE type_name='iPhone'; -- 20+
--   SELECT type, count(*) FROM invoices GROUP BY type;             -- ~20/20 nuevos
-- =====================================================================
