/**
 * Registro de la pantalla Inicio: catálogo + componente de cada widget, y las
 * vistas fijas (presets.js). Para agregar un widget: sumarlo a CATALOG
 * (catalog.js) y su componente acá.
 */
import { createRegistry } from '../../../lib/widgets/registry';
import { DebtsCard, AgendaCard } from '../../../components/admin/DebtsAgendaWidget';
import {
  KpiClientesTotal, KpiFacturasAprobadas, KpiFacturasPendientes, KpiMejorCliente, KpiModelosCanje,
  KpiProductosActivos, KpiSaldoMes, KpiStockBajo, KpiTicketPromedio,
} from '../../../components/dashboard/widgets/kpis';
import {
  GraficoBalanceCaja, GraficoCajaDiaria, GraficoCategorias, GraficoFacturacion, TopClientes, TopProductos,
} from '../../../components/dashboard/widgets/charts';
import { LeadsNuevos, ListaStockBajo, UltimasFacturas } from '../../../components/dashboard/widgets/lists';
import {
  GraficoVentasVsCompras, KpiComprasPeriodo, KpiUnidadesVendidas, KpiVentasPeriodo, MasVendidosPeriodo, UltimasCompras,
} from '../../../components/dashboard/widgets/sales';
import {
  GraficoCostosCategoria, GraficoMediosPago, KpiCuotasCobradas, KpiCuotasPorVencer, KpiEgresosPeriodo,
  KpiIngresosPeriodo, KpiResultadoPeriodo,
} from '../../../components/dashboard/widgets/finance';
import {
  CoberturaStock, GraficoStockCategoria, KpiUnidadesStock, KpiValorStock, RankingMasStock,
} from '../../../components/dashboard/widgets/inventory';
import { CATALOG, GROUPS } from './catalog';
import { INICIO_PRESETS } from './presets';

const COMPONENTS = {
  cobranzas: DebtsCard,
  agenda: AgendaCard,
  kpi_facturas_aprobadas: KpiFacturasAprobadas,
  kpi_facturas_pendientes: KpiFacturasPendientes,
  kpi_saldo_mes: KpiSaldoMes,
  kpi_stock_bajo: KpiStockBajo,
  grafico_caja_diaria: GraficoCajaDiaria,
  grafico_facturacion: GraficoFacturacion,
  kpi_productos_activos: KpiProductosActivos,
  kpi_clientes_total: KpiClientesTotal,
  kpi_mejor_cliente: KpiMejorCliente,
  kpi_modelos_canje: KpiModelosCanje,
  grafico_categorias: GraficoCategorias,
  grafico_balance_caja: GraficoBalanceCaja,
  top_productos: TopProductos,
  top_clientes: TopClientes,
  ticket_promedio: KpiTicketPromedio,
  ultimas_facturas: UltimasFacturas,
  lista_stock_bajo: ListaStockBajo,
  leads_nuevos: LeadsNuevos,
  kpi_ventas_periodo: KpiVentasPeriodo,
  kpi_unidades_vendidas: KpiUnidadesVendidas,
  mas_vendidos_periodo: MasVendidosPeriodo,
  kpi_compras_periodo: KpiComprasPeriodo,
  grafico_ventas_vs_compras: GraficoVentasVsCompras,
  ultimas_compras: UltimasCompras,
  kpi_ingresos_periodo: KpiIngresosPeriodo,
  kpi_egresos_periodo: KpiEgresosPeriodo,
  kpi_resultado_periodo: KpiResultadoPeriodo,
  grafico_costos_categoria: GraficoCostosCategoria,
  grafico_medios_pago: GraficoMediosPago,
  kpi_cuotas_cobradas: KpiCuotasCobradas,
  kpi_cuotas_por_vencer: KpiCuotasPorVencer,
  kpi_unidades_stock: KpiUnidadesStock,
  kpi_valor_stock: KpiValorStock,
  ranking_mas_stock: RankingMasStock,
  grafico_stock_categoria: GraficoStockCategoria,
  cobertura_stock: CoberturaStock,
};

export const inicioRegistry = createRegistry(CATALOG.map((w) => {
  const Component = COMPONENTS[w.id];
  if (!Component) throw new Error(`[widgets] falta el componente de "${w.id}" en inicio/widgets.js`);
  return { ...w, Component };
}), { groups: GROUPS });

export { INICIO_PRESETS };
