# Исправление отображения данных в календаре мастера

**Дата:** 20 октября 2025 г.  
**Файл:** `src/pages/Calendar/MasterCalendarView.tsx`

## Проблема

### Симптомы
В интерфейсе календаря мастера отображалась недостаточная информация:
```
Записан
Не оплачено
Клиент не указан                    ❌ неправильно
Задача создана вручную через интерфейс

Стоимость: 600 сом
```

Но API возвращал полные данные:
```json
{
  "id": "11543",
  "clientName": "ывапролд Клиент",    ✅ есть ФИО
  "clientPhone": "+9876543234567",     ✅ есть телефон
  "serviceType": "Камуфляж волос",     ✅ есть услуга
  "scheduleTime": "09:15",             ✅ есть время начала
  "endTime": "10:15",                  ✅ есть время окончания
  "serviceDuration": 60,
  "servicePrice": 600,
  "finalPrice": 600,
  ...
}
```

### Причина

**Несоответствие имен полей:**

Интерфейс `MasterTask` и код использовали **snake_case**:
- `client_name` ❌
- `service_name` ❌  
- `time` или `start_time` ❌
- `end_time` ❌
- `price` ❌

API возвращал **camelCase**:
- `clientName` ✅
- `serviceType` ✅
- `scheduleTime` ✅
- `endTime` ✅
- `finalPrice` ✅

## Решение

### 1. Обновлен интерфейс MasterTask

**Было:**
```typescript
interface MasterTask {
  id: number;
  title: string;
  client_name: string;      // ❌ snake_case
  service_name: string;     // ❌ snake_case
  time: string;             // ❌ устаревшее поле
  start_time?: string;      // ❌ устаревшее поле
  end_time?: string;        // ❌ snake_case
  price?: number;           // ❌ устаревшее поле
  ...
}
```

**Стало:**
```typescript
interface MasterTask {
  id: string | number;
  clientId?: number;
  client?: {                          // ✅ объект клиента
    id: number;
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    ...
  };
  status: string;
  serviceType?: string;               // ✅ название услуги
  scheduleDate?: string;
  scheduleTime?: string;              // ✅ время начала "HH:MM"
  endTime?: string;                   // ✅ время окончания "HH:MM"
  serviceDuration?: number;           // ✅ длительность в минутах
  servicePrice?: number;              // ✅ цена услуги
  discount?: number;                  // ✅ скидка
  finalPrice?: number;                // ✅ итоговая цена
  paid?: string;                      // ✅ "paid" | "unpaid"
  clientName?: string;                // ✅ ФИО клиента
  clientPhone?: string;               // ✅ телефон клиента
  notes?: string;
  
  // Legacy поля для обратной совместимости
  client_name?: string;
  service_name?: string;
  time?: string;
  start_time?: string;
  end_time?: string;
  price?: number;
  ...
}
```

### 2. Обновлена сортировка задач

**Было:**
```typescript
const timeA = a.time || a.start_time || '';
const timeB = b.time || b.start_time || '';
```

**Стало:**
```typescript
const timeA = a.scheduleTime || a.time || a.start_time || '';
const timeB = b.scheduleTime || b.time || b.start_time || '';
```

### 3. Обновлено отображение времени

**Было:**
```typescript
{formatTime(task.time || task.start_time || '')}
{task.end_time && ` - ${formatTime(task.end_time)}`}
```

**Стало:**
```typescript
{formatTime(task.scheduleTime || task.time || task.start_time || '')}
{(task.endTime || task.end_time) && ` - ${formatTime(task.endTime || task.end_time || '')}`}
```

### 4. Обновлено отображение клиента

**Было:**
```typescript
<span className="text-sm text-gray-900">
  {task.client_name || 'Клиент не указан'}
</span>
```

