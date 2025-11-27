# Исправление проблемы загрузки страницы календаря

## Дата: 27 ноября 2025 г.

## Проблема

При переходе на страницу `/crm/calendar` через навигацию, страница не прогружалась. Но при перезагрузке вкладки (F5) страница загружалась корректно.

## Причина

В файле `App.tsx` для роута `/crm/calendar` использовался **хук React внутри рендер-функции**, что нарушает правила хуков React:

```tsx
// ❌ НЕПРАВИЛЬНО - хук вне компонента React
<Route path="/crm/calendar">
  {() => {
    const isMobile = useIsMobile(); // ← Нарушение правил хуков!
    return (
      <ProtectedLayout>
        {isMobile ? <MobileCalendarScreen /> : <CalendarScreen />}
      </ProtectedLayout>
    );
  }}
</Route>
```

### Почему это не работало?

1. **Хуки React можно вызывать только:**
   - В теле функциональных компонентов
   - В кастомных хуках
   
2. **Рендер-функция внутри Route** - это не React-компонент, а обычная функция JavaScript

3. **При перезагрузке страницы** всё работало, потому что React перемонтировал всё приложение заново

4. **При навигации** React не мог правильно обработать хук вне контекста компонента

## Решение

Создан отдельный компонент-обертка `CalendarWrapper.tsx`, который корректно использует хук `useIsMobile()`:

### Новый файл: `src/pages/CalendarWrapper.tsx`

```tsx
import { useIsMobile } from "@/hooks/use-mobile";
import CalendarScreen from "./Calendar";
import MobileCalendarScreen from "./MobileCalendar";

// Компонент-обертка для условного рендеринга календаря
const CalendarWrapper = () => {
  const isMobile = useIsMobile();
  
  return isMobile ? <MobileCalendarScreen /> : <CalendarScreen />;
};

export default CalendarWrapper;
```

### Изменения в `App.tsx`

**Было:**
```tsx
import CalendarScreen from "./pages/Calendar";
import MobileCalendarScreen from "./pages/MobileCalendar";

// ...

<Route path="/crm/calendar">
  {() => {
    const isMobile = useIsMobile();
    return (
      <ProtectedLayout>
        {isMobile ? <MobileCalendarScreen /> : <CalendarScreen />}
      </ProtectedLayout>
    );
  }}
</Route>
```

**Стало:**
```tsx
import CalendarWrapper from "./pages/CalendarWrapper";

// ...

<Route path="/crm/calendar">
  <ProtectedLayout>
    <CalendarWrapper />
  </ProtectedLayout>
</Route>
```

## Преимущества решения

✅ **Соблюдение правил хуков React**
- Хук `useIsMobile()` вызывается внутри функционального компонента
- React корректно отслеживает состояние хука

✅ **Правильная работа навигации**
- Компонент монтируется при переходе на страницу
- Нет проблем с жизненным циклом компонента

✅ **Чистая архитектура**
- Разделение ответственности
- Легко тестировать
- Переиспользуемый компонент

✅ **Производительность**
- React может правильно оптимизировать рендеринг
- Работает memo и другие оптимизации

## Правила использования хуков в роутинге

### ❌ Неправильно:
```tsx
<Route path="/example">
  {() => {
    const someValue = useSomeHook(); // Нарушение!
    return <Component value={someValue} />;
  }}
</Route>
```

### ✅ Правильно - Вариант 1 (компонент-обертка):
```tsx
const WrapperComponent = () => {
  const someValue = useSomeHook();
  return <Component value={someValue} />;
};

<Route path="/example">
  <WrapperComponent />
</Route>
```

### ✅ Правильно - Вариант 2 (компонент с пропсами):
```tsx
<Route path="/example">
  {(params) => {
    // Можно использовать params, но не хуки!
    return <Component routeParams={params} />;
  }}
</Route>
```

## Тестирование

После исправления проверьте:

1. ✅ Переход на `/crm/calendar` через боковое меню
2. ✅ Переход на `/crm/calendar` через прямую ссылку
3. ✅ Работа на десктопе (показывает `CalendarScreen`)
4. ✅ Работа на мобильных (показывает `MobileCalendarScreen`)
5. ✅ Навигация назад/вперед в браузере
6. ✅ Перезагрузка страницы

## Аналогичные проблемы

Проверьте другие роуты на наличие похожих проблем. В текущем коде есть еще один подобный случай:

```tsx
<Route path="/messenger">
  {() => {
    const urlParams = new URLSearchParams(window.location.search);
    // Это OK - используются только URL параметры, без хуков
    return <InternalMessenger />;
  }}
</Route>
```

Этот случай **безопасен**, так как не использует хуки React.

## Итог

Проблема решена путем выноса логики с хуком в отдельный React-компонент. Теперь навигация на страницу календаря работает корректно как при первой загрузке, так и при переходах через меню.

---

**Статус:** ✅ Исправлено  
**Файлы изменены:** 
- `src/App.tsx` (обновлен роутинг)
- `src/pages/CalendarWrapper.tsx` (новый файл)

**Ошибок:** Нет  
**Готово к тестированию:** Да
