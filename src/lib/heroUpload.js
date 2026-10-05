import { supabase, TABLES, BUCKETS, storagePathFromPublicUrl } from './supabase';
import { cropToBlob, makePlaceholder, loadImage, extensionForType } from './image';

/**
 * Recortes que se publican. Las imágenes chicas no se agrandan (ver cropToBlob).
 * Escritorio: mitad derecha del Hero (~cuadrada). Celular: franja superior (~4:3).
 */
export const HERO_FORMATS = {
  desktop: { id: 'desktop', label: 'Escritorio', ratioLabel: '1:1', aspect: 1, maxWidth: 1600, maxHeight: 1600, placeholderWidth: 24 },
  mobile:  { id: 'mobile',  label: 'Celular',    ratioLabel: '4:3', aspect: 4 / 3, maxWidth: 1200, maxHeight: 900, placeholderWidth: 24 },
};

const HERO_FOLDER = 'hero';
// Los nombres llevan timestamp: cada versión es inmutable y se puede cachear un año
const IMMUTABLE_CACHE_SECONDS = '31536000';
const HERO_URL_FIELDS = ['hero_image_url', 'hero_image_mobile_url', 'hero_original_url'];

async function uploadAsset(path, body, contentType) {
  const bucket = supabase.storage.from(BUCKETS.storeAssets);
  const { error } = await bucket.upload(path, body, { contentType, cacheControl: IMMUTABLE_CACHE_SECONDS, upsert: false });
  if (error) throw error;
  return bucket.getPublicUrl(path).data.publicUrl;
}

/** Borra archivos del Hero (solo dentro de la carpeta hero/). Devuelve { error } sin lanzar. */
async function removeHeroFiles(urls) {
  const paths = urls
    .map((url) => storagePathFromPublicUrl(url, BUCKETS.storeAssets))
    .filter((path) => path && path.startsWith(`${HERO_FOLDER}/`));
  if (paths.length === 0) return { error: null };
  const { error } = await supabase.storage.from(BUCKETS.storeAssets).remove(paths);
  return { error };
}

/** URLs del Hero anterior que la versión nueva ya no usa. */
const staleHeroUrls = (previous, next) =>
  HERO_URL_FIELDS
    .map((field) => previous?.[field])
    .filter((url) => url && !HERO_URL_FIELDS.some((field) => next?.[field] === url));

export async function saveHeroProfile(profileId, payload) {
  if (!profileId) throw new Error('Primero guardá los datos de la tienda en "Tienda".');
  const { data, error } = await supabase
    .from(TABLES.storeProfile)
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', profileId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Recorta los dos formatos, los sube con sus miniaturas y actualiza store_profile.
 * Si algo falla, borra lo que alcanzó a subir. Después de publicar borra el Hero anterior.
 * @returns {Promise<{ profile: object, cleanupError: object|null }>}
 */
export async function publishHeroImage({ profile, source, areas, natural, overlay }) {
  const stamp = Date.now();
  const uploaded = [];
  const upload = async (name, body, type) => {
    const path = `${HERO_FOLDER}/${name}-${stamp}.${extensionForType(type)}`;
    const url = await uploadAsset(path, body, type);
    uploaded.push(path);
    return url;
  };

  try {
    const originalUrl = source.file
      ? await upload('original', source.file, source.file.type)
      : source.originalUrl;
    const image = await loadImage(source.displayUrl);

    const results = {};
    for (const format of Object.values(HERO_FORMATS)) {
      const area = areas[format.id];
      const { blob } = await cropToBlob(image, area, format);
      results[format.id] = {
        url: await upload(format.id, blob, blob.type),
        placeholder: makePlaceholder(image, area, format.placeholderWidth),
      };
    }

    const saved = await saveHeroProfile(profile.id, {
      hero_image_url: results.desktop.url,
      hero_image_mobile_url: results.mobile.url,
      hero_placeholder: results.desktop.placeholder,
      hero_mobile_placeholder: results.mobile.placeholder,
      hero_original_url: originalUrl,
      hero_overlay: overlay,
      hero_crop: {
        sourceWidth: natural.width,
        sourceHeight: natural.height,
        desktop: areas.desktop,
        mobile: areas.mobile,
      },
    });
    const { error } = await removeHeroFiles(staleHeroUrls(profile, saved));
    return { profile: saved, cleanupError: error };
  } catch (error) {
    if (uploaded.length) await supabase.storage.from(BUCKETS.storeAssets).remove(uploaded);
    throw error;
  }
}

/** Quita la imagen del Hero: la landing vuelve al fondo de diseño propio. */
export async function clearHeroImage(profile) {
  const saved = await saveHeroProfile(profile.id, {
    hero_image_url: null,
    hero_image_mobile_url: null,
    hero_placeholder: null,
    hero_mobile_placeholder: null,
    hero_original_url: null,
    hero_crop: null,
  });
  const { error } = await removeHeroFiles(staleHeroUrls(profile, saved));
  return { profile: saved, cleanupError: error };
}
