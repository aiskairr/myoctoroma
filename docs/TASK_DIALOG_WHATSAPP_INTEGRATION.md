# WhatsApp Integration in TaskDialog

## Описание

В диалоговое окно редактирования задач (`task-dialog-btn.tsx`) добавлена функциональность отправки WhatsApp сообщений клиенту напрямую из формы записи.

## Реализованные возможности

### 1. Отправка WhatsApp сообщений

- **Поле ввода:** текстовое поле для написания сообщения
- **Кнопка отправки:** зеленая кнопка с иконкой Send
- **Нормализация телефона:** автоматическое удаление "+" перед номером телефона
- **Интеграция с API:** использует тот же endpoint `/api/whatsapp/send`, что и страница `/chats`

### 2. UI/UX особенности

- Раздел WhatsApp расположен в левой колонке после поля "Примечания"
- Зеленая цветовая схема (bg-green-600) для соответствия бренду WhatsApp
- Иконка MessageCircle для визуальной идентификации раздела
- Поддержка отправки по Enter (без Shift)
- Автоматическое отключение (disabled) если:
  - Номер телефона клиента не указан
  - Сообщение идет в процессе отправки
  - Поле сообщения пустое

### 3. Валидация и обработка ошибок

- Проверка наличия номера телефона перед отправкой
- Проверка, что сообщение не пустое
- Toast-уведомления при успехе/ошибке:
  - Успех: `whatsapp.message_sent` / `whatsapp.message_sent_successfully`
  - Ошибка: `whatsapp.send_error` / `whatsapp.send_error_message`
- Автоматическая очистка поля ввода после успешной отправки

## Технические детали

### Endpoint
```
POST /api/whatsapp/send
```

### Request Body
```json
{
  "phone": "996700123456",
  "message": "Текст сообщения"
}
```

**Важно:** номер телефона автоматически нормализуется (удаляется "+").

### Response (успех)
```json
{
  "success": true,
  "data": {
    "messageId": "...",
    "timestamp": "2025-11-13T10:30:00.000Z"
  }
}
```

### Response (ошибка)
```json
{
  "success": false,
  "error": "Error message"
}
```

## Код

### Функция нормализации телефона
```ts
const normalizePhone = (phoneNumber: string) => {
    return phoneNumber.replace(/^\+/, '');
};
```

### Функция отправки
```ts
const sendWhatsAppMessage = async () => {
    if (!whatsappMessage.trim()) {
        toast({
            title: t('error'),
            description: t('whatsapp.type_message'),
            variant: 'destructive',
        });
        return;
    }

    const phone = watch('phone');
    if (!phone) {
        toast({
            title: t('error'),
            description: 'Номер телефона не указан',
            variant: 'destructive',
        });
        return;
    }

    setSendingWhatsapp(true);
    try {
        const normalizedPhone = normalizePhone(phone);
        console.log('📤 Sending WhatsApp message to:', normalizedPhone);

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
                    message: whatsappMessage.trim(),
                })
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to send message');
        }

        const data = await response.json();
        console.log('✅ WhatsApp message sent:', data);

        if (data.success) {
            toast({
                title: t('whatsapp.message_sent'),
                description: t('whatsapp.message_sent_successfully'),
                variant: 'default',
            });
            setWhatsappMessage('');
        }
    } catch (error) {
        console.error('❌ Error sending WhatsApp message:', error);
        toast({
            title: t('whatsapp.send_error'),
            description: t('whatsapp.send_error_message'),
            variant: 'destructive',
        });
    } finally {
        setSendingWhatsapp(false);
    }
};
```

### UI компонент
```tsx
{/* WhatsApp Message Section */}
<div className="border-t pt-4">
    <Label className="text-sm text-gray-600 flex items-center gap-2 mb-2">
        <MessageCircle className="h-4 w-4 text-green-600" />
        {t('whatsapp.chat_title')}
    </Label>
    <div className="flex gap-2">
        <Input
            value={whatsappMessage}
            onChange={(e) => setWhatsappMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendWhatsAppMessage()}
            placeholder={t('whatsapp.type_message')}
            disabled={sendingWhatsapp || !watch('phone')}
            className="flex-1"
        />
        <Button
            type="button"
            onClick={sendWhatsAppMessage}
            disabled={!whatsappMessage.trim() || sendingWhatsapp || !watch('phone')}
            className="bg-green-600 hover:bg-green-700"
            size="sm"
        >
            {sendingWhatsapp ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                <Send className="h-4 w-4" />
            )}
        </Button>
    </div>
    {!watch('phone') && (
        <p className="text-xs text-gray-400 mt-1">
            {t('edit_appointment.phone')} не указан
        </p>
    )}
</div>
```

## Используемые translation keys

- `whatsapp.chat_title` — заголовок раздела
- `whatsapp.type_message` — placeholder поля ввода
- `whatsapp.message_sent` — заголовок успешного уведомления
- `whatsapp.message_sent_successfully` — описание успешного уведомления
- `whatsapp.send_error` — заголовок ошибки
- `whatsapp.send_error_message` — описание ошибки
- `edit_appointment.phone` — подсказка о недоступности (если телефон не указан)

## Совместимость

- ✅ Использует те же endpoints, что и страница `/chats`
- ✅ Телефон автоматически нормализуется (удаляется "+")
- ✅ Работает с существующими записями (taskId задан)
- ✅ Работает при создании новых записей (номер телефона из формы)
- ✅ Поддерживает все локализации (ru/ky/en)

## Тестирование

1. Открыть диалог редактирования записи (клик по записи в календаре)
2. Заполнить номер телефона клиента (если еще не заполнен)
3. Ввести текст сообщения в поле WhatsApp
4. Нажать кнопку Send или Enter
5. Проверить успешное уведомление
6. Убедиться, что сообщение доставлено клиенту

## Замечания

- При отправке автоматически удаляется "+" перед номером (как и на странице /chats)
- Номер телефона должен быть в формате +996 (XXX) XXX-XXX (форматируется автоматически в форме)
- Backend должен возвращать `accountID` для филиала (для работы WhatsApp API)
- После успешной отправки поле ввода автоматически очищается

## Будущие улучшения (опционально)

- [ ] Добавить просмотр истории сообщений (интеграция с WhatsAppChat компонентом)
- [ ] Показывать статус доставки сообщения (delivered/read)
- [ ] Добавить шаблоны сообщений для быстрой отправки
- [ ] Отображать счетчик непрочитанных сообщений от клиента
