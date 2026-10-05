-- ============================================================
-- 009 — Apariencia: temas por zona + imagen del Hero editable
-- ============================================================
-- * storefront_theme / admin_theme: tema de la tienda pública y del panel
-- * hero_image_mobile_url: recorte vertical (9:16) para celulares
-- * hero_placeholder / hero_mobile_placeholder: miniaturas base64 (~1 KB)
--   para la carga progresiva con fade
-- * hero_overlay: intensidad del velo oscuro sobre la foto (0–90 %)
-- * hero_original_url / hero_crop: original + encuadre para reajustar
--   sin volver a subir la imagen
-- Reutiliza el bucket store-assets y sus políticas (sin cambios de RLS).
-- Idempotente: se puede correr más de una vez.

ALTER TABLE store_profile
  ADD COLUMN IF NOT EXISTS storefront_theme        text     NOT NULL DEFAULT 'dark',
  ADD COLUMN IF NOT EXISTS admin_theme             text     NOT NULL DEFAULT 'dark',
  ADD COLUMN IF NOT EXISTS hero_image_url          text,
  ADD COLUMN IF NOT EXISTS hero_image_mobile_url   text,
  ADD COLUMN IF NOT EXISTS hero_placeholder        text,
  ADD COLUMN IF NOT EXISTS hero_mobile_placeholder text,
  ADD COLUMN IF NOT EXISTS hero_overlay            smallint NOT NULL DEFAULT 55,
  ADD COLUMN IF NOT EXISTS hero_original_url       text,
  ADD COLUMN IF NOT EXISTS hero_crop               jsonb;

DO $$
BEGIN
  ALTER TABLE store_profile
    ADD CONSTRAINT store_profile_storefront_theme_chk
    CHECK (storefront_theme IN ('dark', 'light'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE store_profile
    ADD CONSTRAINT store_profile_admin_theme_chk
    CHECK (admin_theme IN ('dark', 'light'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE store_profile
    ADD CONSTRAINT store_profile_hero_overlay_chk
    CHECK (hero_overlay BETWEEN 0 AND 90);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Las miniaturas viajan en cada carga de la landing: se limita su tamaño
DO $$
BEGIN
  ALTER TABLE store_profile
    ADD CONSTRAINT store_profile_hero_placeholders_size_chk
    CHECK (
      (hero_placeholder IS NULL OR length(hero_placeholder) <= 8192) AND
      (hero_mobile_placeholder IS NULL OR length(hero_mobile_placeholder) <= 8192)
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
