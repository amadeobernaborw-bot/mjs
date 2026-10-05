import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { uploadProductImage } from '../../../lib/inventory/api';

/**
 * Foto de modelo o variante. Con `fallbackUrl`, la imagen vacía muestra esa
 * (la del modelo) y se ofrece volver a ella.
 */
export default function ImageField({ label, value, onChange, onUploadingChange, fallbackUrl = null, hint = 'JPG, PNG o WebP' }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const id = useId();

  const setBusy = (busy) => { setUploading(busy); onUploadingChange?.(busy); };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      onChange(await uploadProductImage(file));
    } catch (err) {
      setError(`No se pudo subir la imagen: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const shown = value || fallbackUrl;

  return (
    <div className="field field--full">
      <label className="field__label" htmlFor={id}>{label}</label>
      <div className="image-uploader">
        <div className="image-uploader__preview" data-inherited={!value && !!fallbackUrl}>
          {shown ? <img src={shown} alt="" /> : <span className="inv-muted">—</span>}
        </div>
        <div className="inv-image__body">
          <input id={id} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} disabled={uploading} />
          <p className="field__hint">{uploading ? 'Subiendo…' : hint}</p>
          {error && <p className="field__error" role="alert">{error}</p>}
          {value && fallbackUrl !== null && (
            <Button type="button" variant="ghost" size="sm" className="self-start" onClick={() => onChange('')}>
              Usar la foto del modelo
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
