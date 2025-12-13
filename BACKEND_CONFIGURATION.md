# Конфигурация двух бэкендов

## Обзор

Проект настроен для работы с двумя бэкенд серверами одновременно:

1. **Primary Backend** (Основной): `https://lesser-felicdad-promconsulting-79f07228.koyeb.app`
2. **Secondary Backend** (Вторичный): `https://octobackend.com/api/main/`

## Конфигурация (.env)

```env
# Primary Backend URL (используется по умолчанию)
VITE_BACKEND_URL=https://lesser-felicdad-promconsulting-79f07228.koyeb.app

# Secondary Backend URL (для специфичных сервисов)
VITE_SECONDARY_BACKEND_URL=https://octobackend.com/api/main/
```

## Использование в коде

### Вариант 1: Использование Axios (рекомендуется для новых эндпоинтов)

```typescript
import $api, { $apiPrimary, $apiSecondary } from '@/API/http';

// Запрос к основному бэкенду (по умолчанию)
const response = await $api.get('/api/tasks');

// Явное использование основного бэкенда
const response = await $apiPrimary.get('/api/masters');

// Запрос к вторичному бэкенду
const response = await $apiSecondary.get('/api/special-endpoint');
```

### Вариант 2: Использование helper функций

```typescript
import { createApiUrl, apiGetJson, apiPostJson } from '@/API/http';

// GET запрос к основному бэкенду
const data = await apiGetJson('/api/tasks');

// GET запрос к вторичному бэкенду
const data = await apiGetJson('/api/tasks', true);

// POST запрос к основному бэкенду
const result = await apiPostJson('/api/create-task', taskData);

// POST запрос к вторичному бэкенду
const result = await apiPostJson('/api/create-task', taskData, true);
```

### Вариант 3: Прямое создание URL (для fetch API)

```typescript
import { createApiUrl, PRIMARY_BACKEND_URL, SECONDARY_BACKEND_URL } from '@/API/http';

// Создание URL для основного бэкенда
const url = createApiUrl('/api/tasks');
// Результат: https://lesser-felicdad-promconsulting-79f07228.koyeb.app/api/tasks

// Создание URL для вторичного бэкенда
const url = createApiUrl('/api/tasks', true);
// Результат: https://octobackend.com/api/main//api/tasks

// Использование с fetch
const response = await fetch(createApiUrl('/api/tasks'), {
    credentials: 'include',
});
```

## Обновленные сервисы

### TaskParserService

Сервис парсера задач теперь поддерживает выбор бэкенда:

```typescript
import { taskParserService } from '@/services/task-parser';

// Запуск с основным бэкендом (по умолчанию)
taskParserService.start();

// Запуск с вторичным бэкендом
taskParserService.start({}, true);

// Ручной запрос к вторичному бэкенду
const result = await taskParserService.manualFetch({}, true);
```

## Миграция существующего кода

Весь существующий код продолжит работать без изменений, так как:

1. `VITE_BACKEND_URL` теперь указывает на новый основной бэкенд
2. Все существующие импорты `import $api from '@/API/http'` продолжат работать
3. Все существующие использования `import.meta.env.VITE_BACKEND_URL` будут использовать новый основной бэкенд

### Примеры миграции (опционально)

Если вы хотите перевести существующий код на использование helper функций:

**Было:**
```typescript
const url = `${import.meta.env.VITE_BACKEND_URL}/api/tasks/${taskId}`;
const response = await fetch(url, { credentials: 'include' });
```

**Стало:**
```typescript
import { createApiUrl } from '@/API/http';
const url = createApiUrl(`/api/tasks/${taskId}`);
const response = await fetch(url, { credentials: 'include' });
```

Или еще проще:
```typescript
import { apiGetJson } from '@/API/http';
const data = await apiGetJson(`/api/tasks/${taskId}`);
```

## Распределение эндпоинтов по бэкендам

### Primary Backend (основной)
По умолчанию все существующие эндпоинты используют основной бэкенд:
- `/api/tasks` - управление задачами
- `/api/crm/*` - CRM функционал
- `/api/masters` - управление мастерами
- `/api/administrators` - управление администраторами
- `/api/services` - управление услугами
- `/api/expenses` - управление расходами
- `/api/gift-certificates` - сертификаты
- `/api/accounting` - бухгалтерия
- И все остальные...

### Secondary Backend (вторичный)
Используется для специфичных сервисов по необходимости:
- Настраивается индивидуально при необходимости
- Добавьте свои эндпоинты сюда

## Debugging

Для отладки можно проверить, какие URL используются:

```typescript
import { PRIMARY_BACKEND_URL, SECONDARY_BACKEND_URL } from '@/API/http';

console.log('Primary Backend:', PRIMARY_BACKEND_URL);
console.log('Secondary Backend:', SECONDARY_BACKEND_URL);
```

## Переключение бэкендов

Чтобы переключиться между бэкендами, просто измените значения в `.env` файле и перезапустите dev сервер:

```bash
npm run dev
```

## Troubleshooting

### Проблема: Запросы идут не на тот бэкенд

**Решение:** Проверьте `.env` файл и убедитесь, что используете правильные переменные окружения.

### Проблема: CORS ошибки

**Решение:** Убедитесь, что оба бэкенда настроены на прием запросов с вашего фронтенд домена.

### Проблема: Разные результаты от бэкендов

**Решение:** Убедитесь, что оба бэкенда синхронизированы и используют одинаковую базу данных/схему данных.
