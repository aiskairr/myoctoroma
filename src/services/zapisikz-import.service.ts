/**
 * ZAPISIKZ Import API Service
 * 
 * Сервис для работы с ZAPISIKZ импортом календаря записей
 * Все методы поддерживают multi-tenant с branchId
 */

import type {
  ZapisikzUploadFileResponse,
  ZapisikzStatusResponse,
  ZapisikzJobsListResponse,
  ZapisikzDeleteResponse,
} from '@/types/zapisikz-import.types';
import { createApiUrl } from '@/utils/api-url';

const API_BASE = '/api/import/zapisikz';

/**
 * Создает URL для ZAPISIKZ импорта
 */
const getZapisikzUrl = (endpoint: string): string => {
  return createApiUrl(`${API_BASE}${endpoint}`);
};

/**
 * ZAPISIKZ Import API Service
 */
export class ZapisikzImportService {
  /**
   * Загрузка Excel файла для импорта
   * POST /api/import/zapisikz/upload
   */
  static async uploadFile(
    file: File,
    branchId?: string
  ): Promise<ZapisikzUploadFileResponse> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (branchId) {
        formData.append('branchId', branchId);
      }

      const response = await fetch(getZapisikzUrl('/upload'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      
      // Backend может вернуть: { jobId, status, message, fileName }
      // Преобразуем в унифицированный формат
      if (result.jobId && result.status) {
        return {
          success: true,
          data: {
            jobId: result.jobId,
            status: result.status,
            fileName: result.fileName,
          },
        };
      }
      
      // Или может вернуть уже обёрнутый формат: { success, data }
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
        code: 'UPLOAD_ERROR',
      };
    }
  }

  /**
   * Получить статус задачи импорта
   * GET /api/import/zapisikz/status/:jobId
   */
  static async getJobStatus(jobId: string): Promise<ZapisikzStatusResponse> {
    try {
      const response = await fetch(getZapisikzUrl(`/status/${jobId}`), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      
      // Backend может вернуть прямой объект job: { jobId, status, ... }
      // Преобразуем в унифицированный формат
      if (result.jobId && result.status) {
        return {
          success: true,
          data: result,
        };
      }
      
      // Или может вернуть уже обёрнутый формат: { success, data }
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch status',
        code: 'FETCH_ERROR',
      };
    }
  }

  /**
   * Получить список всех импортов
   * GET /api/import/zapisikz/jobs
   */
  static async getJobsList(): Promise<ZapisikzJobsListResponse> {
    try {
      const response = await fetch(getZapisikzUrl('/jobs'), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch jobs list',
        code: 'FETCH_ERROR',
      };
    }
  }

  /**
   * Удалить задачу импорта
   * DELETE /api/import/zapisikz/jobs/:jobId
   */
  static async deleteJob(jobId: string): Promise<ZapisikzDeleteResponse> {
    try {
      const response = await fetch(getZapisikzUrl(`/jobs/${jobId}`), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete job',
        code: 'DELETE_ERROR',
      };
    }
  }
}

export default ZapisikzImportService;
