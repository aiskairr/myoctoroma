import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { Client, Message } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import ClientList from "@/components/ClientList";
import ConversationHistory from "@/components/ConversationHistory";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Loader2, Send, AlertTriangle, Wifi, WifiOff, Edit, Check, X } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  // Больше не используем состояние ошибки для WebSocket
  const socketRef = useRef<WebSocket | null>(null);
  
  // Запрос данных пользователя
  const userQuery = useQuery<{ id: number; email: string; username: string }>({
    queryKey: ["${import.meta.env.VITE_BACKEND_URL}/api/user"],
    staleTime: Infinity,
  });
  
  // Запрос списка клиентов
  const clientsQuery = useQuery<{ clients: Client[] }>({
    queryKey: ["${import.meta.env.VITE_BACKEND_URL}/api/clients"],
    refetchInterval: 30000, // Обновлять каждые 30 секунд
  });
  
  type ClientDetailsResponse = {
    client: Client;
    messages: Message[];
  };
  
  // Запрос деталей выбранного клиента и истории сообщений
  const clientDetailsQuery = useQuery<ClientDetailsResponse>({
    queryKey: ["${import.meta.env.VITE_BACKEND_URL}/api/clients", selectedClientId],
    enabled: !!selectedClientId,
    refetchInterval: 5000, // Обновлять каждые 5 секунд при выборе
    retry: 3, // Повторить запрос до 3 раз в случае ошибки
    retryDelay: 1000 // Задержка между повторными запросами (1 секунда)
  });

  // Мутация для обновления имени клиента
  const updateClientNameMutation = useMutation({
    mutationFn: async ({ telegramId, customName }: { telegramId: string; customName: string }) => {
      const response = await apiRequest("POST", `${import.meta.env.VITE_BACKEND_URL}/api/clients/${telegramId}/update-name`, { customName });
      return response.json();
    },
    onSuccess: (data) => {
      // Обновляем список клиентов и детали выбранного клиента
      queryClient.invalidateQueries({ queryKey: ["${import.meta.env.VITE_BACKEND_URL}/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["${import.meta.env.VITE_BACKEND_URL}/api/clients", selectedClientId] });
      
      toast({
        title: "Имя клиента обновлено",
        description: "Имя клиента успешно изменено.",
        variant: "default",
      });
    },
    onError: (error) => {
      console.error("Error updating client name:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить имя клиента. Пожалуйста, попробуйте еще раз.",
        variant: "destructive",
      });
    }
  });

  // Мутация для отправки сообщения клиенту
  const sendMessageMutation = useMutation({
    mutationFn: async ({ telegramId, message }: { telegramId: string; message: string }) => {
      const response = await apiRequest("POST", `${import.meta.env.VITE_BACKEND_URL}/api/clients/${telegramId}/send`, { message });
      return response.json();
    },
    onSuccess: () => {
      // Обновить данные клиента после отправки сообщения
      queryClient.invalidateQueries({ queryKey: ["${import.meta.env.VITE_BACKEND_URL}/api/clients", selectedClientId] });
      setNewMessage("");
      toast({
        title: "Сообщение отправлено",
        description: "Ваше сообщение успешно отправлено.",
        variant: "default",
      });
    },
    onError: (error) => {
      console.error("Error sending message:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось отправить сообщение. Пожалуйста, попробуйте еще раз.",
        variant: "destructive",
      });
    },
  });

  // Проверка параметров URL при загрузке страницы
  useEffect(() => {
    // Проверяем URL на наличие параметра clientId
    const searchParams = new URLSearchParams(window.location.search);
    const clientIdFromUrl = searchParams.get('clientId');
    
    if (clientIdFromUrl) {
      console.log(`Found clientId parameter in URL: ${clientIdFromUrl}`);
      setSelectedClientId(clientIdFromUrl);
    }
  }, []);

  // Применяем фильтрацию по филиалам к данным клиентов
  const filteredClients = useBranchFilter(clientsQuery.data?.clients);
  
  // Обновление списка клиентов при получении данных с учетом фильтрации
  useEffect(() => {
    if (filteredClients.length > 0) {
      setClients(filteredClients);
      
      // Проверяем, есть ли текущий выбранный клиент в отфильтрованном списке
      if (selectedClientId) {
        const clientStillExists = filteredClients.some(client => client.telegramId === selectedClientId);
        if (!clientStillExists) {
          // Если выбранного клиента больше нет в списке после фильтрации, сбросим выбор
          setSelectedClientId(null);
          setSelectedClient(null);
        }
      }
      
      // Выбрать первого клиента, если ни один не выбран и нет параметра в URL
      if (!selectedClientId && filteredClients.length > 0) {
        setSelectedClientId(filteredClients[0].telegramId);
      }
    } else {
      // Если нет клиентов после фильтрации, очищаем список
      setClients([]);
      if (selectedClientId) {
        setSelectedClientId(null);
        setSelectedClient(null);
      }
    }
  }, [filteredClients, selectedClientId]);

  // Обновление данных выбранного клиента и сообщений
  useEffect(() => {
    if (clientDetailsQuery.isError) {
      console.error("Error fetching client details:", clientDetailsQuery.error);
      
      // Выводим более подробную информацию об ошибке для отладки
      if (clientDetailsQuery.error instanceof Error) {
        console.error("Error details:", clientDetailsQuery.error.message, clientDetailsQuery.error.stack);
      }
      
      toast({
        title: "Ошибка загрузки данных",
        description: "Не удалось загрузить информацию о клиенте. Повторите попытку.",
        variant: "destructive",
      });
    }
    
    if (clientDetailsQuery.data) {
      console.log("Client details loaded successfully:", clientDetailsQuery.data);
      
      // Проверка на наличие клиента в ответе
      if (clientDetailsQuery.data.client) {
        console.log("Setting selected client:", clientDetailsQuery.data.client);
        setSelectedClient(clientDetailsQuery.data.client);
        
        // Сбросить индикатор непрочитанных сообщений
        setClients(prevClients => {
          return prevClients.map(client => {
            if (client.telegramId === selectedClientId) {
              return {
                ...client,
                hasUnreadMessages: false
              };
            }
            return client;
          });
        });
      } else {
        console.warn("No client data in response for ID:", selectedClientId);
        setSelectedClient(null);
      }
      
      // Проверка на наличие сообщений в ответе
      if (Array.isArray(clientDetailsQuery.data.messages)) {
        console.log(`Loaded ${clientDetailsQuery.data.messages.length} messages for client`);
        setMessages(clientDetailsQuery.data.messages);
        
        // Определить тему разговора на основе первых 5 сообщений от клиента
        if (clientDetailsQuery.data.messages.length > 0 && selectedClientId) {
          const clientMessages = clientDetailsQuery.data.messages
            .filter(msg => msg.isFromClient)
            .slice(0, 5);
            
          if (clientMessages.length > 0 && !conversationTopics[selectedClientId]) {
            determineConversationTopic(clientMessages, selectedClientId);
          }
        }
      } else {
        console.warn("Messages array is not present in response");
        // Если сообщений нет, установить пустой массив
        setMessages([]);
      }
    }
  }, [clientDetailsQuery.data, clientDetailsQuery.isError, clientDetailsQuery.error, selectedClientId, conversationTopics, toast]);

  // Инициализация WebSocket соединения
  useEffect(() => {
    // Получение ID пользователя для идентификации соединения
    const currentUserId = userQuery.data?.id;
    
    if (!currentUserId) {
      console.log("Waiting for user ID before establishing WebSocket connection");
      return;
    }
    
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 10; // Увеличено максимальное количество попыток
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let heartbeatTimer: ReturnType<typeof setTimeout> | null = null;
    
    // Функция для создания WebSocket соединения
    const createWebSocketConnection = () => {
      // Закрыть существующее соединение, если оно есть
      if (socketRef.current) {
        try {
          socketRef.current.close();
        } catch (err) {
          console.error("Error closing existing WebSocket:", err);
        }
      }
      
      // Определение URL для WebSocket
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      console.log(`Attempting to connect to WebSocket at ${wsUrl} (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`);
      
      try {
        // Создание нового соединения
        const socket = new WebSocket(wsUrl);
        socketRef.current = socket;
        
        // Устанавливаем таймаут для соединения
        const connectionTimeout = setTimeout(() => {
          if (socket.readyState !== WebSocket.OPEN) {
            console.log("WebSocket connection timeout");
            try {
              socket.close();
            } catch (error) {
              console.error("Error closing timed out socket:", error);
            }
          }
        }, 15000); // 15 секунд на соединение
        
        // Обработка открытия соединения
        socket.onopen = () => {
          console.log("✅ WebSocket connection established successfully");
          clearTimeout(connectionTimeout);
          setWsConnected(true);
          // WSConnected становится true
          reconnectAttempts = 0; // Сбрасываем счетчик попыток после успешного соединения
          
          // Идентификация клиента на сервере
          if (socket.readyState === WebSocket.OPEN) {
            try {
              socket.send(JSON.stringify({
                type: 'identify',
                userId: currentUserId.toString()
              }));
              console.log("Sent identification message to server");
            } catch (error) {
              console.error("Failed to send identification message:", error);
            }
          }
        };
        
        // Обработка ошибок соединения
        socket.onerror = (error) => {
          console.error("❌ WebSocket error:", error);
          clearTimeout(connectionTimeout);
          setWsConnected(false);
          // Статус соединения обновлен выше
        };
        
        // Обработка закрытия соединения
        socket.onclose = (event) => {
          console.log(`WebSocket connection closed (code: ${event.code}, reason: ${event.reason || 'No reason given'})`);
          clearTimeout(connectionTimeout);
          
          if (heartbeatTimer) {
            clearTimeout(heartbeatTimer);
            heartbeatTimer = null;
          }
          
          setWsConnected(false);
          
          // Попытка переподключения с экспоненциальной задержкой
          if (document.visibilityState === 'visible') {
            // Рассчитываем задержку, но не больше 15 секунд
            const delay = Math.min(1000 * Math.pow(1.5, reconnectAttempts % 8), 15000);
            console.log(`Scheduling WebSocket reconnection in ${delay}ms (attempt ${reconnectAttempts + 1})`);
            
            if (reconnectTimer) {
              clearTimeout(reconnectTimer);
            }
            
            reconnectTimer = setTimeout(() => {
              reconnectAttempts++;
              createWebSocketConnection();
            }, delay);
          }
        };
        
        // Обработка входящих сообщений
        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log("📩 WebSocket message received:", data);
            
            // Обработка heartbeat
            if (data.type === 'heartbeat') {
              console.log("Received heartbeat from server");
              
              // Отправляем ответный heartbeat
              if (socket.readyState === WebSocket.OPEN) {
                try {
                  socket.send(JSON.stringify({ type: 'heartbeat_response' }));
                } catch (error) {
                  console.error("Error sending heartbeat response:", error);
                }
              }
              
              return;
            }
        
            if (data.type === 'identification_successful') {
              console.log("WebSocket identification successful:", data.message || "No additional info");
              
              // Запрос актуального списка клиентов после успешной идентификации
              queryClient.invalidateQueries({ queryKey: ["${import.meta.env.VITE_BACKEND_URL}/api/clients"] });
              
              // Запрос данных текущего клиента, если он выбран
              if (selectedClientId) {
                queryClient.invalidateQueries({ queryKey: ["${import.meta.env.VITE_BACKEND_URL}/api/clients", selectedClientId] });
              }
            } 
            else if (data.type === 'new_message') {
              console.log("New message from WebSocket received:", {
                telegramId: data.telegramId,
                messageId: data.message?.id,
                content: data.message?.content?.substring(0, 30) + (data.message?.content?.length > 30 ? '...' : ''),
                isFromClient: data.message?.isFromClient,
                selectedClientId: selectedClientId
              });
              
              // Если сообщение для текущего выбранного клиента, обновить список сообщений
              if (data.telegramId === selectedClientId && data.message) {
                console.log("This message is for the current selected client - updating conversation");
                console.log("Received message object:", data.message);
                
                setMessages(prevMessages => {
                  // Преобразуем дату из строки в объект Date, если необходимо
                  let messageToAdd = data.message;
                  if (typeof data.message.timestamp === 'string') {
                    messageToAdd = {
                      ...data.message,
                      timestamp: new Date(data.message.timestamp)
                    };
                  }
                  
                  // Проверка на дубликаты сообщений
                  const messageExists = prevMessages.some(msg => 
                    msg.id === messageToAdd.id || 
                    (msg.timestamp?.toString() === messageToAdd.timestamp?.toString() && 
                     msg.content === messageToAdd.content && 
                     msg.isFromClient === messageToAdd.isFromClient)
                  );
                  
                  if (messageExists) {
                    console.log("Duplicate message detected, ignoring");
                    return prevMessages;
                  }
                  
                  console.log("Adding new message to conversation");
                  return [...prevMessages, messageToAdd];
                });
                
                // Обновить статус активности клиента
                setClients(prevClients => {
                  return prevClients.map(client => {
                    if (client.telegramId === data.telegramId) {
                      return {
                        ...client,
                        isActive: true,
                        lastActiveAt: new Date()
                      };
                    }
                    return client;
                  });
                });
                
                // Обработка сообщений клиента для определения темы разговора
                if (data.message.isFromClient) {
                  const clientMessages = messages
                    .filter(msg => msg.isFromClient)
                    .slice(0, 4) // Получить последние 4 сообщения
                    .concat(data.message); // Добавить новое сообщение
                    
                  if (clientMessages.length > 0 && !conversationTopics[data.telegramId]) {
                    determineConversationTopic(clientMessages, data.telegramId);
                  }
                }
              } else {
                // Если сообщение для другого клиента, обновить его статус в списке
                console.log(`Received message for other client ${data.telegramId}`);
                
                setClients(prevClients => {
                  return prevClients.map(client => {
                    if (client.telegramId === data.telegramId) {
                      return {
                        ...client,
                        isActive: true,
                        lastActiveAt: new Date(),
                        hasUnreadMessages: true
                      };
                    }
                    return client;
                  });
                });
                
                // Показать уведомление о новом сообщении от другого клиента
                if (data.message && data.message.isFromClient) {
                  const client = clients.find(c => c.telegramId === data.telegramId);
                  if (client) {
                    toast({
                      title: `Новое сообщение от ${client.username || client.firstName || 'клиента'}`,
                      description: data.message.content.substring(0, 50) + (data.message.content.length > 50 ? '...' : ''),
                      variant: "default",
                    });
                  }
                }
                
                // Также обновим данные клиентов, чтобы получить актуальный список
                queryClient.invalidateQueries({ queryKey: ["${import.meta.env.VITE_BACKEND_URL}/api/clients"] });
              }
            }
          } catch (error) {
            console.error("Error processing WebSocket message:", error);
          }
        };
      } catch (error) {
        console.error("Error creating WebSocket:", error);
        setWsConnected(false);
        // Не показываем ошибку, система просто повторит попытку соединения
        
        // Попытка переподключения при ошибке создания соединения
        const delay = Math.min(1000 * Math.pow(1.5, reconnectAttempts % 8), 15000);
        console.log(`Scheduling WebSocket reconnection after creation error in ${delay}ms (attempt ${reconnectAttempts + 1})`);
        
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
        }
        
        reconnectTimer = setTimeout(() => {
          reconnectAttempts++;
          createWebSocketConnection();
        }, delay);
      }
    };
    
    // Инициализация WebSocket соединения
    createWebSocketConnection();
    
    // Автоматическое переподключение при смене видимости страницы
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log("Page became visible, checking WebSocket connection");
        
        // Если нет соединения или не в процессе подключения, то переподключаемся
        if (socketRef.current?.readyState !== WebSocket.OPEN && 
            socketRef.current?.readyState !== WebSocket.CONNECTING) {
          console.log("WebSocket connection lost while page was hidden, reconnecting...");
          createWebSocketConnection();
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Очистка при размонтировании компонента
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      
      if (heartbeatTimer) {
        clearTimeout(heartbeatTimer);
      }
      
      if (socketRef.current) {
        console.log("Closing WebSocket connection on component unmount");
        try {
          socketRef.current.close();
          socketRef.current = null;
        } catch (err) {
          console.error("Error closing WebSocket on cleanup:", err);
        }
      }
    };
  }, [userQuery.data?.id, queryClient, selectedClientId, toast, messages, clients, conversationTopics]);

  // Определение темы разговора на основе содержания сообщений
  const determineConversationTopic = (clientMessages: Message[], telegramId: string) => {
    // Если тема уже определена, не пересчитывать
    if (conversationTopics[telegramId]) return;
    
    // Простой алгоритм определения темы на основе содержания сообщений
    let content = clientMessages.map(msg => msg.content).join(" ");
    let topic = "Общий вопрос";
    
    // Ключевые слова для определения темы - адаптировано для массажного салона
    const topicKeywords: Record<string, string[]> = {
      "Запись на массаж": ["запись", "записаться", "записать", "забронировать", "забронировать время", "визит", "прийти", "приду"],
      "Классический массаж": ["классический", "классика", "обычный", "стандартный", "общий"],
      "Лечебный массаж": ["лечебный", "лечение", "триггер", "триггерный", "оздоровительный", "спина болит", "шея болит", "боли"],
      "Арома и релакс": ["арома", "аромамасло", "релакс", "расслабляющий", "расслабление", "стресс", "усталость", "отдых"],
      "Спортивный массаж": ["спортивный", "спорт", "тренировка", "интенсивный", "мышцы", "растяжка", "после тренировки"],
      "Информация о ценах": ["сколько стоит", "цена", "стоимость", "прайс", "прайс-лист", "руб", "сом", "дорого", "дешево"],
      "Расположение и график": ["адрес", "где находится", "как добраться", "часы работы", "работаете", "режим работы", "до скольки", "с которого часа"],
      "Подарочные сертификаты": ["подарок", "подарить", "сертификат", "подарочный"],
      "Другие услуги": ["бочка", "кедровая", "стоун", "камни", "медовый", "огненный", "4 руки", "детский", "для беременных", "беременность"]
    };
    
    // Проверка наличия ключевых слов в содержании
    const contentLower = content.toLowerCase();
    for (const [topicName, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(keyword => contentLower.includes(keyword.toLowerCase()))) {
        topic = topicName;
        break;
      }
    }
    
    // Сохранить тему разговора
    setConversationTopics(prev => ({
      ...prev,
      [telegramId]: topic
    }));
  };

  // Обработчик выбора клиента
  const handleClientSelect = async (telegramId: string) => {
    console.log(`Selecting client with ID: ${telegramId}`);
    
    try {
      // Находим клиента в локальном списке
      const client = clients.find(c => c.telegramId === telegramId);
      
      if (client) {
        console.log("Found client in local list, setting as selected:", client);
        setSelectedClient(client); // Сразу устанавливаем клиента для более быстрого отображения
      } else {
        console.warn(`Client with ID ${telegramId} not found in the current client list`);
      }
      
      // Устанавливаем ID выбранного клиента
      setSelectedClientId(telegramId);
      
      // Прямой запрос к API для получения данных клиента
      try {
        console.log(`Directly fetching data for client ${telegramId}`);
        const response = await apiRequest("GET", `${import.meta.env.VITE_BACKEND_URL}/api/clients/${telegramId}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log("Successfully fetched client data directly:", data);
          
          if (data.client) {
            setSelectedClient(data.client);
            setMessages(data.messages || []);
            console.log(`✅ Client ${telegramId} selected and data loaded directly via API`);
          } else {
            toast({
              title: "Клиент не найден",
              description: "Не удалось получить данные клиента",
              variant: "destructive",
            });
          }
        } else {
          console.error(`Error fetching client ${telegramId} data:`, await response.text());
        }
      } catch (directFetchError) {
        console.error("Error during direct client data fetch:", directFetchError);
      }
      
      // Инвалидируем запрос с деталями клиента, чтобы обновить кэш
      queryClient.invalidateQueries({ queryKey: ["${import.meta.env.VITE_BACKEND_URL}/api/clients", telegramId] });
    } catch (error) {
      console.error("Error in handleClientSelect:", error);
      toast({
        title: "Ошибка выбора клиента",
        description: "Произошла ошибка при выборе клиента. Попробуйте еще раз.",
        variant: "destructive",
      });
    }
  };

  // Обработчик начала редактирования имени клиента
  const handleStartEditingName = () => {
    if (!selectedClient) return;
    
    // Устанавливаем текущее имя в поле ввода или пустую строку, если имя не задано
    setCustomNameInput(selectedClient.customName || "");
    setIsEditingName(true);
  };
  
  // Обработчик сохранения имени клиента
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
  
  // Обработчик отмены редактирования имени
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

  // Форматирование даты для отображения
  const formatDate = (date: Date | string | undefined) => {
    if (!date) return "Н/Д";
    return format(new Date(date), "dd.MM.yyyy", { locale: ru });
  };

  // Форматирование времени для отображения
  const formatDateTime = (date: Date | string | undefined) => {
    if (!date) return "Н/Д";
    
    const dateObj = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const isToday = dateObj.toDateString() === today.toDateString();
    const isYesterday = dateObj.toDateString() === yesterday.toDateString();
    
    if (isToday) {
      return `Сегодня, ${format(dateObj, "HH:mm", { locale: ru })}`;
    } else if (isYesterday) {
      return `Вчера, ${format(dateObj, "HH:mm", { locale: ru })}`;
    }
    
    return format(dateObj, "dd.MM.yyyy, HH:mm", { locale: ru });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-semibold text-gray-900">Клиенты</h1>
        
        {/* Индикатор WebSocket соединения полностью убран */}
      </div>
      
      {/* Индикатор "Офлайн режим" полностью убран */}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Список клиентов */}
        {clientsQuery.isLoading ? (
          <div className="col-span-1 bg-surface rounded-lg shadow flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <ClientList 
            clients={clients} 
            selectedClientId={selectedClientId} 
            onClientSelect={handleClientSelect}
            conversationTopics={conversationTopics}
          />
        )}
        
        {/* Детали клиента и история сообщений */}
        <div className="bg-surface rounded-lg shadow lg:col-span-2 flex flex-col h-[calc(100vh-9rem)]">
          <div className="p-4 border-b">
            <h2 className="text-lg font-medium">Информация о клиенте</h2>
          </div>
          
          {clientDetailsQuery.isLoading ? (
            <div className="flex items-center justify-center p-12 flex-grow">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !selectedClient ? (
            <div className="p-6 text-center text-muted-foreground flex-grow">
              Клиент не выбран или не найден
            </div>
          ) : (
            <>
              <div className="p-4 border-b">
                <div className="flex justify-between items-start">
                  <div className="grid grid-cols-2 gap-4 flex-grow">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">ID клиента</p>
                      <p className="font-medium">{selectedClient.telegramId}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Статус</p>
                      <StatusBadge status={selectedClient.isActive ? "Active" : "Inactive"} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Имя пользователя</p>
                      <p className="font-medium">{selectedClient.username || "Н/Д"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">ФИО</p>
                      <p className="font-medium">
                        {`${selectedClient.firstName || ""} ${selectedClient.lastName || ""}`.trim() || "Н/Д"}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground mb-1">Имя клиента</p>
                        {!isEditingName && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-primary"
                            onClick={handleStartEditingName}
                          >
                            <Edit className="h-3.5 w-3.5 mr-1" />
                            Изменить
                          </Button>
                        )}
                      </div>
                      {isEditingName ? (
                        <div className="flex items-center space-x-2">
                          <Input
                            value={customNameInput}
                            onChange={(e) => setCustomNameInput(e.target.value)}
                            placeholder="Введите имя клиента..."
                            className="flex-grow"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={handleSaveCustomName}
                            disabled={updateClientNameMutation.isPending}
                          >
                            {updateClientNameMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={handleCancelEditingName}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <p className="font-medium text-primary">
                          {selectedClient.customName || "Имя не задано"}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="ml-4">
                    <p className="text-sm text-muted-foreground mb-1">Тема разговора</p>
                    <Badge className="bg-primary/20 text-primary hover:bg-primary/30 py-1 px-2">
                      {conversationTopics[selectedClient.telegramId] || "Определяется..."}
                    </Badge>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Первое обращение</p>
                    <p className="font-medium">{formatDate(selectedClient.firstSeenAt)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Последняя активность</p>
                    <p className="font-medium">{formatDateTime(selectedClient.lastActiveAt)}</p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 border-b">
                <h3 className="font-medium mb-2">История сообщений</h3>
              </div>
              
              <div className="flex-grow overflow-hidden flex flex-col">
                <div className="flex-grow overflow-y-auto p-4">
                  <ConversationHistory client={selectedClient} messages={messages} />
                </div>
                
                <Card className="m-4 mt-2 border rounded-lg">
                  <div className="p-3">
                    <Textarea
                      placeholder="Введите сообщение для клиента..."
                      className="min-h-24 resize-none"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.ctrlKey) {
                          handleSendMessage();
                        }
                      }}
                    />
                    <div className="flex justify-between items-center mt-2">
                      <div className="text-xs text-muted-foreground">
                        Нажмите Ctrl+Enter для отправки
                      </div>
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
                            Отправить сообщение
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}