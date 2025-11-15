import { useState, useEffect, useRef } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import { useBranch } from '@/contexts/BranchContext';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, Phone, Loader2, MessageCircle, AlertTriangle, User, Check, CheckCheck, Send, X, Plus } from 'lucide-react';
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
  
  // Состояние для активного чата
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Диалог отправки на произвольный номер
  const [showNewMessageDialog, setShowNewMessageDialog] = useState(false);
  const [customPhone, setCustomPhone] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [sendingCustom, setSendingCustom] = useState(false);

  // Нормализация номера телефона
  const normalizePhone = (phoneNumber: string) => {
    return phoneNumber.replace(/^\+/, '');
  };

  // Автопрокрутка к последнему сообщению
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Загрузка списка чатов
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

  // Загрузка истории сообщений
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

  // Отправка сообщения
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
        // Добавляем сообщение в список
        const newMsg: Message = {
          id: data.messageId || Date.now().toString(),
          type: 'text',
          body: newMessage.trim(),
          timestamp: new Date().toISOString(),
          fromMe: true,
          status: 'sent'
        };
        setMessages(prev => [...prev, newMsg]);
        
        // Обновляем список чатов
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

  // Отправка на произвольный номер
  const sendToCustomNumber = async () => {
    if (!customPhone.trim()) {
      toast({
        title: t('error'),
        description: 'Введите номер телефона',
        variant: 'destructive',
      });
      return;
    }

    if (!customMessage.trim()) {
      toast({
        title: t('error'),
        description: t('whatsapp.type_message'),
        variant: 'destructive',
      });
      return;
    }

    setSendingCustom(true);
    try {
      const normalizedPhone = normalizePhone(customPhone);
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
            message: customMessage.trim(),
            branchId: currentBranch?.id,
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }

      const data = await response.json();

      if (data.success) {
        toast({
          title: t('whatsapp.message_sent'),
          description: t('whatsapp.message_sent_successfully'),
          variant: 'default',
        });
        
        setCustomPhone('');
        setCustomMessage('');
        setShowNewMessageDialog(false);
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
      setSendingCustom(false);
    }
  };

  // Загрузка чатов при монтировании
  useEffect(() => {
    loadChats();
  }, [currentBranch, page]);

  // Поиск чатов
  useEffect(() => {
    const timer = setTimeout(() => {
      let filtered = chats;
      
      // Поиск
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
  }, [searchQuery, chats]);

  // Открытие чата
  const handleOpenChat = (chat: WhatsAppChatItem) => {
    setSelectedChat(chat);
    loadMessages(chat);
  };

  // Получение отображаемого имени
  const getChatDisplayName = (chat: WhatsAppChatItem) => {
    return chat.contactName || chat.contactNumber;
  };

  // Форматирование времени для списка чатов
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

  // Форматирование времени для сообщений
  const formatMessageTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'HH:mm');
    } catch {
      return '';
    }
  };

  // Группировка сообщений по датам
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
      {/* Левая панель - Список чатов */}
      <div className="w-full md:w-96 border-r flex flex-col">
        {/* Заголовок */}
        <div className="bg-[#008069] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageCircle className="h-6 w-6" />
            <h1 className="text-xl font-semibold">WhatsApp</h1>
          </div>
          <div className="flex items-center gap-2">
            {totalChats > 0 && (
              <Badge variant="secondary" className="bg-white/20 text-white border-0">
                {totalChats}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 hover:bg-white/20 text-white"
              onClick={() => setShowNewMessageDialog(true)}
              title="Новое сообщение"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Поиск */}
        <div className="p-3 border-b bg-muted/30">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск или новый чат"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background"
            />
          </div>
        </div>

        {/* Список чатов */}
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
                  {/* Аватар */}
                  <Avatar className="h-12 w-12 flex-shrink-0">
                    <AvatarFallback className="bg-[#008069] text-white">
                      <User className="h-6 w-6" />
                    </AvatarFallback>
                  </Avatar>

                  {/* Контент */}
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

      {/* Правая панель - Активный чат */}
      <div className="flex-1 flex flex-col">
        {!selectedChat ? (
          /* Заглушка когда чат не выбран */
          <div className="flex flex-col items-center justify-center h-full text-center p-6 bg-muted/20">
            <div className="max-w-md space-y-4">
              <div className="w-32 h-32 mx-auto rounded-full bg-[#008069]/10 flex items-center justify-center">
                <MessageCircle className="h-16 w-16 text-[#008069]" />
              </div>
              <h2 className="text-2xl font-semibold">WhatsApp Web</h2>
              <p className="text-muted-foreground">
                Выберите чат, чтобы начать общение
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Заголовок чата */}
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

            {/* Сообщения */}
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
                    {/* Разделитель по дате */}
                    <div className="flex justify-center">
                      <div className="bg-white dark:bg-[#182229] text-muted-foreground text-xs px-3 py-1 rounded-lg shadow-sm">
                        {date}
                      </div>
                    </div>
                    
                    {/* Сообщения */}
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

            {/* Поле ввода */}
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

      {/* Диалог отправки на произвольный номер */}
      <Dialog open={showNewMessageDialog} onOpenChange={setShowNewMessageDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Новое сообщение</DialogTitle>
            <DialogDescription>
              Отправьте WhatsApp сообщение на любой номер телефона
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="custom-phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Номер телефона
              </Label>
              <Input
                id="custom-phone"
                placeholder="+996 (XXX) XXX-XXX"
                value={customPhone}
                onChange={(e) => setCustomPhone(e.target.value)}
                disabled={sendingCustom}
              />
              <p className="text-xs text-muted-foreground">
                Формат: +996XXXXXXXXX (автоматически удаляется "+")
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-message" className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                Сообщение
              </Label>
              <Textarea
                id="custom-message"
                placeholder="Введите сообщение..."
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                disabled={sendingCustom}
                className="min-h-[120px] resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.ctrlKey) {
                    sendToCustomNumber();
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                Ctrl + Enter для отправки
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setShowNewMessageDialog(false)}
              disabled={sendingCustom}
            >
              Отмена
            </Button>
            <Button
              onClick={sendToCustomNumber}
              disabled={!customPhone.trim() || !customMessage.trim() || sendingCustom}
              className="bg-[#008069] hover:bg-[#006d5b]"
            >
              {sendingCustom ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Отправка...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Отправить
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
