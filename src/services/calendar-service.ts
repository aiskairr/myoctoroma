import axios from 'axios';
import { format } from 'date-fns';

// Типы данных для мастеров и записей
export interface Master {
  id: number;
  name: string;
  specialization?: string; // Специализация мастера
  is_active: boolean;      // Активен ли мастер в данный момент
}

export interface Appointment {
  id: number;
  client_id?: number;      // ID клиента
  client_name: string;     // Имя клиента
  master_id: number;       // ID мастера
  master_name: string;     // Имя мастера
  appointment_date: string; // Дата записи в формате ISO
  start_time: string;      // Время начала (формат HH:MM)
  end_time: string;        // Время окончания (формат HH:MM)
  status: string;          // Статус (Booked, Completed, Canceled)
  service_type: string;    // Тип массажа
  price: number;           // Цена услуги
  notes?: string;          // Дополнительные заметки
  created_at?: string;     // Формат: YYYY-MM-DD (дата создания записи)
  updated_at?: string;     // Формат: YYYY-MM-DD (дата обновления записи)
  is_from_task?: boolean;  // Флаг, показывающий что запись создана из задачи
  duration?: number;       // Длительность в минутах
}

// Параметры для запроса записей
export interface AppointmentQueryParams {
  date?: string;           // Дата в формате YYYY-MM-DD
  masterId?: string;       // ID мастера (опционально)
  status?: string;         // Статус записи (опционально)
  branchId?: string;       // ID филиала (опционально)
}

// Интерфейс для клиентской задачи
export interface ClientTask {
  id: number;
  clientId: number;
  clientName: string;
  status: string;
  serviceType: string | null;
  scheduleDate: string | null; // Формат: YYYY-MM-DD
  scheduleTime: string | null;
  endTime: string | null;
  masterName: string | null;
  serviceDuration: number | null;
  servicePrice: number | null;
  notes: string | null;
  instanceId: number | null;
}

