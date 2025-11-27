# Откат BranchSelector к коммиту e10dba55

## Дата: 27 ноября 2025 г.

## Выполненное действие

Десктопный компонент `BranchSelector.tsx` откачен к версии из коммита `e10dba55e59ca02f8e4b02d24887dea0d0e8553f`.

## Изменения

### Кнопка триггера в Sidebar

**Было (новая версия):**
```tsx
<Button 
  variant="outline" 
  size="sm"
  className="bg-gradient-to-r from-emerald-400 to-teal-400 border-emerald-500 hover:from-emerald-500 hover:to-teal-500 hover:border-emerald-600 text-slate-900 hover:text-slate-900 font-semibold shadow-md hover:shadow-xl transition-all duration-200 gap-1.5 h-8 px-3"
>
  <Building2 className="h-4 w-4" />
  <span className="text-xs">{currentBranch?.branches || t('branch.title')}</span>
</Button>
```

**Стало (откачено к коммиту e10dba55):**
```tsx
<Button variant="ghost" className="justify-start px-3 py-2 w-full hover:text-white hover:bg-white/10 text-slate-300">
  <Building2 className="h-5 w-5 mr-2" />
  <span className="text-left">{t('branch.title')}</span>
</Button>
```

### Состояние загрузки

**Было:**
```tsx
<Button variant="ghost" className="justify-start px-4 py-3 w-full hover:text-white hover:bg-white/10 text-slate-300" disabled>
  <Building2 className="h-5 w-5 mr-3" />
  <span className="text-left text-base">{t('branch.loading')}</span>
</Button>
```

**Стало:**
```tsx
<Button variant="ghost" className="justify-start px-3 py-2 w-full hover:text-white hover:bg-white/10 text-slate-300" disabled>
  <Building2 className="h-5 w-5 mr-2" />
  <span className="text-left">{t('branch.loading')}</span>
</Button>
```

### Диалоговое окно выбора филиала

**Изменения:**
- `className="max-w-2xl"` → `className="sm:max-w-md"`
- `<DialogTitle className="text-xl">` → `<DialogTitle>`
- `<DialogDescription className="text-base">` → `<DialogDescription>`
- `space-y-4 py-6` → `space-y-3 py-4`
- `max-h-[500px] overflow-y-auto` → убрано
- Кнопки footer: `className="px-6"` → без класса

### Диалоговое окно редактирования

**Изменения:**
- `className="max-w-xl"` → `className="sm:max-w-md"`
- `<DialogTitle className="text-xl">` → `<DialogTitle>`
- `<DialogDescription className="text-base">` → `<DialogDescription>`
- `space-y-5 py-6` → `space-y-4 py-4`
- Avatar: `h-24 w-24` → `h-20 w-20`
- AvatarFallback: `text-3xl` → `text-2xl`
- Upload button: `h-11 px-5` → `h-10 px-4`
- Icons: `h-5 w-5` → `h-4 w-4`
- Text: `text-base` → `text-sm`
- Labels: `className="text-base"` → без класса
- Inputs: `className="mt-2 text-base"` → без класса
- Footer buttons: `className="px-6"` → без класса

## Основные различия

| Элемент | Новая версия | Откаченная версия |
|---------|--------------|-------------------|
| Кнопка триггера | Градиентная, компактная | Ghost, стандартная |
| Показ текущего филиала | Да (currentBranch?.branches) | Нет (только 'branch.title') |
| Размер диалога выбора | max-w-2xl | sm:max-w-md |
| Размер диалога редактирования | max-w-xl | sm:max-w-md |
| Размеры текста | Увеличенные (text-base, text-xl) | Стандартные |
| Размеры иконок | h-4 w-4 | Стандартные |
| Размеры аватаров | h-24 w-24 | h-20 w-20 |
| Отступы | Увеличенные | Стандартные |

## Причина отката

Десктопный компонент был временно изменен на более крупную версию, но требуется вернуться к оригинальному стилю из коммита e10dba55.

## Статус компонентов после отката

- ✅ `BranchSelector.tsx` - откачен к коммиту e10dba55 (десктопная версия в sidebar)
- ✅ `BranchSelectorMobile.tsx` - остается без изменений (мобильная версия в header)
- ✅ `MobileHeader.tsx` - использует `BranchSelectorMobile`
- ✅ `Sidebar.tsx` - использует `BranchSelectorDialog` из `BranchSelector.tsx`

## Результат

Десктопная версия BranchSelector теперь соответствует коммиту e10dba55e59ca02f8e4b02d24887dea0d0e8553f с классическими стилями sidebar.

---

**Выполнено:** ✅  
**Ошибок:** Нет  
**Коммит для сравнения:** e10dba55e59ca02f8e4b02d24887dea0d0e8553f
