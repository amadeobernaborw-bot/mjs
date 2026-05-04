-- =====================================================================
-- MJ STORE — Migration 002: admin taxonomy + caja + dashboard
-- =====================================================================
-- Adds:
--   * Taxonomy catalog tables (types, models, capacities, conditions)
--   * Cash movements + categories + payment methods
--   * New columns on products & trade_in_models for cascading dropdowns
--   * Hero image url on store_profile
-- Idempotent (uses IF NOT EXISTS / ON CONFLICT DO NOTHING)
-- =====================================================================

-- ---------- store_profile: hero image ----------
ALTER TABLE store_profile
  ADD COLUMN IF NOT EXISTS hero_image_url text;

-- ---------- products: cascade columns ----------
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS model      text,
  ADD COLUMN IF NOT EXISTS capacity   text,
  ADD COLUMN IF NOT EXISTS condition  text;

-- ---------- trade_in_models: cascade columns ----------
ALTER TABLE trade_in_models
  ADD COLUMN IF NOT EXISTS type_name text DEFAULT 'iPhone',
  ADD COLUMN IF NOT EXISTS model     text,
  ADD COLUMN IF NOT EXISTS capacity  text;

-- ---------- catalog: types ----------
CREATE TABLE IF NOT EXISTS catalog_types (
  id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO catalog_types (name) VALUES
  ('iPhone'),('Mac'),('iPad'),('Watch'),('AirPods'),('Accesorios')
ON CONFLICT (name) DO NOTHING;

-- ---------- catalog: models per type ----------
CREATE TABLE IF NOT EXISTS catalog_models (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type_name text NOT NULL,
  name      text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (type_name, name)
);

INSERT INTO catalog_models (type_name, name) VALUES
  ('iPhone', 'iPhone 15 Pro Max'),
  ('iPhone', 'iPhone 15 Pro'),
  ('iPhone', 'iPhone 15 Plus'),
  ('iPhone', 'iPhone 15'),
  ('iPhone', 'iPhone 14 Pro Max'),
  ('iPhone', 'iPhone 14 Pro'),
  ('iPhone', 'iPhone 14'),
  ('iPhone', 'iPhone 13 Pro Max'),
  ('iPhone', 'iPhone 13 Pro'),
  ('iPhone', 'iPhone 13'),
  ('iPhone', 'iPhone 13 mini'),
  ('iPhone', 'iPhone 12 Pro Max'),
  ('iPhone', 'iPhone 12 Pro'),
  ('iPhone', 'iPhone 12'),
  ('iPhone', 'iPhone SE 2022'),
  ('Mac',    'MacBook Air M2 13"'),
  ('Mac',    'MacBook Air M2 15"'),
  ('Mac',    'MacBook Pro M3 14"'),
  ('Mac',    'MacBook Pro M3 16"'),
  ('Mac',    'iMac M3 24"'),
  ('Mac',    'Mac mini M2'),
  ('iPad',   'iPad Pro 11" M4'),
  ('iPad',   'iPad Pro 13" M4'),
  ('iPad',   'iPad Air 11" M2'),
  ('iPad',   'iPad Air 13" M2'),
  ('iPad',   'iPad 10ma gen'),
  ('iPad',   'iPad mini 6'),
  ('Watch',  'Watch Series 9'),
  ('Watch',  'Watch Ultra 2'),
  ('Watch',  'Watch SE'),
  ('AirPods','AirPods 2da gen'),
  ('AirPods','AirPods 3ra gen'),
  ('AirPods','AirPods Pro 2'),
  ('AirPods','AirPods Max'),
  ('Accesorios','Cable USB-C'),
  ('Accesorios','Cargador 20W'),
  ('Accesorios','MagSafe'),
  ('Accesorios','Funda iPhone'),
  ('Accesorios','Apple Pencil')
ON CONFLICT (type_name, name) DO NOTHING;

-- ---------- catalog: capacities (global, optional per-model later) ----------
CREATE TABLE IF NOT EXISTS catalog_capacities (
  id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  position int NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO catalog_capacities (name, position) VALUES
  ('64GB',  10),('128GB', 20),('256GB', 30),('512GB', 40),('1TB',   50),('2TB',   60),
  ('8GB RAM',  100),('16GB RAM', 110),('24GB RAM', 120),('32GB RAM', 130)
ON CONFLICT (name) DO NOTHING;

-- ---------- catalog: conditions ----------
CREATE TABLE IF NOT EXISTS catalog_conditions (
  id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO catalog_conditions (name) VALUES
  ('Nuevo sellado'),
  ('Como nuevo'),
  ('Usado — Excelente'),
  ('Usado — Bueno'),
  ('Refurbished'),
  ('Open box')
ON CONFLICT (name) DO NOTHING;

-- ---------- cash: payment methods ----------
CREATE TABLE IF NOT EXISTS payment_methods (
  id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO payment_methods (name) VALUES
  ('Efectivo'),('Transferencia'),('MercadoPago'),
  ('Débito'),('Crédito 1 cuota'),('Crédito 3 cuotas'),
  ('Crédito 6 cuotas'),('Crédito 12 cuotas'),('USD efectivo'),('USDT')
ON CONFLICT (name) DO NOTHING;

-- ---------- cash: categories ----------
CREATE TABLE IF NOT EXISTS cash_categories (
  id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('entrada','salida','ambos')) DEFAULT 'ambos',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name, type)
);
INSERT INTO cash_categories (name, type) VALUES
  ('Venta',          'entrada'),
  ('Canje recibido', 'entrada'),
  ('Otros ingresos', 'entrada'),
  ('Compra stock',   'salida'),
  ('Sueldos',        'salida'),
  ('Alquiler',       'salida'),
  ('Servicios',      'salida'),
  ('Marketing',      'salida'),
  ('Impuestos',      'salida'),
  ('Otros gastos',   'salida'),
  ('Ajuste de caja', 'ambos')
ON CONFLICT (name, type) DO NOTHING;

-- ---------- cash: movements ----------
CREATE TABLE IF NOT EXISTS cash_movements (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type          text NOT NULL CHECK (type IN ('entrada','salida')),
  category      text NOT NULL,
  detail        text,
  amount        numeric(14,2) NOT NULL CHECK (amount >= 0),
  payment_method text NOT NULL,
  occurred_at   timestamptz NOT NULL DEFAULT now(),
  created_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cash_movements_occurred_at ON cash_movements(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_cash_movements_type        ON cash_movements(type);
CREATE INDEX IF NOT EXISTS idx_cash_movements_category    ON cash_movements(category);

-- ---------- RLS ----------
ALTER TABLE catalog_types       ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_models      ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_capacities  ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_conditions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_categories     ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods     ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_movements      ENABLE ROW LEVEL SECURITY;

-- Public read for catalog (used by storefront's calculator)
DO $$ BEGIN
  CREATE POLICY catalog_types_read       ON catalog_types       FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY catalog_models_read      ON catalog_models      FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY catalog_capacities_read  ON catalog_capacities  FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY catalog_conditions_read  ON catalog_conditions  FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Auth-only write for catalog tables
DO $$ BEGIN
  CREATE POLICY catalog_types_write      ON catalog_types       FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY catalog_models_write     ON catalog_models      FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY catalog_capacities_write ON catalog_capacities  FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY catalog_conditions_write ON catalog_conditions  FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Cash tables: auth-only (full access)
DO $$ BEGIN
  CREATE POLICY cash_categories_all      ON cash_categories     FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY payment_methods_all      ON payment_methods     FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY cash_movements_all       ON cash_movements      FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =====================================================================
-- DONE
-- =====================================================================
