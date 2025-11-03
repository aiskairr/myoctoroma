# Мобильный селектор дат для календаря

## Обзор
Добавлен компактный селектор дат для мобильной версии страницы календаря, который заменяет полноценный календарь из сайдбара на desktop версии.

## Дата создания
3 ноября 2025 г.

## Проблема
На desktop версии пользователи переключают даты напрямую из Sidebar с помощью календаря. Однако в мобильной версии (MobileSidebar) использование календаря неудобно из-за масштабов интерфейса (уменьшение на 25% для 390x844px разрешения).

## Решение
Добавлен компактный селектор дат непосредственно на страницу календаря, видимый только на мобильных устройствах (< 640px).

## Реализация

### Расположение
`/src/pages/Calendar/components/time-schedule.tsx`

### Компоненты

#### 1. Мобильный селектор дат
```tsx
{/* Mobile Date Selector - visible only on mobile */}
<div className="mb-3 sm:hidden">
    <div className="flex items-center gap-2">
        <input
            type="date"
            value={currentDate.toISOString().split('T')[0]}
            onChange={(e) => {
                const newDate = new Date(e.target.value);
                if (!isNaN(newDate.getTime())) {
                    const newUrl = `${window.location.pathname}?date=${e.target.value}`;
                    window.history.pushState({ date: e.target.value }, '', newUrl);
                    window.location.reload();
                }
            }}
            className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs"
        />
        <button
            onClick={() => {
                const today = new Date().toISOString().split('T')[0];
                const newUrl = `${window.location.pathname}?date=${today}`;
                window.history.pushState({ date: today }, '', newUrl);
                window.location.reload();
            }}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium whitespace-nowrap"
        >
            {t('common.today') || 'Сегодня'}
        </button>
    </div>
</div>
```

#### 2. Адаптивный header календаря
Обновлен для лучшего отображения на мобильных устройствах:
- Padding: `p-3 sm:p-6` (уменьшен на 25%)
- Заголовок: `text-sm sm:text-xl` (уменьшен для мобильных)
- Layout: `flex-col sm:flex-row` (вертикальный на мобильных)
- Gap: `gap-2 sm:gap-3` (уменьшен)

#### 3. Колонка времени
```tsx
<div className="w-14 sm:w-20 flex-shrink-0...">
    <div className="h-12 sm:h-16...">
        <Clock size={14} className="text-gray-500 sm:w-4 sm:h-4" />
    </div>
    // Time slots с text-[9px] sm:text-sm
</div>
```

#### 4. Заголовки колонок мастеров
```tsx
<div className="h-12 sm:h-16 p-2 sm:p-3...">
    <div className="w-7 h-7 sm:w-10 sm:h-10...">
        // Avatar с text-xs sm:text-sm
    </div>
    <div className="font-semibold text-[10px] sm:text-sm...">
        // Имя мастера
    </div>
    <div className="text-[9px] sm:text-xs...">
        // Роль и часы работы
    </div>
</div>
```

#### 5. Кнопка "Добавить мастера"
```tsx
<button className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2...text-xs sm:text-sm">
    <Plus size={16} className="sm:w-[18px] sm:h-[18px]" />
    <span className="hidden sm:inline">{t('calendar.add_employee')}</span>
    <span className="sm:hidden">{t('calendar.add_master') || 'Мастер'}</span>
</button>
```

## Особенности

### Функциональность селектора дат
1. **Input type="date"**: Нативный селектор дат браузера
2. **Кнопка "Сегодня"**: Быстрый переход на текущую дату
3. **URL синхронизация**: Обновление URL с параметром `?date=YYYY-MM-DD`
4. **Валидация**: Проверка на валидность выбранной даты

### Масштабирование (75% от desktop)

