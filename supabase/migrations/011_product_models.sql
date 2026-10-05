-- =====================================================================
-- MJ STORE — Migration 011: inventario por modelos con variantes
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- Requiere: migrations 001 → 010 ya ejecutadas
--
--   * catalog_models pasa a ser la ficha del modelo (línea, foto, descripción)
--   * cada fila de products es una variante de un modelo (model_id)
--   * variantes con color y salud de batería
--   * catalog_colors: lista editable de colores
--   * catalog_conditions.sort_order (el admin ya ordenaba por esa columna)
-- Idempotente (IF NOT EXISTS / ON CONFLICT DO NOTHING)
-- =====================================================================

-- ---------- catalog_models: ficha del modelo ----------
ALTER TABLE catalog_models
  ADD COLUMN IF NOT EXISTS line        text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS image_url   text,
  ADD COLUMN IF NOT EXISTS is_active   boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sort_order  int     NOT NULL DEFAULT 100;

-- Modelos que hoy existen solo como texto en products
INSERT INTO catalog_models (type_name, name)
SELECT DISTINCT category, coalesce(nullif(trim(model), ''), name)
FROM products
ON CONFLICT (type_name, name) DO NOTHING;

-- Línea: en iPhone se agrupan Pro / Pro Max / Plus / mini bajo el número
-- (misma regla que deriveLine en src/lib/inventory/variants.js)
UPDATE catalog_models
SET line = CASE
  WHEN type_name = 'iPhone' THEN regexp_replace(name, '\s+(Pro Max|Pro|Plus|mini)$', '', 'i')
  ELSE name
END
WHERE line IS NULL;

-- Foto y descripción del modelo: se toman de su primera variante
UPDATE catalog_models cm
SET image_url   = coalesce(cm.image_url, p.image_url),
    description = coalesce(cm.description, p.description)
FROM (
  SELECT DISTINCT ON (category, coalesce(nullif(trim(model), ''), name))
         category, coalesce(nullif(trim(model), ''), name) AS model_name, image_url, description
  FROM products
  ORDER BY category, coalesce(nullif(trim(model), ''), name), created_at
) p
WHERE cm.type_name = p.category AND cm.name = p.model_name
  AND (cm.image_url IS NULL OR cm.description IS NULL);

-- ---------- products: variantes ----------
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS model_id       uuid REFERENCES catalog_models(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS color          text,
  ADD COLUMN IF NOT EXISTS battery_health smallint;

DO $$ BEGIN
  ALTER TABLE products ADD CONSTRAINT products_battery_health_range CHECK (battery_health BETWEEN 0 AND 100);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

UPDATE products p
SET model_id = cm.id,
    model    = cm.name
FROM catalog_models cm
WHERE p.model_id IS NULL
  AND cm.type_name = p.category
  AND cm.name = coalesce(nullif(trim(p.model), ''), p.name);

-- Foto y descripción ahora son del modelo: la variante queda sin override
UPDATE products p
SET image_url   = CASE WHEN p.image_url = cm.image_url THEN NULL ELSE p.image_url END,
    description = CASE WHEN p.description = cm.description THEN NULL ELSE p.description END
FROM catalog_models cm
WHERE p.model_id = cm.id
  AND (p.image_url = cm.image_url OR p.description = cm.description);

ALTER TABLE products ALTER COLUMN model_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_model_id ON products(model_id);

-- Dos variantes pueden compartir nombre (mismo modelo/capacidad/color/estado, otra batería)
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_name_unique;

-- ---------- catalog_conditions: orden ----------
ALTER TABLE catalog_conditions
  ADD COLUMN IF NOT EXISTS sort_order int NOT NULL DEFAULT 100;

UPDATE catalog_conditions SET sort_order = CASE name
  WHEN 'Nuevo sellado'     THEN 10
  WHEN 'Open box'          THEN 20
  WHEN 'Como nuevo'        THEN 30
  WHEN 'Excelente'         THEN 40
  WHEN 'Usado — Excelente' THEN 40
  WHEN 'Bueno'             THEN 50
  WHEN 'Usado — Bueno'     THEN 50
  WHEN 'Refurbished'       THEN 60
  ELSE sort_order
END
WHERE sort_order = 100;

-- ---------- catalog_colors ----------
CREATE TABLE IF NOT EXISTS catalog_colors (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL UNIQUE,
  sort_order int  NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO catalog_colors (name, sort_order) VALUES
  ('Negro', 10), ('Blanco', 20), ('Medianoche', 30), ('Blanco estelar', 40),
  ('Titanio natural', 50), ('Titanio negro', 60), ('Titanio blanco', 70), ('Titanio desierto', 80),
  ('Azul', 90), ('Rosa', 100), ('Verde', 110), ('Amarillo', 120), ('Morado', 130),
  ('(PRODUCT)RED', 140), ('Gris espacial', 150), ('Plata', 160), ('Oro', 170)
ON CONFLICT (name) DO NOTHING;

ALTER TABLE catalog_colors ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY catalog_colors_read  ON catalog_colors FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY catalog_colors_write ON catalog_colors FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- Verificación ----------
--   SELECT count(*) FROM products WHERE model_id IS NULL;                 -- esperado: 0
--   SELECT type_name, line, name FROM catalog_models ORDER BY 1, 2, 3;     -- líneas derivadas
--   SELECT name, sort_order FROM catalog_conditions ORDER BY sort_order;
--   SELECT count(*) FROM catalog_colors;                                   -- >= 17
