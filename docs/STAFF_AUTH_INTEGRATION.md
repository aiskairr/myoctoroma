# Интеграция эндпоинтов аутентификации сотрудников (Staff)

## Обзор

Добавлена полная поддержка аутентификации сотрудников через эндпоинты `/staffAuthorization/*`. Теперь система поддерживает **три типа пользователей**:
- `admin` - администраторы
- `staff` - сотрудники организации
- `user` - обычные пользователи

## Новые эндпоинты для сотрудников

### 1. POST /staffAuthorization/login
**Описание**: Авторизация сотрудника

**Request Body**:
```json
{
  "email": "string",
  "password": "string"
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "message": "string",
  "data": {
    "user": {
      "id": 0,
      "organization": { "id": 0, "name": "string" },
      "branches": [{ "id": 0, "name": "string", "address": "string" }],
      "firstname": "string",
      "lastname": "string",
      "username": "string",
      "email": "string",
      "role": "manager",
      "customRole": "string",
      "specialty": "string",
      "is_active": true
    },
    "accessToken": "string"
  }
}
```

**Error Responses**:
- **401**: Неверный email или пароль
- **403**: Аккаунт деактивирован

### 2. POST /staffAuthorization/logout
**Описание**: Выход сотрудника

**Headers**:
```
Authorization: Bearer <token>
```

**Success Response (200)**:
```json
{
  "success": true,
  "message": "string"
}
```

**Error Response**:
- **401**: Необходима авторизация

### 3. POST /staffAuthorization/refresh
**Описание**: Обновление access токена

**Headers**:
```
Authorization: Bearer <refresh_token>
```

**Success Response (200)**:
```json
{
  "success": true,
  "message": "string",
  "data": {
    "accessToken": "string"
  }
}
```

**Error Response**:
- **401**: Неверный или просроченный refresh токен

### 4. GET /staffAuthorization/me
**Описание**: Получение данных текущего пользователя

**Success Response (200)**:
```json
{
  "success": true,
  "data": {
    "id": 0,
    "organization": { "id": 0, "name": "string" },
    "branches": [...],
    "firstname": "string",
    "lastname": "string",
    "username": "string",
    "email": "string",
    "role": "manager"
  }
}
```

### 5. POST /staffAuthorization/change-password
**Описание**: Смена пароля сотрудника

**Request Body**:
```json
{
  "currentPassword": "string",
  "newPassword": "string"
}
```

## Как работает система с тремя типами

### Последовательность попыток при входе

```
Пользователь вводит email + password
           ↓
1. POST /admin/login
   ✅ Успех → userType = 'admin'
   ❌ 401 → Пробуем дальше
           ↓
2. POST /staffAuthorization/login
   ✅ Успех → userType = 'staff'
   ❌ 401 → Пробуем дальше
           ↓
3. POST /user/auth
   ✅ Успех → userType = 'user'
   ❌ 401 → Ошибка входа
```

### Выход (Logout)

```
localStorage.user_type → 'staff'
           ↓
POST /staffAuthorization/logout
  с Authorization: Bearer <token>
           ↓
Очистка всех токенов
```

### Обновление токена (Refresh)

```
Получен 401 на API запрос
           ↓
localStorage.user_type → 'staff'
           ↓
POST /staffAuthorization/refresh
           ↓
Получен новый accessToken
           ↓
Повтор оригинального запроса
```

## Особенности staff эндпоинтов

### Logout использует POST (не DELETE!)
```typescript
if (currentUserType === 'staff') {
  logoutEndpoint = '/staffAuthorization/logout';
  logoutMethod = 'POST';  // ← Важно!
} else if (currentUserType === 'admin') {
  logoutEndpoint = '/admin/logout';
  logoutMethod = 'DELETE';
}
```

### Формат ответа refresh отличается
```typescript
// Staff refresh возвращает токен в data.accessToken
const accessToken = staffData.accessToken ||
                    staffData.data?.accessToken ||
                    staffData.token;
```

