# Удаление дополнительных услуг из диалога создания записи

## Дата: 28 ноября 2025 г.

## Задача
Удалить функционал "Дополнительные услуги" из диалога **"Новая запись на [время]"** в файле `time-schedule.tsx`. Диалог `task-dialog-btn.tsx` не затрагивается.

## Что удалено

### 1. UI секция дополнительных услуг
**Файл:** `src/pages/Calendar/components/time-schedule.tsx` (строки ~2161-2242)

Удалена вся секция:
- Список добавленных дополнительных услуг
- Поле для выбора дополнительной услуги
- Кнопка добавления
- Отображение общей суммы

### 2. Логика создания дополнительных услуг
**Файл:** `src/pages/Calendar/components/time-schedule.tsx` (строки ~1172-1218)

Удален блок кода:
```typescript
// Create additional services if any
if (additionalServices.length > 0) {
    for (const [index, service] of additionalServices.entries()) {
        // Создание дополнительных задач через API
    }
}
```

### 3. State переменные
**Файл:** `src/pages/Calendar/components/time-schedule.tsx` (строка ~471-472)

Удалены:
```typescript
const [additionalServices, setAdditionalServices] = useState<AdditionalService[]>([]);
const [selectedAdditionalService, setSelectedAdditionalService] = useState<string>('');
```

### 4. Вспомогательные функции
**Файл:** `src/pages/Calendar/components/time-schedule.tsx` (строки ~805-833)

Удалены функции:
```typescript
const addAdditionalService = useCallback(...)
const removeAdditionalService = useCallback(...)
const updateAdditionalServiceDuration = useCallback(...)
const calculateTotalDuration = useCallback(...)
const calculateTotalPrice = useCallback(...)
```

### 5. Интерфейс TypeScript
**Файл:** `src/pages/Calendar/components/time-schedule.tsx` (строки ~80-87)

Удален интерфейс:
```typescript
interface AdditionalService {
    id: number;
    serviceId: number;
    serviceName: string;
    duration: number;
    price: number;
}
```

### 6. Сброс состояния при закрытии
Удалены строки:
```typescript
setAdditionalServices([]);
setSelectedAdditionalService('');
```

## Упрощенная логика создания записи

**Было:**
```typescript
onSuccess: async (newTask) => {
    // Создание дополнительных услуг
    if (additionalServices.length > 0) {
        for (const service of additionalServices) {
            await createTaskMutation.mutateAsync(additionalTaskData);
        }
    }
    
    const totalDuration = calculateTotalDuration({ duration });
    const totalPrice = calculateTotalPrice({ price: servicePrice });
    
    const appointment = {
        duration: totalDuration,
        price: totalPrice,
        childIds: additionalServices.map(s => s.id.toString())
    };
}
```

**Стало:**
```typescript
onSuccess: (newTask) => {
    const appointment = {
        duration: duration,
        price: servicePrice,
        childIds: []
    };
}
```

## Диалог после изменений

### Поля формы:
1. ✅ Имя клиента
2. ✅ Телефон
3. ✅ Услуга (Select)
4. ✅ Длительность (Select с вариантами из API)
5. ✅ Примечания
6. ~~Дополнительные услуги~~ ❌ УДАЛЕНО

### Поведение:
- Создается **одна запись** с выбранной услугой и длительностью
- Нет возможности добавить дополнительные услуги к записи
- Нет расчета общей стоимости

## Важно

⚠️ **task-dialog-btn.tsx НЕ изменен** - в диалоге редактирования задачи функционал дополнительных услуг остался без изменений.

## Результат сборки

```bash
✓ built in 15.48s
dist/assets/index-30BLaQqI.js  3,727.38 kB │ gzip: 940.25 kB
```

Сборка успешна, код уменьшился на ~4 КБ.

## Затронутые файлы

- ✅ `src/pages/Calendar/components/time-schedule.tsx`
  - Удалена UI секция (~82 строки)
  - Удалена логика создания (~47 строк)
  - Удалены функции (~29 строк)
  - Удален интерфейс (~8 строк)
  - **Всего удалено: ~166 строк кода**

- ❌ `src/pages/Calendar/components/task-dialog-btn.tsx` - НЕ ТРОНУТ
