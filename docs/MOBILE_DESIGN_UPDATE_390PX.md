# Обновление дизайна мобильной версии под iPhone 12/13 Pro (390x844)

## Дата: 3 ноября 2025 г.

## Описание
Полное переоформление мобильного sidebar в стиле десктопной версии с тёмным градиентом, зелёными акцентами и оптимизация под разрешение 390x844px.

---

## 1. Новый дизайн Mobile Sidebar

### 1.1 Цветовая схема

**Было (светлый дизайн):**
- Фон: белый (`bg-background`)
- Текст: чёрный (`text-foreground`)
- Акценты: синий primary
- Простые границы

**Стало (тёмный дизайн как в десктопе):**
- Фон navbar: `bg-gradient-to-r from-slate-900 to-slate-800`
- Фон sidebar: `bg-gradient-to-b from-slate-900 to-slate-800`
- Границы: `border-slate-700/50` (полупрозрачные)
- Текст: `text-slate-300` (неактивный), `text-white` (hover/active)
- Акценты: зелёный emerald/teal
- Активные пункты: `bg-emerald-500/20 text-emerald-400 border-emerald-500/30`

### 1.2 Логотип и header

**Было:**
```tsx
<img width={20} height={10} src={LOGO} alt="logo" />
<h1 className="font-medium text-lg">Octō CRM</h1>
```

**Стало:**
```tsx
<div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-1.5 rounded-lg shadow-md">
  <img width={16} height={8} src={LOGO} alt="logo" />
</div>
<h1 className="font-bold text-base bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
  Octō CRM
</h1>
```

**Изменения:**
- ✅ Логотип в зелёном градиентном контейнере
- ✅ Заголовок с градиентным текстом (emerald to teal)
- ✅ Подпись роли добавлена (`t('sidebar.admin_panel')`)

### 1.3 Структура sidebar

```tsx
<SheetContent className="w-[390px] p-0 bg-gradient-to-b from-slate-900 to-slate-800 border-slate-700/50">
  {/* Header с логотипом и кнопкой закрытия */}
  <div className="p-4 border-b border-slate-700/50">
    {/* Логотип, название, подпись */}
  </div>

  {/* Branch Selector */}
  <div className="px-3 py-2 border-b border-slate-700/50">
    <BranchSelectorDialog />
  </div>

  {/* Navigation */}
  <nav className="flex-grow py-3 px-2 overflow-y-auto">
    {/* Меню с зелёными акцентами */}
  </nav>

  {/* Footer с кнопкой выхода */}
  <div className="p-3 border-t border-slate-700/50">
    {/* Logout button */}
  </div>
</SheetContent>
```

### 1.4 Стили пунктов меню

**Неактивный пункт:**
```tsx
className="flex items-center px-3 py-2.5 rounded-lg text-sm transition-all duration-200 
  text-slate-300 hover:text-white hover:bg-slate-700/50"
```

**Активный пункт:**
```tsx
className="flex items-center px-3 py-2.5 rounded-lg text-sm transition-all duration-200 
  bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10"
```

**Вложенные пункты:**
```tsx
className="flex items-center px-3 py-2 ml-4 rounded-lg text-sm transition-all duration-200 
  text-slate-400 hover:text-white hover:bg-slate-700/50"
```

---

## 2. Оптимизация для разрешения 390x844px

### 2.1 MobileNavbar и MobileNavbarAdmin

**Ширина sidebar:**
- Было: `w-[85vw] sm:w-[350px]` (гибкая ширина)
- Стало: `w-[390px]` (фиксированная под iPhone)

**Navbar padding:**
- Было: `px-4 py-3`
- Стало: `px-3 py-2.5` (компактнее)

**Размеры иконок:**
- Логотип: `16x8` вместо `20x10`
- Иконки меню: `h-5 w-5` (без изменений)

**Отступы меню:**
- Было: `px-4 py-3`
- Стало: `px-3 py-2.5` (экономия пространства)
- Дочерние элементы: `ml-4` (отступ слева для вложенности)

### 2.2 Страница Masters

**Контейнер:**
```tsx
// Было:
<div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8">

// Стало:
<div className="container mx-auto py-6 px-3 sm:py-10 sm:px-4 lg:px-8">
```

**Header:**
```tsx
// Padding:
<CardHeader className="p-3 sm:p-6">

// Заголовок:
<CardTitle className="text-lg sm:text-xl lg:text-2xl">
  <User className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8" />

// Кнопки - вертикальное расположение:
<div className="flex flex-col gap-2 w-full">
  <Button className="w-full justify-center text-sm" size="sm">
    {/* Полная ширина на мобильных */}
  </Button>
</div>
```

**Grid для карточек:**
```tsx
// Было:
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">

// Стало (строго 1 колонка на мобильных):
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
```

