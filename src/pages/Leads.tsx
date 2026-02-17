import { useState, useMemo } from 'react';
import { statusLabels, statusColors, sourceLabels, type LeadStatus } from '@/data/dummy';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Download, LayoutGrid, List, Loader2, ArrowUpDown, ArrowUp, ArrowDown, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLeads, type DbLead } from '@/hooks/useLeads';
import LeadEditDialog from '@/components/leads/LeadEditDialog';

const kanbanColumns: LeadStatus[] = [
  'new', 'not_followed_up', 'followed_up', 'in_progress',
  'picked_up', 'sign_contract', 'completed', 'lost',
];

export default function Leads() {
  const { data: leads = [], isLoading } = useLeads();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedLead, setSelectedLead] = useState<DbLead | null>(null);
  const [sortKey, setSortKey] = useState<string>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === 'asc' ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const filtered = useMemo(() => {
    let result = leads.filter((l) => {
      if (search && !l.name.toLowerCase().includes(search.toLowerCase()) && !l.phone.includes(search)) return false;
      if (statusFilter !== 'all' && l.status !== statusFilter) return false;
      if (sourceFilter !== 'all' && l.source !== sourceFilter) return false;
      if (typeFilter !== 'all' && l.type !== typeFilter) return false;
      return true;
    });
    result = [...result].sort((a, b) => {
      const av = (a as any)[sortKey] ?? '';
      const bv = (b as any)[sortKey] ?? '';
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [leads, search, statusFilter, sourceFilter, typeFilter, sortKey, sortDir]);

  const formatRp = (v?: number | null) => v ? `Rp ${Number(v).toLocaleString('id-ID')}` : '-';

  const exportCSV = () => {
    const headers = ['Name', 'Phone', 'Type', 'Status', 'Source', 'Area', 'Est KG', 'Value', 'PIC'];
    const rows = filtered.map((l) => [l.name, l.phone, l.type, l.status, l.source, l.area ?? '', l.estimated_kg, l.potential_value, l.assigned_pic ?? '']);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leads.csv';
    a.click();
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 lg:p-6 bg-gradient-to-br from-background via-accent/10 to-background min-h-[calc(100vh-4rem)]">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight gradient-text">Leads</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} leads in pipeline</p>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5 shadow-sm hover:shadow-md transition-all glass bg-background/50" onClick={exportCSV}>
          <Download className="h-4 w-4" /> <span className="hidden sm:inline">Export</span> CSV
        </Button>
      </div>

      {/* Filters */}
      <Card className="glass border-0 shadow-lg">
        <CardContent className="flex flex-wrap items-center gap-2 sm:gap-3 p-3">
          <div className="relative w-full sm:flex-1 sm:min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 bg-background/50 border-white/10 focus:border-primary/30 transition-all"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[110px] sm:w-[160px] h-9 glass bg-background/50 border-0"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.entries(statusLabels).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[100px] sm:w-[140px] h-9 glass bg-background/50 border-0"><SelectValue placeholder="Source" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {Object.entries(sourceLabels).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[90px] sm:w-[120px] h-9 glass bg-background/50 border-0"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="b2c">B2C</SelectItem>
                <SelectItem value="b2b">B2B</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Views */}
      <Tabs defaultValue="table" className="space-y-4">
        <TabsList className="glass p-1 border-0 bg-background/30 w-auto inline-flex">
          <TabsTrigger value="table" className="gap-1.5 data-[state=active]:bg-primary/20 data-[state=active]:text-primary transition-all"><List className="h-4 w-4" /> Table</TabsTrigger>
          <TabsTrigger value="kanban" className="gap-1.5 data-[state=active]:bg-primary/20 data-[state=active]:text-primary transition-all"><LayoutGrid className="h-4 w-4" /> Kanban</TabsTrigger>
        </TabsList>

        <TabsContent value="table" className="mt-0">
          <Card className="glass border-0 shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="hover:bg-transparent border-white/10">
                    <TableHead className="cursor-pointer select-none font-semibold text-foreground/70" onClick={() => toggleSort('name')}>
                      <span className="flex items-center gap-1">Name<SortIcon col="name" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none font-semibold text-foreground/70" onClick={() => toggleSort('type')}>
                      <span className="flex items-center gap-1">Type<SortIcon col="type" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none font-semibold text-foreground/70" onClick={() => toggleSort('status')}>
                      <span className="flex items-center gap-1">Status<SortIcon col="status" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none font-semibold text-foreground/70" onClick={() => toggleSort('source')}>
                      <span className="flex items-center gap-1">Source<SortIcon col="source" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none font-semibold text-foreground/70" onClick={() => toggleSort('area')}>
                      <span className="flex items-center gap-1">Area<SortIcon col="area" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none text-right font-semibold text-foreground/70" onClick={() => toggleSort('estimated_kg')}>
                      <span className="flex items-center justify-end gap-1">Est. KG<SortIcon col="estimated_kg" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none text-right font-semibold text-foreground/70" onClick={() => toggleSort('potential_value')}>
                      <span className="flex items-center justify-end gap-1">Value<SortIcon col="potential_value" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none font-semibold text-foreground/70" onClick={() => toggleSort('assigned_pic')}>
                      <span className="flex items-center gap-1">PIC<SortIcon col="assigned_pic" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none font-semibold text-foreground/70" onClick={() => toggleSort('created_at')}>
                      <span className="flex items-center gap-1">Created<SortIcon col="created_at" /></span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((lead) => (
                    <TableRow key={lead.id} className="cursor-pointer hover:bg-primary/5 border-white/5 transition-colors group" onClick={() => setSelectedLead(lead)}>
                      <TableCell>
                        <div>
                          <p className="font-semibold text-foreground group-hover:text-primary transition-colors">{lead.name}</p>
                          <p className="text-xs text-muted-foreground">{lead.phone}</p>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px] uppercase bg-background/50 backdrop-blur-sm">{lead.type}</Badge></TableCell>
                      <TableCell>
                        <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[10px] uppercase font-bold tracking-wide shadow-sm', statusColors[lead.status as LeadStatus] ?? 'bg-muted text-muted-foreground')}>
                          {statusLabels[lead.status as LeadStatus] ?? lead.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm capitalize">{sourceLabels[lead.source as keyof typeof sourceLabels] ?? lead.source}</TableCell>
                      <TableCell className="text-sm">{lead.area || '-'}</TableCell>
                      <TableCell className="text-right text-sm font-mono">{lead.estimated_kg}</TableCell>
                      <TableCell className="text-right text-sm font-mono text-emerald-500">{formatRp(lead.potential_value)}</TableCell>
                      <TableCell className="text-sm">
                        {lead.assigned_pic ? <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />{lead.assigned_pic}</span> : '-'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{new Date(lead.created_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="py-12 text-center text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <div className="h-12 w-12 rounded-full bg-muted/30 flex items-center justify-center"><Search className="h-6 w-6 opacity-20" /></div>
                          <p>No leads found matching your filters.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="kanban" className="mt-0">
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-primary/10 scrollbar-track-transparent">
            {kanbanColumns.map((status) => {
              const items = filtered.filter((l) => l.status === status);
              return (
                <div key={status} className="w-72 shrink-0">
                  <div className="mb-3 flex items-center justify-between px-1">
                    <span className={cn('rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide shadow-sm backdrop-blur-md', statusColors[status])}>{statusLabels[status]}</span>
                    <span className="text-xs font-mono text-muted-foreground bg-background/50 px-2 py-0.5 rounded-full">{items.length}</span>
                  </div>
                  <div className="space-y-3">
                    {items.map((lead) => (
                      <Card key={lead.id} className="cursor-pointer transition-all duration-300 hover:shadow-lg hover:border-primary/30 hover:-translate-y-1 glass border-white/5" onClick={() => setSelectedLead(lead)}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <p className="text-sm font-bold text-foreground line-clamp-1">{lead.name}</p>
                            <Badge variant="outline" className="text-[10px] uppercase h-5">{lead.type}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1"><MapPin className="h-3 w-3" /> {lead.area || 'Unknown Area'}</p>
                          <div className="flex items-center justify-between text-xs pt-2 border-t border-white/5">
                            <span className="font-mono text-muted-foreground">{lead.estimated_kg} kg</span>
                            <span className="font-medium text-emerald-500">{formatRp(lead.potential_value)}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {items.length === 0 && (
                      <div className="h-24 border-2 border-dashed border-muted/20 rounded-xl flex items-center justify-center">
                        <p className="text-xs text-muted-foreground/50">Empty</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      <LeadEditDialog lead={selectedLead} open={!!selectedLead} onClose={() => setSelectedLead(null)} />
    </div>
  );
}
