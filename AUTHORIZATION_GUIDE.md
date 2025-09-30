# Система авторизации ElitAroma Frontend

## Обзор архитектуры

В приложении реализованы **две параллельные системы авторизации**:

1. **SimpleAuthContext** - основная система (используется в App.tsx)
2. **AuthContext** - альтернативная система (не используется, но присутствует)
3. **Мобильная авторизация мастеров** - отдельная система для мобильного приложения

## 1. Основная система авторизации (SimpleAuthContext)

### Эндпоинты API

#### Авторизация
```http
POST /api/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Ответ при успехе:**
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "id": 2,
    "email": "user@example.com",
    "username": "admin",
    "role": "superadmin"
  }
}
```

#### Получение данных пользователя
```http
GET /api/user
Authorization: Bearer {token}
```

**Ответ:**
```json
{
  "id": 2,
  "email": "aktaevaktan@gmail.com",
  "username": "admin",
  "role": "superadmin",
  "branchId": "1",
  "isActive": true,
  "organisationId": 1
}
```

#### Выход из системы
```http
POST /api/logout
```

### Механизм работы

#### 1. Инициализация приложения
```typescript
// При загрузке приложения проверяется localStorage
const storedData = localStorage.getItem('uuid');
const userData = JSON.parse(Cookies.get('user'));

// Проверка валидности сессии
if (userData && userData.success && userData.hasValidSession && userData.userId) {
  setIsAuthenticated(true);
  setUser(userData);
}
```

#### 2. Процесс авторизации
```typescript
// 1. Отправка данных на сервер
const response = await axios.post(`${BACKEND_URL}/api/login`, { email, password });

// 2. При успехе сохранение в localStorage
localStorage.setItem('uuid', JSON.stringify(result));

// 3. Установка состояния
setIsAuthenticated(true);
setUser(result.user);
```

#### 3. Проверка данных пользователя (дополнительная)
```typescript
// Дополнительный запрос для получения актуальных данных
const res = await fetch(`${VITE_BACKEND_URL}/api/user`, {
  headers: {
    "Authorization": `Bearer ${token}`
  }
});

const userData = await res.json();
Cookies.set('user', JSON.stringify(userData));
```

### Хранение данных

1. **localStorage**: ключ `'uuid'` - результат авторизации
2. **Cookies**: 
   - `'token'` - JWT токен
   - `'user'` - данные пользователя

## 2. Мобильная авторизация мастеров

### Эндпоинт
```http
POST /api/auth/mobile-login
Content-Type: application/json

{
  "username": "master_username",
  "password": "password123"
}
```

**Ответ:**
```json
{
  "success": true,
  "masterId": 123,
  "masterName": "Имя мастера"
}
```

### Механизм работы
```typescript
// Сохранение в localStorage
const authData = {
  isAuthenticated: true,
  masterId,
  masterName
};
localStorage.setItem('masterAuth', JSON.stringify(authData));
```

## 3. Защищенные маршруты

### SimpleProtectedRoute компонент
```typescript
export function SimpleProtectedRoute({ children, requiredRole }) {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) window.location.href = "/login";
  
  // Проверка роли (если указана)
  if (requiredRole && user?.role !== requiredRole) {
    return <AccessDenied />;
  }

  return children;
}
```

## 4. Роли пользователей

### Типы ролей:
- `superadmin` - суперадминистратор
- `admin` - администратор 
- `master` - мастер
- другие роли

### Перенаправления по ролям:
```typescript
if (result.user?.role === 'master') {
  window.location.href = "/crm/calendar";
} else {
  window.location.href = "/";
}
```

## 5. Обработка ошибок авторизации

### 401 Unauthorized
```typescript
if (res.status === 401) {
  console.error("Authentication error");
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}
```

### Обработка в Query Client
```typescript
// Автоматическое перенаправление при 401
const getQueryFn = ({ on401 }) => async ({ queryKey }) => {
  const res = await fetch(queryKey[0], { credentials: "include" });
  
  if (res.status === 401) {
    if (on401 === "returnNull") return null;
    window.location.href = '/login';
  }
  
  return res.json();
};
```

## 6. Интеграция с мобильным приложением

### Рекомендации для мобильной разработки

#### 1. Базовая структура запросов
```typescript
const BASE_URL = 'https://your-backend-url.com';

// Авторизация
const login = async (email: string, password: string) => {
  const response = await fetch(`${BASE_URL}/api/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
  
  return response.json();
};

// Получение данных пользователя
const getUser = async (token: string) => {
  const response = await fetch(`${BASE_URL}/api/user`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  return response.json();
};
```

#### 2. Хранение токенов (React Native)
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

// Сохранение
await AsyncStorage.setItem('authToken', token);
await AsyncStorage.setItem('userData', JSON.stringify(userData));

// Получение
const token = await AsyncStorage.getItem('authToken');
const userData = JSON.parse(await AsyncStorage.getItem('userData') || '{}');
```

#### 3. Автоматическая авторизация
```typescript
const checkAuthStatus = async () => {
  const token = await AsyncStorage.getItem('authToken');
  if (!token) return false;
  
  try {
    const userData = await getUser(token);
    // Проверка валидности токена
    if (userData && userData.id) {
      return { isAuthenticated: true, user: userData };
    }
  } catch (error) {
    // Токен невалиден, очищаем хранилище
    await AsyncStorage.removeItem('authToken');
    await AsyncStorage.removeItem('userData');
  }
  
  return { isAuthenticated: false };
};
```

#### 4. Interceptor для запросов
```typescript
// Axios interceptor для автоматического добавления токена
axios.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor для обработки 401 ошибок
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Очищаем токены и перенаправляем на логин
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('userData');
      // Навигация на экран логина
    }
    return Promise.reject(error);
  }
);
```

## 7. Особенности и важные моменты

### Cookies vs LocalStorage
- **Веб**: Используется комбинация localStorage + cookies
- **Мобильное**: Рекомендуется AsyncStorage для токенов

### Двойные системы авторизации
- В коде присутствуют две системы - используйте **SimpleAuthContext**
- AuthContext не используется в основном приложении

### Безопасность
- JWT токены передаются в Authorization header
- Cookies используются для дополнительной проверки
- При 401 ошибке автоматическое перенаправление на логин

### Специальные эндпоинты
- `/api/auth/mobile-login` - для мобильной авторизации мастеров
- `/api/login` - основная авторизация
- `/api/user` - получение данных пользователя
- `/api/logout` - выход из системы

## 8. Пример реализации для мобильного приложения

```typescript
class AuthService {
  private baseURL = 'https://your-backend-url.com';
  
  async login(email: string, password: string) {
    const response = await fetch(`${this.baseURL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    
    const data = await response.json();
    
    if (data.success) {
      await AsyncStorage.setItem('authToken', data.token);
      await AsyncStorage.setItem('userData', JSON.stringify(data.user));
      return { success: true, user: data.user };
    }
    
    return { success: false, message: data.message };
  }
  
  async getCurrentUser() {
    const token = await AsyncStorage.getItem('authToken');
    if (!token) return null;
    
    const response = await fetch(`${this.baseURL}/api/user`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    
    if (response.ok) {
      return response.json();
    }
    
    return null;
  }
  
  async logout() {
    await fetch(`${this.baseURL}/api/logout`, { method: 'POST' });
    await AsyncStorage.removeItem('authToken');
    await AsyncStorage.removeItem('userData');
  }
}
```

Эта документация поможет вам создать мобильное приложение, совместимое с текущей системой авторизации фронтенда.
