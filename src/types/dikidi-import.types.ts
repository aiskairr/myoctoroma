/**
 * DIKIDI Import API Types
 * 
 * Интерфейсы для работы с API импорта DIKIDI данных
 * Поддержка multi-tenant с использованием branchId
 */

/**
 * Статус импорта
 */
export type ImportStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

/**
 * Статус бронирования
 */
export type BookingStatus = 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';

/**
 * Ответ от сервера при загрузке файла
 */
export interface UploadFileResponse {
  success: boolean;
  data?: {
    jobId: string;
    status: ImportStatus;
    mastersCreated: number;
    servicesCreated: number;
    bookingsImported: number;
  };
  error?: string;
  code?: string;
}

/**
 * Ответ при импорте из пути
 */
export interface ImportFromPathRequest {
  filePath: string;
}

export interface ImportFromPathResponse {
  success: boolean;
  data?: {
    jobId: string;
    status: ImportStatus;
    mastersCreated: number;
    servicesCreated: number;
    bookingsImported: number;
  };
  error?: string;
  code?: string;
}

/**
 * Импортированное бронирование
 */
export interface ImportedBooking {
  id: number;
  branch: string;
  date: string;
  time: string;
  master: string;
  service: string;
  client_name: string;
  client_phone: string;
  status: BookingStatus;
}

/**
 * Параметры для получения списка бронирований
 */
export interface ListBookingsParams {
  page?: number;
  limit?: number;
}

/**
 * Ответ при получении списка бронирований
 */
export interface ListBookingsResponse {
  success: boolean;
  data?: ImportedBooking[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  error?: string;
  code?: string;
}

/**
 * Статистика импорта по мастерам
 */
export interface BookingsByMaster {
  [masterName: string]: number;
}

/**
 * Статистика импорта
 */
export interface ImportStats {
  branch: string;
  totalBookings: number;
  totalMasters: number;
  totalServices: number;
  dateRange: {
    from: string;
    to: string;
  };
  bookingsByMaster: BookingsByMaster;
}

/**
 * Ответ при получении статистики
 */
export interface StatsResponse {
  success: boolean;
  data?: ImportStats;
  error?: string;
  code?: string;
}

/**
 * Параметры для очистки данных
 */
export interface ClearDataParams {
  confirm?: boolean;
}

/**
 * Ответ при очистке данных
 */
export interface ClearDataResponse {
  success: boolean;
  data?: {
    branch: string;
    recordsDeleted: number;
    message: string;
  };
  error?: string;
  code?: string;
}

/**
 * Общий формат ответа от API
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

/**
 * Конфигурация импорта
 */
export interface ImportConfig {
  branchId: string;
  maxRetries?: number;
  timeout?: number;
}

/**
 * Состояние импорта для UI
 */
export interface ImportState {
  isLoading: boolean;
  error: string | null;
  success: boolean;
  jobId?: string;
  status: ImportStatus;
  data?: {
    mastersCreated: number;
    servicesCreated: number;
    bookingsImported: number;
  };
}

/**
 * Состояние списка бронирований
 */
export interface BookingsListState {
  isLoading: boolean;
  error: string | null;
  bookings: ImportedBooking[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

/**
 * Состояние статистики
 */
export interface StatsState {
  isLoading: boolean;
  error: string | null;
  stats?: ImportStats;
}

/**
 * Ошибка API
 */
export interface ApiError {
  message: string;
  code: string;
  status?: number;
}

/**
 * Параметры фильтрации для бронирований
 */
export interface BookingsFilterParams {
  page?: number;
  limit?: number;
  masterName?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: BookingStatus;
}
