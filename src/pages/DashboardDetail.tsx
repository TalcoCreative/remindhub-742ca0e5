import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useLeads } from '@/hooks/useLeads';
import { statusLabels, sourceLabels, type LeadStatus } from '@/data/dummy';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfYear, startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns';
import { CalendarIcon, ArrowLeft, TrendingUp, TrendingDown, Minus, Loader2, Users, Database, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import type { DateRange } from 'react-day-picker';

const COLORS = ['hsl(188,90%,27%)', 'hsl(152,60%,40%)', 'hsl(38,92%,50%)', 'hsl(210,80%,55%)', 'hsl(0,72%,51%)', 'hsl(270,60%,50%)', 'hsl(30,80%,50%)', 'hsl(180,60%,40%)'];

const presets = [
  { label: 'Today', getRange: () => ({ from: new Date(), to: new Date() }) },
  { label: 'This Week', getRange: () => ({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: endOfWeek(new Date(), { weekStartsOn: 1 }) }) },
  { label: 'This Month', getRange: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  { label: 'Last Month', getRange: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }) },
  { label: 'Last 90 Days', getRange: () => ({ from: subDays(new Date(), 90), to: new Date() }) },
  { label: 'This Year', getRange: () => ({ from: startOfYear(new Date()), to: new Date() }) },
  { label: 'All Time', getRange: () => ({ from: new Date('2025-01-01'), to: new Date() }) },
];

