import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
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
  const [searchParams] = useSearchParams();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: searchParams.get('name') || '',
    phone: searchParams.get('phone') || '',
    address: searchParams.get('address') || '',
    area: searchParams.get('area') || '',
    category: searchParams.get('category') || '',
    estimatedKg: searchParams.get('estimatedKg') || '',
    notes: searchParams.get('notes') || '',
    sourcePlatform: searchParams.get('source') || '',
  });

  // Keep lead_id in ref or state if needed for submission logic, though it's not in the visible form state object above.
  const leadIdParam = searchParams.get('lead_id');

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
    let finalLeadId = leadIdParam;

    // 1. Create or Update Lead
    if (!finalLeadId) {
      // Create new lead if no ID provided
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

      if (!leadErr && leadData) finalLeadId = leadData.id;
    } else {
      // Update existing lead with latest info? Optional. 
      // For now, let's just link to it. Maybe update critical fields if empty.
    }

    if (finalLeadId) {
      await supabase.from('form_submissions').insert([{
        form_id: formConfig.id,
        form_name: formConfig.name,
        platform: formConfig.platform,
        source_platform: form.sourcePlatform || null,
        lead_id: finalLeadId,
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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-primary/5 to-background p-4 animate-in fade-in duration-700">
      <div className="w-full max-w-lg">
        <Card className="glass border-0 shadow-2xl relative overflow-hidden backdrop-blur-xl">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-background to-muted shadow-inner border border-white/5 p-4">
              <img src="/logo.png" alt="Logo" className="h-full w-full object-contain drop-shadow-sm" />
            </div>
            <CardTitle className="text-2xl font-bold gradient-text">{formConfig.name}</CardTitle>
            <CardDescription className="text-base text-muted-foreground/90">
              Schedule your e-waste pickup easily.<br />
              <span className="text-xs opacity-70">Powered by RemindHub</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {submitted ? (
              <div className="py-12 text-center space-y-4 animate-in zoom-in-50 duration-500">
                <div className="mx-auto h-20 w-20 rounded-full bg-green-500/10 flex items-center justify-center">
                  <CheckCircle className="h-10 w-10 text-green-500" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground">Request Received!</h3>
                  <p className="text-muted-foreground">We have redirected you to WhatsApp to finalize your request.</p>
                </div>
                <Button variant="outline" onClick={() => window.location.reload()} className="mt-4 gap-2">
                  <Recycle className="h-4 w-4" /> Submit Another
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Full Name</Label>
                  <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="John Doe" className="bg-background/50 border-white/10 focus:border-primary/50 transition-colors h-11" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">WhatsApp Number</Label>
                  <Input required type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="08xxxxxxxxxx" className="bg-background/50 border-white/10 focus:border-primary/50 transition-colors h-11" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Area / City</Label>
                    <Input required value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="Jakarta Selatan" className="bg-background/50 border-white/10 focus:border-primary/50 transition-colors h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Est. Weight (Kg)</Label>
                    <Input type="number" value={form.estimatedKg} onChange={(e) => setForm({ ...form, estimatedKg: e.target.value })} placeholder="10" className="bg-background/50 border-white/10 focus:border-primary/50 transition-colors h-11" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Address</Label>
                  <Textarea required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Complete street address..." className="bg-background/50 border-white/10 focus:border-primary/50 transition-colors resize-none" rows={2} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Category</Label>
                    <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                      <SelectTrigger className="bg-background/50 border-white/10 h-11"><SelectValue placeholder="Select" /></SelectTrigger>
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
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Source</Label>
                    <Select value={form.sourcePlatform} onValueChange={(v) => setForm({ ...form, sourcePlatform: v })}>
                      <SelectTrigger className="bg-background/50 border-white/10 h-11"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="instagram">Instagram</SelectItem>
                        <SelectItem value="tiktok">TikTok</SelectItem>
                        <SelectItem value="friend">Friend / Referral</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Notes (Optional)</Label>
                  <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Specific items or pickup instructions..." className="bg-background/50 border-white/10 focus:border-primary/50 transition-colors resize-none" rows={2} />
                </div>

                <Button type="submit" className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all mt-2" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                  {loading ? 'Processing...' : 'Schedule Pickup via WhatsApp'}
                </Button>
                <p className="text-center text-[10px] text-muted-foreground pt-2">
                  By submitting, you agree to our <span className="underline hover:text-primary cursor-pointer">Terms of Service</span>.
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
