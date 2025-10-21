# Система WebSocket уведомлений

**Дата:** 21 октября 2025 г.  
**Файлы:** 
- `src/contexts/NotificationContext.tsx` - WebSocket контекст
- `src/App.tsx` - интеграция NotificationProvider

## Описание

Система для приема уведомлений с бэкенда в реальном времени через WebSocket и отображения их в виде Toast-уведомлений по всему приложению.

## Возможности

✅ **Реальное время** - мгновенные уведомления через WebSocket  
✅ **Глобальные** - работают на любой странице приложения  
✅ **Автоматическое переподключение** - восстановление соединения при обрыве  
✅ **Типизированные** - поддержка разных типов уведомлений  
✅ **Красивые Toast** - с иконками и форматированием  
✅ **Звуковые уведомления** - опциональный звук (если добавить файл)  
✅ **Адаптивные** - работают на мобильных и десктопе  

## Архитектура

### Frontend (React)

```
App.tsx
  └── LocaleProvider
      └── AuthProvider
          └── NotificationProvider  ← WebSocket подключение
              └── Pages/Components ← получают уведомления
```

### WebSocket соединение

```
Frontend                          Backend
   │                                 │
   ├─── Connect ──────────────────> │ /ws/notifications
   │                                 │
   ├─── Send auth data ──────────> │ { userId, role, masterId }
   │                                 │
   │ <─── Receive notifications ─── │ { type, title, message, data }
   │                                 │
   └─── Show Toast                  │
```

## Типы уведомлений

```typescript
interface NotificationData {
  type: 'new_booking' | 'booking_cancelled' | 'booking_updated' | 'reminder' | 'system';
  title: string;
  message: string;
  data?: {
    taskId?: string;
    clientName?: string;
    serviceType?: string;
    scheduleTime?: string;
    scheduleDate?: string;
    masterId?: string;
    masterName?: string;
    [key: string]: any;
  };
  timestamp?: string;
  priority?: 'low' | 'normal' | 'high';
}
```

### Визуальные стили по типам

| Тип | Иконка | Цвет | Длительность |
|-----|--------|------|--------------|
| `new_booking` | 📅 | Синий | 5 сек |
| `booking_cancelled` | ❌ | Красный | 5 сек |
| `booking_updated` | ✏️ | Синий | 4 сек |
| `reminder` | ⏰ | Синий | 6 сек |
| `system` | 🔔 | Серый | 4 сек |

**Стиль Toast уведомлений:** Используется такой же темный градиент как в sidebar (`from-slate-900 to-slate-800`) с белым текстом, полупрозрачной границей (`border-slate-700/50`) и эффектом размытия фона (`backdrop-blur-sm`).

## Примеры уведомлений

### 1. Новая запись

```json
{
  "type": "new_booking",
  "title": "Новая запись",
  "message": "Новый клиент записался на услугу",
  "data": {
    "taskId": "12345",
    "clientName": "Иван Иванов",
    "serviceType": "Стрижка мужская",
    "scheduleTime": "14:00",
    "scheduleDate": "2025-10-21",
    "masterId": "6",
    "masterName": "Азат"
  },
  "timestamp": "2025-10-21T10:30:00Z",
  "priority": "high"
}
```

**Отображение:**
```
📅 Новая запись
Новый клиент записался на услугу

👤 Иван Иванов
💇 Стрижка мужская
⏰ 14:00
📅 2025-10-21
```

### 2. Отмена записи

```json
{
  "type": "booking_cancelled",
  "title": "Запись отменена",
  "message": "Клиент отменил запись",
  "data": {
    "taskId": "12345",
    "clientName": "Иван Иванов",
    "scheduleTime": "14:00",
    "scheduleDate": "2025-10-21"
  },
  "priority": "normal"
}
```

**Отображение:**
```
❌ Запись отменена
Клиент отменил запись

👤 Иван Иванов
⏰ 14:00
📅 2025-10-21
```

### 3. Напоминание

```json
{
  "type": "reminder",
  "title": "Напоминание",
  "message": "Через 15 минут запись с клиентом",
  "data": {
    "clientName": "Иван Иванов",
    "scheduleTime": "14:00"
  },
  "priority": "high"
}
```

### 4. Системное уведомление

```json
{
  "type": "system",
  "title": "Обновление системы",
  "message": "Система будет обновлена сегодня в 23:00",
  "priority": "low"
}
```

## Backend Implementation

### Node.js + Express + WebSocket