| Элемент | Desktop | Mobile (75%) |
|---------|---------|--------------|
| Header padding | p-6 | p-3 |
| Time column width | w-20 (80px) | w-14 (56px) |
| Time column height | h-16 (64px) | h-12 (48px) |
| Master avatar | w-10 h-10 | w-7 h-7 |
| Master name text | text-sm | text-[10px] |
| Role/hours text | text-xs | text-[9px] |
| Time slots text | text-sm | text-[9px] |
| Button padding | px-4 py-2 | px-2 py-1.5 |
| Icon size | 18px | 14-16px |

## Адаптивность

### Breakpoints
- **Mobile**: < 640px (показан селектор дат)
- **Desktop**: ≥ 640px (скрыт селектор дат, используется sidebar календарь)

### Responsive classes
```css
sm:hidden    /* Видимо только на mobile */
hidden sm:inline    /* Видимо только на desktop */
text-[9px] sm:text-sm    /* Мобильный/desktop размеры */
p-2 sm:p-3    /* Адаптивный padding */
gap-1.5 sm:gap-3    /* Адаптивные отступы */
```

## Преимущества

1. ✅ **Удобство**: Простой и понятный селектор дат
2. ✅ **Нативный UX**: Использует стандартный date picker устройства
3. ✅ **Компактность**: Не занимает много места
4. ✅ **Быстрый доступ**: Кнопка "Сегодня" для быстрого возврата
5. ✅ **Консистентность**: Единый стиль с остальным интерфейсом
6. ✅ **URL-based**: Дата хранится в URL, можно шарить ссылки
7. ✅ **Масштабирование**: Все элементы уменьшены на 25% для комфорта

## Использование

### Desktop
Пользователи переключают даты через календарь в Sidebar:
- Клик по дате в календаре → обновление URL → перезагрузка страницы

### Mobile
Пользователи переключают даты через селектор на странице:
1. Клик по input → открытие нативного date picker
2. Выбор даты → обновление URL → перезагрузка страницы
3. ИЛИ клик "Сегодня" → мгновенный переход на текущую дату

## Технические детали

### URL параметр
```
/calendar?date=2025-11-03
```

### Формат даты
```typescript
currentDate.toISOString().split('T')[0]  // "2025-11-03"
```

### История браузера
```typescript
window.history.pushState({ date: dateString }, '', newUrl);
window.location.reload();
```

## Тестирование

### Desktop (≥ 640px)
- [ ] Селектор дат НЕ отображается
- [ ] Календарь в Sidebar работает корректно
- [ ] Переключение дат обновляет URL

### Mobile (< 640px)
- [ ] Селектор дат отображается в header
- [ ] Input type="date" открывает нативный picker
- [ ] Кнопка "Сегодня" работает корректно
- [ ] Выбор даты обновляет URL и перезагружает страницу
- [ ] Все элементы читаемы и кликабельны
- [ ] Текст не обрезается

### Разные разрешения
- [ ] iPhone 12/13 Pro (390x844px) @ 100% zoom
- [ ] iPhone SE (375x667px)
- [ ] Android средний (360-400px width)

## Связанные файлы

- `/src/pages/Calendar/components/time-schedule.tsx` - основной компонент
- `/src/pages/Calendar/index.tsx` - обработка URL параметров
- `/src/components/MobileNavbar.tsx` - мобильная навигация
- `/src/components/Sidebar.tsx` - desktop календарь

## Следующие шаги

### Возможные улучшения
1. Добавить стрелки "вперед/назад" для переключения дат
2. Добавить отображение дня недели
3. Добавить индикатор наличия записей на дату
4. Добавить быстрые фильтры (неделя, месяц)
5. Кэширование данных календаря для избежания перезагрузки

### Оптимизация
1. Заменить `window.location.reload()` на state update без перезагрузки
2. Добавить transitions для плавной смены дат
3. Предзагрузка данных соседних дат

## История изменений

### 3 ноября 2025 г. - v1.0
- ✅ Добавлен мобильный селектор дат
- ✅ Адаптирован header календаря
- ✅ Уменьшены все элементы на 25% для мобильных
- ✅ Добавлена кнопка "Сегодня"
- ✅ Оптимизированы размеры колонок и текста
- ✅ Создана документация
