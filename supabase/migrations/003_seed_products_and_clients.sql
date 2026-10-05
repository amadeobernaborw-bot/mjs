-- =====================================================================
-- MJ STORE — Seed 003: catálogo histórico Apple + clientes de prueba
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- Requiere: migrations 001 y 002 ya ejecutadas
--
-- Idempotente: usa nombre como clave de upsert (ON CONFLICT DO NOTHING)
-- =====================================================================

-- Garantizar unicidad de nombre para idempotencia (no afecta si ya existe)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_name_unique'
  ) THEN
    ALTER TABLE products ADD CONSTRAINT products_name_unique UNIQUE (name);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'clients_name_unique'
  ) THEN
    ALTER TABLE clients ADD CONSTRAINT clients_name_unique UNIQUE (name);
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- PRODUCTS — catálogo histórico Apple (2020 → 2026)
-- ---------------------------------------------------------------------
INSERT INTO products (name, category, model, condition, description, price_usd, price_ars, stock, image_url, is_active) VALUES
-- 2020
('iPhone 12 mini',          'iPhone',     'iPhone 12 mini',          'Nuevo sellado', 'Lanzamiento: 2020',  699, 978600,  0, 'https://placehold.co/800x800/F5F5F7/1D1D1F?text=iPhone+12+mini',           true),
('iPhone 12',               'iPhone',     'iPhone 12',               'Nuevo sellado', 'Lanzamiento: 2020',  799, 1118600, 0, 'https://placehold.co/800x800/F5F5F7/1D1D1F?text=iPhone+12',                true),
('iPhone 12 Pro',           'iPhone',     'iPhone 12 Pro',           'Nuevo sellado', 'Lanzamiento: 2020',  999, 1398600, 0, 'https://placehold.co/800x800/F5F5F7/1D1D1F?text=iPhone+12+Pro',            true),
('iPhone 12 Pro Max',       'iPhone',     'iPhone 12 Pro Max',       'Nuevo sellado', 'Lanzamiento: 2020', 1099, 1538600, 0, 'https://placehold.co/800x800/F5F5F7/1D1D1F?text=iPhone+12+Pro+Max',        true),
('iPhone SE (2da gen)',     'iPhone',     'iPhone SE 2020',          'Nuevo sellado', 'Lanzamiento: 2020',  399, 558600,  0, 'https://placehold.co/800x800/F5F5F7/1D1D1F?text=iPhone+SE+2da+gen',        true),
('MacBook Air (M1)',        'Mac',        'MacBook Air M1',          'Nuevo sellado', 'Lanzamiento: 2020',  999, 1398600, 0, 'https://placehold.co/800x800/F5F5F7/1D1D1F?text=MacBook+Air+M1',           true),
('MacBook Pro 13 (M1)',     'Mac',        'MacBook Pro 13 M1',       'Nuevo sellado', 'Lanzamiento: 2020', 1299, 1818600, 0, 'https://placehold.co/800x800/F5F5F7/1D1D1F?text=MacBook+Pro+13+M1',        true),
('Mac mini (M1)',           'Mac',        'Mac mini M1',             'Nuevo sellado', 'Lanzamiento: 2020',  699, 978600,  0, 'https://placehold.co/800x800/F5F5F7/1D1D1F?text=Mac+mini+M1',              true),
('iPad Air (4ta gen)',      'iPad',       'iPad Air 4',              'Nuevo sellado', 'Lanzamiento: 2020',  599, 838600,  0, 'https://placehold.co/800x800/F5F5F7/1D1D1F?text=iPad+Air+4ta+gen',         true),
('iPad (8va gen)',          'iPad',       'iPad 8',                  'Nuevo sellado', 'Lanzamiento: 2020',  329, 460600,  0, 'https://placehold.co/800x800/F5F5F7/1D1D1F?text=iPad+8va+gen',             true),
('AirPods Max',             'AirPods',    'AirPods Max',             'Nuevo sellado', 'Lanzamiento: 2020',  549, 768600,  0, 'https://placehold.co/800x800/F5F5F7/1D1D1F?text=AirPods+Max',              true),
('HomePod mini',            'Accesorios', 'HomePod mini',            'Nuevo sellado', 'Lanzamiento: 2020',   99, 138600,  0, 'https://placehold.co/800x800/F5F5F7/1D1D1F?text=HomePod+mini',             true),
('Apple Watch Series 6',    'Watch',      'Apple Watch Series 6',    'Nuevo sellado', 'Lanzamiento: 2020',  399, 558600,  0, 'https://placehold.co/800x800/F5F5F7/1D1D1F?text=Apple+Watch+S6',           true),
('Apple Watch SE (1ra gen)','Watch',      'Apple Watch SE 1ra gen',  'Nuevo sellado', 'Lanzamiento: 2020',  279, 390600,  0, 'https://placehold.co/800x800/F5F5F7/1D1D1F?text=Apple+Watch+SE+1ra+gen',   true),

