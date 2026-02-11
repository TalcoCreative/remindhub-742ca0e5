import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useUpdateLead, useLeadAuditLog, type DbLead, type DbLeadUpdate } from '@/hooks/useLeads';
import { statusLabels, sourceLabels } from '@/data/dummy';
import { useToast } from '@/hooks/use-toast';
import { Loader2, History, Save } from 'lucide-react';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import type { Database } from '@/integrations/supabase/types';

type LeadSource = Database['public']['Enums']['lead_source'];
type LeadStatus = Database['public']['Enums']['lead_status'];
type LeadType = Database['public']['Enums']['lead_type'];

interface Props {
  lead: DbLead | null;
  open: boolean;
  onClose: () => void;
}

export default function LeadEditDialog({ lead, open, onClose }: Props) {
  const { toast } = useToast();
  const updateLead = useUpdateLead();
  const { data: picList = [] } = useTeamMembers();
  const { data: auditLog } = useLeadAuditLog(lead?.id);
  const [form, setForm] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (lead) setForm({ ...lead });
  }, [lead]);

  if (!lead) return null;

  const set = (k: string, v: unknown) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    const auditEntries: { field_name: string; old_value: string | null; new_value: string | null }[] = [];
    const updates: DbLeadUpdate = {};
    const fields = [
      'name', 'phone', 'type', 'company', 'address', 'area', 'source', 'status',
      'assigned_pic', 'notes', 'reason_lost', 'estimated_kg', 'actual_kg',
      'b2b_processed_kg', 'pickup_date', 'pickup_status', 'contract_status',
      'potential_value', 'deal_value', 'final_value', 'next_follow_up',
    ] as const;

    for (const f of fields) {
      const oldVal = String((lead as Record<string, unknown>)[f] ?? '');
      const newVal = String(form[f] ?? '');
      if (oldVal !== newVal) {
        (updates as Record<string, unknown>)[f] = form[f];
        auditEntries.push({ field_name: f, old_value: oldVal || null, new_value: newVal || null });
      }
    }

    if (Object.keys(updates).length === 0) {
      onClose();
      return;
    }

    try {
      await updateLead.mutateAsync({ id: lead.id, updates, auditEntries });
      toast({ title: 'Lead Updated', description: `${auditEntries.length} field(s) changed.` });
      onClose();
    } catch (err: unknown) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Edit Lead: {lead.name}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="info">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="info">Info</TabsTrigger>
            <TabsTrigger value="ops">Operational</TabsTrigger>
            <TabsTrigger value="value">Value</TabsTrigger>
            <TabsTrigger value="history">
              <History className="mr-1 h-3 w-3" /> History
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[60vh] pr-4">
            <TabsContent value="info" className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Name</Label>
                  <Input value={String(form.name ?? '')} onChange={(e) => set('name', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Phone</Label>
                  <Input value={String(form.phone ?? '')} onChange={(e) => set('phone', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Type</Label>
                  <Select value={String(form.type ?? 'b2c')} onValueChange={(v) => set('type', v as LeadType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="b2c">B2C</SelectItem>
                      <SelectItem value="b2b">B2B</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Company</Label>
                  <Input value={String(form.company ?? '')} onChange={(e) => set('company', e.target.value)} />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label>Address</Label>
                  <Input value={String(form.address ?? '')} onChange={(e) => set('address', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Area</Label>
                  <Input value={String(form.area ?? '')} onChange={(e) => set('area', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Source</Label>
                  <Select value={String(form.source ?? 'manual')} onValueChange={(v) => set('source', v as LeadSource)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(sourceLabels).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Status</Label>
                  <Select value={String(form.status ?? 'new')} onValueChange={(v) => set('status', v as LeadStatus)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusLabels).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Assigned PIC</Label>
                  <Select value={String(form.assigned_pic ?? '')} onValueChange={(v) => set('assigned_pic', v)}>
                    <SelectTrigger><SelectValue placeholder="Select PIC" /></SelectTrigger>
                    <SelectContent>
                      {picList.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Next Follow Up</Label>
                  <Input type="date" value={String(form.next_follow_up ?? '').slice(0, 10)} onChange={(e) => set('next_follow_up', e.target.value)} />
                </div>
                {form.status === 'lost' && (
                  <div className="space-y-1 col-span-2">
                    <Label>Reason Lost</Label>
                    <Input value={String(form.reason_lost ?? '')} onChange={(e) => set('reason_lost', e.target.value)} />
                  </div>
                )}
                <div className="space-y-1 col-span-2">
                  <Label>Notes</Label>
                  <Textarea value={String(form.notes ?? '')} onChange={(e) => set('notes', e.target.value)} rows={3} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="ops" className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Estimated KG</Label>
                  <Input type="number" value={String(form.estimated_kg ?? '')} onChange={(e) => set('estimated_kg', Number(e.target.value))} />
                </div>
                <div className="space-y-1">
                  <Label>Actual Picked Up KG</Label>
                  <Input type="number" value={String(form.actual_kg ?? '')} onChange={(e) => set('actual_kg', Number(e.target.value))} />
                </div>
                <div className="space-y-1">
                  <Label>B2B Processed KG</Label>
                  <Input type="number" value={String(form.b2b_processed_kg ?? '')} onChange={(e) => set('b2b_processed_kg', Number(e.target.value))} />
                </div>
                <div className="space-y-1">
                  <Label>Pickup Date</Label>
                  <Input type="date" value={String(form.pickup_date ?? '')} onChange={(e) => set('pickup_date', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Pickup Status</Label>
                  <Select value={String(form.pickup_status ?? '')} onValueChange={(v) => set('pickup_status', v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Scheduled">Scheduled</SelectItem>
                      <SelectItem value="In Transit">In Transit</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                      <SelectItem value="Cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Contract Status</Label>
                  <Select value={String(form.contract_status ?? '')} onValueChange={(v) => set('contract_status', v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Draft">Draft</SelectItem>
                      <SelectItem value="Sent">Sent</SelectItem>
                      <SelectItem value="Signed">Signed</SelectItem>
                      <SelectItem value="Expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="value" className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Potential Value (Rp)</Label>
                  <Input type="number" value={String(form.potential_value ?? '')} onChange={(e) => set('potential_value', Number(e.target.value))} />
                </div>
                <div className="space-y-1">
                  <Label>Deal Value (Rp)</Label>
                  <Input type="number" value={String(form.deal_value ?? '')} onChange={(e) => set('deal_value', Number(e.target.value))} />
                </div>
                <div className="space-y-1">
                  <Label>Final Value (Rp)</Label>
                  <Input type="number" value={String(form.final_value ?? '')} onChange={(e) => set('final_value', Number(e.target.value))} />
                </div>
              </div>
              <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
                <p className="text-muted-foreground">Source Attribution</p>
                <p>First Touch: <strong>{String(form.first_touch_source ?? '-')}</strong></p>
                <p>Last Touch: <strong>{String(form.last_touch_source ?? '-')}</strong></p>
                <p>Form Source: <strong>{String(form.form_source ?? '-')}</strong></p>
                <p>Platform: <strong>{String(form.platform_source ?? '-')}</strong></p>
              </div>
            </TabsContent>

            <TabsContent value="history" className="pt-2">
              {auditLog && auditLog.length > 0 ? (
                <div className="space-y-2">
                  {auditLog.map((entry) => (
                    <div key={entry.id} className="flex items-start gap-2 rounded-lg border border-border p-2 text-sm">
                      <Badge variant="outline" className="shrink-0 text-[10px]">{entry.field_name}</Badge>
                      <div className="min-w-0 flex-1">
                        <p><span className="text-muted-foreground">From:</span> {entry.old_value || '-'}</p>
                        <p><span className="text-muted-foreground">To:</span> {entry.new_value || '-'}</p>
                      </div>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {new Date(entry.created_at).toLocaleString('id-ID')}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">No changes recorded yet.</p>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={updateLead.isPending}>
            {updateLead.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
