// Универсальная функция для API запросов с правильными CORS заголовками

import Cookies from "js-cookie";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

interface ApiRequestOptions extends RequestInit {
  skipPragmaHeader?: boolean;
  skipAuth?: boolean;
}

export const apiRequest = async (endpoint: string, options: ApiRequestOptions = {}) => {
  const { skipPragmaHeader = true, skipAuth = false, ...fetchOptions } = options;
  
  // Базовые заголовки без проблемных заголовков
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...((fetchOptions.headers as Record<string, string>) || {})
  };

  // Добавляем Bearer токен для аутентификации, если не пропускаем auth
  if (!skipAuth) {
    const token = Cookies.get('token');
    console.log('API Request - Token from cookies:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  // Убираем потенциально проблемные заголовки
  if (skipPragmaHeader) {
    delete headers['pragma'];
    delete headers['Pragma'];
    delete headers['cache-control'];
    delete headers['Cache-Control'];
  }

  const config: RequestInit = {
    credentials: 'include',
    ...fetchOptions,
    headers
  };

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, config);
    
    // Проверяем на 401 ошибку аутентификации
    if (response.status === 401) {
      console.error('🔒 Authentication failed. Token may be expired or invalid.');
      console.log('🔍 Token details:', {
        hasToken: !!Cookies.get('token'),
        tokenPreview: Cookies.get('token') ? `${Cookies.get('token')?.substring(0, 20)}...` : 'NO TOKEN'
      });
    }
    
    // Проверяем, что ответ действительно JSON, а не HTML
    const contentType = response.headers.get('content-type');
    if (response.ok && contentType && contentType.includes('application/json')) {
      return response;
    } else if (!response.ok) {
      // Если ошибка, пытаемся получить текст ошибки
      const text = await response.text();
      if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
        throw new Error(`Server returned HTML instead of JSON. Status: ${response.status}`);
      }
      throw new Error(`HTTP ${response.status}: ${text}`);
    }
    
    return response;
  } catch (error) {
    console.error('API Request failed:', error);
    throw error;
  }
};

// Специальная функция для GET запросов
export const apiGet = async (endpoint: string) => {
  return apiRequest(endpoint, { method: 'GET' });
};

// Специальная функция для GET запросов с автоматическим парсингом JSON
export const apiGetJson = async <T = any>(endpoint: string): Promise<T> => {
  const response = await apiGet(endpoint);
  
  const contentType = response.headers.get('content-type');
  if (!response.ok || !contentType || !contentType.includes('application/json')) {
    const text = await response.text();
    if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
      throw new Error(`Server returned HTML instead of JSON. Endpoint: ${endpoint}`);
    }
    throw new Error(`Invalid JSON response from ${endpoint}: ${text}`);
  }
  
  return response.json();
};

// Специальная функция для POST запросов  
export const apiPost = async (endpoint: string, data?: any) => {
  return apiRequest(endpoint, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined
  });
};

// Специальная функция для POST запросов с автоматическим парсингом JSON
export const apiPostJson = async <T = any>(endpoint: string, data?: any): Promise<T> => {
  const response = await apiPost(endpoint, data);
  
  const contentType = response.headers.get('content-type');
  if (!response.ok || !contentType || !contentType.includes('application/json')) {
    const text = await response.text();
    if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
      throw new Error(`Server returned HTML instead of JSON. Endpoint: ${endpoint}`);
    }
    throw new Error(`Invalid JSON response from ${endpoint}: ${text}`);
  }
  
  return response.json();
};

// Специальная функция для PUT запросов
export const apiPut = async (endpoint: string, data?: any) => {
  return apiRequest(endpoint, {
    method: 'PUT', 
    body: data ? JSON.stringify(data) : undefined
  });
};

// Специальная функция для DELETE запросов
export const apiDelete = async (endpoint: string) => {
  return apiRequest(endpoint, { method: 'DELETE' });
};