export default function DashboardDetail() {
  const { data: leads = [], isLoading } = useLeads();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: subDays(new Date(), 90), to: new Date() });
  const [sourceFilter, setSourceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [compareMode, setCompareMode] = useState(false);

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      const d = parseISO(l.created_at);
      if (dateRange?.from && dateRange?.to && !isWithinInterval(d, { start: dateRange.from, end: dateRange.to })) return false;
      if (sourceFilter !== 'all' && l.source !== sourceFilter) return false;
      if (statusFilter !== 'all' && l.status !== statusFilter) return false;
      if (typeFilter !== 'all' && l.type !== typeFilter) return false;
      return true;
    });
  }, [leads, dateRange, sourceFilter, statusFilter, typeFilter]);

  // Comparison period (same duration, shifted back)
  const comparisonFiltered = useMemo(() => {
    if (!compareMode || !dateRange?.from || !dateRange?.to) return [];
    const duration = dateRange.to.getTime() - dateRange.from.getTime();
    const compFrom = new Date(dateRange.from.getTime() - duration);
    const compTo = new Date(dateRange.to.getTime() - duration);
    return leads.filter((l) => {
      const d = parseISO(l.created_at);
      if (!isWithinInterval(d, { start: compFrom, end: compTo })) return false;
      if (sourceFilter !== 'all' && l.source !== sourceFilter) return false;
      if (statusFilter !== 'all' && l.status !== statusFilter) return false;
      if (typeFilter !== 'all' && l.type !== typeFilter) return false;
      return true;
    });
  }, [leads, dateRange, compareMode, sourceFilter, statusFilter, typeFilter]);

  // Stats
  const stats = useMemo(() => {
    const calc = (data: typeof filtered) => {
      const totalKg = data.reduce((s, l) => s + (Number(l.actual_kg) || Number(l.estimated_kg) || 0), 0);
      const deals = data.filter((l) => l.status === 'completed');
      const revenue = deals.reduce((s, l) => s + (Number(l.final_value) || Number(l.deal_value) || 0), 0);
      return { count: data.length, totalKg, deals: deals.length, revenue };
    };
    return { current: calc(filtered), previous: calc(comparisonFiltered) };
  }, [filtered, comparisonFiltered]);

  const pctChange = (cur: number, prev: number) => {
    if (prev === 0) return cur > 0 ? 100 : 0;
    return Math.round(((cur - prev) / prev) * 100);
  };

  // Charts data
  const leadsOverTime = useMemo(() => {
    const map: Record<string, { date: string; count: number; kg: number; deals: number }> = {};
    filtered.forEach((l) => {
      const key = format(parseISO(l.created_at), 'yyyy-MM');
      if (!map[key]) map[key] = { date: key, count: 0, kg: 0, deals: 0 };
      map[key].count++;
      map[key].kg += Number(l.actual_kg) || Number(l.estimated_kg) || 0;
      if (l.status === 'completed') map[key].deals++;
    });
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [filtered]);

  const bySource = useMemo(() => {
    const map: Record<string, { name: string; leads: number; kg: number; value: number }> = {};
    filtered.forEach((l) => {
      const src = l.source || 'manual';
      if (!map[src]) map[src] = { name: sourceLabels[src as keyof typeof sourceLabels] || src, leads: 0, kg: 0, value: 0 };
      map[src].leads++;
      map[src].kg += Number(l.actual_kg) || Number(l.estimated_kg) || 0;
      map[src].value += Number(l.final_value) || Number(l.deal_value) || Number(l.potential_value) || 0;
    });
    return Object.values(map).sort((a, b) => b.leads - a.leads);
  }, [filtered]);

  const byStatus = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((l) => {
      const s = l.status;
      map[s] = (map[s] || 0) + 1;
    });
    return Object.entries(map).map(([k, v]) => ({ name: statusLabels[k as LeadStatus] || k, value: v }));
  }, [filtered]);

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const CompareIndicator = ({ current, previous, suffix = '' }: { current: number; previous: number; suffix?: string }) => {
    if (!compareMode) return null;
    const pct = pctChange(current, previous);
    return (
      <div className={cn('flex items-center gap-1 text-xs', pct > 0 ? 'text-success' : pct < 0 ? 'text-destructive' : 'text-muted-foreground')}>
        {pct > 0 ? <TrendingUp className="h-3 w-3" /> : pct < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
        {pct > 0 ? '+' : ''}{pct}%{suffix && ` ${suffix}`}
      </div>
    );
  };

  return (
    <div className="space-y-6 p-4 lg:p-8 bg-gradient-to-br from-background via-accent/10 to-background min-h-[calc(100vh-4rem)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link to="/"><Button variant="ghost" size="icon" className="hover:bg-primary/10"><ArrowLeft className="h-5 w-5" /></Button></Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight gradient-text">Analytics Deep Dive</h1>
            <p className="text-sm text-muted-foreground">Comprehensive performance metrics and trends.</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="glass border-0 shadow-lg sticky top-4 z-30 backdrop-blur-xl">
        <CardContent className="flex flex-wrap items-center gap-3 p-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 glass bg-background/50 border-white/10 hover:bg-background/80">
                <CalendarIcon className="h-4 w-4 text-primary" />
                {dateRange?.from ? `${format(dateRange.from, 'dd/MM/yy')} - ${dateRange.to ? format(dateRange.to, 'dd/MM/yy') : '...'}` : 'Select dates'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 glass border-0" align="start">
              <div className="flex flex-wrap gap-1 border-b border-white/10 p-2 bg-black/20">
                {presets.map((p) => (
                  <Button key={p.label} variant="ghost" size="sm" className="text-xs h-7 hover:bg-primary/20 hover:text-primary" onClick={() => setDateRange(p.getRange())}>
                    {p.label}
                  </Button>
                ))}
              </div>
              <Calendar mode="range" selected={dateRange} onSelect={setDateRange} numberOfMonths={2} className="bg-background/95" />
            </PopoverContent>
          </Popover>
          <div className="h-6 w-px bg-white/10 mx-1 hidden sm:block" />
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-[130px] h-9 glass bg-background/50 border-white/10"><SelectValue placeholder="Source" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              {Object.entries(sourceLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px] h-9 glass bg-background/50 border-white/10"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[100px] h-9 glass bg-background/50 border-white/10"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="b2c">B2C</SelectItem>
              <SelectItem value="b2b">B2B</SelectItem>
            </SelectContent>
          </Select>
          <div className="ml-auto">
            <Button
              variant={compareMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCompareMode(!compareMode)}
              className={cn("gap-2 transition-all", compareMode ? "shadow-lg shadow-primary/20" : "glass bg-transparent border-primary/20 text-primary hover:bg-primary/10")}
            >
              {compareMode ? <TrendingUp className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
              Compare
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { title: 'Total Leads', value: stats.current.count, prev: stats.previous.count, icon: Users },
          { title: 'Total Collected', value: stats.current.totalKg, prev: stats.previous.totalKg, fmt: (v: number) => `${v.toLocaleString()} kg`, icon: Database },
          { title: 'Deals Closed', value: stats.current.deals, prev: stats.previous.deals, icon: CheckCircle2 },
          { title: 'Est. Revenue', value: stats.current.revenue, prev: stats.previous.revenue, fmt: (v: number) => `Rp ${(v / 1e6).toFixed(1)}M`, icon: TrendingUp },
        ].map((s, i) => (
          <Card key={s.title} className="glass border-0 shadow-lg hover:translate-y-[-2px] transition-transform">
            <CardContent className="p-5">
              <div className="flex justify-between items-start mb-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{s.title}</p>
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <s.icon className="h-4 w-4" /> {/* Note: Ensure icons are imported */}
                </div>
              </div>
              <p className="text-3xl font-bold gradient-text">{s.fmt ? s.fmt(s.value) : s.value}</p>
              <div className="mt-2 flex items-center justify-between">
                <CompareIndicator current={s.value} previous={s.prev} />
                {compareMode && <p className="text-[10px] text-muted-foreground bg-black/20 px-1.5 py-0.5 rounded">prev: {s.fmt ? s.fmt(s.prev) : s.prev}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Leads over time */}
        <Card className="glass border-0 shadow-lg">
          <CardHeader className="pb-2 border-b border-white/5">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-primary" /> Growth Trend
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={leadsOverTime}>
                  <defs>
                    <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(188,90%,27%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(188,90%,27%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-white/5" vertical={false} />
                  <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} dy={10} />
                  <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} dx={-10} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }} />
                  <Legend iconType="circle" />
                  <Line type="monotone" dataKey="count" name="Leads" stroke="hsl(188,90%,27%)" strokeWidth={3} dot={{ r: 4, fill: 'hsl(188,90%,27%)', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="deals" name="Deals" stroke="hsl(152,60%,40%)" strokeWidth={3} dot={{ r: 4, fill: 'hsl(152,60%,40%)', strokeWidth: 2, stroke: '#fff' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* KG over time */}
        <Card className="glass border-0 shadow-lg">
          <CardHeader className="pb-2 border-b border-white/5"><CardTitle className="text-base flex items-center gap-2"><Database className="h-4 w-4 text-primary" /> Volume Collected (KG)</CardTitle></CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={leadsOverTime}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-white/5" vertical={false} />
                <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} dy={10} />
                <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} dx={-10} />
                <Tooltip cursor={{ fill: 'white', opacity: 0.05 }} contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                <Bar dataKey="kg" name="KG" fill="url(#colorKg)" radius={[4, 4, 0, 0]}>
                  <defs>
                    <linearGradient id="colorKg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(188,90%,27%)" stopOpacity={1} />
                      <stop offset="100%" stopColor="hsl(188,90%,27%)" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* By Source (pie) */}
        <Card className="glass border-0 shadow-lg">
          <CardHeader className="pb-2 border-b border-white/5"><CardTitle className="text-base">Acquisition Source</CardTitle></CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={bySource}
                  dataKey="leads"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {bySource.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="rgba(0,0,0,0.5)" strokeWidth={1} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status distribution */}
        <Card className="glass border-0 shadow-lg">
          <CardHeader className="pb-2 border-b border-white/5"><CardTitle className="text-base">Pipeline Status</CardTitle></CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={byStatus} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-white/5" horizontal={false} />
                <XAxis type="number" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={100} className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'white', opacity: 0.05 }} contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                <Bar dataKey="value" name="Leads" radius={[0, 4, 4, 0]} barSize={20}>
                  {byStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
