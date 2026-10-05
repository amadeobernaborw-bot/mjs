/**
 * Vistas fijas del Inicio. Solo datos: cada vista lista los widgets visibles con
 * su posición en la grilla de 8 columnas. Las primeras 8 filas (encuadre 8×8)
 * tienen que quedar completas, sin huecos ni superposiciones: lo verifica
 * presets.test.js. Para cambiar una vista, editar acá y correr `npm test`.
 * La vista "Personalizado" no está acá: es el layout guardado del usuario.
 */

const at = (widget_id, x, y, w, h, config) => ({ widget_id, x, y, w, h, ...(config ? { config } : {}) });

export const INICIO_PRESETS = [
  {
    id: 'ventas',
    label: 'Ventas y compras',
    description: 'Qué se vende, qué se compra y cómo evoluciona en el período.',
    items: [
      at('kpi_ventas_periodo', 0, 0, 2, 2),
      at('kpi_compras_periodo', 2, 0, 2, 2),
      at('kpi_unidades_vendidas', 4, 0, 2, 2),
      at('ticket_promedio', 6, 0, 2, 2),
      at('grafico_ventas_vs_compras', 0, 2, 5, 3),
      at('mas_vendidos_periodo', 5, 2, 3, 3),
      at('grafico_categorias', 0, 5, 4, 3),
      at('ultimas_facturas', 4, 5, 4, 3),
      // Debajo del encuadre
      at('ultimas_compras', 0, 8, 4, 4),
      at('top_clientes', 4, 8, 4, 4),
    ],
  },
  {
    id: 'finanzas',
    label: 'Finanzas',
    description: 'Ganancia o pérdida, en qué se va la plata y los pagos que entran y salen.',
    items: [
      at('kpi_ingresos_periodo', 0, 0, 2, 2),
      at('kpi_egresos_periodo', 2, 0, 2, 2),
      at('kpi_resultado_periodo', 4, 0, 2, 2),
      at('kpi_cuotas_cobradas', 6, 0, 2, 2),
      at('grafico_caja_diaria', 0, 2, 5, 3),
      at('grafico_costos_categoria', 5, 2, 3, 3),
      at('grafico_medios_pago', 0, 5, 4, 3),
      at('cobranzas', 4, 5, 4, 3),
      // Debajo del encuadre
      at('kpi_cuotas_por_vencer', 0, 8, 2, 2),
      at('kpi_saldo_mes', 2, 8, 2, 2),
      at('kpi_facturas_pendientes', 0, 10, 2, 2),
      at('kpi_compras_periodo', 2, 10, 2, 2),
      at('grafico_balance_caja', 4, 8, 4, 4),
    ],
  },
  {
    id: 'inventario',
    label: 'Inventario',
    description: 'Lo que más sale, lo que más tenés, cuánto vale y cuánto dura el stock.',
    items: [
      at('kpi_unidades_stock', 0, 0, 2, 2),
      at('kpi_valor_stock', 2, 0, 2, 2),
      at('kpi_productos_activos', 4, 0, 2, 2),
      at('kpi_stock_bajo', 6, 0, 2, 2),
      at('mas_vendidos_periodo', 0, 2, 4, 3),
      at('ranking_mas_stock', 4, 2, 4, 3),
      at('cobertura_stock', 0, 5, 5, 3),
      at('grafico_stock_categoria', 5, 5, 3, 3),
      // Debajo del encuadre
      at('lista_stock_bajo', 0, 8, 4, 4),
      at('top_productos', 4, 8, 4, 4),
    ],
  },
];
