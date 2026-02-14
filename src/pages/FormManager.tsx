import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useFormSubmissions, useForms } from '@/hooks/useForms';
import { Code, Copy, Loader2, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function FormManager() {
  const { toast } = useToast();
  const { data: forms = [], isLoading } = useForms();
  const { data: submissions = [] } = useFormSubmissions();
  const [showEmbed, setShowEmbed] = useState(false);

  // Use the first form available (single form approach)
  const form = forms[0];
  const formSubmissions = form ? submissions.filter((s) => s.form_id === form.id) : [];

  const getEmbedCode = (slug: string) =>
    `<iframe src="${window.location.origin}/form/${slug}" width="100%" height="700" frameborder="0" style="border: none; border-radius: 12px;"></iframe>`;

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (!form) {
    return (
      <div className="p-3 sm:p-4 lg:p-6">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Form</h1>
        <p className="mt-2 text-muted-foreground">No form configured yet. Create a form in the database to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 lg:p-6">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{form.name}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">/{form.slug} · {formSubmissions.length} submissions</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={form.is_active ? 'default' : 'secondary'}>{form.is_active ? 'Active' : 'Inactive'}</Badge>
          <Button size="sm" variant="outline" className="gap-1 text-xs sm:text-sm" onClick={() => setShowEmbed(true)}>
            <Code className="h-4 w-4" /> <span className="hidden sm:inline">Embed</span>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        <Card>
          <CardContent className="flex items-start gap-3 p-3 sm:gap-4 sm:p-5">
            <div className="flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><FileText className="h-4 w-4 sm:h-5 sm:w-5" /></div>
            <div><p className="text-xs sm:text-sm text-muted-foreground">Total Submissions</p><p className="text-lg sm:text-2xl font-bold">{formSubmissions.length}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-start gap-3 p-3 sm:gap-4 sm:p-5">
            <div className="flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><FileText className="h-4 w-4 sm:h-5 sm:w-5" /></div>
            <div><p className="text-xs sm:text-sm text-muted-foreground">Linked to Leads</p><p className="text-lg sm:text-2xl font-bold">{formSubmissions.filter(s => s.lead_id).length}</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Submissions Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Submissions</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead className="hidden sm:table-cell">Campaign</TableHead>
                <TableHead>Lead</TableHead>
                <TableHead className="hidden sm:table-cell">Data</TableHead>
                <TableHead>Submitted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {formSubmissions.slice(0, 50).map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="text-sm">{s.source_platform ?? 'direct'}</TableCell>
                  <TableCell className="text-sm hidden sm:table-cell">{s.campaign_name ?? '-'}</TableCell>
                  <TableCell>{s.lead_id ? <Badge variant="secondary">Linked</Badge> : '-'}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground hidden sm:table-cell">{JSON.stringify(s.data)}</TableCell>
                  <TableCell className="text-xs whitespace-nowrap">{new Date(s.created_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</TableCell>
                </TableRow>
              ))}
              {formSubmissions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">No submissions yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Embed Dialog */}
      <Dialog open={showEmbed} onOpenChange={setShowEmbed}>
        <DialogContent>
          <DialogHeader><DialogTitle>Embed Code</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Copy and paste this code into your website to embed the form.</p>
            <div className="rounded-lg bg-muted p-4">
              <code className="block whitespace-pre-wrap break-all font-mono text-xs">
                {getEmbedCode(form.slug)}
              </code>
            </div>
            <Button variant="outline" onClick={() => {
              navigator.clipboard.writeText(getEmbedCode(form.slug));
              toast({ title: 'Copied!' });
            }}>
              <Copy className="mr-2 h-4 w-4" /> Copy Code
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
