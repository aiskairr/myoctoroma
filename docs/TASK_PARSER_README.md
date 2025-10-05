# Task Parser API - Руководство по использованию

## Описание

Task Parser API - это система для регулярного опроса внешнего API задач каждую минуту. Парсер отправляет запросы на указанный endpoint и предоставляет данные через подписки и хуки React.

## Основные возможности

- ✅ Автоматический опрос API каждую минуту
- ✅ Подписка на обновления данных
- ✅ React хуки для удобной интеграции
- ✅ Управление состоянием парсера
- ✅ Обработка ошибок
- ✅ Кастомные параметры запросов
- ✅ Фильтрация по датам

## API Endpoint

По умолчанию парсер обращается к:
```
https://puny-noemi-promconsulting-453531f5.koyeb.app/api/tasks
```

### Параметры запроса

- `branchId=1` - ID филиала (по умолчанию)
- `scheduledAfter` - Начало диапазона времени (ISO формат)
- `scheduledBefore` - Конец диапазона времени (ISO формат)
- `sortBy=scheduleDate` - Сортировка по дате записи
- `sortOrder=asc` - Порядок сортировки (по возрастанию)
- `userRole=superadmin` - Роль пользователя

### Пример полного URL

```
https://puny-noemi-promconsulting-453531f5.koyeb.app/api/tasks?branchId=1&scheduledAfter=2025-10-02T18%3A00%3A00.000Z&scheduledBefore=2025-10-03T17%3A59%3A59.999Z&sortBy=scheduleDate&sortOrder=asc&userRole=superadmin
```

## Установка и использование

### 1. Импорт сервиса

```typescript
import { taskParserService } from '@/services/task-parser';
```

### 2. Базовое использование сервиса

```typescript
// Запуск парсера
taskParserService.start();

// Подписка на данные
const unsubscribe = taskParserService.subscribe((data) => {
  console.log('Получены данные:', data);
  console.log('Количество записей:', data.count);
});

// Остановка парсера
taskParserService.stop();

// Отписка от обновлений
unsubscribe();
```

### 3. Использование React хуков

#### Ручное управление

```typescript
import { useTaskParser } from '@/hooks/use-task-parser';

const MyComponent = () => {
  const parser = useTaskParser({
    onDataReceived: (data) => {
      console.log('Получены данные:', data);
    },
    onError: (error) => {
      console.error('Ошибка:', error);
    }
  });

  return (
    <div>
      <button onClick={() => parser.start()}>Запустить</button>
      <button onClick={() => parser.stop()}>Остановить</button>
      <button onClick={() => parser.fetchManually()}>Запросить сейчас</button>
      
      <p>Статус: {parser.isRunning ? 'Активен' : 'Остановлен'}</p>
      <p>Записей: {parser.tasksCount}</p>
    </div>
  );
};
```

#### Автоматический запуск

```typescript
import { useAutoTaskParser } from '@/hooks/use-task-parser';

const MyComponent = () => {
  const parser = useAutoTaskParser((data) => {
    // Автоматическая обработка данных
    console.log('Новые данные:', data);
  });

  return (
    <div>
      <p>Записей: {parser.tasksCount}</p>
      <p>Последнее обновление: {parser.lastUpdate}</p>
    </div>
  );
};
```

#### Парсинг для конкретной даты

```typescript
import { useTaskParserForDate } from '@/hooks/use-task-parser';

const MyComponent = () => {
  const targetDate = new Date('2025-10-03');
  
  const parser = useTaskParserForDate(targetDate, {
    autoStart: true,
    onDataReceived: (data) => {
      console.log(`Данные за ${targetDate}:`, data);
    }
  });

  return <div>Записей за {targetDate.toDateString()}: {parser.tasksCount}</div>;
};
```

## Интеграция с календарем

В компоненте `DailyCalendar` уже интегрирована панель управления парсером:

```typescript
<TaskParserControlPanel 
  selectedDate={selectedDate}
  onDataReceived={(data) => {
    console.log('Получены данные:', data);
    toast({
      title: "Данные обновлены",
      description: `Получено записей: ${data.count}`,
      variant: data.success ? "default" : "destructive"
    });
  }}
/>
```

## API Интерфейсы

### TaskParserResponse

```typescript
interface TaskParserResponse {
  success: boolean;
  data: ParsedTask[];
  timestamp: string;
  count: number;
}
```

