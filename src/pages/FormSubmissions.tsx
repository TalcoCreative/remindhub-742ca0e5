import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useFormSubmissions, useForms } from '@/hooks/useForms';
import { Loader2 } from 'lucide-react';

export default function FormSubmissions() {
  const [formFilter, setFormFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data: forms = [] } = useForms();
  const { data: submissions = [], isLoading } = useFormSubmissions({
    formId: formFilter !== 'all' ? formFilter : undefined,
    platform: platformFilter !== 'all' ? platformFilter : undefined,
    source: sourceFilter !== 'all' ? sourceFilter : undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Form Submissions</h1>
        <p className="text-sm text-muted-foreground">{submissions.length} submissions</p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-3">
          <Select value={formFilter} onValueChange={setFormFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Form" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Forms</SelectItem>
              {forms.map((f) => (<SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Platform" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              <SelectItem value="web">Website</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="event">Event</SelectItem>
              <SelectItem value="campaign">Campaign</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Source" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="website">Website</SelectItem>
              <SelectItem value="instagram">Instagram</SelectItem>
              <SelectItem value="tiktok">TikTok</SelectItem>
              <SelectItem value="event">Event</SelectItem>
              <SelectItem value="friend">Friend</SelectItem>
              <SelectItem value="partner">Partner</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[140px]" placeholder="From" />
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[140px]" placeholder="To" />
        </CardContent>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Form</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Campaign</TableHead>
                <TableHead>Lead</TableHead>
                <TableHead>Submitted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.form_name}</TableCell>
                  <TableCell><Badge variant="outline">{s.platform}</Badge></TableCell>
                  <TableCell className="text-sm">{s.source_platform ?? '-'}</TableCell>
                  <TableCell className="text-sm">{s.campaign_name ?? '-'}</TableCell>
                  <TableCell className="text-sm">{s.lead_id ? <Badge variant="secondary">Linked</Badge> : '-'}</TableCell>
                  <TableCell className="text-sm">{new Date(s.created_at).toLocaleString('id-ID')}</TableCell>
                </TableRow>
              ))}
              {submissions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">No submissions found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
