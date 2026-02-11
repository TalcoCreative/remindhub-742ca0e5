import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, Recycle, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { Database } from '@/integrations/supabase/types';

type LeadSource = Database['public']['Enums']['lead_source'];

export default function PublicForm() {
  const { slug } = useParams<{ slug: string }>();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', phone: '', address: '', area: '', category: '', estimatedKg: '', notes: '', sourcePlatform: '',
  });

  const { data: formConfig } = useQuery({
    queryKey: ['public-form', slug],
    queryFn: async () => {
      const { data, error } = await supabase.from('forms').select('*').eq('slug', slug!).eq('is_active', true).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formConfig) return;
    setLoading(true);

    // Use the user-selected source, fallback to form platform, fallback to 'web'
    const userSource = form.sourcePlatform || formConfig.platform || 'web';
    const sourceVal = userSource as LeadSource;

    const { data: leadData, error: leadErr } = await supabase.from('leads').insert({
      name: form.name,
      phone: form.phone,
      address: form.address,
      area: form.area,
      source: sourceVal,
      first_touch_source: sourceVal,
      form_source: formConfig.name,
      platform_source: form.sourcePlatform || formConfig.platform,
      estimated_kg: Number(form.estimatedKg) || 0,
      notes: form.notes,
      type: 'b2c' as const,
    }).select('id').single();

    if (!leadErr && leadData) {
      await supabase.from('form_submissions').insert([{
        form_id: formConfig.id,
        form_name: formConfig.name,
        platform: formConfig.platform,
        source_platform: form.sourcePlatform || null,
        lead_id: leadData.id,
        data: JSON.parse(JSON.stringify(form)),
      }]);
    }

    setLoading(false);
    setSubmitted(true);

    // Build WhatsApp message with form data
    const lines = [
      `Halo, saya ingin request pickup e-waste:`,
      `Nama: ${form.name}`,
      `No. WA: ${form.phone}`,
      `Alamat: ${form.address}`,
      `Area: ${form.area}`,
      form.category ? `Kategori: ${form.category}` : '',
      form.estimatedKg ? `Estimasi Berat: ${form.estimatedKg} kg` : '',
      form.notes ? `Catatan: ${form.notes}` : '',
      form.sourcePlatform ? `Sumber: ${form.sourcePlatform}` : '',
    ].filter(Boolean).join('\n');

    const waUrl = `https://wa.me/62811905883?text=${encodeURIComponent(lines)}`;
    window.open(waUrl, '_blank');
  };

  if (!formConfig) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <p className="text-muted-foreground">Form not found or inactive.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg">
        <Card className="border-2 border-primary/20">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Recycle className="h-6 w-6" />
            </div>
            <CardTitle>{formConfig.name} — Remind Indonesia</CardTitle>
            <CardDescription>Schedule a free e-waste pickup. We'll contact you via WhatsApp.</CardDescription>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <div className="py-8 text-center">
                <CheckCircle className="mx-auto h-16 w-16 text-success" />
                <h3 className="mt-4 text-xl font-bold">Thank you!</h3>
                <p className="mt-1 text-sm text-muted-foreground">We've received your request.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your full name" />
                </div>
                <div className="space-y-2">
                  <Label>WhatsApp Number *</Label>
                  <Input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="08xxxxxxxxxx" />
                </div>
                <div className="space-y-2">
                  <Label>Address *</Label>
                  <Input required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Street address" />
                </div>
                <div className="space-y-2">
                  <Label>City / Area *</Label>
                  <Input required value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="e.g. Jakarta Selatan" />
                </div>
                <div className="space-y-2">
                  <Label>E-Waste Category *</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="electronics">Electronics</SelectItem>
                      <SelectItem value="appliances">Home Appliances</SelectItem>
                      <SelectItem value="office">Office Equipment</SelectItem>
                      <SelectItem value="batteries">Batteries & UPS</SelectItem>
                      <SelectItem value="mixed">Mixed E-Waste</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>How did you hear about us?</Label>
                  <Select value={form.sourcePlatform} onValueChange={(v) => setForm({ ...form, sourcePlatform: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="web">Website</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="tiktok">TikTok</SelectItem>
                      <SelectItem value="referral">Referral</SelectItem>
                      <SelectItem value="campaign">Campaign</SelectItem>
                      <SelectItem value="partner">Partner</SelectItem>
                      <SelectItem value="event">Event</SelectItem>
                      <SelectItem value="friend">Friend</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Estimated Weight (kg)</Label>
                  <Input type="number" value={form.estimatedKg} onChange={(e) => setForm({ ...form, estimatedKg: e.target.value })} placeholder="e.g. 10" />
                </div>
                <div className="space-y-2">
                  <Label>Additional Notes</Label>
                  <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Submit Request
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
