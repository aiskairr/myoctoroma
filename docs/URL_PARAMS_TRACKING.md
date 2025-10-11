# Отслеживание источников записей через URL параметры

## Описание
Добавлена функциональность автоматического извлечения параметров URL и добавления их в поле `notes` при создании записи через страницу онлайн бронирования.

## Функциональность

### Автоматическое извлечение параметров
При создании записи система автоматически:
1. Извлекает все параметры из URL страницы бронирования
2. Формирует детальную информацию об источнике записи
3. Добавляет эту информацию в поле `notes` записи

### Типы отслеживаемых параметров

#### 1. Отслеживаемые ссылки (source)
```
Источник: https://domain.com/booking?organisationId=18&source=abc123
Результат в notes:
```
```
Источник записи: https://domain.com/booking?organisationId=18&source=abc123
Параметры: organisationId: 18, source: abc123
Отслеживаемая ссылка: abc123
Время создания записи: 11.10.2025, 18:30
```

#### 2. UTM параметры
```
Источник: https://domain.com/booking?organisationId=18&utm_source=instagram&utm_campaign=summer2025
Результат в notes:
```
```
Источник записи: https://domain.com/booking?organisationId=18&utm_source=instagram&utm_campaign=summer2025
Параметры: organisationId: 18, utm_source: instagram, utm_campaign: summer2025
Время создания записи: 11.10.2025, 18:30
```

#### 3. Реферальные ссылки
```
Источник: https://domain.com/booking?organisationId=18&ref=partner_site
Результат в notes:
```
```
Источник записи: https://domain.com/booking?organisationId=18&ref=partner_site
Параметры: organisationId: 18, ref: partner_site
Время создания записи: 11.10.2025, 18:30
```

#### 4. Пользовательские параметры
```
Источник: https://domain.com/booking?organisationId=18&promo=discount20&location=mall
Результат в notes:
```
```
Источник записи: https://domain.com/booking?organisationId=18&promo=discount20&location=mall
Параметры: organisationId: 18, promo: discount20, location: mall
Время создания записи: 11.10.2025, 18:30
```

## Технические детали

### Пример payload с отслеживанием
```typescript
// Исходные данные пользователя
{
  branchId: "1",
  datetime: "2025-10-11T18:00", 
  masterId: 5,
  name: "Instance 7105230004",
  phone: "+996345678989",
  serviceDuration: 120,
  serviceId: "63",
  servicePrice: 900
}

// Результирующий payload с добавленными notes
{
  branchId: "1",
  datetime: "2025-10-11T18:00",
  masterId: 5,
  name: "Instance 7105230004", 
  phone: "+996345678989",
  serviceDuration: 120,
  serviceId: "63",
  servicePrice: 900,
  notes: "Источник записи: https://domain.com/booking?organisationId=18&source=abc123\nПараметры: organisationId: 18, source: abc123\nОтслеживаемая ссылка: abc123\nВремя создания записи: 11.10.2025, 18:30"
}
```

### Структура TrackingInfo
```typescript
interface TrackingInfo {
  sourceUrl: string;          // Полный URL страницы
  parameters: { [key: string]: string }; // Все параметры URL
  trackingSource?: string;    // Значение параметра source (если есть)
  notesText: string;         // Готовый текст для поля notes
}
```

## Примеры использования

### 1. Instagram Stories с отслеживаемой ссылкой
**Ссылка:** `https://domain.com/booking?organisationId=18&source=instagram_story_20oct`

**Результат в записи:**
```
notes: "Источник записи: https://domain.com/booking?organisationId=18&source=instagram_story_20oct
Параметры: organisationId: 18, source: instagram_story_20oct
Отслеживаемая ссылка: instagram_story_20oct
Время создания записи: 11.10.2025, 18:30"
```

### 2. Google Ads кампания
**Ссылка:** `https://domain.com/booking?organisationId=18&utm_source=google&utm_medium=cpc&utm_campaign=massage_promo`

**Результат в записи:**
```
notes: "Источник записи: https://domain.com/booking?organisationId=18&utm_source=google&utm_medium=cpc&utm_campaign=massage_promo
Параметры: organisationId: 18, utm_source: google, utm_medium: cpc, utm_campaign: massage_promo
Время создания записи: 11.10.2025, 18:30"
```

### 3. Партнерский сайт
**Ссылка:** `https://domain.com/booking?organisationId=18&ref=beauty_blog&discount=15`

**Результат в записи:**
```
notes: "Источник записи: https://domain.com/booking?organisationId=18&ref=beauty_blog&discount=15
Параметры: organisationId: 18, ref: beauty_blog, discount: 15
Время создания записи: 11.10.2025, 18:30"
```

## Файлы изменены

### 1. `/src/pages/Booking.tsx`
- Добавлен импорт утилиты отслеживания
- Обновлена функция `submitBooking()` 
- Извлечение параметров URL при создании записи
- Добавление поля `notes` в payload

### 2. `/src/utils/tracking.ts` (новый файл)
- Утилита `extractTrackingInfo()` для извлечения параметров
- Функция `getSourceType()` для определения типа источника
- Функция `formatParametersForAdmin()` для админ панели

## Console логирование

При создании записи в консоль выводится:
```javascript
console.log('Booking payload:', bookingPayload);
console.log('Added tracking notes:', trackingInfo.notesText);  
console.log('Tracking source:', trackingInfo.trackingSource || 'Direct');
console.log('URL parameters:', trackingInfo.parameters);
```

## Преимущества

1. **Полное отслеживание** - все параметры URL сохраняются
2. **Автоматическая работа** - не требует дополнительных действий
3. **Подробная информация** - полный URL + параметры + время
4. **Совместимость** - работает с любыми параметрами
5. **Особая обработка** - выделение отслеживаемых ссылок
6. **Временные метки** - время создания записи в локальном времени

## Интеграция с аналитикой

Эта функциональность дополняет систему отслеживания ссылок бронирования:
- Отслеживаемые ссылки (`source` параметр) получают особую обработку
- UTM параметры для Google Analytics/Facebook Ads сохраняются
- Реферальные ссылки от партнеров фиксируются
- Любые пользовательские параметры записываются
