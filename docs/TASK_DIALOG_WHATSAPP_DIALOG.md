# TaskDialog WhatsApp Chat Dialog Integration

## Обзор
Заменили inline input для отправки WhatsApp сообщений в TaskDialog на полноценный диалог с компонентом WhatsAppChat, используя паттерн payment dialog.

## Дата внедрения
**2024** (текущая дата)

## Изменённые файлы

### 1. `/src/pages/Calendar/components/task-dialog-btn.tsx`

#### Добавлены импорты
```typescript
import WhatsAppChat from '@/components/WhatsAppChat';
```

#### Добавлен state
```typescript
const [showWhatsAppDialog, setShowWhatsAppDialog] = useState(false);
```

#### Удалены старые states и функции
- ❌ Удалены: `whatsappMessage`, `sendingWhatsapp` states
- ❌ Удалена: `sendWhatsAppMessage` async function
- ❌ Удалена: `normalizePhone` helper function
- ❌ Удалён: `Send` icon из импортов

**Причина**: Логика отправки теперь находится в компоненте WhatsAppChat

#### Заменён inline input на кнопку
**Было** (строки 1295-1328):
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

**Стало** (строки 1295-1305):
```tsx
{/* WhatsApp Chat Button */}
{taskId && taskData && watch('phone') && (
    <div className="border-t pt-4">
        <Button
            type="button"
            onClick={() => setShowWhatsAppDialog(true)}
            className="w-full bg-green-600 hover:bg-green-700 text-white h-12 text-base font-semibold"
        >
            <MessageCircle className="h-5 w-5 mr-2" />
            WhatsApp {t('whatsapp.chat_title')}
        </Button>
    </div>
)}
```

#### Добавлен WhatsAppChat Dialog
**Расположение**: В конце компонента, после Payment Dialog (строки ~2120)

```tsx
{/* WhatsApp Chat Dialog */}
{taskId && taskData && watch('phone') && (
    <WhatsAppChat
        isOpen={showWhatsAppDialog}
        onClose={() => setShowWhatsAppDialog(false)}
        phone={watch('phone')}
        clientName={watch('clientName') || taskData?.clientName}
        clientId={taskData?.clientId}
    />
)}
```

## Паттерн использования
Следует структуре Payment Dialog:
1. **State**: `showWhatsAppDialog` для управления видимостью
2. **Кнопка**: В секции формы, показывается только при `taskId && taskData && watch('phone')`
3. **Диалог**: В конце компонента с условным рендерингом
4. **Props**: Передаём все необходимые данные (phone, clientName, clientId)

## Условия отображения
Кнопка и диалог показываются только когда:
- ✅ `taskId` существует (редактирование существующей записи)
- ✅ `taskData` загружены
- ✅ `watch('phone')` указан номер телефона

## Преимущества новой реализации

### UX улучшения
- ✅ Полноценный чат вместо одного input поля
- ✅ История сообщений
- ✅ Статистика (всего/доставлено/прочитано)
- ✅ Временные метки сообщений
- ✅ Больше места для ввода и просмотра

### Архитектурные улучшения
- ✅ Переиспользование существующего компонента WhatsAppChat
- ✅ Единая логика отправки (DRY principle)
- ✅ Меньше кода в TaskDialog (~60 строк удалено)
- ✅ Следует установленному паттерну (как Payment Dialog)
- ✅ Консистентность UI/UX

### Упрощение кода
- ❌ Удалено 3 state variables
- ❌ Удалена async функция sendWhatsAppMessage (~70 строк)
- ❌ Удалена helper функция normalizePhone
- ✅ Добавлен 1 state variable
- ✅ Добавлен простой вызов компонента (~10 строк)

**Итого**: -60+ строк кода

## Backend интеграция
WhatsAppChat компонент уже настроен на работу с:
- ✅ `branchId` для автоматического определения accountID
- ✅ API endpoint `/api/whatsapp/send`
- ✅ Нормализация номера телефона (удаление "+")

## Тестирование
1. ✅ Dev сервер запускается успешно
2. ✅ HMR (Hot Module Reload) работает
3. ✅ Нет TypeScript ошибок (кроме pre-existing data.branch)
4. ✅ Импорты корректны
5. ✅ Условный рендеринг работает

## Связанная документация
- `WHATSAPP_CHAT_INTEGRATION.md` - интеграция WhatsAppChat в Clients.tsx
- `TASK_DIALOG_WHATSAPP_INTEGRATION.md` - предыдущая inline версия
- `FRONTEND_BRANCHID_INTEGRATION.md` - переход на branchId API

## Следующие шаги
- [ ] Добавить аналогичный паттерн для других модальных окон (если требуется)
- [ ] Рассмотреть добавление badge с количеством непрочитанных сообщений
- [ ] Опционально: Добавить keyboard shortcut для открытия чата

## Заметки для разработчиков
При добавлении новых диалогов в TaskDialog:
1. Следуйте паттерну Payment/WhatsApp Dialog
2. State в начале компонента
3. Кнопка в соответствующей секции формы
4. Диалог в конце компонента с условным рендерингом
5. Используйте существующие UI компоненты где возможно
