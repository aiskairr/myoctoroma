# API Эндпоинты для страницы Dashboard

Dashboard ожидает данные от следующих API эндпоинтов:

## 1. `/api/stats` - Общая статистика
**URL:** `GET /api/stats?branchID=branch{branchId}`
**Частота обновления:** Каждые 10 секунд

### Ожидаемый формат ответа:
```json
{
  "botStatus": boolean,
  "stats": {
    "activeUsers": number,
    "messagesToday": number,
    "apiUsage": number
  }
}
```

### Пример:
```json
{
  "botStatus": true,
  "stats": {
    "activeUsers": 125,
    "messagesToday": 456,
    "apiUsage": 78
  }
}
```

---

## 2. `/api/activities` - Активности пользователей
**URL:** `GET /api/activities?branchID=branch{branchId}`
**Частота обновления:** Каждые 10 секунд

### Ожидаемый формат ответа:
```json
{
  "activities": [
    {
      "id": string,
      "type": string,
      "description": string,
      "timestamp": string (ISO 8601),
      "user": string,
      "status": string
    }
  ]
}
```

### Пример:
```json
{
  "activities": [
    {
      "id": "1",
      "type": "booking",
      "description": "Новая запись на массаж",
      "timestamp": "2025-10-06T14:30:00.000Z",
      "user": "Иван Иванов",
      "status": "scheduled"
    },
    {
      "id": "2", 
      "type": "payment",
      "description": "Оплата услуги",
      "timestamp": "2025-10-06T14:25:00.000Z",
      "user": "Мария Петрова",
      "status": "completed"
    }
  ]
}
```

---

## 3. `/api/stats/service-types` - Статистика по типам услуг
**URL:** `GET /api/stats/service-types?branchId={branchId}`
**Частота обновления:** Каждые 60 секунд

### Ожидаемый формат ответа:
```json
{
  "serviceTypes": [
    {
      "name": string,
      "count": number,
      "revenue": number
    }
  ],
  "totalRevenue": number
}
```

### Пример:
```json
{
  "serviceTypes": [
    {
      "name": "Массаж",
      "count": 45,
      "revenue": 67500
    },
    {
      "name": "Стрижка",
      "count": 32,
      "revenue": 24000
    },
    {
      "name": "Маникюр",
      "count": 28,
      "revenue": 21000
    }
  ],
  "totalRevenue": 112500
}
```

---

## 4. `/api/stats/masters` - Статистика по мастерам
**URL:** `GET /api/stats/masters?branchId={branchId}`
**Частота обновления:** Каждые 60 секунд

### Ожидаемый формат ответа:
```json
{
  "masters": [
    {
      "name": string,
      "count": number
    }
  ]
}
```

### Пример:
```json
{
  "masters": [
    {
      "name": "Алия",
      "count": 23
    },
    {
      "name": "Бегайым", 
      "count": 18
    },
    {
      "name": "Гульмира",
      "count": 15
    }
  ]
}
```

---

## 5. `/api/statistics/accounting` - Финансовая статистика
**URL:** `GET /api/statistics/accounting/{startDate}/{endDate}?branchId={branchId}`
**Частота обновления:** Каждые 60 секунд
**Примечание:** Для дашборда используется текущая дата как startDate и endDate

### Ожидаемый формат ответа:
```json
{
  "success": boolean,
  "data": [
    number, // dailyIncome - дневной доход
    number, // dailyExpenses - дневные расходы  
    number, // recordsCount - количество записей
    number  // netProfit - чистая прибыль
  ]
}
```

### Пример:
```json
{
  "success": true,
  "data": [
    85000,  // дневной доход
    12000,  // дневные расходы
    67,     // количество записей
    73000   // чистая прибыль
  ]
}
```

---

## Интерфейсы TypeScript

```typescript
interface DashboardStats {
  botStatus: boolean;
  stats: {
    activeUsers: number;
    messagesToday: number;
    apiUsage: number;
  };
}

interface Activity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  user: string;
  status: string;
}

interface ServiceTypeStats {
  name: string;
  count: number;
  revenue: number;
}

interface MasterStats {
  name: string;
  count: number;
}

interface AccountingStats {
  success: boolean;
  data: [number, number, number, number]; // [доходы, расходы, записи, прибыль]
}
```

---

## Особенности Dashboard

### Графики и визуализация:
- **Услуги:** Поддерживает 6 типов графиков (pie, bar, line, area, radar, radialBar)
- **Мастера:** Поддерживает те же 6 типов графиков
- **Цвета:** Использует предустановленную палитру из 8 цветов

### Кэширование:
- Основная статистика обновляется каждые 10 секунд
- Активности обновляются каждые 10 секунд  
- Статистика услуг и мастеров - каждые 60 секунд
- Финансовая статистика - каждые 60 секунд

### Условный рендеринг:
- Мастера видят редирект на `/master/calendar`
- Все запросы зависят от выбранного филиала (`currentBranch?.id`)
- Обработка состояний загрузки и ошибок для каждого API
