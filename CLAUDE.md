# 🍎 MJ STORE — E-commerce & CRM Project Prompt

Este documento contiene todas las especificaciones, requerimientos y pautas de diseño para desarrollar la plataforma web y CRM de MJ STORE. Debe ser utilizado por el agente de desarrollo como la fuente principal de verdad (Single Source of Truth) para el proyecto.

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

### Color Palette
```css
:root {
  /* Backgrounds */
  --bg-primary:     #FFFFFF;
  --bg-secondary:   #F5F5F7;
  --bg-dark:        #000000;
  --bg-dark-card:   #1C1C1E;

  /* Typography */
  --text-primary:   #1D1D1F;
  --text-secondary: #6E6E73;
  --text-tertiary:  #86868B;
  --text-on-dark:   #F5F5F7;

  /* Accent */
  --accent-blue:    #0066CC;
  --accent-blue-hover: #0077ED;

  /* Borders & Dividers */
  --border-light:   rgba(0, 0, 0, 0.08);
  --border-dark:    rgba(255, 255, 255, 0.12);
}
```

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
2. **Hero Section:** Full-viewport height (`100vh`). Small eyebrow label → bold headline → subheadline → two CTA buttons (Primary solid blue pill, Secondary text-only with arrow).
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
2. En SQL Editor, ejecutar las migraciones (tablas `products`, `trade_in_models`, `leads` — ver sección 3).
3. Crear bucket público `product-images` en Storage.
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
