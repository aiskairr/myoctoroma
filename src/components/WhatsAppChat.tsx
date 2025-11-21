import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Send, Loader2, Phone, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocale } from "@/contexts/LocaleContext";
import { useBranch } from "@/contexts/BranchContext";
import { format } from "date-fns";

interface WhatsAppMessage {
  id: string;
  direction: 'outgoing' | 'incoming';
  message: string;
  to?: string;
  from?: string;
  sentAt: string;
  status: string;
  source: 'db' | 'api';
}

interface WhatsAppChatProps {
  phone: string;
  clientName?: string;
  clientId?: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function WhatsAppChat({ phone, clientName, clientId, isOpen, onClose }: WhatsAppChatProps) {
  const { t } = useLocale();
  const { toast } = useToast();
  const { currentBranch } = useBranch();
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [stats, setStats] = useState({ sentMessages: 0, receivedMessages: 0, totalMessages: 0 });
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Нормализация номера телефона (удаляем + если есть)
  const normalizePhone = (phoneNumber: string) => {
    return phoneNumber.replace(/^\+/, '');
  };

  // Загрузка истории чата
  const loadChatHistory = async () => {
    if (!phone || !currentBranch?.accountID) return;
    
    setLoading(true);
    try {
      const normalizedPhone = normalizePhone(phone);
      console.log('📱 Loading chat history for:', normalizedPhone);
      
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/whatsapp/history/${normalizedPhone}?accountId=${currentBranch.accountID}&limit=100`,
        {
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load chat history');
      }

      const data = await response.json();
      console.log('✅ Chat history loaded:', data);

      if (data.success && data.messages) {
        // Сортируем сообщения по дате (старые сверху)
        const sortedMessages = [...data.messages].sort((a, b) => 
          new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
        );
        setMessages(sortedMessages);
        setStats(data.stats || { sentMessages: 0, receivedMessages: 0, totalMessages: 0 });
      } else {
        setMessages([]);
        setStats({ sentMessages: 0, receivedMessages: 0, totalMessages: 0 });
      }
    } catch (error) {
      console.error('❌ Error loading chat history:', error);
      toast({
        title: t('error'),
        description: t('whatsapp.error_loading_history'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Отправка сообщения
  const sendMessage = async () => {
    if (!newMessage.trim() || !phone) return;

    setSending(true);
    try {
      console.log('📤 Sending message to:', phone);
      console.log('🏢 Using branchId:', currentBranch?.id);
      
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
            phone: phone,
            message: newMessage.trim(),
            clientId: clientId,
            branchId: currentBranch?.id, // Backend автоматически получит accountID
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }

      const data = await response.json();
      console.log('✅ Message sent:', data);

      if (data.success) {
        // Добавляем отправленное сообщение в список
        const sentMessage: WhatsAppMessage = {
          id: `db_${data.data.messageId}`,
          direction: 'outgoing',
          message: newMessage.trim(),
          to: normalizePhone(phone),
          sentAt: data.data.timestamp,
          status: 'SENT',
          source: 'db'
        };

        setMessages([sentMessage, ...messages]);
        setStats(prev => ({
          ...prev,
          sentMessages: prev.sentMessages + 1,
          totalMessages: prev.totalMessages + 1
        }));
        setNewMessage('');

        toast({
          title: t('whatsapp.message_sent'),
          description: t('whatsapp.message_sent_successfully'),
          variant: 'default',
        });
      }
    } catch (error) {
      console.error('❌ Error sending message:', error);
      toast({
        title: t('error'),
        description: `${error}`,
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  // Загрузка истории при открытии диалога
  useEffect(() => {
    if (isOpen && phone) {
      loadChatHistory();
    }
  }, [isOpen, phone]);

  // Автообновление сообщений каждые 20 секунд
  useEffect(() => {
    if (!isOpen || !phone || !currentBranch?.accountID) return;
    
    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing WhatsApp chat messages for:', phone);
      loadChatHistory();
    }, 20000);
    
    return () => clearInterval(interval);
  }, [isOpen, phone, currentBranch]);

  // Автоскролл к последнему сообщению
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Форматирование времени
  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'HH:mm');
    } catch {
      return '';
    }
  };

  // Форматирование даты
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'd MMM yyyy');
    } catch {
      return '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-green-500 to-green-600 text-white">
          <div className="flex items-center gap-3">
            <MessageCircle className="h-6 w-6" />
            <div className="flex-1">
              <DialogTitle className="text-lg font-semibold text-white">
                {clientName || phone}
              </DialogTitle>
              <div className="flex items-center gap-2 text-sm text-green-50">
                <Phone className="h-3 w-3" />
                <span>{phone}</span>
              </div>
            </div>
          </div>
          
          {/* Статистика */}
          {stats.totalMessages > 0 && (
            <div className="flex gap-2 mt-2 text-xs">
              <Badge variant="secondary" className="bg-white/20 text-white border-none">
                📤 {stats.sentMessages} {t('whatsapp.sent')}
              </Badge>
              <Badge variant="secondary" className="bg-white/20 text-white border-none">
                📥 {stats.receivedMessages} {t('whatsapp.received')}
              </Badge>
            </div>
          )}
        </DialogHeader>

        {/* Messages */}
        <ScrollArea className="flex-1 px-6 py-4" ref={scrollRef}>
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <MessageCircle className="h-12 w-12 mb-2" />
              <p>{t('whatsapp.no_messages')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.slice().reverse().map((msg, index, arr) => {
                const isOutgoing = msg.direction === 'outgoing';
                const showDate = index === 0 || formatDate(msg.sentAt) !== formatDate(arr[index - 1].sentAt);
                
                return (
                  <div key={msg.id}>
                    {/* Date separator */}
                    {showDate && (
                      <div className="flex justify-center my-4">
                        <Badge variant="outline" className="text-xs">
                          {formatDate(msg.sentAt)}
                        </Badge>
                      </div>
                    )}
                    
                    {/* Message bubble */}
                    <div className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] ${isOutgoing ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-900'} rounded-2xl px-4 py-2 shadow-sm`}>
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs ${isOutgoing ? 'text-green-50' : 'text-gray-500'}`}>
                            {formatTime(msg.sentAt)}
                          </span>
                          {msg.source === 'db' && (
                            <Badge variant="secondary" className={`text-xs h-4 ${isOutgoing ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>
                              DB
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="px-6 py-4 border-t bg-gray-50">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder={t('whatsapp.type_message')}
              disabled={sending || loading}
              className="flex-1"
            />
            <Button
              onClick={sendMessage}
              disabled={!newMessage.trim() || sending || loading}
              className="bg-green-600 hover:bg-green-700"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
