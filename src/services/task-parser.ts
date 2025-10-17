// Парсер для регулярных запросов к API tasks
export interface ParsedTask {
  id: number;
  clientId: number;
  client: {
    id: number;
    telegramId: string;
    firstName?: string;
    lastName?: string;
    customName?: string;
    phoneNumber?: string;
  };
  status: string;
  serviceType?: string;
  serviceServiceId?: number;
  serviceDuration?: number;
  duration?: number;
  servicePrice?: number;
  finalPrice?: number;
  scheduleDate?: string; // Формат: YYYY-MM-DD
  scheduleTime?: string;
  endTime?: string;
  masterName?: string;
  masterId?: number;
  branchId?: string;
  notes?: string;
  mother?: number;
  paid?: string;
  createdAt: string; // Формат: YYYY-MM-DD HH:mm:ss
}

export interface TaskParserResponse {
  success: boolean;
  data: ParsedTask[];
  timestamp: string;
  count: number;
}

class TaskParserService {
  private static instance: TaskParserService;
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private subscribers: ((data: TaskParserResponse) => void)[] = [];
  private queryClientInvalidator: (() => void) | null = null;
  
  // URL для парсинга
  private readonly API_URL = 'https://partial-elfrida-promconsulting-9e3c84f1.koyeb.app/api/tasks';
  private readonly DEFAULT_PARAMS = {
    branchId: '1',
    sortBy: 'scheduleDate',
    sortOrder: 'asc',
    userRole: 'superadmin'
  };

  private constructor() {}

  public static getInstance(): TaskParserService {
    if (!TaskParserService.instance) {
      TaskParserService.instance = new TaskParserService();
    }
    return TaskParserService.instance;
  }

  // Построение URL с параметрами
  private buildUrl(params: Record<string, string> = {}): string {
    const urlParams = new URLSearchParams({
      ...this.DEFAULT_PARAMS,
      ...params
    });
    return `${this.API_URL}?${urlParams.toString()}`;
  }

  // Отправка запроса к API
  private async fetchTasks(customParams: Record<string, string> = {}): Promise<TaskParserResponse> {
    try {
      const url = this.buildUrl(customParams);
      console.log(`[TaskParser] Fetching tasks from: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      const result: TaskParserResponse = {
        success: true,
        data: data || [],
        timestamp: new Date().toISOString(),
        count: data?.length || 0
      };

      console.log(`[TaskParser] Successfully fetched ${result.count} tasks at ${result.timestamp}`);
      return result;
      
    } catch (error) {
      console.error('[TaskParser] Error fetching tasks:', error);
      
      return {
        success: false,
        data: [],
        timestamp: new Date().toISOString(),
        count: 0
      };
    }
  }

  // Запуск парсера с интервалом в 1 минуту
  public start(customParams: Record<string, string> = {}): void {
    if (this.isRunning) {
      console.log('[TaskParser] Parser is already running');
      return;
    }

    console.log('[TaskParser] Starting task parser...');
    this.isRunning = true;

    // Немедленный первый запрос
    this.performRequest(customParams);

    // Запуск интервала каждые 6 секунд (6000 мс)
    this.intervalId = setInterval(() => {
      this.performRequest(customParams);
    }, 600);

    console.log('[TaskParser] Parser started successfully');
  }

  // Остановка парсера
  public stop(): void {
    if (!this.isRunning) {
      console.log('[TaskParser] Parser is not running');
      return;
    }

    console.log('[TaskParser] Stopping task parser...');
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.isRunning = false;
    console.log('[TaskParser] Parser stopped successfully');
  }

  // Выполнение запроса и уведомление подписчиков
  private async performRequest(customParams: Record<string, string> = {}): Promise<void> {
    const result = await this.fetchTasks(customParams);
    
    // Инвалидируем кэш React Query если установлен инвалидатор
    if (this.queryClientInvalidator && result.success) {
      try {
        this.queryClientInvalidator();
        console.log('[TaskParser] Query cache invalidated');
      } catch (error) {
        console.error('[TaskParser] Error invalidating query cache:', error);
      }
    }
    
    // Уведомляем всех подписчиков
    this.subscribers.forEach(callback => {
      try {
        callback(result);
      } catch (error) {
        console.error('[TaskParser] Error in subscriber callback:', error);
      }
    });
  }

  // Установка функции для инвалидации кэша React Query
  public setQueryInvalidator(invalidator: () => void): void {
    this.queryClientInvalidator = invalidator;
    console.log('[TaskParser] Query invalidator set');
  }

  // Удаление функции инвалидации
  public clearQueryInvalidator(): void {
    this.queryClientInvalidator = null;
    console.log('[TaskParser] Query invalidator cleared');
  }

  // Подписка на обновления
  public subscribe(callback: (data: TaskParserResponse) => void): () => void {
    this.subscribers.push(callback);
    
    // Возвращаем функцию отписки
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  // Получение статуса парсера
  public getStatus(): { isRunning: boolean; subscribersCount: number } {
    return {
      isRunning: this.isRunning,
      subscribersCount: this.subscribers.length
    };
  }

  // Ручной запрос данных
  public async manualFetch(customParams: Record<string, string> = {}): Promise<TaskParserResponse> {
    return this.fetchTasks(customParams);
  }

  // Запрос с конкретным диапазоном дат (как в примере)
  public async fetchTasksForDateRange(
    scheduledAfter: string, 
    scheduledBefore: string,
    additionalParams: Record<string, string> = {}
  ): Promise<TaskParserResponse> {
    const params = {
      scheduledAfter,
      scheduledBefore,
      ...additionalParams
    };
    
    return this.fetchTasks(params);
  }
}

// Экспорт синглтона
export const taskParserService = TaskParserService.getInstance();

// Вспомогательные функции для форматирования дат
export const formatDateForAPI = (date: Date): string => {
  return date.toISOString();
};

export const getDateRange = (date: Date): { scheduledAfter: string; scheduledBefore: string } => {
  // Начинаем с 23:59 предыдущего дня
  const startOfPeriod = new Date(date);
  startOfPeriod.setDate(startOfPeriod.getDate() - 1); // Предыдущий день
  startOfPeriod.setHours(23, 59, 0, 0); // 23:59 предыдущего дня
  
  // Заканчиваем в 23:59 текущего дня
  const endOfPeriod = new Date(date);
  endOfPeriod.setHours(23, 59, 59, 999); // 23:59 текущего дня
  
  return {
    scheduledAfter: formatDateForAPI(startOfPeriod),
    scheduledBefore: formatDateForAPI(endOfPeriod)
  };
};
