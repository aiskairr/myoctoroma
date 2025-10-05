import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Interface for Task from API
export interface Task {
  id: number;
  clientId: number;
  clientName: string;
  status: string;
  serviceType: string | null;
  scheduleDate: string | null;
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
}

// Hook to fetch task by ID
export const useTask = (taskId: number | null) => {
  return useQuery<Task>({
    queryKey: ['/api/tasks', taskId],
    queryFn: async () => {
      if (!taskId) {
        throw new Error('Task ID is required');
      }

      try {
        const url = `${import.meta.env.VITE_BACKEND_URL}/api/tasks/${taskId}`;
        console.log('📡 Task API URL:', url);
        
        const response = await fetch(url, {
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
            throw new Error(`Ошибка загрузки задачи: ${response.status} - ${errorText}`);
          }
        }

        const data = await response.json();
        console.log('✅ Loaded task:', data);
        return data;
      } catch (error) {
        console.error('❌ Failed to fetch task:', error);
        throw error;
      }
    },
    enabled: !!taskId && taskId > 0,
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

  // Format date from ISO to DD.MM.YYYY
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

  // Map API status to form status
  const mapStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      'scheduled': 'Записан',
      'confirmed': 'Подтвержден',
      'in-progress': 'В процессе',
      'completed': 'Завершен',
      'cancelled': 'Отменен'
    };
    return statusMap[status] || status;
  };

  return {
    clientName: task.client?.customName || task.client?.firstName || task.clientName || '',
    phone: task.client?.phoneNumber || '',
    notes: task.notes || '',
    time: task.scheduleTime || '',
    duration: formatDuration(task.serviceDuration, task.servicePrice),
    serviceType: task.serviceType || '',
    master: task.masterName || '',
    status: mapStatus(task.status),
    branch: task.branchId || '',
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
  scheduleDate: string; // ISO date format
  scheduleTime: string; // HH:MM format
  serviceType: string;
  masterId: number;
  serviceDuration: number;
  servicePrice: number;
  branchId: string;
  discount?: number;
  finalPrice?: number;
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
        method: 'PUT',
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
