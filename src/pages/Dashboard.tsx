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

const StatCard = ({ title, value, subtitle, icon: Icon, trend, trendValue }: {
  title: string; value: string | number; subtitle?: string; icon: React.ElementType; trend?: 'up' | 'down'; trendValue?: string;
}) => (
  <Card className="glass overflow-hidden relative border-0 shadow-lg group hover:scale-[1.02] transition-transform duration-300">
    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    <CardContent className="flex items-start gap-4 p-5 relative z-10">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 text-primary shadow-inner">
        <Icon className="h-6 w-6" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className="flex items-baseline gap-2 mt-1">
          <h3 className="text-2xl font-bold tracking-tight gradient-text">{value}</h3>
          {trend && (
            <span className={cn("flex items-center text-xs font-medium", trend === 'up' ? "text-emerald-500" : "text-rose-500")}>
              {trend === 'up' ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowUpRight className="h-3 w-3 mr-0.5 rotate-90" />}
              {trendValue}
            </span>
          )}
        </div>
        {subtitle && <p className="mt-1 text-xs text-muted-foreground/80">{subtitle}</p>}
      </div>
    </CardContent>
  </Card>
);

const funnelSteps: { key: LeadStatus; color: string; label: string }[] = [
  { key: 'new', color: 'from-blue-400 to-blue-600', label: 'New Lead' },
  { key: 'not_followed_up', color: 'from-amber-400 to-amber-600', label: 'Not Followed Up' },
  { key: 'followed_up', color: 'from-violet-400 to-violet-600', label: 'Followed Up' },
  { key: 'in_progress', color: 'from-cyan-400 to-cyan-600', label: 'In Progress' },
  { key: 'picked_up', color: 'from-indigo-400 to-indigo-600', label: 'Picked Up' },
  { key: 'sign_contract', color: 'from-primary/80 to-primary', label: 'Contract Signed' },
  { key: 'completed', color: 'from-emerald-400 to-emerald-600', label: 'Completed' },
  { key: 'lost', color: 'from-rose-400 to-rose-600', label: 'Lost' },
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
    // label: statusLabels[s.key], // Use custom labels for cleaner look
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

  if (isLoading) return <div className="flex h-[calc(100vh-4rem)] items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 p-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header & Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight gradient-text">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1 capitalize">{dateLabel}</p>
        </div>

        <div className="flex items-center gap-2 p-1 bg-muted/40 rounded-full border border-white/10 backdrop-blur-sm self-start sm:self-auto">
          {(['today', 'month', 'year', 'range'] as FilterMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setFilterMode(m)}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-300",
                filterMode === m
                  ? "bg-white dark:bg-card text-primary shadow-sm scale-105 font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/20"
              )}
            >
              {m === 'today' ? 'Today' : m === 'month' ? 'Month' : m === 'year' ? 'Year' : 'Range'}
            </button>
          ))}
        </div>

        {filterMode === 'month' && (
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[140px] h-9 text-xs glass border-0 shadow-sm rounded-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {monthOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        {filterMode === 'year' && (
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[100px] h-9 text-xs glass border-0 shadow-sm rounded-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        {filterMode === 'range' && (
          <Popover open={calOpen} onOpenChange={setCalOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn('h-9 text-xs gap-2 rounded-full glass border-0', !dateRange?.from && 'text-muted-foreground')}>
                <CalendarIcon className="h-3.5 w-3.5" />
                {dateRange?.from && dateRange?.to
                  ? `${format(dateRange.from, 'd/M')} – ${format(dateRange.to, 'd/M/yy')}`
                  : 'Select Dates'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 glass border-0 shadow-xl" align="end">
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

        <Link to="/dashboard-detail" className="hidden sm:block">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full bg-accent/20 hover:bg-accent hover:text-accent-foreground text-primary transition-all">
            <ArrowUpRight className="h-5 w-5" />
          </Button>
        </Link>
      </div>

      {/* Main Stats Area */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Leads" value={filteredLeads.length} icon={Users} trend="up" trendValue="+12%" />
        <StatCard title="Total KG" value={`${stats.totalKg.toLocaleString()} kg`} subtitle={`B2C: ${stats.b2cKg} · B2B: ${stats.b2bKg}`} icon={Recycle} trend="up" trendValue="+5%" />
        <StatCard title="Est. Revenue" value={`Rp ${(stats.revenue / 1e6).toFixed(1)} M`} icon={DollarSign} trend="up" trendValue="+8%" />
        <StatCard title="Avg Response" value={formatDuration(stats.avgResponseMs)} subtitle="First reply time" icon={Clock} trend={stats.avgResponseMs < 300000 ? 'up' : 'down'} trendValue={stats.avgResponseMs < 300000 ? 'Good' : 'Slow'} />
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        {/* Funnel Chart */}
        <Card className="lg:col-span-4 glass border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><BarChart3 className="h-5 w-5 text-primary" /> Lead Funnel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {funnelData.map((step, i) => (
              <div key={step.key} className="relative group">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-muted-foreground">{step.label}</span>
                  <span className="text-sm font-bold">{step.count}</span>
                </div>
                <div className="h-3 w-full bg-muted/30 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${step.color} transition-all duration-1000 ease-out`}
                    style={{ width: `${Math.max((step.count / maxFunnel) * 100, 5)}%`, opacity: (step.count > 0 ? 1 : 0.3) }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Source & Quick Stats */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="glass border-0 shadow-lg h-full">
            <CardHeader>
              <CardTitle className="text-lg">Source Attribution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {stats.topSource && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/20 to-teal-500/10 border border-primary/10">
                  <p className="text-xs font-semibold uppercase text-primary tracking-wide mb-1">Top Performer</p>
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-2xl font-bold capitalize text-foreground">{stats.topSource[0]}</h3>
                    <span className="text-lg font-bold text-primary">{stats.topSource[1].count} Leads</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{stats.topSource[1].kg.toLocaleString()} kg Total Volume</p>
                </div>
              )}

              <div className="space-y-3">
                {Object.entries(stats.sourceMap).sort((a, b) => b[1].count - a[1].count).slice(0, 5).map(([src, data], idx) => (
                  <div key={src} className="flex items-center justify-between p-3 rounded-xl bg-white/50 dark:bg-black/20 hover:bg-white/80 transition-colors border border-transparent hover:border-border/50">
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">#{idx + 1}</span>
                      <div>
                        <p className="text-sm font-semibold capitalize">{src}</p>
                        <p className="text-[10px] text-muted-foreground">Rp {(data.value / 1e6).toFixed(1)}M</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="block text-sm font-bold">{data.count}</span>
                      <span className="text-[10px] text-muted-foreground">{data.kg.toLocaleString()} kg</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
