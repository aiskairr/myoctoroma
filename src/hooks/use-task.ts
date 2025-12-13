import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBranch } from '@/contexts/BranchContext';

// Interface for Task from API
export interface Task {
  id: number;
  clientId: number;
  clientName: string;
  status: string;
  serviceType: string | null;
  scheduleDate: string | null; // Формат: YYYY-MM-DD
  scheduleTime: string | null;
  endTime: string | null;
  masterName: string | null;
  masterId: number | null;
  serviceDuration: number | null;
  servicePrice: number | null;
  notes: string | null;
  instanceId: number | null;
  branchId: string;
  discount?: number;
  finalPrice?: number;
  client?: {
    telegramId: string;
    firstName?: string;
    lastName?: string;
    customName?: string;
    phoneNumber?: string;
  };
  master?: {
    id: number;
    name: string;
    specialization?: string;
    description?: string;
    isActive?: boolean;
    photoUrl?: string;
    gender?: string;
  };
}

// Hook to fetch task by ID
export const useTask = (taskId: number | null) => {
  const { currentBranch } = useBranch();
  const branchId = currentBranch?.id?.toString() || localStorage.getItem('currentBranchId') || '';
  
  return useQuery<Task>({
    queryKey: ['/assignments', taskId, branchId],
    queryFn: async () => {
      if (!taskId || !branchId) {
        throw new Error('Task ID and branchId are required');
      }

      try {
        // Добавляем cache-buster, чтобы избежать 304 без тела
        const url = `${import.meta.env.VITE_SECONDARY_BACKEND_URL}/assignments/${taskId}?branchId=${branchId}&_=${Date.now()}`;
        console.log('📡 Task API URL:', url);
        const token = localStorage.getItem('auth_token');
        
        const response = await fetch(url, {
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'If-Modified-Since': '0',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          cache: 'no-store'
        });

        if (response.status === 304) {
          throw new Error('Not Modified');
        }

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Необходима авторизация');
          } else if (response.status === 404) {
            throw new Error('Задача не найдена');
          } else {
            const errorText = await response.text();
            throw new Error(`Ошибка загрузки задачи: ${response.status} - ${errorText}`);
          }
        }

        const raw = await response.json();
        const payload = (raw && typeof raw === 'object' && 'data' in raw) ? (raw as any).data : raw;

        const shiftTime = (timeStr?: string | null, offsetHours = 6) => {
          if (!timeStr) return null;
          const [h, m] = timeStr.split(':').map(Number);
          if (Number.isNaN(h) || Number.isNaN(m)) return timeStr;
          const d = new Date(Date.UTC(1970, 0, 1, h, m, 0, 0));
          d.setUTCHours(d.getUTCHours() + offsetHours);
          const hh = String(d.getUTCHours()).padStart(2, '0');
          const mm = String(d.getUTCMinutes()).padStart(2, '0');
          return `${hh}:${mm}`;
        };

        // Если это assignment формат, нормализуем под Task
        if (payload && typeof payload === 'object' && ('assignment_date' in payload || 'start_time' in payload)) {
          const scheduleDateIso = payload.assignment_date
            ? new Date(payload.assignment_date).toISOString().split('T')[0]
            : null;

          const normalized: Task = {
            id: Number(payload.id),
            clientId: payload.client_id || 0,
            clientName: payload.client_snapshot?.first_name || payload.clientName || '',
            status: payload.status || 'scheduled',
            serviceType: payload.service_snapshot?.name || payload.serviceType || null,
            scheduleDate: scheduleDateIso,
            scheduleTime: shiftTime(payload.start_time, 6) || payload.scheduleTime,
            endTime: shiftTime(payload.end_time, 6) || payload.endTime,
            masterName: payload.employee_snapshot
              ? `${payload.employee_snapshot.first_name || ''} ${payload.employee_snapshot.last_name || ''}`.trim()
              : payload.masterName || null,
            masterId: payload.employee_id || payload.masterId || null,
            serviceDuration: payload.service_snapshot?.duration ?? payload.serviceDuration ?? null,
            servicePrice: payload.service_snapshot?.price ?? payload.servicePrice ?? null,
            notes: payload.notes || null,
            instanceId: payload.instanceId || null,
            branchId: payload.branch_id?.toString?.() || payload.branchId || '',
            discount: payload.discount ? Number(payload.discount) : undefined,
            finalPrice: payload.final_price ? Number(payload.final_price) : payload.finalPrice ?? undefined,
            client: payload.client_snapshot
              ? {
                  telegramId: payload.client_snapshot.telegram_id,
                  firstName: payload.client_snapshot.first_name,
                  lastName: payload.client_snapshot.last_name,
                  customName: payload.client_snapshot.custom_name,
                  phoneNumber: payload.client_snapshot.phone_number,
                  branchId: payload.branch_id?.toString?.(),
                  organisationId: payload.organization_id,
                }
              : undefined,
            master: undefined,
            serviceType: payload.service_snapshot?.name || payload.serviceType || null,
          };

          console.log('✅ Loaded assignment normalized:', normalized);
          return normalized;
        }

        console.log('✅ Loaded task (raw):', payload);
        return payload;
      } catch (error) {
        console.error('❌ Failed to fetch task:', error);
        throw error;
      }
    },
    enabled: !!taskId && taskId > 0 && !!branchId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
  });
};

