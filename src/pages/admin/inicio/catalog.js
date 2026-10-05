/**
 * Catálogo de widgets del Inicio (solo metadatos, sin componentes).
 *
 * El `id` es un contrato: se guarda en dashboard_layouts. Renombrarlo hace que
 * todos los usuarios pierdan la posición de esa tarjeta.
 *
 * `defaults` está en celdas de la grilla de 8 columnas. Los de fábrica llenan
 * exactamente el encuadre principal de 8×8 (filas 0–7); el resto sigue debajo.
 * Para los widgets con isDefault: false solo cuentan w/h (entran al fondo).
 */
import { GRANDE, KPI, REPARTO, SERIE } from '../../../lib/widgets/constants';

export const SCREEN = 'inicio';

export const GROUPS = ['Gestión', 'Ventas', 'Compras', 'Caja', 'Finanzas', 'Stock', 'Clientes', 'Canje'];

export const CATALOG = [
  // ── Encuadre principal 8×8 ──────────────────────────────────────────
  { id: 'cobranzas', group: 'Gestión', ...GRANDE, defaults: { x: 0, y: 0, w: 4, h: 3 }, isDefault: true,
    title: 'Cobranzas', description: 'Clientes con cuotas vencidas o por vencer, de mayor a menor deuda.' },
  { id: 'agenda', group: 'Gestión', ...GRANDE, defaults: { x: 4, y: 0, w: 4, h: 3 }, isDefault: true,
    title: 'Agenda', description: 'Recordatorios para contactar clientes, con alta rápida de notas.' },

  { id: 'kpi_facturas_aprobadas', group: 'Ventas', ...KPI, defaults: { x: 0, y: 3, w: 2, h: 2 }, isDefault: true,
    title: 'Facturas aprobadas', description: 'Total histórico facturado y aprobado.' },
  { id: 'kpi_facturas_pendientes', group: 'Ventas', ...KPI, defaults: { x: 2, y: 3, w: 2, h: 2 }, isDefault: true,
    title: 'Facturas pendientes', description: 'Monto y cantidad de facturas por cobrar.' },
  { id: 'kpi_saldo_mes', group: 'Caja', ...KPI, defaults: { x: 4, y: 3, w: 2, h: 2 }, isDefault: true,
    title: 'Saldo del mes', description: 'Entradas menos salidas de caja del mes en curso.' },
  { id: 'kpi_stock_bajo', group: 'Stock', ...KPI, defaults: { x: 6, y: 3, w: 2, h: 2 }, isDefault: true,
    title: 'Stock bajo', description: 'Cantidad de productos activos con 3 unidades o menos.' },

  { id: 'grafico_caja_diaria', group: 'Caja', ...SERIE, defaults: { x: 0, y: 5, w: 4, h: 3 }, isDefault: true,
    visuals: ['bars', 'line'],
    title: 'Caja diaria', description: 'Entradas y salidas por día en el período elegido.' },
  { id: 'grafico_facturacion', group: 'Ventas', ...SERIE, defaults: { x: 4, y: 5, w: 4, h: 3 }, isDefault: true,
    visuals: ['line', 'bars'],
    title: 'Facturación aprobada', description: 'Total ARS aprobado por día en el período elegido.' },

  // ── Debajo del encuadre ─────────────────────────────────────────────
  { id: 'kpi_productos_activos', group: 'Stock', ...KPI, defaults: { x: 0, y: 8, w: 2, h: 2 }, isDefault: true,
    title: 'Productos activos', description: 'Productos publicados sobre el total cargado.' },
  { id: 'kpi_clientes_total', group: 'Clientes', ...KPI, defaults: { x: 2, y: 8, w: 2, h: 2 }, isDefault: true,
    title: 'Clientes', description: 'Cantidad de clientes en el CRM.' },
  { id: 'kpi_mejor_cliente', group: 'Clientes', ...KPI, defaults: { x: 4, y: 8, w: 2, h: 2 }, isDefault: true,
    title: 'Mejor cliente del mes', description: 'Quien más compró este mes (facturas aprobadas).' },
  { id: 'kpi_modelos_canje', group: 'Canje', ...KPI, defaults: { x: 6, y: 8, w: 2, h: 2 }, isDefault: true,
    title: 'Modelos de canje', description: 'Modelos activos en la tabla del Plan Canje.' },

  { id: 'grafico_categorias', group: 'Ventas', ...REPARTO, defaults: { x: 0, y: 10, w: 4, h: 4 }, isDefault: true,
    visuals: ['pie', 'bars'],
    title: 'Ventas por categoría', description: 'Reparto del total aprobado entre iPhone, Mac, iPad y más.' },
  { id: 'grafico_balance_caja', group: 'Caja', ...SERIE, defaults: { x: 4, y: 10, w: 4, h: 4 }, isDefault: true,
    visuals: ['line', 'bars'],
    title: 'Balance de caja', description: 'Resultado diario de caja (entradas − salidas).' },
  { id: 'top_productos', group: 'Ventas', ...REPARTO, defaults: { x: 0, y: 14, w: 4, h: 4 }, isDefault: true,
    title: 'Top productos vendidos', description: 'Los 5 productos con más unidades vendidas.' },
  { id: 'top_clientes', group: 'Clientes', ...REPARTO, defaults: { x: 4, y: 14, w: 4, h: 4 }, isDefault: true,
    title: 'Top clientes por gasto', description: 'Los 5 clientes con más facturación aprobada.' },

  // ── Disponibles en el catálogo (ocultos de fábrica) ─────────────────
  { id: 'ticket_promedio', group: 'Ventas', ...KPI, defaults: { x: 0, y: 0, w: 2, h: 2 }, isDefault: false,
    title: 'Ticket promedio', description: 'Promedio facturado por factura aprobada en el período.' },
  { id: 'ultimas_facturas', group: 'Ventas', ...GRANDE, defaults: { x: 0, y: 0, w: 4, h: 4 }, isDefault: false,
    title: 'Últimas facturas', description: 'Las 8 facturas más recientes con su estado.' },
  { id: 'lista_stock_bajo', group: 'Stock', ...GRANDE, defaults: { x: 0, y: 0, w: 4, h: 4 }, isDefault: false,
    title: 'Lista de stock bajo', description: 'Todos los productos activos con 3 unidades o menos.' },
  { id: 'leads_nuevos', group: 'Clientes', ...GRANDE, defaults: { x: 0, y: 0, w: 4, h: 4 }, isDefault: false,
    title: 'Consultas nuevas', description: 'Leads de la tienda sin contactar, con acceso a WhatsApp.' },

  // ── Usados por las vistas fijas (también disponibles en el catálogo) ──
  { id: 'kpi_ventas_periodo', group: 'Ventas', ...KPI, defaults: { x: 0, y: 0, w: 2, h: 2 }, isDefault: false,
    title: 'Ventas del período', description: 'Facturación aprobada y cantidad de facturas en el período elegido.' },
  { id: 'kpi_unidades_vendidas', group: 'Ventas', ...KPI, defaults: { x: 0, y: 0, w: 2, h: 2 }, isDefault: false,
    title: 'Unidades vendidas', description: 'Unidades facturadas en el período (sin contar las canceladas).' },
  { id: 'mas_vendidos_periodo', group: 'Ventas', ...REPARTO, defaults: { x: 0, y: 0, w: 4, h: 3 }, isDefault: false,
    title: 'Más vendidos del período', description: 'Los productos con más unidades vendidas en el período elegido.' },

  { id: 'kpi_compras_periodo', group: 'Compras', ...KPI, defaults: { x: 0, y: 0, w: 2, h: 2 }, isDefault: false,
    title: 'Compras del período', description: 'Total gastado en "Compra stock" en el período.' },
  { id: 'grafico_ventas_vs_compras', group: 'Compras', ...SERIE, defaults: { x: 0, y: 0, w: 5, h: 3 }, isDefault: false,
    visuals: ['bars', 'line'],
    title: 'Ventas vs compras', description: 'Por día: ventas aprobadas contra compras de stock.' },
  { id: 'ultimas_compras', group: 'Compras', ...GRANDE, defaults: { x: 0, y: 0, w: 4, h: 4 }, isDefault: false,
    title: 'Últimas compras', description: 'Los últimos movimientos de caja de "Compra stock".' },

  { id: 'kpi_ingresos_periodo', group: 'Finanzas', ...KPI, defaults: { x: 0, y: 0, w: 2, h: 2 }, isDefault: false,
    title: 'Ingresos', description: 'Todo lo que entró a caja en el período.' },
  { id: 'kpi_egresos_periodo', group: 'Finanzas', ...KPI, defaults: { x: 0, y: 0, w: 2, h: 2 }, isDefault: false,
    title: 'Egresos', description: 'Todo lo que salió de caja en el período (compras, sueldos, gastos…).' },
  { id: 'kpi_resultado_periodo', group: 'Finanzas', ...KPI, defaults: { x: 0, y: 0, w: 2, h: 2 }, isDefault: false,
    title: 'Resultado', description: 'Ganancia o pérdida del período (ingresos − egresos) y margen sobre ingresos.' },
  { id: 'grafico_costos_categoria', group: 'Finanzas', ...REPARTO, defaults: { x: 0, y: 0, w: 3, h: 3 }, isDefault: false,
    visuals: ['pie', 'bars'],
    title: 'Costos por categoría', description: 'En qué se va la plata: egresos del período por categoría.' },
  { id: 'grafico_medios_pago', group: 'Finanzas', ...REPARTO, defaults: { x: 0, y: 0, w: 4, h: 3 }, isDefault: false,
    title: 'Medios de pago', description: 'Entradas y salidas del período por medio de pago.' },
  { id: 'kpi_cuotas_cobradas', group: 'Finanzas', ...KPI, defaults: { x: 0, y: 0, w: 2, h: 2 }, isDefault: false,
    title: 'Cuotas cobradas', description: 'Monto y cantidad de cuotas pagadas en el período.' },
  { id: 'kpi_cuotas_por_vencer', group: 'Finanzas', ...KPI, defaults: { x: 0, y: 0, w: 2, h: 2 }, isDefault: false,
    title: 'Cuotas por vencer', description: 'Lo que vence en los próximos 30 días y cuántas cuotas ya vencieron.' },

  { id: 'kpi_unidades_stock', group: 'Stock', ...KPI, defaults: { x: 0, y: 0, w: 2, h: 2 }, isDefault: false,
    title: 'Unidades en stock', description: 'Total de unidades de los productos activos.' },
  { id: 'kpi_valor_stock', group: 'Stock', ...KPI, defaults: { x: 0, y: 0, w: 2, h: 2 }, isDefault: false,
    title: 'Valor del stock', description: 'Lo que vale el stock a precio de venta, en pesos y dólares.' },
  { id: 'ranking_mas_stock', group: 'Stock', ...REPARTO, defaults: { x: 0, y: 0, w: 4, h: 3 }, isDefault: false,
    title: 'Lo que más tengo', description: 'Los 8 productos con más unidades en stock.' },
  { id: 'grafico_stock_categoria', group: 'Stock', ...REPARTO, defaults: { x: 0, y: 0, w: 3, h: 3 }, isDefault: false,
    visuals: ['pie', 'bars'],
    title: 'Stock por categoría', description: 'Cómo se reparten las unidades entre iPhone, Mac, iPad y más.' },
  { id: 'cobertura_stock', group: 'Stock', ...GRANDE, defaults: { x: 0, y: 0, w: 5, h: 3 }, isDefault: false,
    title: 'Cobertura de stock', description: 'Cuántos días dura el stock de cada producto al ritmo de venta del período.' },
];
