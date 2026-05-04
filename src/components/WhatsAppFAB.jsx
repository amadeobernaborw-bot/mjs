export default function WhatsAppFAB({ phone }) {
  if (!phone) return null;
  const wa = phone.replace(/[^\d]/g, '');
  return (
    <a
      className="fab-wa"
      href={`https://wa.me/${wa}`}
      target="_blank"
      rel="noreferrer"
      aria-label="Chatear por WhatsApp"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M17.5 14.4l-2.2-1c-.3-.1-.6 0-.8.2l-.7.9c-.2.3-.6.4-.9.2-1.2-.5-2.4-1.7-2.9-2.9-.2-.3-.1-.7.2-.9l.9-.7c.3-.2.4-.5.2-.8l-1-2.2c-.1-.3-.5-.5-.8-.4-1.7.6-2.6 2-2.5 3.6.2 4 4 7.8 8 8 1.6.1 3-.8 3.6-2.5.1-.3-.1-.6-.4-.7z"/>
        <path d="M12 2a10 10 0 0 0-8.6 15l-1.4 5 5.1-1.3A10 10 0 1 0 12 2zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-3-.2-.3A8 8 0 1 1 12 20z"/>
      </svg>
    </a>
  );
}
