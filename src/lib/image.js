/**
 * Utilidades de imagen para el editor del Hero (canvas, sin dependencias).
 * Las áreas (`area`) están en píxeles de la imagen original: { x, y, width, height }.
 */

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

/** Valida un archivo elegido por el usuario. Devuelve un mensaje de error o null. */
export function validateImageFile(file) {
  if (!file) return 'No se seleccionó ningún archivo.';
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return 'Formato no soportado. Usá JPG, PNG o WebP.';
  if (file.size > MAX_IMAGE_BYTES) return 'La imagen pesa más de 15 MB. Probá con una versión más liviana.';
  return null;
}

/** Carga una imagen lista para dibujar en canvas (el Storage público de Supabase permite CORS). */
export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo cargar la imagen.'));
    img.src = src;
  });
}

/** Área centrada más grande posible con la proporción `aspect` (ancho / alto). */
export function centeredArea(naturalWidth, naturalHeight, aspect) {
  if (naturalWidth / naturalHeight > aspect) {
    const width = Math.round(naturalHeight * aspect);
    return { x: Math.round((naturalWidth - width) / 2), y: 0, width, height: naturalHeight };
  }
  const height = Math.round(naturalWidth / aspect);
  return { x: 0, y: Math.round((naturalHeight - height) / 2), width: naturalWidth, height };
}

const ASPECT_TOLERANCE = 0.02;

/** ¿El área tiene la proporción `aspect`? Tolera el redondeo a píxeles del recorte. */
export function matchesAspect(area, aspect) {
  if (!area?.width || !area?.height || !aspect) return false;
  return Math.abs(area.width / area.height - aspect) / aspect <= ASPECT_TOLERANCE;
}

/** Convierte un área en píxeles a porcentajes de la imagen (para las vistas previas). */
export function areaToPercent(area, naturalWidth, naturalHeight) {
  return {
    x: (area.x / naturalWidth) * 100,
    y: (area.y / naturalHeight) * 100,
    width: (area.width / naturalWidth) * 100,
    height: (area.height / naturalHeight) * 100,
  };
}

function drawArea(image, area, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, width, height);
  return canvas;
}

const canvasToBlob = (canvas, type, quality) =>
  new Promise((resolve) => canvas.toBlob(resolve, type, quality));

/**
 * Recorta `area` y la escala para que entre en maxWidth × maxHeight, sin agrandar
 * imágenes chicas. Exporta WebP; si el navegador no lo soporta, JPEG.
 */
export async function cropToBlob(image, area, { maxWidth, maxHeight }) {
  const scale = Math.min(1, maxWidth / area.width, maxHeight / area.height);
  const width = Math.max(1, Math.round(area.width * scale));
  const height = Math.max(1, Math.round(area.height * scale));
  const canvas = drawArea(image, area, width, height);

  let blob = await canvasToBlob(canvas, 'image/webp', 0.82);
  if (!blob || blob.type !== 'image/webp') blob = await canvasToBlob(canvas, 'image/jpeg', 0.85);
  if (!blob) throw new Error('El navegador no pudo exportar la imagen.');
  return { blob, width, height };
}

/** Miniatura JPEG en base64 (~1 KB) para mostrar difuminada mientras carga la foto. */
export function makePlaceholder(image, area, width) {
  const height = Math.max(1, Math.round((width * area.height) / area.width));
  return drawArea(image, area, width, height).toDataURL('image/jpeg', 0.6);
}

export const extensionForType = (type) => (type === 'image/webp' ? 'webp' : type === 'image/png' ? 'png' : 'jpg');
