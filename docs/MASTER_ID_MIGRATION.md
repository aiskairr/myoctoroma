# Миграция на новый формат API /api/user - masterId и administratorId

**Дата:** 20 октября 2025 г.  
**Затронутые файлы:** 
- `src/contexts/SimpleAuthContext.tsx`
- `src/pages/Calendar/MasterCalendarView.tsx`
- `src/hooks/use-tasks.ts`
- `src/hooks/use-master-role.tsx`
- `src/components/CancelledAppointments.tsx`

## Проблема

Backend обновил формат ответа `/api/user`, добавив новые поля:
- `masterId` - ID мастера (вместо старого `master_id`)
- `administratorId` - ID администратора
- `isActive` - статус активности пользователя
- `branchId` - ID филиала (string вместо number)

**Старый формат:**
```json
{
  "id": 29,
  "username": "Абдулла юниор",
  "email": "anton@gmail.com",
  "role": "master",
  "branchId": "1",
  "organisationId": 1,
  "clientId": null
}
```

**Новый формат:**
```json
{
  "id": 38,
  "email": "please@gmail.com",
  "username": "Азат",
  "role": "master",
  "branchId": "1",
  "organisationId": 1,
  "isActive": true,
  "masterId": 6,
  "administratorId": null
}
```

## Решение

Обновлены все места в коде, где используется `user.master_id`, чтобы поддерживать новое поле `user.masterId` с сохранением обратной совместимости.

### 1. Обновлен интерфейс User в SimpleAuthContext.tsx

```typescript
interface User {
  id: number;
  email: string;
  username: string;
  role: string;
  branchId?: string | null;              // ✅ ДОБАВЛЕНО
  instanceId?: string | null;
  masterId?: number | null;              // ✅ ДОБАВЛЕНО - новое поле
  administratorId?: number | null;       // ✅ ДОБАВЛЕНО
  master_id?: number | null;             // deprecated, use masterId
  organisationId?: number | null;
  organization_id?: number | null;
  orgId?: number | null;
  isActive?: boolean;                    // ✅ ДОБАВЛЕНО
}
```

### 2. MasterCalendarView.tsx

**Было:**
```typescript
const masterId = user.master_id || user.id;
```

**Стало:**
```typescript
// Определяем ID мастера - используем только masterId или master_id (БЕЗ fallback на user.id!)
// user.id - это ID пользователя в таблице users, а masterId - это ID в таблице masters
const masterId = user.masterId || user.master_id;

console.log('👤 MasterCalendarView - User info:', {
  user,
  role: user?.role,
  masterId: user?.masterId,    // новое поле
  master_id: user?.master_id,  // deprecated
  id: user?.id
});
```

**ВАЖНО:** Убран fallback на `user.id`, так как:
- `user.id` = ID в таблице `users` (например, 38)
- `user.masterId` = ID в таблице `masters` (например, 6)
- Это разные значения и НЕ должны смешиваться!

### 3. use-tasks.ts

**useTasksRaw hook:**
```typescript
// Было:
if (params.userMasterId || user?.master_id) {
  queryParams.append('userMasterId', (params.userMasterId || user?.master_id || '').toString());
}

// Стало:
const userMasterId = user?.masterId || user?.master_id;
if (params.userMasterId || userMasterId) {
  queryParams.append('userMasterId', (params.userMasterId || userMasterId || '').toString());
}
```

**useMyTasks hook:**
```typescript
// Было:
if (!user?.master_id) {
  return { data: [], isLoading: false, error: null, refetch: () => Promise.resolve(), isFetching: false };
}
const params: TasksQueryParams = {
  userMasterId: user.master_id,
  userRole: 'master'
};

// Стало:
const userMasterId = user?.masterId || user?.master_id;
if (!userMasterId) {
  return { data: [], isLoading: false, error: null, refetch: () => Promise.resolve(), isFetching: false };
}
const params: TasksQueryParams = {
  userMasterId: userMasterId,
  userRole: 'master'
};
```

### 4. CancelledAppointments.tsx

