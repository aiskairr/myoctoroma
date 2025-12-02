// Универсальная функция для API запросов с правильными CORS заголовками

import Cookies from "js-cookie";
import { requestTokenRefresh } from "@/API/http";

// Используем SECONDARY_BACKEND_URL для новых endpoints (/clients, /branches и т.д.)
// Для старых endpoints используем BACKEND_URL
const SECONDARY_API_BASE_URL = import.meta.env.VITE_SECONDARY_BACKEND_URL;
const PRIMARY_API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

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
    // Приоритет: сначала localStorage, потом cookies
    const token = localStorage.getItem('auth_token') || Cookies.get('token');
    console.log('API Request - Token source:', 
      localStorage.getItem('auth_token') ? 'localStorage' : (Cookies.get('token') ? 'cookies' : 'NO TOKEN'),
      token ? `${token.substring(0, 20)}...` : 'NO TOKEN'
    );
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

  // Определяем нужны ли credentials для этого эндпоинта
  // Используем credentials только для endpoints которым это действительно нужно
  const needsCredentials = endpoint.startsWith('/api/auth') || 
                          endpoint.startsWith('/api/organisation') ||
                          endpoint.includes('/whatsapp/');
  
  const config: RequestInit = {
    credentials: needsCredentials ? 'include' : 'omit',
    ...fetchOptions,
    headers
  };

  // Определяем какой базовый URL использовать
  // Новые endpoints (/clients, /branches, /user, /admin, /staffAuthorization, /booking) используют SECONDARY_API_BASE_URL
  // Старые endpoints (/api/*) используют PRIMARY_API_BASE_URL
  let baseUrl: string;
  if (endpoint.startsWith('http')) {
    baseUrl = '';
  } else if (endpoint.startsWith('/clients') || endpoint.startsWith('/branches') || endpoint.startsWith('/user') || endpoint.startsWith('/admin') || endpoint.startsWith('/staff') || endpoint.startsWith('/staffAuthorization') || endpoint.startsWith('/working-dates') || endpoint.startsWith('/booking')) {
    baseUrl = SECONDARY_API_BASE_URL;
  } else {
    baseUrl = PRIMARY_API_BASE_URL;
  }
  
  const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;
  
  console.log('🌐 API Request:', {
    method: config.method || 'GET',
    url: url,
    baseUrl: baseUrl,
    endpoint: endpoint,
    hasAuth: !!headers['Authorization'],
    authToken: headers['Authorization'] ? `${headers['Authorization'].substring(0, 30)}...` : 'NO AUTH',
    contentType: headers['Content-Type'],
    credentials: config.credentials
  });
  
  const executeRequest = async () => {
    const response = await fetch(url, config);
    return response;
  };

  try {
    let response = await executeRequest();

    if (response.status === 401 && !skipAuth) {
      console.warn('🔄 Access token expired. Attempting refresh before retry...');
      const newToken = await requestTokenRefresh().catch((err) => {
        console.error('❌ Token refresh failed:', err);
        return null;
      });

      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`;
        response = await executeRequest();
      }
    }

    // Проверяем на 401 ошибку аутентификации после повторной попытки
    if (response.status === 401) {
      console.error('🔒 Authentication failed. Token may be expired or invalid.');
      const token = localStorage.getItem('auth_token') || Cookies.get('token');
      console.log('🔍 Token details:', {
        hasTokenInLocalStorage: !!localStorage.getItem('auth_token'),
        hasTokenInCookies: !!Cookies.get('token'),
        tokenPreview: token ? `${token.substring(0, 20)}...` : 'NO TOKEN'
      });
    }
    
    // Проверяем, что ответ действительно JSON, а не HTML
    const contentType = response.headers.get('content-type');
    
    // Если ответ успешный, но Content-Type не JSON
    if (response.ok && (!contentType || !contentType.includes('application/json'))) {
      console.warn('⚠️ Server returned successful response but Content-Type is not JSON:', contentType);
      const text = await response.text();
      if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
        throw new Error(`Server returned HTML instead of JSON. Status: ${response.status}, Content-Type: ${contentType}`);
      }
      console.warn('⚠️ Non-JSON response text:', text.substring(0, 200) + '...');
      throw new Error(`Server returned non-JSON response. Status: ${response.status}, Content-Type: ${contentType}`);
    }
    
    // Если ответ успешный и Content-Type правильный
    if (response.ok && contentType && contentType.includes('application/json')) {
      return response;
    } 
    
    // Если ошибка HTTP статуса
    if (!response.ok) {
      const text = await response.text();
      if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
        throw new Error(`Server returned HTML error page. Status: ${response.status}`);
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
  
  // Парсинг уже проверен в apiRequest, но добавим дополнительную проверку
  try {
    return await response.json();
  } catch (error) {
    console.error('❌ JSON parsing failed for endpoint:', endpoint);
    const text = await response.text();
    if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
      throw new Error(`Server returned HTML instead of JSON. Endpoint: ${endpoint}`);
    }
    throw new Error(`Failed to parse JSON response from ${endpoint}: ${error}`);
  }
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
