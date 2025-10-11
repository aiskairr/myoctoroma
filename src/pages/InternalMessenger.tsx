import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Send, 
  Paperclip, 
  MessageCircle, 
  Bot, 
  User,
  Image as ImageIcon,
  FileText,
  Music,
  Download,
  Loader2,
  Sparkles,
  Sun
} from "lucide-react";
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { LocaleProvider, useLocale } from '@/contexts/LocaleContext';
import { LocaleToggle } from '@/components/ui/locale-toggle';
import { createApiUrl } from '@/utils/api-url';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Message {
  id: number;
  content: string;
  fileUrl: string | null;
  fileName: string | null;
  isFromClient: boolean;
  timestamp: string;
  direction: 'incoming' | 'outgoing';
}

interface ClientInfo {
  id: number;
  name: string;
}

interface MessengerResponse {
  success: boolean;
  sessionId: string;
  messageReceived: boolean;
  botResponse?: string;
  fileUrl?: string;
  fileName?: string;
  message: string;
}

interface HistoryResponse {
  success: boolean;
  sessionId: string;
  messages: Message[];
  clientInfo: ClientInfo;
}

interface InternalMessengerProps {
  organisationId: string;
  branchId?: string;
}

const InternalMessengerComponent: React.FC<InternalMessengerProps> = ({ 
  organisationId, 
  branchId 
}) => {
  const { toast } = useToast();
  const { theme } = useTheme();
  const { t } = useLocale();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Проверяем обязательный параметр
  if (!organisationId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="p-6 text-center">
            <div className="text-red-600 mb-4">
              <MessageCircle className="h-12 w-12 mx-auto mb-2" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">{t('messenger.config_error')}</h2>
            <p className="text-gray-600">{t('messenger.org_required')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Автоскролл к новым сообщениям
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Загрузка истории при монтировании
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const response = await fetch(createApiUrl('/api/messenger/history?limit=50'), {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        }
      });
      
      const data: HistoryResponse = await response.json();
      
      if (data.success) {
        setMessages(data.messages);
        setSessionId(data.sessionId);
        setClientInfo(data.clientInfo);
      }
    } catch (error) {
      console.error('Ошибка загрузки истории:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить историю сообщений",
        variant: "destructive",
      });
    }
  };

  const sendMessage = async (file?: File) => {
    if (!inputText.trim() && !file) return;
    
    setLoading(true);
    try {
      const formData = new FormData();
      
      if (inputText.trim()) {
        formData.append('content', inputText);
      }
      
      if (file) {
        formData.append('file', file);
      }
      
      formData.append('organisationId', organisationId);
      
      if (branchId) {
        formData.append('branchId', branchId);
      }
      
      const response = await fetch(createApiUrl('/api/messenger/send'), {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      const data: MessengerResponse = await response.json();
      
      if (data.success) {
        // Создаем сообщение пользователя
        const userMessage: Message = {
          id: Date.now(),
          content: inputText || (file ? `Отправлен файл: ${file.name}` : ''),
          fileUrl: file ? data.fileUrl || null : null,
          fileName: file ? data.fileName || file.name : null,
          isFromClient: true,
          timestamp: new Date().toISOString(),
          direction: 'outgoing'
        };
        
        setMessages(prev => [...prev, userMessage]);
        
        // Добавляем ответ бота если есть
        if (data.botResponse) {
          const botMessage: Message = {
            id: Date.now() + 1,
            content: data.botResponse,
            fileUrl: null,
            fileName: null,
            isFromClient: false,
            timestamp: new Date().toISOString(),
            direction: 'incoming'
          };
          
          // Задержка для имитации печати
          setTimeout(() => {
            setMessages(prev => [...prev, botMessage]);
          }, 1000);
        }
        
        setInputText('');
        setSelectedFile(null);
        setSessionId(data.sessionId);
        
        toast({
          title: "Сообщение отправлено",
          description: "Ваше сообщение успешно доставлено",
        });
      } else {
        throw new Error(data.message || 'Ошибка отправки сообщения');
      }
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось отправить сообщение. Попробуйте еще раз.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Проверка размера файла (50MB)
      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: "Файл слишком большой",
          description: "Максимальный размер файла: 50MB",
          variant: "destructive",
        });
        return;
      }
      
      // Проверка типа файла
      const allowedTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
        'audio/mpeg', 'audio/wav', 'audio/mp3',
        'application/pdf', 'text/plain'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Неподдерживаемый формат",
          description: "Поддерживаемые форматы: JPG, PNG, GIF, WebP, MP3, WAV, PDF, TXT",
          variant: "destructive",
        });
        return;
      }
      
      setSelectedFile(file);
      sendMessage(file);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return format(date, 'HH:mm', { locale: ru });
    }
    
    return format(date, 'dd.MM HH:mm', { locale: ru });
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
        return <ImageIcon className="h-4 w-4" />;
      case 'mp3':
      case 'wav':
        return <Music className="h-4 w-4" />;
      case 'pdf':
      case 'txt':
        return <FileText className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const renderMessage = (message: Message) => {
    const isUser = message.isFromClient;
    
    return (
      <div
        key={message.id}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div className={`flex items-start space-x-2 max-w-xs lg:max-w-md ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
          {/* Avatar */}
          <div className={`flex-shrink-0 ${isUser ? 'ml-2' : 'mr-2'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              isUser 
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white' 
                : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white'
            }`}>
              {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </div>
          </div>
          
          {/* Message bubble */}
          <div className={`relative px-4 py-2 rounded-2xl ${
            isUser
              ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
              : theme === 'dark' 
                ? 'bg-gray-700 text-gray-100 border border-gray-600'
                : 'bg-white text-gray-900 shadow-sm border border-gray-200'
          }`}>
            {/* Message content */}
            {message.content && (
              <p className="text-sm whitespace-pre-wrap leading-relaxed">
                {message.content}
              </p>
            )}
            
            {/* File attachment */}
            {message.fileUrl && message.fileName && (
              <div className="mt-2">
                {message.fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                  <div className="relative">
                    <img
                      src={message.fileUrl}
                      alt={message.fileName}
                      className="max-w-full h-auto rounded-lg max-h-48 object-cover"
                      loading="lazy"
                    />
                    <a
                      href={message.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute top-2 right-2 bg-black bg-opacity-50 text-white p-1 rounded-full hover:bg-opacity-70 transition-colors"
                      title="Открыть в полном размере"
                    >
                      <Download className="h-3 w-3" />
                    </a>
                  </div>
                ) : message.fileName.match(/\.(mp3|wav)$/i) ? (
                  <div className="bg-gray-100 rounded-lg p-3">
                    <audio controls className="w-full">
                      <source src={message.fileUrl} type="audio/mpeg" />
                      Ваш браузер не поддерживает аудио элемент.
                    </audio>
                    <div className="flex items-center mt-2 text-sm text-gray-600">
                      {getFileIcon(message.fileName)}
                      <span className="ml-1">{message.fileName}</span>
                    </div>
                  </div>
                ) : (
                  <a
                    href={message.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                      isUser
                        ? 'bg-white bg-opacity-20 hover:bg-opacity-30 text-white'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    {getFileIcon(message.fileName)}
                    <span className="text-sm">{message.fileName}</span>
                    <Download className="h-3 w-3" />
                  </a>
                )}
              </div>
            )}
            
            {/* Timestamp */}
            <div className={`text-xs mt-1 ${
              isUser ? 'text-blue-100' : 'text-gray-500'
            }`}>
              {formatMessageTime(message.timestamp)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`h-screen flex flex-col overflow-hidden transition-colors duration-300 ${
      theme === 'dark'
        ? 'bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800'
        : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-cyan-50'
    }`}>
      <div className="max-w-4xl mx-auto w-full h-full flex flex-col p-4">
        {/* Header - фиксированная высота */}
        <Card className={`flex-shrink-0 shadow-xl ${
          theme === 'dark'
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white/80 backdrop-blur-sm border-blue-200'
        }`}>
        <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-t-xl py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-white bg-opacity-20 p-2 rounded-lg">
                <MessageCircle className="h-6 w-6" />
              </div>
              <div>
                                <div>
                  <CardTitle className="text-xl font-semibold">
                    {t('messenger.title')}
                  </CardTitle>
                  <p className="text-blue-100 text-sm">
                    {t('messenger.subtitle')}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <ThemeToggle />
              <LocaleToggle />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Messages - растягиваемая область с внутренним скроллом */}
      <Card className={`flex-1 flex flex-col shadow-xl mt-4 min-h-0 ${
        theme === 'dark'
          ? 'bg-gray-800 border-gray-700'
          : 'bg-white/80 backdrop-blur-sm border-blue-200'
      }`}>
        <CardContent className="p-0 flex-1 flex flex-col min-h-0">
          <div className={`flex-1 overflow-y-auto p-4 max-h-full scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-500 ${
            theme === 'dark' ? 'bg-gray-900 scrollbar-thumb-gray-600 scrollbar-track-gray-800 hover:scrollbar-thumb-gray-500' : 'bg-gradient-to-b from-gray-50 to-white'
          }`}>
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className={`p-4 rounded-full mb-4 ${
                    theme === 'dark' ? 'bg-gray-700' : 'bg-blue-100'
                  }`}>
                    <Sparkles className={`h-8 w-8 ${
                      theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                    }`} />
                  </div>
                  <h3 className={`text-lg font-semibold mb-2 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    {t('messenger.welcome.title')}
                  </h3>
                  <p className={`text-sm max-w-sm ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {t('messenger.welcome.description')}
                  </p>
                </div>
              ) : (
                <>
                  {messages.map(renderMessage)}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>
            
            {/* Input area - фиксированная внизу */}
            <div className={`flex-shrink-0 border-t p-4 ${
              theme === 'dark' 
                ? 'border-gray-700 bg-gray-800' 
                : 'border-gray-200 bg-white'
            }`}>
              <div className="flex items-end space-x-2">
                {/* File input (hidden) */}
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  accept=".jpg,.jpeg,.png,.gif,.webp,.mp3,.wav,.pdf,.txt"
                  className="hidden"
                />
                
                {/* File attachment button */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  title={t('messenger.attach')}
                  className={`flex-shrink-0 ${
                    theme === 'dark'
                      ? 'border-gray-600 hover:bg-gray-700'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                
                {/* Text input */}
                <Textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={t('messenger.input.placeholder')}
                  disabled={loading}
                  className={`min-h-[40px] max-h-32 resize-none ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300'
                  }`}
                  rows={1}
                />
                
                {/* Send button */}
                <Button
                  onClick={() => sendMessage()}
                  disabled={loading || (!inputText.trim() && !selectedFile)}
                  className="flex-shrink-0 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white"
                  title={t('messenger.send')}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              {/* File preview */}
              {selectedFile && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center space-x-2 text-sm text-blue-700">
                    {getFileIcon(selectedFile.name)}
                    <span>{t('messenger.file_selected').replace('{filename}', selectedFile.name)}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedFile(null)}
                      className="h-4 w-4 p-0 ml-auto"
                    >
                      ×
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Hints */}
              <div className={`mt-3 text-xs ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`}>
                💡 {t('messenger.formats_hint')}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Основной компонент с провайдерами
const InternalMessenger: React.FC<InternalMessengerProps> = (props) => {
  return (
    <ThemeProvider>
      <LocaleProvider>
        <InternalMessengerComponent {...props} />
      </LocaleProvider>
    </ThemeProvider>
  );
};

export default InternalMessenger;