// Экспортируемый сервис для работы с календарем
export const calendarService = {
  // Форматирование даты для API запросов
  formatDate(date: Date): string {
    return format(date, 'yyyy-MM-dd');
  },

  // Получение списка мастеров
  async getMasters(): Promise<Master[]> {
    try {
      const response = await axios.get<Master[]>('${import.meta.env.VITE_BACKEND_URL}/api/crm/masters');
      return response.data;
    } catch (error) {
      console.error('Error fetching masters:', error);
      throw new Error('Failed to fetch masters');
    }
  },

  // Получение мастера по ID
  async getMaster(id: number): Promise<Master> {
    try {
      const response = await axios.get<Master>(`${import.meta.env.VITE_BACKEND_URL}/api/crm/masters/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching master ${id}:`, error);
      throw new Error(`Failed to fetch master ${id}`);
    }
  },

  // Получение списка записей
  async getAppointments(params: AppointmentQueryParams = {}): Promise<Appointment[]> {
    try {
      // Преобразуем пустые строки в null и удаляем их из запроса
      const cleanParams: Record<string, string> = {};
      
      // Убедимся, что все параметры корректны и не пустые
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          cleanParams[key] = String(value); // Явное преобразование в строку
        }
      });
      
      // Логируем параметры запроса для отладки
      console.log(`🔄 Calendar API: calling ${import.meta.env.VITE_BACKEND_URL}/api/crm/appointments with params:`, cleanParams);
      
      const response = await axios.get<Appointment[]>('${import.meta.env.VITE_BACKEND_URL}/api/crm/appointments', { params: cleanParams });
      
      console.log(`✅ Calendar API: received ${response.data.length} appointments`);
      return response.data;
    } catch (error) {
      console.error('Error fetching appointments:', error);
      throw new Error('Failed to fetch appointments');
    }
  },
  
  // Получение задач из карточек для календаря
  async getTasksForCalendar(params: AppointmentQueryParams = {}): Promise<Appointment[]> {
    try {
      // Преобразуем пустые строки в null и удаляем их из запроса
      const cleanParams: Record<string, string> = {};
      
      // Убедимся, что все параметры корректны и не пустые
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          cleanParams[key] = String(value); // Явное преобразование в строку
        }
      });
      
      // Логируем параметры запроса для отладки
      console.log(`🔄 Calendar API: calling ${import.meta.env.VITE_BACKEND_URL}/api/crm/tasks-calendar with params:`, cleanParams);
      
      const response = await axios.get<Appointment[]>('${import.meta.env.VITE_BACKEND_URL}/api/crm/tasks-calendar', { params: cleanParams });
      
      console.log(`✅ Calendar API: received ${response.data.length} tasks`);
      return response.data;
    } catch (error) {
      console.error('Error fetching tasks for calendar:', error);
      throw new Error('Failed to fetch tasks for calendar');
    }
  },

  // Получение записи по ID
  async getAppointment(id: number): Promise<Appointment> {
    try {
      const response = await axios.get<Appointment>(`${import.meta.env.VITE_BACKEND_URL}/api/crm/appointments/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching appointment ${id}:`, error);
      throw new Error(`Failed to fetch appointment ${id}`);
    }
  },

  // Получение клиентской задачи по ID
  async getClientTask(id: number): Promise<ClientTask> {
    try {
      const response = await axios.get<ClientTask>(`${import.meta.env.VITE_BACKEND_URL}/api/crm/tasks/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching client task ${id}:`, error);
      throw new Error(`Failed to fetch client task ${id}`);
    }
  },

  // Обновление клиентской задачи
  async updateClientTask(id: number, taskData: Partial<ClientTask>): Promise<ClientTask> {
    try {
      const response = await axios.post<ClientTask>(`${import.meta.env.VITE_BACKEND_URL}/api/crm/tasks/${id}`, taskData);
      return response.data;
    } catch (error: any) {
      console.error(`Error updating client task ${id}:`, error);
      if (error.response && error.response.data && error.response.data.message) {
        throw new Error(error.response.data.message);
      } else {
        throw new Error(`Не удалось обновить задачу. Пожалуйста, попробуйте еще раз.`);
      }
    }
  },

  // Создание новой записи
  async createAppointment(appointment: Omit<Appointment, 'id'>): Promise<Appointment> {
    try {
      const response = await axios.post<Appointment>('${import.meta.env.VITE_BACKEND_URL}/api/crm/appointments', appointment);
      return response.data;
    } catch (error: any) {
      console.error('Error creating appointment:', error);
      // Если сервер вернул сообщение об ошибке, используем его
      if (error.response && error.response.data && error.response.data.message) {
        throw new Error(error.response.data.message);
      } else {
        throw new Error('Не удалось создать запись. Пожалуйста, попробуйте еще раз.');
      }
    }
  },

  // Обновление существующей записи
  async updateAppointment(id: number, appointment: Partial<Appointment>): Promise<Appointment> {
    try {
      const response = await axios.post<Appointment>(`${import.meta.env.VITE_BACKEND_URL}/api/crm/appointments/${id}`, appointment);
      return response.data;
    } catch (error: any) {
      console.error(`Error updating appointment ${id}:`, error);
      // Если сервер вернул сообщение об ошибке, используем его
      if (error.response && error.response.data && error.response.data.message) {
        throw new Error(error.response.data.message);
      } else {
        throw new Error(`Не удалось обновить запись. Пожалуйста, попробуйте еще раз.`);
      }
    }
  },

  // Удаление записи
  async deleteAppointment(id: number): Promise<void> {
    try {
      await axios.delete(`${import.meta.env.VITE_BACKEND_URL}/api/crm/appointments/${id}`);
    } catch (error: any) {
      console.error(`Error deleting appointment ${id}:`, error);
      if (error.response && error.response.data && error.response.data.message) {
        throw new Error(error.response.data.message);
      } else {
        throw new Error(`Не удалось удалить запись №${id}. Пожалуйста, попробуйте еще раз.`);
      }
    }
  }
};