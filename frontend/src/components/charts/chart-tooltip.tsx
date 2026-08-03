import type { TooltipContentProps } from 'recharts';

export function ChartTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      {label ? <p className="mb-1 font-medium text-popover-foreground">{label}</p> : null}
      <div className="space-y-0.5">
        {payload.map((entry) => (
          <div key={entry.dataKey as string} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium text-popover-foreground">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
