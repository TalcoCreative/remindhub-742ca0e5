import { useState, useRef, useEffect, useMemo } from 'react';
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
  CheckCircle2, MessageCircle, Filter, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { statusLabels, statusColors, quickReplies, type LeadStatus } from '@/data/dummy';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Tables } from '@/integrations/supabase/types';
import { useTeamMembers } from '@/hooks/useTeamMembers';

type DbChat = Tables<'chats'>;
type DbMessage = Tables<'messages'>;

const statusOptions: LeadStatus[] = ['new', 'not_followed_up', 'followed_up', 'in_progress', 'picked_up', 'sign_contract', 'completed', 'lost'];

export default function WhatsAppInbox() {
  const qc = useQueryClient();
  const { data: picList = [] } = useTeamMembers();
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [reply, setReply] = useState('');
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPic, setFilterPic] = useState<string>('all');
  const [filterAnswered, setFilterAnswered] = useState<string>('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: chats = [], isLoading } = useQuery({
    queryKey: ['chats'],
    queryFn: async () => {
      const { data, error } = await supabase.from('chats').select('*').order('last_timestamp', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['messages', selectedChatId],
    enabled: !!selectedChatId,
    queryFn: async () => {
      const { data, error } = await supabase.from('messages').select('*').eq('chat_id', selectedChatId!).order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const selectedChat = chats.find((c) => c.id === selectedChatId) ?? null;

  const isAnswered = (chat: DbChat, msgs?: DbMessage[]) => {
    if (msgs && msgs.length > 0) return msgs[msgs.length - 1].sender === 'agent';
    return chat.unread === 0;
  };

  const filteredChats = useMemo(() => {
    return chats.filter((c) => {
      if (search && !c.contact_name.toLowerCase().includes(search.toLowerCase()) && !(c.last_message ?? '').toLowerCase().includes(search.toLowerCase())) return false;
      if (filterStatus !== 'all' && c.status !== filterStatus) return false;
      if (filterPic !== 'all' && (c.assigned_pic ?? '') !== filterPic) return false;
      if (filterAnswered === 'answered' && !isAnswered(c)) return false;
      if (filterAnswered === 'unanswered' && isAnswered(c)) return false;
      return true;
    });
  }, [chats, search, filterStatus, filterPic, filterAnswered]);

  const hasActiveFilter = filterStatus !== 'all' || filterPic !== 'all' || filterAnswered !== 'all';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const sendMessage = useMutation({
    mutationFn: async ({ chatId, text }: { chatId: string; text: string }) => {
      const { error } = await supabase.from('messages').insert({ chat_id: chatId, text, sender: 'agent' });
      if (error) throw error;
      await supabase.from('chats').update({ last_message: text, last_timestamp: new Date().toISOString(), unread: 0 }).eq('id', chatId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['messages', selectedChatId] });
      qc.invalidateQueries({ queryKey: ['chats'] });
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
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Chat List */}
      <div className={cn(
        'w-full border-r border-border bg-card sm:w-72 lg:w-80 flex-shrink-0',
        selectedChatId ? 'hidden sm:flex sm:flex-col' : 'flex flex-col',
      )}>
        <div className="border-b border-border p-2.5">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Inbox</h2>
            <Badge variant="secondary" className="ml-auto text-[10px] h-5">{filteredChats.length}/{chats.length}</Badge>
            <Button variant={hasActiveFilter ? 'default' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="relative mt-1.5">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 pl-8 text-xs" />
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="mt-2 space-y-1.5 rounded-md border border-border bg-muted/50 p-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase text-muted-foreground">Filters</span>
                {hasActiveFilter && (
                  <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1.5" onClick={() => { setFilterStatus('all'); setFilterPic('all'); setFilterAnswered('all'); }}>
                    <X className="h-3 w-3 mr-0.5" /> Reset
                  </Button>
                )}
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {statusOptions.map((s) => (
                    <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterPic} onValueChange={setFilterPic}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue placeholder="PIC" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All PIC</SelectItem>
                  {picList.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterAnswered} onValueChange={setFilterAnswered}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue placeholder="Response" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="answered">Answered</SelectItem>
                  <SelectItem value="unanswered">Unanswered</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <ScrollArea className="flex-1">
          {filteredChats.length === 0 && (
            <div className="p-4 text-center text-xs text-muted-foreground">No chats match filters</div>
          )}
          {filteredChats.map((chat) => {
            const answered = isAnswered(chat);
            return (
              <ContextMenu key={chat.id}>
                <ContextMenuTrigger>
                  <div
                    className={cn(
                      'flex cursor-pointer gap-2.5 border-b border-border px-2.5 py-2 transition-colors hover:bg-muted/50',
                      selectedChatId === chat.id && 'bg-accent',
                    )}
                    onClick={() => setSelectedChatId(chat.id)}
                  >
                    <div className="relative">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <User className="h-4 w-4" />
                      </div>
                      <div className={cn('absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card', answered ? 'bg-success' : 'bg-warning')} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="truncate text-xs font-semibold">{chat.contact_name}</p>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {chat.last_timestamp ? new Date(chat.last_timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                      <p className="truncate text-[11px] text-muted-foreground leading-tight">{chat.last_message}</p>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <span className={cn('rounded-full px-1.5 py-0.5 text-[9px] font-medium leading-none', statusColors[chat.status as LeadStatus] ?? 'bg-muted text-muted-foreground')}>
                          {statusLabels[chat.status as LeadStatus] ?? chat.status}
                        </span>
                        {!answered && (
                          <span className="flex items-center gap-0.5 text-[9px] text-warning font-medium">
                            <MessageCircle className="h-2.5 w-2.5" />
                          </span>
                        )}
                        {chat.unread > 0 && (
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                            {chat.unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-52">
                  <ContextMenuSub>
                    <ContextMenuSubTrigger>Set Status</ContextMenuSubTrigger>
                    <ContextMenuSubContent>
                      {statusOptions.map((s) => (
                        <ContextMenuItem key={s} onClick={() => updateChatStatus.mutate({ chatId: chat.id, status: s, leadId: chat.lead_id })}>
                          <span className={cn('mr-2 h-2 w-2 rounded-full', statusColors[s]?.split(' ')[0])} />
                          {statusLabels[s]}
                          {chat.status === s && <CheckCircle2 className="ml-auto h-3 w-3 text-primary" />}
                        </ContextMenuItem>
                      ))}
                    </ContextMenuSubContent>
                  </ContextMenuSub>
                  <ContextMenuSeparator />
                  <ContextMenuSub>
                    <ContextMenuSubTrigger>Assign PIC</ContextMenuSubTrigger>
                    <ContextMenuSubContent>
                      {picList.map((pic) => (
                        <ContextMenuItem key={pic} onClick={() => assignPic.mutate({ chatId: chat.id, pic, leadId: chat.lead_id })}>
                          {pic}
                          {chat.assigned_pic === pic && <CheckCircle2 className="ml-auto h-3 w-3 text-primary" />}
                        </ContextMenuItem>
                      ))}
                    </ContextMenuSubContent>
                  </ContextMenuSub>
                </ContextMenuContent>
              </ContextMenu>
            );
          })}
        </ScrollArea>
      </div>

      {/* Chat Detail */}
      {selectedChat ? (
        <div className={cn('flex flex-1 flex-col min-w-0', !selectedChatId && 'hidden sm:flex')}>
          <div className="flex items-center gap-2.5 border-b border-border bg-card px-3 py-2">
            <Button variant="ghost" size="icon" className="h-7 w-7 sm:hidden" onClick={() => setSelectedChatId(null)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="relative">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                <User className="h-4 w-4" />
              </div>
              <div className={cn('absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card', isAnswered(selectedChat, messages) ? 'bg-success' : 'bg-warning')} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{selectedChat.contact_name}</p>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Phone className="h-3 w-3" /> +{selectedChat.contact_phone}
              </p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', statusColors[selectedChat.status as LeadStatus] ?? 'bg-muted text-muted-foreground')}>
                {statusLabels[selectedChat.status as LeadStatus] ?? selectedChat.status}
              </span>
              {selectedChat.assigned_pic && <Badge variant="outline" className="text-[10px] h-5">{selectedChat.assigned_pic}</Badge>}
              {!isAnswered(selectedChat, messages) && <Badge variant="secondary" className="text-[10px] h-5 text-warning border-warning">Unanswered</Badge>}
            </div>
          </div>

          <ScrollArea className="flex-1 bg-muted/30 p-3">
            <div className="mx-auto max-w-2xl space-y-2">
              {messages.map((msg) => (
                <div key={msg.id} className={cn('flex', msg.sender === 'agent' ? 'justify-end' : 'justify-start')}>
                  <div className={cn(
                    'max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm',
                    msg.sender === 'agent'
                      ? 'rounded-br-md bg-primary text-primary-foreground'
                      : 'rounded-bl-md bg-card text-card-foreground border border-border',
                  )}>
                    <p className="text-[13px]">{msg.text}</p>
                    <p className={cn('mt-0.5 text-[10px]', msg.sender === 'agent' ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                      {new Date(msg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {showQuickReplies && (
            <div className="border-t border-border bg-card p-1.5">
              <div className="flex flex-wrap gap-1">
                {quickReplies.map((qr, i) => (
                  <button key={i} className="rounded-full border border-border bg-secondary px-2.5 py-1 text-[11px] text-secondary-foreground transition-colors hover:bg-accent"
                    onClick={() => { setReply(qr); setShowQuickReplies(false); }}>
                    {qr.length > 40 ? qr.slice(0, 40) + '...' : qr}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-border bg-card p-2">
            <div className="flex items-end gap-1.5">
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" title="Attach file"><Paperclip className="h-3.5 w-3.5" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" title="Quick replies" onClick={() => setShowQuickReplies(!showQuickReplies)}><Zap className="h-3.5 w-3.5" /></Button>
              <Textarea
                placeholder="Type a message..."
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                className="min-h-[36px] max-h-[100px] resize-none text-sm"
                rows={1}
              />
              <Button size="icon" className="h-8 w-8 shrink-0" onClick={handleSend} disabled={!reply.trim() || sendMessage.isPending}>
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="hidden flex-1 items-center justify-center bg-muted/20 sm:flex">
          <div className="text-center">
            <MessageSquare className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-2 text-sm font-medium text-muted-foreground">Select a conversation</p>
            <p className="text-xs text-muted-foreground">Right-click a chat for quick actions</p>
          </div>
        </div>
      )}
    </div>
  );
}