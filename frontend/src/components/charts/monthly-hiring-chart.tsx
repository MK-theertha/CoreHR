import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';

import { ChartContainer, chartAxisProps, chartGridProps } from './chart-container';
import { ChartTooltip } from './chart-tooltip';

export function MonthlyHiringChart({ data }: { data: { month: string; count: number }[] }) {
  return (
    <ChartContainer>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid {...chartGridProps} />
        <XAxis dataKey="month" {...chartAxisProps} />
        <YAxis allowDecimals={false} {...chartAxisProps} />
        <Tooltip content={ChartTooltip} cursor={{ fill: 'hsl(var(--muted))' }} />
        <Bar dataKey="count" name="Hires" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ChartContainer>
  );
}
