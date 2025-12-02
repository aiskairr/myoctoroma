# Интеграция новых эндпоинтов аутентификации администратора

## Обзор

В проект добавлена **гибкая система аутентификации**, которая автоматически определяет тип пользователя (admin или user) и использует соответствующие эндпоинты. Система полностью прозрачна для пользователя и автоматически выбирает правильный эндпоинт на основе сохраненного типа пользователя.

## Новые эндпоинты

### 1. POST /admin/login
**Описание**: Авторизация администратора

**Request Body**:
```json
{
  "email": "admin@example.com",
  "password": "securePassword123"
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Success",
  "user": {
    "id": 1,
    "username": "admin@example.com",
    "role": "owner",
    "first_name": "Bekbol",
    "last_name": "Mamytov"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Response (401)**:
```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

### 2. POST /admin/refresh
**Описание**: Обновление access токена с помощью refresh токена

**Примечание**: Refresh токен передается через httpOnly cookie (refreshToken)

**Success Response (200)**:
```json
{
  "success": true,
  "token": "newAccessToken123..."
}
```

**Error Responses**:
- **400**: Отсутствует refresh токен в cookie
- **401**: Невалидный refresh токен

### 3. DELETE /admin/logout
**Описание**: Выход администратора из системы

**Headers**:
```
Authorization: Bearer <token>
```

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Logout successful"
}
```

**Error Responses**:
- **400**: Администратор не найден
- **401**: Токен отсутствует или недействителен

## Ключевая особенность: Автоматическое определение типа пользователя

Система автоматически определяет тип пользователя (admin/user) при входе и сохраняет его в `localStorage.user_type`. Все последующие запросы (logout, refresh) используют правильный эндпоинт на основе этого типа.

### Как это работает

1. **При входе**: Система пробует оба эндпоинта и сохраняет тип пользователя
2. **При выходе**: Используется эндпоинт соответствующий типу пользователя
3. **При обновлении токена**: Автоматически использует правильный refresh эндпоинт

## Реализация в коде

### AuthContext (src/contexts/AuthContext.tsx)

#### Новый тип и состояние
```typescript
type UserType = 'admin' | 'user';

interface AuthContextType {
  // ... existing fields
  userType: UserType | null;  // Новое поле!
}

const [userType, setUserType] = useState<UserType | null>(null);
```

#### Функция `login` - определяет тип пользователя
Функция автоматически определяет тип при успешной авторизации:
1. Пытается `/admin/login`
2. Если успешно → сохраняет `userType = 'admin'`
3. Если 401 → пробует `/user/auth`
4. Если успешно → сохраняет `userType = 'user'`

```typescript
let detectedUserType: UserType | null = null;

// Пробуем admin login
let res = await fetch(`${SECONDARY_BACKEND_URL}/admin/login`, {
  method: "POST",
  body: JSON.stringify({ email, password }),
  credentials: "include"
});

if (res.ok) {
  detectedUserType = 'admin';  // ✅ Определили тип!
}

// Если admin login не удался, пробуем user auth
if (res.status === 401) {
  res = await fetch(`${SECONDARY_BACKEND_URL}/user/auth`, { /* ... */ });
  if (res.ok) {
    detectedUserType = 'user';  // ✅ Определили тип!
  }
}

// Сохраняем тип пользователя
if (detectedUserType) {
  setUserType(detectedUserType);
  localStorage.setItem('user_type', detectedUserType);
  console.log(`User type detected: ${detectedUserType}`);
}
```

#### Функция `logout` - использует правильный эндпоинт
Функция определяет эндпоинт на основе сохраненного типа:
```typescript
const currentUserType = userType || localStorage.getItem('user_type') as UserType;

// Выбираем правильный эндпоинт
let logoutEndpoint = '';
if (currentUserType === 'admin') {
  logoutEndpoint = `${SECONDARY_BACKEND_URL}/admin/logout`;
} else {
  logoutEndpoint = `${SECONDARY_BACKEND_URL}/user/logout`;
}

console.log(`Logging out using ${currentUserType} endpoint:`, logoutEndpoint);

// Отправляем запрос на правильный эндпоинт
const res = await fetch(logoutEndpoint, {
  method: "DELETE",
  credentials: "include",
  headers: {
    "Accept": "application/json",
    ...(currentUserType === 'admin' && token ? { "Authorization": `Bearer ${token}` } : {})
  }
});
```

### HTTP Client (src/API/http.ts)

Функция `refreshAccessToken` использует тип пользователя для выбора эндпоинта:

```typescript
const userType = localStorage.getItem('user_type'); // Получаем сохраненный тип

