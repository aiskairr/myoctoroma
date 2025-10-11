/**
 * Утилитарная функция для получения правильного базового URL API
 * В dev режиме используется прокси (пустая строка), в production - полный URL
 */
export function getApiBaseUrl(): string {
  return import.meta.env.DEV ? '' : import.meta.env.VITE_BACKEND_URL || '';
}

/**
 * Создает полный URL для API эндпоинта
 * @param endpoint - путь к эндпоинту (начинающийся с /api)
 * @returns полный URL для API запроса
 */
export function createApiUrl(endpoint: string): string {
  const baseUrl = getApiBaseUrl();
  
  // Убираем двойные слеши если baseUrl пустой
  if (!baseUrl) {
    return endpoint;
  }
  
  // Убеждаемся что нет двойного слеша между baseUrl и endpoint
  const cleanedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const cleanedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  return `${cleanedBaseUrl}${cleanedEndpoint}`;
}
