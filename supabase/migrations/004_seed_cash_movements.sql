-- =====================================================================
-- MJ STORE — Seed 004: 20 movimientos de caja de prueba
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- Requiere: migrations 001, 002 y 003 ya ejecutadas
-- =====================================================================

INSERT INTO cash_movements (type, category, detail, amount, payment_method, occurred_at) VALUES

-- Semana 1 — 7 al 9 de abril 2026
('entrada', 'Venta',          'Venta iPhone 15 Pro 256GB — Juan Pérez',                  1398600.00, 'Transferencia',    '2026-04-07 10:15:00+00'),
('salida',  'Compra stock',   'Reposición MacBook Air M4 x2 — proveedor BA',             3077200.00, 'Transferencia',    '2026-04-07 14:30:00+00'),
('entrada', 'Venta',          'Venta AirPods Pro 2 — María González',                     348600.00, 'MercadoPago',      '2026-04-08 11:00:00+00'),
('salida',  'Alquiler',       'Alquiler local comercial — abril 2026',                    450000.00, 'Transferencia',    '2026-04-08 09:00:00+00'),
('entrada', 'Canje recibido', 'Plan Canje iPhone 13 Pro bueno estado — Ana Martínez',     480000.00, 'Efectivo',         '2026-04-09 16:45:00+00'),

-- Semana 2 — 14 al 17 de abril 2026
('entrada', 'Venta',          'Venta iPad Pro 11 M4 — empresa Martín Torres',            1398600.00, 'Crédito 3 cuotas', '2026-04-14 10:30:00+00'),
('salida',  'Sueldos',        'Sueldo empleados — quincena 1 abril',                      620000.00, 'Transferencia',    '2026-04-15 08:00:00+00'),
('entrada', 'Venta',          'Venta Apple Watch Series 9 — Lucía López',                 558600.00, 'Débito',           '2026-04-15 13:20:00+00'),
('salida',  'Servicios',      'Internet + telefonía — abril 2026',                         52000.00, 'Débito',           '2026-04-16 10:00:00+00'),
('entrada', 'Venta',          'Venta MacBook Air M2 — Sofía Ramírez',                   1678600.00, 'Crédito 6 cuotas', '2026-04-17 15:00:00+00'),

-- Semana 3 — 21 al 25 de abril 2026
('salida',  'Marketing',      'Pauta Meta Ads — semana 3 abril',                           85000.00, 'Transferencia',    '2026-04-21 09:30:00+00'),
('entrada', 'Venta',          'Venta iPhone 16E + funda — Federico Ríos',                 878600.00, 'Efectivo',         '2026-04-22 12:10:00+00'),
('entrada', 'Otros ingresos', 'Comisión financiación cuotas — mes abril',                   95000.00, 'Transferencia',    '2026-04-23 11:00:00+00'),
('salida',  'Impuestos',      'Pago monotributo — abril 2026',                            210000.00, 'Transferencia',    '2026-04-24 08:30:00+00'),
('entrada', 'Venta',          'Venta AirPods Max + cable USB-C — Camila Herrera',          808600.00, 'MercadoPago',      '2026-04-25 14:45:00+00'),

-- Semana 4 e inicio mayo — 30 abr al 5 may 2026
('salida',  'Sueldos',        'Sueldo empleados — quincena 2 abril',                      620000.00, 'Transferencia',    '2026-04-30 08:00:00+00'),
('entrada', 'Venta',          'Venta Mac mini M2 — Nicolás Acosta',                       838600.00, 'USD efectivo',     '2026-05-02 11:30:00+00'),
('salida',  'Otros gastos',   'Útiles de oficina y limpieza — mayo',                       28500.00, 'Efectivo',         '2026-05-02 16:00:00+00'),
('entrada', 'Canje recibido', 'Plan Canje Apple Watch SE — Diego Fernández',                95000.00, 'Efectivo',         '2026-05-05 10:00:00+00'),
('entrada', 'Ajuste de caja', 'Diferencia positiva en arqueo de caja — cierre semana',      1200.00, 'Efectivo',         '2026-05-05 19:00:00+00');

-- =====================================================================
-- Verificar:
--   SELECT count(*) FROM cash_movements;  -- esperado: 20
--   SELECT type, sum(amount) FROM cash_movements GROUP BY type;
-- =====================================================================
