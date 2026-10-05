/**
 * Miniatura del Hero real con el recorte aplicado: texto sobre el fondo del tema y la foto
 * aparte (a la derecha en escritorio, arriba en celular), fundida hacia el texto.
 * `area` en porcentajes de la imagen original: { x, y, width, height }.
 * data-theme + surface-dark en el mismo elemento: muestra el Hero tal como
 * se verá con el tema de la tienda, aunque el admin use el otro tema.
 */
export default function HeroPreview({ imageUrl, area, format, overlay, theme, storeName }) {
  const imageStyle = area
    ? {
        width: `${10000 / area.width}%`,
        height: `${10000 / area.height}%`,
        left: `${(-area.x * 100) / area.width}%`,
        top: `${(-area.y * 100) / area.height}%`,
      }
    : null;

  return (
    <figure className={`hero-preview hero-preview--${format.id}`}>
      <div className="hero-preview__frame surface-dark" data-theme={theme}>
        <div className="hero__ambient" />
        <div className="hero-preview__media">
          {imageStyle && <img className="hero-preview__img" src={imageUrl} alt="" style={imageStyle} />}
          <div className="hero__media-grade" style={{ '--hero-overlay': overlay / 100 }} />
        </div>
        <div className="hero-preview__copy" aria-hidden="true">
          <span className="hero-preview__eyebrow">{storeName || 'Tu Tienda'} · Apple Premium</span>
          <span className="hero-preview__title">La mejor tecnología Apple, en tu mano.</span>
          <span className="hero-preview__cta" />
        </div>
      </div>
      <figcaption>{format.label} · {format.ratioLabel}</figcaption>
    </figure>
  );
}
