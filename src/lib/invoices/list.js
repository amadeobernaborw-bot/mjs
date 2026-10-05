import { sortItems } from '../../components/ui/SortableHeader';

// Orden por defecto de las tablas: el número correlativo, el más nuevo arriba
export const DEFAULT_SORT = { key: 'invoice_number', dir: 'desc' };

export const STATUS_ALL = 'Todos';

export function formatDocNumber(n) {
  return `#${String(n ?? '').padStart(6, '0')}`;
}

/** Agrega `client_name` a cada documento (así se puede ordenar por cliente). */
export function withClientNames(rows, clients) {
  const names = new Map(clients.map((c) => [c.id, c.name]));
  return rows.map((r) => ({ ...r, client_name: names.get(r.client_id) || null }));
}

function normalize(text) {
  return String(text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

const byNumberDesc = (a, b) => (Number(b.invoice_number) || 0) - (Number(a.invoice_number) || 0);

/**
 * Filas de una tabla: filtra por tipo, estado y nombre del cliente, y ordena.
 * Primero ordena por N° descendente y después aplica el orden elegido (sort
 * estable): si no hay orden elegido queda el N°, y los empates se desempatan por N°.
 */
export function selectRows(rows, { type, status = STATUS_ALL, query = '', sort = null } = {}) {
  const q = normalize(query);
  const base = rows
    .filter((r) => !type || r.type === type)
    .filter((r) => status === STATUS_ALL || r.status === status)
    .filter((r) => !q || normalize(r.client_name).includes(q))
    .sort(byNumberDesc);
  return sortItems(base, sort);
}
