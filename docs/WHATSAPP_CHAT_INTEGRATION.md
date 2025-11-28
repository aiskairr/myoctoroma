# WhatsApp Chat Integration

## Описание

Интегрирован полнофункциональный WhatsApp чат в CRM систему для общения с клиентами через WhatsApp.

## Компоненты

### WhatsAppChat.tsx

**Расположение:** `src/components/WhatsAppChat.tsx`

**Описание:** Полноценный компонент чата с поддержкой:
- Отправка сообщений
- Просмотр истории сообщений
- Разделение на входящие/исходящие сообщения
- Отображение статистики (отправлено/получено)
- Автопрокрутка к последним сообщениям
- Разделители по датам
- Загрузка истории чата

**Props:**
```typescript
interface WhatsAppChatProps {
  phone: string;           // Номер телефона клиента
  clientName?: string;     // Имя клиента (опционально)
  clientId?: number;       // ID клиента (опционально)
  isOpen: boolean;         // Состояние открытия диалога
  onClose: () => void;     // Callback для закрытия
}
```

## API Endpoints

### Отправка сообщения
```
POST /api/whatsapp/send
Content-Type: application/json

{
  "phoneNumber": "996700123456",
  "message": "Текст сообщения"
}
```

**Ответ:**
```json
{
  "success": true,
  "phoneNumber": "996700123456",
  "message": "Текст сообщения",
  "messageId": "unique-message-id"
}
```

### Получение истории чата
```
GET /api/whatsapp/chats?phone=996700123456
```

**Ответ:**
```json
{
  "success": true,
  "phoneNumber": "996700123456",
  "messages": [
    {
      "id": "msg-1",
      "direction": "outgoing",
      "message": "Привет",
      "to": "996700123456",
      "from": "996555123456",
      "sentAt": "2024-01-15T10:30:00Z",
      "status": "sent",
      "source": "db"
    }
  ],
  "stats": {
    "totalMessages": 10,
    "sentMessages": 6,
    "receivedMessages": 4
  }
}
```

## Интеграция в Clients.tsx

### Использование

1. **Импорт компонента:**
```typescript
import WhatsAppChat from '@/components/WhatsAppChat';
import { MessageCircle } from 'lucide-react';
```

2. **Добавление состояния:**
```typescript
const [isWhatsAppChatOpen, setIsWhatsAppChatOpen] = useState(false);
const [whatsappClientData, setWhatsappClientData] = useState<{
  phone: string;
  name: string;
  id: number;
} | null>(null);
```

3. **Кнопка для открытия чата:**
```tsx
<Button 
  variant="outline" 
  size="sm" 
  onClick={() => {
    setWhatsappClientData({
      phone: client.phoneNumber,
      name: getClientDisplayName(client),
      id: client.id
    });
    setIsWhatsAppChatOpen(true);
  }}
>
  <MessageCircle className="h-4 w-4 mr-1" />
  WhatsApp
</Button>
```

4. **Рендеринг компонента:**
```tsx
{whatsappClientData && (
  <WhatsAppChat
    isOpen={isWhatsAppChatOpen}
    onClose={() => setIsWhatsAppChatOpen(false)}
    phone={whatsappClientData.phone}
    clientName={whatsappClientData.name}
    clientId={whatsappClientData.id}
  />
)}
```

## Локализация

### Ключи переводов

**LocaleContext.tsx** содержит следующие ключи:

```typescript
// Русский (ru)
'whatsapp.chat_title': 'WhatsApp чат',
'whatsapp.message_sent': 'Сообщение отправлено',
'whatsapp.message_sent_successfully': 'Сообщение успешно отправлено',
'whatsapp.send_error': 'Ошибка отправки',
'whatsapp.send_error_message': 'Не удалось отправить сообщение',
'whatsapp.error_loading_history': 'Ошибка загрузки истории сообщений',
'whatsapp.no_messages': 'Нет сообщений',
'whatsapp.type_message': 'Введите сообщение...',
'whatsapp.sent': 'Отправлено',
'whatsapp.received': 'Получено',
'whatsapp.loading': 'Загрузка...',

// кыргызский (ky)
'whatsapp.chat_title': 'WhatsApp чат',
'whatsapp.message_sent': 'Билдирүү жөнөтүлдү',
'whatsapp.message_sent_successfully': 'Билдирүү ийгиликтүү жөнөтүлдү',
'whatsapp.send_error': 'Жөнөтүү катасы',
'whatsapp.send_error_message': 'Билдирүүнү жөнөтүү мүмкүн эмес',
'whatsapp.error_loading_history': 'Билдирүүлөр тарыхын жүктөөдө ката',
'whatsapp.no_messages': 'Билдирүүлөр жок',
'whatsapp.type_message': 'Билдирүү жазыңыз...',
'whatsapp.sent': 'Жөнөтүлгөн',
'whatsapp.received': 'Алынган',
'whatsapp.loading': 'Жүктөлүүдө...',

// Английский (en)
'whatsapp.chat_title': 'WhatsApp Chat',
'whatsapp.message_sent': 'Message sent',
'whatsapp.message_sent_successfully': 'Message sent successfully',
'whatsapp.send_error': 'Send error',
'whatsapp.send_error_message': 'Failed to send message',
'whatsapp.error_loading_history': 'Error loading message history',
'whatsapp.no_messages': 'No messages',
'whatsapp.type_message': 'Type a message...',
'whatsapp.sent': 'Sent',
'whatsapp.received': 'Received',
'whatsapp.loading': 'Loading...',
```

## Особенности реализации

### Нормализация номеров телефонов

Компонент автоматически удаляет знак `+` из номеров телефонов перед отправкой на API:

```typescript
const normalizePhone = (phoneNumber: string) => {
  return phoneNumber.replace(/^\+/, '');
};
```

### Цветовое кодирование сообщений

- **Исходящие сообщения**: Зеленый фон (`bg-green-500`)
- **Входящие сообщения**: Серый фон (`bg-gray-200`)

### UI/UX Features

1. **Статистика сообщений:** Отображается в header диалога
2. **Автоскролл:** При загрузке истории автоматически прокручивается к последнему сообщению
3. **Разделители дат:** Между сообщениями разных дат отображается разделитель
4. **Индикаторы загрузки:** При отправке/загрузке отображаются спиннеры
5. **Toast уведомления:** Успешная отправка/ошибки отображаются через toast

## Тестирование

### Проверка функционала

1. Открыть страницу Clients
2. Выбрать клиента с номером телефона
3. Нажать кнопку "WhatsApp" в деталях клиента
4. Проверить загрузку истории сообщений
5. Отправить тестовое сообщение
6. Проверить статистику

### Требования к Backend

Backend должен поддерживать:
- Endpoint `POST /api/whatsapp/send`
- Endpoint `GET /api/whatsapp/chats?phone=...`
- CORS с `credentials: 'include'`
- Правильную нормализацию номеров телефонов

## Дальнейшие улучшения (опционально)

- [ ] Поддержка вложений (изображения, файлы)
- [ ] Статусы доставки сообщений (отправлено, доставлено, прочитано)
- [ ] Websocket для real-time обновлений входящих сообщений
- [ ] Поиск по истории сообщений
- [ ] Пагинация для больших историй чатов
- [ ] Экспорт истории чата
- [ ] Быстрые ответы (templates)

## Версия

**Дата интеграции:** 2024-01-15
**Версия:** 1.0.0
**Статус:** ✅ Готово к использованию
