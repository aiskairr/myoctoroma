import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from './SimpleAuthContext';
import { useToast } from '@/hooks/use-toast';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
const WS_URL = BACKEND_URL.replace(/^http/, 'ws');

interface NotificationData {
  type: 'new_booking' | 'booking_cancelled' | 'booking_updated' | 'reminder' | 'system';
  title: string;
  message: string;
  data?: {
    taskId?: string;
    clientName?: string;
    serviceType?: string;
    scheduleTime?: string;
    scheduleDate?: string;
    masterId?: string;
    masterName?: string;
    [key: string]: any;
  };
  timestamp?: string;
  priority?: 'low' | 'normal' | 'high';
}

interface NotificationContextType {
  isConnected: boolean;
  lastNotification: NotificationData | null;
}

const NotificationContext = createContext<NotificationContextType>({
  isConnected: false,
  lastNotification: null,
});

export const useNotifications = () => useContext(NotificationContext);

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastNotification, setLastNotification] = useState<NotificationData | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = () => {
    if (!isAuthenticated || !user) {
      console.log('🔌 Not connecting to WebSocket: user not authenticated');
      return;
    }

    // Закрываем существующее соединение если есть
    if (wsRef.current) {
      wsRef.current.close();
    }

    try {
      console.log('🔌 Connecting to WebSocket:', `${WS_URL}/ws/notifications`);
      
      // Создаем WebSocket соединение
      const ws = new WebSocket(`${WS_URL}/ws/notifications?userId=${user.id}&role=${user.role}`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ WebSocket connected');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        
        // Отправляем информацию о пользователе
        ws.send(JSON.stringify({
          type: 'auth',
          userId: user.id,
          role: user.role,
          masterId: user.masterId || user.master_id,
          branchId: user.branchId,
        }));
      };

      ws.onmessage = (event) => {
        try {
          const notification: NotificationData = JSON.parse(event.data);
          console.log('📬 Received notification:', notification);
          
          setLastNotification(notification);
          
          // Показываем Toast уведомление
          showNotification(notification);
        } catch (error) {
          console.error('❌ Error parsing notification:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
      };

      ws.onclose = (event) => {
        console.log('🔌 WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        wsRef.current = null;

        // Автоматическое переподключение
        if (isAuthenticated && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          
          console.log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };
    } catch (error) {
      console.error('❌ Error creating WebSocket:', error);
    }
  };

  const showNotification = (notification: NotificationData) => {
    // Определяем иконку и цвет в зависимости от типа
    const getNotificationStyle = (type: string) => {
      switch (type) {
        case 'new_booking':
          return {
            icon: '📅',
            variant: 'default' as const,
            duration: 5000,
          };
        case 'booking_cancelled':
          return {
            icon: '❌',
            variant: 'destructive' as const,
            duration: 5000,
          };
        case 'booking_updated':
          return {
            icon: '✏️',
            variant: 'default' as const,
            duration: 4000,
          };
        case 'reminder':
          return {
            icon: '⏰',
            variant: 'default' as const,
            duration: 6000,
          };
        case 'system':
          return {
            icon: '🔔',
            variant: 'default' as const,
            duration: 4000,
          };
        default:
          return {
            icon: '📢',
            variant: 'default' as const,
            duration: 4000,
          };
      }
    };

    const style = getNotificationStyle(notification.type);

    // Формируем описание с деталями
    let description = notification.message;
    if (notification.data) {
      const details: string[] = [];
      
      if (notification.data.clientName) {
        details.push(`👤 ${notification.data.clientName}`);
      }
      if (notification.data.serviceType) {
        details.push(`💇 ${notification.data.serviceType}`);
      }
      if (notification.data.scheduleTime) {
        details.push(`⏰ ${notification.data.scheduleTime}`);
      }
      if (notification.data.scheduleDate) {
        details.push(`📅 ${notification.data.scheduleDate}`);
      }
      
      if (details.length > 0) {
        description = `${notification.message}\n\n${details.join('\n')}`;
      }
    }

    // Показываем Toast
    toast({
      title: `${style.icon} ${notification.title}`,
      description: description,
      variant: style.variant,
      duration: style.duration,
    });

    // Воспроизводим звук (опционально)
    try {
      const audio = new Audio('/notification-sound.mp3');
      audio.volume = 0.3;
      audio.play().catch(() => {
        // Игнорируем ошибки воспроизведения
      });
    } catch (error) {
      // Звук не критичен
    }
  };

  // Подключаемся при монтировании и при изменении аутентификации
  useEffect(() => {
    if (isAuthenticated && user) {
      connect();
    }

    // Очистка при размонтировании
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        console.log('🔌 Closing WebSocket connection');
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [isAuthenticated, user?.id]);

  // Переподключение при потере фокуса и возврате (например, вкладка была неактивна)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isAuthenticated && !isConnected) {
        console.log('👁️ Tab became visible, reconnecting...');
        connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, isConnected]);

  const value: NotificationContextType = {
    isConnected,
    lastNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      
      {/* Индикатор подключения (опционально, для отладки) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 left-4 z-50">
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
            isConnected 
              ? 'bg-green-100 text-green-800 border border-green-300' 
              : 'bg-gray-100 text-gray-600 border border-gray-300'
          }`}>
            {isConnected ? '🟢 WebSocket Connected' : '🔴 WebSocket Disconnected'}
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
}