-- 2021
('iPhone 13 mini',          'iPhone',     'iPhone 13 mini',          'Nuevo sellado', 'Lanzamiento: 2021',  699, 978600,  0, 'https://placehold.co/800x800/F5F5F7/1D1D1F?text=iPhone+13+mini',           true),
('iPhone 13',               'iPhone',     'iPhone 13',               'Nuevo sellado', 'Lanzamiento: 2021',  799, 1118600, 0, 'https://placehold.co/800x800/F5F5F7/1D1D1F?text=iPhone+13',                true),
('iPhone 13 Pro',           'iPhone',     'iPhone 13 Pro',           'Nuevo sellado', 'Lanzamiento: 2021',  999, 1398600, 0, 'https://placehold.co/800x800/F5F5F7/1D1D1F?text=iPhone+13+Pro',            true),
('iPhone 13 Pro Max',       'iPhone',     'iPhone 13 Pro Max',       'Nuevo sellado', 'Lanzamiento: 2021', 1099, 1538600, 0, 'https://placehold.co/800x800/F5F5F7/1D1D1F?text=iPhone+13+Pro+Max',        true),
('MacBook Pro 14 (M1 Pro)', 'Mac',        'MacBook Pro 14 M1 Pro',   'Nuevo sellado', 'Lanzamiento: 2021', 1999, 2798600, 0, 'https://placehold.co/800x800/F5F5F7/1D1D1F?text=MacBook+Pro+14+M1+Pro',    true),
('MacBook Pro 16 (M1 Pro)', 'Mac',        'MacBook Pro 16 M1 Pro',   'Nuevo sellado', 'Lanzamiento: 2021', 2499, 3498600, 0, 'https://placehold.co/800x800/F5F5F7/1D1D1F?text=MacBook+Pro+16+M1+Pro',    true),
('iMac 24 (M1)',            'Mac',        'iMac 24 M1',              'Nuevo sellado', 'Lanzamiento: 2021', 1299, 1818600, 0, 'https://placehold.co/800x800/F5F5F7/1D1D1F?text=iMac+24+M1',               true),
('iPad mini (6ta gen)',     'iPad',       'iPad mini 6',             'Nuevo sellado', 'Lanzamiento: 2021',  499, 698600,  0, 'https://placehold.co/800x800/F5F5F7/1D1D1F?text=iPad+mini+6ta+gen',        true),
('iPad (9na gen)',          'iPad',       'iPad 9',                  'Nuevo sellado', 'Lanzamiento: 2021',  329, 460600,  0, 'https://placehold.co/800x800/F5F5F7/1D1D1F?text=iPad+9na+gen',             true),
('iPad Pro 11 (M1)',        'iPad',       'iPad Pro 11 M1',          'Nuevo sellado', 'Lanzamiento: 2021',  799, 1118600, 0, 'https://placehold.co/800x800/F5F5F7/1D1D1F?text=iPad+Pro+11+M1',           true),
('AirPods (3ra gen)',       'AirPods',    'AirPods 3ra gen',         'Nuevo sellado', 'Lanzamiento: 2021',  179, 250600,  0, 'https://placehold.co/800x800/F5F5F7/1D1D1F?text=AirPods+3ra+gen',          true),
('Apple Watch Series 7',    'Watch',      'Apple Watch Series 7',    'Nuevo sellado', 'Lanzamiento: 2021',  399, 558600,  0, 'https://placehold.co/800x800/F5F5F7/1D1D1F?text=Apple+Watch+S7',           true),
('AirTag (1 unidad)',       'Accesorios', 'AirTag',                  'Nuevo sellado', 'Lanzamiento: 2021',   29, 40600,   0, 'https://placehold.co/800x800/F5F5F7/1D1D1F?text=AirTag',                   true),
('Apple TV 4K (2da gen)',   'Accesorios', 'Apple TV 4K 2da gen',     'Nuevo sellado', 'Lanzamiento: 2021',  179, 250600,  0, 'https://placehold.co/800x800/F5F5F7/1D1D1F?text=Apple+TV+4K+2da+gen',      true),

