import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * KPI en tarjeta vega. `tone` pinta la barra lateral (accent | primary | muted | success | danger),
 * `to` la convierte en link y `compact` reduce el valor para grillas densas.
 */
export default function StatCard({ label, value, delta, icon: Icon, tone, to, compact = false, valueClass }) {
  const card = (
    <Card
      size="sm"
      data-tone={tone}
      className={cn('h-full', to && 'glass--interactive hover:-translate-y-0.5')}
    >
      <CardHeader>
        <CardDescription className="text-xs font-medium">{label}</CardDescription>
        <CardTitle
          className={cn(
            'font-bold tracking-tight tabular-nums',
            compact ? 'text-lg leading-snug' : 'text-[26px] leading-tight',
            valueClass
          )}
        >
          {value}
        </CardTitle>
        {Icon && (
          <CardAction>
            <span className="flex size-8 items-center justify-center rounded-md bg-accent text-brand" aria-hidden="true">
              <Icon className="size-4" />
            </span>
          </CardAction>
        )}
        {delta && <p className="col-span-full truncate text-xs text-subtle-foreground">{delta}</p>}
      </CardHeader>
    </Card>
  );

  if (!to) return card;
  return (
    <Link to={to} className="block h-full text-inherit no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded-xl">
      {card}
    </Link>
  );
}
