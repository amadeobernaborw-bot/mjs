/**
 * Fuentes de la imagen del Hero + caché local de la última visita.
 * La caché permite mostrar el placeholder difuminado (y precargar la foto
 * desde index.html) antes de que responda Supabase.
 * La clave debe coincidir con el script inline de index.html.
 */
const HERO_CACHE_KEY = 'mj-hero';

export const DEFAULT_HERO_OVERLAY = 55;
export const MAX_HERO_OVERLAY = 90;

const isHttpsUrl = (value) => typeof value === 'string' && value.startsWith('https://');
const isDataImage = (value) => typeof value === 'string' && value.startsWith('data:image/');

export function clampOverlay(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_HERO_OVERLAY;
  return Math.min(MAX_HERO_OVERLAY, Math.max(0, Math.round(n)));
}

/** Normaliza las columnas de store_profile; null si no hay imagen configurada. */
export function heroSourcesFromProfile(profile) {
  if (!isHttpsUrl(profile?.hero_image_url)) return null;
  return {
    desktop: profile.hero_image_url,
    mobile: isHttpsUrl(profile.hero_image_mobile_url) ? profile.hero_image_mobile_url : null,
    placeholder: isDataImage(profile.hero_placeholder) ? profile.hero_placeholder : null,
    mobilePlaceholder: isDataImage(profile.hero_mobile_placeholder) ? profile.hero_mobile_placeholder : null,
    overlay: clampOverlay(profile.hero_overlay ?? DEFAULT_HERO_OVERLAY),
  };
}

export function readHeroCache() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(HERO_CACHE_KEY) || 'null');
    if (!parsed || !isHttpsUrl(parsed.desktop)) return null;
    return {
      desktop: parsed.desktop,
      mobile: isHttpsUrl(parsed.mobile) ? parsed.mobile : null,
      placeholder: isDataImage(parsed.placeholder) ? parsed.placeholder : null,
      mobilePlaceholder: isDataImage(parsed.mobilePlaceholder) ? parsed.mobilePlaceholder : null,
      overlay: clampOverlay(parsed.overlay),
    };
  } catch {
    return null;
  }
}

/** Guarda (o borra, si `sources` es null) la imagen vigente para la próxima visita. */
export function writeHeroCache(sources) {
  try {
    if (sources) window.localStorage.setItem(HERO_CACHE_KEY, JSON.stringify(sources));
    else window.localStorage.removeItem(HERO_CACHE_KEY);
  } catch {
    // Almacenamiento bloqueado: solo se pierde la carga instantánea en la próxima visita
  }
}
