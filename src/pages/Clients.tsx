import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { Client, Message } from "@/types/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import ClientList from "@/components/ClientList";
import ConversationHistory from "@/components/ConversationHistory";
import { format } from "date-fns";
import { Loader2, Send, AlertTriangle, Edit, Check, X, User, Calendar, Clock, MessageSquare } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useBranchFilter } from "@/hooks/use-branch-filter";

export default function Clients() {
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [conversationTopics, setConversationTopics] = useState<Record<string, string>>({});
  const [wsConnected, setWsConnected] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [customNameInput, setCustomNameInput] = useState("");
  const socketRef = useRef<WebSocket | null>(null);

  // Запрос данных пользователя
  const userQuery = useQuery<{ id: number; email: string; username: string }>({
    queryKey: ["/api/user"],
    staleTime: Infinity,
  });

  // Запрос списка клиентов
  const clientsQuery = useQuery<{ clients: Client[] }>({
    queryKey: ["/api/clients"],
    refetchInterval: 30000,
  });

  type ClientDetailsResponse = {
    client: Client;
    messages: Message[];
  };

  // Запрос деталей выбранного клиента и истории сообщений
  const clientDetailsQuery = useQuery<ClientDetailsResponse>({
    queryKey: ["/api/clients", selectedClientId],
    enabled: !!selectedClientId,
    refetchInterval: 5000,
    retry: 3,
    retryDelay: 1000
  });

  // Мутация для обновления имени клиента
  const updateClientNameMutation = useMutation({
    mutationFn: async ({ telegramId, customName }: { telegramId: string; customName: string }) => {
      const response = await apiRequest("POST", `/api/clients/${telegramId}/update-name`, { customName });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients", selectedClientId] });
      toast({
        title: "Успешно",
        description: "Имя клиента обновлено",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить имя клиента",
        variant: "destructive",
      });
    }
  });

  // Мутация для отправки сообщения клиенту
  const sendMessageMutation = useMutation({
    mutationFn: async ({ telegramId, message }: { telegramId: string; message: string }) => {
      const response = await apiRequest("POST", `/api/clients/${telegramId}/send`, { message });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", selectedClientId] });
      setNewMessage("");
      toast({
        title: "Отправлено",
        description: "Сообщение успешно доставлено",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось отправить сообщение",
        variant: "destructive",
      });
    },
  });

  // Синхронизация с URL query params
  useEffect(() => {
    const handleUrlChange = () => {
      const searchParams = new URLSearchParams(window.location.search);
      const clientIdFromUrl = searchParams.get('clientId');

      if (clientIdFromUrl && clientIdFromUrl !== selectedClientId) {
        console.log(`Setting client from URL: ${clientIdFromUrl}`);
        setSelectedClientId(clientIdFromUrl);
      }
    };

    // Проверяем при загрузке
    handleUrlChange();

    // Слушаем изменения URL
    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, [selectedClientId]);

  // Обновление URL при выборе клиента
  const updateUrl = (clientId: string | null) => {
    const url = new URL(window.location.href);
    if (clientId) {
      url.searchParams.set('clientId', clientId);
    } else {
      url.searchParams.delete('clientId');
    }
    window.history.replaceState({}, '', url.toString());
  };

  // Применяем фильтрацию по филиалам к данным клиентов
  const filteredClients = useBranchFilter(clientsQuery.data?.clients);

  // Обновление списка клиентов при получении данных с учетом фильтрации
  useEffect(() => {
    if (Array.isArray(filteredClients)) {
      setClients(filteredClients);

      // Проверяем, есть ли текущий выбранный клиент в отфильтрованном списке
      if (selectedClientId) {
        const clientStillExists = filteredClients.some(client => client.telegramId === selectedClientId);
        if (!clientStillExists) {
          console.log(`Selected client ${selectedClientId} not in filtered list, clearing selection`);
          setSelectedClientId(null);
          setSelectedClient(null);
          updateUrl(null);
        }
      }

      // Автовыбор первого клиента если никто не выбран и нет clientId в URL
      const urlParams = new URLSearchParams(window.location.search);
      const clientIdFromUrl = urlParams.get('clientId');

      if (!selectedClientId && !clientIdFromUrl && filteredClients.length > 0) {
        const firstClientId = filteredClients[0].telegramId;
        console.log(`Auto-selecting first client: ${firstClientId}`);
        setSelectedClientId(firstClientId);
        updateUrl(firstClientId);
      }
    }
  }, [filteredClients, selectedClientId]);

  // Обработка данных выбранного клиента
  useEffect(() => {
    if (clientDetailsQuery.data?.client) {
      console.log("Setting client data from query:", clientDetailsQuery.data.client);
      setSelectedClient(clientDetailsQuery.data.client);

      if (Array.isArray(clientDetailsQuery.data.messages)) {
        setMessages(clientDetailsQuery.data.messages);

        // Определение темы разговора
        if (clientDetailsQuery.data.messages.length > 0 && selectedClientId) {
          const clientMessages = clientDetailsQuery.data.messages
            .filter(msg => msg.isFromClient)
            .slice(0, 5);

          if (clientMessages.length > 0 && !conversationTopics[selectedClientId]) {
            determineConversationTopic(clientMessages, selectedClientId);
          }
        }
      }

      // Сбросить индикатор непрочитанных сообщений
      setClients(prevClients =>
        prevClients.map(client =>
          client.telegramId === selectedClientId
            ? { ...client, hasUnreadMessages: false }
            : client
        )
      );
    }

    if (clientDetailsQuery.isError) {
      console.error("Client details query error:", clientDetailsQuery.error);
      toast({
        title: "Ошибка загрузки",
        description: "Не удалось загрузить данные клиента",
        variant: "destructive",
      });
    }
  }, [clientDetailsQuery.data, clientDetailsQuery.isError, selectedClientId, conversationTopics, toast]);

  // WebSocket соединение (упрощенная версия)
  useEffect(() => {
    const currentUserId = userQuery.data?.id;
    if (!currentUserId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const createConnection = () => {
      try {
        const socket = new WebSocket(wsUrl);
        socketRef.current = socket;

        socket.onopen = () => {
          console.log("✅ WebSocket connected");
          setWsConnected(true);
          socket.send(JSON.stringify({ type: 'identify', userId: currentUserId.toString() }));
        };

        socket.onclose = () => {
          console.log("WebSocket disconnected");
          setWsConnected(false);
          // Переподключение через 3 секунды
          setTimeout(createConnection, 3000);
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === 'new_message' && data.telegramId && data.message) {
              if (data.telegramId === selectedClientId) {
                // Обновляем сообщения для текущего клиента
                setMessages(prev => {
                  const messageExists = prev.some(msg => msg.id === data.message.id);
                  if (messageExists) return prev;

                  return [...prev, {
                    ...data.message,
                    timestamp: new Date(data.message.timestamp)
                  }];
                });
              } else {
                // Уведомление о новом сообщении от другого клиента
                const client = clients.find(c => c.telegramId === data.telegramId);
                if (client && data.message.isFromClient) {
                  toast({
                    title: `${client.customName || client.firstName || 'Клиент'}`,
                    description: data.message.content.substring(0, 50) + '...',
                  });
                }
              }

              // Обновляем список клиентов
              queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
            }
          } catch (error) {
            console.error("WebSocket message error:", error);
          }
        };
      } catch (error) {
        console.error("WebSocket creation error:", error);
        setTimeout(createConnection, 5000);
      }
    };

    createConnection();

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [userQuery.data?.id, selectedClientId, clients, toast, queryClient]);

  // Определение темы разговора
  const determineConversationTopic = (clientMessages: Message[], telegramId: string) => {
    if (conversationTopics[telegramId]) return;

    const content = clientMessages.map(msg => msg.content).join(" ").toLowerCase();
    let topic = "Общий вопрос";

    const topicKeywords: Record<string, string[]> = {
      "Запись на массаж": ["запись", "записаться", "забронировать", "визит"],
      "Классический массаж": ["классический", "классика", "обычный", "стандартный"],
      "Лечебный массаж": ["лечебный", "лечение", "боли", "спина болит"],
      "Арома и релакс": ["арома", "релакс", "расслабление", "стресс"],
      "Спортивный массаж": ["спортивный", "спорт", "мышцы", "тренировка"],
      "Информация о ценах": ["цена", "стоимость", "прайс", "сколько стоит"],
      "Расположение и график": ["адрес", "где находится", "часы работы"],
      "Подарочные сертификаты": ["подарок", "сертификат"],
      "Другие услуги": ["бочка", "кедровая", "стоун", "камни"]
    };

    for (const [topicName, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(keyword => content.includes(keyword))) {
        topic = topicName;
        break;
      }
    }

    setConversationTopics(prev => ({ ...prev, [telegramId]: topic }));
  };

  // Обработчик выбора клиента
  const handleClientSelect = (telegramId: string) => {
    if (telegramId === selectedClientId) return; // Избегаем повторного выбора

    console.log(`Selecting client: ${telegramId}`);
    setSelectedClientId(telegramId);
    updateUrl(telegramId);

    // Сразу находим клиента в локальном списке для быстрого отображения
    const localClient = clients.find(c => c.telegramId === telegramId);
    if (localClient) {
      setSelectedClient(localClient);
    }
  };

  // Обработчики редактирования имени
  const handleStartEditingName = () => {
    if (!selectedClient) return;
    setCustomNameInput(selectedClient.customName || "");
    setIsEditingName(true);
  };

  const handleSaveCustomName = () => {
    if (!selectedClientId || !customNameInput.trim()) {
      setIsEditingName(false);
      return;
    }

    updateClientNameMutation.mutate({
      telegramId: selectedClientId,
      customName: customNameInput.trim(),
    });
    setIsEditingName(false);
  };

  const handleCancelEditingName = () => {
    setIsEditingName(false);
    setCustomNameInput("");
  };

  // Обработчик отправки сообщения
  const handleSendMessage = () => {
    if (!selectedClientId || !newMessage.trim()) return;

    sendMessageMutation.mutate({
      telegramId: selectedClientId,
      message: newMessage.trim(),
    });
  };

  // Форматирование даты и времени
  const formatDate = (date: Date | string | undefined) => {
    if (!date) return "Н/Д";
    return format(new Date(date), "dd.MM.yyyy");
  };

  const formatDateTime = (date: Date | string | undefined) => {
    if (!date) return "Н/Д";

    const dateObj = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = dateObj.toDateString() === today.toDateString();
    const isYesterday = dateObj.toDateString() === yesterday.toDateString();

    if (isToday) {
      return `Сегодня, ${format(dateObj, "HH:mm")}`;
    } else if (isYesterday) {
      return `Вчера, ${format(dateObj, "HH:mm")}`;
    }

    return format(dateObj, "dd.MM.yyyy, HH:mm");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-screen">
      {/* Список клиентов */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Список клиентов</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {clientsQuery.isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="max-h-full overflow-y-auto" style={{ 
              scrollbarWidth: 'auto',
              scrollbarGutter: 'stable'
            }}>
              {clients.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Нет доступных клиентов</p>
                </div>
              ) : (
                <ClientList
                  clients={clients}
                  selectedClientId={selectedClientId}
                  onClientSelect={handleClientSelect}
                  conversationTopics={conversationTopics}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Детали клиента */}
      <Card className="lg:col-span-2 flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Информация о клиенте</CardTitle>
        </CardHeader>

        {clientDetailsQuery.isLoading ? (
          <CardContent className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">Загрузка данных...</p>
            </div>
          </CardContent>
        ) : !selectedClientId ? (
          <CardContent className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-3">
              <User className="h-12 w-12 text-muted-foreground/50 mx-auto" />
              <div>
                <p className="font-medium">Выберите клиента</p>
                <p className="text-sm text-muted-foreground">
                  Выберите клиента из списка для просмотра деталей
                </p>
              </div>
            </div>
          </CardContent>
        ) : clientDetailsQuery.isError ? (
          <CardContent className="flex-1 flex items-center justify-center p-6">
            <Alert className="max-w-md">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Ошибка загрузки данных клиента. Попробуйте выбрать клиента заново.
              </AlertDescription>
            </Alert>
          </CardContent>
        ) : selectedClient ? (
          <>
            {/* Информация о клиенте */}
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* ID и статус */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">ID клиента</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{selectedClient.telegramId}</p>
                  <StatusBadge status={selectedClient.isActive ? "Active" : "Inactive"} />
                </div>

                {/* Имя пользователя и ФИО */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Данные профиля</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm">{selectedClient.username || "Нет username"}</p>
                    <p className="text-sm text-muted-foreground">
                      {`${selectedClient.firstName || ""} ${selectedClient.lastName || ""}`.trim() || "Нет имени"}
                    </p>
                  </div>
                </div>

                {/* Кастомное имя */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Edit className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Имя клиента</span>
                    </div>
                    {!isEditingName && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleStartEditingName}
                        className="h-6 px-2"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  {isEditingName ? (
                    <div className="flex items-center space-x-1">
                      <Input
                        value={customNameInput}
                        onChange={(e) => setCustomNameInput(e.target.value)}
                        placeholder="Введите имя..."
                        className="h-8 text-sm"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSaveCustomName}
                        disabled={updateClientNameMutation.isPending}
                        className="h-8 px-2"
                      >
                        {updateClientNameMutation.isPending ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Check className="h-3 w-3" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancelEditingName}
                        className="h-8 px-2"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm font-medium text-primary">
                      {selectedClient.customName || "Не задано"}
                    </p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Даты и тема */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Первое обращение</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(selectedClient.firstSeenAt)}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Последняя активность</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatDateTime(selectedClient.lastActiveAt)}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Тема разговора</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {conversationTopics[selectedClient.telegramId] || "Определяется..."}
                  </Badge>
                </div>
              </div>
            </CardContent>

            <Separator />

            {/* История сообщений */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="px-6 py-3">
                <h3 className="text-sm font-medium">История сообщений</h3>
              </div>

              <div className="flex-1 px-6 overflow-y-auto" style={{ 
                scrollbarWidth: 'auto',
                scrollbarGutter: 'stable'
              }}>
                <ConversationHistory client={selectedClient} messages={messages} />
              </div>

              {/* Форма отправки сообщения */}
              <div className="p-6 border-t bg-muted/20">
                <div className="space-y-3">
                  <Textarea
                    placeholder="Введите сообщение для клиента..."
                    className="min-h-20 resize-none"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) {
                        handleSendMessage();
                      }
                    }}
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">
                      Ctrl+Enter для отправки
                    </span>
                    <Button
                      onClick={handleSendMessage}
                      disabled={sendMessageMutation.isPending || !newMessage.trim()}
                      className="gap-2"
                    >
                      {sendMessageMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Отправка...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Отправить
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <CardContent className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-3">
              <AlertTriangle className="h-12 w-12 text-muted-foreground/50 mx-auto" />
              <div>
                <p className="font-medium">Клиент не найден</p>
                <p className="text-sm text-muted-foreground">
                  Клиент может быть удален или произошла ошибка
                </p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}