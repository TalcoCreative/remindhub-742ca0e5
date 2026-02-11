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
import { Plus, Copy, Code, Loader2, FileText, TrendingUp, BarChart3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFormSubmissions } from '@/hooks/useForms';
import { Link } from 'react-router-dom';

export default function FormManager() {
  const { toast } = useToast();
  const { data: forms = [], isLoading } = useForms();
  const createForm = useCreateForm();
  const toggleForm = useToggleForm();
  const [showCreate, setShowCreate] = useState(false);
  const [newForm, setNewForm] = useState({ name: '', slug: '', platform: 'web' });
  const [embedFormId, setEmbedFormId] = useState<string | null>(null);
  const { data: allSubmissions = [] } = useFormSubmissions();

  // Form stats
  const formStats = forms.map((f) => {
    const subs = allSubmissions.filter((s) => s.form_id === f.id);
    return { ...f, submissionCount: subs.length };
  }).sort((a, b) => b.submissionCount - a.submissionCount);

  const totalSubmissions = allSubmissions.length;
  const topForm = formStats[0];

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

      {/* Overview Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-start gap-4 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><FileText className="h-5 w-5" /></div>
            <div><p className="text-sm text-muted-foreground">Total Forms</p><p className="text-2xl font-bold">{forms.length}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-start gap-4 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><BarChart3 className="h-5 w-5" /></div>
            <div><p className="text-sm text-muted-foreground">Total Submissions</p><p className="text-2xl font-bold">{totalSubmissions}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-start gap-4 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><TrendingUp className="h-5 w-5" /></div>
            <div><p className="text-sm text-muted-foreground">Top Form</p><p className="text-lg font-bold truncate">{topForm?.name || '-'}</p><p className="text-xs text-muted-foreground">{topForm?.submissionCount || 0} submissions</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-start gap-4 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><FileText className="h-5 w-5" /></div>
            <div><p className="text-sm text-muted-foreground">Active Forms</p><p className="text-2xl font-bold">{forms.filter((f) => f.is_active).length}</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Top Contributors Bar */}
      {formStats.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Form Contributions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {formStats.map((f) => {
              const pct = totalSubmissions > 0 ? Math.round((f.submissionCount / totalSubmissions) * 100) : 0;
              return (
                <div key={f.id} className="flex items-center gap-3">
                  <span className="w-32 truncate text-sm text-muted-foreground">{f.name}</span>
                  <div className="flex-1">
                    <div className="h-6 rounded-md bg-muted overflow-hidden">
                      <div className="h-full rounded-md bg-primary flex items-center px-2 text-xs font-semibold text-primary-foreground transition-all" style={{ width: `${Math.max(pct, 6)}%` }}>{f.submissionCount}</div>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground w-10 text-right">{pct}%</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Form Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {forms.map((f) => {
          const count = allSubmissions.filter((s) => s.form_id === f.id).length;
          return (
            <Link to={`/forms/${f.id}`} key={f.id} className="block">
              <Card className="cursor-pointer transition-shadow hover:shadow-md">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{f.name}</CardTitle>
                    <Switch
                      checked={f.is_active}
                      onCheckedChange={(v) => { v; toggleForm.mutate({ id: f.id, is_active: !f.is_active }); }}
                      onClick={(e) => e.preventDefault()}
                    />
                  </div>
                  <CardDescription>/{f.slug} · {f.platform}</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center gap-2">
                  <Badge variant={f.is_active ? 'default' : 'secondary'}>{f.is_active ? 'Active' : 'Inactive'}</Badge>
                  <Badge variant="outline" className="ml-1">{count} submissions</Badge>
                  <Button variant="outline" size="sm" className="gap-1 ml-auto" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEmbedFormId(f.id); }}>
                    <Code className="h-3 w-3" /> Embed
                  </Button>
                </CardContent>
              </Card>
            </Link>
          );
        })}
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
