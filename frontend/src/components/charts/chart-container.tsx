import type { ReactElement } from 'react';
import { ResponsiveContainer } from 'recharts';

export function ChartContainer({ height = 280, children }: { height?: number; children: ReactElement }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      {children}
    </ResponsiveContainer>
  );
}

export const chartAxisProps = {
  tick: { fontSize: 12, fill: 'hsl(var(--muted-foreground))' },
  tickLine: false,
  axisLine: { stroke: 'hsl(var(--border))' },
};

export const chartGridProps = {
  stroke: 'hsl(var(--border))',
  strokeDasharray: '4 4',
  vertical: false,
};
