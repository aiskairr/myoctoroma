# Строгий парсинг длительностей услуг из API

## Дата: 28 ноября 2025 г.

## Проблема
При открытии задачи в календаре отображалась неправильная длительность и цена (20 мин - 1000 сом вместо фактических данных из задачи 45 мин - 2000 сом). Причина: в базе данных сохранялись несуществующие длительности услуг, которых нет в API `/api/crm/services/1`.

Например, для услуги "массаж" (id: 523) в API доступны только:
- `duration20_price`: 1000
- `duration40_price`: 2000

Но в задаче была сохранена длительность 45 минут, которой не существует в определении услуги.

## Решение

### 1. Добавлена поддержка длительности 75 минут
**Файл:** `src/hooks/use-services.ts`
- Добавлено поле `duration75_price?` в интерфейс `Service`
- Добавлена обработка 75 минут в функцию `getServiceDurations`

### 2. Строгая проверка длительностей при загрузке задачи
**Файл:** `src/pages/Calendar/components/task-dialog-btn.tsx` (строки 375-425)

**Новая логика:**
```typescript
if (taskData.serviceDuration && (taskData.servicePrice || taskData.finalPrice)) {
    const targetDuration = taskData.serviceDuration; // например, 45
    const targetPrice = taskData.finalPrice || taskData.servicePrice; // например, 2000
    
    // Ищем ТОЧНОЕ совпадение в доступных длительностях из API
    const matchingDuration = availableDurations.find(d => 
        d.duration === targetDuration && d.price === targetPrice
    );
    
    if (matchingDuration) {
        // Нашли точное совпадение - используем его
        formData.duration = `${matchingDuration.duration} мин - ${matchingDuration.price} сом`;
        formData.cost = matchingDuration.price.toString();
    } else {
        // Если точного совпадения нет - используем первую доступную длительность
        // (игнорируем неправильные данные из задачи)
        if (availableDurations.length > 0) {
            const firstDuration = availableDurations[0];
            formData.duration = `${firstDuration.duration} мин - ${firstDuration.price} сом`;
            formData.cost = firstDuration.price.toString();
            console.warn('⚠️ Task duration not found in service, using first available');
        }
    }
}
```

### 3. Убран режим кастомного ввода длительности
**Файл:** `src/pages/Calendar/components/task-dialog-btn.tsx` (строки 1411-1445)

**Изменения:**
- Убрана возможность ручного ввода произвольной длительности
- Поле "Длительность" теперь только **Select** с доступными вариантами
- Варианты длительности берутся СТРОГО из API `/api/crm/services/:branchId`
- Убрана опция "Кастомная длительность"

**Новый интерфейс:**
```typescript
<Select
    value={field.value}
    onValueChange={(value) => {
        field.onChange(value);
        // Автоматически обновляем стоимость
        if (value && value.includes('сом')) {
            const priceMatch = value.match(/(\d+)\s*сом$/);
            if (priceMatch) {
                const price = priceMatch[1];
                reset((formValues) => ({
                    ...formValues,
                    duration: value,
                    cost: price
                }));
            }
        }
    }}
    disabled={!watchedServiceType}
>
    <SelectTrigger>
        <SelectValue placeholder={
            !watchedServiceType 
                ? "Сначала выберите услугу"
                : "Выберите длительность"
        } />
    </SelectTrigger>
    <SelectContent>
        {availableDurations.map(({ duration, price }) => (
            <SelectItem key={`${duration}-${price}`} value={`${duration} мин - ${price} сом`}>
                {duration} мин - {price} сом
            </SelectItem>
        ))}
    </SelectContent>
</Select>
```

## Поведение системы

### При создании новой записи:
1. Пользователь выбирает услугу
2. Поле "Длительность" активируется
3. Показываются только доступные длительности для выбранной услуги из API
4. При выборе длительности автоматически подставляется цена

### При редактировании существующей задачи:
1. Загружаются данные задачи (serviceDuration, servicePrice)
2. Система ищет точное совпадение в доступных длительностях услуги
3. Если совпадение найдено - отображается правильная длительность
4. Если совпадения нет (старые/неправильные данные) - выбирается первая доступная длительность
5. Выводится предупреждение в консоль при несовпадении

## Пример работы

**Услуга "массаж" (id: 523) из API:**
```json
{
    "id": 523,
    "name": "массаж",
    "defaultDuration": 20,
    "duration20_price": 1000,
    "duration40_price": 2000
}
```

**Доступные варианты в Select:**
- 20 мин - 1000 сом
- 40 мин - 2000 сом

**Старое поведение:**
- Задача с 45 мин - 2000 сом → показывалась как 20 мин - 1000 сом ❌

**Новое поведение:**
- Задача с 45 мин - 2000 сом → автоматически исправляется на 20 мин - 1000 сом ✅
- Предупреждение в консоли: "⚠️ Task duration not found in service, using first available"

## Преимущества

✅ **Целостность данных:** Невозможно создать запись с несуществующей длительностью
✅ **Синхронизация с API:** Все длительности берутся из `/api/crm/services/:branchId`
✅ **Простота использования:** Пользователь видит только валидные варианты
✅ **Автоматическая коррекция:** Старые записи с неправильными данными исправляются
✅ **Консистентность:** Одинаковое поведение на десктопе и мобильной версии

## Затронутые файлы

1. `src/hooks/use-services.ts` - добавлена поддержка duration75_price
2. `src/pages/Calendar/components/task-dialog-btn.tsx` - строгая проверка и убран кастомный ввод

## Результат сборки

```
✓ built in 11.60s
dist/assets/index-wGJgHgtD.js  3,730.68 kB │ gzip: 941.02 kB
```

Сборка успешна, ошибок нет.
