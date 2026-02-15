import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Key, Globe, Shield, UserPlus, Loader2, Users, MoreHorizontal, Trash2, Copy, CheckCircle2, Webhook, AlertCircle, ToggleLeft } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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
    <div className="space-y-6 p-4 lg:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Configure RemindHub integrations and preferences</p>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp Integration</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base"><Users className="h-4 w-4 text-primary" /> Team Members</CardTitle>
                  <CardDescription>Manage users and their roles.</CardDescription>
                </div>
                {isAdmin && (
                  <Button size="sm" className="gap-1.5" onClick={() => setShowInvite(true)}>
                    <UserPlus className="h-4 w-4" /> Add User
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right">Leads</TableHead>
                      <TableHead className="text-right">Chats</TableHead>
                      {isAdmin && <TableHead className="w-10" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{u.display_name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">{u.user_id.slice(0, 8)}...</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={u.roles[0] === 'admin' ? 'default' : 'secondary'} className="capitalize">
                            {u.roles[0] || 'operator'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{u.leadsHandled}</TableCell>
                        <TableCell className="text-right">{u.chatsHandled}</TableCell>
                        {isAdmin && (
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                               <DropdownMenuContent align="end">
                                {['admin', 'operator', 'viewer'].map((role) => (
                                  <DropdownMenuItem key={role} onClick={() => updateRole.mutate({ userId: u.user_id, newRole: role })}>
                                    Set as <span className="ml-1 capitalize font-medium">{role}</span>
                                    {u.roles[0] === role && <span className="ml-auto text-primary">✓</span>}
                                  </DropdownMenuItem>
                                ))}
                                {u.user_id !== session?.user?.id && (
                                  <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteTarget({ id: u.user_id, name: u.display_name || 'this user' })}>
                                    <Trash2 className="h-4 w-4 mr-1" /> Delete User
                                  </DropdownMenuItem>
                                )}
                               </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                    {users.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No users found.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Shield className="h-4 w-4 text-primary" /> Role Definitions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="whatsapp" className="mt-4 space-y-4">
          {/* Mode Toggle Card */}
          <Card className={isLive ? 'border-green-500/50 bg-green-500/5' : 'border-blue-500/30 bg-blue-500/5'}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ToggleLeft className="h-4 w-4" />
                    Mode: {isLive ? (
                      <Badge className="bg-green-600 hover:bg-green-700 text-white">🟢 LIVE</Badge>
                    ) : (
                      <Badge variant="secondary">🔵 DUMMY</Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {isLive
                      ? 'Terhubung ke Mekari Qontak API. Semua data real-time.'
                      : 'Mode dummy aktif. Data tidak terhubung ke API Qontak.'
                    }
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {(validating || switchingLive) && <Loader2 className="h-4 w-4 animate-spin" />}
                  <Switch
                    checked={isLive}
                    onCheckedChange={handleToggleMode}
                    disabled={switchingLive || settingsLoading}
                  />
                </div>
              </div>
            </CardHeader>
            {!savedToken && !isLive && (
              <CardContent className="pt-0">
                <div className="flex items-center gap-2 rounded-md bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  Simpan Token Qontak terlebih dahulu untuk bisa switch ke Live mode.
                </div>
              </CardContent>
            )}
          </Card>

          {/* Webhook URL */}
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Webhook className="h-4 w-4 text-primary" /> Webhook URL
              </CardTitle>
              <CardDescription>
                Paste URL ini di Mekari Qontak → Settings → Message Interactions → Webhook URL.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Input readOnly value={WEBHOOK_URL} className="font-mono text-xs bg-muted" />
                <Button variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={handleCopyWebhook}>
                  {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Aktifkan event: <code className="rounded bg-muted px-1">receive_message_from_customer</code> dan <code className="rounded bg-muted px-1">receive_message_from_agent</code>
              </p>
            </CardContent>
          </Card>

          {/* Qontak Credentials */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Key className="h-4 w-4 text-primary" /> Qontak Credentials
              </CardTitle>
              <CardDescription>
                Dapatkan Token dari Mekari Qontak → Settings → API → Access Token. 
                Token ini digunakan untuk mengirim pesan outbound dan validasi koneksi.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Token <span className="text-destructive">*</span></Label>
                <Input
                  type="password"
                  placeholder="Paste token dari Qontak"
                  value={qontakToken}
                  onChange={(e) => setQontakToken(e.target.value)}
                />
                {savedToken && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Token tersimpan
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Refresh Token</Label>
                <Input
                  type="password"
                  placeholder="Paste refresh token dari Qontak (opsional)"
                  value={qontakRefreshToken}
                  onChange={(e) => setQontakRefreshToken(e.target.value)}
                />
                {savedRefreshToken && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Refresh token tersimpan
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  disabled={!qontakToken || saving}
                  onClick={handleSaveCredentials}
                  className="gap-1.5"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Credentials
                </Button>
                {savedToken && (
                  <Button
                    variant="outline"
                    disabled={validating}
                    onClick={async () => {
                      setValidating(true);
                      try {
                        const { data, error } = await supabase.functions.invoke('validate-qontak', {
                          body: { token: savedToken },
                        });
                        if (error) throw error;
                        if (data?.valid) {
                          toast({ title: '✅ Token Valid', description: 'Koneksi ke Qontak berhasil.' });
                        } else {
                          toast({ title: '❌ Token Invalid', description: data?.error || 'Token tidak valid.', variant: 'destructive' });
                        }
                      } catch (err: any) {
                        toast({ title: 'Error', description: err.message, variant: 'destructive' });
                      }
                      setValidating(false);
                    }}
                    className="gap-1.5"
                  >
                    {validating && <Loader2 className="h-4 w-4 animate-spin" />}
                    Test Connection
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Provider Support */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Globe className="h-4 w-4 text-primary" /> Provider Support</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Webhook otomatis mendeteksi format payload dari:</p>
              <div className="mt-3 flex gap-2 flex-wrap">
                <Badge>Mekari Qontak</Badge>
                <Badge variant="outline">Meta WABA</Badge>
                <Badge variant="outline">Custom JSON</Badge>
              </div>
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

      {/* Delete User Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteTarget && deleteUser.mutate(deleteTarget.id)}>
              {deleteUser.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null} Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
