import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useForms, useFormSubmissions } from '@/hooks/useForms';
import { ArrowLeft, FileText, Users, TrendingUp, Loader2 } from 'lucide-react';

export default function FormDetail() {
  const { formId } = useParams<{ formId: string }>();
  const { data: forms = [] } = useForms();
  const { data: submissions = [], isLoading } = useFormSubmissions({ formId });

  const form = forms.find((f) => f.id === formId);

  const stats = useMemo(() => {
    const total = submissions.length;
    const linked = submissions.filter((s) => s.lead_id).length;
    const sourceMap: Record<string, number> = {};
    const dailyMap: Record<string, number> = {};

    for (const s of submissions) {
      const src = s.source_platform || 'direct';
      sourceMap[src] = (sourceMap[src] || 0) + 1;
      const day = new Date(s.created_at).toLocaleDateString('id-ID');
      dailyMap[day] = (dailyMap[day] || 0) + 1;
    }

    const topSource = Object.entries(sourceMap).sort((a, b) => b[1] - a[1])[0];
    const avgPerDay = Object.keys(dailyMap).length > 0 ? Math.round(total / Object.keys(dailyMap).length) : 0;

    return { total, linked, sourceMap, topSource, avgPerDay };
  }, [submissions]);

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex items-center gap-3">
        <Link to="/forms">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{form?.name || 'Form'}</h1>
          <p className="text-sm text-muted-foreground">/{form?.slug} · {form?.platform}</p>
        </div>
        <Badge variant={form?.is_active ? 'default' : 'secondary'} className="ml-auto">
          {form?.is_active ? 'Active' : 'Inactive'}
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-start gap-4 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Submissions</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-start gap-4 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Linked to Leads</p>
              <p className="text-2xl font-bold">{stats.linked}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-start gap-4 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg / Day</p>
              <p className="text-2xl font-bold">{stats.avgPerDay}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-start gap-4 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Top Source</p>
              <p className="text-2xl font-bold capitalize">{stats.topSource?.[0] || '-'}</p>
              <p className="text-xs text-muted-foreground">{stats.topSource?.[1] || 0} submissions</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Source Breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Source Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {Object.entries(stats.sourceMap).sort((a, b) => b[1] - a[1]).map(([src, count]) => {
            const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
            return (
              <div key={src} className="flex items-center gap-3">
                <span className="w-24 truncate text-sm capitalize text-muted-foreground">{src}</span>
                <div className="flex-1">
                  <div className="h-6 rounded-md bg-muted overflow-hidden">
                    <div className="h-full rounded-md bg-primary flex items-center px-2 text-xs font-semibold text-primary-foreground transition-all" style={{ width: `${Math.max(pct, 8)}%` }}>
                      {count}
                    </div>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground w-10 text-right">{pct}%</span>
              </div>
            );
          })}
          {Object.keys(stats.sourceMap).length === 0 && <p className="text-sm text-muted-foreground">No submissions yet.</p>}
        </CardContent>
      </Card>

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
                <TableHead>Campaign</TableHead>
                <TableHead>Lead</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Submitted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.slice(0, 50).map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="text-sm">{s.source_platform ?? 'direct'}</TableCell>
                  <TableCell className="text-sm">{s.campaign_name ?? '-'}</TableCell>
                  <TableCell>{s.lead_id ? <Badge variant="secondary">Linked</Badge> : '-'}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">{JSON.stringify(s.data)}</TableCell>
                  <TableCell className="text-sm">{new Date(s.created_at).toLocaleString('id-ID')}</TableCell>
                </TableRow>
              ))}
              {submissions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">No submissions yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
