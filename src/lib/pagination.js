/** PostgREST devuelve como mucho 1000 filas por pedido. */
export const PAGE_SIZE = 1000;

/**
 * Todas las filas de una consulta de Supabase, pidiendo páginas hasta agotar.
 * `build` arma la consulta desde cero en cada página y tiene que terminar con
 * un orden estable (por ejemplo .order('id')); si no, una fila puede saltearse
 * o repetirse entre páginas. Los errores se propagan.
 */
export async function allRows(build, pageSize = PAGE_SIZE) {
  const out = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await build().range(from, from + pageSize - 1);
    if (error) throw error;
    const page = data || [];
    out.push(...page);
    if (page.length < pageSize) return out;
  }
}
