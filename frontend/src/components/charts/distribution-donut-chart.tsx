import { Cell, Legend, Pie, PieChart, Tooltip } from 'recharts';

import { ChartContainer } from './chart-container';
import { ChartTooltip } from './chart-tooltip';

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];
const OTHER_COLOR = 'hsl(var(--muted-foreground))';
const MAX_SLOTS = 4;

export function DistributionDonutChart({ data }: { data: { label: string; value: number }[] }) {
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const top = sorted.slice(0, MAX_SLOTS);
  const rest = sorted.slice(MAX_SLOTS);
  const otherTotal = rest.reduce((sum, item) => sum + item.value, 0);

  const chartData = otherTotal > 0 ? [...top, { label: 'Other', value: otherTotal }] : top;

  return (
    <ChartContainer height={260}>
      <PieChart>
        <Tooltip content={ChartTooltip} />
        <Legend wrapperStyle={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }} />
        <Pie data={chartData} dataKey="value" nameKey="label" innerRadius={60} outerRadius={90} paddingAngle={2}>
          {chartData.map((entry, index) => (
            <Cell key={entry.label} fill={entry.label === 'Other' ? OTHER_COLOR : COLORS[index % COLORS.length]} />
          ))}
        </Pie>
      </PieChart>
    </ChartContainer>
  );
}