-- 2022
('iPhone 14',               'iPhone',     'iPhone 14',               'Nuevo sellado', 'Lanzamiento: 2022',  799, 1118600, 0, 'https://placehold.co/800x800/F5F5F7/1D1D1F?text=iPhone+14',                true),
('iPhone 14 Plus',          'iPhone',     'iPhone 14 Plus',          'Nuevo sellado', 'Lanzamiento: 2022',  899, 1258600, 0, 'https://placehold.co/800x800/F5F5F7/1D1D1F?text=iPhone+14+Plus',           true),
('iPhone 14 Pro',           'iPhone',     'iPhone 14 Pro',           'Nuevo sellado', 'Lanzamiento: 2022',  999, 1398600, 0, 'https://placehold.co/800x800/F5F5F7/1D1D1F?text=iPhone+14+Pro',            true),
('iPhone 14 Pro Max',       'iPhone',     'iPhone 14 Pro Max',       'Nuevo sellado', 'Lanzamiento: 2022', 1099, 1538600, 0, 'https://placehold.co/800x800/F5F5F7/1D1D1F?text=iPhone+14+Pro+Max',        true),
('iPhone SE (3ra gen)',     'iPhone',     'iPhone SE 2022',          'Nuevo sellado', 'Lanzamiento: 2022',  429, 600600,  0, 'https://placehold.co/800x800/F5F5F7/1D1D1F?text=iPhone+SE+3ra+gen',        true),
('Mac Studio (M1 Max)',     'Mac',        'Mac Studio M1 Max',       'Nuevo sellado', 'Lanzamiento: 2022', 1999, 2798600, 0, 'https://placehold.co/800x800/F5F5F7/1D1D1F?text=Mac+Studio+M1+Max',        true),
('Studio Display',          'Mac',        'Studio Display',          'Nuevo sellado', 'Lanzamiento: 2022', 1599, 2238600, 0, 'https://placehold.co/800x800/F5F5F7/1D1D1F?text=Studio+Display',           true),
('MacBook Air (M2)',        'Mac',        'MacBook Air M2',          'Nuevo sellado', 'Lanzamiento: 2022', 1199, 1678600, 0, 'https://placehold.co/800x800/F5F5F7/1D1D1F?text=MacBook+Air+M2',           true),
('iPad (10ma gen)',         'iPad',       'iPad 10',                 'Nuevo sellado', 'Lanzamiento: 2022',  449, 628600,  0, 'https://placehold.co/800x800/F5F5F7/1D1D1F?text=iPad+10ma+gen',            true),
('iPad Air (5ta gen)',      'iPad',       'iPad Air 5',              'Nuevo sellado', 'Lanzamiento: 2022',  599, 838600,  0, 'https://placehold.co/800x800/F5F5F7/1D1D1F?text=iPad+Air+5ta+gen',         true),
('Apple Watch Ultra',       'Watch',      'Apple Watch Ultra',       'Nuevo sellado', 'Lanzamiento: 2022',  799, 1118600, 0, 'https://placehold.co/800x800/F5F5F7/1D1D1F?text=Apple+Watch+Ultra',        true),
('Apple Watch Series 8',    'Watch',      'Apple Watch Series 8',    'Nuevo sellado', 'Lanzamiento: 2022',  399, 558600,  0, 'https://placehold.co/800x800/F5F5F7/1D1D1F?text=Apple+Watch+S8',           true),
('AirPods Pro (2da gen)',   'AirPods',    'AirPods Pro 2',           'Nuevo sellado', 'Lanzamiento: 2022',  249, 348600,  0, 'https://placehold.co/800x800/F5F5F7/1D1D1F?text=AirPods+Pro+2da+gen',      true),

