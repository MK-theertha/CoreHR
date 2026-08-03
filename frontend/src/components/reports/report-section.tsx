import { DistributionDonutChart } from '../charts/distribution-donut-chart';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

export function ReportSection({ title, data }: { title: string; data: { label: string; value: number }[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No data yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 sm:items-center">
            <DistributionDonutChart data={data} />
            <ul className="space-y-2">
              {data.map((item) => (
                <li key={item.label} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium text-foreground">{item.value}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
