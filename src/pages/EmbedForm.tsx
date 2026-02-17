import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Code, Eye, CheckCircle, Recycle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function EmbedForm() {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: '', phone: '', address: '', area: '', category: '', estimatedKg: '', notes: '',
  });

  const embedCode = `<iframe src="${window.location.origin}/embed-form" width="100%" height="700" frameborder="0" style="border: none; border-radius: 12px;"></iframe>`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    toast({ title: 'Lead Created!', description: `New lead from ${form.name} (Source: Website)` });
  };

  const resetForm = () => {
    setForm({ name: '', phone: '', address: '', area: '', category: '', estimatedKg: '', notes: '' });
    setSubmitted(false);
  };

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Embedded Pickup Form</h1>
        <p className="text-sm text-muted-foreground">Public form for lead capture. Embed on your website.</p>
      </div>

      <Tabs defaultValue="preview">
        <TabsList>
          <TabsTrigger value="preview" className="gap-1.5"><Eye className="h-4 w-4" /> Preview</TabsTrigger>
          <TabsTrigger value="embed" className="gap-1.5"><Code className="h-4 w-4" /> Embed Code</TabsTrigger>
        </TabsList>

        <TabsContent value="preview" className="mt-4">
          <div className="mx-auto max-w-lg">
            <Card className="border-2 border-primary/20">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <img src="/logo.png" alt="Logo" className="h-10 w-10 object-contain" />
                </div>
                <CardTitle>Pickup Request — Remind Indonesia</CardTitle>
                <CardDescription>Schedule a free e-waste pickup. We'll contact you via WhatsApp.</CardDescription>
              </CardHeader>
              <CardContent>
                {submitted ? (
                  <div className="py-8 text-center">
                    <CheckCircle className="mx-auto h-16 w-16 text-success" />
                    <h3 className="mt-4 text-xl font-bold">Thank you!</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      We've received your request. Our team will contact you shortly via WhatsApp.
                    </p>
                    <Button className="mt-4" variant="outline" onClick={resetForm}>Submit another</Button>
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
                          <SelectItem value="electronics">Electronics (laptops, phones, tablets)</SelectItem>
                          <SelectItem value="appliances">Home Appliances (TV, fridge, AC)</SelectItem>
                          <SelectItem value="office">Office Equipment (printers, servers)</SelectItem>
                          <SelectItem value="batteries">Batteries & UPS</SelectItem>
                          <SelectItem value="mixed">Mixed E-Waste</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Estimated Weight (kg)</Label>
                      <Input type="number" value={form.estimatedKg} onChange={(e) => setForm({ ...form, estimatedKg: e.target.value })} placeholder="e.g. 10" />
                    </div>
                    <div className="space-y-2">
                      <Label>Additional Notes</Label>
                      <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Any details about your e-waste..." rows={3} />
                    </div>
                    <Button type="submit" className="w-full">
                      Submit Pickup Request
                    </Button>
                    <p className="text-center text-xs text-muted-foreground">
                      By submitting, you agree to be contacted by Remind Indonesia via WhatsApp.
                    </p>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="embed" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Embed Code</CardTitle>
              <CardDescription>Copy and paste this code into your website to embed the pickup form.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg bg-muted p-4">
                <code className="block whitespace-pre-wrap break-all font-mono text-xs text-foreground">
                  {embedCode}
                </code>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(embedCode);
                  toast({ title: 'Copied!', description: 'Embed code copied to clipboard.' });
                }}
              >
                Copy Embed Code
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
