import { useEffect, useRef, useState } from 'react';
import { MessageCircle, X } from 'lucide-react';

const LIST_ID = 'social-fab-list';

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.5 14.4l-2.2-1c-.3-.1-.6 0-.8.2l-.7.9c-.2.3-.6.4-.9.2-1.2-.5-2.4-1.7-2.9-2.9-.2-.3-.1-.7.2-.9l.9-.7c.3-.2.4-.5.2-.8l-1-2.2c-.1-.3-.5-.5-.8-.4-1.7.6-2.6 2-2.5 3.6.2 4 4 7.8 8 8 1.6.1 3-.8 3.6-2.5.1-.3-.1-.6-.4-.7z"/>
      <path d="M12 2a10 10 0 0 0-8.6 15l-1.4 5 5.1-1.3A10 10 0 1 0 12 2zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-3-.2-.3A8 8 0 1 1 12 20z"/>
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M14 8.5V6.8c0-.8.5-1.3 1.4-1.3H17V2.2c-.3 0-1.4-.2-2.6-.2C11.9 2 10.3 3.5 10.3 6.3v2.2H7.5v3.7h2.8V22H14v-9.8h2.8l.4-3.7H14z" />
    </svg>
  );
}

function buildNetworks(profile) {
  const wa = (profile?.whatsapp || '').replace(/[^\d]/g, '');
  return [
    wa && { id: 'whatsapp', label: 'WhatsApp', href: `https://wa.me/${wa}`, Icon: WhatsAppIcon },
    profile?.instagram_url && { id: 'instagram', label: 'Instagram', href: profile.instagram_url, Icon: InstagramIcon },
    profile?.facebook_url && { id: 'facebook', label: 'Facebook', href: profile.facebook_url, Icon: FacebookIcon },
  ].filter(Boolean);
}

export default function SocialFAB({ profile }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const networks = buildNetworks(profile);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (networks.length === 0) return null;

  return (
    <div ref={rootRef} className={`social-fab${open ? ' social-fab--open' : ''}`}>
      <button
        type="button"
        className="social-fab__toggle"
        aria-expanded={open}
        aria-controls={LIST_ID}
        aria-label={open ? 'Cerrar redes' : 'Abrir redes y contacto'}
        onClick={() => setOpen((v) => !v)}
      >
        <MessageCircle className="social-fab__icon social-fab__icon--chat" aria-hidden="true" />
        <X className="social-fab__icon social-fab__icon--close" aria-hidden="true" />
      </button>

      <ul id={LIST_ID} className="social-fab__list" aria-hidden={!open}>
        {networks.map(({ id, label, href, Icon }, i) => (
          <li key={id} className="social-fab__item" style={{ '--i': i }}>
            <a
              className="social-fab__link"
              data-social={id}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              tabIndex={open ? 0 : -1}
              onClick={() => setOpen(false)}
            >
              <span className="social-fab__fill" aria-hidden="true" />
              <Icon />
            </a>
            <span className="social-fab__tooltip" aria-hidden="true">{label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
