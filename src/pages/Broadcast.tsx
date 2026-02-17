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
    <div className="space-y-4 sm:space-y-6 p-4 lg:p-8 bg-gradient-to-br from-background via-accent/10 to-background min-h-[calc(100vh-4rem)]">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight gradient-text">Broadcast</h1>
        <p className="text-sm text-muted-foreground">Send targeted WhatsApp messages via Qontak</p>
      </div>

      <Tabs defaultValue="compose" className="space-y-6">
        <TabsList className="glass p-1 border-0 bg-background/30 w-auto inline-flex">
          <TabsTrigger value="compose" className="gap-1.5 data-[state=active]:bg-primary/20 data-[state=active]:text-primary transition-all">Compose</TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5 data-[state=active]:bg-primary/20 data-[state=active]:text-primary transition-all">History ({logs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="space-y-4 mt-0">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Filters */}
            <Card className="lg:col-span-1 glass border-0 shadow-lg h-fit">
              <CardHeader className="pb-3 border-b border-white/10">
                <CardTitle className="flex items-center gap-2 text-base font-semibold"><Filter className="h-4 w-4 text-primary" /> Target Filters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-3">
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="bg-background/50 border-white/10"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent><SelectItem value="all">All Status</SelectItem>{statusOptions.map((s) => <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={filterSource} onValueChange={setFilterSource}>
                    <SelectTrigger className="bg-background/50 border-white/10"><SelectValue placeholder="Source" /></SelectTrigger>
                    <SelectContent><SelectItem value="all">All Sources</SelectItem>{sourceOptions.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="bg-background/50 border-white/10"><SelectValue placeholder="Type" /></SelectTrigger>
                    <SelectContent><SelectItem value="all">All Types</SelectItem><SelectItem value="b2c">B2C</SelectItem><SelectItem value="b2b">B2B</SelectItem></SelectContent>
                  </Select>
                  <Select value={filterPic} onValueChange={setFilterPic}>
                    <SelectTrigger className="bg-background/50 border-white/10"><SelectValue placeholder="PIC" /></SelectTrigger>
                    <SelectContent><SelectItem value="all">All PIC</SelectItem>{picList.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={filterArea} onValueChange={setFilterArea}>
                    <SelectTrigger className="bg-background/50 border-white/10"><SelectValue placeholder="Area" /></SelectTrigger>
                    <SelectContent><SelectItem value="all">All Areas</SelectItem>{areas.map((a) => <SelectItem key={a!} value={a!}>{a}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={filterContacted} onValueChange={setFilterContacted}>
                    <SelectTrigger className="bg-background/50 border-white/10"><SelectValue placeholder="Response" /></SelectTrigger>
                    <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="answered">Answered</SelectItem><SelectItem value="unanswered">Unanswered</SelectItem></SelectContent>
                  </Select>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Last Contacted Range</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input type="date" className="h-9 text-xs bg-background/50 border-white/10" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                      <Input type="date" className="h-9 text-xs bg-background/50 border-white/10" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-primary/10 border border-primary/20 p-4 mt-2">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <span className="text-2xl font-bold block leading-none">{recipients.length}</span>
                      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">recipients matched</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Message Composer */}
            <Card className="lg:col-span-2 glass border-0 shadow-lg flex flex-col">
              <CardHeader className="pb-3 border-b border-white/10">
                <CardTitle className="flex items-center gap-2 text-base font-semibold"><Send className="h-4 w-4 text-primary" /> Message Template</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4 flex-1">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Variables</Label>
                  <div className="flex flex-wrap gap-2">
                    {templateVars.map((v) => (
                      <button key={v} className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                        onClick={() => setMessage((prev) => prev + ' ' + v)}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                <Textarea
                  placeholder="Type your broadcast message here... Use template variables above."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={8}
                  className="bg-background/50 border-white/10 focus:border-primary/30 resize-none"
                />

                {/* Image Attachment */}
                <div className="space-y-3 pt-2 border-t border-white/5">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <ImagePlus className="h-4 w-4 text-primary" /> Image Attachment (Optional)
                  </Label>
                  <div className="flex items-center gap-3">
                    <Input
                      placeholder="Paste image URL (https://...)"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      className="bg-background/50 border-white/10"
                    />
                    {imageUrl && (
                      <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 hover:bg-destructive/10 hover:text-destructive transition-colors" onClick={() => setImageUrl('')}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {imageUrl && (
                    <div className="relative w-32 h-32 rounded-lg border border-white/10 overflow-hidden bg-muted/50 shdoaw-sm">
                      <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }} />
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground bg-muted/30 p-2 rounded-md border border-white/5">
                    Note: For Qontak broadcast, the image will be sent as header media. The URL must be publicly accessible.
                  </p>
                </div>

                {/* Preview */}
                {message && recipients.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <Label className="text-sm font-medium">Preview (sample)</Label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {recipients.slice(0, 2).map((r) => (
                        <div key={r.id} className="rounded-xl border border-white/10 bg-background/40 p-3 text-sm shadow-sm relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-1 h-full bg-primary/20"></div>
                          <p className="font-semibold text-foreground mb-1.5 flex justify-between">
                            <span>{r.name}</span>
                            <span className="text-[10px] text-muted-foreground font-normal">{r.phone}</span>
                          </p>
                          <p className="whitespace-pre-wrap text-muted-foreground text-xs leading-relaxed">{previewMessage(r)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-4 mt-auto">
                  <Button className="w-full gap-2 shadow-lg shadow-primary/20 text-base py-6" disabled={!message.trim() || recipients.length === 0} onClick={() => setConfirmOpen(true)}>
                    <Send className="h-5 w-5" /> Send Broadcast to {recipients.length} recipients
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-0">
          <Card className="glass border-0 shadow-lg overflow-hidden">
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-16rem)]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background/80 backdrop-blur-md z-10 border-b border-white/10">
                    <tr className="text-left text-xs text-muted-foreground font-semibold">
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Sent By</th>
                      <th className="px-4 py-3">Recipients</th>
                      <th className="px-4 py-3">Message Snippet</th>
                      <th className="px-4 py-3">Mode</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-b border-white/5 hover:bg-primary/5 transition-colors">
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap font-mono text-xs">{format(new Date(log.sent_at), 'dd MMM yyyy HH:mm')}</td>
                        <td className="px-4 py-3">{log.sent_by}</td>
                        <td className="px-4 py-3"><Badge variant="secondary" className="bg-primary/10 text-primary">{log.total_recipients}</Badge></td>
                        <td className="px-4 py-3 max-w-xs truncate text-muted-foreground">{log.message_template}</td>
                        <td className="px-4 py-3"><Badge variant="outline" className="text-[10px] uppercase">{log.mode}</Badge></td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1.5 text-xs text-emerald-500 font-medium"><CheckCircle2 className="h-3.5 w-3.5" /> {log.delivery_status}</span>
                        </td>
                      </tr>
                    ))}
                    {logs.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No broadcast history yet</td></tr>
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
        <DialogContent className="glass border-0 sm:max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-amber-500"><AlertTriangle className="h-5 w-5" /> Confirm Broadcast</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-xl bg-muted/50 p-4 space-y-2 border border-white/5">
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <span className="text-sm text-muted-foreground">Recipients</span>
                <span className="font-bold text-lg">{recipients.length} <span className="text-sm font-normal text-muted-foreground">leads</span></span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Sent by</span>
                <span className="text-sm font-medium">{user?.email}</span>
              </div>
              {imageUrl && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Attachment</span>
                  <span className="text-sm font-medium text-emerald-500 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Image Included</span>
                </div>
              )}
            </div>

            {imageUrl && (
              <div className="aspect-video w-full rounded-lg border border-white/10 overflow-hidden bg-black/20">
                <img src={imageUrl} alt="Broadcast" className="w-full h-full object-contain" />
              </div>
            )}

            <div className="rounded-lg border border-white/10 p-3 bg-background/50">
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Message Preview</p>
              <ScrollArea className="h-32 rounded-md bg-muted/30 p-2">
                <p className="text-sm whitespace-pre-wrap">{message}</p>
              </ScrollArea>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild><Button variant="outline" className="glass bg-transparent">Cancel</Button></DialogClose>
            <Button onClick={() => sendBroadcast.mutate()} disabled={sendBroadcast.isPending} className="gap-2 shadow-lg shadow-primary/20">
              {sendBroadcast.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Confirm & Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}