# Messages API Integration - Frontend

## Обзор

Интеграция нового Messages API для страницы чатов с поддержкой пагинации.

## Установлено

### 1. Переводы (×3 языка: ru/ky/en)

**Файл:** `src/contexts/LocaleContext.tsx`

Добавлено **6 ключей** × 3 языка = **18 переводов**:

```typescript
// Russian
'chats.load_more': 'Загрузить еще сообщения'
'chats.loading_messages': 'Загрузка сообщений...'
'chats.no_more_messages': 'Больше сообщений нет'
'chats.loading_older': 'Загрузка старых сообщений...'
'chats.messages_loaded': 'Сообщения загружены'
'chats.error_loading': 'Ошибка загрузки сообщений'

// Kyrgyz + English также добавлены
```

### 2. Custom Hook для Messages API

**Файл:** `src/hooks/use-messages.ts`

#### Интерфейсы:

```typescript
interface MessageItem {
  id: number;
  content: string;
  isFromClient: boolean;
  timestamp: string;
  messengerUrl?: string;
}

interface ClientMessages {
  client: {
    id: number;
    telegramId: string;
    firstName: string | null;
    lastName: string | null;
    username?: string | null;
    phoneNumber?: string | null;
  };
  messages: MessageItem[];
}

interface MessagesResponse {
  success: boolean;
  branchId: number;
  page: number;
  totalMessages: number;
  hasMore: boolean;
  data: ClientMessages[];
}
```

#### Экспортируемые хуки:

1. **`useMessages()`** - Основной хук для работы с API

```typescript
const {
  allData,           // Все загруженные данные (ClientMessages[])
  currentPageData,   // Текущая страница данных
  page,             // Номер текущей страницы
  totalMessages,    // Общее количество сообщений
  hasMore,          // Есть ли еще данные для загрузки
  isLoading,        // Статус загрузки
  error,            // Ошибка (если есть)
  loadNextPage,     // Функция для загрузки следующей страницы
  reset,            // Сброс к первой странице
  refetch,          // Ручное обновление данных
} = useMessages();
```

2. **`useClientMessages()`** - Хелпер для получения сообщений конкретного клиента

```typescript
const { client, messages, hasMessages } = useClientMessages(clientId, allData);
```

#### Особенности:

✅ **Автоматическая пагинация** - Загружает по 1500 сообщений за раз  
✅ **Автообновление** - Refetch каждые 30 секунд  
✅ **Дедупликация** - Предотвращает дублирование клиентов при пагинации  
✅ **TypeScript** - Полная типизация  
✅ **React Query** - Кеширование и оптимизация запросов  

## API Endpoint

### GET `/api/messages/:branchId/:pageNumber`

**Параметры:**
- `branchId` (integer) - ID филиала
- `pageNumber` (integer) - Номер страницы (начиная с 1)

**Пример запроса:**
```bash
GET /api/messages/1/1  # Первая страница (последние 1500 сообщений)
GET /api/messages/1/2  # Вторая страница (следующие 1500 сообщений)
```

**Формат ответа:**
```json
{
  "success": true,
  "branchId": 1,
  "page": 1,
  "totalMessages": 3500,
  "hasMore": true,
  "data": [
    {
      "client": {
        "id": 123,
        "telegramId": "im_abc123",
        "firstName": "Иван",
        "lastName": "Иванов",
        "username": "ivan_user",
        "phoneNumber": "996500123456"
      },
      "messages": [
        {
          "id": 5001,
          "content": "Здравствуйте!",
          "isFromClient": true,
          "timestamp": "2025-10-16T10:30:00.000Z",
          "messengerUrl": "https://example.com/messenger"
        },
        {
          "id": 5002,
          "content": "Добрый день! Чем могу помочь?",
          "isFromClient": false,
          "timestamp": "2025-10-16T10:31:00.000Z"
        }
      ]
    }
  ]
}
```

## Интеграция в Chats.tsx

### Вариант 1: Полная замена (рекомендуется)

Заменить старый endpoint на новый:

```typescript
import { useMessages, useClientMessages } from '@/hooks/use-messages';
import { useLocale } from '@/contexts/LocaleContext';

export default function Chats() {
  const { t } = useLocale();
  const {
    allData,
    hasMore,
    isLoading,
    error,
    loadNextPage,
  } = useMessages();

  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);

  // Получаем сообщения выбранного клиента
  const { client, messages } = useClientMessages(
    selectedClientId || 0,
    allData
  );

  return (
    <div className="flex h-screen">
      {/* Список клиентов */}
      <div className="w-1/3 border-r">
        {allData.map((item) => (
          <div
            key={item.client.id}
            onClick={() => setSelectedClientId(item.client.id)}
            className="cursor-pointer p-4 hover:bg-muted"
          >
            <h3>{item.client.firstName} {item.client.lastName}</h3>
            <p className="text-sm text-muted-foreground">
              {item.messages[item.messages.length - 1]?.content}
            </p>
          </div>
        ))}

        {/* Кнопка "Загрузить еще" */}
        {hasMore && (
          <Button onClick={loadNextPage} disabled={isLoading}>
            {isLoading ? t('chats.loading_older') : t('chats.load_more')}
          </Button>
        )}
      </div>

      {/* История сообщений */}
      <div className="flex-1">
        {selectedClientId && (
          <ConversationHistory 
            client={client} 
            messages={messages} 
          />
        )}
      </div>
    </div>
  );
}
```

### Вариант 2: Постепенная миграция

Добавить новый API параллельно со старым:

