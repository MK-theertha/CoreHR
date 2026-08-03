import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';

import { ChartContainer, chartAxisProps, chartGridProps } from './chart-container';
import { ChartTooltip } from './chart-tooltip';

export function EmployeeGrowthChart({ data }: { data: { month: string; count: number }[] }) {
  return (
    <ChartContainer>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="employeeGrowthFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.35} />
            <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid {...chartGridProps} />
        <XAxis dataKey="month" {...chartAxisProps} />
        <YAxis allowDecimals={false} {...chartAxisProps} />
        <Tooltip content={ChartTooltip} />
        <Area
          type="monotone"
          dataKey="count"
          name="Employees"
          stroke="hsl(var(--chart-1))"
          strokeWidth={2}
          fill="url(#employeeGrowthFill)"
        />
      </AreaChart>
    </ChartContainer>
  );
}