-- 2023
('iPhone 15',               'iPhone',     'iPhone 15',               'Nuevo sellado', 'Lanzamiento: 2023',  799, 1118600, 0, 'https://placehold.co/800x800/F5F5F7/1D1D1F?text=iPhone+15',                true),
('iPhone 15 Plus',          'iPhone',     'iPhone 15 Plus',          'Nuevo sellado', 'Lanzamiento: 2023',  899, 1258600, 0, 'https://placehold.co/800x800/F5F5F7/1D1D1F?text=iPhone+15+Plus',           true),
('iPhone 15 Pro',           'iPhone',     'iPhone 15 Pro',           'Nuevo sellado', 'Lanzamiento: 2023',  999, 1398600, 0, 'https://placehold.co/800x800/F5F5F7/1D1D1F?text=iPhone+15+Pro',            true),
('iPhone 15 Pro Max',       'iPhone',     'iPhone 15 Pro Max',       'Nuevo sellado', 'Lanzamiento: 2023', 1199, 1678600, 0, 'https://placehold.co/800x800/F5F5F7/1D1D1F?text=iPhone+15+Pro+Max',        true),
('Mac mini (M2)',           'Mac',        'Mac mini M2',             'Nuevo sellado', 'Lanzamiento: 2023',  599, 838600,  0, 'https://placehold.co/800x800/F5F5F7/1D1D1F?text=Mac+mini+M2',              true),
('MacBook Air 15 (M2)',     'Mac',        'MacBook Air 15 M2',       'Nuevo sellado', 'Lanzamiento: 2023', 1299, 1818600, 0, 'https://placehold.co/800x800/F5F5F7/1D1D1F?text=MacBook+Air+15+M2',        true),
('Mac Pro (M2 Ultra)',      'Mac',        'Mac Pro M2 Ultra',        'Nuevo sellado', 'Lanzamiento: 2023', 6999, 9798600, 0, 'https://placehold.co/800x800/F5F5F7/1D1D1F?text=Mac+Pro+M2+Ultra',         true),
('MacBook Pro 14 (M3)',     'Mac',        'MacBook Pro 14 M3',       'Nuevo sellado', 'Lanzamiento: 2023', 1599, 2238600, 0, 'https://placehold.co/800x800/F5F5F7/1D1D1F?text=MacBook+Pro+14+M3',        true),
('HomePod (2da gen)',       'Accesorios', 'HomePod 2da gen',         'Nuevo sellado', 'Lanzamiento: 2023',  299, 418600,  0, 'https://placehold.co/800x800/F5F5F7/1D1D1F?text=HomePod+2da+gen',          true),
('Apple Watch Series 9',    'Watch',      'Apple Watch Series 9',    'Nuevo sellado', 'Lanzamiento: 2023',  399, 558600,  0, 'https://placehold.co/800x800/F5F5F7/1D1D1F?text=Apple+Watch+S9',           true),
('Apple Watch Ultra 2',     'Watch',      'Apple Watch Ultra 2',     'Nuevo sellado', 'Lanzamiento: 2023',  799, 1118600, 0, 'https://placehold.co/800x800/F5F5F7/1D1D1F?text=Apple+Watch+Ultra+2',      true),