```typescript
// Старый API (оставить как есть)
const clientsQuery = useQuery<{ clients: Client[] }>({
  queryKey: ["/api/clients"],
  refetchInterval: 30000,
});

// Новый Messages API (добавить рядом)
const { allData: messagesData, hasMore, loadNextPage } = useMessages();
```

## Компоненты для обновления

### 1. ClientList Component

Обновить для использования `allData` из `useMessages()`:

```typescript
interface ClientListProps {
  clients: ClientMessages[];  // Изменить тип
  onSelectClient: (clientId: number) => void;
}

export function ClientList({ clients, onSelectClient }: ClientListProps) {
  return (
    <div>
      {clients.map((item) => (
        <div
          key={item.client.id}
          onClick={() => onSelectClient(item.client.id)}
        >
          <h3>
            {item.client.firstName} {item.client.lastName || item.client.username}
          </h3>
          <p className="text-sm">
            Сообщений: {item.messages.length}
          </p>
        </div>
      ))}
    </div>
  );
}
```

### 2. ConversationHistory Component

Компонент остается без изменений! Просто передавайте:

```typescript
<ConversationHistory 
  client={client}      // из useClientMessages
  messages={messages}  // из useClientMessages
/>
```

## UI для пагинации

### Простая кнопка

```typescript
{hasMore && (
  <Button 
    onClick={loadNextPage} 
    disabled={isLoading}
    className="w-full"
  >
    {isLoading ? (
      <>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        {t('chats.loading_older')}
      </>
    ) : (
      t('chats.load_more')
    )}
  </Button>
)}
```

### Infinite scroll (опционально)

```typescript
import { useInView } from 'react-intersection-observer';

function ChatsList() {
  const { ref, inView } = useInView();
  const { hasMore, loadNextPage, isLoading } = useMessages();

  useEffect(() => {
    if (inView && hasMore && !isLoading) {
      loadNextPage();
    }
  }, [inView, hasMore, isLoading, loadNextPage]);

  return (
    <div>
      {/* Список клиентов */}
      
      {/* Триггер для автозагрузки */}
      {hasMore && <div ref={ref} className="h-20" />}
    </div>
  );
}
```

## Обработка ошибок

```typescript
const { error, isLoading } = useMessages();

if (error) {
  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>
        {t('chats.error_loading')}
      </AlertDescription>
    </Alert>
  );
}
```

## Оптимизация производительности

### 1. Мемоизация клиентов

```typescript
const clientsList = useMemo(() => {
  return allData.map(item => ({
    ...item.client,
    lastMessage: item.messages[item.messages.length - 1],
  }));
}, [allData]);
```

### 2. Виртуализация списка

Для больших списков (1000+ клиентов):

```bash
npm install react-window
```

```typescript
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={allData.length}
  itemSize={80}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      <ClientItem client={allData[index].client} />
    </div>
  )}
</FixedSizeList>
```

## Тестирование

### 1. Проверка первой загрузки

```typescript
const { allData, totalMessages } = useMessages();

console.log('Loaded clients:', allData.length);
console.log('Total messages:', totalMessages);
```

### 2. Проверка пагинации

```typescript
const { hasMore, loadNextPage } = useMessages();

// В консоли должно быть:
// Page 1: hasMore = true
// Page 2: hasMore = true
// ...
// Last page: hasMore = false
```

### 3. Проверка автообновления

Подождите 30 секунд - данные должны обновиться автоматически.

## Troubleshooting

### Проблема: Дублирующиеся клиенты

**Решение:** Хук автоматически дедуплицирует по `client.id`

### Проблема: Сообщения не загружаются

**Проверьте:**
1. `currentBranch?.id` не null
2. Backend endpoint доступен
3. Токен авторизации валиден

### Проблема: Медленная загрузка

**Решение:**
- Используйте виртуализацию списка
- Увеличьте `staleTime` если данные не часто меняются
- Отключите `refetchInterval` если автообновление не нужно

## Миграция с старого API

### Шаг 1: Установка хука

```bash
# Файл уже создан в src/hooks/use-messages.ts
```

### Шаг 2: Замена в Chats.tsx

**Было:**
```typescript
const clientsQuery = useQuery<{ clients: Client[] }>({
  queryKey: ["/api/clients"],
});
```

**Стало:**
```typescript
const { allData, hasMore, loadNextPage } = useMessages();
```

### Шаг 3: Обновление ClientList

**Было:**
```typescript
<ClientList clients={clientsQuery.data?.clients || []} />
```

**Стало:**
```typescript
<ClientList clients={allData} />
```

### Шаг 4: Обновление ConversationHistory

**Было:**
```typescript
const clientDetailsQuery = useQuery({
  queryKey: ["/api/clients", selectedClientId],
});

<ConversationHistory 
  client={clientDetailsQuery.data?.client}
  messages={clientDetailsQuery.data?.messages}
/>
```

**Стало:**
```typescript
const { client, messages } = useClientMessages(selectedClientId, allData);

<ConversationHistory 
  client={client}
  messages={messages}
/>
```

## Дополнительные материалы

- **Backend документация:** `MESSAGES_API_DOCUMENTATION.md`
- **Quick Start:** `MESSAGES_API_QUICKSTART.md`
- **API Summary:** `MESSAGES_API_SUMMARY.md`

## Changelog

### v1.0.0 (16.10.2025)
- ✅ Создан хук `useMessages()` с пагинацией
- ✅ Создан хук `useClientMessages()` для клиентских данных
- ✅ Добавлено 18 переводов (ru/ky/en)
- ✅ Интеграция с TanStack Query v5
- ✅ Автоматическое обновление каждые 30 секунд
- ✅ Дедупликация клиентов
- ✅ TypeScript типизация

---

**Готово к интеграции!** 🚀
