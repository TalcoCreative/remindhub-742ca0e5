import { useState, useMemo } from 'react';
import { statusLabels, statusColors, sourceLabels, type LeadStatus } from '@/data/dummy';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Download, LayoutGrid, List, Loader2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
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
    <div className="space-y-3 sm:space-y-4 p-3 sm:p-4 lg:p-6">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Leads</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">{filtered.length} leads</p>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={exportCSV}>
          <Download className="h-4 w-4" /> <span className="hidden sm:inline">Export</span> CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 sm:gap-3 p-2 sm:p-3">
          <div className="relative w-full sm:flex-1 sm:min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search name or phone..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-8 sm:h-9 text-sm" />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[110px] sm:w-[160px] h-8 text-xs sm:text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.entries(statusLabels).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[100px] sm:w-[140px] h-8 text-xs sm:text-sm"><SelectValue placeholder="Source" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {Object.entries(sourceLabels).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[90px] sm:w-[120px] h-8 text-xs sm:text-sm"><SelectValue placeholder="Type" /></SelectTrigger>
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
      <Tabs defaultValue="table">
        <TabsList>
          <TabsTrigger value="table" className="gap-1.5"><List className="h-4 w-4" /> Table</TabsTrigger>
          <TabsTrigger value="kanban" className="gap-1.5"><LayoutGrid className="h-4 w-4" /> Kanban</TabsTrigger>
        </TabsList>

        <TabsContent value="table" className="mt-4">
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('name')}>
                      <span className="flex items-center">Name<SortIcon col="name" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('type')}>
                      <span className="flex items-center">Type<SortIcon col="type" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('status')}>
                      <span className="flex items-center">Status<SortIcon col="status" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('source')}>
                      <span className="flex items-center">Source<SortIcon col="source" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('area')}>
                      <span className="flex items-center">Area<SortIcon col="area" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none text-right" onClick={() => toggleSort('estimated_kg')}>
                      <span className="flex items-center justify-end">Est. KG<SortIcon col="estimated_kg" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none text-right" onClick={() => toggleSort('potential_value')}>
                      <span className="flex items-center justify-end">Value<SortIcon col="potential_value" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('assigned_pic')}>
                      <span className="flex items-center">PIC<SortIcon col="assigned_pic" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('created_at')}>
                      <span className="flex items-center">Created<SortIcon col="created_at" /></span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((lead) => (
                    <TableRow key={lead.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedLead(lead)}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{lead.name}</p>
                          <p className="text-xs text-muted-foreground">{lead.phone}</p>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="text-xs uppercase">{lead.type}</Badge></TableCell>
                      <TableCell>
                        <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', statusColors[lead.status as LeadStatus] ?? 'bg-muted text-muted-foreground')}>
                          {statusLabels[lead.status as LeadStatus] ?? lead.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{sourceLabels[lead.source as keyof typeof sourceLabels] ?? lead.source}</TableCell>
                      <TableCell className="text-sm">{lead.area}</TableCell>
                      <TableCell className="text-right text-sm">{lead.estimated_kg}</TableCell>
                      <TableCell className="text-right text-sm">{formatRp(lead.potential_value)}</TableCell>
                      <TableCell className="text-sm">{lead.assigned_pic}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{new Date(lead.created_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="py-12 text-center text-muted-foreground">No leads found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="kanban" className="mt-4">
          <div className="flex gap-4 overflow-x-auto pb-4">
            {kanbanColumns.map((status) => {
              const items = filtered.filter((l) => l.status === status);
              return (
                <div key={status} className="w-64 shrink-0">
                  <div className="mb-2 flex items-center justify-between">
                    <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', statusColors[status])}>{statusLabels[status]}</span>
                    <span className="text-xs text-muted-foreground">{items.length}</span>
                  </div>
                  <div className="space-y-2">
                    {items.map((lead) => (
                      <Card key={lead.id} className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => setSelectedLead(lead)}>
                        <CardContent className="p-3">
                          <p className="text-sm font-medium">{lead.name}</p>
                          <p className="text-xs text-muted-foreground">{lead.area}</p>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">{lead.estimated_kg} kg</span>
                            <Badge variant="outline" className="text-[10px] uppercase">{lead.type}</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {items.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">No leads</p>}
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