## Изменения в коде

### SimpleAuthContext.tsx

1. **Обновлен тип UserType**:
```typescript
type UserType = 'admin' | 'user' | 'staff';
```

2. **Функция login** пробует 3 эндпоинта:
```typescript
// 1. Admin
let response = await fetch('/admin/login', ...);
if (response.ok) detectedUserType = 'admin';

// 2. Staff
if (response.status === 401) {
  response = await fetch('/staffAuthorization/login', ...);
  if (response.ok) detectedUserType = 'staff';
}

// 3. User
if (response.status === 401) {
  response = await fetch('/user/auth', ...);
  if (response.ok) detectedUserType = 'user';
}
```

3. **Функция logout** использует правильный метод:
```typescript
let logoutMethod = 'DELETE';
if (currentUserType === 'staff') {
  logoutEndpoint = '/staffAuthorization/logout';
  logoutMethod = 'POST';  // Staff использует POST!
}
```

### http.ts

**refreshAccessToken** пробует 3 эндпоинта:
```typescript
if (userType === 'admin') {
  refreshEndpoint = '/admin/refresh';
} else if (userType === 'staff') {
  refreshEndpoint = '/staffAuthorization/refresh';
} else if (userType === 'user') {
  refreshEndpoint = '/user/refresh';
}
```

### lib/api.ts

Добавлен роутинг для `/staffAuthorization`:
```typescript
if (endpoint.startsWith('/staffAuthorization') || ...) {
  baseUrl = SECONDARY_API_BASE_URL;
}
```

## Тестирование

### 1. Тест входа сотрудника
```javascript
// 1. Войдите как сотрудник
// 2. Откройте DevTools Console
// 3. Проверьте лог:
"Staff login response status: 200"
"💾 User type detected and saved: staff"

// 4. Проверьте localStorage:
localStorage.getItem('user_type') // → 'staff'
```

### 2. Тест выхода
```javascript
// 1. Нажмите кнопку выхода
// 2. Проверьте лог:
"Logging out using staff endpoint: .../staffAuthorization/logout"
```

### 3. Тест refresh токена
```javascript
// 1. Дождитесь истечения токена
// 2. Сделайте API запрос
// 3. Проверьте лог:
"Trying staff refresh endpoint: .../staffAuthorization/refresh"
"✅ Access token refreshed successfully via /staffAuthorization/refresh"
```

## Логи для отладки

### При входе:
```
Admin login response status: 401
Admin login failed, trying staffAuthorization/login...
Staff login response status: 200
💾 User type detected and saved: staff
```

### При выходе:
```
Logging out using staff endpoint: https://.../staffAuthorization/logout
```

### При refresh:
```
🔄 Attempting to refresh access token...
Trying staff refresh endpoint: .../staffAuthorization/refresh
✅ Access token refreshed successfully via /staffAuthorization/refresh
```

## Использование в компонентах

```typescript
import { useAuth } from '@/contexts/SimpleAuthContext';

function MyComponent() {
  const { userType, user } = useAuth();

  return (
    <div>
      {userType === 'admin' && <AdminPanel />}
      {userType === 'staff' && <StaffPanel />}
      {userType === 'user' && <UserPanel />}
    </div>
  );
}
```

## Структура хранения

```javascript
localStorage.user_type = 'staff'  // или 'admin' или 'user'
localStorage.auth_token = 'eyJhbGc...'
localStorage.refresh_token = '...'
```

## Резюме

✅ Поддержка трех типов пользователей: admin, staff, user
✅ Автоматическое определение типа при входе
✅ Правильные эндпоинты для logout (POST для staff!)
✅ Правильные эндпоинты для refresh
✅ Fallback на все три типа если тип не определен
✅ Подробные логи для отладки

Система автоматически определяет является ли пользователь администратором, сотрудником или обычным пользователем, и использует соответствующие API эндпоинты! 🎉