-- 2024
('Apple Vision Pro',        'Accesorios', 'Apple Vision Pro',        'Nuevo sellado', 'Lanzamiento: 2024', 3499, 4898600, 0, 'https://placehold.co/800x800/F5F5F7/1D1D1F?text=Apple+Vision+Pro',         true),
('iPad Air 11 (M2)',        'iPad',       'iPad Air 11 M2',          'Nuevo sellado', 'Lanzamiento: 2024',  599, 838600,  0, 'https://placehold.co/800x800/F5F5F7/1D1D1F?text=iPad+Air+11+M2',           true),
('iPad Air 13 (M2)',        'iPad',       'iPad Air 13 M2',          'Nuevo sellado', 'Lanzamiento: 2024',  799, 1118600, 0, 'https://placehold.co/800x800/F5F5F7/1D1D1F?text=iPad+Air+13+M2',           true),
('iPad Pro 11 (M4)',        'iPad',       'iPad Pro 11 M4',          'Nuevo sellado', 'Lanzamiento: 2024',  999, 1398600, 0, 'https://placehold.co/800x800/F5F5F7/1D1D1F?text=iPad+Pro+11+M4',           true),
('iPad Pro 13 (M4)',        'iPad',       'iPad Pro 13 M4',          'Nuevo sellado', 'Lanzamiento: 2024', 1299, 1818600, 0, 'https://placehold.co/800x800/F5F5F7/1D1D1F?text=iPad+Pro+13+M4',           true),

-- 2025 (estimaciones)
('iPhone 16E',              'iPhone',     'iPhone 16E',              'Nuevo sellado', 'Lanzamiento: 2025',  599, 838600,  0, 'https://placehold.co/800x800/F5F5F7/1D1D1F?text=iPhone+16E',               true),
('iPhone 17',               'iPhone',     'iPhone 17',               'Nuevo sellado', 'Lanzamiento: 2025',  799, 1118600, 0, 'https://placehold.co/800x800/F5F5F7/1D1D1F?text=iPhone+17',                true),
('iPhone 17 Pro',           'iPhone',     'iPhone 17 Pro',           'Nuevo sellado', 'Lanzamiento: 2025', 1099, 1538600, 0, 'https://placehold.co/800x800/F5F5F7/1D1D1F?text=iPhone+17+Pro',            true),
('iPhone Air (Ultra Slim)', 'iPhone',     'iPhone Air',              'Nuevo sellado', 'Lanzamiento: 2025', 1299, 1818600, 0, 'https://placehold.co/800x800/F5F5F7/1D1D1F?text=iPhone+Air',               true),
('MacBook Air (M4)',        'Mac',        'MacBook Air M4',          'Nuevo sellado', 'Lanzamiento: 2025', 1099, 1538600, 0, 'https://placehold.co/800x800/F5F5F7/1D1D1F?text=MacBook+Air+M4',           true),
('Mac Studio (M4 Max)',     'Mac',        'Mac Studio M4 Max',       'Nuevo sellado', 'Lanzamiento: 2025', 1999, 2798600, 0, 'https://placehold.co/800x800/F5F5F7/1D1D1F?text=Mac+Studio+M4+Max',        true),
('AirPods Pro 3',           'AirPods',    'AirPods Pro 3',           'Nuevo sellado', 'Lanzamiento: 2025',  249, 348600,  0, 'https://placehold.co/800x800/F5F5F7/1D1D1F?text=AirPods+Pro+3',            true),
('Apple Watch Series 11',   'Watch',      'Apple Watch Series 11',   'Nuevo sellado', 'Lanzamiento: 2025',  399, 558600,  0, 'https://placehold.co/800x800/F5F5F7/1D1D1F?text=Apple+Watch+S11',          true),

