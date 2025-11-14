# Custom Number Send Feature on Chats Page

## Описание

На странице `/chats` добавлена возможность отправки WhatsApp сообщений на произвольный номер телефона. Пользователь может отправить сообщение на любой номер, даже если этого контакта нет в списке существующих чатов.

## Реализованные возможности

### 1. UI компонент для отправки

- **Поле ввода номера:** Input для ввода номера телефона
- **Поле ввода сообщения:** Textarea для написания текста сообщения
- **Кнопка отправки:** зеленая кнопка с иконкой Send
- **Нормализация телефона:** автоматическое удаление "+" перед номером
- **Keyboard shortcuts:** Ctrl + Enter для быстрой отправки

### 2. Расположение

Секция "Отправить сообщение на номер" расположена:
- После заголовка страницы
- Перед секцией поиска
- Видна всегда, независимо от наличия чатов

### 3. UI/UX особенности

- **Цветовая схема:** оранжево-янтарная (from-amber-500 to-orange-600)
- **Responsive layout:** двухколоночная сетка на десктопе, одна колонка на мобильных
- **Подсказки:**
  - Формат номера телефона
  - Ctrl + Enter для отправки
- **Автоматическое отключение (disabled):**
  - Когда идет отправка
  - Если номер или сообщение пустые
- **Auto-reload:** После успешной отправки список чатов обновляется автоматически
- **Auto-clear:** Поля очищаются после успешной отправки

### 4. Валидация

- Проверка наличия номера телефона
- Проверка наличия текста сообщения
- Toast-уведомления при успехе/ошибке
- Нормализация номера (удаление "+")

## Технические детали

### State Management
```ts
const [customPhone, setCustomPhone] = useState('');
const [customMessage, setCustomMessage] = useState('');
const [sendingCustom, setSendingCustom] = useState(false);
```

### Функция нормализации
```ts
const normalizePhone = (phoneNumber: string) => {
    return phoneNumber.replace(/^\+/, '');
};
```

### Функция отправки
```ts
const sendToCustomNumber = async () => {
    if (!customPhone.trim()) {
        toast({
            title: t('error'),
            description: 'Введите номер телефона',
            variant: 'destructive',
        });
        return;
    }

    if (!customMessage.trim()) {
        toast({
            title: t('error'),
            description: t('whatsapp.type_message'),
            variant: 'destructive',
        });
        return;
    }

    setSendingCustom(true);
    try {
        const normalizedPhone = normalizePhone(customPhone);
        console.log('📤 Sending WhatsApp message to custom number:', normalizedPhone);

        const response = await fetch(
            `${import.meta.env.VITE_BACKEND_URL}/api/whatsapp/send`,
            {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    phone: normalizedPhone,
                    message: customMessage.trim(),
                })
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to send message');
        }

        const data = await response.json();
        console.log('✅ WhatsApp message sent to custom number:', data);

        if (data.success) {
            toast({
                title: t('whatsapp.message_sent'),
                description: t('whatsapp.message_sent_successfully'),
                variant: 'default',
            });
            
            // Очищаем поля после успешной отправки
            setCustomPhone('');
            setCustomMessage('');
            
            // Обновляем список чатов
            loadChats();
        }
    } catch (error) {
        console.error('❌ Error sending WhatsApp message:', error);
        toast({
            title: t('whatsapp.send_error'),
            description: t('whatsapp.send_error_message'),
            variant: 'destructive',
        });
    } finally {
        setSendingCustom(false);
    }
};
```

