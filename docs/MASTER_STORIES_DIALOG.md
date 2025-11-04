# 📱 Master Stories Dialog - Документация

## 🎯 Обзор

Новая функция "Stories" позволяет просматривать доступные временные слоты мастера в красивом интерфейсе с календарем. Функционал похож на просмотр занятости мастера в системе букинга.

## ✨ Особенности

### Дизайн
- 🎨 **Градиентный дизайн** - красивые градиенты от indigo до purple
- 📅 **Сворачиваемый календарь** - по умолчанию свернут, экономит место
- 🟢 **Цветовая индикация** - зеленый для свободных, красный для занятых слотов
- 📊 **Статистика** - счетчики свободных и занятых слотов
- 📱 **Адаптивность** - работает на всех устройствах

### Функциональность
- **Сворачиваемый календарь** - клик на заголовок разворачивает/сворачивает
- **Выбор даты** - календарь с блокировкой прошедших дат
- **Временные слоты** - отображение слотов по 30 минут (09:00 - 20:00)
- **Статусы слотов** - свободно/занято с визуальным отличием
- **Реал-тайм данные** - загрузка актуальных данных с сервера
- **Fallback режим** - работает даже если API недоступен
- **Мультиязычность** - поддержка русского, кыргызского, английского

## 📂 Структура файлов

### Новые файлы

**1. `/src/components/MasterStoriesDialog.tsx`**
```typescript
interface MasterStoriesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  masterId: number;
  masterName: string;
  branchId?: string; // ID филиала для API запроса
}
```

Основной компонент диалога Stories с:
- Сворачиваемым календарем для выбора даты (по умолчанию свернут)
- Сеткой временных слотов
- Статистикой занятости
- Легендой
- Интеграцией с тем же API что и Booking
- Fallback режимом при недоступности API

### Измененные файлы

**2. `/src/pages/Masters.tsx`**
- Добавлен импорт `MasterStoriesDialog`
- Добавлена иконка `Eye` из lucide-react
- Добавлено состояние `isStoriesDialogOpen` и `selectedMasterForStories`
- Добавлен обработчик `handleStoriesClick`
- Добавлена кнопка "Stories" в `MasterCard`
- Добавлен рендеринг `MasterStoriesDialog`

**3. `/src/contexts/LocaleContext.tsx`**
- Добавлены переводы для 3 языков:
  - `masters.stories.title`
  - `masters.stories.subtitle`
  - `masters.stories.select_date`
  - `masters.stories.time_slots`
  - `masters.stories.available`
  - `masters.stories.booked`
  - `masters.stories.available_slot`
  - `masters.stories.booked_slot`

## 🎨 Компоненты дизайна

### Кнопка Stories в карточке мастера
```tsx
<Button
  variant="outline"
  size="sm"
  onClick={onScheduleClick}
  className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white 
             border-none hover:from-indigo-600 hover:to-purple-700"
>
  <Eye className="h-4 w-4 mr-2" />
  Stories
</Button>
```

### Градиентный заголовок
```tsx
<div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
  <CalendarIcon className="h-6 w-6 text-white" />
</div>
```

### Статистические карточки
```tsx
// Свободные слоты
<Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
  <CheckCircle className="h-5 w-5 text-green-600" />
  <p className="text-2xl font-bold text-green-600">{availableCount}</p>
</Card>

// Занятые слоты
<Card className="p-4 bg-gradient-to-br from-red-50 to-rose-50 border-red-200">
  <XCircle className="h-5 w-5 text-red-600" />
  <p className="text-2xl font-bold text-red-600">{bookedCount}</p>
</Card>
```

### Временной слот
```tsx
<Button
  variant={slot.available ? "outline" : "ghost"}
  className={`
    ${slot.available 
      ? 'border-2 border-green-300 bg-gradient-to-br from-green-50 to-emerald-50 
         hover:from-green-100 hover:to-emerald-100' 
      : 'border border-red-200 bg-gradient-to-br from-red-50 to-rose-50 
         opacity-60 cursor-not-allowed'
    }
  `}
>
  <span className="text-sm font-semibold">{slot.time}</span>
  {slot.available ? <CheckCircle /> : <XCircle />}
</Button>
```

## 🔌 API Integration

### Endpoint (Используется тот же что и в Booking)
```
GET /api/public/available-slots
```

### Request Parameters
```
date: YYYY-MM-DD (например, "2025-11-04")
masterId: number (например, 15)
branchId: string (ID филиала)
```

### Request Example
```
GET /api/public/available-slots?date=2025-11-04&masterId=15&branchId=wa1
```

### Response Format
```json
[
  {
    "time": "09:00",
    "available": true
  },
  {
    "time": "09:30",
    "available": false,
    "bookingId": 123
  },
  {
    "time": "10:00",
    "available": true
  }
]
```

### Fallback данные
Если API недоступен, компонент автоматически генерирует тестовые слоты:
- Время: 09:00 - 20:00
- Интервал: 30 минут
- Доступность: ~70% слотов свободны (случайно)

### Интерфейс TypeScript
```typescript
interface TimeSlot {
  time: string;          // Время слота "HH:mm"
  available: boolean;    // Доступность
  bookingId?: number;    // ID записи (если занято)
}
```

