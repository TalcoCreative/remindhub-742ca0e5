import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import {
  Send, Filter, Users, Loader2, CheckCircle2, Clock, AlertTriangle, History, ImagePlus, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { statusLabels, type LeadStatus } from '@/data/dummy';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';

import { useTeamMembers } from '@/hooks/useTeamMembers';

const sourceOptions = ['whatsapp', 'web', 'instagram', 'referral', 'campaign', 'partner', 'manual', 'tiktok', 'event', 'friend'];
const statusOptions: LeadStatus[] = ['new', 'not_followed_up', 'followed_up', 'in_progress', 'picked_up', 'sign_contract', 'completed', 'lost'];
const templateVars = ['{{name}}', '{{company}}', '{{area}}', '{{status}}', '{{last_pickup_date}}'];

export default function Broadcast() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: picList = [] } = useTeamMembers();

  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSource, setFilterSource] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterPic, setFilterPic] = useState('all');
  const [filterArea, setFilterArea] = useState('all');
  const [filterContacted, setFilterContacted] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [message, setMessage] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: async () => {
      const { data, error } = await supabase.from('leads').select('*');
      if (error) throw error;
      return data;
    },
  });

  const { data: chats = [] } = useQuery({
    queryKey: ['chats'],
    queryFn: async () => {
      const { data, error } = await supabase.from('chats').select('contact_phone, unread');
      if (error) throw error;
      return data;
    },
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['broadcast_logs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('broadcast_logs').select('*').order('sent_at', { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
  });

  const areas = useMemo(() => [...new Set(leads.map((l) => l.area).filter(Boolean))], [leads]);

  const unansweredPhones = useMemo(() => new Set(chats.filter((c) => c.unread > 0).map((c) => c.contact_phone)), [chats]);

  const recipients = useMemo(() => {
    return leads.filter((l) => {
      if (filterStatus !== 'all' && l.status !== filterStatus) return false;
      if (filterSource !== 'all' && l.source !== filterSource) return false;
      if (filterType !== 'all' && l.type !== filterType) return false;
      if (filterPic !== 'all' && l.assigned_pic !== filterPic) return false;
      if (filterArea !== 'all' && l.area !== filterArea) return false;
      if (filterContacted === 'answered' && unansweredPhones.has(l.phone)) return false;
      if (filterContacted === 'unanswered' && !unansweredPhones.has(l.phone)) return false;
      if (dateFrom && l.last_contacted && l.last_contacted < dateFrom) return false;
      if (dateTo && l.last_contacted && l.last_contacted > dateTo) return false;
      return true;
    });
  }, [leads, filterStatus, filterSource, filterType, filterPic, filterArea, filterContacted, dateFrom, dateTo, unansweredPhones]);

  const filtersUsed = {
    status: filterStatus, source: filterSource, type: filterType, pic: filterPic,
    area: filterArea, contacted: filterContacted, dateFrom, dateTo,
  };

  const sendBroadcast = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('broadcast_logs').insert({
        sent_by: user?.email || 'unknown',
        message_template: message,
        image_url: imageUrl || null,
        filters: filtersUsed,
        total_recipients: recipients.length,
        recipient_phones: recipients.map((r) => r.phone),
        delivery_status: 'sent',
        mode: 'live',
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['broadcast_logs'] });
      setConfirmOpen(false);
      setMessage('');
      setImageUrl('');
      toast.success(`Broadcast logged for ${recipients.length} recipients`);
    },
  });

  const previewMessage = (lead: any) => {
    return message
      .replace('{{name}}', lead.name || '')
      .replace('{{company}}', lead.company || '')
      .replace('{{area}}', lead.area || '')
      .replace('{{status}}', statusLabels[lead.status as LeadStatus] || '')
      .replace('{{last_pickup_date}}', lead.pickup_date || '');
  };

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-3 sm:space-y-4 p-3 sm:p-4 lg:p-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Broadcast</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Send targeted WhatsApp messages via Qontak</p>
      </div>

      <Tabs defaultValue="compose">
        <TabsList>
          <TabsTrigger value="compose">Compose</TabsTrigger>
          <TabsTrigger value="history">History ({logs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Filters */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm"><Filter className="h-4 w-4" /> Target Filters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All Status</SelectItem>{statusOptions.map((s) => <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={filterSource} onValueChange={setFilterSource}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Source" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All Sources</SelectItem>{sourceOptions.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All Types</SelectItem><SelectItem value="b2c">B2C</SelectItem><SelectItem value="b2b">B2B</SelectItem></SelectContent>
                </Select>
                <Select value={filterPic} onValueChange={setFilterPic}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="PIC" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All PIC</SelectItem>{picList.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={filterArea} onValueChange={setFilterArea}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Area" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All Areas</SelectItem>{areas.map((a) => <SelectItem key={a!} value={a!}>{a}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={filterContacted} onValueChange={setFilterContacted}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Response" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="answered">Answered</SelectItem><SelectItem value="unanswered">Unanswered</SelectItem></SelectContent>
                </Select>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Last Contacted Range</Label>
                  <div className="grid grid-cols-2 gap-1.5 mt-1">
                    <Input type="date" className="h-7 text-xs" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                    <Input type="date" className="h-7 text-xs" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                  </div>
                </div>

                <div className="rounded-lg bg-muted p-3 mt-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="text-sm font-bold">{recipients.length}</span>
                    <span className="text-xs text-muted-foreground">recipients</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Message Composer */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm"><Send className="h-4 w-4" /> Message Template</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {templateVars.map((v) => (
                    <button key={v} className="rounded-full border border-border bg-secondary px-2.5 py-1 text-[11px] text-secondary-foreground hover:bg-accent transition-colors"
                      onClick={() => setMessage((prev) => prev + ' ' + v)}>
                      {v}
                    </button>
                  ))}
                </div>
                <Textarea
                  placeholder="Type your broadcast message here... Use template variables above."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                />

                {/* Image Attachment */}
                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-1.5">
                    <ImagePlus className="h-3.5 w-3.5" /> Image Attachment (Optional)
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Paste image URL (https://...)"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      className="text-xs"
                    />
                    {imageUrl && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setImageUrl('')}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  {imageUrl && (
                    <div className="relative w-24 h-24 rounded-md border border-border overflow-hidden bg-muted">
                      <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }} />
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    For Qontak broadcast: image will be sent as header media. URL must be publicly accessible.
                  </p>
                </div>

                {/* Preview */}
                {message && recipients.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground">Preview (sample recipients):</p>
                    <div className="space-y-1.5 max-h-40 overflow-auto">
                      {recipients.slice(0, 3).map((r) => (
                        <div key={r.id} className="rounded-md border border-border bg-muted/50 p-2.5 text-xs">
                          <p className="font-medium text-muted-foreground mb-1">To: {r.name} ({r.phone})</p>
                          <p className="whitespace-pre-wrap">{previewMessage(r)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button className="w-full gap-2" disabled={!message.trim() || recipients.length === 0} onClick={() => setConfirmOpen(true)}>
                  <Send className="h-4 w-4" /> Send Broadcast to {recipients.length} recipients
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-16rem)]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-card border-b border-border">
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Sent By</th>
                      <th className="px-3 py-2">Recipients</th>
                      <th className="px-3 py-2">Message</th>
                      <th className="px-3 py-2">Mode</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-b border-border hover:bg-muted/50">
                        <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{format(new Date(log.sent_at), 'dd MMM yyyy HH:mm')}</td>
                        <td className="px-3 py-2">{log.sent_by}</td>
                        <td className="px-3 py-2"><Badge variant="secondary">{log.total_recipients}</Badge></td>
                        <td className="px-3 py-2 max-w-xs truncate text-muted-foreground">{log.message_template}</td>
                        <td className="px-3 py-2"><Badge variant="outline" className="text-[10px]">{log.mode}</Badge></td>
                        <td className="px-3 py-2">
                          <span className="flex items-center gap-1 text-xs text-success"><CheckCircle2 className="h-3 w-3" /> {log.delivery_status}</span>
                        </td>
                      </tr>
                    ))}
                    {logs.length === 0 && (
                      <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">No broadcast history yet</td></tr>
                    )}
                  </tbody>
                </table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Confirmation Modal */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-warning" /> Confirm Broadcast</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg bg-muted p-3 space-y-1">
              <p className="text-sm"><strong>Recipients:</strong> {recipients.length} leads</p>
              <p className="text-sm"><strong>Sent by:</strong> {user?.email}</p>
              {imageUrl && <p className="text-sm"><strong>Image:</strong> Attached ✓</p>}
            </div>
            {imageUrl && (
              <div className="w-20 h-20 rounded-md border border-border overflow-hidden">
                <img src={imageUrl} alt="Broadcast" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="rounded-md border border-border p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">Message Template:</p>
              <p className="text-sm whitespace-pre-wrap">{message}</p>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={() => sendBroadcast.mutate()} disabled={sendBroadcast.isPending} className="gap-1.5">
              {sendBroadcast.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Confirm & Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}