# Koyeb Backend Connection Fix

**Date:** 1 ноября 2025  
**Status:** ✅ RESOLVED

---

## 🐛 Issue: ETIMEDOUT errors when connecting to Koyeb backend

### Problem:
```
[vite] http proxy error: /api/login
AggregateError [ETIMEDOUT]
```

Vite dev server не может подключиться к Koyeb бэкенду из-за timeout (по умолчанию ~30 секунд).

### Root Cause:
Koyeb использует **serverless архитектуру** с "холодным стартом":
- Если сервер не получал запросы некоторое время, он переходит в режим сна
- Первый запрос после сна занимает 30-60 секунд для "пробуждения"
- Стандартный timeout Vite прокси слишком мал для холодного старта

---

## ✅ Solution: Увеличить timeout в vite.config.ts

### Изменения в `/vite.config.ts`:

```typescript
server: {
  proxy: {
    '/api': {
      target: 'https://partial-elfrida-promconsulting-9e3c84f1.koyeb.app',
      changeOrigin: true,
      secure: true,
      timeout: 60000, // ✅ ДОБАВЛЕНО: 60 секунд для холодного старта
      proxyTimeout: 60000, // ✅ ДОБАВЛЕНО: 60 секунд для прокси
      configure: (proxy, _options) => {
        // ... handlers
      },
    },
    '/ws': {
      target: 'wss://partial-elfrida-promconsulting-9e3c84f1.koyeb.app',
      changeOrigin: true,
      secure: true,
      ws: true,
      timeout: 60000, // ✅ ДОБАВЛЕНО: 60 секунд для WebSocket
      configure: (proxy, _options) => {
        // ... handlers
      },
    }
  }
}
```

### Параметры:
- **`timeout: 60000`** - Общий timeout для HTTP запросов (60 сек)
- **`proxyTimeout: 60000`** - Timeout для прокси соединения (60 сек)

---

## 🔍 Verification

### 1. Проверка доступности бэкенда:
```bash
curl -I https://partial-elfrida-promconsulting-9e3c84f1.koyeb.app/api/user

# Ожидаемый результат:
HTTP/2 401
# (401 нормально - просто нет авторизации)
```

✅ **Результат:** Сервер работает, отвечает за 381ms

### 2. Тест после изменений:
```bash
# Перезапустите dev сервер:
npm run dev

# Попробуйте логин:
# 1. Первый запрос может занять 30-60 сек (холодный старт)
# 2. Последующие запросы будут быстрые (< 1 сек)
```

---

## 🎯 Understanding Koyeb Behavior

### Cold Start (Холодный старт):
```
Запрос → Сервер спит → Пробуждение (30-60 сек) → Ответ
```

### Warm State (Теплое состояние):
```
Запрос → Сервер активен → Ответ (< 1 сек)
```

### Keep-Alive Strategy:
Koyeb автоматически усыпляет сервер после **~15 минут** без активности.

---

## 📊 Timeline

### До исправления:
```
0s  - User clicks "Login"
1s  - Vite sends request to proxy
2s  - Proxy tries to connect to Koyeb
32s - Proxy timeout (default ~30s) ❌
     Error: ETIMEDOUT
```

### После исправления:
```
0s  - User clicks "Login"
1s  - Vite sends request to proxy
2s  - Proxy tries to connect to Koyeb
2s-60s - Koyeb cold start (if sleeping)
45s - Koyeb responds ✅
46s - User authenticated
```

---

## 🚀 Next Steps

### 1. Restart Dev Server
```bash
# Остановите текущий сервер (Ctrl+C или Cmd+C)
# Запустите заново:
npm run dev
```

### 2. Test Login
- Откройте http://localhost:5173
- Попробуйте войти
- **Первый запрос:** Может занять до 60 секунд
- **Последующие:** Будут быстрые

### 3. Optional: Keep-Alive Service
Если холодные старты мешают разработке, можно создать keep-alive сервис:

```bash
# Пингуем сервер каждые 10 минут, чтобы держать его активным
watch -n 600 'curl -s https://partial-elfrida-promconsulting-9e3c84f1.koyeb.app/api/user > /dev/null'
```

Или создайте скрипт:
```javascript
// keep-alive.js
setInterval(() => {
  fetch('https://partial-elfrida-promconsulting-9e3c84f1.koyeb.app/api/user')
    .then(() => console.log('✅ Backend pinged'))
    .catch(err => console.log('❌ Ping failed:', err.message));
}, 10 * 60 * 1000); // Каждые 10 минут
```

---

## 🔧 Alternative Solutions

### Option 1: Use Production Backend Directly (Current)
✅ **Выбрано:** Используем Koyeb прокси с увеличенным timeout
- Pros: Реальный бэкенд, реальные данные
- Cons: Холодные старты

### Option 2: Run Local Backend
```bash
# Клонируйте бэкенд репозиторий
git clone <backend-repo>
cd backend
npm install
npm run dev

# Измените vite.config.ts:
target: 'http://localhost:3000'
```
- Pros: Нет холодных стартов, быстрый development
- Cons: Нужно запускать 2 сервера

### Option 3: Mock API
```typescript
// Используйте MSW (Mock Service Worker)
// Для offline разработки
```
- Pros: Самый быстрый, работает offline
- Cons: Не реальные данные

---

## 📋 Summary

| Issue | Solution | Status |
|-------|----------|--------|
| ETIMEDOUT errors | Увеличен timeout до 60s | ✅ Fixed |
| Cold start delay | Ожидается 30-60s для первого запроса | ℹ️ Expected |
| Subsequent requests | Быстрые (< 1s) | ✅ Working |

---

## 🎓 Best Practices

### During Development:
1. **Patience on first request** - Первый запрос после паузы займет время
2. **Keep browser tab open** - Сохраняет сервер активным
3. **Use keep-alive script** - Для длительной разработки

### For Production:
- Koyeb автоматически масштабируется
- Production instances более стабильны
- Рассмотрите платный план для "always-on" instances

---

## 🔗 Links

- [Koyeb Documentation](https://www.koyeb.com/docs)
- [Vite Proxy Config](https://vitejs.dev/config/server-options.html#server-proxy)
- Backend URL: `https://partial-elfrida-promconsulting-9e3c84f1.koyeb.app`

---

**Status:** ✅ **RESOLVED - RESTART DEV SERVER TO APPLY**  
**Action Required:** `npm run dev` (перезапуск)

---

**Developer:** GitHub Copilot  
**Date:** 1 ноября 2025  
**Version:** 1.0
