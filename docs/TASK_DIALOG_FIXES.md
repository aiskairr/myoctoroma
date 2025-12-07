# Task Dialog - Исправления и улучшения

## Дата: 5 декабря 2025

### Обзор изменений

Исправлены проблемы с отображением и сохранением данных в диалоговом окне задачи (`task-dialog-btn.tsx`).

---

## 1. Исправлена загрузка данных задачи

### Проблема
При открытии существующей задачи периодически не загружались:
- Время (`scheduleTime`)
- Длительность (`serviceDuration`)
- Стоимость (`servicePrice`, `finalPrice`)
- Скидка (`discount`)

### Причина
Race condition между несколькими `useEffect` хуками - данные перезаписывались после загрузки.

### Решение
- Добавлен флаг `isTaskDataLoaded` для предотвращения повторной загрузки
- Добавлен `isLoadingTaskRef` для блокировки других useEffect во время загрузки
- Данные загружаются в форму сразу как приходят из API (без ожидания открытия диалога)

```typescript
// Флаги для контроля загрузки
const [isTaskDataLoaded, setIsTaskDataLoaded] = useState(false);
const isLoadingTaskRef = useRef(false);

// Главный useEffect загружает данные когда они готовы
useEffect(() => {
    if (taskData && !taskLoading && !isTaskDataLoaded) {
        isLoadingTaskRef.current = true;
        // ... загрузка данных в форму
        setIsTaskDataLoaded(true);
        reset(formData);
        isLoadingTaskRef.current = false;
    }
}, [taskData, taskLoading, taskId, isTaskDataLoaded, mastersData, reset]);
```

---

## 2. Скидка по умолчанию в сомах

### Проблема
Скидка приходит с бэкенда в сомах, но по умолчанию отображалась в процентах.

### Решение
Изменено значение по умолчанию для `discountType`:

```typescript
// Было
const [discountType, setDiscountType] = useState<'percent' | 'amount'>('percent');

// Стало
const [discountType, setDiscountType] = useState<'percent' | 'amount'>('amount');
```

---

## 3. Расширен диапазон времени

### Проблема
Временные слоты были ограничены (9:00-21:00, шаг 30 мин), из-за чего время задачи могло не отображаться.

### Решение
- Расширен диапазон: **7:00 - 23:00**
- Уменьшен шаг: **15 минут**
- Добавлено автоматическое добавление времени задачи в список, если оно нестандартное

```typescript
const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 7; hour <= 23; hour++) {
        for (let minute = 0; minute < 60; minute += 15) {
            const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            slots.push(timeString);
        }
    }
    return slots;
};

const timeSlots = useMemo((): string[] => {
    const slots = generateTimeSlots();
    // Добавляем время задачи если его нет в списке
    if (taskData?.scheduleTime && !slots.includes(taskData.scheduleTime)) {
        slots.push(taskData.scheduleTime);
        slots.sort();
    }
    return slots;
}, [taskData?.scheduleTime]);
```

---

## 4. Скидка применяется к общей сумме

### Проблема
Скидка применялась только к основной услуге, игнорируя дополнительные услуги.

### Решение
Скидка (в процентах) теперь рассчитывается от **общей суммы** всех услуг:

```typescript
// Рассчитываем общую сумму (основная услуга + дополнительные)
const additionalServicesTotal = additionalServices.reduce((sum, s) => sum + (s.price || 0), 0);
const totalPrice = servicePrice + additionalServicesTotal;

// Конвертируем скидку в абсолютную сумму
const discountAmount = discountType === 'percent' 
    ? Math.round(totalPrice * discountValue / 100)  // От ОБЩЕЙ суммы
    : Math.round(discountValue);
```

### Пример расчёта
| Позиция | Сумма |
|---------|-------|
| Основная услуга | 1000 сом |
| Доп. услуга 1 | 500 сом |
| Доп. услуга 2 | 300 сом |
| **Итого** | **1800 сом** |
| Скидка 10% | -180 сом |
| **К оплате** | **1620 сом** |

---

## 5. Исправлена функция formatDuration

### Проблема
Функция `formatDuration` в `use-task.ts` некорректно обрабатывала `duration === 0`.

### Решение
```typescript
// Было (неправильно - !duration включает 0)
if (!duration || !price) return '';

// Стало (правильно - проверка только на null/undefined)
if (duration === null || duration === undefined || price === null || price === undefined) return '';
```

---

## Файлы изменений

| Файл | Изменения |
|------|-----------|
| `src/pages/Calendar/components/task-dialog-btn.tsx` | Основные исправления загрузки данных, времени, скидки |
| `src/hooks/use-task.ts` | Исправлена функция `formatDuration` |

---

## Деплой

Файлы деплоятся на сервер:
```bash
npm run build && scp -r dist/* root@31.3.216.148:/var/www/promconsult.pro/
```

**Важно:** Nginx обслуживает файлы из `/var/www/promconsult.pro/`, не из `/root/deploy/`.

---

## Очистка кэша браузера

После деплоя пользователям нужно очистить кэш Service Worker:

```javascript
caches.keys().then(keys => Promise.all(keys.map(key => caches.delete(key)))).then(() => navigator.serviceWorker.getRegistrations()).then(regs => Promise.all(regs.map(reg => reg.unregister()))).then(() => location.reload(true));
```

---

## API формат данных задачи

```json
{
    "id": "38699",
    "clientId": 58144,
    "status": "completed",
    "serviceType": "Оформление бороды",
    "serviceServiceId": 87,
    "scheduleDate": "2025-12-03T00:00:00.000Z",
    "scheduleTime": "11:00",
    "endTime": "12:00",
    "masterId": 15,
    "masterName": "Абдулла",
    "serviceDuration": 60,
    "servicePrice": 700,
    "discount": 0,
    "finalPrice": 700,
    "paymentMethod": "Оптима - Перевод",
    "adminName": "Санжар",
    "paid": "paid"
}
```

### Ключевые поля:
- `scheduleTime` - время начала (формат "HH:MM")
- `serviceDuration` - длительность в минутах
- `servicePrice` - цена без скидки
- `discount` - скидка в сомах (абсолютное значение)
- `finalPrice` - итоговая цена (servicePrice - discount)
