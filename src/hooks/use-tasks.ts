import { useQuery } from '@tanstack/react-query';
import { useBranch } from '@/contexts/BranchContext';
import { useAuth } from '@/contexts/SimpleAuthContext';
import { getBranchId } from '@/utils/branch-utils';
import { apiGetJson } from '@/lib/api';
import { useMasters, type Master } from './use-masters';
import { useMemo } from 'react';

// Interface for Task from API
export interface TaskFromAPI {
  id: string; // ID может быть строкой
  clientId: number;
  status: string;
  serviceType: string | null;
  serviceServiceId?: number;
  serviceDuration: number | null;
  servicePrice: number | null;
  discount?: number;
  finalPrice: number | null;
  scheduleDate: string | null; // Формат: YYYY-MM-DDTHH:MM:SS.sssZ (только дата, время всегда 00:00:00.000Z)
  scheduleTime: string | null;
  endTime: string | null;
  masterId: number | null;
  masterName?: string | null; // Может приходить с API, но мы будем перезаписывать
  notes: string | null;
  branchId: string;
  source?: string | null;
  chatId?: string | null;
  mother?: string | null;
  paymentMethod?: string | null;
  adminName?: string | null;
  paid?: string;
  createdAt?: string; // Формат: YYYY-MM-DDTHH:MM:SS.sssZ (полная timestamp с временем)
  updatedAt?: string; // Формат: YYYY-MM-DDTHH:MM:SS.sssZ (полная timestamp с временем)
  client?: {
    id: number;
    telegramId: string;
    firstName?: string;
    lastName?: string;
    username?: string;
    customName?: string;
    phoneNumber?: string;
    branchId?: string;
    organisationId?: number | null;
    firstSeenAt?: string; // Формат: YYYY-MM-DDTHH:MM:SS.sssZ (полная timestamp с временем)
    lastActiveAt?: string; // Формат: YYYY-MM-DDTHH:MM:SS.sssZ (полная timestamp с временем)
    isActive?: boolean;
  };
}

// Enhanced task interface with master information
export interface TaskWithMaster extends TaskFromAPI {
  masterName: string | null; // Перезаписывается данными из masters API
  master?: Master | null;
  clientName?: string; // Вычисляемое поле для совместимости
}

// Parameters for tasks query
export interface TasksQueryParams {
  branchId?: string;
  scheduledAfter?: string;
  scheduledBefore?: string;
  sortBy?: 'scheduleDate' | 'scheduleTime' | 'clientName' | 'serviceType' | 'masterName';
  sortOrder?: 'asc' | 'desc';
  userMasterId?: number;
  userRole?: string;
  status?: string;
}

/**
 * Universal hook for fetching tasks with master information
 * Can be used for calendar, dashboard, and any other component that needs tasks data
 */
export function useTasks(params: TasksQueryParams = {}) {
  const { currentBranch } = useBranch();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  
  // Получаем мастеров для присваивания имен
  const { data: mastersData = [], isLoading: mastersLoading } = useMasters();
  
  // Определяем параметры запроса
  const branchId = params.branchId || getBranchId(currentBranch);
  
  // Базовые параметры запроса
  const queryParams = new URLSearchParams();
  
  if (branchId) queryParams.append('branchId', branchId);
  if (params.scheduledAfter) queryParams.append('scheduledAfter', params.scheduledAfter);
  if (params.scheduledBefore) queryParams.append('scheduledBefore', params.scheduledBefore);
  if (params.sortBy) queryParams.append('sortBy', params.sortBy);
  if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
  if (params.status) queryParams.append('status', params.status);
  
  // Пользовательские параметры
  if (params.userRole || user?.role) {
    queryParams.append('userRole', params.userRole || user?.role || '');
  }
  // Используем masterId (новое поле) с fallback на master_id (deprecated)
  const userMasterId = user?.masterId || user?.master_id;
  if (params.userMasterId || userMasterId) {
    queryParams.append('userMasterId', (params.userMasterId || userMasterId || '').toString());
  }
  
  const endpoint = `/api/tasks?${queryParams.toString()}`;
  
  console.log("🔍 useTasks Debug:");
  console.log("  - endpoint:", endpoint);
  console.log("  - params:", params);
  console.log("  - branchId:", branchId);
  console.log("  - mastersData length:", mastersData.length);

  // Запрос задач
  const tasksQuery = useQuery({
    queryKey: ['tasks', endpoint],
    queryFn: async (): Promise<TaskFromAPI[]> => {
      console.log("📡 Making tasks API request to:", endpoint);
      
      const data = await apiGetJson<TaskFromAPI[]>(endpoint);
      console.log("📦 Raw tasks API Response:", data);
      
      // Проверяем формат ответа и возвращаем массив задач
      if (Array.isArray(data)) {
        return data;
      }
      
      // Если данные в другом формате, пытаемся извлечь массив
      if (data && typeof data === 'object' && 'tasks' in data) {
        return (data as any).tasks || [];
      }
      
      return [];
    },
    enabled: !!branchId && isAuthenticated && !!user && !authLoading && !mastersLoading,
    staleTime: 1000 * 30, // 30 seconds - данные считаются свежими 30 секунд
    refetchInterval: 1000 * 30, // 30 seconds - автоматическое обновление каждые 30 секунд
    refetchIntervalInBackground: false, // НЕ обновлять когда вкладка неактивна (экономим ресурсы)
    refetchOnWindowFocus: true, // Обновлять при возврате на вкладку
    refetchOnMount: true, // Обновлять при монтировании компонента
  });

  // Объединяем данные задач с информацией о мастерах
  const tasksWithMasters = useMemo(() => {
    if (!tasksQuery.data || mastersLoading) {
      return [];
    }

    console.log("🔄 Merging tasks with master information...");
    console.log("  - Raw tasks count:", tasksQuery.data.length);
    console.log("  - Masters available:", mastersData.length);

    // Создаем карту мастеров для быстрого поиска
    const mastersMap = new Map(mastersData.map(master => [master.id, master]));
    console.log("  - Masters available IDs:", Array.from(mastersMap.keys()));

    const mergedTasks: TaskWithMaster[] = tasksQuery.data.map(task => {
      const master = task.masterId ? mastersMap.get(task.masterId) : null;
      const masterName = master ? master.name : null;
      
      // Вычисляем clientName для совместимости со старым кодом
      const clientName = task.client?.customName || 
                        task.client?.firstName || 
                        (task.client?.firstName && task.client?.lastName ? 
                          `${task.client.firstName} ${task.client.lastName}` : '') ||
                        'Клиент';
      
      const mergedTask: TaskWithMaster = {
        ...task,
        masterName, // Перезаписываем данными из masters API
        master,
        clientName // Добавляем вычисляемое поле
      };

      if (task.masterId && !master) {
        console.warn(`⚠️ Master not found for masterId: ${task.masterId} in task ${task.id}`);
      }

      return mergedTask;
    });

    console.log("✅ Tasks merged with master information:", mergedTasks.length);
    
    // Логируем статистику
    const tasksWithMasters = mergedTasks.filter(t => t.masterName);
    const tasksWithoutMasters = mergedTasks.filter(t => !t.masterName && t.masterId);
    
    console.log("  - Tasks with master names:", tasksWithMasters.length);
    console.log("  - Tasks without master names:", tasksWithoutMasters.length);
    
    if (mergedTasks.length > 0) {
      console.log("  - Sample merged task:", {
        id: mergedTasks[0].id,
        clientName: mergedTasks[0].clientName,
        masterId: mergedTasks[0].masterId,
        masterName: mergedTasks[0].masterName,
        serviceType: mergedTasks[0].serviceType,
        scheduleDate: mergedTasks[0].scheduleDate,
        scheduleTime: mergedTasks[0].scheduleTime
      });
    }

    return mergedTasks;
  }, [tasksQuery.data, mastersData, mastersLoading]);

  return {
    data: tasksWithMasters,
    isLoading: tasksQuery.isLoading || mastersLoading,
    error: tasksQuery.error,
    refetch: tasksQuery.refetch,
    isFetching: tasksQuery.isFetching
  };
}

