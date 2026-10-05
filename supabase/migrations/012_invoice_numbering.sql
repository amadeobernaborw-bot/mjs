-- =====================================================================
-- MJ STORE — Migration 012: numeración propia por tipo + convertir presupuesto
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- Requiere: migrations 001 y 005 ya ejecutadas
-- =====================================================================
-- * Facturas y presupuestos dejan de compartir el serial de invoice_number:
--   cada tipo tiene su contador (F 1, 2, 3… y P 1, 2, 3…). La primera vez
--   renumera los existentes por fecha de creación (cambia el N° de los
--   documentos ya emitidos).
-- * El número lo asigna un trigger (max + 1 del tipo, con lock por tipo) y es
--   inmutable mientras el documento no cambie de tipo.
-- * convert_quote_to_invoice crea la factura de un presupuesto, le pasa sus
--   cuotas (no las copia: la agenda de deudas las contaría dos veces) y marca
--   el presupuesto como aprobado, todo en una transacción.
-- Idempotente: se puede correr más de una vez (la renumeración corre solo la
-- primera, mientras la columna todavía usa el serial).

-- ---------- Renumerar y quitar el serial (solo la primera vez) ----------
DO $$
BEGIN
  IF pg_get_serial_sequence('public.invoices', 'invoice_number') IS NOT NULL THEN
    UPDATE public.invoices i
       SET invoice_number = r.rn
      FROM (
        SELECT id, row_number() OVER (PARTITION BY type ORDER BY created_at, invoice_number) AS rn
          FROM public.invoices
      ) r
     WHERE r.id = i.id;

    ALTER TABLE public.invoices ALTER COLUMN invoice_number DROP DEFAULT;
    DROP SEQUENCE IF EXISTS public.invoices_invoice_number_seq;
  END IF;
END $$;

DO $$ BEGIN
  ALTER TABLE public.invoices
    ADD CONSTRAINT invoices_type_number_key UNIQUE (type, invoice_number);
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- ---------- Factura ← presupuesto de origen ----------
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS source_invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL;

-- Un presupuesto se convierte una sola vez
CREATE UNIQUE INDEX IF NOT EXISTS invoices_source_invoice_key
  ON public.invoices(source_invoice_id) WHERE source_invoice_id IS NOT NULL;

-- ---------- Número por tipo ----------
CREATE OR REPLACE FUNCTION public.assign_invoice_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.type IS NOT DISTINCT FROM OLD.type THEN
    NEW.invoice_number := OLD.invoice_number;
    RETURN NEW;
  END IF;

  -- Serializa las altas del mismo tipo para que max + 1 no se repita
  PERFORM pg_advisory_xact_lock(hashtext('invoice_number:' || NEW.type));
  SELECT coalesce(max(invoice_number), 0) + 1
    INTO NEW.invoice_number
    FROM public.invoices
   WHERE type = NEW.type;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_invoice_number ON public.invoices;
CREATE TRIGGER trg_invoice_number
  BEFORE INSERT OR UPDATE OF type, invoice_number ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.assign_invoice_number();

-- ---------- Convertir presupuesto en factura ----------
-- SECURITY INVOKER: corre con los permisos (y RLS) de quien la llama.
CREATE OR REPLACE FUNCTION public.convert_quote_to_invoice(p_quote_id uuid)
RETURNS public.invoices
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_quote public.invoices;
  v_new   public.invoices;
BEGIN
  SELECT * INTO v_quote FROM public.invoices WHERE id = p_quote_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El presupuesto no existe.';
  END IF;
  IF v_quote.type <> 'presupuesto' THEN
    RAISE EXCEPTION 'Solo se puede convertir un presupuesto.';
  END IF;
  IF v_quote.status = 'cancelado' THEN
    RAISE EXCEPTION 'El presupuesto está cancelado.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.invoices WHERE source_invoice_id = p_quote_id) THEN
    RAISE EXCEPTION 'Este presupuesto ya fue convertido en factura.';
  END IF;

  INSERT INTO public.invoices (client_id, type, items, total_ars, total_usd, status, payment_method, source_invoice_id)
  VALUES (v_quote.client_id, 'factura', v_quote.items, v_quote.total_ars, v_quote.total_usd,
          'pendiente', v_quote.payment_method, v_quote.id)
  RETURNING * INTO v_new;

  UPDATE public.invoice_installments SET invoice_id = v_new.id WHERE invoice_id = v_quote.id;
  UPDATE public.invoices SET status = 'aprobado' WHERE id = v_quote.id;

  RETURN v_new;
END $$;

REVOKE ALL ON FUNCTION public.convert_quote_to_invoice(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.convert_quote_to_invoice(uuid) TO authenticated;

-- ---------- Verificación ----------
--   SELECT type, min(invoice_number), max(invoice_number), count(*)
--     FROM invoices GROUP BY type;                                    -- min = 1 y max = count
--   SELECT type, invoice_number, count(*) FROM invoices
--     GROUP BY 1, 2 HAVING count(*) > 1;                              -- esperado: 0 filas
--   SELECT pg_get_serial_sequence('invoices', 'invoice_number');      -- esperado: NULL
