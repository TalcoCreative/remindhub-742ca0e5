import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { statusLabels, type LeadStatus } from '@/data/dummy';
import { Users, Recycle, DollarSign, BarChart3, ArrowUpRight, Loader2, MessageCircle, CheckCircle2, Eye, Clock, CalendarIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useLeads } from '@/hooks/useLeads';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';

function formatDuration(ms: number): string {
  if (ms <= 0) return '-';
  const mins = Math.floor(ms / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0) return `${days}d ${hrs % 24}h`;
  if (hrs > 0) return `${hrs}h ${mins % 60}m`;
  return `${mins}m`;
}

function StatCard({ title, value, subtitle, icon: Icon }: {
  title: string; value: string | number; subtitle?: string; icon: React.ElementType;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-3 sm:gap-4 sm:p-5">
        <div className="flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm text-muted-foreground">{title}</p>
          <p className="mt-0.5 text-lg sm:text-2xl font-bold tracking-tight">{value}</p>
          {subtitle && <p className="mt-0.5 flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground"><ArrowUpRight className="h-3 w-3 text-success" />{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

const funnelSteps: { key: LeadStatus; color: string }[] = [
  { key: 'new', color: 'bg-info' },
  { key: 'not_followed_up', color: 'bg-warning' },
  { key: 'followed_up', color: 'bg-secondary' },
  { key: 'in_progress', color: 'bg-primary' },
  { key: 'picked_up', color: 'bg-accent' },
  { key: 'sign_contract', color: 'bg-primary' },
  { key: 'completed', color: 'bg-success' },
  { key: 'lost', color: 'bg-destructive' },
];

type FilterMode = 'today' | 'month' | 'year' | 'range';

export default function Dashboard() {
  const { data: leads = [], isLoading } = useLeads();
  const { data: chats = [] } = useQuery({
    queryKey: ['chats'],
    queryFn: async () => {
      const { data, error } = await supabase.from('chats').select('*');
      if (error) throw error;
      return data;
    },
  });

  const [filterMode, setFilterMode] = useState<FilterMode>('today');
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  const [selectedYear, setSelectedYear] = useState(() => format(new Date(), 'yyyy'));
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [calOpen, setCalOpen] = useState(false);

  const { dateFrom, dateTo, dateLabel } = useMemo(() => {
    const now = new Date();
    switch (filterMode) {
      case 'today':
        return { dateFrom: startOfDay(now), dateTo: endOfDay(now), dateLabel: format(now, 'EEEE, d MMM yyyy', { locale: idLocale }) };
      case 'month': {
        const d = new Date(selectedMonth + '-01');
        return { dateFrom: startOfMonth(d), dateTo: endOfMonth(d), dateLabel: format(d, 'MMMM yyyy', { locale: idLocale }) };
      }
      case 'year': {
        const d = new Date(Number(selectedYear), 0, 1);
        return { dateFrom: startOfYear(d), dateTo: endOfYear(d), dateLabel: selectedYear };
      }
      case 'range': {
        if (dateRange?.from && dateRange?.to) {
          return { dateFrom: startOfDay(dateRange.from), dateTo: endOfDay(dateRange.to), dateLabel: `${format(dateRange.from, 'd MMM', { locale: idLocale })} – ${format(dateRange.to, 'd MMM yyyy', { locale: idLocale })}` };
        }
        return { dateFrom: startOfDay(now), dateTo: endOfDay(now), dateLabel: 'Pilih rentang' };
      }
      default:
        return { dateFrom: startOfDay(now), dateTo: endOfDay(now), dateLabel: 'Today' };
    }
  }, [filterMode, selectedMonth, selectedYear, dateRange]);

  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      const d = new Date(l.created_at);
      return isWithinInterval(d, { start: dateFrom, end: dateTo });
    });
  }, [leads, dateFrom, dateTo]);

  const stats = useMemo(() => {
    const totalKg = filteredLeads.reduce((s, l) => s + (Number(l.actual_kg) || Number(l.estimated_kg) || 0), 0);
    const b2cKg = filteredLeads.filter((l) => l.type === 'b2c').reduce((s, l) => s + (Number(l.actual_kg) || Number(l.estimated_kg) || 0), 0);
    const b2bKg = filteredLeads.filter((l) => l.type === 'b2b').reduce((s, l) => s + (Number(l.actual_kg) || Number(l.estimated_kg) || 0), 0);
    const deals = filteredLeads.filter((l) => l.status === 'completed');
    const revenue = filteredLeads.reduce((s, l) => s + (Number(l.potential_value) || 0), 0);
    const answered = chats.filter((c) => c.is_answered).length;
    const unanswered = chats.filter((c) => !c.is_answered).length;

    const responseTimes = chats
      .filter((c) => c.first_response_at && c.created_at)
      .map((c) => new Date(c.first_response_at!).getTime() - new Date(c.created_at).getTime());
    const avgResponseMs = responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0;

    const sourceMap: Record<string, { count: number; kg: number; value: number }> = {};
    for (const l of filteredLeads) {
      const src = l.source || 'manual';
      if (!sourceMap[src]) sourceMap[src] = { count: 0, kg: 0, value: 0 };
      sourceMap[src].count++;
      sourceMap[src].kg += Number(l.actual_kg) || Number(l.estimated_kg) || 0;
      sourceMap[src].value += Number(l.potential_value) || 0;
    }
    const topSource = Object.entries(sourceMap).sort((a, b) => b[1].count - a[1].count)[0];

    return { totalKg, b2cKg, b2bKg, revenue, deals: deals.length, sourceMap, topSource, answered, unanswered, avgResponseMs };
  }, [filteredLeads, chats]);

  const funnelData = funnelSteps.map((s) => ({
    ...s,
    label: statusLabels[s.key],
    count: filteredLeads.filter((l) => l.status === s.key).length,
  }));
  const maxFunnel = Math.max(...funnelData.map((d) => d.count), 1);

  // Generate month options
  const monthOptions = useMemo(() => {
    const opts = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      opts.push({ value: format(d, 'yyyy-MM'), label: format(d, 'MMM yyyy', { locale: idLocale }) });
    }
    return opts;
  }, []);

  const yearOptions = useMemo(() => {
    const now = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => String(now - i));
  }, []);

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 lg:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-xs sm:text-sm text-muted-foreground truncate capitalize">{dateLabel}</p>
        </div>
        <Link to="/dashboard-detail" className="hidden sm:block">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs sm:text-sm">
            <Eye className="h-4 w-4" /> Detail & Charts
          </Button>
        </Link>
      </div>

      {/* Date Filter */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 p-2 sm:p-3">
          <div className="flex gap-1">
            {(['today', 'month', 'year', 'range'] as FilterMode[]).map((m) => (
              <Button
                key={m}
                size="sm"
                variant={filterMode === m ? 'default' : 'outline'}
                className="text-xs h-8 px-2 sm:px-3"
                onClick={() => setFilterMode(m)}
              >
                {m === 'today' ? 'Today' : m === 'month' ? 'Month' : m === 'year' ? 'Year' : 'Range'}
              </Button>
            ))}
          </div>

          {filterMode === 'month' && (
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {monthOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          )}

          {filterMode === 'year' && (
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[90px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          )}

          {filterMode === 'range' && (
            <Popover open={calOpen} onOpenChange={setCalOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn('h-8 text-xs gap-1.5', !dateRange?.from && 'text-muted-foreground')}>
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {dateRange?.from && dateRange?.to
                    ? `${format(dateRange.from, 'd/M')} – ${format(dateRange.to, 'd/M/yy')}`
                    : 'Pilih tanggal'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={(range) => {
                    setDateRange(range);
                    if (range?.from && range?.to) setCalOpen(false);
                  }}
                  numberOfMonths={1}
                  locale={idLocale}
                />
              </PopoverContent>
            </Popover>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-2 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Leads" value={filteredLeads.length} icon={Users} />
        <StatCard title="Total KG" value={`${stats.totalKg.toLocaleString()} kg`} subtitle={`B2C: ${stats.b2cKg.toLocaleString()} · B2B: ${stats.b2bKg.toLocaleString()}`} icon={Recycle} />
        <StatCard title="Est. Revenue" value={`Rp ${(stats.revenue / 1e6).toFixed(1)}M`} icon={DollarSign} />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-4 sm:grid-cols-3">
        <StatCard title="Answered" value={stats.answered} icon={CheckCircle2} />
        <StatCard title="Unanswered" value={stats.unanswered} icon={MessageCircle} />
        <StatCard title="Avg Response" value={formatDuration(stats.avgResponseMs)} subtitle="first reply" icon={Clock} />
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
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

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Source Attribution</CardTitle>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
