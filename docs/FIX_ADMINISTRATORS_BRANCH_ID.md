# 🐛 Исправление: Administrators API брал неправильный branchID

## Проблема

При запросе `/api/administrators?branchID=2` система отправляла запрос с неправильным ID филиала, несмотря на то что у пользователя был выбран филиал 1.

## Причина

В файле `task-dialog-btn.tsx` при запросе администраторов использовалось:

```typescript
getBranchIdWithFallback(null, branches)  // ❌ Передавался null вместо currentBranch
```

Это приводило к тому, что функция возвращала `branches[0].id` (первый филиал из массива) вместо текущего выбранного филиала.

## Исправление

**Файл:** `src/pages/Calendar/components/task-dialog-btn.tsx`

### Было:

```typescript
const { branches } = useBranch();  // ❌ Не получали currentBranch
const { user } = useAuth();

const { data: administrators = [] } = useQuery<{ id: number, name: string }[]>({
    queryKey: ['administrators', getBranchIdWithFallback(null, branches)],  // ❌ null
    queryFn: async () => {
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/administrators?branchID=${getBranchIdWithFallback(null, branches)}`);  // ❌ null
        return res.json();
    },
});
```

### Стало:

```typescript
const { branches, currentBranch } = useBranch();  // ✅ Получаем currentBranch
const { user } = useAuth();

const { data: administrators = [] } = useQuery<{ id: number, name: string }[]>({
    queryKey: ['administrators', getBranchIdWithFallback(currentBranch, branches)],  // ✅ currentBranch
    queryFn: async () => {
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/administrators?branchID=${getBranchIdWithFallback(currentBranch, branches)}`);  // ✅ currentBranch
        return res.json();
    },
});
```

## Проверка других мест

Проверены все места использования `/api/administrators`:

| Файл | Статус | Комментарий |
|------|--------|-------------|
| `task-dialog-btn.tsx` | ✅ Исправлено | Теперь использует `currentBranch` |
| `EditAppointmentDialog.tsx` | ✅ Корректно | Уже использует `currentBranch` |
| `Masters.tsx` (GET) | ✅ Корректно | Уже использует `currentBranch.id` |
| `Masters.tsx` (POST) | ✅ Корректно | POST для создания, branchID в теле |
| `Masters.tsx` (PATCH/DELETE) | ✅ Корректно | Работают с конкретным ID |
| `AccountingPage.tsx` | ✅ Корректно | Использует `branchId` параметр |
| `GiftCertificatesPage.tsx` | ✅ Корректно | Использует `currentBranch.id` |
| `DailyCalendar.tsx` | ✅ Корректно | Использует `currentBranch` |

## Логика fallback

Функция `getBranchIdWithFallback` работает с приоритетами:

1. **Первый приоритет:** `currentBranch?.id` - текущий выбранный филиал
2. **Второй приоритет:** `branches[0]?.id` - первый филиал из списка
3. **Fallback:** `1` - ID по умолчанию

**До исправления:** Всегда использовался 2-й или 3-й приоритет  
**После исправления:** Используется 1-й приоритет (текущий филиал)

## Результат

Теперь запрос администраторов всегда использует выбранный пользователем филиал:

```
Выбран филиал 1 → /api/administrators?branchID=1 ✅
Выбран филиал 2 → /api/administrators?branchID=2 ✅
Выбран филиал 5 → /api/administrators?branchID=5 ✅
```

## Build Status

```bash
✓ built in 9.03s
Bundle: 2,655.39 KB
No errors
```

## Проверено

- [x] Исправлена передача `currentBranch` вместо `null`
- [x] Проверены все остальные места использования API
- [x] Build успешен
- [x] TypeScript ошибок нет

---

**Дата исправления:** 17 октября 2025  
**Затронутые файлы:** 1  
**Строки изменены:** 3