**Стало:**
```typescript
<span className="text-sm text-gray-900 font-medium">
  {task.clientName || 
   task.client_name || 
   (task.client?.firstName && task.client?.lastName 
    ? `${task.client.firstName} ${task.client.lastName}`.trim()
    : null) ||
   'Клиент не указан'}
</span>

{/* Добавлен телефон */}
{(task.clientPhone || task.client?.phoneNumber) && (
  <div className="text-sm text-gray-600 ml-6">
    📞 {task.clientPhone || task.client?.phoneNumber}
  </div>
)}
```

### 5. Обновлено отображение услуги

**Было:**
```typescript
{task.service_name && (
  <div className="text-sm text-gray-600">
    Услуга: {task.service_name}
  </div>
)}
```

**Стало:**
```typescript
{(task.serviceType || task.service_name) && (
  <div className="text-sm text-gray-600 ml-6">
    <span className="font-medium">Услуга:</span> {task.serviceType || task.service_name}
  </div>
)}
```

### 6. Обновлено отображение цены

**Было:**
```typescript
{(task.price || task.servicePrice) && (
  <div className="flex items-center justify-between">
    <span className="text-sm text-gray-500">Стоимость:</span>
    <span className="font-semibold text-gray-900">
      {task.price || task.servicePrice || 0} сом
    </span>
  </div>
)}
```

**Стало:**
```typescript
{(task.finalPrice || task.servicePrice || task.price) && (
  <div className="space-y-1">
    {/* Показываем оригинальную цену если есть скидка */}
    {task.servicePrice && task.discount && task.discount > 0 && (
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Стоимость услуги:</span>
        <span className="line-through">{task.servicePrice} сом</span>
      </div>
    )}
    {/* Показываем скидку */}
    {task.discount && task.discount > 0 && (
      <div className="flex items-center justify-between text-xs text-emerald-600">
        <span>Скидка:</span>
        <span>-{task.discount} сом</span>
      </div>
    )}
    {/* Итоговая цена */}
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-500">
        {task.discount && task.discount > 0 ? 'Итого:' : 'Стоимость:'}
      </span>
      <span className="font-semibold text-gray-900">
        {task.finalPrice || task.servicePrice || task.price || 0} сом
      </span>
    </div>
  </div>
)}
```

### 7. Обновлена статистика

**Было:**
```typescript
{sortedTasks.reduce((sum, t) => sum + (t.price || t.servicePrice || 0), 0)}
```

**Стало:**
```typescript
{sortedTasks.reduce((sum, t) => sum + (t.finalPrice || t.servicePrice || t.price || 0), 0)}
```

## Результат

Теперь в интерфейсе отображается вся информация:

```
⏰ 09:15 - 10:15 (60 мин)    [Записан] [Не оплачено]

👤 ывапролд Клиент           ✅ ФИО клиента
   📞 +9876543234567          ✅ телефон
   Услуга: Камуфляж волос    ✅ название услуги

Задача создана вручную через интерфейс

Стоимость: 600 сом           ✅ цена
```

При наличии скидки:
```
Стоимость услуги: 800 сом (перечеркнуто)
Скидка: -200 сом
Итого: 600 сом
```

## Обратная совместимость

Код поддерживает оба формата:
- Новый API (camelCase): `clientName`, `serviceType`, `scheduleTime`, `finalPrice`
- Старый формат (snake_case): `client_name`, `service_name`, `time`, `price`

Приоритет отдается новым полям с fallback на старые:
```typescript
task.clientName || task.client_name || 'Клиент не указан'
task.serviceType || task.service_name
task.scheduleTime || task.time || task.start_time
task.finalPrice || task.servicePrice || task.price
```

## Тестирование

1. Откройте календарь мастера
2. Проверьте отображение карточки задачи:
   - ✅ Время начала и окончания
   - ✅ Длительность
   - ✅ ФИО клиента
   - ✅ Телефон клиента
   - ✅ Название услуги
   - ✅ Цена (с учетом скидки)
   - ✅ Статус и оплата
3. Проверьте статистику:
   - Сумма должна использовать `finalPrice`

## Связанные документы

- `AUTH_CONTEXT_MASTERID_FIX.md` - исправление masterId в контексте
- `MASTER_ID_FIX_CRITICAL.md` - использование правильного masterId