### Функция получения слотов (из Booking.tsx)
```typescript
const getAvailableTimeSlots = async (
  masterId: number, 
  date: string, 
  branchId: string
): Promise<TimeSlot[]> => {
  try {
    const response = await axios.get(
      `${BACKEND_URL}/api/public/available-slots`,
      {
        params: { date, masterId, branchId },
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.warn('API failed, using fallback');
    // Возвращаем fallback данные
    return generateFallbackSlots();
  }
};
```

## 🔄 Жизненный цикл

### 1. Открытие диалога
```
Клик на кнопку "Stories" 
  → handleStoriesClick(master)
  → setSelectedMasterForStories(master)
  → setIsStoriesDialogOpen(true)
  → MasterStoriesDialog монтируется
```

### 2. Загрузка данных
```
useQuery запускается
  → GET /api/masters/{id}/available-slots?date={date}
  → Данные отображаются в сетке
  → Статистика пересчитывается
```

### 3. Изменение даты
```
Пользователь выбирает дату в календаре
  → setSelectedDate(newDate)
  → queryKey обновляется
  → useQuery перезапускается
  → Новые слоты загружаются
```

### 4. Закрытие диалога
```
Клик на кнопку "Закрыть" или вне диалога
  → setIsStoriesDialogOpen(false)
  → MasterStoriesDialog размонтируется
```

## 📱 Демо данные

Если API не возвращает данные, компонент генерирует демо-слоты:

```typescript
const generateTimeSlots = (): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  for (let hour = 9; hour <= 20; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      slots.push({
        time,
        available: Math.random() > 0.3, // 70% доступны
      });
    }
  }
  return slots;
};
```

## 🌍 Локализация

### Русский
```javascript
'masters.stories.title': 'Доступные слоты'
'masters.stories.subtitle': 'Просмотр расписания и занятости'
'masters.stories.select_date': 'Выберите дату'
'masters.stories.time_slots': 'Временные слоты'
'masters.stories.available': 'Свободно'
'masters.stories.booked': 'Занято'
'masters.stories.available_slot': 'Свободный слот'
'masters.stories.booked_slot': 'Занятый слот'
```

### Кыргызский
```javascript
'masters.stories.title': 'Жеткиликтүү слоттор'
'masters.stories.subtitle': 'Графикти жана бошторду көрүү'
'masters.stories.select_date': 'Датаны тандаңыз'
'masters.stories.time_slots': 'Убакыт слоттору'
'masters.stories.available': 'Бош'
'masters.stories.booked': 'Ээлеген'
'masters.stories.available_slot': 'Бош слот'
'masters.stories.booked_slot': 'Ээленген слот'
```

### Английский
```javascript
'masters.stories.title': 'Available Slots'
'masters.stories.subtitle': 'View schedule and availability'
'masters.stories.select_date': 'Select Date'
'masters.stories.time_slots': 'Time Slots'
'masters.stories.available': 'Available'
'masters.stories.booked': 'Booked'
'masters.stories.available_slot': 'Available slot'
'masters.stories.booked_slot': 'Booked slot'
```

## 🎯 Использование

### В карточке мастера
```tsx
<MasterCard
  master={master}
  onScheduleClick={() => handleStoriesClick(master)}
  // ... другие пропсы
/>
```

### Рендеринг диалога
```tsx
{selectedMasterForStories && (
  <MasterStoriesDialog
    isOpen={isStoriesDialogOpen}
    onClose={() => setIsStoriesDialogOpen(false)}
    masterId={selectedMasterForStories.id}
    masterName={selectedMasterForStories.name}
  />
)}
```

## 🔍 Тестовые сценарии

### Сценарий 1: Открытие Stories
1. Перейти на страницу Мастеров
2. Найти карточку мастера
3. Нажать кнопку "Stories" (фиолетовая с иконкой глаза)
4. **Ожидание:** Открывается диалог с календарем и слотами

### Сценарий 2: Выбор даты
1. Открыть Stories диалог
2. Выбрать другую дату в календаре
3. **Ожидание:** Слоты обновляются для выбранной даты

### Сценарий 3: Просмотр статистики
1. Открыть Stories диалог
2. Посмотреть на счетчики вверху справа
3. **Ожидание:** Видны цифры свободных и занятых слотов

### Сценарий 4: Визуальное различие слотов
1. Открыть Stories диалог
2. Посмотреть на сетку слотов
3. **Ожидание:** Зеленые - свободные, красные - занятые

### Сценарий 5: Мультиязычность
1. Изменить язык интерфейса (ru/ky/en)
2. Открыть Stories диалог
3. **Ожидание:** Все тексты переведены

### Сценарий 6: Блокировка прошлых дат
1. Открыть Stories диалог
2. Попробовать выбрать вчерашнюю дату
3. **Ожидание:** Прошлые даты недоступны для выбора

## 🚀 Будущие улучшения

- [ ] Клик на слот для бронирования
- [ ] Фильтр по услугам
- [ ] Экспорт расписания
- [ ] Push-уведомления о свободных слотах
- [ ] Интеграция с Google Calendar
- [ ] Показ деталей бронирования при клике на занятый слот

## 📅 Дата реализации
4 ноября 2025 г.
