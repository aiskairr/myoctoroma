/**
 * ZAPISIKZ Import API Types
 * 
 * Интерфейсы для работы с API импорта ZAPISIKZ данных
 * Поддержка multi-tenant с использованием branchId
 */

/**
 * Статус импорта
 */
export type ZapisikzImportStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * Ответ от сервера при загрузке файла
 */
export interface ZapisikzUploadFileResponse {
  success: boolean;
  data?: {
    jobId: string;
    status: ZapisikzImportStatus;
    fileName: string;
  };
  error?: string;
  code?: string;
}

/**
 * Статистика импорта
 */
export interface ZapisikzImportStats {
  mastersCreated: number;
  mastersSkipped: number;
  clientsCreated: number;
  clientsSkipped: number;
  bookingsCreated: number;
  bookingsDuplicated: number;
  errors: string[];
}

/**
 * Информация о задаче импорта
 */
export interface ZapisikzImportJob {
  jobId: string;
  status: ZapisikzImportStatus;
  fileName?: string;
  branchId: string;
  startTime?: string;
  endTime?: string;
  stats?: ZapisikzImportStats;
  error?: string;
}

/**
 * Ответ при получении статуса импорта
 */
export interface ZapisikzStatusResponse {
  success: boolean;
  data?: ZapisikzImportJob;
  error?: string;
  code?: string;
}

/**
 * Ответ при получении списка всех импортов
 */
export interface ZapisikzJobsListResponse {
  success: boolean;
  data?: {
    totalJobs: number;
    jobs: ZapisikzImportJob[];
  };
  error?: string;
  code?: string;
}

/**
 * Ответ при удалении импорта
 */
export interface ZapisikzDeleteResponse {
  success: boolean;
  message?: string;
  error?: string;
  code?: string;
}

/**
 * Общий формат ответа от API
 */
export interface ZapisikzApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}
