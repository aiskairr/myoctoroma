# Эндпоинты календаря

## Обзор
Календарь теперь видим и исправлен бесконечный цикл! 🎉

Календарь использует следующие API эндпоинты:

---

## 📡 Основные эндпоинты

### 1. **GET /calendar** (PRIMARY BACKEND)
Получение задач для календаря

**Параметры запроса:**
- `branchId` - ID филиала
- `scheduledAfter` - Дата начала (YYYY-MM-DD)
- `scheduledBefore` - Дата окончания (YYYY-MM-DD)
- `sortBy` - Сортировка: `scheduleDate` | `scheduleTime` | `clientName` | `serviceType` | `masterName`
- `sortOrder` - Порядок: `asc` | `desc`
- `userRole` - Роль пользователя
- `userMasterId` - ID мастера (для фильтрации)
- `status` - Статус задачи
- `timezone` - Часовой пояс

**Формат ответа:**
```json
[
  {
    "id": "123",
    "clientId": 1,
    "status": "scheduled",
    "serviceType": "Стрижка",
    "serviceServiceId": 1,
    "serviceDuration": 60,
    "servicePrice": 1000,
    "discount": 0,
    "finalPrice": 1000,
    "scheduleDate": "2025-01-15T00:00:00.000Z",
    "scheduleTime": "10:00",
    "endTime": "11:00",
    "masterId": 5,
    "notes": "Примечания",
    "branchId": "1",
    "mother": null,
    "paymentMethod": "cash",
    "paid": "unpaid",
    "client": {
      "id": 1,
      "firstName": "Иван",
      "lastName": "Петров",
      "phoneNumber": "+79001234567"
    }
  }
]
```

**Используется в:**
- `src/hooks/use-tasks.ts` (строка 104)
- `src/hooks/use-calendar-tasks.ts`

---

### 2. **GET /staff/:branchId** (PRIMARY BACKEND)
Получение списка мастеров для филиала

**Параметры URL:**
- `:branchId` - ID филиала

**Формат ответа:**
```json
[
  {
    "id": 1,
    "name": "Иван Иванов",
    "specialty": "Парикмахер",
    "color": "#3B82F6",
    "isActive": true
  }
]
```

**Используется в:**
- `src/pages/Calendar/components/time-schedule.tsx` (строка 473)
- `src/hooks/use-masters.ts`

---

### 3. **GET /api/masters/:masterId/working-dates** (PRIMARY BACKEND)
Получение рабочих дат мастера

**Параметры URL:**
- `:masterId` - ID мастера

**Параметры запроса:**
- `workDate` - Дата (YYYY-MM-DD)
- `branchId` - ID филиала

**Формат ответа:**
```json
[
  {
    "id": 1,
    "masterId": 1,
    "workDate": "2025-01-15",
    "startTime": "09:00",
    "endTime": "18:00",
    "branchId": "1"
  }
]
```

**Используется в:**
- `src/hooks/use-master-working-dates.ts`

---

### 4. **POST /api/masters/:masterId/working-dates** (PRIMARY BACKEND)
Добавление мастера на рабочий день

**Параметры URL:**
- `:masterId` - ID мастера

**Тело запроса:**
```json
{
  "workDate": "2025-01-15",
  "startTime": "09:00",
  "endTime": "18:00",
  "branchId": "1"
}
```

**Используется в:**
- `src/pages/Calendar/components/time-schedule.tsx` (строка 182)

---

### 5. **PATCH /api/tasks/:taskId** (PRIMARY BACKEND)
Обновление задачи (перемещение, изменение времени, статуса)

**Параметры URL:**
- `:taskId` - ID задачи

**Тело запроса:**
```json
{
  "scheduleTime": "10:00",
  "endTime": "11:00",
  "masterId": 5,
  "status": "scheduled",
  "paid": "paid"
}
```

**Используется в:**
- `src/pages/Calendar/components/time-schedule.tsx` (строки 233, 697)

---

### 6. **GET /api/tasks/:taskId** (PRIMARY BACKEND)
Получение конкретной задачи

**Параметры URL:**
- `:taskId` - ID задачи

**Формат ответа:**
```json
{
  "id": "123",
  "clientId": 1,
  "status": "scheduled",
  "serviceType": "Стрижка",
  "scheduleTime": "10:00",
  "masterId": 5,
  "client": {
    "id": 1,
    "firstName": "Иван"
  }
}
```

**Используется в:**
- `src/pages/Calendar/components/time-schedule.tsx` (строка 564)

---

### 7. **GET /api/services** (PRIMARY BACKEND)
Получение списка услуг

**Формат ответа:**
```json
[
  {
    "id": 1,
    "name": "Стрижка мужская",
    "duration": 60,
    "price": 1000,
    "category": "Стрижки"
  }
]
```

**Используется в:**
- `src/hooks/use-services.ts`

---

## 🔧 Исправления

### Что было исправлено:

1. ✅ **Убран бесконечный цикл** в `src/pages/Calendar/index.tsx`
   - Удален `setInterval` который проверял URL каждые 500ms
   - Оставлен только `popstate` listener для навигации

2. ✅ **Добавлены axios interceptors** в `src/API/http.ts`
   - Токен автоматически добавляется ко всем запросам
   - Исправлена проблема с 401 ошибками после изменения кода

3. ✅ **Исправлен useEffect цикл** в `src/contexts/BranchContext.tsx`
   - Разделены `logCheck()` и `fetchBranches()`
   - Убрана зависимость от `orgData` в `logCheck()`

---

## 📋 Структура данных

### Task (Задача)
```typescript
interface Task {
  id: string;
  clientId: number;
  status: "scheduled" | "in_progress" | "completed" | "cancelled" | "no_show";
  serviceType: string;
  serviceDuration: number;
  servicePrice: number;
  scheduleDate: string; // ISO-8601 format
  scheduleTime: string; // "HH:MM" format
  endTime: string; // "HH:MM" format
  masterId: number;
  branchId: string;
  mother: string | null; // ID родительской задачи
  paid: "paid" | "unpaid";
  client: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
  };
}
```

### Master (Мастер)
```typescript
interface Master {
  id: number;
  name: string;
  specialty: string;
  isActive: boolean;
  color: string;
}
```

### WorkingDate (Рабочая дата)
```typescript
interface WorkingDate {
  id: number;
  masterId: number;
  workDate: string; // "YYYY-MM-DD"
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  branchId: string;
}
```

---

## 🎯 Следующие шаги

Теперь календарь должен корректно работать! Проверьте:

1. Открывается ли календарь без ошибок
2. Видны ли мастера и их рабочие часы
3. Загружаются ли задачи на текущую дату
4. Можно ли перетаскивать задачи
5. Сохраняются ли изменения

Если возникают проблемы с конкретными эндпоинтами, проверьте консоль браузера - там логируются все запросы с подробной информацией.
