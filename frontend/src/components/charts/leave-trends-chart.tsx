import { Bar, BarChart, CartesianGrid, Legend, Tooltip, XAxis, YAxis } from 'recharts';

import { ChartContainer, chartAxisProps, chartGridProps } from './chart-container';
import { ChartTooltip } from './chart-tooltip';

export type LeaveTrendPoint = {
  month: string;
  PENDING: number;
  APPROVED: number;
  REJECTED: number;
  CANCELLED: number;
};

const series = [
  { key: 'APPROVED', name: 'Approved', color: 'hsl(var(--success))' },
  { key: 'PENDING', name: 'Pending', color: 'hsl(var(--warning))' },
  { key: 'REJECTED', name: 'Rejected', color: 'hsl(var(--destructive))' },
  { key: 'CANCELLED', name: 'Cancelled', color: 'hsl(var(--muted-foreground))' },
] as const;

export function LeaveTrendsChart({ data }: { data: LeaveTrendPoint[] }) {
  return (
    <ChartContainer>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid {...chartGridProps} />
        <XAxis dataKey="month" {...chartAxisProps} />
        <YAxis allowDecimals={false} {...chartAxisProps} />
        <Tooltip content={ChartTooltip} cursor={{ fill: 'hsl(var(--muted))' }} />
        <Legend wrapperStyle={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }} />
        {series.map((s) => (
          <Bar key={s.key} dataKey={s.key} name={s.name} stackId="leave" fill={s.color} radius={[0, 0, 0, 0]} maxBarSize={36} />
        ))}
      </BarChart>
    </ChartContainer>
  );
}
