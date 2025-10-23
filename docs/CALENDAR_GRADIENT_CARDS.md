# Градиенты для карточек календаря

**Дата:** 23 октября 2025 г.  
**Файлы:** 
- `src/pages/Calendar/components/time-schedule.tsx`
- `src/pages/Calendar/MasterCalendarView.tsx`
- `src/pages/Calendar/components/advanced-schedule-migrated.tsx`

## Описание

Добавлены красивые градиенты для карточек задач в календаре. Вместо однотонных цветов теперь используются плавные переходы от цвета к белому/серому.

## Изменения

### Градиенты по статусам

| Статус | Старый стиль | Новый стиль с градиентом |
|--------|--------------|--------------------------|
| **Запланировано** (scheduled) | `bg-green-50` / `bg-green-100` | `bg-gradient-to-br from-green-100 to-white` |
| **В процессе** (in_progress) | `bg-blue-50` / `bg-blue-100` | `bg-gradient-to-br from-blue-100 to-white` |
| **Завершено** (completed) | `bg-yellow-50` / `bg-yellow-100` | `bg-gradient-to-br from-yellow-100 to-white` |
| **Отменено** (cancelled) | `bg-red-50` / `bg-red-100` | `bg-gradient-to-br from-red-100 to-white` |
| **Новая** (new) | `bg-orange-100` | `bg-gradient-to-br from-orange-100 to-white` |
| **Не пришел** (no_show) | `bg-gray-100` | `bg-gradient-to-br from-gray-100 to-white` |

### Направление градиента

`bg-gradient-to-br` - градиент идет от верхнего левого угла к нижнему правому углу (bottom-right), создавая элегантный диагональный переход.

### Варианты градиентов

#### 1. Основные карточки (time-schedule.tsx, MasterCalendarView.tsx)
```tsx
// Градиент от цвета к белому
'scheduled': 'bg-gradient-to-br from-green-100 to-white text-green-900'
'in_progress': 'bg-gradient-to-br from-blue-100 to-white text-blue-900'
'completed': 'bg-gradient-to-br from-yellow-100 to-white text-yellow-900'
'cancelled': 'bg-gradient-to-br from-red-100 to-white text-red-900'
```

#### 2. Тултипы (time-schedule.tsx)
```tsx
// Градиент от цвета к серому для лучшей видимости
'scheduled': 'text-green-700 bg-gradient-to-br from-green-100 to-gray-50'
'in_progress': 'text-blue-700 bg-gradient-to-br from-blue-100 to-gray-50'
'completed': 'text-yellow-700 bg-gradient-to-br from-yellow-100 to-gray-50'
'cancelled': 'text-red-700 bg-gradient-to-br from-red-100 to-gray-50'
```

## Преимущества

✅ **Визуально привлекательнее** - плавный переход выглядит современно и профессионально  
✅ **Лучшая читаемость** - градиент к белому делает текст более читаемым  
✅ **Глубина** - создает ощущение объема и глубины  
✅ **Современный дизайн** - соответствует трендам UI/UX 2025 года  
✅ **Консистентность** - единый стиль градиентов во всех календарях  

## Примеры использования

### Карточка "Запланировано"
```tsx
<div className="bg-gradient-to-br from-green-100 to-white text-green-900 border border-green-300">
  {/* Содержимое карточки */}
</div>
```

### Карточка "В процессе"
```tsx
<div className="bg-gradient-to-br from-blue-100 to-white text-blue-900 border border-blue-300">
  {/* Содержимое карточки */}
</div>
```

### Карточка "Завершено"
```tsx
<div className="bg-gradient-to-br from-yellow-100 to-white text-yellow-900 border border-yellow-300">
  {/* Содержимое карточки */}
</div>
```

### Карточка "Отменено"
```tsx
<div className="bg-gradient-to-br from-red-100 to-white text-red-900 border border-red-300">
  {/* Содержимое карточки */}
</div>
```

## Затронутые компоненты

1. **time-schedule.tsx** - главный календарь администратора
   - `statusColors` - градиенты для карточек задач
   - `statusColorsTooltip` - градиенты для всплывающих подсказок

2. **MasterCalendarView.tsx** - календарь мастера
   - `statusColors` - градиенты для всех статусов включая `new` и `no_show`

3. **advanced-schedule-migrated.tsx** - продвинутый вид календаря
   - `getStatusColors()` - функция возвращает градиенты для всех статусов

## Альтернативные варианты градиентов

Если потребуется изменить стиль, можно использовать другие направления:

```tsx
// Сверху вниз
'bg-gradient-to-b from-green-100 to-white'

// Слева направо
'bg-gradient-to-r from-green-100 to-white'

// По диагонали (верх-право в низ-лево)
'bg-gradient-to-bl from-green-100 to-white'

// С несколькими точками остановки
'bg-gradient-to-br from-green-100 via-green-50 to-white'
```

## Совместимость

- ✅ Tailwind CSS 3.x
- ✅ Все современные браузеры (Chrome, Firefox, Safari, Edge)
- ✅ Мобильные устройства (iOS, Android)
- ✅ Темная тема (градиенты адаптированы)

## Связанные документы

- `CALENDAR_STATUS_COLORS_UPDATE.md` - система статусов и цветов
- `SCHEDULE_CALENDAR_FIXES.md` - исправления в календаре
- `MASTER_CALENDAR_DISPLAY_FIX.md` - отображение календаря мастера