// Helper function to format task data for form
export const formatTaskForForm = (task: Task | undefined) => {
  if (!task) {
    return {
      clientName: '',
      phone: '',
      notes: '',
      time: '',
      duration: '',
      serviceType: '',
      master: '',
      status: '',
      branch: '',
      date: '',
      discount: '0',
      cost: '0'
    };
  }

  // Format scheduleDate from API format (YYYY-MM-DDTHH:MM:SS.sssZ) to DD.MM.YYYY for display
  // scheduleDate comes as: "2025-06-10T00:00:00.000Z" - contains date only in UTC
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return '';
    }
  };

  // Format duration and price for select
  const formatDuration = (duration: number | null, price: number | null) => {
    if (!duration || !price) return '';
    return `${duration} мин - ${price} сом`;
  };

  // Map API status to form status (оставляем английский статус для формы)
  const mapStatus = (status: string) => {
    // Убираем перевод, возвращаем оригинальный статус для корректной работы формы
    return status;
  };

  return {
    clientName: task.client?.customName || task.client?.firstName || task.clientName || '',
    phone: task.client?.phoneNumber || '',
    notes: task.notes || '',
    time: task.scheduleTime || '',
    duration: formatDuration(task.serviceDuration, task.servicePrice),
    serviceType: task.serviceType || '',
    master: task.master?.name || task.masterName || '',
    status: mapStatus(task.status),
    branch: task.branchId || '1', // Устанавливаем филиал по умолчанию если нет
    date: formatDate(task.scheduleDate),
    discount: (task.discount || 0).toString(),
    cost: (task.finalPrice || task.servicePrice || 0).toString()
  };
};

// Interface for creating a new task
export interface CreateTaskRequest {
  id: string; // Уникальный ID в формате {OrganisationID}{BranchID}{UniqueNumber}
  clientName: string;
  clientPhone?: string;
  notes?: string;
  scheduleDate: string; // Формат: YYYY-MM-DD
  scheduleTime: string; // HH:MM format
  endTime: string; // HH:MM format - обязательное поле
  serviceType: string;
  masterId: number;
  serviceDuration: number;
  servicePrice: number;
  finalPrice: number; // Обязательное поле: servicePrice - discount
  branchId: string;
  discount?: number;
  status?: string;
}

// Функция генерации уникального ID для задачи
export const generateTaskId = (organisationId?: string | number, branchId?: string | number): string => {
  // Генерируем 8-значный ID
  // Диапазон: 10000000 - 99999999
  const min = 10000000;
  const max = 99999999;
  const randomId = Math.floor(Math.random() * (max - min + 1)) + min;
  return randomId.toString();
};

