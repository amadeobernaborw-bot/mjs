import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

export default function SortableHeader({ label, sortKey, sort, onSort, align = 'left' }) {
  const active = sort?.key === sortKey;
  const dir = active ? sort.dir : null;
  const SortIcon = dir === 'asc' ? ArrowUp : dir === 'desc' ? ArrowDown : ArrowUpDown;
  const next = () => {
    if (!active) return onSort({ key: sortKey, dir: 'asc' });
    if (dir === 'asc') return onSort({ key: sortKey, dir: 'desc' });
    return onSort(null);
  };
  return (
    <th className={`sortable-th sortable-th--${align}`}>
      <button type="button" className="sortable-th__btn" onClick={next}>
        <span>{label}</span>
        <span className={`sortable-th__arrow ${active ? 'is-active' : ''}`} aria-hidden="true">
          <SortIcon className="size-3.5" />
        </span>
      </button>
    </th>
  );
}

export function sortItems(items, sort) {
  if (!sort?.key) return items;
  const { key, dir } = sort;
  const factor = dir === 'desc' ? -1 : 1;
  return [...items].sort((a, b) => {
    const va = a?.[key];
    const vb = b?.[key];
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * factor;
    return String(va).localeCompare(String(vb), 'es', { numeric: true }) * factor;
  });
}
