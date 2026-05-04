function extractMapEmbed(url) {
  if (!url) return null;
  // If user paste full embed URL or share URL, try to convert to embed
  if (url.includes('/embed')) return url;
  if (url.includes('google.com/maps')) {
    return url.replace('/maps/', '/maps/embed?pb=');
  }
  return url;
}

export default function ContactSection({ profile }) {
  const wa = (profile?.whatsapp || '').replace(/[^\d+]/g, '');
  const waLink = wa ? `https://wa.me/${wa.replace('+','')}` : '#';
  const embed = extractMapEmbed(profile?.google_maps_url);

  return (
    <section className="section contact" id="contacto">
      <div className="container">
        <div className="contact__grid">
          <div className="fade-in">
            <p className="eyebrow" style={{ color: '#6cb4ff' }}>Contacto</p>
            <h2 className="title" style={{ marginTop: 8, color: '#fff' }}>
              Estamos a un mensaje de distancia.
            </h2>
            <p className="body-lg" style={{ color: 'var(--text-muted-dark)', marginTop: 14, maxWidth: 480 }}>
              Escribinos por WhatsApp, seguinos en redes o pasá por el local.
              Te asesoramos sin compromiso.
            </p>

            {wa && (
              <a className="contact__cta" href={waLink} target="_blank" rel="noreferrer" style={{ marginTop: 28 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M17.5 14.4l-2.2-1c-.3-.1-.6 0-.8.2l-.7.9c-.2.3-.6.4-.9.2-1.2-.5-2.4-1.7-2.9-2.9-.2-.3-.1-.7.2-.9l.9-.7c.3-.2.4-.5.2-.8l-1-2.2c-.1-.3-.5-.5-.8-.4-1.7.6-2.6 2-2.5 3.6.2 4 4 7.8 8 8 1.6.1 3-.8 3.6-2.5.1-.3-.1-.6-.4-.7-1.6-.6-1.6-.6-1.7-.8z"/>
                  <path d="M12 2a10 10 0 0 0-8.6 15l-1.4 5 5.1-1.3A10 10 0 1 0 12 2zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-3-.2-.3A8 8 0 1 1 12 20z"/>
                </svg>
                Hablar por WhatsApp
              </a>
            )}

            <div className="contact__socials">
              {profile?.instagram_url && (
                <a className="contact__social" href={profile.instagram_url} target="_blank" rel="noreferrer" aria-label="Instagram">IG</a>
              )}
              {profile?.facebook_url && (
                <a className="contact__social" href={profile.facebook_url} target="_blank" rel="noreferrer" aria-label="Facebook">FB</a>
              )}
              {profile?.google_maps_url && (
                <a className="contact__social" href={profile.google_maps_url} target="_blank" rel="noreferrer" aria-label="Google Maps">📍</a>
              )}
            </div>

            {profile?.address && <p className="contact__address">{profile.address}</p>}
          </div>

          <div className="fade-in fade-in--delay-1">
            <div className="contact__map">
              {embed ? (
                <iframe
                  src={embed}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Ubicación MJ STORE"
                  allowFullScreen
                />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted-dark)' }}>
                  Mapa no disponible
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
