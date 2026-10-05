import { useCallback, useEffect, useRef, useState } from 'react';
import Cropper from 'react-easy-crop';
import { ImagePlus, Save, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import HeroPreview from './HeroPreview';
import { friendlyDbError } from '../../lib/supabase';
import { HERO_FORMATS, publishHeroImage, clearHeroImage, saveHeroProfile } from '../../lib/heroUpload';
import { DEFAULT_HERO_OVERLAY, MAX_HERO_OVERLAY, clampOverlay } from '../../lib/heroCache';
import { ACCEPTED_IMAGE_TYPES, validateImageFile, loadImage, centeredArea, areaToPercent, matchesAspect } from '../../lib/image';

const FORMAT_LIST = Object.values(HERO_FORMATS);
const MIN_RECOMMENDED_WIDTH = 1600;
const MAX_ZOOM = 3;
const AREA_TOLERANCE_PX = 2;
const INITIAL_VIEW = { crop: { x: 0, y: 0 }, zoom: 1 };

const sameArea = (a, b) =>
  Boolean(a && b) && ['x', 'y', 'width', 'height'].every((k) => Math.abs(a[k] - b[k]) <= AREA_TOLERANCE_PX);

/** Imagen guardada: el original si existe (permite reencuadrar), si no la versión publicada. */
function sourceFromProfile(profile) {
  const url = profile?.hero_original_url || profile?.hero_image_url;
  return url ? { displayUrl: url, originalUrl: url, file: null } : null;
}

/** ¿El encuadre guardado es de un diseño anterior del Hero (otras proporciones)? */
const isCropOutdated = (crop) =>
  Boolean(crop?.desktop && crop?.mobile) &&
  FORMAT_LIST.some((f) => !matchesAspect(crop[f.id], f.aspect));

/** Encuadres guardados, solo si corresponden a esta misma imagen fuente y a las proporciones actuales. */
function savedAreasFor(profile, source, natural) {
  const crop = profile?.hero_crop;
  if (!source || source.file || !natural || source.originalUrl !== profile?.hero_original_url) return null;
  if (!crop?.desktop || !crop?.mobile || isCropOutdated(crop)) return null;
  if (crop.sourceWidth !== natural.width || crop.sourceHeight !== natural.height) return null;
  return { desktop: crop.desktop, mobile: crop.mobile };
}

const defaultAreas = (natural) => ({
  desktop: centeredArea(natural.width, natural.height, HERO_FORMATS.desktop.aspect),
  mobile: centeredArea(natural.width, natural.height, HERO_FORMATS.mobile.aspect),
});

export default function HeroImageEditor({ profile, storefrontTheme, onSaved }) {
  const [source, setSource] = useState(() => sourceFromProfile(profile));
  const [natural, setNatural] = useState(null);
  const [areas, setAreas] = useState(null);
  const [views, setViews] = useState({ desktop: INITIAL_VIEW, mobile: INITIAL_VIEW });
  const [activeFormat, setActiveFormat] = useState('desktop');
  const [cropperVersion, setCropperVersion] = useState(0);
  const [overlay, setOverlay] = useState(() => clampOverlay(profile?.hero_overlay ?? DEFAULT_HERO_OVERLAY));
  const [busy, setBusy] = useState(null);
  const [message, setMessage] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Al cambiar de imagen: medirla y preparar los recortes (guardados o centrados)
  useEffect(() => {
    if (!source) {
      setNatural(null);
      setAreas(null);
      return undefined;
    }
    let cancelled = false;
    setNatural(null);
    loadImage(source.displayUrl)
      .then((img) => {
        if (cancelled) return;
        const dims = { width: img.naturalWidth, height: img.naturalHeight };
        setAreas(savedAreasFor(profile, source, dims) || defaultAreas(dims));
        setViews({ desktop: INITIAL_VIEW, mobile: INITIAL_VIEW });
        setNatural(dims);
      })
      .catch(() => {
        if (!cancelled) setMessage({ type: 'error', text: 'No se pudo abrir la imagen. Probá subirla de nuevo.' });
      });
    return () => { cancelled = true; };
    // Solo al cambiar de imagen; el perfil se lee en ese momento
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source?.displayUrl]);

  // Liberar las URLs temporales de archivos locales
  useEffect(() => {
    const url = source?.displayUrl;
    return () => { if (url?.startsWith('blob:')) URL.revokeObjectURL(url); };
  }, [source?.displayUrl]);

  const savedOverlay = clampOverlay(profile?.hero_overlay ?? DEFAULT_HERO_OVERLAY);
  const savedAreas = savedAreasFor(profile, source, natural);
  const isImageDirty = Boolean(source) && (
    Boolean(source.file) || !savedAreas ||
    !sameArea(areas?.desktop, savedAreas.desktop) || !sameArea(areas?.mobile, savedAreas.mobile)
  );
  const isDirty = isImageDirty || overlay !== savedOverlay;
  const hasPublishedImage = Boolean(profile?.hero_image_url);
  const needsReframe = hasPublishedImage && Boolean(source) && !source.file && isCropOutdated(profile?.hero_crop);
  const isReady = !source || Boolean(natural && areas);
  const view = views[activeFormat];
  const percentAreas = natural && areas
    ? Object.fromEntries(FORMAT_LIST.map((f) => [f.id, areaToPercent(areas[f.id], natural.width, natural.height)]))
    : null;

  const chooseFile = (file) => {
    const error = validateImageFile(file);
    if (error) {
      setMessage({ type: 'error', text: error });
      return;
    }
    setMessage(null);
    setConfirmRemove(false);
    setActiveFormat('desktop');
    setSource({ displayUrl: URL.createObjectURL(file), originalUrl: null, file });
  };

  const dropHandlers = {
    onDragOver: (e) => { e.preventDefault(); setIsDragging(true); },
    onDragLeave: () => setIsDragging(false),
    onDrop: (e) => {
      e.preventDefault();
      setIsDragging(false);
      chooseFile(e.dataTransfer.files?.[0]);
    },
  };

  const updateView = (patch) =>
    setViews((v) => ({ ...v, [activeFormat]: { ...v[activeFormat], ...patch } }));

  const handleCropComplete = useCallback(
    (_, pixels) => setAreas((prev) => (prev ? { ...prev, [activeFormat]: pixels } : prev)),
    [activeFormat],
  );

  const handleSave = async () => {
    setBusy('saving');
    setMessage(null);
    try {
      const result = isImageDirty
        ? await publishHeroImage({ profile, source, areas, natural, overlay })
        : { profile: await saveHeroProfile(profile.id, { hero_overlay: overlay }), cleanupError: null };
      onSaved(result.profile);
      if (isImageDirty) {
        // La vista sigue usando la imagen local; ahora queda asociada al original publicado
        setSource((s) => ({ ...s, file: null, originalUrl: result.profile.hero_original_url }));
      }
      setMessage(result.cleanupError
        ? { type: 'warning', text: 'Publicado. No se pudieron borrar los archivos de la imagen anterior (carpeta hero/ en Supabase Storage).' }
        : { type: 'ok', text: 'Listo: la landing ya muestra el nuevo Hero.' });
    } catch (err) {
      setMessage({ type: 'error', text: friendlyDbError(err) });
    } finally {
      setBusy(null);
    }
  };

  const handleRemove = async () => {
    if (!confirmRemove) {
      setConfirmRemove(true);
      return;
    }
    setBusy('removing');
    setMessage(null);
    try {
      const result = await clearHeroImage(profile);
      onSaved(result.profile);
      setSource(null);
      setMessage({ type: 'ok', text: 'Imagen quitada. La landing muestra el fondo de diseño del tema.' });
    } catch (err) {
      setMessage({ type: 'error', text: friendlyDbError(err) });
    } finally {
      setBusy(null);
      setConfirmRemove(false);
    }
  };

  const discardChanges = () => {
    const saved = sourceFromProfile(profile);
    setOverlay(savedOverlay);
    setMessage(null);
    setConfirmRemove(false);
    if (saved && saved.displayUrl === source?.displayUrl && savedAreas) {
      setAreas(savedAreas);
      setCropperVersion((v) => v + 1);
    } else {
      setSource(saved);
    }
  };

  return (
    <Card className="appearance-section">
      <CardContent>
        <div className="appearance-section__head">
          <h2 className="appearance-section__title">Imagen del Hero</h2>
          <p className="appearance-section__hint">
            La foto va a la derecha del texto en escritorio y arriba del texto en celular, fundida hacia el fondo.
            Recortá una versión para cada uno. La landing la carga de forma progresiva: primero una vista
            difuminada y después la foto con un fundido suave.
          </p>
        </div>

        {needsReframe && (
          <p className="form-message form-message--warning">
            El diseño del Hero cambió: revisá el encuadre de cada formato y publicá.
          </p>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(',')}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => { chooseFile(e.target.files?.[0]); e.target.value = ''; }}
        />

        {!source ? (
          <button
            type="button"
            className={`hero-editor__dropzone ${isDragging ? 'is-dragging' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            {...dropHandlers}
          >
            <ImagePlus className="size-8" aria-hidden="true" />
            <strong>Subí una imagen para el Hero</strong>
            <span>Arrastrala acá o hacé clic. JPG, PNG o WebP, hasta 15 MB. Ideal: 2400 px de ancho o más.</span>
          </button>
        ) : (
          <div className={`hero-editor ${isDragging ? 'is-dragging' : ''}`} {...dropHandlers}>
            <div className="hero-editor__workspace">
              <div className="segmented" role="tablist" aria-label="Formato del recorte">
                {FORMAT_LIST.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    role="tab"
                    aria-selected={activeFormat === f.id}
                    className={`segmented__btn ${activeFormat === f.id ? 'is-active' : ''}`}
                    onClick={() => setActiveFormat(f.id)}
                  >
                    {f.label} · {f.ratioLabel}
                  </button>
                ))}
              </div>

              <div className="hero-editor__cropper">
                {isReady ? (
                  <Cropper
                    key={`${activeFormat}|${source.displayUrl}|${cropperVersion}`}
                    image={source.displayUrl}
                    aspect={HERO_FORMATS[activeFormat].aspect}
                    crop={view.crop}
                    zoom={view.zoom}
                    maxZoom={MAX_ZOOM}
                    initialCroppedAreaPixels={areas[activeFormat]}
                    onCropChange={(crop) => updateView({ crop })}
                    onZoomChange={(zoom) => updateView({ zoom })}
                    onCropComplete={handleCropComplete}
                  />
                ) : (
                  <div className="loading-state"><div className="spinner" /></div>
                )}
              </div>

              <label className="range-field">
                <span>Zoom</span>
                <input
                  type="range"
                  min={1}
                  max={MAX_ZOOM}
                  step={0.01}
                  value={view.zoom}
                  disabled={!isReady}
                  onChange={(e) => updateView({ zoom: Number(e.target.value) })}
                />
                <output>{view.zoom.toFixed(1)}×</output>
              </label>
              <p className="field__hint">Arrastrá la imagen para encuadrar. Cada formato guarda su propio recorte.</p>
              {natural && natural.width < MIN_RECOMMENDED_WIDTH && (
                <p className="form-message form-message--warning">
                  La imagen mide {natural.width} px de ancho: puede verse pixelada en pantallas grandes. Recomendado: 2400 px.
                </p>
              )}
            </div>

            <div className="hero-editor__side">
              <div className="hero-editor__previews">
                {FORMAT_LIST.map((f) => (
                  <HeroPreview
                    key={f.id}
                    format={f}
                    imageUrl={source.displayUrl}
                    area={percentAreas?.[f.id]}
                    overlay={overlay}
                    theme={storefrontTheme}
                    storeName={profile?.store_name}
                  />
                ))}
              </div>
              <label className="range-field">
                <span>Oscurecer foto</span>
                <input
                  type="range"
                  min={0}
                  max={MAX_HERO_OVERLAY}
                  step={5}
                  value={overlay}
                  onChange={(e) => setOverlay(clampOverlay(e.target.value))}
                />
                <output>{overlay}%</output>
              </label>
              <p className="field__hint">Útil si la foto es muy clara o tiene mucho detalle.</p>
            </div>
          </div>
        )}

        {message && (
          <p role="status" className={`form-message form-message--${message.type}`}>{message.text}</p>
        )}

        <div className="hero-editor__actions">
          {source && (
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={Boolean(busy)}>
              <Upload data-icon="inline-start" /> Cambiar imagen
            </Button>
          )}
          {hasPublishedImage && (
            <Button variant="destructive" onClick={handleRemove} disabled={Boolean(busy)}>
              <Trash2 data-icon="inline-start" />
              {busy === 'removing' ? 'Quitando…' : confirmRemove ? 'Confirmar: quitar imagen' : 'Quitar imagen'}
            </Button>
          )}
          <span className="flex-1" />
          {isDirty && (
            <Button variant="ghost" onClick={discardChanges} disabled={Boolean(busy)}>Descartar cambios</Button>
          )}
          <Button size="lg" onClick={handleSave} disabled={!isDirty || !isReady || Boolean(busy)}>
            <Save data-icon="inline-start" /> {busy === 'saving' ? 'Publicando…' : 'Guardar y publicar'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