// Определяем эндпоинт на основе типа пользователя
let refreshEndpoint = '';
if (userType === 'admin') {
  refreshEndpoint = `${SECONDARY_BACKEND_URL}/admin/refresh`;
} else if (userType === 'user') {
  refreshEndpoint = `${SECONDARY_BACKEND_URL}/user/refresh`;
}

// Если тип определен, используем конкретный эндпоинт
if (refreshEndpoint) {
  console.log(`Trying ${userType} refresh endpoint:`, refreshEndpoint);
  const response = await axios.post(refreshEndpoint, refreshPayload, { /* ... */ });
  // обработка успешного ответа
}

// Fallback: если тип не определен, пробуем оба эндпоинта
// и сохраняем определенный тип для будущих запросов
```

### API Router (src/lib/api.ts)

Добавлена поддержка роутинга для `/admin` эндпоинтов:

```typescript
// Определяем какой базовый URL использовать
if (endpoint.startsWith('/admin') ||
    endpoint.startsWith('/user') ||
    endpoint.startsWith('/clients') ||
    /* ... */) {
  baseUrl = SECONDARY_API_BASE_URL;
} else {
  baseUrl = PRIMARY_API_BASE_URL;
}
```

## Токены и хранение

### Access Token
- Хранится в: `localStorage.auth_token`, `Cookies.token`
- Время жизни: настраивается на бэкенде
- Использование: передается в заголовке `Authorization: Bearer <token>`

### Refresh Token
- Хранится в: httpOnly cookie `refreshToken`
- Время жизни: обычно дольше access token
- Использование: автоматически отправляется браузером через cookies

## Логика работы (обновлено с поддержкой userType)

1. **Вход (Login)**:
   - Пользователь вводит email и password
   - Система пробует `/admin/login`
   - ✅ Если успешно → **сохраняет `userType = 'admin'`**
   - Если 401, пробует `/user/auth`
   - ✅ Если успешно → **сохраняет `userType = 'user'`**
   - Сохраняет access token и refresh token
   - Устанавливает состояние аутентификации

2. **Обновление токена (Refresh)**:
   - При получении 401 на любой запрос
   - Автоматически вызывается `refreshAccessToken()`
   - ✅ **Читает `userType` из localStorage**
   - ✅ **Использует правильный эндпоинт**: `/admin/refresh` или `/user/refresh`
   - При успехе обновляет access token
   - Повторяет оригинальный запрос
   - Fallback: если `userType` не определен, пробует оба эндпоинта

3. **Выход (Logout)**:
   - ✅ **Читает `userType` из localStorage**
   - ✅ **Вызывает правильный эндпоинт**: `/admin/logout` или `/user/logout`
   - Для admin отправляет Bearer token в заголовке
   - Очищает все токены и `userType` из localStorage и cookies
   - Редиректит на страницу входа

## Хранение userType

**localStorage.user_type**:
- Значения: `'admin'` или `'user'`
- Устанавливается при успешном login
- Используется для выбора эндпоинтов logout и refresh
- Очищается при logout

## Тестирование

Для тестирования новой системы:

1. **Тест входа администратора**:
   - Войдите с учетными данными администратора
   - Откройте DevTools → Console
   - Проверьте логи: должно быть `User type detected: admin`
   - Проверьте localStorage: `localStorage.getItem('user_type')` должен вернуть `'admin'`

2. **Тест входа пользователя**:
   - Выйдите и войдите с учетными данными обычного пользователя
   - Проверьте логи: должно быть `User type detected: user`
   - Проверьте localStorage: должен вернуть `'user'`

3. **Тест выхода**:
   - Нажмите кнопку выхода
   - Проверьте логи: должен показать правильный эндпоинт
   - Пример для admin: `Logging out using admin endpoint: .../admin/logout`
   - Пример для user: `Logging out using user endpoint: .../user/logout`

4. **Тест обновления токена**:
   - Дождитесь истечения access token (или удалите его вручную)
   - Сделайте любой API запрос
   - Проверьте логи: должен использоваться правильный refresh эндпоинт
   - Пример: `Trying admin refresh endpoint: .../admin/refresh`

## Преимущества новой системы

✅ **Гибкость**: Автоматически определяет тип пользователя
✅ **Эффективность**: Не делает лишних запросов после первого входа
✅ **Прозрачность**: Работает автоматически, не требует изменений в UI
✅ **Отладка**: Подробные логи показывают какой эндпоинт используется
✅ **Надежность**: Fallback на пробу обоих эндпоинтов если тип не определен

## Обратная совместимость

Все изменения полностью обратно совместимы:
- Старые `/user/*` эндпоинты продолжают работать
- Новые `/admin/*` эндпоинты работают параллельно
- Система автоматически определяет, какой эндпоинт использовать
- Если `userType` не определен, система пробует оба эндпоинта (старое поведение)
