import { forwardRef } from 'react';
import { Package } from 'lucide-react';
import { formatARS, formatUSD, formatDate } from '../lib/format';

const DEFAULT_TERMS = [
  'Garantía oficial de 12 meses por defectos de fábrica.',
  'Cambios y devoluciones dentro de las 48hs presentando ticket de compra.',
  'Accesorios y consumibles no admiten devolución.',
  'Los precios pueden actualizarse según cotización del USD.',
];

const InvoiceDocument = forwardRef(function InvoiceDocument({ invoice, profile, client, installments = [] }, ref) {
  const items = Array.isArray(invoice?.items) ? invoice.items : [];
  const typeLabel = invoice?.type === 'factura' ? 'FACTURA' : 'PRESUPUESTO';
  const isQuote = invoice?.type === 'presupuesto';
  const validityDays = profile?.quote_validity_days || 7;
  const warranty = profile?.warranty_text || 'Garantía oficial de 12 meses por defectos de fábrica.';
  const termsRaw = (profile?.terms_and_conditions || '').trim();
  const terms = termsRaw
    ? termsRaw.split(/\r?\n/).map((s) => s.replace(/^[•·\-\*\s]+/, '').trim()).filter(Boolean)
    : DEFAULT_TERMS;

  return (
    <div ref={ref} className="invoice-doc">
      <div className="invoice-doc__head">
        <div className="invoice-doc__brand">
          {profile?.logo_url ? (
            <img src={profile.logo_url} alt={profile.store_name} crossOrigin="anonymous" />
          ) : (
            <h2>{profile?.store_name || 'Tu Tienda'}</h2>
          )}
          <div className="invoice-doc__brand-meta">
            <strong>{profile?.store_name || 'Tu Tienda'}</strong>
            <span>Apple Premium Reseller</span>
            {profile?.address && <span>{profile.address}</span>}
            {profile?.whatsapp && <span>WhatsApp: {profile.whatsapp}</span>}
            {profile?.instagram_url && <span>{profile.instagram_url.replace(/^https?:\/\//, '')}</span>}
          </div>
        </div>
        <div className="invoice-doc__meta">
          <span className="invoice-doc__badge">{typeLabel}</span>
          {invoice?.invoice_number != null && <div className="invoice-doc__num">N° {String(invoice.invoice_number).padStart(6, '0')}</div>}
          <div className="invoice-doc__date">{formatDate(invoice?.created_at || new Date().toISOString())}</div>
          {isQuote && <div className="invoice-doc__validity">Válido por {validityDays} días</div>}
        </div>
      </div>

      <div className="invoice-doc__client-row">
        <div className="invoice-doc__sec invoice-doc__sec--inline">
          <h4>Cliente</h4>
          {client ? (
            <>
              <div className="invoice-doc__client-name">{client.name}</div>
              {client.phone && <div>Tel: {client.phone}</div>}
              {client.email && <div>{client.email}</div>}
            </>
          ) : (
            <div style={{ color: 'var(--text-tertiary)' }}>Consumidor final</div>
          )}
        </div>
        {invoice?.payment_method && (
          <div className="invoice-doc__sec invoice-doc__sec--inline">
            <h4>Forma de pago</h4>
            <div className="invoice-doc__payment">{invoice.payment_method}</div>
          </div>
        )}
      </div>

      <div className="invoice-doc__sec">
        <h4>Detalle</h4>
        <table className="invoice-doc__items">
          <thead>
            <tr>
              <th className="col-img"></th>
              <th>Producto</th>
              <th className="num">Cant.</th>
              <th className="num">P. USD</th>
              <th className="num">P. ARS</th>
              <th className="num">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Sin ítems</td></tr>
            ) : (
              items.map((it, idx) => {
                const qty = Number(it.qty) || 0;
                const ars = Number(it.price_ars) || 0;
                return (
                  <tr key={idx}>
                    <td className="col-img">
                      {it.image_url ? (
                        <img src={it.image_url} alt={it.name} crossOrigin="anonymous" className="invoice-doc__thumb" />
                      ) : (
                        <div className="invoice-doc__thumb invoice-doc__thumb--empty">
                          <Package width={18} height={18} strokeWidth={1.5} aria-hidden="true" />
                        </div>
                      )}
                    </td>
                    <td>{it.name}</td>
                    <td className="num">{qty}</td>
                    <td className="num">{it.price_usd ? formatUSD(it.price_usd) : '—'}</td>
                    <td className="num">{ars ? formatARS(ars) : '—'}</td>
                    <td className="num">{formatARS(qty * ars)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="invoice-doc__totals">
        <table>
          <tbody>
            {invoice?.total_usd ? (
              <tr>
                <td>Total USD</td>
                <td style={{ textAlign: 'right' }}>{formatUSD(invoice.total_usd)}</td>
              </tr>
            ) : null}
            <tr className="grand">
              <td>TOTAL ARS</td>
              <td style={{ textAlign: 'right' }}>{formatARS(invoice?.total_ars || 0)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {installments && installments.length > 0 && (
        <div className="invoice-doc__sec">
          <h4>Plan de cuotas</h4>
          <table className="invoice-doc__installments">
            <thead>
              <tr>
                <th>#</th>
                <th>Vencimiento</th>
                <th>Estado</th>
                <th className="num">Importe</th>
              </tr>
            </thead>
            <tbody>
              {installments.map((c) => (
                <tr key={c.id || c.installment_num}>
                  <td>{c.installment_num}</td>
                  <td>{c.due_date ? formatDate(c.due_date) : '—'}</td>
                  <td>
                    <span className={`invoice-doc__cuota-status invoice-doc__cuota-status--${c.status}`}>
                      {c.status === 'pagada' ? 'Pagada' : c.status === 'vencida' ? 'Vencida' : 'Pendiente'}
                    </span>
                  </td>
                  <td className="num">{formatARS(c.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="invoice-doc__terms">
        <h4>Términos y condiciones</h4>
        <ul>
          {terms.map((t, i) => <li key={i}>{t}</li>)}
          {isQuote && <li>Validez del presupuesto: {validityDays} días corridos desde la emisión.</li>}
        </ul>
        <p className="invoice-doc__warranty">
          <strong>Garantía: </strong>{warranty}
        </p>
      </div>

      <div className="invoice-doc__foot">
        {isQuote ? 'Presupuesto sujeto a disponibilidad de stock.' : 'Gracias por tu compra.'}
        <br />
        <strong>{profile?.store_name || 'Tu Tienda'}</strong> — Apple Premium Reseller
      </div>
    </div>
  );
});

export default InvoiceDocument;