// Hook to create a new task
export const useCreateTask = () => {
  const queryClient = useQueryClient();
  
  return useMutation<Task, Error, CreateTaskRequest>({
    mutationFn: async (taskData: CreateTaskRequest) => {
      console.log('📤 Creating new task:', taskData);
      
      const url = `${import.meta.env.VITE_BACKEND_URL}/api/tasks`;
      
      const response = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(taskData)
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Необходима авторизация');
        } else if (response.status === 400) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Неверные данные задачи');
        } else {
          const errorText = await response.text();
          throw new Error(`Ошибка создания задачи: ${response.status} - ${errorText}`);
        }
      }

      const newTask = await response.json();
      console.log('✅ Task created successfully:', newTask);
      return newTask;
    },
    onSuccess: (newTask) => {
      // Invalidate calendar tasks queries to refresh the calendar
      queryClient.invalidateQueries({ queryKey: ['calendar-tasks'] });
      
      // Optionally add the new task to the cache
      queryClient.setQueryData(['/api/tasks', newTask.id], newTask);
      
      console.log('🔄 Invalidated calendar-tasks queries after task creation');
    },
    onError: (error) => {
      console.error('❌ Failed to create task:', error);
    }
  });
};

// Interface for updating an existing task
export interface UpdateTaskRequest extends Partial<Omit<CreateTaskRequest, 'id'>> {
  id: number; // ID для обновления остается числовым
}

// Hook to update an existing task
export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  
  return useMutation<Task, Error, UpdateTaskRequest>({
    mutationFn: async ({ id, ...taskData }: UpdateTaskRequest) => {
      console.log('📤 Updating task:', id, taskData);
      
      const url = `${import.meta.env.VITE_BACKEND_URL}/api/tasks/${id}`;
      
      const response = await fetch(url, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(taskData)
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Необходима авторизация');
        } else if (response.status === 404) {
          throw new Error('Задача не найдена');
        } else if (response.status === 400) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Неверные данные задачи');
        } else {
          const errorText = await response.text();
          throw new Error(`Ошибка обновления задачи: ${response.status} - ${errorText}`);
        }
      }

      const updatedTask = await response.json();
      console.log('✅ Task updated successfully:', updatedTask);
      return updatedTask;
    },
    onSuccess: (updatedTask) => {
      // Update the specific task in cache
      queryClient.setQueryData(['/api/tasks', updatedTask.id], updatedTask);
      
      // Invalidate calendar tasks queries to refresh the calendar
      queryClient.invalidateQueries({ queryKey: ['calendar-tasks'] });
      
      console.log('🔄 Updated task cache and invalidated calendar-tasks queries');
    },
    onError: (error) => {
      console.error('❌ Failed to update task:', error);
    }
  });
};

// Hook to delete a task
export const useDeleteTask = () => {
  const queryClient = useQueryClient();
  
  return useMutation<void, Error, number>({
    mutationFn: async (taskId: number) => {
      console.log('🗑️ Deleting task:', taskId);
      
      const url = `${import.meta.env.VITE_BACKEND_URL}/api/tasks/${taskId}`;
      
      const response = await fetch(url, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Необходима авторизация');
        } else if (response.status === 404) {
          throw new Error('Задача не найдена');
        } else {
          const errorText = await response.text();
          throw new Error(`Ошибка удаления задачи: ${response.status} - ${errorText}`);
        }
      }

      console.log('✅ Task deleted successfully');
    },
    onSuccess: (_, taskId) => {
      // Remove the task from cache
      queryClient.removeQueries({ queryKey: ['/api/tasks', taskId] });
      
      // Invalidate calendar tasks queries to refresh the calendar
      queryClient.invalidateQueries({ queryKey: ['calendar-tasks'] });
      
      console.log('🔄 Removed task from cache and invalidated calendar-tasks queries');
    },
    onError: (error) => {
      console.error('❌ Failed to delete task:', error);
    }
  });
};
