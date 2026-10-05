-- =====================================================================
-- MJ STORE — Migration 007: agenda de notas/recordatorios por cliente
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- Requiere: migrations 001 → 006 ya ejecutadas
-- =====================================================================

CREATE TABLE IF NOT EXISTS client_notes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  remind_date date,
  text        text NOT NULL,
  status      text NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente','hecha','archivada')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_notes_client      ON client_notes(client_id);
CREATE INDEX IF NOT EXISTS idx_client_notes_status      ON client_notes(status);
CREATE INDEX IF NOT EXISTS idx_client_notes_remind_date ON client_notes(remind_date);

ALTER TABLE client_notes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY client_notes_all ON client_notes
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Seed de demo (3 notas de ejemplo si existen clientes)
DO $$
DECLARE
  cli1 uuid;
  cli2 uuid;
  cli3 uuid;
BEGIN
  SELECT id INTO cli1 FROM clients ORDER BY random() LIMIT 1;
  SELECT id INTO cli2 FROM clients WHERE id <> cli1 ORDER BY random() LIMIT 1;
  SELECT id INTO cli3 FROM clients WHERE id NOT IN (cli1, cli2) ORDER BY random() LIMIT 1;

  IF cli1 IS NOT NULL THEN
    INSERT INTO client_notes (client_id, remind_date, text, status) VALUES
      (cli1, CURRENT_DATE + 2, 'Avisar que ingresó nuevo stock del iPhone 15 Pro', 'pendiente');
  END IF;
  IF cli2 IS NOT NULL THEN
    INSERT INTO client_notes (client_id, remind_date, text, status) VALUES
      (cli2, CURRENT_DATE - 1, 'Confirmar pago de cuota 2 — recordatorio vencido', 'pendiente');
  END IF;
  IF cli3 IS NOT NULL THEN
    INSERT INTO client_notes (client_id, remind_date, text, status) VALUES
      (cli3, CURRENT_DATE + 7, 'Llamar para ofrecer plan canje', 'pendiente');
  END IF;
END $$;

-- =====================================================================
-- Verificar:
--   SELECT count(*) FROM client_notes;
-- =====================================================================
