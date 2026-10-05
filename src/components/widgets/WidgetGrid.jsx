import { useCallback, useMemo } from 'react';
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { COLUMNS, FRAME_ROWS, MARGIN } from '../../lib/widgets/constants';
import { bottomOf, deriveLayout, fromGridLayout, layoutsEqual, toGridLayout } from '../../lib/widgets/layoutMath';
import { visualOf } from '../../lib/widgets/registry';
import WidgetCell from './WidgetCell';
import WidgetErrorBoundary from './WidgetErrorBoundary';

const GRID_MARGIN = [MARGIN, MARGIN];
const NO_PADDING = [0, 0];
const RESIZE_HANDLES = ['se'];

/** Tabla imaginaria de fondo (solo en edición): 8×8 marcado y más tenue debajo. */
function FrameGuide({ rows }) {
  const cells = Array.from({ length: rows * COLUMNS }, (_, i) => (
    <span key={i} className={`widget-guide__cell ${Math.floor(i / COLUMNS) >= FRAME_ROWS ? 'is-outside' : ''}`} />
  ));
  return <div className="widget-guide" aria-hidden="true">{cells}</div>;
}

/**
 * Grilla de widgets sobre react-grid-layout. En escritorio usa el layout tal
 * cual; en anchos chicos uno derivado y de solo lectura. Emite cambios solo al
 * soltar (drag/resize stop) y siempre con el layout completo, ocultos incluidos.
 */
export default function WidgetGrid({ registry, layout, width, cols, rowHeight, editing, labels, actions }) {
  const isDesktop = cols === COLUMNS;
  const interactive = editing && isDesktop;

  const visibleItems = useMemo(
    () => (isDesktop ? layout.filter((it) => it.enabled) : deriveLayout(layout, cols)),
    [layout, cols, isDesktop],
  );
  const gridLayout = useMemo(
    () => toGridLayout(visibleItems, registry.widgetById, !interactive),
    [visibleItems, registry, interactive],
  );

  const handleStop = useCallback((next) => {
    const merged = fromGridLayout(next, layout);
    if (!layoutsEqual(merged, layout)) actions.change(merged);
  }, [layout, actions]);

  const guideRows = Math.max(FRAME_ROWS, bottomOf(layout));
  const style = {
    '--widget-row-h': `${rowHeight}px`,
    '--widget-gap': `${MARGIN}px`,
    '--widget-guide-rows': guideRows,
  };

  return (
    <div className={`widget-grid ${interactive ? 'is-editing' : ''}`} style={style}>
      {interactive && <FrameGuide rows={guideRows} />}
      <GridLayout
        className="widget-grid__layout"
        layout={gridLayout}
        width={width}
        cols={cols}
        rowHeight={rowHeight}
        margin={GRID_MARGIN}
        containerPadding={NO_PADDING}
        compactType="vertical"
        preventCollision={false}
        isDraggable={interactive}
        isResizable={interactive}
        isBounded={false}
        resizeHandles={RESIZE_HANDLES}
        draggableHandle=".widget-cell__drag"
        draggableCancel=".widget-cell__tools, input, textarea, select, button, a"
        useCSSTransforms
        onDragStop={handleStop}
        onResizeStop={handleStop}
      >
        {visibleItems.map((it) => {
          const widget = registry.widgetById.get(it.widget_id);
          if (!widget) return null;
          const { Component } = widget;
          const visual = visualOf(it.config, widget);
          const config = visual ? { ...it.config, visual } : it.config;
          return (
            <div key={it.widget_id}>
              <WidgetCell
                widget={widget}
                item={it}
                visual={visual}
                editing={interactive}
                labels={labels}
                actions={actions}
              >
                <WidgetErrorBoundary widgetId={it.widget_id}>
                  <Component config={config} />
                </WidgetErrorBoundary>
              </WidgetCell>
            </div>
          );
        })}
      </GridLayout>
    </div>
  );
}
