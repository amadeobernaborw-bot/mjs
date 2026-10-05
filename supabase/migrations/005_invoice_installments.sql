-- =====================================================================
-- MJ STORE — Migration 005: cuotas + cliente en caja + T&C en perfil
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- Requiere: migrations 001 y 002 ya ejecutadas
-- =====================================================================

-- ---------- cash_movements: vincular a cliente (opcional) ----------
ALTER TABLE cash_movements
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cash_movements_client_id ON cash_movements(client_id);

-- ---------- invoices: forma de pago ----------
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS payment_method text;

-- ---------- store_profile: términos, garantía y validez ----------
ALTER TABLE store_profile
  ADD COLUMN IF NOT EXISTS terms_and_conditions text,
  ADD COLUMN IF NOT EXISTS warranty_text text,
  ADD COLUMN IF NOT EXISTS quote_validity_days int DEFAULT 7;

-- ---------- invoice_installments: plan de cuotas ----------
CREATE TABLE IF NOT EXISTS invoice_installments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  installment_num int  NOT NULL,
  amount          numeric(14,2) NOT NULL CHECK (amount >= 0),
  due_date        date,
  paid_at         timestamptz,
  status          text NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente','pagada','vencida')),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_installments_invoice ON invoice_installments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_installments_status  ON invoice_installments(status);
CREATE INDEX IF NOT EXISTS idx_installments_due     ON invoice_installments(due_date);

-- ---------- RLS ----------
ALTER TABLE invoice_installments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY installments_all ON invoice_installments
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =====================================================================
-- DONE
-- Verificar:
--   SELECT column_name FROM information_schema.columns WHERE table_name='cash_movements' AND column_name='client_id';
--   SELECT column_name FROM information_schema.columns WHERE table_name='invoices' AND column_name='payment_method';
--   SELECT count(*) FROM invoice_installments;  -- esperado: 0
-- =====================================================================
