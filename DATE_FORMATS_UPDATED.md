# Форматы дат в API ElitAroma

## Основные принципы

1. **Единообразие**: Все даты используют стандартизированные форматы
2. **API совместимость**: Форматы соответствуют ожиданиям backend API  
3. **Frontend обработка**: Все компоненты корректно конвертируют даты для отправки

## Стандартные форматы

### 1. Даты календаря (scheduleDate)
- **Формат для API**: `YYYY-MM-DD`
- **Пример**: `2025-01-15`
- **Использование**: Даты записей в календаре
- **Важно**: При отправке на API всегда используется именно этот формат

### 2. Временные метки (createdAt, updatedAt)
- **Формат**: `YYYY-MM-DD HH:mm:ss`
- **Пример**: `2025-01-15 14:30:00`
- **Использование**: Метки создания и обновления записей

## Обработка в компонентах

### ✅ Правильная обработка дат

#### task-dialog-btn.tsx
- **Пользовательский ввод**: `dd.MM.yyyy` (календарный виджет)
- **Конвертация для API**: `YYYY-MM-DD` через функцию `convertDateFormat()`
- **Применяется**: И при создании, и при обновлении задач

#### DailyCalendar.tsx
- Использует `format(selectedDate, 'yyyy-MM-dd')` для API запросов
- Обеспечивает правильный формат для `scheduleDate`

#### CRMTasks.tsx
- Использует HTML input type="date" (автоматически YYYY-MM-DD)
- Корректная обработка при обновлении задач

#### time-schedule.tsx
- Использует `currentDate.toISOString().split('T')[0]` для получения YYYY-MM-DD
- Правильная передача `scheduleDate` в API

### ⚡ Критические изменения

1. **task-dialog-btn.tsx**: 
   - Добавлена функция `convertDateFormat()` для конвертации dd.MM.yyyy → YYYY-MM-DD
   - Функция применяется в `scheduleDate: convertDateFormat(data.date)`

2. **use-task.ts**:
   - Обновлен комментарий: `scheduleDate: string; // Формат: YYYY-MM-DD`

3. **Все API интерфейсы**:
   - Добавлены комментарии формата для всех дат полей

## Типы данных в API

### Task/Appointment интерфейсы:
```typescript
interface Task {
  scheduleDate: string; // Формат: YYYY-MM-DD
  createdAt: string;    // Формат: YYYY-MM-DD HH:mm:ss  
  updatedAt: string;    // Формат: YYYY-MM-DD HH:mm:ss
}
```

### CreateTaskRequest:
```typescript
interface CreateTaskRequest {
  scheduleDate: string; // Формат: YYYY-MM-DD
  // ... другие поля
}
```

### Функция конвертации:
```typescript
// В task-dialog-btn.tsx
const convertDateFormat = (dateStr: string): string => {
    const [day, month, year] = dateStr.split('.');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};
```

## Важные замечания

1. **Единый формат**: Все компоненты теперь отправляют `scheduleDate` в формате YYYY-MM-DD
2. **Конвертация**: Пользовательский ввод может быть в локальном формате, но API всегда получает стандартный формат
3. **Документация**: Все интерфейсы TypeScript содержат комментарии с указанием формата дат

## Обновленные файлы

### С добавленными комментариями формата:
- `/src/services/calendar-service.ts`
- `/src/services/accounting-service.ts`
- `/src/pages/SalaryPage.tsx`
- `/src/pages/Masters.tsx`
- `/src/services/gift-certificate-service.ts`
- `/src/pages/CRMTasks.tsx`
- `/src/pages/MasterCalendar.tsx`
- `/src/services/task-parser.ts`
- `/src/components/EditAppointmentDialog.tsx`
- `/src/hooks/use-task.ts`
- `/src/components/DailyCashReport.tsx`
- `/src/pages/Calendar/components/advanced-schedule-migrated.tsx`
- `/src/pages/CRMServices.tsx`
- `/src/hooks/use-masters.ts`

### С исправленной логикой конвертации дат:
- `/src/pages/Calendar/components/task-dialog-btn.tsx` - добавлена функция `convertDateFormat()`

## Результат

✅ **Все поля дат** (`schedule_date`, `scheduleDate`, `created_at`, `createdAt`, `updated_at`, `updatedAt`) теперь:
- Имеют четкие комментарии с указанием формата
- Правильно обрабатываются при создании и обновлении
- Используют единый стандарт YYYY-MM-DD для дат календаря
- Используют YYYY-MM-DD HH:mm:ss для временных меток
