# Интеграция данных задач и мастеров на фронтенде

## Обзор изменений

Реализована система объединения данных из двух API endpoints:
- `GET /api/tasks` - возвращает задачи с `masterId`
- `GET /api/crm/masters` - возвращает список мастеров с именами

На фронтенде автоматически присваивается `masterName` к каждой задаче.

## Новые файлы и хуки

### 1. `src/hooks/use-tasks.ts` - Универсальный хук для работы с задачами

#### Основные функции:
- `useTasks(params)` - базовый хук для получения задач с любыми параметрами
- `useTasksForDate(date)` - получение задач для конкретной даты
- `useTasksForDateRange(start, end)` - получение задач для периода
- `useMyTasks(date?)` - получение задач текущего мастера

#### Интерфейсы (обновлено):
```typescript
interface TaskFromAPI {
  id: string; // ID может быть строкой
  clientId: number;
  status: string;
  serviceType: string | null;
  serviceServiceId?: number;
  serviceDuration: number | null;
  servicePrice: number | null;
  discount?: number;
  finalPrice: number | null;
  scheduleDate: string | null; // ISO строка
  scheduleTime: string | null;
  endTime: string | null; // может отсутствовать
  masterId: number | null;
  masterName?: string | null; // приходит с API, но перезаписывается
  notes: string | null;
  branchId: string;
  paid?: string;
  createdAt?: string;
  updatedAt?: string;
  client?: {
    id: number;
    telegramId: string;
    firstName?: string;
    lastName?: string;
    customName?: string;
    phoneNumber?: string;
    isActive?: boolean;
  };
}

interface TaskWithMaster extends TaskFromAPI {
  masterName: string | null; // ← Перезаписывается данными из masters API
  master?: Master | null;    // ← Полная информация о мастере
  clientName?: string;       // ← Вычисляемое поле для совместимости
}
```

## Реальная структура данных (обновлено)

### Пример данных из API `/api/tasks`:
```json
{
  "id": "111759501386762580",
  "clientId": 12,
  "status": "scheduled",
  "serviceType": "VIP пакет",
  "serviceServiceId": 59,
  "serviceDuration": 90,
  "servicePrice": null,
  "discount": 0,
  "finalPrice": null,
  "scheduleDate": "2025-10-03T00:00:00.000Z",
  "scheduleTime": "09:45",
  "endTime": null,
  "masterId": 4,
  "masterName": "Федор", // Игнорируется и перезаписывается
  "notes": "Задача создана вручную через интерфейс",
  "branchId": "1",
  "paid": "unpaid",
  "createdAt": "2025-10-03T14:23:07.072Z",
  "updatedAt": "2025-10-03T14:23:07.072Z",
  "client": {
    "id": 12,
    "telegramId": "wa1_1234567890",
    "firstName": "jhbjhbjhb",
    "lastName": "Клиент",
    "customName": null,
    "phoneNumber": "+1234567890",
    "isActive": true
  }
}
```

### Обработка на фронтенде:

1. **Вычисление clientName**:
```typescript
const clientName = task.client?.customName || 
                  task.client?.firstName || 
                  (task.client?.firstName && task.client?.lastName ? 
                    `${task.client.firstName} ${task.client.lastName}` : '') ||
                  'Клиент';
```

2. **Вычисление endTime** (если отсутствует):
```typescript
if (!task.endTime && task.scheduleTime && task.serviceDuration) {
  const [hours, minutes] = task.scheduleTime.split(':').map(Number);
  const startMinutes = hours * 60 + minutes;
  const endMinutes = startMinutes + task.serviceDuration;
  const endHours = Math.floor(endMinutes / 60);
  const endMins = endMinutes % 60;
  endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
}
```

3. **Перезапись masterName**:
```typescript
const master = mastersMap.get(task.masterId);
const masterName = master ? master.name : null; // Игнорируем masterName из API
```

### 2. Обновленный `src/hooks/use-calendar-tasks.ts`

Теперь использует универсальный хук `use-tasks.ts`:

```typescript
import { useTasksForDate, type TaskWithMaster } from './use-tasks';

export type CalendarTask = TaskWithMaster;

export function useCalendarTasks(selectedDate: Date = new Date()) {
  return useTasksForDate(selectedDate);
}
```

### 3. Обновленный компонент календаря

В `src/pages/Calendar/components/time-schedule.tsx` добавлено подробное логирование процесса объединения данных.

## Принцип работы

### 1. Параллельные запросы
```typescript
// Автоматически выполняются параллельно:
const tasksQuery = useQuery(['tasks', ...], () => fetch('/api/tasks'));
const mastersQuery = useQuery(['masters', ...], () => fetch('/api/crm/masters'));
```

### 2. Объединение данных
```typescript
const tasksWithMasters = useMemo(() => {
  // Создаем карту мастеров
  const mastersMap = new Map(masters.map(m => [m.id, m]));
  
  // Присваиваем masterName к каждой задаче
  return tasks.map(task => ({
    ...task,
    masterName: task.masterId ? mastersMap.get(task.masterId)?.name : null,
    master: task.masterId ? mastersMap.get(task.masterId) : null
  }));
}, [tasks, masters]);
```

### 3. Кэширование и оптимизация
- Данные мастеров кэшируются отдельно (5 минут)
- Задачи обновляются каждую минуту
- Объединение происходит только при изменении исходных данных

## Использование в компонентах

### Календарь
```typescript
const { data: tasksData, isLoading, error } = useCalendarTasks(selectedDate);

// tasksData теперь содержит masterName для каждой задачи
tasksData.forEach(task => {
  console.log(`Задача ${task.id}: клиент ${task.clientName}, мастер ${task.masterName}`);
});
```

### Dashboard (будущее использование)
```typescript
const { data: todayTasks } = useTasksForDate(new Date());
const { data: weekTasks } = useTasksForDateRange(startOfWeek, endOfWeek);
const { data: myTasks } = useMyTasks(selectedDate);
```

### Произвольные запросы
```typescript
const { data: completedTasks } = useTasks({
  status: 'completed',
  scheduledAfter: '2025-10-01T00:00:00.000Z',
  scheduledBefore: '2025-10-31T23:59:59.999Z'
});
```

## Логирование и отладка

Все хуки предоставляют подробное логирование:
- 📡 API запросы
- 📦 Полученные данные
- 🔄 Процесс объединения
- ✅ Результат
- ⚠️ Предупреждения о недостающих мастерах

## API Спецификация

### Изменения в backend требованиях:
- `GET /api/tasks` НЕ должен возвращать `masterName`
- `GET /api/tasks` должен возвращать только `masterId`
- `GET /api/crm/masters/{branchId}` должен продолжать работать как есть

### Пример ответа от `/api/tasks`:
```json
[
  {
    "id": 123,
    "clientId": 456,
    "masterId": 5,
    "clientName": "Иван Иванов",
    "serviceType": "Стрижка",
    "scheduleDate": "2025-10-03",
    "scheduleTime": "10:00",
    "endTime": "10:45"
  }
]
```

Фронтенд автоматически добавит `masterName: "Анна Петрова"` на основе данных из `/api/crm/masters`.

## Преимущества

1. **Консистентность данных** - имена мастеров всегда актуальны
2. **Производительность** - мастера кэшируются отдельно
3. **Гибкость** - один хук для всех случаев использования
4. **Типобезопасность** - полная типизация TypeScript
5. **Отладка** - подробное логирование процессов
