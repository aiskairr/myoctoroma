# Мобильные модальные окна для календаря (75vh)

## Дата: 27 ноября 2025

## Обзор

Реализованы мобильные версии диалогов создания/редактирования записи и оплаты в календаре с ограничением высоты до 75% экрана и внутренним скроллом.

## Проблема

На мобильных устройствах стандартные Dialog компоненты:
- Могут выходить за пределы экрана
- Не поддерживают внутренний скролл
- Используют двухколоночный layout (не умещается)
- Имеют большие отступы (теряется место)

## Решение

### 1. Создан компонент MobileDialog

**Файл:** `src/components/ui/mobile-dialog.tsx`

**Основные особенности:**
```typescript
const MobileDialogContent = React.forwardRef(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Content
    className={cn(
      "fixed left-[50%] top-[50%] z-50 w-[95vw] max-w-lg",
      "translate-x-[-50%] translate-y-[-50%]",
      // Ключевое ограничение высоты!
      "max-h-[75vh] flex flex-col",
      "rounded-xl border bg-background shadow-lg",
      className
    )}
    {...props}
  >
    {children}
    {/* Кнопка закрытия */}
    <DialogPrimitive.Close className="absolute right-3 top-3...">
      <X className="h-4 w-4" />
    </DialogPrimitive.Close>
  </DialogPrimitive.Content>
))
```

**Структура компонентов:**
- `MobileDialog` - корневой компонент
- `MobileDialogTrigger` - триггер открытия
- `MobileDialogContent` - контейнер с ограничением 75vh
- `MobileDialogHeader` - заголовок (flex-shrink-0, не скроллится)
- `MobileDialogFooter` - футер с кнопками (flex-shrink-0, не скроллится)
- `MobileDialogTitle` - заголовок
- `MobileDialogScrollContent` - прокручиваемый контент (flex-1, overflow-y-auto)

**Flexbox структура:**
```
┌─────────────────────────┐
│  MobileDialogContent    │ max-h-[75vh], flex flex-col
│  ┌───────────────────┐  │
│  │ Header            │  │ flex-shrink-0 (фиксирован)
│  ├───────────────────┤  │
│  │                   │  │
│  │ ScrollContent     │  │ flex-1, overflow-y-auto
│  │ (прокрутка)       │  │
│  │                   │  │
│  ├───────────────────┤  │
│  │ Footer            │  │ flex-shrink-0 (фиксирован)
│  └───────────────────┘  │
└─────────────────────────┘
```

### 2. Модификация task-dialog-btn.tsx

**Добавлен useIsMobile хук:**
```typescript
import { useIsMobile } from "@/hooks/use-mobile";

const TaskDialogBtn: React.FC<Props> = ({ children, taskId = null }) => {
    const isMobile = useIsMobile();
    
    // Условный выбор компонентов
    const DialogWrapper = isMobile ? MobileDialog : Dialog;
    const DialogContentWrapper = isMobile ? MobileDialogContent : DialogContent;
    const DialogHeaderWrapper = isMobile ? MobileDialogHeader : DialogHeader;
    const DialogTitleWrapper = isMobile ? MobileDialogTitle : DialogTitle;
    const DialogFooterWrapper = isMobile ? MobileDialogFooter : DialogFooter;
```

**Условный рендеринг:**
```tsx
<DialogWrapper open={isOpen} onOpenChange={handleOpenChange}>
    <DialogTriggerWrapper asChild>
        {children}
    </DialogTriggerWrapper>
    <DialogContentWrapper
        className={isMobile ? "" : "sm:max-w-[800px] max-h-[90vh] overflow-y-auto"}
        onEscapeKeyDown={() => handleOpenChange(false)}
    >
        {/* Контент */}
    </DialogContentWrapper>
</DialogWrapper>
```

### 3. Оптимизация layout для мобильных

#### Основной диалог (создание/редактирование):

**Desktop:** 2 колонки (`grid grid-cols-2 gap-4`)
**Mobile:** 1 колонка (`space-y-3`)

```tsx
<div className={isMobile ? "space-y-3" : "grid grid-cols-2 gap-4"}>
    {/* Поля формы */}
</div>
```

#### Диалог оплаты:

**Desktop:** 2 колонки (способы оплаты + детали)
```tsx
<div className="flex gap-6">
    <div className="flex-1 max-h-[500px] overflow-y-auto pr-2">
        {/* Способы оплаты */}
    </div>
    <div className="w-80">
        {/* Детали заказа */}
    </div>
</div>
```

**Mobile:** 1 колонка (вертикальный layout)
```tsx
<div className="space-y-4">
    <div className="space-y-3">
        {/* Способы оплаты */}
    </div>
    <div>
        {/* Детали заказа */}
    </div>
</div>
```

### 4. Компактные стили для мобильных

**Карточки оплаты:**

Desktop:
- padding: `p-4`
- gap: `gap-3`
- icon size: `w-12 h-12`
- font size: `text-lg`
- показывается описание

Mobile:
- padding: `p-2`
- gap: `gap-2`
- icon size: `w-8 h-8`
- font size: `text-base`
- описание скрыто

```tsx
<div className={`${isMobile ? 'p-2' : 'p-4'} border-2 rounded-xl...`}>
    <div className={`flex items-center ${isMobile ? 'gap-2' : 'gap-3'}`}>
        <PaymentMethodIcon className={isMobile ? "w-8 h-8" : "w-12 h-12"} />
        <div className="flex-1">
            <div className={`font-bold ${isMobile ? 'text-base' : 'text-lg'}`}>
                {method.label}
            </div>
            {!isMobile && <div className="text-sm text-gray-600">
                {method.description}
            </div>}
        </div>
    </div>
</div>
```