**Диалоги:**
```tsx
// Адаптивная ширина:
<DialogContent className="w-[95vw] max-w-[650px] max-h-[90vh] overflow-y-auto">
  <DialogTitle className="text-lg sm:text-xl">
```

### 2.3 Страница Reports

**Контейнер:**
```tsx
// Было:
<div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">

// Стало:
<div className="container mx-auto p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4 lg:space-y-6">
```

**Фильтры - вертикальная компоновка:**
```tsx
<div className="flex flex-col gap-3">
  {/* Branch selector */}
  <div className="flex flex-col gap-2 w-full">
    <label className="text-xs sm:text-sm">
    <select className="w-full px-2 py-1.5 text-xs sm:text-sm">
  </div>
  
  {/* Даты - 2 колонки */}
  <div className="grid grid-cols-2 gap-2 sm:gap-3">
    <div className="flex flex-col gap-2">
      <label className="text-xs sm:text-sm">
      <input type="date" className="w-full px-2 py-1.5 text-xs sm:text-sm">
    </div>
  </div>
  
  {/* Кнопка - полная ширина */}
  <Button className="w-full text-xs sm:text-sm" size="sm">
</div>
```

**Таблица:**
```tsx
<CardHeader className="p-3 sm:p-4 lg:p-6">
  <CardTitle className="text-sm sm:text-base lg:text-lg">
    <span className="block">Отчеты за период</span>
    <span className="block text-xs sm:text-sm font-normal text-gray-600 mt-1">
      {/* Разбито на 2 строки для мобильных */}
    </span>
  </CardTitle>
</CardHeader>

<table className="w-full text-[10px] sm:text-xs lg:text-sm min-w-[1200px]">
  <thead>
    <tr>
      <th className="px-2 sm:px-4 py-2 sm:py-3">
```

**Размеры текста в таблице:**
- Мобильный (390px): `text-[10px]` (очень мелкий шрифт)
- Планшет: `text-xs`
- Десктоп: `text-sm`

---

## 3. Breakpoints и адаптивность

### 3.1 Используемые breakpoints

```css
/* Наши breakpoints */
default: 0-639px     /* Мобильные (включая 390px) */
sm: 640px-767px      /* Маленькие планшеты */
md: 768px-1023px     /* Планшеты */
lg: 1024px-1279px    /* Маленькие десктопы */
xl: 1280px+          /* Большие десктопы */
```

### 3.2 Оптимизация для 390px

**Принципы:**
1. **Вертикальная компоновка** - всё в одну колонку
2. **Полная ширина кнопок** - `w-full` для удобного нажатия
3. **Компактные отступы** - `p-3` вместо `p-6`
4. **Меньшие шрифты** - `text-xs` или `text-[10px]`
5. **Фиксированная ширина sidebar** - `w-[390px]` точно под экран

---

## 4. Визуальная иерархия

### 4.1 Navbar (верхняя панель)

```
┌─────────────────────────────────────────┐
│ [🟢 Logo] Octō CRM  [🔄] 🌐 [≡]         │
│ gradient     gradient   branch  menu    │
└─────────────────────────────────────────┘
```

**Элементы:**
- Зелёный градиентный контейнер с логотипом
- Градиентный текст названия
- Branch indicator (компактный)
- Кнопка меню (гамбургер)

### 4.2 Sidebar (боковая панель)

```
┌─────────────────────────────┐
│ [🟢] Octō CRM          [✕] │
│     Admin Panel            │
├─────────────────────────────┤
│ [Branch Selector]          │
├─────────────────────────────┤
│ 📚 How to Use              │
│ 👥 Clients                 │
│ 💬 Chats                   │
│ 📋 CRM ▼                   │
│   └ 📅 Calendar            │
│   └ 👤 Masters             │
│   └ ✨ Services            │
│ 💰 Accounting              │
│ 📊 Reports                 │
│ 💵 Salary                  │
│ 🎁 Gift Certificates       │
│ ❓ How to Use              │
│ ⚙️ Settings                │
├─────────────────────────────┤
│ 🚪 Logout                  │
└─────────────────────────────┘
```

---

## 5. Цветовая палитра

### 5.1 Основные цвета

```css
/* Фон */
--slate-900: #0f172a
--slate-800: #1e293b
--slate-700: #334155

/* Текст */
--slate-400: #94a3b8  /* Неактивный */
--slate-300: #cbd5e1  /* Обычный */
--white: #ffffff      /* Активный hover */

/* Акценты (зелёный) */
--emerald-500: #10b981
--emerald-400: #34d399
--teal-600: #0d9488
--teal-400: #2dd4bf

/* Hover состояния */
--slate-700/50: rgba(51, 65, 85, 0.5)
--emerald-500/20: rgba(16, 185, 129, 0.2)
--emerald-500/30: rgba(16, 185, 129, 0.3)
--emerald-500/10: rgba(16, 185, 129, 0.1)

/* Красный для logout */
--red-400: #f87171
--red-500/10: rgba(239, 68, 68, 0.1)
```

