# CORS Configuration Fix

## Проблема
Ошибка CORS: `Request header field pragma is not allowed by Access-Control-Allow-Headers in preflight response`

## Решение на бэкенде

### Для Express.js с cors middleware:

```javascript
const cors = require('cors');

app.use(cors({
  origin: [
    'http://localhost:3000', 
    'https://your-frontend-domain.com'
  ],
  credentials: true,
  allowedHeaders: [
    'Content-Type',
    'Authorization', 
    'Cookie',
    'Accept',
    'pragma',          // ← Добавить
    'cache-control',   // ← Добавить
    'x-requested-with'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  optionsSuccessStatus: 200
}));
```

### Или разрешить все заголовки:

```javascript
app.use(cors({
  origin: ['http://localhost:3000'],
  credentials: true,
  allowedHeaders: '*'  // Разрешает все заголовки
}));
```

### Для других фреймворков:

**Fastify:**
```javascript
await fastify.register(require('@fastify/cors'), {
  origin: ['http://localhost:3000'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'pragma', 'cache-control']
});
```

**Koa.js:**
```javascript
const Koa = require('koa');
const cors = require('@koa/cors');

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
  allowHeaders: ['Content-Type', 'Authorization', 'pragma', 'cache-control']
}));
```

## Временное решение на фронтенде

Создали API helper функции в `/src/lib/api.ts` которые убирают проблемные заголовки:

```typescript
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';

// Вместо fetch
const response = await apiGet('/api/crm/services');
```

## Обновленные файлы:

- ✅ `src/lib/api.ts` - новые API helper функции
- ✅ `src/pages/Services/components/service-tabe.tsx` - обновлен для использования API helpers

## Следующие шаги:

1. **Обновить бэкенд** с правильными CORS настройками
2. **Обновить остальные компоненты** для использования API helpers:
   - `src/pages/Services/components/create-service-btn.tsx`
   - `src/pages/CRMServicesTable.tsx`
   - `src/pages/CRMServices.tsx`