**Было:**
```typescript
if (user?.master_id) queryParams.append('userMasterId', user.master_id.toString());
return `/api/tasks?${queryParams.toString()}`;
}, [branchId, dateRange.scheduledAfter, dateRange.scheduledBefore, user?.role, user?.master_id]);
```

**Стало:**
```typescript
const userMasterId = user?.masterId || user?.master_id;
if (userMasterId) queryParams.append('userMasterId', userMasterId.toString());
return `/api/tasks?${queryParams.toString()}`;
}, [branchId, dateRange.scheduledAfter, dateRange.scheduledBefore, user?.role, user?.masterId, user?.master_id]);
```

### 5. use-master-role.tsx

**Было:**
```typescript
export function useIsMaster() {
  const { user, isLoading } = useAuth();
  
  return {
    isMaster: user?.role === "master",
    masterId: user?.master_id,
    isLoading,
    user
  };
}
```

**Стало:**
```typescript
export function useIsMaster() {
  const { user, isLoading } = useAuth();
  
  // Используем masterId (новое поле) с fallback на master_id (deprecated)
  const masterId = user?.masterId || user?.master_id;
  
  return {
    isMaster: user?.role === "master",
    masterId,
    isLoading,
    user
  };
}
```

## Логика работы

Все обновления следуют единому паттерну с приоритетом новых полей и fallback на старые:

```typescript
const userMasterId = user?.masterId || user?.master_id;
```

Это обеспечивает:
1. **Прямую совместимость** - новый API работает сразу
2. **Обратную совместимость** - старый API продолжает работать
3. **Плавный переход** - можно постепенно обновлять backend

## ⚠️ КРИТИЧЕСКИ ВАЖНО

### Разница между user.id и user.masterId

**НЕ ПУТАТЬ:**
- `user.id` = ID пользователя в таблице `users` (например, 38)
- `user.masterId` = ID мастера в таблице `masters` (например, 6)

Эти значения **РАЗНЫЕ** и **НЕ взаимозаменяемы**!

### Приоритет полей в коде:

```typescript
// ✅ ПРАВИЛЬНО - только masterId или master_id
const masterId = user?.masterId || user?.master_id;

// ❌ НЕПРАВИЛЬНО - fallback на user.id
const masterId = user?.masterId || user?.master_id || user.id;
```

## Важно для backend

Backend теперь должен возвращать:
- `masterId` для пользователей с ролью `master`
- `administratorId` для пользователей с ролью `reception`

Эти поля должны совпадать с ID из соответствующих таблиц:
- `/api/crm/masters/` - таблица мастеров
- `/api/crm/administrators/` - таблица администраторов

## Связь с регистрацией пользователей

Этот апдейт связан с изменениями в `Masters.tsx` (см. `USER_REGISTRATION_FIX.md`), где при регистрации теперь передаются:
- `master_id` для мастеров
- `administrator_id` для reception

Backend должен сохранять эти значения и возвращать их как `masterId`/`administratorId` в `/api/user`.

## Тестирование

1. Войдите как мастер с новым аккаунтом
2. Проверьте консоль браузера:
   ```
   👤 MasterCalendarView - User info: { 
     masterId: 6, 
     master_id: undefined, 
     role: 'master' 
   }
   ```
3. Убедитесь, что календарь мастера загружает задачи
4. Проверьте, что фильтрация по мастеру работает корректно

## Migration Path

### Фаза 1: Обновление frontend (текущая)
✅ Frontend поддерживает оба формата: `masterId` и `master_id`

### Фаза 2: Обновление backend
- Backend возвращает оба поля: `masterId` (новое) и `master_id` (deprecated)

### Фаза 3: Удаление deprecated полей (будущее)
- Удалить `master_id` из User interface
- Удалить fallback логику `|| user?.master_id`
- Backend перестает возвращать `master_id`

## Связанные документы

- `USER_REGISTRATION_FIX.md` - регистрация с master_id/administrator_id
- `MASTER_CALENDAR_FIX.md` - архитектура календаря мастера
- `MASTER_ROLE_CALENDAR_MIGRATION.md` - миграция календаря мастера
