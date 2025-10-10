# Исправление прозрачных задач в календаре

## Описание проблемы

В календаре некоторые задачи отображались прозрачными (без цветовой заливки) из-за проблем с обработкой статусов задач, которые могли быть `null`, `undefined` или пустыми строками.

## Выполненные исправления

### 1. Улучшение функции `getStatusColors` в DailyCalendar.tsx

**Было:**
```typescript
const getStatusColors = (status: string) => {
  switch (status) {
    // ... cases
    default:
      return {
        bg: 'bg-gray-200 hover:bg-gray-300',
        border: 'border-gray-400',
        text: 'text-gray-900',
        badge: 'bg-gray-500 text-white'
      };
  }
};
```

**Стало:**
```typescript
const getStatusColors = (status: string | null | undefined) => {
  // Нормализуем статус и убеждаемся, что он не null/undefined/пустая строка
  const normalizedStatus = status?.trim() || 'scheduled';
  
  switch (normalizedStatus) {
    // ... cases
    default:
      // Для любых неизвестных статусов используем зеленый (scheduled)
      console.warn(`Неизвестный статус задачи: "${status}". Используется fallback 'scheduled'.`);
      return {
        bg: 'bg-green-100 hover:bg-green-200',
        border: 'border-green-500',
        text: 'text-green-800',
        badge: 'bg-green-500 text-white'
      };
  }
};
```

### 2. Улучшение функции `getStatusLabel` в DailyCalendar.tsx

**Было:**
```typescript
const getStatusLabel = (status: string) => {
  switch (status) {
    // ... cases
    default:
      return 'Неизвестный';
  }
};
```

**Стало:**
```typescript
const getStatusLabel = (status: string | null | undefined) => {
  const normalizedStatus = status?.trim() || 'scheduled';
  
  switch (normalizedStatus) {
    // ... cases
    default:
      return 'Записан'; // Fallback для неизвестных статусов
  }
};
```

### 3. Исправление вызовов функций

**Все вызовы функций изменены с:**
```typescript
getStatusColors(task.status || 'scheduled')
getStatusColors(overlappingTask.status || 'scheduled')
```

**На:**
```typescript
getStatusColors(task?.status)
getStatusColors(overlappingTask?.status)
```

### 4. Исправление дочерних задач

**Было:**
```typescript
status: task?.status, // Могло быть null/undefined
```

**Стало:**
```typescript
status: task?.status || 'scheduled', // Гарантируем наличие статуса
```

### 5. Улучшение MasterCalendar.tsx

Добавлены fallback значения в объекты statusColors и statusLabels:
```typescript
const statusColors = {
  // ... существующие статусы
  '': "bg-blue-100 text-blue-800",
  'null': "bg-blue-100 text-blue-800",
  'undefined': "bg-blue-100 text-blue-800",
};
```

И улучшены вызовы:
```typescript
// Было:
statusColors[primaryTask.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'

// Стало:
statusColors[(primaryTask.status || 'scheduled') as keyof typeof statusColors] || statusColors.scheduled
```

### 6. Улучшение компонента StatusBadge

**Изменен тип:**
```typescript
type StatusBadgeProps = {
  status: string | null | undefined; // Было: string
  className?: string;
  showIndicator?: boolean;
};
```

**Добавлена нормализация:**
```typescript
export default function StatusBadge({ status, className, showIndicator = true }: StatusBadgeProps) {
  // Нормализуем статус
  const normalizedStatus = status?.trim() || 'scheduled';
  // ... далее используется normalizedStatus вместо status
}
```

## Результат

### ✅ Исправлено:
- Все задачи теперь имеют цветовую заливку
- Нет прозрачных (бесцветных) задач в календаре
- Корректная обработка `null`, `undefined` и пустых статусов
- Fallback на статус 'scheduled' для всех неизвестных значений
- Предупреждения в консоли при обнаружении неизвестных статусов

### 🎨 Цветовая схема статусов:
- **Новые** (`new`): синий
- **Записан** (`scheduled`): зеленый ← **fallback для неизвестных**
- **В процессе** (`in_progress`): синий
- **Завершен** (`completed`): желтый
- **Отменен** (`cancelled`): красный
- **Постоянные** (`regular`): серый

### 🛡️ Защита от ошибок:
- Все функции принимают `string | null | undefined`
- Автоматическая нормализация статусов
- Логирование неизвестных статусов в консоль
- Гарантированная цветовая заливка для всех задач

## Дата исправления
11 октября 2025 г.
