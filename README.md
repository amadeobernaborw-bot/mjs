# MJ STORE

E-commerce premium estilo Apple + panel de administración (CRM) para MJ STORE.

## Stack

- **Vite + React 18** — frontend SPA
- **React Router v6** — `/` storefront, `/admin/*` protegido
- **Supabase** — PostgreSQL, Auth, Storage
- **jsPDF + html2canvas** — exportar facturas a PDF/PNG

## Setup local

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # build de producción → dist/
npm run preview      # previsualizar build
```

### Variables de entorno

Crear `.env.local` (ver `.env.example`):

```
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

## Setup de Supabase

1. Crear proyecto en https://supabase.com (Free tier).
2. Ir a **SQL Editor** y ejecutar `supabase/migrations/001_init.sql` (crea tablas, RLS, policies y storage buckets).
3. Ir a **Authentication → Users → Add user**:
   - Email: `maripiljerestore@mjstore.com`
   - Password: `12345678`
   - Marcar **Auto Confirm User**.
4. Copiar `Project URL` y `anon key` (Settings → API) a `.env.local`.

## Estructura del proyecto

```
src/
├── lib/
│   ├── supabase.js         # cliente Supabase
│   ├── format.js           # formateo ARS, USD, fechas
│   └── export.js           # PDF + PNG export
├── hooks/
│   ├── useAuth.js
│   ├── useStoreProfile.js
│   └── useScrollObserver.js
├── components/
│   ├── ui/Modal.jsx
│   ├── Nav.jsx
│   ├── Hero.jsx
│   ├── CategoryBar.jsx
│   ├── ProductCarousel.jsx
│   ├── BentoGrid.jsx
│   ├── TradeInCalculator.jsx
│   ├── ContactSection.jsx
│   ├── Footer.jsx
│   ├── WhatsAppFAB.jsx
│   └── InvoiceDocument.jsx
├── pages/
│   ├── Store.jsx                # storefront pública
│   └── admin/
│       ├── Login.jsx
│       ├── AdminLayout.jsx
│       ├── Dashboard.jsx
│       ├── Profile.jsx          # perfil/configuración tienda
│       ├── Inventory.jsx        # CRUD productos
│       ├── TradeInConfig.jsx    # precios canje iPhone
│       ├── Clients.jsx          # CRM
│       └── Invoices.jsx         # presupuestos + facturas
├── router/ProtectedRoute.jsx
├── styles/
│   ├── reset.css
│   ├── design-system.css
│   ├── components.css
│   ├── animations.css
│   └── admin.css
├── App.jsx
└── main.jsx
```

## Funcionalidades

### Storefront pública (`/`)
- Nav sticky con glassmorphism y filtro por categorías
- Hero full-viewport con headline tipográfico premium
- Catálogo en carrusel con chevrons
- Bento grid de servicios
- Calculadora de Plan Canje (lee `trade_in_models`)
- Sección de contacto con WhatsApp + Instagram + Facebook + mapa
- Botón flotante de WhatsApp
- Animaciones fade-in con IntersectionObserver
- Responsive 320 → 1440px

### Panel admin (`/admin`)
- Login con Supabase Auth
- Dashboard con métricas
- Editor de perfil de tienda (logo, contacto, redes, dirección, tipo de cambio ARS/USD)
- Inventario CRUD con upload de imágenes
- Configurador de precios de Plan Canje (3 estados × N modelos)
- CRM de clientes
- Facturas y presupuestos:
  - Generación con cálculo automático USD ↔ ARS según tipo de cambio
  - Vista previa estilo Apple
  - **Descargar PDF** (jsPDF)
  - **Descargar PNG** (html2canvas) para compartir por WhatsApp
  - Compartir directo por WhatsApp con link al cliente

## Deploy en Netlify

1. Push del repo a GitHub.
2. En Netlify: **Add new site → Import from Git → GitHub**.
3. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. **Site settings → Environment variables**: agregar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
5. **Site settings → Build & deploy → Post processing → Asset optimization**: dejar default.
6. Para que las rutas client-side funcionen tras un refresh, Netlify ya respeta el archivo `public/_redirects` (ver más abajo).

## Credenciales de admin

- Email: `maripiljerestore@mjstore.com`
- Password: `12345678`

## Verificación end-to-end

1. `npm run dev` → storefront en `localhost:5173`
2. Visitar `/admin` → redirige a `/admin/login`
3. Login con credenciales → entra al panel
4. **Tienda**: subir logo, completar links, guardar
5. **Inventario**: crear producto con imagen → verificar en storefront
6. **Plan Canje**: cargar modelos → verificar calculadora
7. **Clientes**: agregar cliente
8. **Facturas**: crear presupuesto → "Ver/Exportar" → descargar PDF y PNG
9. `npm run build` → sin errores
