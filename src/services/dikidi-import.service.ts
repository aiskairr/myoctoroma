/**
 * DIKIDI Import API Service
 * 
 * Сервис для работы с DIKIDI импортом
 * Все методы поддерживают multi-tenant с branchId
 */

import type {
  UploadFileResponse,
  ImportFromPathRequest,
  ImportFromPathResponse,
  ListBookingsResponse,
  ListBookingsParams,
  StatsResponse,
  ClearDataResponse,
  ClearDataParams,
} from '@/types/dikidi-import.types';
import { createApiUrl } from '@/utils/api-url';

const API_BASE = '/api/branches';

/**
 * Создает URL для DIKIDI импорта
 */
const getDikidiUrl = (branchId: string, endpoint: string): string => {
  return createApiUrl(`${API_BASE}/${branchId}/imports/dikidi${endpoint}`);
};

/**
 * Проверка наличия branchId
 */
const validateBranchId = (branchId: string): void => {
  if (!branchId || typeof branchId !== 'string') {
    throw new Error('branchId is required and must be a string');
  }
};

/**
 * DIKIDI Import API Service
 */
export class DikidiImportService {
  /**
   * Загрузка Excel файла для импорта
   * POST /api/branches/{branchId}/imports/dikidi/file
   */
  static async uploadFile(
    branchId: string,
    file: File
  ): Promise<UploadFileResponse> {
    try {
      validateBranchId(branchId);

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(getDikidiUrl(branchId, '/file'), {
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

      return await response.json();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
        code: 'UPLOAD_ERROR',
      };
    }
  }

  /**
   * Импорт из файлового пути на сервере
   * POST /api/branches/{branchId}/imports/dikidi/path
   */
  static async importFromPath(
    branchId: string,
    request: ImportFromPathRequest
  ): Promise<ImportFromPathResponse> {
    try {
      validateBranchId(branchId);

      const response = await fetch(getDikidiUrl(branchId, '/path'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Import failed',
        code: 'IMPORT_ERROR',
      };
    }
  }

  /**
   * Получить список импортированных бронирований
   * GET /api/branches/{branchId}/imports/dikidi/list
   */
  static async getBookingsList(
    branchId: string,
    params?: ListBookingsParams
  ): Promise<ListBookingsResponse> {
    try {
      validateBranchId(branchId);

      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());

      const baseUrl = getDikidiUrl(branchId, '/list');
      const url = queryParams.toString() ? `${baseUrl}?${queryParams.toString()}` : baseUrl;

      const response = await fetch(url, {
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
        error: error instanceof Error ? error.message : 'Failed to fetch bookings',
        code: 'FETCH_ERROR',
      };
    }
  }

  /**
   * Получить статистику импорта
   * GET /api/branches/{branchId}/imports/dikidi/stats
   */
  static async getStats(branchId: string): Promise<StatsResponse> {
    try {
      validateBranchId(branchId);

      const response = await fetch(getDikidiUrl(branchId, '/stats'), {
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
        error: error instanceof Error ? error.message : 'Failed to fetch stats',
        code: 'FETCH_ERROR',
      };
    }
  }

  /**
   * Очистить все импортированные данные
   * DELETE /api/branches/{branchId}/imports/dikidi/clear
   */
  static async clearData(
    branchId: string,
    params?: ClearDataParams
  ): Promise<ClearDataResponse> {
    try {
      validateBranchId(branchId);

      const queryParams = new URLSearchParams();
      if (params?.confirm) queryParams.append('confirm', 'true');

      const baseUrl = getDikidiUrl(branchId, '/clear');
      const url = queryParams.toString() ? `${baseUrl}?${queryParams.toString()}` : baseUrl;

      const response = await fetch(url, {
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
        error: error instanceof Error ? error.message : 'Failed to clear data',
        code: 'DELETE_ERROR',
      };
    }
  }
}

export default DikidiImportService;
