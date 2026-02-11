import { useState, useMemo } from 'react';
import { statusLabels, statusColors, sourceLabels, type LeadStatus } from '@/data/dummy';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Download, LayoutGrid, List, Loader2 } from 'lucide-react';
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

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (search && !l.name.toLowerCase().includes(search.toLowerCase()) && !l.phone.includes(search)) return false;
      if (statusFilter !== 'all' && l.status !== statusFilter) return false;
      if (sourceFilter !== 'all' && l.source !== sourceFilter) return false;
      if (typeFilter !== 'all' && l.type !== typeFilter) return false;
      return true;
    });
  }, [leads, search, statusFilter, sourceFilter, typeFilter]);

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
    <div className="space-y-4 p-4 lg:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} leads found</p>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={exportCSV}>
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search name or phone..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {Object.entries(statusLabels).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Source" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              {Object.entries(sourceLabels).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[120px]"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="b2c">B2C</SelectItem>
              <SelectItem value="b2b">B2B</SelectItem>
            </SelectContent>
          </Select>
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
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Area</TableHead>
                    <TableHead className="text-right">Est. KG</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead>PIC</TableHead>
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
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">No leads found.</TableCell>
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
