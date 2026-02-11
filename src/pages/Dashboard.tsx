import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { statusLabels, type LeadStatus } from '@/data/dummy';
import { Users, TrendingUp, Recycle, DollarSign, Clock, BarChart3, ArrowUpRight, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useLeads } from '@/hooks/useLeads';
import { useMemo } from 'react';

function StatCard({ title, value, subtitle, icon: Icon }: {
  title: string; value: string | number; subtitle?: string; icon: React.ElementType;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-4 p-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-0.5 text-2xl font-bold tracking-tight">{value}</p>
          {subtitle && <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"><ArrowUpRight className="h-3 w-3 text-success" />{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

const funnelSteps: { key: LeadStatus; color: string }[] = [
  { key: 'new', color: 'bg-info' },
  { key: 'in_progress', color: 'bg-primary' },
  { key: 'picked_up', color: 'bg-accent' },
  { key: 'completed', color: 'bg-success' },
  { key: 'lost', color: 'bg-destructive' },
];

export default function Dashboard() {
  const { data: leads = [], isLoading } = useLeads();

  const stats = useMemo(() => {
    const totalKg = leads.reduce((s, l) => s + (Number(l.actual_kg) || Number(l.estimated_kg) || 0), 0);
    const b2cKg = leads.filter((l) => l.type === 'b2c').reduce((s, l) => s + (Number(l.actual_kg) || Number(l.estimated_kg) || 0), 0);
    const b2bKg = leads.filter((l) => l.type === 'b2b').reduce((s, l) => s + (Number(l.actual_kg) || Number(l.estimated_kg) || 0), 0);
    const deals = leads.filter((l) => l.status === 'completed');
    const revenue = deals.reduce((s, l) => s + (Number(l.final_value) || Number(l.deal_value) || 0), 0);
    const conversion = leads.length > 0 ? Math.round((deals.length / leads.length) * 100) : 0;

    // Source attribution
    const sourceMap: Record<string, { count: number; kg: number; value: number }> = {};
    for (const l of leads) {
      const src = l.source || 'manual';
      if (!sourceMap[src]) sourceMap[src] = { count: 0, kg: 0, value: 0 };
      sourceMap[src].count++;
      sourceMap[src].kg += Number(l.actual_kg) || Number(l.estimated_kg) || 0;
      sourceMap[src].value += Number(l.final_value) || Number(l.deal_value) || Number(l.potential_value) || 0;
    }
    const topSource = Object.entries(sourceMap).sort((a, b) => b[1].count - a[1].count)[0];

    return { totalKg, b2cKg, b2bKg, revenue, conversion, deals: deals.length, sourceMap, topSource };
  }, [leads]);

  const funnelData = funnelSteps.map((s) => ({
    ...s,
    label: statusLabels[s.key],
    count: leads.filter((l) => l.status === s.key).length,
  }));
  const maxFunnel = Math.max(...funnelData.map((d) => d.count), 1);

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of RemindHub operations</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Leads" value={leads.length} icon={Users} />
        <StatCard title="Total KG Collected" value={`${stats.totalKg.toLocaleString()} kg`} subtitle={`B2C: ${stats.b2cKg.toLocaleString()} · B2B: ${stats.b2bKg.toLocaleString()}`} icon={Recycle} />
        <StatCard title="Revenue" value={`Rp ${(stats.revenue / 1e6).toFixed(0)}M`} icon={DollarSign} />
        <StatCard title="Conversion Rate" value={`${stats.conversion}%`} subtitle={`${stats.deals} deals closed`} icon={TrendingUp} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Funnel */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base"><BarChart3 className="h-4 w-4 text-primary" /> Lead Funnel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {funnelData.map((step) => (
              <div key={step.key} className="flex items-center gap-3">
                <span className="w-28 truncate text-sm text-muted-foreground">{step.label}</span>
                <div className="flex-1">
                  <div className="h-7 rounded-md bg-muted overflow-hidden">
                    <div className={`h-full rounded-md ${step.color} flex items-center px-2 text-xs font-semibold text-primary-foreground transition-all`} style={{ width: `${Math.max((step.count / maxFunnel) * 100, 12)}%` }}>
                      {step.count}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Source Attribution */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base"><Clock className="h-4 w-4 text-primary" /> Source Attribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.topSource && (
              <div className="rounded-lg bg-muted p-3 mb-3">
                <p className="text-sm text-muted-foreground">Top Source</p>
                <p className="text-xl font-bold capitalize">{stats.topSource[0]}</p>
                <p className="text-xs text-muted-foreground">{stats.topSource[1].count} leads · {stats.topSource[1].kg.toLocaleString()} kg</p>
              </div>
            )}
            <div className="space-y-2">
              {Object.entries(stats.sourceMap).sort((a, b) => b[1].count - a[1].count).slice(0, 6).map(([src, data]) => (
                <div key={src} className="flex items-center justify-between rounded-lg border border-border p-2">
                  <div>
                    <p className="text-sm font-medium capitalize">{src}</p>
                    <p className="text-xs text-muted-foreground">{data.kg.toLocaleString()} kg · Rp {(data.value / 1e6).toFixed(1)}M</p>
                  </div>
                  <Badge variant="secondary">{data.count}</Badge>
                </div>
              ))}
            </div>
            <div className="mt-3">
              <p className="mb-2 text-sm font-medium text-muted-foreground">Recent Leads</p>
              <div className="space-y-2">
                {leads.slice(0, 4).map((lead) => (
                  <div key={lead.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div>
                      <p className="text-sm font-medium">{lead.name}</p>
                      <p className="text-xs text-muted-foreground">{lead.area} · {lead.estimated_kg} kg</p>
                    </div>
                    <Badge variant="secondary" className="text-xs capitalize">{lead.status.replace('_', ' ')}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