-- 2026 (estimaciones)
('iPhone 18e',              'iPhone',     'iPhone 18e',              'Nuevo sellado', 'Lanzamiento: 2026',  599, 838600,  0, 'https://placehold.co/800x800/F5F5F7/1D1D1F?text=iPhone+18e',               true),
('MacBook Neo',             'Mac',        'MacBook Neo',             'Nuevo sellado', 'Lanzamiento: 2026', 1199, 1678600, 0, 'https://placehold.co/800x800/F5F5F7/1D1D1F?text=MacBook+Neo',              true),
('MacBook Pro 14 (M5 Pro)', 'Mac',        'MacBook Pro 14 M5 Pro',   'Nuevo sellado', 'Lanzamiento: 2026', 1999, 2798600, 0, 'https://placehold.co/800x800/F5F5F7/1D1D1F?text=MacBook+Pro+14+M5+Pro',    true),
('AirPods Max 2',           'AirPods',    'AirPods Max 2',           'Nuevo sellado', 'Lanzamiento: 2026',  549, 768600,  0, 'https://placehold.co/800x800/F5F5F7/1D1D1F?text=AirPods+Max+2',            true),
('Studio Display XDR',      'Mac',        'Studio Display XDR',      'Nuevo sellado', 'Lanzamiento: 2026', 1999, 2798600, 0, 'https://placehold.co/800x800/F5F5F7/1D1D1F?text=Studio+Display+XDR',       true)
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------
-- CLIENTS — perfiles de prueba (prefijo "(P)" para identificarlos)
-- ---------------------------------------------------------------------
INSERT INTO clients (name, phone, email, notes) VALUES
('(P) Juan Pérez',         '+5492994100001', 'juan.perez.test@mjstore.local',     'Cliente de prueba — Neuquén capital'),
('(P) María González',     '+5492994100002', 'maria.gonzalez.test@mjstore.local', 'Cliente de prueba — Plottier'),
('(P) Carlos Rodríguez',   '+5492994100003', 'carlos.rodriguez.test@mjstore.local','Cliente de prueba — Cipolletti'),
('(P) Ana Martínez',       '+5492994100004', 'ana.martinez.test@mjstore.local',   'Cliente de prueba — Plan Canje iPhone 11 Pro'),
('(P) Diego Fernández',    '+5492994100005', 'diego.fernandez.test@mjstore.local','Cliente de prueba — Mayorista'),
('(P) Lucía López',        '+5492994100006', 'lucia.lopez.test@mjstore.local',    'Cliente de prueba — Buenos Aires'),
('(P) Pablo Sánchez',      '+5492994100007', 'pablo.sanchez.test@mjstore.local',  'Cliente de prueba — Repetidor'),
('(P) Sofía Ramírez',      '+5492994100008', 'sofia.ramirez.test@mjstore.local',  'Cliente de prueba — Interesada en MacBook'),
('(P) Martín Torres',      '+5492994100009', 'martin.torres.test@mjstore.local',  'Cliente de prueba — Empresa'),
('(P) Laura Vargas',       '+5492994100010', 'laura.vargas.test@mjstore.local',   'Cliente de prueba — Neuquén'),
('(P) Federico Ríos',      '+5492994100011', 'federico.rios.test@mjstore.local',  'Cliente de prueba — Plan Canje Watch'),
('(P) Camila Herrera',     '+5492994100012', 'camila.herrera.test@mjstore.local', 'Cliente de prueba — Estudiante'),
('(P) Nicolás Acosta',     '+5492994100013', 'nicolas.acosta.test@mjstore.local', 'Cliente de prueba — Profesional IT'),
('(P) Valentina Castro',   '+5492994100014', 'valentina.castro.test@mjstore.local','Cliente de prueba — Diseñadora'),
('(P) Sebastián Méndez',   '+5492994100015', 'sebastian.mendez.test@mjstore.local','Cliente de prueba — Fotógrafo')
ON CONFLICT (name) DO NOTHING;

-- =====================================================================
-- DONE
-- Verificar:
--   SELECT count(*) FROM products;   -- esperado: >= 70
--   SELECT count(*) FROM clients WHERE name LIKE '(P)%';  -- esperado: 15
-- =====================================================================
