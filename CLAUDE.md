# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# 🍎 MJ STORE — E-commerce & CRM Project Prompt

Este documento contiene todas las especificaciones, requerimientos y pautas de diseño para desarrollar la plataforma web y CRM de MJ STORE. Debe ser utilizado por el agente de desarrollo como la fuente principal de verdad (Single Source of Truth) para el proyecto.

---

## 0. Working in this codebase

### Stack
- **React 18 + Vite 5** (JSX, no TypeScript). Entry: [src/main.jsx](src/main.jsx) → [src/App.jsx](src/App.jsx).
- **Routing:** `react-router-dom` v6. Public storefront at `/`, admin under `/admin/*` gated by [src/router/ProtectedRoute.jsx](src/router/ProtectedRoute.jsx).
- **Backend:** Supabase (auth + Postgres + Storage). Single client in [src/lib/supabase.js](src/lib/supabase.js); env vars `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- **UI kit:** Tailwind v4 (sin preflight) + shadcn/ui (`Button`, `Card` en [src/components/ui/](src/components/ui/)) e íconos `lucide-react`. [src/styles/shadcn.css](src/styles/shadcn.css) mapea los colores de Tailwind a los tokens de tema de `design-system.css`; alias `@` → `src/`.
- **PDF/export:** `jspdf` + `html2canvas` via [src/lib/export.js](src/lib/export.js), used by [src/components/InvoiceDocument.jsx](src/components/InvoiceDocument.jsx).

### Commands
- `npm run dev` — Vite dev server
- `npm run build` — production build to `dist/`
- `npm run preview` — preview the built bundle
- `npm test` — Vitest, **solo lógica pura** (grilla de widgets, reconciliación del catálogo, métricas, formato de fechas). Tests en carpetas `__tests__/` junto al código. No hay linter ni tests de componentes; no agregarlos sin pedirlo.

### Architecture map
- **Storefront** ([src/pages/Store.jsx](src/pages/Store.jsx)) composes [Nav](src/components/Nav.jsx), [Hero](src/components/Hero.jsx), [CategoryBar](src/components/CategoryBar.jsx), [ProductCarousel](src/components/ProductCarousel.jsx), [BentoGrid](src/components/BentoGrid.jsx), [TradeInCalculator](src/components/TradeInCalculator.jsx), [ContactSection](src/components/ContactSection.jsx), [Footer](src/components/Footer.jsx), and [SocialFAB](src/components/SocialFAB.jsx) (menú flotante desplegable con WhatsApp, Instagram y Facebook tomados de Admin → Perfil).
- **Admin/CRM** ([src/pages/admin/](src/pages/admin/)) is a nested route under [AdminLayout](src/pages/admin/AdminLayout.jsx) with children: `Dashboard`, `Profile`, `Appearance`, `Inventory`, `TradeInConfig`, `CashMovements`, `Clients`, `Invoices`. AdminLayout comparte el perfil por `<Outlet context={{ profile, setProfile, profileLoading }}>` (lo usa Apariencia).
- **Inicio del admin = grilla de widgets personalizable** ([Dashboard.jsx](src/pages/admin/Dashboard.jsx)). Tres capas:
  - *Catálogo* (código): [inicio/catalog.js](src/pages/admin/inicio/catalog.js) (ids, categoría, tamaño de fábrica, límites, visuales) + [inicio/widgets.js](src/pages/admin/inicio/widgets.js) (id → componente).
  - *Layout* (Supabase): `dashboard_layouts` por (usuario, pantalla), escrito **solo** por la RPC `save_dashboard_layout` (migración `010`).
  - *Motor* (genérico, no conoce los datos): [src/lib/widgets/](src/lib/widgets/) (matemática pura + `createRegistry`/`mergeLayout`) y [src/components/widgets/](src/components/widgets/) (`WidgetPanel` con borrador/guardar, `WidgetGrid` sobre react-grid-layout 1.x, menú ⋮ de teclado, catálogo por categorías).
  - Grilla de 8 columnas y filas sin límite; el alto de fila se calcula para que las **primeras 8 filas (encuadre 8×8) ocupen justo la pantalla**. Solo se persiste el layout de escritorio; tablet/celular se derivan y no se editan.
  - **Vistas**: pestañas Ventas y compras · Finanzas · Inventario (fijas, de solo lectura, definidas en [inicio/presets.js](src/pages/admin/inicio/presets.js)) · Personalizado (el layout guardado). "Usar como base" copia una vista fija al borrador de Personalizado. La pestaña activa se recuerda por navegador (`localStorage`). La "ganancia" de Finanzas es el resultado de caja (entradas − salidas): no hay costo por producto.
  - Los widgets reciben solo `{ config }`, traen sus datos con los hooks de TanStack Query de [hooks/dashboard/queries.js](src/hooks/dashboard/queries.js), leen el período con `usePeriod()` y usan las superficies `ChartPanel` / `ListPanel` ([surfaces.jsx](src/components/dashboard/surfaces.jsx)) o `StatCard`. Los cálculos van en [lib/dashboard/metrics.js](src/lib/dashboard/metrics.js). Estilos en [widgets.css](src/styles/widgets.css).
- **Inventario = Modelo → Variantes.** Un modelo es una fila de `catalog_models` (tipo, `line` como "iPhone 15", foto, descripción, `is_active`); cada fila de `products` es una **variante** (`model_id` obligatorio + capacidad, color, estado, `battery_health`, precios, stock y foto propia opcional que pisa la del modelo). `products.name`, `model` y `category` se derivan del modelo con `buildVariantName` (los usan Facturas y el Inicio) y [lib/inventory/api.js](src/lib/inventory/api.js) los rehace al renombrar el modelo. Lógica pura (agrupado por línea, filtros, selector de la tienda) en [lib/inventory/variants.js](src/lib/inventory/variants.js); UI en [components/admin/inventory/](src/components/admin/inventory/). La tienda muestra una tarjeta por modelo y el [VariantPicker](src/components/VariantPicker.jsx) para elegir la variante. Para escribir en la base, usar las funciones de `api.js` y no `supabase.from(TABLES.products)` directo.
- **Datos del servidor:** TanStack Query (`QueryClientProvider` en [main.jsx](src/main.jsx), cliente en [lib/queryClient.js](src/lib/queryClient.js)). Por ahora solo lo usa el Inicio; el resto de las pantallas siguen con `useEffect` + Supabase.
- **Hooks:** [useAuth](src/hooks/useAuth.js) (Supabase session), [useStoreProfile](src/hooks/useStoreProfile.js) (store config), [useScrollObserver](src/hooks/useScrollObserver.js) (IntersectionObserver fade-ins per design system).
- **Shared UI primitives:** [src/components/ui/](src/components/ui/) — `Modal`, `InlinePanel`, `SortableHeader`. Admin-only widgets go in [src/components/admin/](src/components/admin/).
- **Styles:** design tokens in [src/styles/design-system.css](src/styles/design-system.css) (single source of truth — see §4); component styles in [src/styles/components.css](src/styles/components.css); admin in [src/styles/admin.css](src/styles/admin.css).
- **Currency:** prices are handled in USD and ARS. The ARS-per-USD rate is `exchange_rate_ars_per_usd` in the `store_profile` row (read with `useStoreProfile`). Format with the helpers in [src/lib/format.js](src/lib/format.js) (`formatARS`, `formatUSD`, `formatDate`, all `es-AR`).
- **SPA routing on Netlify:** [netlify.toml](netlify.toml) and [public/_redirects](public/_redirects) rewrite `/*` → `/index.html`. New client routes need no server config.

### Database & migrations
- SQL migrations live in [supabase/migrations/](supabase/migrations/) (`001` … `012`), applied manually via Supabase SQL Editor. There is no migration CLI wired up — run them in order when bootstrapping a new project. New schema changes go in the next numbered file.
- The real schema is larger than the minimum in §3. Besides `products`, `trade_in_models` and `leads`, it has `store_profile`, `clients`, `client_notes`, `invoices` (with installments), `cash_movements`, `cash_categories`, `payment_methods`, and the product taxonomy tables `catalog_types`, `catalog_models` (también es la ficha del modelo del inventario, migración `011`), `catalog_capacities`, `catalog_conditions` and `catalog_colors` (used by `TaxonomyPicker` / `CatalogSelect`).
- **Facturas y presupuestos** (`invoices.type`): cada tipo tiene su propio correlativo en `invoice_number`, que asigna el trigger `assign_invoice_number` (migración `012`): no mandarlo desde el cliente; es inmutable y el tipo no se cambia al editar. Un presupuesto pasa a factura solo con la RPC `convert_quote_to_invoice` (crea la factura con `source_invoice_id`, le **mueve** las cuotas y aprueba el presupuesto). La pantalla ([Invoices.jsx](src/pages/admin/Invoices.jsx)) muestra dos tablas ([InvoiceTable](src/components/admin/invoices/InvoiceTable.jsx)) ordenadas por N° desc; filtro/orden en [lib/invoices/list.js](src/lib/invoices/list.js).
- Reference tables and buckets through the `TABLES` / `BUCKETS` constants exported from [src/lib/supabase.js](src/lib/supabase.js), not string literals. There are two buckets: `product-images` and `store-assets` (logo y Hero en `store-assets/hero/`).
- RLS policies and seeds are part of the migration files; check there before reading tables from new code. `003`, `004`, `006` and `008` are demo seed data.

### Conventions worth knowing
- JSX-only — do not introduce TypeScript files.
- All UI copy is in Spanish (Argentina).
- Use the semantic CSS variables from `design-system.css` (e.g. `var(--accent)`, `var(--surface-card)`) instead of hardcoding colors; they switch with the active theme (see §4).
- Scroll-reveal animations go through `useScrollObserver`, not ad-hoc IntersectionObserver code.
- Don't put `.fade-in` on an element whose `className` changes with React state: React rewrites the class list and drops the `is-visible` added by `useScrollObserver` (the element goes back to `opacity: 0`). Use a `data-*` attribute for the state, or a static wrapper.
- Consultas que pueden superar 1000 filas (facturas, movimientos, clientes): usar `allRows` de [pagination.js](src/lib/pagination.js) con un `.order('id')` final; PostgREST corta en 1000 sin avisar.
- Fechas de columnas `date` (`YYYY-MM-DD`): parsear con `parseLocalDate` / comparar con `todayLocalISO` de [format.js](src/lib/format.js); `new Date('2026-10-04')` es UTC y en Argentina da el día anterior.

### Agregar un widget al Inicio
1. Crear el componente en [src/components/dashboard/widgets/](src/components/dashboard/widgets/): recibe solo `{ config }`, raíz a alto completo, usa `ChartPanel` / `ListPanel` / `StatCard` y un hook de `queries.js` (o uno nuevo ahí). Estados con `QueryState` (cargando, vacío y error son distintos). Se adapta al tamaño con `@container widget`, no con media queries.
2. Sumarlo a `CATALOG` en [inicio/catalog.js](src/pages/admin/inicio/catalog.js) con un `id` nuevo en `snake_case` (**contrato estable**: se guarda en la base; renombrarlo pierde la posición de todos), su `group`, un preset de límites (`KPI`, `REPARTO`, `SERIE`, `GRANDE`, `MODULO`), `defaults` y `isDefault: false` (así no le mueve nada a quien ya personalizó; entra oculto y se agrega desde el catálogo). Para formas alternativas, `visuals: ['line', 'bars']` y leer `config.visual`.
3. Mapear `id → componente` en [inicio/widgets.js](src/pages/admin/inicio/widgets.js) (falla al arrancar si falta).
4. No tocar la base: `mergeLayout` lo incorpora en la próxima lectura.
5. `npm test` + `npm run build`, abrir Inicio → Personalizar → Agregar widget → Guardar → recargar.

Para cambiar una vista fija: editar sus `items` en [inicio/presets.js](src/pages/admin/inicio/presets.js) (x, y, w, h en celdas) y correr `npm test`: `presets.test.js` exige que el encuadre 8×8 quede completo, sin huecos ni superposiciones, y que se respeten los límites de cada widget.

---

## 1. Resumen del Proyecto

- **Nombre del Negocio:** MJ STORE
- **Modelo de Negocio:** Comercialización exclusiva de toda la gama de productos Apple (Solo venta, no se realizan reparaciones ni servicio técnico).
- **Objetivo Principal:** Construir una aplicación web e-commerce premium inspirada en el diseño de Apple, junto con un panel de administración (CRM) para gestionar ventas, productos y cotizaciones de equipos usados (Plan Canje).
- **Stack Tecnológico Requerido:**
  - **Frontend:** HTML, Vanilla CSS y JavaScript (o un framework moderno si el agente lo considera óptimo para el CRM, pero respetando estrictamente el sistema de diseño).
  - **Backend y Base de Datos:** **Supabase** (para Autenticación de administradores, Base de datos de productos/CRM y Storage para fotos de productos).

---

## 2. Requerimientos Funcionales y Características (Features)

### A. Interfaz de Usuario (Storefront / Cliente)
- **Catálogo de Productos:** Visualización de productos organizados por categoría (iPhone, Mac, iPad, Watch, etc.). Se requiere que el sistema permita mostrar **fotos reales** de los productos Apple comercializados.
- **Sistema de Plan Canje:** 
  - Una sección dedicada donde el usuario pueda consultar una **tabla de cotización estimada**.
  - Debe permitir seleccionar el modelo de su equipo usado y el estado del mismo para obtener una cotización rápida.
- **Accesos Rápidos de Contacto:** 
  - Botones flotantes o en ubicaciones estratégicas para contacto directo vía **WhatsApp**.
  - Enlaces a redes sociales de la tienda.
  - Información y mapa/dirección del **local comercial**.
- **Diseño Premium:** La página entera debe sentirse como una web oficial de Apple (ver sección de Diseño).

### B. Panel de Administración y CRM (Uso Interno)
- **Perfil de Administrador:** Acceso restringido y seguro mediante Supabase Auth.
- **Gestión de Inventario (ABM):**
  - Interfaz intuitiva para poder **cargar, categorizar, editar y eliminar** productos desde la propia página (sin tener que tocar código ni ir a la consola de Supabase).
  - Carga de imágenes reales de los productos al Storage de Supabase.
- **Gestión de CRM / Clientes:**
  - Panel para visualizar consultas entrantes (ej. cotizaciones del Plan Canje o leads de WhatsApp si se integran formularios previos).

---

## 3. Arquitectura de Base de Datos Sugerida (Supabase)

El agente deberá crear y configurar al menos las siguientes tablas en Supabase:

1. **`products`**: `id`, `name`, `category`, `description`, `price`, `stock`, `image_url`, `created_at`.
2. **`trade_in_models`** (Modelos para Plan Canje): `id`, `device_model`, `estimated_value`, `condition_rules`.
3. **`leads`** (CRM): `id`, `customer_name`, `phone_number`, `device_interest`, `trade_in_device_id`, `status` (nuevo, contactado, cerrado), `created_at`.

---

## 4. 🎨 Sistema de Diseño y Prompt de UI (ESTRICTO)

**Misión para el desarrollador Frontend:**
Build a **premium, Apple-inspired web application**. The design must feel world-class — on par with Apple's product pages. Every pixel should feel intentional. Mediocre or basic-looking output is NOT acceptable.

### Temas — Oscuro Bordó y Claro Acero

Dos temas, elegidos **por separado** para la tienda pública y para el panel admin (login incluido) desde **Admin → Apariencia**. Se guardan en `store_profile.storefront_theme` / `admin_theme` (migración `009`).

| Tema | Fondo | Principal (CTA) | Acento de texto | Superficies |
|---|---|---|---|---|
| **Oscuro Bordó** (`dark`, por defecto) | Negro `#000000` | Bordó metálico `#6A4249`→`#4F2F36`, texto plata | Rosado `#B5848D` | Vidrio bordó profundo (`#140B0D`, `#261619`) con glow sutil |
| **Claro Acero** (`light`) | Gris muy claro `#EBECED` | Azul grisáceo `#B7C3D5`, texto carbón | Acero profundo `#4A5870` | Vidrio esmerilado blanco con halo acero |

**Cómo funciona**:
- Los colores literales viven **solo** en `design-system.css`. Los componentes usan tokens semánticos: `--surface-*`, `--text-*`, `--accent*`, `--cta-*`, `--glass-*`, `--border-*`, `--focus-ring`, estados (`--success`, `--danger`, `--warning` + `-tint`) y `--chart-1…8` para gráficos.
- El tema se aplica con `data-theme` en `<html>` mediante [src/lib/theme.js](src/lib/theme.js) (`useDocumentTheme(scope, theme)`). Un script inline en `index.html` aplica el último tema guardado (localStorage) antes del primer pintado.
- `data-theme` funciona en **cualquier** elemento (vistas previas de Apariencia). El bloque oscuro va después del claro a propósito; no reordenar.
- `.surface-dark` = "siempre oscuro": en el tema claro lo usan el Hero (cinematográfico, carbón + acero) y el footer.
- **Glass + glow**: `.pcard`, `.bento__cell`, `.tradein__panel`, `.admin-card`, `.stat`, `.dash-quadrant`, `.auth-card` y `.glass` (incluye el `Card` de shadcn) toman el vidrio desde `design-system.css`: **no declararles `background`/`border`/`box-shadow` propios**. El vidrio va en `::before` (un `backdrop-filter` en el elemento atraparía a los hijos `position: fixed`), la línea de luz en `::after`.
- Contraste verificado ≥4.5:1 en todos los pares texto/fondo de ambos temas; revalidar si se agrega un color.
- WhatsApp mantiene su verde de marca (`--whatsapp`), siempre con texto/ícono carbón.
- Logos oscuros (PNG negro transparente) se muestran como silueta plata en zonas oscuras (filtro en `.nav__logo img` y `.admin__brand-logo--img`).
- Facturas (PDF/PNG): papel siempre blanco (`.invoice-doc` fija sus propios tokens y usa `--paper*`). **No usar `color-mix()` en `.invoice-doc*`**: `html2canvas` no lo soporta y rompe la exportación.
- Verificar colores fijos fuera de tokens con:
  `grep -rnE "#[0-9A-Fa-f]{3,8}" src --include=*.css --include=*.jsx | grep -v design-system.css`

### Imagen del Hero (Apariencia)
- Editor: [HeroImageEditor](src/components/admin/HeroImageEditor.jsx) con `react-easy-crop`. Dos recortes (escritorio 1:1 → máx. 1600×1600, celular 4:3 → máx. 1200×900) exportados en WebP (JPEG si no hay soporte), más miniaturas base64 (~1 KB) y "Oscurecer foto" (`hero_overlay`, 0–90 %). Un `hero_crop` con otras proporciones (diseño anterior) se descarta con `matchesAspect` y el editor pide reencuadrar. Lógica de publicación en [src/lib/heroUpload.js](src/lib/heroUpload.js); se guarda el original y el encuadre (`hero_original_url`, `hero_crop`) para reajustar sin volver a subir. Al publicar se borran los archivos anteriores de `store-assets/hero/`.
- Landing ([Hero.jsx](src/components/Hero.jsx)): Hero **dividido**, el texto nunca va sobre la foto. Escritorio: grilla de 2 columnas, texto a la izquierda (alineado al contenedor del Nav) y foto a la derecha a alto completo. Celular (≤768px): foto arriba, que llena lo que deja el texto (mín. 28svh), y texto abajo. El fundido hacia el texto es un `mask-image` en `.hero__media`. Sin foto publicada, en celular no se reserva la franja. Carga en capas → fondo de diseño del tema → miniatura difuminada → foto con fade (~900 ms, respeta `prefers-reduced-motion`). La caché local ([src/lib/heroCache.js](src/lib/heroCache.js), clave `mj-hero`) muestra el placeholder y precarga la foto desde `index.html` en visitas repetidas, antes de que responda Supabase.

### Scroll guiado (landing)
- La tienda avanza **de a una pantalla por gesto** con scroll-snap nativo. [useSnapScroll](src/hooks/useSnapScroll.js) pone `.snap-scroll` en `<html>` solo mientras se ve la tienda; estilos en [snap-scroll.css](src/styles/snap-scroll.css).
- Cada pantalla es un `.snap-slide` de alto `--slide-h` (`100svh` − nav) y **su contenido debe entrar en ese alto** (verificar en 375×548, iPhone SE con barras de Safari). La última pantalla es Contacto + footer compacto.
- Una sección nueva lleva `snap-slide` y su entrada en [src/lib/sections.js](src/lib/sections.js) (links del Nav y puntos de [SectionDots](src/components/SectionDots.jsx)). Para saltar a una sección usar `scrollToSection(id)`.
- Con altura < 481px (celular apaisado) el snap se apaga y vuelve el scroll normal.

> Estos tokens viven en `src/styles/design-system.css` y son la fuente de verdad para todo el styling de la app.

### Typography
- **Font**: Import `SF Pro Display` via system font stack:  
  `font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif;`
- **Scale**:
  - Hero Headline: `clamp(48px, 7vw, 80px)`, 700 weight
  - Section Title: `clamp(36px, 5vw, 56px)`, 700 weight
  - Subheading: `28px–34px`, 600 weight
  - Body: `17px–19px`, 400 weight
- **Text alignment**: Center for hero/section titles, left-aligned for card/grid content.

### Page Layout Architecture
1. **Global Navigation (Sticky):** Glassmorphism blur `rgba(255,255,255,0.72)` with `backdrop-filter: blur(20px) saturate(180%)`.
2. **Hero Section:** Full-viewport height (`100vh`). Small eyebrow label → bold headline → subheadline → two CTA buttons (Primary silver metallic on the charcoal hero, Secondary ghost with steel border).
3. **Product Lineup / Carousel Section:** Horizontal scrollable card strip with chevron navigation. Cards with `border-radius: 20px`, white background, subtle shadow. Hover deepens shadow and translates Y.
4. **Feature Mosaic Grid:** CSS Grid (bento-box style). Mixed cell sizes, `border-radius: 28px–30px`.
5. **Full-Bleed Cinematic Section:** Edge-to-edge background with overlaid text.

### ✨ Animations & Interactions
- **Scroll Animations:** Use IntersectionObserver for all "fade in on scroll" elements. Default `opacity: 0; transform: translateY(30px)`, active `opacity: 1; transform: translateY(0)`.
- **Hover Effects:** Smooth transitions for transform, box-shadow, and background colors.

### ✅ Quality Checklist (Must Pass)
- [ ] Navigation is sticky with glassmorphism blur on scroll
- [ ] Hero section is full-viewport-height with dramatic typography
- [ ] At least one bento-box mosaic grid section
- [ ] At least one horizontal product carousel with chevron navigation
- [ ] All elements fade-in on scroll using IntersectionObserver
- [ ] No placeholder Lorem Ipsum — all content is meaningful
- [ ] Page feels **PREMIUM** — not generic, not basic

> **Tone**: Think like an Apple designer. Every detail matters. White space is intentional. Less is more. The product is the hero.

---

## 5. Configuración de Entorno y Despliegue

### 5.1 Variables de Entorno

La app lee credenciales desde variables de entorno (Vite). Crear `.env.local` en la raíz del proyecto (ya está en `.gitignore`) con:

| Variable                  | Descripción                            | Dónde obtenerla                                            |
|---------------------------|----------------------------------------|------------------------------------------------------------|
| `VITE_SUPABASE_URL`       | URL del proyecto Supabase              | Supabase Dashboard → Project Settings → API → Project URL  |
| `VITE_SUPABASE_ANON_KEY`  | Clave pública anon (frontend)          | Supabase Dashboard → Project Settings → API → anon/public  |

Plantilla en `.env.example`. **Nunca commitear `.env.local`.**

> La `anon key` está diseñada para ser pública: la seguridad real la dan las políticas **Row Level Security (RLS)** en Supabase. La `service_role key` NO se usa en este proyecto (todo el acceso es desde el frontend).

### 5.2 Usuario Administrador

- **Email:** `maripiljerestore@mjstore.com`
- **Password:** `12345678`
- Crear manualmente desde **Supabase Dashboard → Authentication → Users → Add user** (marcar "Auto Confirm User" para que pueda loguearse sin verificar email).
- El email es ficticio y solo sirve como identificador de login interno.

### 5.3 Setup inicial de Supabase

1. Crear proyecto en https://supabase.com (plan Free).
2. En SQL Editor, ejecutar las migraciones `001` … `012` en orden (ver §0 → Database & migrations).
3. Verificar los buckets públicos `product-images` y `store-assets` en Storage (los crea `001_init.sql`).
4. Activar **Row Level Security** en todas las tablas.
5. Políticas mínimas:
   - `products` y `trade_in_models`: SELECT público; INSERT/UPDATE/DELETE solo para usuario autenticado.
   - `leads`: INSERT público (formulario de contacto); SELECT/UPDATE solo para autenticado.
6. Crear el usuario admin (sección 5.2).
7. Copiar URL y anon key al `.env.local`.

### 5.4 Despliegue en Netlify (GitHub integration)

1. Crear repositorio en GitHub y hacer push del proyecto.
2. En https://app.netlify.com → "Add new site" → "Import an existing project" → GitHub.
3. Seleccionar el repo. Build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
4. En **Site settings → Environment variables**, agregar las MISMAS dos vars que `.env.local`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Disparar deploy. La app queda en `https://<nombre-elegido>.netlify.app`.
6. Cada `git push` a `main` redespliega automáticamente.

### 5.5 Checklist pre-deploy

- [ ] `.env.local` existe localmente con valores reales
- [ ] `.env.local` está en `.gitignore`
- [ ] `.env.example` existe sin valores reales
- [ ] Tablas y RLS configuradas en Supabase
- [ ] Bucket `product-images` creado y público
- [ ] Usuario admin creado en Supabase Auth
- [ ] Variables de entorno cargadas en Netlify
- [ ] Build local (`npm run build`) funciona sin errores
