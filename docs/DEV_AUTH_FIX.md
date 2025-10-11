# Исправление проблемы с аутентификацией в dev-режиме

## Проблема
Страница "Клиенты" в dev-режиме перенаправляла пользователей обратно на login, хотя в production такой проблемы не было.

## Причина
Основная проблема заключалась в различии конфигурации между dev и production режимами:

1. **URL бэкенда**: В dev-режиме использовался полный URL (`VITE_BACKEND_URL`), что создавало CORS проблемы и конфликты с прокси Vite
2. **WebSocket соединения**: WebSocket подключения также использовали неправильный URL в dev-режиме
3. **Отсутствие прокси для WebSocket**: Vite не проксировал WebSocket соединения

## Решение

### 1. Обновлена логика URL в контексте аутентификации
```typescript
// В dev режиме используем проксированные пути, в production - полный URL
const BACKEND_URL = import.meta.env.DEV ? '' : import.meta.env.VITE_BACKEND_URL;
```

### 2. Исправлена логика URL в API клиенте
```typescript
// В dev режиме используем проксированные пути, в production - полный URL
const API_BASE_URL = import.meta.env.DEV ? '' : import.meta.env.VITE_BACKEND_URL;
```

### 3. Создана утилитарная функция для URL
Файл `/src/utils/api-url.ts`:
```typescript
export function getApiBaseUrl(): string {
  return import.meta.env.DEV ? '' : import.meta.env.VITE_BACKEND_URL || '';
}

export function createApiUrl(endpoint: string): string {
  // Логика создания правильного URL для API эндпоинтов
}
```

### 4. Обновлена конфигурация Vite
Добавлено проксирование WebSocket соединений:
```typescript
server: {
  proxy: {
    '/api': {
      target: 'https://partial-elfrida-promconsulting-9e3c84f1.koyeb.app',
      changeOrigin: true,
      secure: true,
    },
    '/ws': {
      target: 'wss://partial-elfrida-promconsulting-9e3c84f1.koyeb.app',
      changeOrigin: true,
      secure: true,
      ws: true,
    }
  }
}
```

### 5. Исправлена логика WebSocket подключения
Обновлена функция получения WebSocket URL в компоненте Clients:
```typescript
const getWebSocketUrl = () => {
  if (import.meta.env.DEV) {
    // В dev-режиме используем localhost с прокси
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}/ws`;
  } else {
    // В production используем URL из переменной окружения
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const protocol = backendUrl?.startsWith('https') ? "wss:" : "ws:";
    const host = backendUrl?.replace(/^https?:\/\//, '');
    return `${protocol}//${host}/ws`;
  }
};
```

## Результат
- ✅ Страница "Клиенты" теперь корректно работает в dev-режиме
- ✅ Аутентификация работает через прокси Vite
- ✅ WebSocket соединения корректно проксируются
- ✅ Production режим продолжает работать как раньше
- ✅ Нет CORS проблем в dev-режиме

## Файлы изменены
- `/src/contexts/SimpleAuthContext.tsx` - исправлена логика URL бэкенда
- `/src/lib/api.ts` - исправлена логика API базового URL
- `/src/utils/api-url.ts` - создана утилитарная функция для URL
- `/src/pages/Clients.tsx` - исправлена логика WebSocket подключения
- `/vite.config.ts` - добавлено проксирование WebSocket

## Рекомендации
В будущем для новых API вызовов использовать утилитарную функцию `createApiUrl()` вместо прямого использования `import.meta.env.VITE_BACKEND_URL`.