### ParsedTask

```typescript
interface ParsedTask {
  id: number;
  clientId: number;
  client: {
    id: number;
    telegramId: string;
    firstName?: string;
    lastName?: string;
    customName?: string;
    phoneNumber?: string;
  };
  status: string;
  serviceType?: string;
  serviceServiceId?: number;
  serviceDuration?: number;
  duration?: number;
  servicePrice?: number;
  finalPrice?: number;
  scheduleDate?: string;
  scheduleTime?: string;
  endTime?: string;
  masterName?: string;
  masterId?: number;
  branchId?: string;
  notes?: string;
  mother?: number;
  paid?: string;
  createdAt: string;
}
```

## Утилиты

### Работа с датами

```typescript
import { getDateRange, formatDateForAPI } from '@/services/task-parser';

// Получить диапазон дат для дня
const today = new Date();
const { scheduledAfter, scheduledBefore } = getDateRange(today);

// Форматировать дату для API
const formattedDate = formatDateForAPI(new Date());
```

### Статус парсера

```typescript
const status = taskParserService.getStatus();
console.log('Запущен:', status.isRunning);
console.log('Подписчиков:', status.subscribersCount);
```

## Мониторинг и отладка

### Логирование

Парсер выводит подробные логи в консоль:

```
[TaskParser] Starting task parser...
[TaskParser] Fetching tasks from: https://...
[TaskParser] Successfully fetched 5 tasks at 2025-10-03T12:00:00.000Z
```

### Обработка ошибок

```typescript
const parser = useTaskParser({
  onError: (error) => {
    console.error('Ошибка парсера:', error.message);
    // Отправить в систему мониторинга
    // notificationService.sendError(error);
  }
});
```

## Настройка параметров

### Кастомные параметры

```typescript
const parser = useTaskParser({
  customParams: {
    branchId: '2',
    userRole: 'admin',
    additionalFilter: 'active'
  }
});
```

### Изменение даты

```typescript
const parser = useTaskParser({
  date: new Date('2025-10-05') // Парсинг для конкретной даты
});
```

## Производительность

- Интервал опроса: 1 минута (60000 мс)
- Автоматическая отписка при размонтировании компонента
- Кэширование последних данных
- Обработка ошибок сети

## Безопасность

- CORS обработка включена
- Проверка валидности ответов API
- Graceful обработка ошибок
- Защита от множественных подписок

## Примеры использования

### В компоненте календаря

```typescript
const CalendarComponent = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const parser = useTaskParser({
    date: selectedDate,
    autoStart: true,
    onDataReceived: (data) => {
      // Обновляем кэш React Query
      queryClient.setQueryData(['tasks', selectedDate], data.data);
    }
  });

  return (
    <div>
      <input 
        type="date" 
        onChange={(e) => setSelectedDate(new Date(e.target.value))}
      />
      <div>Записей: {parser.tasksCount}</div>
    </div>
  );
};
```

### Для уведомлений

```typescript
const NotificationComponent = () => {
  useAutoTaskParser((data) => {
    if (data.success && data.count > 0) {
      const newTasks = data.data.filter(task => task.status === 'new');
      if (newTasks.length > 0) {
        toast({
          title: "Новые записи",
          description: `Поступило ${newTasks.length} новых записей`
        });
      }
    }
  });

  return null; // Компонент только для логики
};
```

## Часто задаваемые вопросы

### Q: Как изменить интервал опроса?

A: В текущей версии интервал фиксирован (1 минута). Для изменения нужно модифицировать константу в `task-parser.ts`:

```typescript
// Вместо 60000 (1 минута)
this.intervalId = setInterval(() => {
  this.performRequest(customParams);
}, 30000); // 30 секунд
```

### Q: Можно ли использовать несколько парсеров одновременно?

A: Сервис реализован как синглтон, но поддерживает множественные подписки. Используйте разные хуки для разных компонентов.

### Q: Как обработать сбои сети?

A: Парсер автоматически обрабатывает ошибки и продолжает работу. Используйте колбэк `onError` для дополнительной обработки.

### Q: Как интегрировать с существующим API?

A: Измените `API_URL` в `task-parser.ts` и адаптируйте интерфейсы под ваш формат данных.

## Поддержка

Для вопросов и предложений обращайтесь к разработчикам проекта.