/**
 * Hook for fetching tasks for a specific date (used by calendar)
 */
export function useTasksForDate(selectedDate: Date = new Date()) {
  // Формируем даты для запроса - с 23:59 предыдущего дня до 23:59 текущего дня
  const scheduledAfter = new Date(selectedDate);
  scheduledAfter.setDate(scheduledAfter.getDate() - 1); // Предыдущий день
  scheduledAfter.setHours(23, 59, 0, 0); // 23:59 предыдущего дня
  
  const scheduledBefore = new Date(selectedDate);
  scheduledBefore.setHours(23, 59, 59, 999); // 23:59 текущего дня
  
  console.log('📅 useTasksForDate:', {
    selectedDate: selectedDate.toISOString(),
    scheduledAfter: scheduledAfter.toISOString(),
    scheduledBefore: scheduledBefore.toISOString()
  });
  
  return useTasks({
    scheduledAfter: scheduledAfter.toISOString(),
    scheduledBefore: scheduledBefore.toISOString(),
    sortBy: 'scheduleDate',
    sortOrder: 'asc'
  });
}

/**
 * Hook for fetching tasks for a date range (used by dashboard)
 */
export function useTasksForDateRange(startDate: Date, endDate: Date, additionalParams: Partial<TasksQueryParams> = {}) {
  // Начинаем с 23:59 дня перед startDate
  const scheduledAfter = new Date(startDate);
  scheduledAfter.setDate(scheduledAfter.getDate() - 1); // Предыдущий день
  scheduledAfter.setHours(23, 59, 0, 0); // 23:59 предыдущего дня
  
  // Заканчиваем в 23:59 endDate
  const scheduledBefore = new Date(endDate);
  scheduledBefore.setHours(23, 59, 59, 999); // 23:59 конечного дня
  
  return useTasks({
    scheduledAfter: scheduledAfter.toISOString(),
    scheduledBefore: scheduledBefore.toISOString(),
    sortBy: 'scheduleDate',
    sortOrder: 'asc',
    ...additionalParams
  });
}

/**
 * Hook for fetching tasks for current user (if they are a master)
 */
export function useMyTasks(selectedDate?: Date) {
  const { user } = useAuth();
  
  // Используем masterId (новое поле) с fallback на master_id (deprecated)
  const userMasterId = user?.masterId || user?.master_id;
  
  if (!userMasterId) {
    return {
      data: [],
      isLoading: false,
      error: null,
      refetch: () => Promise.resolve(),
      isFetching: false
    };
  }

  const params: TasksQueryParams = {
    userMasterId: userMasterId,
    userRole: 'master'
  };

  if (selectedDate) {
    // Начинаем с 23:59 предыдущего дня
    const scheduledAfter = new Date(selectedDate);
    scheduledAfter.setDate(scheduledAfter.getDate() - 1); // Предыдущий день
    scheduledAfter.setHours(23, 59, 0, 0); // 23:59 предыдущего дня
    
    // Заканчиваем в 23:59 выбранного дня
    const scheduledBefore = new Date(selectedDate);
    scheduledBefore.setHours(23, 59, 59, 999); // 23:59 текущего дня
    
    params.scheduledAfter = scheduledAfter.toISOString();
    params.scheduledBefore = scheduledBefore.toISOString();
  }

  return useTasks(params);
}
