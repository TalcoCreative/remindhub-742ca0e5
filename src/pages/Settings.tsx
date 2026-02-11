import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Wifi, WifiOff, Key, Globe, Shield, UserPlus, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';

export default function Settings() {
  const { toast } = useToast();
  const { session } = useAuth();
  const [liveMode, setLiveMode] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [secret, setSecret] = useState('');
  const [webhookUrl] = useState('https://remindhub.app/api/webhook/qontak');
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', password: '', display_name: '', role: 'operator' });
  const [inviting, setInviting] = useState(false);

  // Check if current user is admin
  const { data: isAdmin } = useQuery({
    queryKey: ['is-admin'],
    queryFn: async () => {
      const { data } = await supabase.from('user_roles').select('role').eq('user_id', session?.user?.id ?? '');
      return data?.some((r) => r.role === 'admin') ?? false;
    },
    enabled: !!session?.user?.id,
  });

  const handleInvite = async () => {
    if (!inviteForm.email || !inviteForm.password) return;
    setInviting(true);
    try {
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: inviteForm,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: 'User Created', description: `${inviteForm.email} has been added.` });
      setShowInvite(false);
      setInviteForm({ email: '', password: '', display_name: '', role: 'operator' });
    } catch (err: unknown) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
    }
    setInviting(false);
  };

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Configure RemindHub integrations and preferences</p>
      </div>

      <Tabs defaultValue="whatsapp">
        <TabsList>
          <TabsTrigger value="whatsapp">WhatsApp Integration</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
        </TabsList>

        <TabsContent value="whatsapp" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                {liveMode ? <Wifi className="h-4 w-4 text-success" /> : <WifiOff className="h-4 w-4 text-warning" />}
                API Mode
              </CardTitle>
              <CardDescription>Switch between Dummy Mode and Live API Mode (Qontak Mekari).</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <Switch checked={liveMode} onCheckedChange={setLiveMode} id="api-mode" />
                  <Label htmlFor="api-mode">{liveMode ? 'Live API Mode' : 'Dummy Mode'}</Label>
                </div>
                <Badge variant={liveMode ? 'default' : 'secondary'}>{liveMode ? 'Connected' : 'Simulated'}</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className={!liveMode ? 'opacity-60 pointer-events-none' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Key className="h-4 w-4 text-primary" /> Qontak Mekari Credentials</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input placeholder="qontak_api_key_xxxxx" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>API Secret</Label>
                <Input type="password" placeholder="••••••••" value={secret} onChange={(e) => setSecret(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Webhook URL</Label>
                <div className="flex items-center gap-2">
                  <Input readOnly value={webhookUrl} className="font-mono text-xs" />
                  <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(webhookUrl)}>Copy</Button>
                </div>
              </div>
              <Button disabled={!apiKey || !secret}>Save & Connect</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Globe className="h-4 w-4 text-primary" /> Provider Abstraction</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Currently configured for <strong>Qontak Mekari</strong>. Future providers can be added without UI changes.</p>
              <div className="mt-3 flex gap-2">
                <Badge>Qontak Mekari</Badge>
                <Badge variant="outline">Meta WABA (Future)</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Shield className="h-4 w-4 text-primary" /> Roles & Permissions</CardTitle>
              <CardDescription>Manage team members and their access levels.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {[
                  { role: 'Admin', desc: 'Full access to all modules, settings, and user management.' },
                  { role: 'Operator', desc: 'Access to inbox, leads, and operations. Cannot change settings.' },
                  { role: 'Viewer', desc: 'Read-only access to dashboard and reports.' },
                ].map((r) => (
                  <div key={r.role} className="flex items-start gap-3 rounded-lg border border-border p-3">
                    <Badge variant="secondary">{r.role}</Badge>
                    <p className="text-sm text-muted-foreground">{r.desc}</p>
                  </div>
                ))}
              </div>

              {isAdmin && (
                <Button className="gap-1.5" onClick={() => setShowInvite(true)}>
                  <UserPlus className="h-4 w-4" /> Add New User
                </Button>
              )}
              {!isAdmin && (
                <p className="text-sm text-muted-foreground">Only admins can add new users.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Invite User Dialog */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add New User</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Display Name</Label>
              <Input value={inviteForm.display_name} onChange={(e) => setInviteForm({ ...inviteForm, display_name: e.target.value })} placeholder="John Doe" />
            </div>
            <div className="space-y-1">
              <Label>Email *</Label>
              <Input type="email" required value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} placeholder="user@company.com" />
            </div>
            <div className="space-y-1">
              <Label>Password *</Label>
              <Input type="password" required minLength={6} value={inviteForm.password} onChange={(e) => setInviteForm({ ...inviteForm, password: e.target.value })} placeholder="Min 6 characters" />
            </div>
            <div className="space-y-1">
              <Label>Role</Label>
              <Select value={inviteForm.role} onValueChange={(v) => setInviteForm({ ...inviteForm, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="operator">Operator</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleInvite} disabled={inviting || !inviteForm.email || !inviteForm.password} className="w-full">
              {inviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create User
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