```javascript
const express = require('express');
const WebSocket = require('ws');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws/notifications' });

// Храним подключения пользователей
const userConnections = new Map(); // userId -> WebSocket[]

wss.on('connection', (ws, req) => {
  console.log('New WebSocket connection');
  
  // Парсим параметры из URL
  const urlParams = new URLSearchParams(req.url.split('?')[1]);
  let userId = urlParams.get('userId');
  let userRole = urlParams.get('role');
  let masterId = null;
  let branchId = null;

  // Обработка сообщений от клиента
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      // Аутентификация
      if (data.type === 'auth') {
        userId = data.userId;
        userRole = data.role;
        masterId = data.masterId;
        branchId = data.branchId;
        
        console.log(`User authenticated: ${userId}, role: ${userRole}, masterId: ${masterId}`);
        
        // Сохраняем подключение
        if (!userConnections.has(userId)) {
          userConnections.set(userId, []);
        }
        userConnections.get(userId).push(ws);
        
        // Сохраняем данные в ws для использования
        ws.userId = userId;
        ws.userRole = userRole;
        ws.masterId = masterId;
        ws.branchId = branchId;
        
        // Отправляем подтверждение
        ws.send(JSON.stringify({
          type: 'auth_success',
          message: 'Successfully authenticated'
        }));
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });

  ws.on('close', () => {
    console.log(`WebSocket connection closed for user: ${userId}`);
    
    // Удаляем подключение из списка
    if (userId && userConnections.has(userId)) {
      const connections = userConnections.get(userId);
      const index = connections.indexOf(ws);
      if (index > -1) {
        connections.splice(index, 1);
      }
      
      // Удаляем пользователя если нет подключений
      if (connections.length === 0) {
        userConnections.delete(userId);
      }
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Функция для отправки уведомления пользователю
function sendNotificationToUser(userId, notification) {
  if (userConnections.has(userId)) {
    const connections = userConnections.get(userId);
    connections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(notification));
      }
    });
  }
}

// Функция для отправки уведомления мастеру
function sendNotificationToMaster(masterId, notification) {
  // Находим всех пользователей с этим masterId
  userConnections.forEach((connections, userId) => {
    connections.forEach(ws => {
      if (ws.masterId === masterId && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(notification));
      }
    });
  });
}

// Функция для отправки уведомления по филиалу
function sendNotificationToBranch(branchId, notification) {
  userConnections.forEach((connections, userId) => {
    connections.forEach(ws => {
      if (ws.branchId === branchId && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(notification));
      }
    });
  });
}

// Пример: отправка уведомления при создании новой записи
app.post('/api/crm/tasks', async (req, res) => {
  try {
    // ... создание задачи в БД ...
    const newTask = await createTask(req.body);
    
    // Отправляем уведомление мастеру
    if (newTask.masterId) {
      sendNotificationToMaster(newTask.masterId, {
        type: 'new_booking',
        title: 'Новая запись',
        message: 'Новый клиент записался на услугу',
        data: {
          taskId: newTask.id,
          clientName: newTask.clientName,
          serviceType: newTask.serviceType,
          scheduleTime: newTask.scheduleTime,
          scheduleDate: newTask.scheduleDate,
          masterId: newTask.masterId
        },
        timestamp: new Date().toISOString(),
        priority: 'high'
      });
    }
    
    res.json({ success: true, task: newTask });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Пример: webhook endpoint для внешних систем
app.post('/api/webhooks/booking', express.json(), (req, res) => {
  const { masterId, notification } = req.body;
  
  if (masterId && notification) {
    sendNotificationToMaster(masterId, notification);
    res.json({ success: true, message: 'Notification sent' });
  } else {
    res.status(400).json({ error: 'Missing masterId or notification' });
  }
});

server.listen(3000, () => {
  console.log('Server is running on port 3000');
  console.log('WebSocket server is ready at ws://localhost:3000/ws/notifications');
});
```

## Использование в компонентах

### Получение статуса подключения

```typescript
import { useNotifications } from '@/contexts/NotificationContext';

function MyComponent() {
  const { isConnected, lastNotification } = useNotifications();
  
  return (
    <div>
      {isConnected ? (
        <span>🟢 Подключено</span>
      ) : (
        <span>🔴 Отключено</span>
      )}
      
      {lastNotification && (
        <div>
          Последнее уведомление: {lastNotification.title}
        </div>
      )}
    </div>
  );
}
```

## Особенности

### 1. Автоматическое переподключение

При потере соединения система автоматически пытается переподключиться:
- Первая попытка через 2 секунды
- Вторая попытка через 4 секунды
- Третья попытка через 8 секунд
- Максимум 5 попыток
- Максимальная задержка 30 секунд

### 2. Переподключение при возврате вкладки

Если пользователь переключается на другую вкладку и возвращается, система автоматически переподключается если соединение было потеряно.

### 3. Индикатор подключения (Development mode)

В режиме разработки показывается индикатор состояния WebSocket:
- 🟢 WebSocket Connected - соединение активно
- 🔴 WebSocket Disconnected - соединение потеряно

### 4. Звуковые уведомления (опционально)

Чтобы включить звук, добавьте файл `notification-sound.mp3` в папку `public/`:

```bash
# Скачайте звуковой файл
curl -o public/notification-sound.mp3 https://example.com/notification.mp3
```

## Тестирование

### 1. Запуск frontend

```bash
npm run dev
```

### 2. Симуляция уведомления (curl)

```bash
# Отправить уведомление мастеру
curl -X POST http://localhost:3000/api/webhooks/booking \
  -H "Content-Type: application/json" \
  -d '{
    "masterId": "6",
    "notification": {
      "type": "new_booking",
      "title": "Новая запись",
      "message": "Тестовое уведомление",
      "data": {
        "clientName": "Тестовый клиент",
        "serviceType": "Тестовая услуга",
        "scheduleTime": "14:00"
      }
    }
  }'
```

### 3. Проверка в браузере

1. Откройте DevTools (F12)
2. Перейдите на вкладку Console
3. Вы должны увидеть:
   ```
   🔌 Connecting to WebSocket: ws://localhost:3000/ws/notifications
   ✅ WebSocket connected
   ```
4. При получении уведомления:
   ```
   📬 Received notification: { type: 'new_booking', ... }
   ```

## Безопасность

### Рекомендации:

1. **Аутентификация** - проверяйте токен на бэкенде
2. **Валидация** - проверяйте структуру сообщений
3. **Rate limiting** - ограничивайте количество подключений
4. **HTTPS/WSS** - используйте защищенное соединение в продакшене

## Production deployment

### Frontend (env variable)

```bash
VITE_BACKEND_URL=https://yourdomain.com
```

WebSocket автоматически заменит `https` на `wss`.

### Backend (nginx)

```nginx
location /ws/ {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "Upgrade";
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

## Связанные документы

- `AUTH_CONTEXT_MASTERID_FIX.md` - контекст аутентификации
- `MASTER_CALENDAR_DISPLAY_FIX.md` - отображение календаря
