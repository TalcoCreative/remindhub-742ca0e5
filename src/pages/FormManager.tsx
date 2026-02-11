import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useForms, useCreateForm, useToggleForm } from '@/hooks/useForms';
import { Plus, Copy, Code, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function FormManager() {
  const { toast } = useToast();
  const { data: forms = [], isLoading } = useForms();
  const createForm = useCreateForm();
  const toggleForm = useToggleForm();
  const [showCreate, setShowCreate] = useState(false);
  const [newForm, setNewForm] = useState({ name: '', slug: '', platform: 'web' });
  const [embedFormId, setEmbedFormId] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!newForm.name || !newForm.slug) return;
    try {
      await createForm.mutateAsync(newForm);
      toast({ title: 'Form Created' });
      setShowCreate(false);
      setNewForm({ name: '', slug: '', platform: 'web' });
    } catch (err: unknown) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
    }
  };

  const getEmbedCode = (slug: string) =>
    `<iframe src="${window.location.origin}/form/${slug}" width="100%" height="700" frameborder="0" style="border: none; border-radius: 12px;"></iframe>`;

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Forms</h1>
          <p className="text-sm text-muted-foreground">Create and manage lead capture forms</p>
        </div>
        <Button className="gap-1.5" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" /> New Form
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {forms.map((f) => (
          <Card key={f.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{f.name}</CardTitle>
                <Switch
                  checked={f.is_active}
                  onCheckedChange={(v) => toggleForm.mutate({ id: f.id, is_active: v })}
                />
              </div>
              <CardDescription>/{f.slug} · {f.platform}</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-2">
              <Badge variant={f.is_active ? 'default' : 'secondary'}>{f.is_active ? 'Active' : 'Inactive'}</Badge>
              <Button variant="outline" size="sm" className="gap-1 ml-auto" onClick={() => setEmbedFormId(f.id)}>
                <Code className="h-3 w-3" /> Embed
              </Button>
            </CardContent>
          </Card>
        ))}
        {forms.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground">
            No forms yet. Create your first form to start capturing leads.
          </div>
        )}
      </div>

      {/* Create Form Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create New Form</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Form Name</Label>
              <Input value={newForm.name} onChange={(e) => setNewForm({ ...newForm, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') })} placeholder="e.g. Event Pickup Form" />
            </div>
            <div className="space-y-1">
              <Label>Slug</Label>
              <Input value={newForm.slug} onChange={(e) => setNewForm({ ...newForm, slug: e.target.value })} placeholder="event-pickup" />
            </div>
            <div className="space-y-1">
              <Label>Platform</Label>
              <Select value={newForm.platform} onValueChange={(v) => setNewForm({ ...newForm, platform: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="web">Website</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                  <SelectItem value="campaign">Campaign</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleCreate} disabled={createForm.isPending} className="w-full">
              {createForm.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create Form
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Embed Code Dialog */}
      <Dialog open={!!embedFormId} onOpenChange={() => setEmbedFormId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Embed Code</DialogTitle></DialogHeader>
          {embedFormId && (
            <div className="space-y-3">
              <div className="rounded-lg bg-muted p-4">
                <code className="block whitespace-pre-wrap break-all font-mono text-xs">
                  {getEmbedCode(forms.find((f) => f.id === embedFormId)?.slug ?? '')}
                </code>
              </div>
              <Button variant="outline" onClick={() => {
                navigator.clipboard.writeText(getEmbedCode(forms.find((f) => f.id === embedFormId)?.slug ?? ''));
                toast({ title: 'Copied!' });
              }}>
                <Copy className="mr-2 h-4 w-4" /> Copy Code
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
