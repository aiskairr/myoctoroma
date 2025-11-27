# Исправление отображения Sidebar вместо Bottom Bar

## Дата: 27 ноября 2025 г.

## Проблема

На мобильных устройствах продолжал отображаться Sidebar вместо нового Bottom Tab Bar.

## Причина

Логика условного рендеринга была слишком сложной и проверяла роли `isAdmin` и `isMaster` отдельно. Это приводило к тому, что для некоторых пользователей продолжал показываться старый интерфейс.

### Старая логика:
```tsx
{isMobile && isMaster && <MobileNavbarMaster />}
{isMobile && isAdmin && !isMaster && <MobileNavbarAdmin />}
{isMobile && !isMaster && !isAdmin && <MobileHeader />}
...
{isMobile && !isMaster && !isAdmin && <MobileBottomTabBar />}
```

**Проблема:** Если пользователь был админом, но не мастером, показывался `MobileNavbarAdmin`, который включал старый sidebar.

## Решение

Упростили логику - теперь новый интерфейс (Header + Bottom Bar) показывается всем мобильным пользователям, **кроме мастеров**.

### Новая логика:
```tsx
const showNewMobileUI = isMobile && !isMaster;

{isMobile && isMaster && <MobileNavbarMaster />}
{showNewMobileUI && <MobileHeader />}
...
{showNewMobileUI && <MobileBottomTabBar />}
```

## Изменения в коде

### 1. Удалены неиспользуемые импорты
```tsx
// УДАЛЕНО:
import { MobileNavbarAdmin } from "@/components/MobileNavbarAdmin";
import { useIsAdmin } from "@/hooks/use-admin-role";
```

### 2. Упрощена логика ProtectedLayout

**До:**
- Проверка `isMaster` ✓
- Проверка `isAdmin` ✓
- Сложные условия с обеими ролями

**После:**
- Проверка только `isMaster`
- Простая переменная `showNewMobileUI = isMobile && !isMaster`
- Чистая логика рендеринга

### 3. Гарантированно скрыт Sidebar на мобильных

```tsx
<div className="flex flex-grow">
  {/* Sidebar только для десктопа */}
  {!isMobile && <Sidebar />}
  ...
</div>
```

## Результат

✅ **Для обычных пользователей на мобильных:**
- Показывается MobileHeader (вверху)
- Показывается MobileBottomTabBar (внизу)
- Sidebar скрыт
- Контент имеет отступ снизу (pb-20) для bottom bar

✅ **Для мастеров на мобильных:**
- Показывается MobileNavbarMaster (специальный интерфейс для мастеров)
- Bottom bar НЕ показывается

✅ **Для всех на десктопе:**
- Показывается классический Sidebar
- Мобильные компоненты скрыты

## Проверка

```bash
npm run build
# ✓ built in 10.21s
# No errors found
```

## Файлы изменены

- `src/App.tsx` - упрощена логика условного рендеринга

## Как проверить

1. Откройте приложение на мобильном устройстве (или в DevTools с мобильным viewport)
2. Войдите как обычный пользователь (не мастер)
3. Должны увидеть:
   - Сверху: Header с логотипом и селектором филиала
   - Снизу: Bottom Tab Bar с 5 кнопками
   - Никакого Sidebar!

## Дополнительно

Если всё ещё видите sidebar, проверьте:
1. **Ширину экрана**: должна быть < 768px
2. **Кеш браузера**: попробуйте Hard Reload (Cmd+Shift+R)
3. **Роль пользователя**: убедитесь, что это не мастер
