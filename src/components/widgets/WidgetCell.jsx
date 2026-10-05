import { DropdownMenu } from 'radix-ui';
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ChevronsDownUp, ChevronsLeftRight, ChevronsRightLeft,
  ChevronsUpDown, Ellipsis, EyeOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { COLUMNS } from '../../lib/widgets/constants';

/** Ítem del menú que no cierra el menú: permite mover o agrandar varias veces seguidas. */
function RepeatItem({ onRun, disabled, icon: Icon, children }) {
  return (
    <DropdownMenu.Item
      className="widget-menu__item"
      disabled={disabled}
      onSelect={(e) => { e.preventDefault(); onRun(); }}
    >
      <Icon className="size-4" aria-hidden="true" /> {children}
    </DropdownMenu.Item>
  );
}

/**
 * Marco de una celda. En modo edición el contenido queda inerte (sus links y
 * botones no responden), una capa transparente encima es el área de arrastre
 * y la barra superior trae el menú ⋮ como alternativa de teclado.
 */
export default function WidgetCell({ widget, item, visual, editing, labels, actions, children }) {
  const id = widget.id;
  const maxW = Math.min(widget.maxW, COLUMNS - item.x);
  const hasVisuals = (widget.visuals || []).length > 1;

  return (
    <div className={cn('widget-cell', editing && 'is-editing')} data-widget-id={id}>
      <div className="widget-cell__content" {...(editing ? { inert: '' } : {})}>
        {children}
      </div>

      {editing && (
        <>
          <div className="widget-cell__drag" aria-hidden="true" />
          <div className="widget-cell__tools">
            <span className="widget-cell__name">{widget.title}</span>
            <Button
              type="button" variant="secondary" size="icon-xs"
              className="widget-cell__btn" onClick={() => actions.hide(id)}
              aria-label={`${labels.hide} ${widget.title}`} title={labels.hide}
            >
              <EyeOff aria-hidden="true" />
            </Button>
            <DropdownMenu.Root modal={false}>
              <DropdownMenu.Trigger asChild>
                <Button type="button" variant="secondary" size="icon-xs" className="widget-cell__btn" aria-label={labels.menuFor(widget.title)}>
                  <Ellipsis aria-hidden="true" />
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content className="widget-menu" align="end" sideOffset={6} collisionPadding={12}>
                  <DropdownMenu.Label className="widget-menu__label">{labels.move}</DropdownMenu.Label>
                  <RepeatItem icon={ArrowLeft} disabled={item.x <= 0} onRun={() => actions.move(id, -1, 0)}>{labels.moveLeft}</RepeatItem>
                  <RepeatItem icon={ArrowRight} disabled={item.x + item.w >= COLUMNS} onRun={() => actions.move(id, 1, 0)}>{labels.moveRight}</RepeatItem>
                  <RepeatItem icon={ArrowUp} disabled={item.y <= 0} onRun={() => actions.move(id, 0, -1)}>{labels.moveUp}</RepeatItem>
                  <RepeatItem icon={ArrowDown} onRun={() => actions.move(id, 0, 1)}>{labels.moveDown}</RepeatItem>

                  <DropdownMenu.Separator className="widget-menu__sep" />
                  <DropdownMenu.Label className="widget-menu__label">{labels.size}</DropdownMenu.Label>
                  <RepeatItem icon={ChevronsLeftRight} disabled={item.w >= maxW} onRun={() => actions.resize(id, 1, 0)}>{labels.wider}</RepeatItem>
                  <RepeatItem icon={ChevronsRightLeft} disabled={item.w <= widget.minW} onRun={() => actions.resize(id, -1, 0)}>{labels.narrower}</RepeatItem>
                  <RepeatItem icon={ChevronsUpDown} disabled={item.h >= widget.maxH} onRun={() => actions.resize(id, 0, 1)}>{labels.taller}</RepeatItem>
                  <RepeatItem icon={ChevronsDownUp} disabled={item.h <= widget.minH} onRun={() => actions.resize(id, 0, -1)}>{labels.shorter}</RepeatItem>

                  {hasVisuals && (
                    <>
                      <DropdownMenu.Separator className="widget-menu__sep" />
                      <DropdownMenu.Label className="widget-menu__label">{labels.visual}</DropdownMenu.Label>
                      <DropdownMenu.RadioGroup value={visual} onValueChange={(v) => actions.setVisual(id, v)}>
                        {widget.visuals.map((v) => (
                          <DropdownMenu.RadioItem key={v} value={v} className="widget-menu__item widget-menu__item--radio">
                            <DropdownMenu.ItemIndicator className="widget-menu__check">●</DropdownMenu.ItemIndicator>
                            {labels.visuals[v] || v}
                          </DropdownMenu.RadioItem>
                        ))}
                      </DropdownMenu.RadioGroup>
                    </>
                  )}

                  <DropdownMenu.Separator className="widget-menu__sep" />
                  <DropdownMenu.Item className="widget-menu__item widget-menu__item--danger" onSelect={() => actions.hide(id)}>
                    <EyeOff className="size-4" aria-hidden="true" /> {labels.hide}
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </>
      )}
    </div>
  );
}
