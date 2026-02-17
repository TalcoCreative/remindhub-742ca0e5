import { useState, useRef, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSub,
  ContextMenuSubContent, ContextMenuSubTrigger, ContextMenuTrigger, ContextMenuSeparator,
} from '@/components/ui/context-menu';
import {
  Search, Send, Paperclip, MessageSquare, User, Phone, ArrowLeft, Zap, Loader2,
  CheckCircle2, MessageCircle, Filter, X, Plus, FileText
} from 'lucide-react';
import { useForms } from '@/hooks/useForms';
import { cn } from '@/lib/utils';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
  DialogTrigger, DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { statusLabels, statusColors, quickReplies, type LeadStatus } from '@/data/dummy';
import { channelLabels, channelColors, channelList, type Channel } from '@/data/channels';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Tables } from '@/integrations/supabase/types';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useAppMode } from '@/hooks/useAppMode';

type DbChat = Tables<'chats'>;
type DbMessage = Tables<'messages'>;

const statusOptions: LeadStatus[] = ['new', 'not_followed_up', 'followed_up', 'in_progress', 'picked_up', 'sign_contract', 'completed', 'lost'];

export default function Inbox() {
  const qc = useQueryClient();
  const { isLive } = useAppMode();
  const { data: picList = [] } = useTeamMembers();
  const [searchParams] = useSearchParams();
  const [selectedChatId, setSelectedChatId] = useState<string | null>(searchParams.get('chat'));
  const [search, setSearch] = useState('');
  const [reply, setReply] = useState('');
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPic, setFilterPic] = useState<string>('all');
  const [filterAnswered, setFilterAnswered] = useState<string>('all');
  const [filterChannel, setFilterChannel] = useState<string>('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // New Chat State
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [newChatPhone, setNewChatPhone] = useState('');
  const [newChatName, setNewChatName] = useState('');
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isTemplatesLoading, setIsTemplatesLoading] = useState(false);

  // Form Sending Logic
  const { data: forms = [] } = useForms();
  const [isFormSelectorOpen, setIsFormSelectorOpen] = useState(false);

  const handleSendForm = (form: any) => {
    if (!selectedChatId) return;
    const currentChat = chats.find(c => c.id === selectedChatId);
    if (!currentChat) return;

    // Construct personalized URL
    const baseUrl = window.location.origin;
    const params = new URLSearchParams({
      lead_id: currentChat.lead_id || '',
      name: currentChat.contact_name || '',
      phone: currentChat.contact_phone || '',
      source: 'whatsapp'
    });

    const formUrl = `${baseUrl}/form/${form.slug}?${params.toString()}`;
    const message = `Please fill out this form:\n${formUrl}`;

    sendMessage.mutate({ chatId: selectedChatId, text: message });

    // Auto-update status to 'followed_up' (Contacted)
    if (currentChat.status === 'new' || currentChat.status === 'not_followed_up') {
      updateChatStatus.mutate({
        chatId: selectedChatId,
        status: 'followed_up',
        leadId: currentChat.lead_id
      });
    }

    setIsFormSelectorOpen(false);
  };

  // Fetch Chats from Proxy
  const { data: chatsData, isLoading, refetch: refetchChats } = useQuery({
    queryKey: ['chats'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-chats', {
        body: { page: 1, limit: 50 }
      });
      if (error) throw error;
      return data?.data || [];
    },
    refetchInterval: 10000, // Poll every 10s for new messages/chats
  });

  const chats = chatsData || [];

  // Fetch Messages from Proxy
  const { data: messages = [], refetch: refetchMessages } = useQuery({
    queryKey: ['messages', selectedChatId],
    enabled: !!selectedChatId,
    queryFn: async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-messages', {
          body: { roomId: selectedChatId }
        });

        if (error) throw error;

        console.log("Inbox Messages Response (Live):", data);
        return data?.data || [];
      } catch (err) {
        console.warn("Live fetch failed, falling back to database:", err);
        // Fallback: Fetch from local DB

        // 1. Try to get chat_id from room_id
        let { data: chat } = await supabase.from('chats').select('id').eq('room_id', selectedChatId).maybeSingle();

        // 2. SELF-HEALING: If not found by room_id, try by Phone Number (from selectedChat list)
        if (!chat) {
          const currentChatInfo = chatsData?.find((c: any) => c.id === selectedChatId);
          if (currentChatInfo?.contact_phone) {
            // Remove non-numeric chars just in case, though Qontak usually gives clean IDs
            const phone = currentChatInfo.contact_phone.replace(/[^0-9]/g, '');

            const { data: chatByPhone } = await supabase.from('chats').select('id').eq('contact_phone', phone).maybeSingle();

            if (chatByPhone) {
              console.log("Found chat by phone, linking room_id...", selectedChatId);
              // Update the local chat with the correct room_id
              await supabase.from('chats').update({ room_id: selectedChatId }).eq('id', chatByPhone.id);
              chat = chatByPhone;
            }
          }
        }

        if (chat) {
          const { data: dbMessages } = await supabase
            .from('messages')
            .select('*')
            .eq('chat_id', chat.id)
            .order('created_at', { ascending: true }); // Oldest first for chat UI
          return dbMessages || [];
        }
        return [];
      }
    },
    // Poll for messages if chat is open
    refetchInterval: selectedChatId ? 5000 : false,
  });

  const selectedChat = chats.find((c) => c.id === selectedChatId) ?? null;

  const isAnswered = (chat: any) => chat.status === 'resolved'; // Proxy assumption

  const getResponseTime = (chat: any) => {
    // Not available in simple proxy yet
    return null;
  };

  const getChatChannel = (chat: any): Channel => {
    return (chat.channel as Channel) || 'whatsapp';
  };

  const filteredChats = useMemo(() => {
    return chats.filter((c) => {
      if (search && !c.contact_name.toLowerCase().includes(search.toLowerCase()) && !(c.last_message ?? '').toLowerCase().includes(search.toLowerCase())) return false;
      if (filterStatus !== 'all' && c.status !== filterStatus) return false;
      if (filterPic !== 'all' && (c.assigned_pic ?? '') !== filterPic) return false;
      if (filterAnswered === 'answered' && !isAnswered(c)) return false;
      if (filterAnswered === 'unanswered' && isAnswered(c)) return false;
      if (filterChannel !== 'all' && getChatChannel(c) !== filterChannel) return false;
      return true;
    });
  }, [chats, search, filterStatus, filterPic, filterAnswered, filterChannel]);

  const hasActiveFilter = filterStatus !== 'all' || filterPic !== 'all' || filterAnswered !== 'all' || filterChannel !== 'all';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Fetch Templates on Modal Open
  useEffect(() => {
    if (isNewChatOpen && templates.length === 0) {
      setIsTemplatesLoading(true);
      supabase.functions.invoke('get-templates')
        .then(({ data, error }) => {
          if (error) console.error("Error fetching templates:", error);
          else setTemplates(data?.data || []);
        })
        .finally(() => setIsTemplatesLoading(false));
    }
  }, [isNewChatOpen]);

  const startConversation = useMutation({
    mutationFn: async () => {
      if (!newChatPhone || !selectedTemplateId) throw new Error("Phone and Template are required");

      const { data, error } = await supabase.functions.invoke('start-conversation', {
        body: {
          phoneNumber: newChatPhone,
          name: newChatName,
          templateId: selectedTemplateId
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      setIsNewChatOpen(false);
      setNewChatPhone('');
      setNewChatName('');
      setSelectedTemplateId('');
      refetchChats();
      // Select the new chat if possible (needs ID from response)
    },
    onError: (err) => {
      console.error("Failed to start conversation:", err);
      // alert(`Failed to start conversation: ${err.message}`); // Removed alert for cleaner UX, maybe add Toast later
    }
  });

  // Realtime Subscription - Removed for Proxy Mode (Polling instead)
  // We can re-enable this if we want to listen to NEW events to trigger refetch
  // For now, simple polling is safer for "Direct Proxy" feel.

  const sendMessage = useMutation({
    mutationFn: async ({ chatId, text }: { chatId: string; text: string }) => {
      // Call Edge Function to send message via Qontak
      const { data, error } = await supabase.functions.invoke('send-message', {
        body: { roomId: chatId, text }, // Passing roomId as chatId
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      refetchMessages();
      refetchChats();
    },
  });

  const updateChatStatus = useMutation({
    mutationFn: async ({ chatId, status, leadId }: { chatId: string; status: string; leadId?: string | null }) => {
      const { error } = await supabase.from('chats').update({ status: status as DbChat['status'] }).eq('id', chatId);
      if (error) throw error;
      if (leadId) await supabase.from('leads').update({ status: status as DbChat['status'] }).eq('id', leadId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chats'] });
      qc.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  const assignPic = useMutation({
    mutationFn: async ({ chatId, pic, leadId }: { chatId: string; pic: string; leadId?: string | null }) => {
      await supabase.from('chats').update({ assigned_pic: pic }).eq('id', chatId);
      if (leadId) await supabase.from('leads').update({ assigned_pic: pic }).eq('id', leadId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chats'] });
      qc.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  const handleSend = () => {
    if (!reply.trim() || !selectedChatId) return;
    sendMessage.mutate({ chatId: selectedChatId, text: reply.trim() });
    setReply('');
    setShowQuickReplies(false);
  };

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-gradient-to-br from-background via-accent/20 to-background">
      {/* Chat List Sidebar */}
      <div className={cn(
        'w-full border-r border-border/50 glass-sidebar sm:w-80 lg:w-96 flex-shrink-0 flex flex-col transition-all duration-300',
        selectedChatId ? 'hidden sm:flex' : 'flex',
      )}>

        {/* Header */}
        <div className="p-4 pb-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold gradient-text tracking-tight">Inbox</h2>
            <div className="flex gap-2">
              <Dialog open={isNewChatOpen} onOpenChange={setIsNewChatOpen}>
                <DialogTrigger asChild>
                  <Button size="icon" className="h-8 w-8 rounded-full bg-primary/20 text-primary hover:bg-primary hover:text-white transition-colors shadow-sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="glass border-0 sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="gradient-text">Start New Conversation</DialogTitle>
                    <DialogDescription>
                      Enter the phone number and select a template to start a chat outside the 24h window.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number (e.g., 62812...)</Label>
                      <Input id="phone" placeholder="628123456789" value={newChatPhone} onChange={(e) => setNewChatPhone(e.target.value.replace(/\D/g, ''))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="name">Contact Name (Optional)</Label>
                      <Input id="name" placeholder="John Doe" value={newChatName} onChange={(e) => setNewChatName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="template">Select Template</Label>
                      <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                        <SelectTrigger id="template" className="w-full">
                          <SelectValue placeholder={isTemplatesLoading ? "Loading templates..." : "Choose a template"} />
                        </SelectTrigger>
                        <SelectContent>
                          {templates.map((t: any) => (
                            <SelectItem key={t.id} value={t.id}>{t.name} ({t.category})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsNewChatOpen(false)}>Cancel</Button>
                    <Button onClick={() => startConversation.mutate()} disabled={startConversation.isPending || !newChatPhone || !selectedTemplateId}>
                      {startConversation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                      Start Chat
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {isLive && <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 backdrop-blur-sm shadow-none hover:bg-emerald-500/20">LIVE SYNC</Badge>}
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/10" onClick={() => setShowFilters(!showFilters)}>
                <Filter className={cn("h-4 w-4", hasActiveFilter ? "text-primary fill-primary/20" : "text-muted-foreground")} />
              </Button>
            </div>
          </div>

          <div className="relative group">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Search conversations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 pl-9 bg-background/50 border-border/50 focus:bg-background transition-all rounded-xl shadow-sm focus:ring-primary/20"
            />
          </div>

          {/* Filters Area */}
          <div className={cn("grid transition-all duration-300 ease-in-out gap-2 overflow-hidden", showFilters ? "grid-rows-[1fr] mt-3 opacity-100" : "grid-rows-[0fr] mt-0 opacity-0")}>
            <div className="min-h-0 space-y-2 p-3 rounded-xl bg-accent/30 border border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Active Filters</span>
                <Button variant="ghost" size="sm" className="h-5 text-[10px] px-2 hover:bg-destructive/10 hover:text-destructive" onClick={() => { setFilterStatus('all'); setFilterPic('all'); setFilterAnswered('all'); setFilterChannel('all'); }}>
                  Reset all
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Select value={filterChannel} onValueChange={setFilterChannel}>
                  <SelectTrigger className="h-8 text-xs bg-background/50 border-0 shadow-sm"><SelectValue placeholder="Channel" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Channels</SelectItem>
                    {channelList.map((ch) => <SelectItem key={ch} value={ch}>{channelLabels[ch]}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-8 text-xs bg-background/50 border-0 shadow-sm"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {statusOptions.map((s) => <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterPic} onValueChange={setFilterPic}>
                  <SelectTrigger className="h-8 text-xs bg-background/50 border-0 shadow-sm"><SelectValue placeholder="PIC" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All PIC</SelectItem>
                    {picList.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterAnswered} onValueChange={setFilterAnswered}>
                  <SelectTrigger className="h-8 text-xs bg-background/50 border-0 shadow-sm"><SelectValue placeholder="Response" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="answered">Answered</SelectItem>
                    <SelectItem value="unanswered">Unanswered</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Chat List Scroll Area */}
        <ScrollArea className="flex-1 px-2 no-scrollbar">
          {filteredChats.length === 0 && (
            <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground animate-in fade-in zoom-in-95 duration-300">
              <div className="h-12 w-12 rounded-full bg-accent/50 flex items-center justify-center mb-3">
                <MessageSquare className="h-6 w-6 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium">No conversations found</p>
              <p className="text-xs opacity-70 mt-1">Try adjusting your filters</p>
            </div>
          )}
          <div className="space-y-1 pb-4">
            {filteredChats.map((chat) => {
              const answered = isAnswered(chat);
              const channel = getChatChannel(chat);
              const isSelected = selectedChatId === chat.id;

              return (
                <ContextMenu key={chat.id}>
                  <ContextMenuTrigger>
                    <div
                      role="button"
                      className={cn(
                        'group relative mx-1 p-3 rounded-xl transition-all duration-200 cursor-pointer border border-transparent',
                        isSelected
                          ? 'bg-primary/10 border-primary/10 shadow-sm'
                          : 'hover:bg-white/60 dark:hover:bg-white/5 hover:shadow-sm hover:border-border/30',
                      )}
                      onClick={() => setSelectedChatId(chat.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative shrink-0">
                          <div className={cn(
                            "flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold transition-transform duration-300 group-hover:scale-105 shadow-sm",
                            isSelected ? "bg-gradient-to-br from-primary to-teal-400 text-white" : "bg-accent text-accent-foreground"
                          )}>
                            {chat.contact_name.charAt(0).toUpperCase()}
                          </div>
                          {channel === 'whatsapp' && (
                            <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-white dark:bg-black p-0.5 shadow-sm">
                              <div className="h-full w-full rounded-full bg-[#25D366] flex items-center justify-center">
                                <Phone className="h-2.5 w-2.5 text-white fill-current" />
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <h3 className={cn("text-sm font-semibold truncate", isSelected ? "text-primary" : "text-foreground")}>
                              {chat.contact_name}
                            </h3>
                            <span className="text-[10px] text-muted-foreground tabular-nums whitespace-nowrap ml-2">
                              {chat.last_timestamp ? new Date(chat.last_timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </div>

                          <p className={cn("text-xs truncate leading-normal line-clamp-1", chat.unread > 0 ? "font-semibold text-foreground" : "text-muted-foreground")}>
                            {chat.last_message || <span className="italic opacity-50">No messages yet</span>}
                          </p>

                          <div className="flex items-center gap-1.5 pt-1">
                            <Badge variant="outline" className={cn("text-[9px] h-4 px-1.5 font-normal border-0", statusColors[chat.status as LeadStatus]?.replace('bg-', 'bg-') + '/20 text-foreground')}>
                              {statusLabels[chat.status as LeadStatus] ?? chat.status}
                            </Badge>
                            {!answered && (
                              <Badge variant="secondary" className="text-[9px] h-4 px-1.5 bg-warning/10 text-warning border-0">Need Reply</Badge>
                            )}
                            {chat.unread > 0 && (
                              <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[9px] font-bold text-white shadow-sm animate-pulse-slow">
                                {chat.unread}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Active Indicator Bar */}
                      {isSelected && <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 rounded-r-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]" />}
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent className="w-56 glass">
                    <ContextMenuSub>
                      <ContextMenuSubTrigger>Set Status</ContextMenuSubTrigger>
                      <ContextMenuSubContent className="glass">
                        {statusOptions.map((s) => (
                          <ContextMenuItem key={s} onClick={() => updateChatStatus.mutate({ chatId: chat.id, status: s, leadId: chat.lead_id })}>
                            <span className={cn('mr-2 h-2 w-2 rounded-full', statusColors[s]?.split(' ')[0])} />
                            {statusLabels[s]}
                            {chat.status === s && <CheckCircle2 className="ml-auto h-3 w-3 text-primary" />}
                          </ContextMenuItem>
                        ))}
                      </ContextMenuSubContent>
                    </ContextMenuSub>
                    <ContextMenuSeparator className="bg-border/50" />
                    <ContextMenuSub>
                      <ContextMenuSubTrigger>Assign PIC</ContextMenuSubTrigger>
                      <ContextMenuSubContent className="glass">
                        {picList.map((pic) => (
                          <ContextMenuItem key={pic} onClick={() => assignPic.mutate({ chatId: chat.id, pic, leadId: chat.lead_id })}>
                            <User className="mr-2 h-3.5 w-3.5 text-muted-foreground" /> {pic}
                            {chat.assigned_pic === pic && <CheckCircle2 className="ml-auto h-3 w-3 text-primary" />}
                          </ContextMenuItem>
                        ))}
                      </ContextMenuSubContent>
                    </ContextMenuSub>
                  </ContextMenuContent>
                </ContextMenu>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Conversation Area */}
      {selectedChat ? (
        <div className="flex flex-1 flex-col min-w-0 bg-white/50 dark:bg-black/20 backdrop-blur-sm relative">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)', backgroundSize: '24px 24px' }} />

          {/* Chat Header */}
          <div className="relative z-10 flex items-center gap-3 border-b border-border/40 bg-white/60 dark:bg-black/60 backdrop-blur-md px-4 py-3 shadow-sm">
            <Button variant="ghost" size="icon" className="h-8 w-8 sm:hidden -ml-2" onClick={() => setSelectedChatId(null)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>

            <div className="relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-primary to-teal-500 text-white font-bold text-lg shadow-md">
                {selectedChat.contact_name.charAt(0).toUpperCase()}
              </div>
              <div className={cn('absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white dark:border-black shadow-sm', isAnswered(selectedChat) ? 'bg-emerald-500' : 'bg-amber-500')} />
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-sm sm:text-base font-bold leading-none truncate">{selectedChat.contact_name}</h3>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                <span className="flex items-center gap-0.5"><Phone className="h-2.5 w-2.5" /> +{selectedChat.contact_phone}</span>
                <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                <span className="uppercase tracking-wider font-semibold text-[9px] text-primary/80">{getChatChannel(selectedChat)}</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              {selectedChat.assigned_pic && (
                <div className="flex items-center gap-1.5 bg-accent/50 rounded-full pl-1 pr-2.5 py-0.5 border border-border/50">
                  <div className="h-5 w-5 rounded-full bg-background flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                    {selectedChat.assigned_pic.charAt(0)}
                  </div>
                  <span className="text-[10px] font-medium">{selectedChat.assigned_pic}</span>
                </div>
              )}
              <Badge variant={isAnswered(selectedChat) ? "default" : "destructive"} className="h-6 px-2.5 shadow-sm text-[10px]">
                {statusLabels[selectedChat.status as LeadStatus]}
              </Badge>
            </div>
          </div>

          {/* Messages Area */}
          <ScrollArea className="flex-1 p-4 bg-transparent relative z-0">
            <div className="mx-auto max-w-3xl space-y-4 py-4">
              {messages.map((msg, idx) => {
                const isAgent = msg.sender === 'agent';
                // Check if previous message was from same sender to stack bubbles
                const isSequence = idx > 0 && messages[idx - 1].sender === msg.sender;

                return (
                  <div key={msg.id} className={cn('flex w-full animation-in slide-in-from-bottom-2 duration-500', isAgent ? 'justify-end' : 'justify-start')}>
                    <div className={cn(
                      'relative max-w-[80%] px-4 py-2.5 text-sm shadow-sm transition-all hover:shadow-md',
                      isAgent
                        ? cn('bubble-agent', isSequence ? 'rounded-tr-sm mt-0.5' : 'rounded-tr-2xl rounded-tl-2xl rounded-bl-2xl')
                        : cn('bg-white dark:bg-card border border-border/50 text-foreground', isSequence ? 'rounded-tl-sm mt-0.5' : 'rounded-tr-2xl rounded-tl-2xl rounded-br-2xl')
                    )}>
                      <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                      <p className={cn(
                        'text-[9px] mt-1 text-right tabular-nums',
                        isAgent ? 'text-white/70' : 'text-muted-foreground/70'
                      )}>
                        {new Date(msg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        {isAgent && <CheckCircle2 className="h-2.5 w-2.5 inline ml-1 opacity-70" />}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="relative z-10 p-4 border-t border-border/40 bg-white/80 dark:bg-black/80 backdrop-blur-md">
            {showQuickReplies && (
              <div className="absolute bottom-full left-0 right-0 p-3 bg-background/95 backdrop-blur-md border-t border-border/50 animate-in slide-in-from-bottom-2">
                <div className="flex flex-wrap gap-2 justify-center">
                  {quickReplies.map((qr, i) => (
                    <button key={i} className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs text-primary transition-all hover:bg-primary hover:text-white"
                      onClick={() => { setReply(qr); setShowQuickReplies(false); }}>
                      {qr.length > 50 ? qr.slice(0, 50) + '...' : qr}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="max-w-4xl mx-auto flex items-end gap-2 bg-muted/30 p-1.5 rounded-3xl border border-border/50 focus-within:ring-2 ring-primary/20 ring-offset-2 transition-all">
              <Dialog open={isFormSelectorOpen} onOpenChange={setIsFormSelectorOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-muted-foreground hover:bg-background hover:text-primary">
                    <FileText className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="glass border-0 sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Send a Form</DialogTitle>
                    <DialogDescription>Select a form to send to <b>{selectedChat?.contact_name}</b>.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-2 py-4">
                    {forms.length === 0 ? (
                      <p className="text-center text-muted-foreground text-sm">No active forms found.</p>
                    ) : (
                      forms.filter((f: any) => f.is_active).map((form: any) => (
                        <Button key={form.id} variant="outline" className="justify-start gap-3 h-auto py-3 border-white/10 hover:bg-primary/10 hover:border-primary/30"
                          onClick={() => handleSendForm(form)}>
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="text-left">
                            <div className="font-semibold text-sm">{form.name}</div>
                            <div className="text-[10px] text-muted-foreground">/{form.slug}</div>
                          </div>
                        </Button>
                      ))
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-muted-foreground hover:bg-background hover:text-primary" onClick={() => setShowQuickReplies(!showQuickReplies)}>
                <Zap className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-muted-foreground hover:bg-background hover:text-primary">
                <Paperclip className="h-4 w-4" />
              </Button>

              <Textarea
                placeholder="Type a message..."
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                className="min-h-[36px] max-h-[120px] resize-none border-0 bg-transparent focus-visible:ring-0 px-2 py-2.5 text-sm"
                rows={1}
              />

              <Button size="icon" className={cn("h-9 w-9 rounded-full transition-all duration-300", reply.trim() ? "bg-primary shadow-lg scale-100" : "bg-muted text-muted-foreground shadow-none scale-90 opacity-70")} onClick={handleSend} disabled={!reply.trim() || sendMessage.isPending}>
                {sendMessage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 ml-0.5" />}
              </Button>
            </div>
            <p className="text-[10px] text-center text-muted-foreground/40 mt-2">Press Enter to send, Shift + Enter for new line</p>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="hidden flex-1 flex-col items-center justify-center bg-muted/10 backdrop-blur-sm sm:flex">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
            <div className="relative bg-card/50 p-6 rounded-2xl border border-white/20 shadow-2xl backdrop-blur-xl text-center max-w-sm mx-auto">
              <MessageSquare className="mx-auto h-16 w-16 text-primary mb-4" />
              <h3 className="text-lg font-bold gradient-text mb-2">Welcome to Inbox</h3>
              <p className="text-sm text-muted-foreground mb-6">Select a conversation from the sidebar to start chatting with your leads.</p>
              <div className="flex gap-2 justify-center">
                <Badge variant="outline" className="py-1 px-3 bg-background/50">Qontak Connected</Badge>
                <Badge variant="outline" className="py-1 px-3 bg-background/50">Real-time Sync</Badge>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
