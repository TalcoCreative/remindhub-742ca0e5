import { useState, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search, Plus, Upload, Filter, X, MessageCircle, Phone, Building2, MapPin,
  CheckCircle2, XCircle, Loader2, Edit, Eye, Download, ArrowUpDown, ArrowUp, ArrowDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { statusLabels, statusColors, type LeadStatus } from '@/data/dummy';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useTeamMembers } from '@/hooks/useTeamMembers';

const sourceOptions = ['whatsapp', 'web', 'instagram', 'referral', 'campaign', 'partner', 'manual', 'tiktok', 'event', 'friend', 'csv'];

export default function Contacts() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: picList = [] } = useTeamMembers();

  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [filterSource, setFilterSource] = useState('all');
  const [filterContacted, setFilterContacted] = useState('all');
  const [filterPic, setFilterPic] = useState('all');
  const [filterArea, setFilterArea] = useState('all');

  const [addOpen, setAddOpen] = useState(false);
  const [detailContact, setDetailContact] = useState<any>(null);
  const [editContact, setEditContact] = useState<any>(null);
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

  const [form, setForm] = useState({ name: '', phone: '', type: 'b2c', company: '', area: '', source: 'manual', notes: '' });

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('contacts').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: async () => {
      const { data, error } = await supabase.from('leads').select('id, name, phone, status');
      if (error) throw error;
      return data;
    },
  });

  const areas = useMemo(() => [...new Set(contacts.map((c) => c.area).filter(Boolean))], [contacts]);

  const filteredContacts = useMemo(() => {
    let result = contacts.filter((c) => {
      if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.phone.includes(search)) return false;
      if (filterType !== 'all' && c.type !== filterType) return false;
      if (filterSource !== 'all' && c.source !== filterSource) return false;
      if (filterContacted === 'yes' && !c.is_contacted) return false;
      if (filterContacted === 'no' && c.is_contacted) return false;
      if (filterPic !== 'all' && c.assigned_pic !== filterPic) return false;
      if (filterArea !== 'all' && c.area !== filterArea) return false;
      return true;
    });
    result = [...result].sort((a, b) => {
      const av = (a as any)[sortKey] ?? '';
      const bv = (b as any)[sortKey] ?? '';
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [contacts, search, filterType, filterSource, filterContacted, filterPic, filterArea, sortKey, sortDir]);

  const hasActiveFilter = filterType !== 'all' || filterSource !== 'all' || filterContacted !== 'all' || filterPic !== 'all' || filterArea !== 'all';

  const addContact = useMutation({
    mutationFn: async (data: typeof form) => {
      const { error } = await supabase.from('contacts').insert({
        name: data.name.trim(),
        phone: data.phone.trim(),
        type: data.type,
        company: data.company.trim() || null,
        area: data.area.trim() || null,
        source: data.source,
        sources: [data.source],
        notes: data.notes.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts'] });
      setAddOpen(false);
      setForm({ name: '', phone: '', type: 'b2c', company: '', area: '', source: 'manual', notes: '' });
      toast.success('Contact added');
    },
    onError: (e: any) => toast.error(e.message?.includes('contacts_phone_unique') ? 'Phone number already exists' : e.message),
  });

  const updateContact = useMutation({
    mutationFn: async (data: any) => {
      const { id, ...rest } = data;
      const { error } = await supabase.from('contacts').update(rest).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts'] });
      setEditContact(null);
      toast.success('Contact updated');
    },
  });

  const createLeadFromContact = useMutation({
    mutationFn: async (contact: any) => {
      const { data, error } = await supabase.from('leads').insert({
        name: contact.name,
        phone: contact.phone,
        type: contact.type || 'b2c',
        company: contact.company,
        area: contact.area,
        source: contact.source || 'manual',
        assigned_pic: contact.assigned_pic,
      }).select().single();
      if (error) throw error;
      await supabase.from('contacts').update({ lead_id: data.id }).eq('id', contact.id);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts'] });
      qc.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead created from contact');
    },
  });

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split('\n').filter(Boolean);
    if (lines.length < 2) { toast.error('CSV must have header + data rows'); return; }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const nameIdx = headers.findIndex((h) => h.includes('name'));
    const phoneIdx = headers.findIndex((h) => h.includes('phone'));
    if (nameIdx === -1 || phoneIdx === -1) { toast.error('CSV must have "name" and "phone" columns'); return; }

    const typeIdx = headers.findIndex((h) => h.includes('type'));
    const companyIdx = headers.findIndex((h) => h.includes('company'));
    const areaIdx = headers.findIndex((h) => h.includes('area'));
    const sourceIdx = headers.findIndex((h) => h.includes('source'));

    const rows = lines.slice(1).map((line) => {
      const cols = line.split(',').map((c) => c.trim());
      return {
        name: cols[nameIdx] || 'Unknown',
        phone: cols[phoneIdx] || '',
        type: typeIdx >= 0 ? cols[typeIdx] || 'b2c' : 'b2c',
        company: companyIdx >= 0 ? cols[companyIdx] || null : null,
        area: areaIdx >= 0 ? cols[areaIdx] || null : null,
        source: 'csv',
        sources: ['csv'],
        is_contacted: false,
      };
    }).filter((r) => r.phone);

    if (rows.length === 0) { toast.error('No valid rows found'); return; }

    const { error } = await supabase.from('contacts').upsert(rows, { onConflict: 'phone', ignoreDuplicates: false });
    if (error) { toast.error(error.message); return; }

    qc.invalidateQueries({ queryKey: ['contacts'] });
    toast.success(`${rows.length} contacts imported`);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const contactNow = async (contact: any) => {
    try {
      // Check if chat already exists for this phone
      const { data: existingChat } = await supabase
        .from('chats')
        .select('id')
        .eq('contact_phone', contact.phone)
        .maybeSingle();

      if (existingChat) {
        navigate(`/inbox?chat=${existingChat.id}`);
        return;
      }

      // Create new chat room — trigger auto-links contact & lead
      const { data: newChat, error } = await supabase.from('chats').insert({
        contact_name: contact.name,
        contact_phone: contact.phone,
        status: 'new' as const,
      }).select().single();

      if (error) throw error;

      qc.invalidateQueries({ queryKey: ['contacts'] });
      qc.invalidateQueries({ queryKey: ['chats'] });

      navigate(`/inbox?chat=${newChat.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create chat');
    }
  };

  const getLeadStatus = (contact: any) => {
    if (contact.lead_id) {
      const lead = leads.find((l) => l.id === contact.lead_id);
      return lead?.status as LeadStatus | undefined;
    }
    return undefined;
  };

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contacts</h1>
          <p className="text-sm text-muted-foreground">Master contact database — {contacts.length} total</p>
        </div>
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleCSVImport} />
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => {
            const template = 'name,phone,type,company,area,source\nJohn Doe,628123456789,b2c,PT Example,Jakarta,manual\n';
            const blob = new Blob([template], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = 'contacts_template.csv'; a.click();
          }}>
            <Download className="h-4 w-4" /> Template CSV
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4" /> Import CSV
          </Button>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Add Contact</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Contact</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                  <div><Label>Phone *</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="628..." /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Type</Label>
                    <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="b2c">B2C</SelectItem><SelectItem value="b2b">B2B</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div><Label>Source</Label>
                    <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{sourceOptions.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Company</Label><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
                  <div><Label>Area</Label><Input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} /></div>
                </div>
                <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
              </div>
              <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button onClick={() => addContact.mutate(form)} disabled={!form.name.trim() || !form.phone.trim() || addContact.isPending}>
                  {addContact.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-8 sm:h-9 text-sm" />
          </div>
          <Button variant={hasActiveFilter ? 'default' : 'outline'} size="sm" className="gap-1 text-xs" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Filters</span>
          </Button>
          {hasActiveFilter && (
            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => { setFilterType('all'); setFilterSource('all'); setFilterContacted('all'); setFilterPic('all'); setFilterArea('all'); }}>
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
          <Badge variant="secondary" className="text-[10px] sm:text-xs">{filteredContacts.length}</Badge>
        </div>

        {showFilters && (
          <Card>
            <CardContent className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 p-3">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent><SelectItem value="all">All Types</SelectItem><SelectItem value="b2c">B2C</SelectItem><SelectItem value="b2b">B2B</SelectItem></SelectContent>
              </Select>
              <Select value={filterSource} onValueChange={setFilterSource}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Source" /></SelectTrigger>
                <SelectContent><SelectItem value="all">All Sources</SelectItem>{sourceOptions.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={filterContacted} onValueChange={setFilterContacted}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Contacted" /></SelectTrigger>
                <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="yes">Contacted</SelectItem><SelectItem value="no">Not Contacted</SelectItem></SelectContent>
              </Select>
              <Select value={filterPic} onValueChange={setFilterPic}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="PIC" /></SelectTrigger>
                <SelectContent><SelectItem value="all">All PIC</SelectItem>{picList.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={filterArea} onValueChange={setFilterArea}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Area" /></SelectTrigger>
                <SelectContent><SelectItem value="all">All Areas</SelectItem>{areas.map((a) => <SelectItem key={a!} value={a!}>{a}</SelectItem>)}</SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Contacts Table */}
      <Card>
        <ScrollArea className="h-[calc(100vh-18rem)]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card border-b border-border">
                <tr className="text-left text-[10px] sm:text-xs text-muted-foreground">
                  <th className="px-2 sm:px-3 py-2 cursor-pointer select-none" onClick={() => toggleSort('name')}><span className="flex items-center">Name<SortIcon col="name" /></span></th>
                  <th className="px-2 sm:px-3 py-2 cursor-pointer select-none hidden sm:table-cell" onClick={() => toggleSort('phone')}><span className="flex items-center">Phone<SortIcon col="phone" /></span></th>
                  <th className="px-2 sm:px-3 py-2 cursor-pointer select-none hidden md:table-cell" onClick={() => toggleSort('type')}><span className="flex items-center">Type<SortIcon col="type" /></span></th>
                  <th className="px-2 sm:px-3 py-2 cursor-pointer select-none" onClick={() => toggleSort('source')}><span className="flex items-center">Source<SortIcon col="source" /></span></th>
                  <th className="px-2 sm:px-3 py-2 cursor-pointer select-none hidden lg:table-cell" onClick={() => toggleSort('area')}><span className="flex items-center">Area<SortIcon col="area" /></span></th>
                  <th className="px-2 sm:px-3 py-2 cursor-pointer select-none hidden lg:table-cell" onClick={() => toggleSort('assigned_pic')}><span className="flex items-center">PIC<SortIcon col="assigned_pic" /></span></th>
                  <th className="px-2 sm:px-3 py-2 cursor-pointer select-none" onClick={() => toggleSort('chat_id')}><span className="flex items-center"><span className="hidden sm:inline">Contacted?</span><span className="sm:hidden">Chat</span><SortIcon col="chat_id" /></span></th>
                  <th className="px-2 sm:px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
              {filteredContacts.map((c) => {
                  return (
                    <tr key={c.id} className="border-b border-border hover:bg-muted/50 transition-colors text-xs sm:text-sm">
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2">
                        <p className="font-medium truncate max-w-[120px] sm:max-w-none">{c.name}</p>
                        <p className="text-[10px] text-muted-foreground sm:hidden">{c.phone}</p>
                      </td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-muted-foreground hidden sm:table-cell">{c.phone}</td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 hidden md:table-cell"><Badge variant="outline" className="text-[10px]">{c.type?.toUpperCase()}</Badge></td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 capitalize text-muted-foreground">{c.source}</td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-muted-foreground hidden lg:table-cell">{c.area || '—'}</td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-muted-foreground hidden lg:table-cell">{c.assigned_pic || '—'}</td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2">
                        {c.chat_id
                          ? <span className="flex items-center gap-0.5 text-[10px] sm:text-xs text-success"><CheckCircle2 className="h-3 w-3" /> <span className="hidden sm:inline">Yes</span></span>
                          : <span className="flex items-center gap-0.5 text-[10px] sm:text-xs text-warning"><XCircle className="h-3 w-3" /> <span className="hidden sm:inline">No</span></span>
                        }
                      </td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2">
                        <div className="flex items-center justify-end gap-0.5 sm:gap-1">
                          <Button variant="default" size="sm" className="h-6 text-[10px] gap-0.5 px-1.5 sm:px-2" onClick={() => contactNow(c)}>
                              <MessageCircle className="h-3 w-3" /> <span className="hidden sm:inline">Contact</span>
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditContact(c)}>
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredContacts.length === 0 && (
                  <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">No contacts found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </ScrollArea>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editContact} onOpenChange={(o) => !o && setEditContact(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Contact</DialogTitle></DialogHeader>
          {editContact && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Name</Label><Input defaultValue={editContact.name} onChange={(e) => setEditContact({ ...editContact, name: e.target.value })} /></div>
                <div><Label>Phone</Label><Input defaultValue={editContact.phone} onChange={(e) => setEditContact({ ...editContact, phone: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Type</Label>
                  <Select defaultValue={editContact.type || 'b2c'} onValueChange={(v) => setEditContact({ ...editContact, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="b2c">B2C</SelectItem><SelectItem value="b2b">B2B</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label>PIC</Label>
                  <Select defaultValue={editContact.assigned_pic || ''} onValueChange={(v) => setEditContact({ ...editContact, assigned_pic: v })}>
                    <SelectTrigger><SelectValue placeholder="Select PIC" /></SelectTrigger>
                    <SelectContent>{picList.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Company</Label><Input defaultValue={editContact.company || ''} onChange={(e) => setEditContact({ ...editContact, company: e.target.value })} /></div>
                <div><Label>Area</Label><Input defaultValue={editContact.area || ''} onChange={(e) => setEditContact({ ...editContact, area: e.target.value })} /></div>
              </div>
              <div><Label>Notes</Label><Textarea defaultValue={editContact.notes || ''} onChange={(e) => setEditContact({ ...editContact, notes: e.target.value })} rows={2} /></div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={() => updateContact.mutate({ id: editContact.id, name: editContact.name, phone: editContact.phone, type: editContact.type, company: editContact.company, area: editContact.area, assigned_pic: editContact.assigned_pic, notes: editContact.notes })} disabled={updateContact.isPending}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}