### 5.2 Градиенты

**Фон navbar:**
```css
background: linear-gradient(to right, #0f172a, #1e293b);
```

**Фон sidebar:**
```css
background: linear-gradient(to bottom, #0f172a, #1e293b);
```

**Логотип контейнер:**
```css
background: linear-gradient(to bottom right, #10b981, #0d9488);
```

**Текст заголовка:**
```css
background: linear-gradient(to right, #34d399, #2dd4bf);
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;
```

---

## 6. Тени и эффекты

### 6.1 Тени

**Navbar:**
```css
box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
```

**Логотип контейнер:**
```css
box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
```

**Активный пункт меню:**
```css
box-shadow: 0 20px 25px -5px rgba(16, 185, 129, 0.1);
```

### 6.2 Transitions

**Все интерактивные элементы:**
```css
transition: all 0.2s ease;
```

**Иконки и текст:**
```css
transition-property: color, background-color, border-color;
transition-duration: 200ms;
```

---

## 7. Файлы изменены

1. `/src/components/MobileNavbar.tsx` - полное переоформление
2. `/src/components/MobileNavbarAdmin.tsx` - полное переоформление
3. `/src/pages/Masters.tsx` - оптимизация под 390px
4. `/src/pages/ReportPage.tsx` - оптимизация под 390px

---

## 8. Чек-лист тестирования для iPhone 12/13 Pro (390x844)

### 8.1 Navbar
- [ ] Логотип отображается корректно с зелёным градиентом
- [ ] Текст "Octō CRM" имеет градиент от emerald до teal
- [ ] Branch indicator виден и работает
- [ ] Кнопка меню (гамбургер) легко нажимается

### 8.2 Sidebar
- [ ] Sidebar открывается плавно на всю ширину экрана (390px)
- [ ] Header с логотипом и названием виден полностью
- [ ] Подпись роли ("Admin Panel" / "Superadmin Panel") видна
- [ ] Branch Selector помещается и работает
- [ ] Все пункты меню видны и кликабельны
- [ ] Вложенные пункты имеют отступ и видны
- [ ] Активный пункт подсвечивается зелёным
- [ ] Hover эффекты работают (при touch - active state)
- [ ] Кнопка Logout внизу доступна
- [ ] Скролл работает если меню длинное

### 8.3 Страница Masters
- [ ] Header занимает одну колонку
- [ ] Кнопки "Добавить мастера" и "Добавить администратора" на полную ширину
- [ ] Карточки мастеров в одну колонку
- [ ] Кнопки в карточках на полную ширину
- [ ] Диалоги открываются на 95% ширины экрана
- [ ] Формы в диалогах удобно заполнять

### 8.4 Страница Reports
- [ ] Фильтры в одну колонку
- [ ] Даты в две колонки (по 50%)
- [ ] Таблица скроллится горизонтально
- [ ] Текст в таблице читаемый (10px)
- [ ] Вертикальный скролл работает
- [ ] Sticky header таблицы работает

---

## 9. Скриншоты (для документации)

### 9.1 Navbar - закрыто
```
┌─────────────────────────┐
│ 🟢 Octō CRM   🔄 🌐 ≡  │
└─────────────────────────┘
Dark gradient background
```

### 9.2 Sidebar - открыто
```
┌──────────────────────────┐
│ 🟢 Octō CRM         ✕   │
│   Admin Panel           │
├──────────────────────────┤
│ [Branch: Main]          │
├──────────────────────────┤
│ ▫️ Menu items...         │
│ ▪️ Active item           │ ← Green highlight
│ ▫️ Menu items...         │
├──────────────────────────┤
│ 🚪 Logout                │
└──────────────────────────┘
Full dark theme with green accents
```

---

## 10. Следующие шаги

### 10.1 Дальнейшие улучшения
- [ ] Добавить анимации открытия/закрытия sidebar
- [ ] Добавить haptic feedback для iOS
- [ ] Оптимизировать производительность анимаций
- [ ] Добавить gesture для закрытия sidebar (swipe left)

### 10.2 Другие страницы для адаптации
- [ ] Dashboard (главная страница)
- [ ] Clients (клиенты)
- [ ] Calendar (календарь)
- [ ] Accounting (бухгалтерия)
- [ ] Settings (настройки)

---

## Заключение

Мобильный sidebar теперь полностью соответствует дизайну десктопной версии:
✅ Тёмный градиентный фон (slate-900 to slate-800)
✅ Зелёные акценты (emerald/teal)
✅ Градиентный логотип и заголовок
✅ Белые шрифты с различными оттенками slate
✅ Оптимизация под iPhone 12/13 Pro (390x844)
✅ Компактные отступы и размеры
✅ Удобство использования на мобильных устройствах
