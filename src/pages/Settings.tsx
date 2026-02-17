import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  Key, Globe, Shield, UserPlus, Loader2, Users, MoreHorizontal, Trash2, Copy, CheckCircle2,
  Webhook, AlertCircle, ToggleLeft, Database, RefreshCw, Eye, EyeOff, Save, Info, AlertTriangle
} from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { seedDatabase } from '@/utils/seedData';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/whatsapp-webhook`;

export default function Settings() {
  const { toast } = useToast();
  const { session } = useAuth();
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', password: '', display_name: '', role: 'operator' });
  const [inviting, setInviting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  // Qontak credentials state
  const [qontakToken, setQontakToken] = useState('');
  const [qontakRefreshToken, setQontakRefreshToken] = useState('');
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);

  const [switchingLive, setSwitchingLive] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [channels, setChannels] = useState<any[]>([]);

  // Qontak OAuth State
  const [showQontakLogin, setShowQontakLogin] = useState(false);
  const [qontakLogin, setQontakLogin] = useState({ username: '', password: '', client_id: '', client_secret: '' });
  const [loggingIn, setLoggingIn] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);

  const handleSeed = async () => {
    if (!confirm('This will insert dummy data into your database. Continue?')) return;
    setSeeding(true);
    await seedDatabase();
    setSeeding(false);
  };

  const { data: isAdmin } = useQuery({
    queryKey: ['is-admin'],
    queryFn: async () => {
      const { data } = await supabase.from('user_roles').select('role').eq('user_id', session?.user?.id ?? '');
      return data?.some((r) => r.role === 'admin') ?? false;
    },
    enabled: !!session?.user?.id,
  });

  // Fetch app settings
  const { data: appSettings = [], isLoading: settingsLoading } = useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('app_settings').select('*');
      if (error) throw error;
      return data || [];
    },
  });

  const getSetting = (key: string) => appSettings.find((s: any) => s.key === key)?.value || '';
  const qontakMode = getSetting('qontak_mode') || 'dummy';
  const savedToken = getSetting('qontak_token');
  const savedRefreshToken = getSetting('qontak_refresh_token');

  // Load saved values into form
  useEffect(() => {
    if (savedToken && !qontakToken) setQontakToken(savedToken);
    if (savedRefreshToken && !qontakRefreshToken) setQontakRefreshToken(savedRefreshToken);
  }, [savedToken, savedRefreshToken]);

  // Fetch all users
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['all-users'],
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data: profiles, error } = await supabase.from('profiles').select('*');
      if (error) throw error;
      const { data: roles } = await supabase.from('user_roles').select('*');
      const { data: leads } = await supabase.from('leads').select('assigned_pic');
      const { data: chats } = await supabase.from('chats').select('assigned_pic');

      return profiles.map((p) => {
        const userRoles = roles?.filter((r) => r.user_id === p.user_id) ?? [];
        const leadsHandled = leads?.filter((l) => l.assigned_pic === p.display_name).length ?? 0;
        const chatsHandled = chats?.filter((c) => c.assigned_pic === p.display_name).length ?? 0;
        return { ...p, roles: userRoles.map((r) => r.role), roleId: userRoles[0]?.id, leadsHandled, chatsHandled };
      });
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: string }) => {
      await supabase.from('user_roles').delete().eq('user_id', userId);
      const { error } = await supabase.from('user_roles').insert({ user_id: userId, role: newRole as 'admin' | 'operator' | 'viewer' });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-users'] });
      toast({ title: 'Role Updated' });
    },
  });

  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke('delete-user', { body: { user_id: userId } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-users'] });
      toast({ title: 'User Deleted' });
      setDeleteTarget(null);
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const handleInvite = async () => {
    if (!inviteForm.email || !inviteForm.password) return;
    setInviting(true);
    try {
      const { data, error } = await supabase.functions.invoke('invite-user', { body: inviteForm });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: 'User Created', description: `${inviteForm.email} has been added.` });
      setShowInvite(false);
      setInviteForm({ email: '', password: '', display_name: '', role: 'operator' });
      qc.invalidateQueries({ queryKey: ['all-users'] });
    } catch (err: unknown) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
    }
    setInviting(false);
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(WEBHOOK_URL);
    setCopied(true);
    toast({ title: 'Copied!', description: 'Webhook URL copied to clipboard.' });
    setTimeout(() => setCopied(false), 2000);
  };

  // Upsert a setting
  const upsertSetting = async (key: string, value: string) => {
    const existing = appSettings.find((s: any) => s.key === key);
    if (existing) {
      await supabase.from('app_settings').update({ value, updated_by: session?.user?.id }).eq('key', key);
    } else {
      await supabase.from('app_settings').insert({ key, value, updated_by: session?.user?.id });
    }
  };

  // Save credentials
  const handleSaveCredentials = async () => {
    if (!qontakToken) return;
    setSaving(true);
    try {
      await upsertSetting('qontak_token', qontakToken);
      await upsertSetting('qontak_refresh_token', qontakRefreshToken);
      qc.invalidateQueries({ queryKey: ['app-settings'] });
      toast({ title: 'Saved!', description: 'Credentials berhasil disimpan.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  const handleQontakLogin = async () => {
    if (!qontakLogin.username || !qontakLogin.password || !qontakLogin.client_id || !qontakLogin.client_secret) {
      toast({ title: 'Missing Fields', description: 'Please fill in all fields.', variant: 'destructive' });
      return;
    }

    setLoggingIn(true);
    try {
      const { data, error } = await supabase.functions.invoke('qontak-auth', {
        body: qontakLogin,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.access_token) {
        setQontakToken(data.access_token);
        if (data.refresh_token) setQontakRefreshToken(data.refresh_token);

        // Auto-save
        await upsertSetting('qontak_token', data.access_token);
        if (data.refresh_token) await upsertSetting('qontak_refresh_token', data.refresh_token);

        toast({ title: 'Login Successful', description: 'Tokens retrieved and saved.' });
        setShowQontakLogin(false);
        // Clear sensitive data
        setQontakLogin({ username: '', password: '', client_id: '', client_secret: '' });
        qc.invalidateQueries({ queryKey: ['app-settings'] });
      }
    } catch (err: any) {
      toast({ title: 'Login Failed', description: err.message, variant: 'destructive' });
    }
    setLoggingIn(false);
  };

  // Sync History
  const [syncing, setSyncing] = useState(false);
  const handleSyncQontak = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-qontak');
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: 'Sync Complete', description: `Synced ${data.synced} chats from Qontak.` });
    } catch (err: any) {
      toast({ title: 'Sync Failed', description: err.message, variant: 'destructive' });
    }
    setSyncing(false);
  };

  // Toggle mode (dummy <-> live)
  const handleToggleMode = async () => {
    const newMode = qontakMode === 'live' ? 'dummy' : 'live';

    // Switching to live → validate token first
    if (newMode === 'live') {
      if (!savedToken) {
        toast({ title: 'Token kosong', description: 'Simpan Token terlebih dahulu sebelum switch ke Live.', variant: 'destructive' });
        return;
      }

      setSwitchingLive(true);
      setValidating(true);
      try {
        const { data, error } = await supabase.functions.invoke('validate-qontak', {
          body: { token: savedToken },
        });

        if (error) throw error;

        if (!data?.valid) {
          toast({
            title: 'Token Invalid',
            description: data?.error || 'Token Qontak tidak valid. Pastikan token benar.',
            variant: 'destructive',
          });
          setValidating(false);
          setSwitchingLive(false);
          return;
        }

        toast({ title: 'Token Valid ✓', description: 'Berhasil terkoneksi ke Qontak.' });
      } catch (err: any) {
        toast({ title: 'Validasi Gagal', description: err.message, variant: 'destructive' });
        setValidating(false);
        setSwitchingLive(false);
        return;
      }
      setValidating(false);
    }

    try {
      await upsertSetting('qontak_mode', newMode);
      qc.invalidateQueries({ queryKey: ['app-settings'] });
      toast({
        title: newMode === 'live' ? '🟢 Live Mode' : '🔵 Dummy Mode',
        description: newMode === 'live' ? 'Semua data terhubung ke Qontak API.' : 'Mode dummy aktif, data tidak terhubung ke API.',
      });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setSwitchingLive(false);
  };

  const isLive = qontakMode === 'live';

  return (
    <div className="space-y-6 p-4 lg:p-8 bg-gradient-to-br from-background via-accent/10 to-background min-h-[calc(100vh-4rem)]">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight gradient-text">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your team, integrations, and system preferences.</p>
      </div>

      {/* Mode Toggle Card */}
      <Card className={cn("glass border-0 shadow-lg", isLive ? 'border-l-4 border-l-emerald-500' : 'border-l-4 border-l-blue-500')}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <ToggleLeft className="h-5 w-5 text-primary" />
                System Mode:
                {isLive ? (
                  <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white ml-2">LIVE</Badge>
                ) : (
                  <Badge variant="secondary" className="ml-2">DUMMY MODE</Badge>
                )}
              </CardTitle>
              <CardDescription className="mt-1 text-xs sm:text-sm">
                {isLive
                  ? 'Connected to Qontak API. Real-time data sync active.'
                  : 'Dummy mode active. No external API calls will be made.'
                }
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              {(validating || switchingLive) && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
              <Switch
                checked={isLive}
                onCheckedChange={handleToggleMode}
                disabled={switchingLive || settingsLoading}
                className="data-[state=checked]:bg-emerald-500"
              />
            </div>
          </div>
        </CardHeader>
        {!savedToken && !isLive && (
          <CardContent className="pt-0">
            <div className="flex items-center gap-2 rounded-md bg-amber-500/10 border border-amber-500/20 px-4 py-2.5 text-xs sm:text-sm text-amber-500">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Please save your Qontak Token before switching to Live Mode.</span>
            </div>
          </CardContent>
        )}
      </Card>

      <Tabs defaultValue="team" className="space-y-6">
        <TabsList className="glass p-1 border-0 bg-background/30 w-auto inline-flex">
          <TabsTrigger value="team" className="gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary transition-all">
            <Users className="h-4 w-4" /> Team
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary transition-all">
            <Globe className="h-4 w-4" /> Integrations
          </TabsTrigger>
          <TabsTrigger value="developer" className="gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary transition-all">
            <Database className="h-4 w-4" /> Developer
          </TabsTrigger>
        </TabsList>

        <TabsContent value="team" className="space-y-4 mt-0">
          <div className="flex justify-end">
            <Button onClick={() => setShowInvite(true)} className="gap-2 shadow-lg shadow-primary/20">
              <UserPlus className="h-4 w-4" /> Invite Member
            </Button>
          </div>

          <Card className="glass border-0 shadow-lg overflow-hidden">
            <CardHeader className="pb-4 border-b border-white/5">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-5 w-5 text-primary" /> Team Members
              </CardTitle>
              <CardDescription>Manage user roles and access.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {usersLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
              ) : (
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="hover:bg-transparent border-white/5">
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right">Activity</TableHead>
                      {isAdmin && <TableHead className="w-10" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id} className="hover:bg-primary/5 border-white/5 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs uppercase">
                              {u.display_name ? u.display_name.substring(0, 2) : 'U'}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{u.display_name || 'Unknown User'}</p>
                              <p className="text-xs text-muted-foreground">ID: {u.user_id.slice(0, 8)}...</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={u.roles[0] === 'admin' ? 'default' : 'secondary'} className={cn("capitalize", u.roles[0] === 'admin' ? "bg-primary/20 text-primary hover:bg-primary/30" : "")}>
                            {u.roles[0] || 'operator'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-xs text-muted-foreground">Leads: {u.leadsHandled}</span>
                            <span className="text-xs text-muted-foreground">Chats: {u.chatsHandled}</span>
                          </div>
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-background/80">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="glass border-0">
                                {['admin', 'operator', 'viewer'].map((role) => (
                                  <DropdownMenuItem key={role} onClick={() => updateRole.mutate({ userId: u.user_id, newRole: role })}>
                                    Set as <span className="ml-1 capitalize font-medium">{role}</span>
                                    {u.roles[0] === role && <span className="ml-auto text-primary">✓</span>}
                                  </DropdownMenuItem>
                                ))}
                                {u.user_id !== session?.user?.id && (
                                  <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onClick={() => setDeleteTarget({ id: u.user_id, name: u.display_name || 'this user' })}>
                                    <Trash2 className="h-4 w-4 mr-1" /> Delete User
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6 mt-0">
          <Alert className="glass bg-primary/5 border-primary/20 text-primary">
            <Info className="h-4 w-4" />
            <AlertTitle>Qontak Integration</AlertTitle>
            <AlertDescription className="text-xs opacity-90">
              Configure credentials to enable WhatsApp messaging.
              {savedToken && <span className="ml-2 font-bold text-emerald-500">● Token Saved</span>}
            </AlertDescription>
          </Alert>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="glass border-0 shadow-lg">
              <CardHeader className="pb-3 border-b border-white/5">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Key className="h-4 w-4 text-primary" /> Credentials
                    </CardTitle>
                    <CardDescription>Manually enter or login to get token.</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setShowQontakLogin(true)} className="h-8 text-xs glass bg-background/50">
                    Login to Qontak
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label className="text-xs">Access Token <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <Input
                      type={showSecrets ? "text" : "password"}
                      value={qontakToken}
                      onChange={(e) => setQontakToken(e.target.value)}
                      placeholder="Paste Qontak Access Token"
                      className="pr-10 bg-background/50 border-white/10 font-mono text-xs"
                    />
                    <button type="button" onClick={() => setShowSecrets(!showSecrets)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showSecrets ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Refresh Token</Label>
                  <Input
                    type={showSecrets ? "text" : "password"}
                    value={qontakRefreshToken}
                    onChange={(e) => setQontakRefreshToken(e.target.value)}
                    placeholder="Paste Qontak Refresh Token"
                    className="bg-background/50 border-white/10 font-mono text-xs"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button onClick={() => handleSaveCredentials()} disabled={saving || !qontakToken} className="flex-1 gap-2 shadow-md shadow-primary/20">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save
                  </Button>
                  <Button
                    variant="outline"
                    disabled={validating || !savedToken}
                    onClick={async () => {
                      setValidating(true);
                      try {
                        const { data, error } = await supabase.functions.invoke('validate-qontak', { body: { token: savedToken } });
                        if (error) throw error;
                        if (data?.valid) {
                          toast({ title: '✅ Valid', description: 'Token is active.' });
                          if (data.data?.data) setChannels(data.data.data);
                        } else {
                          toast({ title: '❌ Invalid', description: data?.error || 'Token invalid.', variant: 'destructive' });
                        }
                      } catch (err: any) {
                        toast({ title: 'Error', description: err.message, variant: 'destructive' });
                      }
                      setValidating(false);
                    }}
                    className="gap-2 glass bg-background/50"
                  >
                    {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Test
                  </Button>
                </div>

                {channels.length > 0 && (
                  <div className="rounded-lg border border-white/10 bg-black/20 p-3 mt-4 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Connected Channels</p>
                    {channels.map((c: any) => (
                      <div key={c.id} className="flex items-center justify-between text-xs">
                        <span className="font-mono">{c.settings?.phone_number || c.id}</span>
                        <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-500 border-green-500/20">Connected</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="glass border-0 shadow-lg">
                <CardHeader className="pb-3 border-b border-white/5">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Webhook className="h-4 w-4 text-primary" /> Webhook Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="rounded-lg bg-black/40 border border-white/10 p-3 space-y-2">
                    <Label className="text-xs text-muted-foreground">Your Webhook URL</Label>
                    <div className="flex items-center gap-2">
                      <Input readOnly value={WEBHOOK_URL} className="font-mono text-[10px] h-8 bg-transparent border-none text-green-400 focus-visible:ring-0 px-0" />
                      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 hover:bg-white/10" onClick={handleCopyWebhook}>
                        {copied ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Paste this URL in <strong>Mekari Qontak Settings</strong>.<br />
                    Enable events: <code className="text-primary">receive_message_from_customer</code>, <code className="text-primary">receive_message_from_agent</code>
                  </p>
                </CardContent>
              </Card>

              <Card className="glass border-0 shadow-lg bg-amber-500/5 border-l-4 border-l-amber-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-amber-500 flex items-center gap-2"><Database className="h-4 w-4" /> Data Sync</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground mb-3">Sync recent chats from Qontak to your local database.</p>
                  <Button variant="outline" size="sm" onClick={handleSyncQontak} disabled={syncing || !savedToken} className="w-full glass bg-background/50 hover:bg-background/80">
                    {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <RefreshCw className="h-3.5 w-3.5 mr-2" />}
                    Sync History
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="developer" className="mt-0">
          <Card className="glass border-0 shadow-lg border-l-4 border-l-destructive/50">
            <CardHeader className="pb-4 border-b border-white/5">
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" /> Developer Zone
              </CardTitle>
              <CardDescription>
                Advanced tools for system maintenance and debugging.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="rounded-xl border border-white/10 bg-background/40 p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="font-semibold text-sm">Seed Database</h3>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    Populate database with dummy leads, chats, and assignments.
                    Useful for testing UI without real data.
                  </p>
                </div>
                <Button variant="outline" onClick={handleSeed} disabled={seeding} className="gap-2 border-dashed border-white/20 hover:bg-primary/5 hover:text-primary">
                  {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                  Populate Data
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Invite Modal */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="glass border-0 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>Create a new user account.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input value={inviteForm.display_name} onChange={(e) => setInviteForm({ ...inviteForm, display_name: e.target.value })} className="bg-background/50 border-white/10" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} className="bg-background/50 border-white/10" />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input type="password" value={inviteForm.password} onChange={(e) => setInviteForm({ ...inviteForm, password: e.target.value })} className="bg-background/50 border-white/10" />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={inviteForm.role} onValueChange={(val) => setInviteForm({ ...inviteForm, role: val })}>
                <SelectTrigger className="bg-background/50 border-white/10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="operator">Operator</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvite(false)} className="glass bg-transparent">Cancel</Button>
            <Button onClick={handleInvite} disabled={inviting || !inviteForm.email} className="gap-2 shadow-lg shadow-primary/20">
              {inviting && <Loader2 className="h-4 w-4 animate-spin" />}
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Qontak Login Modal */}
      <Dialog open={showQontakLogin} onOpenChange={setShowQontakLogin}>
        <DialogContent className="glass border-0 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Login to Qontak</DialogTitle>
            <DialogDescription>Enter your credentials to generate an access token.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Email</Label>
              <Input value={qontakLogin.username} onChange={(e) => setQontakLogin({ ...qontakLogin, username: e.target.value })} className="bg-background/50 border-white/10" />
            </div>
            <div className="space-y-1">
              <Label>Password</Label>
              <Input type="password" value={qontakLogin.password} onChange={(e) => setQontakLogin({ ...qontakLogin, password: e.target.value })} className="bg-background/50 border-white/10" />
            </div>
            <div className="space-y-1">
              <Label>Client ID</Label>
              <Input value={qontakLogin.client_id} onChange={(e) => setQontakLogin({ ...qontakLogin, client_id: e.target.value })} className="bg-background/50 border-white/10" />
            </div>
            <div className="space-y-1">
              <Label>Client Secret</Label>
              <Input type="password" value={qontakLogin.client_secret} onChange={(e) => setQontakLogin({ ...qontakLogin, client_secret: e.target.value })} className="bg-background/50 border-white/10" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleQontakLogin} disabled={loggingIn} className="w-full gap-2 shadow-lg shadow-primary/20">
              {loggingIn && <Loader2 className="h-4 w-4 animate-spin" />} Get Token
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Alert */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="glass border-0">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2"><AlertTriangle className="h-5 w-5" /> Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="glass bg-transparent">Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-lg" onClick={() => deleteTarget && deleteUser.mutate(deleteTarget.id)}>
              {deleteUser.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null} Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