### UI Component
```tsx
{/* Отправка на произвольный номер */}
<Card className="rounded-xl shadow-lg">
  <CardHeader className="bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-t-xl">
    <CardTitle className="flex items-center gap-3 text-xl">
      <Send className="h-6 w-6" />
      Отправить сообщение на номер
    </CardTitle>
  </CardHeader>
  <CardContent className="p-6">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Номер телефона */}
      <div className="space-y-2">
        <Label htmlFor="custom-phone" className="flex items-center gap-2">
          <Phone className="h-4 w-4" />
          {t('edit_appointment.phone')}
        </Label>
        <Input
          id="custom-phone"
          placeholder="+996 (XXX) XXX-XXX"
          value={customPhone}
          onChange={(e) => setCustomPhone(e.target.value)}
          disabled={sendingCustom}
        />
        <p className="text-xs text-muted-foreground">
          Формат: +996XXXXXXXXX (автоматически удаляется "+")
        </p>
      </div>

      {/* Сообщение */}
      <div className="space-y-2">
        <Label htmlFor="custom-message" className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4" />
          {t('whatsapp.type_message')}
        </Label>
        <Textarea
          id="custom-message"
          placeholder={t('whatsapp.type_message')}
          value={customMessage}
          onChange={(e) => setCustomMessage(e.target.value)}
          disabled={sendingCustom}
          className="min-h-[100px] resize-none"
          onKeyPress={(e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
              sendToCustomNumber();
            }
          }}
        />
        <div className="flex justify-between items-center">
          <p className="text-xs text-muted-foreground">
            Ctrl + Enter для отправки
          </p>
          <Button
            onClick={sendToCustomNumber}
            disabled={!customPhone.trim() || !customMessage.trim() || sendingCustom}
            className="bg-green-600 hover:bg-green-700"
          >
            {sendingCustom ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('whatsapp.loading')}
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                {t('whatsapp.message_sent') || 'Отправить'}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  </CardContent>
</Card>
```

## Endpoint

### POST /api/whatsapp/send

**Request Body:**
```json
{
  "phone": "996700123456",
  "message": "Текст сообщения"
}
```

**Важно:** номер телефона автоматически нормализуется (удаляется "+").

**Response (успех):**
```json
{
  "success": true,
  "data": {
    "messageId": "...",
    "timestamp": "2025-11-13T10:30:00.000Z"
  }
}
```

**Response (ошибка):**
```json
{
  "success": false,
  "error": "Error message"
}
```

## Используемые translation keys

- `edit_appointment.phone` — label для номера телефона
- `whatsapp.type_message` — placeholder/label для сообщения
- `whatsapp.loading` — текст при отправке
- `whatsapp.message_sent` — заголовок успешного уведомления
- `whatsapp.message_sent_successfully` — описание успешного уведомления
- `whatsapp.send_error` — заголовок ошибки
- `whatsapp.send_error_message` — описание ошибки
- `error` — общий заголовок ошибки

## Workflow

1. Пользователь открывает страницу `/chats`
2. В верхней части видит секцию "Отправить сообщение на номер"
3. Вводит номер телефона (формат: +996XXXXXXXXX)
4. Вводит текст сообщения
5. Нажимает кнопку "Отправить" или Ctrl + Enter
6. Номер автоматически нормализуется (удаляется "+")
7. Отправляется POST запрос на `/api/whatsapp/send`
8. После успешной отправки:
   - Показывается success toast
   - Поля очищаются
   - Список чатов обновляется
9. При ошибке показывается error toast

## Преимущества

- ✅ Быстрая отправка без необходимости искать чат
- ✅ Работает с новыми контактами (не требует существующего чата)
- ✅ Автоматическая нормализация номера
- ✅ Keyboard shortcuts для удобства
- ✅ Автоматическое обновление списка чатов после отправки
- ✅ Очистка полей после успешной отправки
- ✅ Понятные подсказки и валидация

## Совместимость

- ✅ Использует те же endpoints, что и WhatsAppChat компонент
- ✅ Телефон автоматически нормализуется (удаляется "+")
- ✅ Работает с существующим backend API
- ✅ Поддерживает все локализации (ru/ky/en)
- ✅ Responsive дизайн (desktop + mobile)

## Тестирование

1. Открыть страницу `/chats`
2. Найти секцию "Отправить сообщение на номер" (оранжевый header)
3. Ввести номер телефона: +996700123456
4. Ввести сообщение: "Тестовое сообщение"
5. Нажать "Отправить" или Ctrl + Enter
6. Проверить success toast
7. Убедиться, что поля очистились
8. Проверить, что список чатов обновился
9. Убедиться, что сообщение доставлено

## Замечания

- При отправке автоматически удаляется "+" перед номером (как и везде в приложении)
- После успешной отправки список чатов обновляется — новый чат должен появиться
- Если чат с этим номером уже существует, он обновится с новым сообщением
- Backend должен возвращать `accountID` для филиала (для работы WhatsApp API)

## Будущие улучшения (опционально)

- [ ] Добавить шаблоны сообщений для быстрой отправки
- [ ] Сохранять историю отправленных сообщений
- [ ] Добавить возможность загрузки файлов/изображений
- [ ] Валидация формата номера телефона (маска ввода)
- [ ] Автодополнение номеров из базы клиентов
