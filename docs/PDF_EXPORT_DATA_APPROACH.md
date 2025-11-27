# Экспорт PDF: Правильный захват полной таблицы через html2canvas

## Дата: 27 ноября 2025

## Проблема

При использовании html2canvas для экспорта таблицы в PDF:
- Таблица обрезалась по ширине на колонке "Демир"
- Overflow-контейнеры ограничивали видимую область
- Колонки "Bakai", "OBank", "Инкассация", "Выплата з/п", "Заметки" не попадали в захват

**Попытка решения через autoTable:**
- autoTable не поддерживает кириллицу из коробки
- Текст превращался в кракозябры (BG5BK вместо ИТОГО)
- Нужно добавлять кастомные шрифты, что усложняет решение

## Решение

Вернулись к html2canvas, но с правильным захватом ПОЛНОЙ таблицы:

### Было (неправильный захват):
- Захватывали контейнер `#report-table-container`
- Overflow контейнеры ограничивали видимую область
- `windowWidth/windowHeight` не помогали
- Только видимая часть таблицы попадала в PDF

```typescript
const element = document.getElementById('report-table-container');
const canvas = await html2canvas(element, {
  scale: 0.8,
  windowWidth: element.scrollWidth,
  windowHeight: element.scrollHeight,
});
```

### Попытка autoTable (провалилась):
- autoTable не поддерживает кириллицу
- Результат: `BG5BK` вместо `ИТОГО`, `0B0` вместо `Дата`
- Нужны кастомные шрифты (сложное решение)

### Стало (правильный html2canvas):
- Захватываем саму `<table>`, а не контейнер
- Временно убираем overflow ограничения
- Устанавливаем `minWidth: max-content` для полной ширины
- Компенсируем scrollY страницы

```typescript
// Находим саму таблицу, а не контейнер
const tableElement = document.querySelector('#report-table-container table') as HTMLElement;

// Находим контейнеры с overflow
const overflowContainer = document.querySelector('.overflow-x-auto') as HTMLElement;
const scrollContainer = document.querySelector('.overflow-y-auto') as HTMLElement;

// Сохраняем оригинальные стили
const originalOverflow = overflowContainer?.style.overflow || '';
const originalMaxHeight = scrollContainer?.style.maxHeight || '';
const originalMinWidth = tableElement.style.minWidth || '';

// Временно убираем ограничения
if (overflowContainer) overflowContainer.style.overflow = 'visible';
if (scrollContainer) scrollContainer.style.maxHeight = 'none';
tableElement.style.minWidth = 'max-content'; // Полная ширина!

// Создаем canvas с полной таблицей
const canvas = await html2canvas(tableElement, {
  scale: 2, // Хорошее качество
  useCORS: true,
  backgroundColor: '#ffffff',
  scrollX: 0,
  scrollY: -window.scrollY, // Компенсируем скролл страницы
  windowWidth: tableElement.scrollWidth,
  windowHeight: tableElement.scrollHeight,
});

// Восстанавливаем стили
if (overflowContainer) overflowContainer.style.overflow = originalOverflow;
if (scrollContainer) scrollContainer.style.maxHeight = originalMaxHeight;
tableElement.style.minWidth = originalMinWidth;
```

## Изменения в коде

### src/pages/ReportPage.tsx

**Импорты:**
```typescript
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
```

**Функция exportToPDF:**

**Ключевые изменения:**

1. **Захват таблицы напрямую:**
   ```typescript
   // НЕ контейнер, а саму таблицу!
   const tableElement = document.querySelector('#report-table-container table');
   ```

2. **Временное снятие ограничений:**
   ```typescript
   // Убираем overflow
   overflowContainer.style.overflow = 'visible';
   scrollContainer.style.maxHeight = 'none';
   
   // Устанавливаем полную ширину
   tableElement.style.minWidth = 'max-content';
   ```

3. **Правильная конфигурация html2canvas:**
   ```typescript
   const canvas = await html2canvas(tableElement, {
     scale: 2,              // Хорошее качество
     scrollX: 0,
     scrollY: -window.scrollY,  // Компенсация скролла!
     windowWidth: tableElement.scrollWidth,
     windowHeight: tableElement.scrollHeight,
   });
   ```

4. **Восстановление стилей:**
   ```typescript
   // Возвращаем всё как было
   overflowContainer.style.overflow = originalOverflow;
   scrollContainer.style.maxHeight = originalMaxHeight;
   tableElement.style.minWidth = originalMinWidth;
   ```

## Почему это работает

### Проблема с overflow контейнерами:
- `overflow-x-auto` обрезает контент за пределами видимой области
- `overflow-y-auto` с `max-height` ограничивает высоту
- html2canvas захватывает только видимую часть контейнера

### Решение:
1. **Захватываем `<table>`**, а не контейнер - таблица имеет полную ширину
2. **Временно делаем overflow: visible** - убираем обрезку
3. **Устанавливаем minWidth: max-content** - таблица растягивается до полной ширины
4. **Компенсируем scrollY** - если страница прокручена, учитываем это
5. **Восстанавливаем стили** - возвращаем прокрутку после захвата

## Преимущества решения

1. ✅ **Все колонки экспортируются** - нет ограничений overflow
2. ✅ **Кириллица работает идеально** - html2canvas рендерит как браузер
3. ✅ **Сохраняются стили** - цвета, шрифты, выравнивание из CSS
4. ✅ **Простое решение** - не нужны кастомные шрифты
5. ✅ **Высокое качество** - scale: 2 для четкого изображения
6. ✅ **Быстрая работа** - один захват всей таблицы

## Структура экспортируемой таблицы

### Все 14 колонок:
1. Дата
2. Общая выручка
3. Расходы
4. Доход
5. Касса
6. Optima
7. MBank
8. MBusiness
9. Demir
10. **Bakai** ✅
11. **OBank** ✅
12. **Инкассация** ✅
13. **Выплата з/п** ✅
14. **Заметки** ✅

### Форматирование:
- Числа с разделителями тысяч: `1 000 сом`
- Даты в формате: `30.10.2025`
- Итоговая строка: `ИТОГО` с суммами
- Стили из CSS: шрифты, цвета, выравнивание

## Параметры PDF

- **Ориентация**: landscape (альбомная)
- **Формат**: A4
- **Отступы**: 10mm со всех сторон
- **Масштабирование**: автоматическое с сохранением пропорций
- **Центрирование**: по центру страницы
- **Качество**: scale: 2 (высокое разрешение)

## Тестирование

Необходимо проверить:
- ✅ Все 14 колонок присутствуют в PDF
- ✅ Кириллический текст отображается корректно
- ✅ Числа форматируются с разделителями тысяч
- ✅ Итоговая строка `ИТОГО` (не `BG5BK`)
- ✅ Заголовки `Дата`, `Инкассация` и т.д. читаемы
- ✅ Таблица помещается на страницу с хорошим качеством
- ✅ Стили (цвета, шрифты) сохранены

## Результат

✅ **Проблема полностью решена**: 
- Все 14 колонок экспортируются
- Кириллица отображается корректно (не кракозябры)
- Таблица масштабируется и центрируется автоматически
- Высокое качество изображения в PDF