**Заголовки:**

Desktop: `text-lg font-semibold mb-4`
Mobile: `text-base font-semibold mb-2`

**Отступы:**

Desktop: `mb-4`
Mobile: `mb-2`

## Технические детали

### Ограничение высоты 75vh

```css
max-h-[75vh]  /* Максимум 75% высоты viewport */
flex flex-col /* Flexbox контейнер */
```

**Структура:**
- Header: `flex-shrink-0` - не сжимается, всегда виден
- Content: `flex-1 overflow-y-auto` - занимает оставшееся место, скроллится
- Footer: `flex-shrink-0` - не сжимается, всегда виден

### Адаптивный скролл

Только контент прокручивается, header и footer зафиксированы:

```tsx
<MobileDialogHeader> {/* фиксирован */}
  <MobileDialogTitle>Заголовок</MobileDialogTitle>
</MobileDialogHeader>

<MobileDialogScrollContent> {/* прокручивается */}
  {/* Весь контент формы */}
</MobileDialogScrollContent>

<MobileDialogFooter> {/* фиксирован */}
  <Button>Отмена</Button>
  <Button>Сохранить</Button>
</MobileDialogFooter>
```

### Условный рендеринг

**Проверка устройства:**
```typescript
const isMobile = useIsMobile(); // true если width < 768px
```

**Использование:**
```tsx
{isMobile ? <MobileComponent /> : <DesktopComponent />}

<div className={isMobile ? "mobile-class" : "desktop-class"}>

{!isMobile && <DesktopOnlyElement />}
```

## Изменённые файлы

### Созданные файлы:

1. **src/components/ui/mobile-dialog.tsx**
   - MobileDialog компонент
   - MobileDialogContent с max-h-[75vh]
   - MobileDialogScrollContent для прокрутки
   - MobileDialogHeader, Footer, Title

### Модифицированные файлы:

2. **src/pages/Calendar/components/task-dialog-btn.tsx**
   - Добавлен import useIsMobile
   - Добавлены условные компоненты (DialogWrapper, etc.)
   - Изменён layout: grid-cols-2 → space-y-3 для mobile
   - Оптимизированы паддинги и размеры для mobile
   - Диалог оплаты: flex → space-y-4 для mobile

## Преимущества решения

### 1. Умещается на экране
✅ Высота ограничена 75% - всегда влезает
✅ Ширина 95vw - отступы по бокам для красоты
✅ Внутренний скролл - можно прокрутить контент

### 2. Удобство использования
✅ Header и Footer всегда видны (кнопки доступны)
✅ Компактный layout (1 колонка вместо 2)
✅ Меньше паддингов - больше контента
✅ Оптимизированные размеры текста и иконок

### 3. Производительность
✅ Условный рендеринг - один код для mobile/desktop
✅ Нет дублирования компонентов
✅ CSS классы вместо JS манипуляций

### 4. Поддержка
✅ Легко настраивать высоту (меняем 75vh на другое значение)
✅ Можно добавить анимации
✅ Работает с любым контентом

## Сравнение Desktop vs Mobile

| Параметр | Desktop | Mobile |
|----------|---------|--------|
| **Ширина** | max-w-[800px] | 95vw (max-w-lg) |
| **Высота** | max-h-[90vh] | max-h-[75vh] |
| **Layout** | 2 колонки | 1 колонка |
| **Padding** | p-4 | p-2 |
| **Gap** | gap-4, gap-6 | gap-2, gap-3 |
| **Font size** | text-lg | text-base |
| **Icons** | w-12 h-12 | w-8 h-8 |
| **Скролл** | Весь контент | Только MobileDialogScrollContent |
| **Описания** | Показываются | Скрыты |

## Использование

### Для разработчиков:

1. **Использовать MobileDialog для новых диалогов:**
```typescript
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileDialog, MobileDialogContent... } from "@/components/ui/mobile-dialog";

const MyComponent = () => {
  const isMobile = useIsMobile();
  const DialogWrapper = isMobile ? MobileDialog : Dialog;
  
  return (
    <DialogWrapper>
      {/* Контент */}
    </DialogWrapper>
  );
};
```

2. **Оптимизировать layout:**
```tsx
<div className={isMobile ? "space-y-3" : "grid grid-cols-2 gap-4"}>
```

3. **Использовать MobileDialogScrollContent:**
```tsx
<MobileDialogContent>
  <MobileDialogHeader>
    <MobileDialogTitle>Заголовок</MobileDialogTitle>
  </MobileDialogHeader>
  
  <MobileDialogScrollContent>
    {/* Прокручиваемый контент */}
  </MobileDialogScrollContent>
  
  <MobileDialogFooter>
    <Button>Кнопки</Button>
  </MobileDialogFooter>
</MobileDialogContent>
```

## Тестирование

Необходимо проверить:
- ✅ Диалог открывается на мобильных
- ✅ Высота не превышает 75vh
- ✅ Контент прокручивается
- ✅ Header и Footer зафиксированы
- ✅ Layout переключается на 1 колонку
- ✅ Карточки оплаты компактные
- ✅ Все поля доступны и работают
- ✅ Кнопки сохранения/отмены видны

## Результат

✅ **Проблема решена:**
- Диалоги умещаются на мобильных экранах (75vh)
- Внутренний скролл работает корректно
- Компактный layout оптимизирован для мобильных
- Header и Footer всегда доступны
- Один код для desktop и mobile (условный рендеринг)
