# Исправление проблемы входа сотрудников (Staff Login Fix)

## Проблема

При входе через эндпоинт `/staffAuthorization/login` пользователи видели сообщение "Login successful", но оставались на странице входа и не перенаправлялись в систему.

## Диагностика

### Логи из консоли показали:
```
✅ Login successful
📤 Login result: {success: true, message: '...', user: {...}}
✅ Token and user data received from backend
💾 Access token saved to localStorage
```

Но при этом:
```
result.data?.accessToken: MISSING
```

### Проблема была в формате ответа API

Staff API возвращает токен в **другом поле**, чем admin и user API:

**Admin/User API:**
```json
{
  "success": true,
  "accessToken": "eyJhbGc...",
  "user": {...}
}
```

**Staff API:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGc...",  // ← Токен здесь!
    "user": {...}
  }
}
```

## Решение

### В файле `src/contexts/SimpleAuthContext.tsx` (строка 290)

**Было:**
```typescript
const accessToken = result.accessToken || result.data?.accessToken || result.token;
```

**Стало:**
```typescript
const accessToken = result.accessToken || result.data?.accessToken || result.data?.token || result.token;
```

### Логика извлечения токена теперь проверяет:

1. `result.accessToken` - для admin/user API
2. `result.data?.accessToken` - возможный формат
3. **`result.data?.token`** - для staff API ✅ ← **ЭТО ИСПРАВЛЕНИЕ**
4. `result.token` - fallback

## Результат

После исправления:
- ✅ Токен извлекается правильно из всех трёх API (admin, staff, user)
- ✅ Пользователи с ролью 'manager' (staff) перенаправляются на `/dashboard`
- ✅ `localStorage.user_type` устанавливается в `'staff'`
- ✅ Все последующие API запросы используют правильный эндпоинт `/staffAuthorization/*`

## Тестирование

Для проверки:

1. Войдите как сотрудник (staff)
2. Откройте DevTools Console
3. Должны увидеть:

```
✅ Token and user data received from backend
💾 Access token saved to localStorage
💾 User type detected and saved: staff
✓ Verification - Token in localStorage: EXISTS (length: ...)
🎉 Login successful with role: manager
🔄 Redirecting manager to /dashboard
```

4. Проверьте localStorage:
```javascript
localStorage.getItem('user_type')  // → 'staff'
localStorage.getItem('auth_token') // → 'eyJhbGc...'
```

## Связанные файлы

- `src/contexts/SimpleAuthContext.tsx` - основной контекст аутентификации
- `src/pages/SimpleLogin.tsx` - страница входа с редиректами
- `src/API/http.ts` - обработка refresh токена
- `src/lib/api.ts` - роутинг API запросов

## Дата исправления

2025-11-24
