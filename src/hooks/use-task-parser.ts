import { useState, useEffect, useRef } from 'react';
import { taskParserService, getDateRange } from '@/services/task-parser';
import type { TaskParserResponse } from '@/services/task-parser';

export interface UseTaskParserOptions {
  // Автоматически запускать парсер при монтировании
  autoStart?: boolean;
  // Кастомные параметры для API
  customParams?: Record<string, string>;
  // Колбэк для обработки данных
  onDataReceived?: (data: TaskParserResponse) => void;
  // Колбэк для обработки ошибок
  onError?: (error: Error) => void;
  // Дата для фильтрации (если не указана, используется текущая дата)
  date?: Date;
}

export interface TaskParserState {
  // Последние полученные данные
  data: TaskParserResponse | null;
  // Статус парсера
  isRunning: boolean;
  // Количество подписчиков
  subscribersCount: number;
  // Последняя ошибка
  error: string | null;
  // Время последнего обновления
  lastUpdate: string | null;
}

export const useTaskParser = (options: UseTaskParserOptions = {}) => {
  const {
    autoStart = false,
    customParams = {},
    onDataReceived,
    onError,
    date = new Date()
  } = options;

  // Состояние парсера
  const [state, setState] = useState<TaskParserState>({
    data: null,
    isRunning: false,
    subscribersCount: 0,
    error: null,
    lastUpdate: null
  });

  // Ref для хранения функции отписки
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Обновление статуса парсера
  const updateStatus = () => {
    const status = taskParserService.getStatus();
    setState(prev => ({
      ...prev,
      isRunning: status.isRunning,
      subscribersCount: status.subscribersCount
    }));
  };

  // Функция для запуска парсера
  const startParser = (targetDate?: Date) => {
    try {
      const dateToUse = targetDate || date;
      const { scheduledAfter, scheduledBefore } = getDateRange(dateToUse);
      
      const params = {
        scheduledAfter,
        scheduledBefore,
        ...customParams
      };

      console.log('[useTaskParser] Starting parser with params:', params);
      
      taskParserService.start(params);
      updateStatus();
      
      setState(prev => ({
        ...prev,
        error: null
      }));
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        error: errorMessage
      }));
      
      if (onError) {
        onError(error instanceof Error ? error : new Error(errorMessage));
      }
    }
  };

  // Функция для остановки парсера
  const stopParser = () => {
    try {
      console.log('[useTaskParser] Stopping parser');
      taskParserService.stop();
      updateStatus();
      
      setState(prev => ({
        ...prev,
        error: null
      }));
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        error: errorMessage
      }));
      
      if (onError) {
        onError(error instanceof Error ? error : new Error(errorMessage));
      }
    }
  };

  // Ручной запрос данных
  const fetchManually = async (targetDate?: Date) => {
    try {
      setState(prev => ({ ...prev, error: null }));
      
      const dateToUse = targetDate || date;
      const { scheduledAfter, scheduledBefore } = getDateRange(dateToUse);
      
      const params = {
        scheduledAfter,
        scheduledBefore,
        ...customParams
      };

      console.log('[useTaskParser] Manual fetch with params:', params);
      
      const result = await taskParserService.fetchTasksForDateRange(
        scheduledAfter, 
        scheduledBefore, 
        customParams
      );
      
      setState(prev => ({
        ...prev,
        data: result,
        lastUpdate: result.timestamp
      }));
      
      if (onDataReceived) {
        onDataReceived(result);
      }
      
      return result;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        error: errorMessage
      }));
      
      if (onError) {
        onError(error instanceof Error ? error : new Error(errorMessage));
      }
      
      throw error;
    }
  };

  // Эффект для автоматического запуска
  useEffect(() => {
    if (autoStart) {
      console.log('[useTaskParser] Auto-starting parser');
      startParser();
    }

    // Cleanup при размонтировании компонента
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [autoStart]);

  // Эффект для подписки на обновления
  useEffect(() => {
    // Подписываемся на обновления от парсера
    const unsubscribe = taskParserService.subscribe((data: TaskParserResponse) => {
      console.log('[useTaskParser] Received data:', data);
      
      setState(prev => ({
        ...prev,
        data: data,
        lastUpdate: data.timestamp,
        error: data.success ? null : 'Failed to fetch data'
      }));
      
      if (onDataReceived) {
        onDataReceived(data);
      }
      
      if (!data.success && onError) {
        onError(new Error('Failed to fetch data from API'));
      }
    });

    unsubscribeRef.current = unsubscribe;
    updateStatus();

    // Cleanup при изменении зависимостей
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [onDataReceived, onError]);

  // Эффект для обновления параметров при изменении даты
  useEffect(() => {
    if (state.isRunning) {
      // Перезапускаем парсер с новыми параметрами
      console.log('[useTaskParser] Date changed, restarting parser');
      stopParser();
      setTimeout(() => startParser(), 100);
    }
  }, [date]);

  return {
    // Состояние
    ...state,
    
    // Методы управления
    start: startParser,
    stop: stopParser,
    fetchManually,
    
    // Утилиты
    isActive: state.isRunning,
    hasData: !!state.data,
    tasksCount: state.data?.count || 0,
    
    // Restart функция для удобства
    restart: () => {
      stopParser();
      setTimeout(() => startParser(), 100);
    }
  };
};

// Дополнительный хук для простого использования с конкретной датой
export const useTaskParserForDate = (
  date: Date,
  options: Omit<UseTaskParserOptions, 'date'> = {}
) => {
  return useTaskParser({
    ...options,
    date
  });
};

// Хук для автоматического парсинга с колбэками
export const useAutoTaskParser = (
  onDataReceived: (data: TaskParserResponse) => void,
  options: Omit<UseTaskParserOptions, 'onDataReceived' | 'autoStart'> = {}
) => {
  return useTaskParser({
    ...options,
    onDataReceived,
    autoStart: true
  });
};
