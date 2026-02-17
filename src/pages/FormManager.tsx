import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useFormSubmissions, useForms } from '@/hooks/useForms';
import { Code, Copy, Loader2, FileText, CheckCircle2, Users, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function FormManager() {
  const { toast } = useToast();
  const { data: forms = [], isLoading, error } = useForms();
  const { data: submissions = [] } = useFormSubmissions();
  const [showEmbed, setShowEmbed] = useState(false);

  console.log('FormManager State:', { forms, isLoading, error, submissions });

  // Use the first form available (single form approach)
  const form = forms[0];
  const formSubmissions = form ? submissions.filter((s) => s.form_id === form.id) : [];

  const getEmbedCode = (slug: string) =>
    `<iframe src="${window.location.origin}/form/${slug}" width="100%" height="700" frameborder="0" style="border: none; border-radius: 12px;"></iframe>`;

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const queryClient = useQueryClient();
  const createDefaultForm = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('forms').insert({
        name: 'General Inquiry',
        slug: 'general-inquiry',
        platform: 'web',
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      toast({ title: 'Default form created!' });
    },
    onError: (err) => {
      toast({ title: 'Failed to create form', description: err.message, variant: 'destructive' });
    }
  });

  if (!form) {
    return (
      <div className="p-4 lg:p-8 bg-gradient-to-br from-background via-accent/10 to-background min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center">
          <Card className="glass border-0 shadow-lg p-8 max-w-md mx-auto">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h1 className="text-2xl font-bold tracking-tight mb-2">No Form Found</h1>
            <p className="text-muted-foreground mb-6">No form has been configured yet.</p>
            <Button onClick={() => createDefaultForm.mutate()} disabled={createDefaultForm.isPending}>
              {createDefaultForm.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Create Default Form
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 lg:p-8 bg-gradient-to-br from-background via-accent/10 to-background min-h-[calc(100vh-4rem)]">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight gradient-text">{form.name}</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
            <span className="font-mono bg-primary/10 text-primary px-2 py-0.5 rounded text-xs">/{form.slug}</span>
            <span>·</span>
            <span>{formSubmissions.length} submissions</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={form.is_active ? 'default' : 'secondary'} className={cn("px-3 py-1", form.is_active ? "bg-emerald-500 hover:bg-emerald-600" : "")}>
            {form.is_active ? 'Active' : 'Inactive'}
          </Badge>
          <Button size="sm" variant="outline" className="gap-2 glass bg-background/50 hover:bg-background/80 shadow-sm" onClick={() => setShowEmbed(true)}>
            <Code className="h-4 w-4" /> <span className="hidden sm:inline">Embed Form</span>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:gap-6 max-w-2xl">
        <Card className="glass border-0 shadow-lg hover:border-primary/20 transition-all">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-inner">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Submissions</p>
              <p className="text-3xl font-bold mt-1 text-foreground">{formSubmissions.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass border-0 shadow-lg hover:border-primary/20 transition-all">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 shadow-inner">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Linked to Leads</p>
              <p className="text-3xl font-bold mt-1 text-foreground">{formSubmissions.filter(s => s.lead_id).length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Submissions Table */}
      <Card className="glass border-0 shadow-lg overflow-hidden">
        <CardHeader className="pb-4 border-b border-white/5">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Recent Submissions
          </CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent border-white/5">
                <TableHead className="w-[150px]">Source</TableHead>
                <TableHead className="hidden sm:table-cell">Campaign</TableHead>
                <TableHead>Lead Status</TableHead>
                <TableHead className="hidden sm:table-cell">Form Data</TableHead>
                <TableHead className="text-right">Submitted At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {formSubmissions.slice(0, 50).map((s) => (
                <TableRow key={s.id} className="hover:bg-primary/5 border-white/5 transition-colors">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary/50"></span>
                      <span className="capitalize">{s.source_platform ?? 'direct'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">{s.campaign_name ?? '-'}</TableCell>
                  <TableCell>
                    {s.lead_id ? (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Linked
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[300px] truncate text-xs font-mono text-muted-foreground hidden sm:table-cell opacity-70">
                    {JSON.stringify(s.data)}
                  </TableCell>
                  <TableCell className="text-xs text-right whitespace-nowrap text-muted-foreground">
                    {new Date(s.created_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </TableCell>
                </TableRow>
              ))}
              {formSubmissions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-16 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-16 w-16 bg-muted/30 rounded-full flex items-center justify-center">
                        <FileText className="h-8 w-8 opacity-20" />
                      </div>
                      <p>No submissions received yet.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Embed Dialog */}
      <Dialog open={showEmbed} onOpenChange={setShowEmbed}>
        <DialogContent className="glass border-0 sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Code className="h-5 w-5 text-primary" /> Embed Code</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Copy and paste this code into your website's HTML to embed the form.</p>
            <div className="rounded-lg bg-black/40 border border-white/10 p-4 relative group">
              <code className="block whitespace-pre-wrap break-all font-mono text-xs text-green-400">
                {getEmbedCode(form.slug)}
              </code>
              <Button size="icon" variant="secondary" className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => {
                navigator.clipboard.writeText(getEmbedCode(form.slug));
                toast({ title: 'Copied!' });
              }}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="bg-muted/30 p-3 rounded-md border border-white/5 text-xs text-muted-foreground">
              <strong>Tip:</strong> You can adjust the width and height attributes in the iframe code to fit your website's layout.
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
