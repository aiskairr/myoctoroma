import { useState, useEffect, useRef } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import { useBranch } from '@/contexts/BranchContext';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Search, Phone, Loader2, MessageCircle, AlertTriangle, User, Check, CheckCheck, Send, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiGetJson } from '@/lib/api';
import { format, isToday, isYesterday } from 'date-fns';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface WhatsAppChatItem {
  chatId: string | null;
  contactNumber: string;
  contactName: string | null;
  unreadCount: number;
  lastMessageTime: string;
  lastMessage: string;
  messagesCount: number;
}

interface ChatsListResponse {
  success: boolean;
  data: WhatsAppChatItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

interface Message {
  id: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'document';
  body: string;
  timestamp: string;
  fromMe: boolean;
  status?: 'pending' | 'sent' | 'delivered' | 'read';
  author?: string;
}

interface ChatHistoryResponse {
  success: boolean;
  data: {
    messages: Message[];
    stats: {
      totalMessages: number;
      unreadCount: number;
      lastMessageTime: string;
    };
  };
}

export default function Chats() {
  const { t } = useLocale();
  const { currentBranch } = useBranch();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [chats, setChats] = useState<WhatsAppChatItem[]>([]);
  const [filteredChats, setFilteredChats] = useState<WhatsAppChatItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedChat, setSelectedChat] = useState<WhatsAppChatItem | null>(null);
  const [page] = useState(1);
  const [totalChats, setTotalChats] = useState(0);
  const [filterType, setFilterType] = useState<'all' | 'unread'>('all');
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const normalizePhone = (phoneNumber: string) => {
    return phoneNumber.replace(/^\+/, '');
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadChats = async () => {
    if (!currentBranch?.accountID) {
      return;
    }

    setLoading(true);
    try {
      const endpoint = `/api/whatsapp/chats-list?accountId=${currentBranch.accountID}&page=${page}&limit=50`;
      const data = await apiGetJson<ChatsListResponse>(endpoint);
      
      if (data.success && data.data) {
        setChats(data.data);
        setFilteredChats(data.data);
        setTotalChats(data.pagination.total);
      }
    } catch (error) {
      console.error('Error loading chats:', error);
      toast({
        title: t('error'),
        description: t('whatsapp.error_loading_history'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (chat: WhatsAppChatItem) => {
    if (!currentBranch?.accountID) return;

    setLoadingMessages(true);
    try {
      const normalizedPhone = normalizePhone(chat.contactNumber);
      const endpoint = `/api/whatsapp/history/${normalizedPhone}?accountId=${currentBranch.accountID}&limit=100`;
      const data = await apiGetJson<ChatHistoryResponse>(endpoint);
      
      if (data.success && data.data) {
        setMessages(data.data.messages);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      toast({
        title: t('error'),
        description: t('whatsapp.error_loading_history'),
        variant: 'destructive',
      });
    } finally {
      setLoadingMessages(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || !currentBranch?.id) return;

    setSendingMessage(true);
    try {
      const normalizedPhone = normalizePhone(selectedChat.contactNumber);
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/whatsapp/send`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            phone: normalizedPhone,
            message: newMessage.trim(),
            branchId: currentBranch.id,
          })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      
      if (data.success) {
        setNewMessage('');
        const newMsg: Message = {
          id: data.messageId || Date.now().toString(),
          type: 'text',
          body: newMessage.trim(),
          timestamp: new Date().toISOString(),
          fromMe: true,
          status: 'sent'
        };
        setMessages(prev => [...prev, newMsg]);
        loadChats();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: t('whatsapp.send_error'),
        description: t('whatsapp.send_error_message'),
        variant: 'destructive',
      });
    } finally {
      setSendingMessage(false);
    }
  };

  useEffect(() => {
    loadChats();
  }, [currentBranch, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      let filtered = chats;
      
      if (filterType === 'unread') {
        filtered = filtered.filter(chat => chat.unreadCount > 0);
      }
      
      if (searchQuery.trim()) {
        filtered = filtered.filter(chat => 
          chat.contactNumber.includes(searchQuery) ||
          chat.contactName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      
      setFilteredChats(filtered);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, chats, filterType]);

  const handleOpenChat = (chat: WhatsAppChatItem) => {
    setSelectedChat(chat);
    loadMessages(chat);
  };

  const getChatDisplayName = (chat: WhatsAppChatItem) => {
    return chat.contactName || chat.contactNumber;
  };

  const formatChatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      
      if (isToday(date)) {
        return format(date, 'HH:mm');
      }
      if (isYesterday(date)) {
        return t('yesterday') || 'Вчера';
      }
      return format(date, 'dd.MM.yy');
    } catch {
      return '';
    }
  };

  const formatMessageTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'HH:mm');
    } catch {
      return '';
    }
  };

  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { [key: string]: Message[] } = {};
    
    messages.forEach(msg => {
      const date = new Date(msg.timestamp);
      let dateKey: string;
      
      if (isToday(date)) {
        dateKey = t('today') || 'Сегодня';
      } else if (isYesterday(date)) {
        dateKey = t('yesterday') || 'Вчера';
      } else {
        dateKey = format(date, 'dd.MM.yyyy');
      }
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(msg);
    });
    
    return groups;
  };

  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-0 overflow-hidden border rounded-lg shadow-lg bg-background">
      <div className="w-full md:w-96 border-r flex flex-col">
        <div className="bg-[#008069] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageCircle className="h-6 w-6" />
            <h1 className="text-xl font-semibold">WhatsApp</h1>
          </div>
          {totalChats > 0 && (
            <Badge variant="secondary" className="bg-white/20 text-white border-0">
              {totalChats}
            </Badge>
          )}
        </div>

        <div className="p-3 border-b bg-muted/30">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('clients.search_placeholder') || 'Поиск или новый чат'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background"
            />
          </div>
        </div>

        <div className="px-3 py-2 border-b">
          <Tabs value={filterType} onValueChange={(v) => setFilterType(v as 'all' | 'unread')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="all">
                {t('all') || 'Все'}
              </TabsTrigger>
              <TabsTrigger value="unread">
                {t('unread') || 'Непрочитанное'}
                {chats.filter(c => c.unreadCount > 0).length > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 min-w-5 rounded-full">
                    {chats.filter(c => c.unreadCount > 0).length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex-1 overflow-y-auto">
          {!currentBranch ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mb-3 opacity-30" />
              <p>{t('branch.select_branch') || 'Выберите филиал'}</p>
            </div>
          ) : !currentBranch.accountID ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <Alert variant="destructive" className="max-w-sm">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {t('whatsapp.no_account_id') || 'У филиала нет WhatsApp аккаунта'}
                </AlertDescription>
              </Alert>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-[#008069]" />
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 text-muted-foreground">
              <MessageCircle className="h-12 w-12 mb-3 opacity-30" />
              <p>{searchQuery ? (t('no_results') || 'Ничего не найдено') : (t('whatsapp.no_messages') || 'Нет чатов')}</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredChats.map((chat) => (
                <button
                  key={chat.contactNumber}
                  onClick={() => handleOpenChat(chat)}
                  className={cn(
                    "w-full p-4 hover:bg-muted/50 transition-colors text-left flex gap-3",
                    selectedChat?.contactNumber === chat.contactNumber && "bg-muted"
                  )}
                >
                  <Avatar className="h-12 w-12 flex-shrink-0">
                    <AvatarFallback className="bg-[#008069] text-white">
                      <User className="h-6 w-6" />
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-semibold truncate">
                        {getChatDisplayName(chat)}
                      </h3>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatChatTime(chat.lastMessageTime)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm text-muted-foreground truncate">
                        {chat.lastMessage}
                      </p>
                      {chat.unreadCount > 0 && (
                        <Badge className="bg-[#25D366] text-white h-5 min-w-5 rounded-full text-xs">
                          {chat.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {!selectedChat ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 bg-muted/20">
            <div className="max-w-md space-y-4">
              <div className="w-32 h-32 mx-auto rounded-full bg-[#008069]/10 flex items-center justify-center">
                <MessageCircle className="h-16 w-16 text-[#008069]" />
              </div>
              <h2 className="text-2xl font-semibold">WhatsApp Web</h2>
              <p className="text-muted-foreground">
                {t('whatsapp.select_chat') || 'Выберите чат, чтобы начать общение'}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-muted/30 border-b p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => setSelectedChat(null)}
                >
                  <X className="h-5 w-5" />
                </Button>
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-[#008069] text-white">
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="font-semibold">{getChatDisplayName(selectedChat)}</h2>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    {selectedChat.contactNumber}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#efeae2] dark:bg-[#0b141a]">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-[#008069]" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <MessageCircle className="h-12 w-12 mb-3 opacity-30" />
                  <p>{t('whatsapp.no_messages') || 'Нет сообщений'}</p>
                </div>
              ) : (
                Object.entries(messageGroups).map(([date, msgs]) => (
                  <div key={date} className="space-y-2">
                    <div className="flex justify-center">
                      <div className="bg-white dark:bg-[#182229] text-muted-foreground text-xs px-3 py-1 rounded-lg shadow-sm">
                        {date}
                      </div>
                    </div>
                    
                    {msgs.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex",
                          msg.fromMe ? "justify-end" : "justify-start"
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[70%] rounded-lg p-3 shadow-sm",
                            msg.fromMe
                              ? "bg-[#d9fdd3] dark:bg-[#005c4b] text-foreground"
                              : "bg-white dark:bg-[#202c33] text-foreground"
                          )}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words">
                            {msg.body}
                          </p>
                          <div className="flex items-center justify-end gap-1 mt-1">
                            <span className="text-[10px] text-muted-foreground">
                              {formatMessageTime(msg.timestamp)}
                            </span>
                            {msg.fromMe && (
                              <span className="text-[#53bdeb]">
                                {msg.status === 'read' ? (
                                  <CheckCheck className="h-3 w-3" />
                                ) : msg.status === 'delivered' ? (
                                  <CheckCheck className="h-3 w-3 text-muted-foreground" />
                                ) : (
                                  <Check className="h-3 w-3 text-muted-foreground" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t bg-muted/30 p-4">
              <div className="flex items-end gap-2">
                <Textarea
                  placeholder={t('whatsapp.type_message') || 'Введите сообщение'}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  disabled={sendingMessage}
                  className="flex-1 min-h-[44px] max-h-32 resize-none"
                  rows={1}
                />
                <Button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sendingMessage}
                  className="bg-[#008069] hover:bg-[#006d5b] h-11 px-4"
                >
                  {sendingMessage ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
