import { forwardRef } from 'react';
import { formatARS, formatUSD, formatDate } from '../lib/format';

const InvoiceDocument = forwardRef(function InvoiceDocument({ invoice, profile, client }, ref) {
  const items = Array.isArray(invoice?.items) ? invoice.items : [];
  const typeLabel = invoice?.type === 'factura' ? 'FACTURA' : 'PRESUPUESTO';

  return (
    <div ref={ref} className="invoice-doc">
      <div className="invoice-doc__head">
        <div className="invoice-doc__brand">
          {profile?.logo_url ? (
            <img src={profile.logo_url} alt={profile.store_name} crossOrigin="anonymous" />
          ) : (
            <h2>{profile?.store_name || 'MJ STORE'}</h2>
          )}
          {profile?.address && <p style={{ marginTop: 6, fontSize: 11, color: '#6E6E73' }}>{profile.address}</p>}
          {profile?.whatsapp && <p style={{ fontSize: 11, color: '#6E6E73' }}>WhatsApp: {profile.whatsapp}</p>}
        </div>
        <div className="invoice-doc__meta">
          <strong>{typeLabel}</strong>
          {invoice?.invoice_number != null && <div>N° {String(invoice.invoice_number).padStart(6, '0')}</div>}
          <div>{formatDate(invoice?.created_at || new Date().toISOString())}</div>
        </div>
      </div>

      {client && (
        <div className="invoice-doc__sec">
          <h4>Cliente</h4>
          <div><strong>{client.name}</strong></div>
          {client.phone && <div>Tel: {client.phone}</div>}
          {client.email && <div>{client.email}</div>}
        </div>
      )}

      <div className="invoice-doc__sec">
        <h4>Detalle</h4>
        <table className="invoice-doc__items">
          <thead>
            <tr>
              <th>Producto</th>
              <th className="num">Cant.</th>
              <th className="num">P. Unit. USD</th>
              <th className="num">P. Unit. ARS</th>
              <th className="num">Subtotal ARS</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: '#6E6E73' }}>Sin ítems</td></tr>
            ) : (
              items.map((it, idx) => {
                const qty = Number(it.qty) || 0;
                const ars = Number(it.price_ars) || 0;
                return (
                  <tr key={idx}>
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

      <div className="invoice-doc__foot">
        {invoice?.type === 'presupuesto'
          ? 'Presupuesto válido por 7 días. Sujeto a disponibilidad de stock.'
          : 'Gracias por tu compra.'}
        <br />
        {profile?.store_name || 'MJ STORE'} — Apple Premium Reseller
      </div>
    </div>
  );
});

export default InvoiceDocument;
