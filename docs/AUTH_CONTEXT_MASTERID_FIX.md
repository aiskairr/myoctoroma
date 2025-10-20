# Исправление: masterId не попадает в user state

**Дата:** 20 октября 2025 г.  
**Приоритет:** 🔴 КРИТИЧЕСКИЙ  
**Файл:** `src/contexts/SimpleAuthContext.tsx`

## Проблема

### Симптомы
Frontend показывал ошибку:
```
Ошибка конфигурации
Поле masterId отсутствует в профиле пользователя

User ID: 38
masterId: не задан
master_id: не задан
```

Но API `/api/user` возвращал правильные данные:
```json
{
    "id": 38,
    "email": "please@gmail.com",
    "username": "Азат",
    "role": "master",
    "branchId": "1",
    "organisationId": 1,
    "isActive": true,
    "masterId": 6,           // ← поле есть в API!
    "administratorId": null
}
```

### Причина

В `SimpleAuthContext.tsx` при создании объекта `user` **не включались новые поля** из API:
- `masterId` ❌
- `administratorId` ❌
- `branchId` ❌
- `isActive` ❌

Код создавал объект `user` вручную и включал только старые поля:

```typescript
// ❌ СТАРЫЙ КОД - не включал новые поля
setUser({
  id: userData.id,
  email: userData.email || '',
  username: userData.username || '',
  role: userData.role || '',
  instanceId: userData.instanceId || null,
  master_id: userData.master_id || null,      // только старое поле!
  organisationId: userData.organisationId || null,
  organization_id: userData.organization_id || null,
  orgId: userData.orgId || null,
});
```

## Решение

### Обновлены 2 места в SimpleAuthContext.tsx

#### 1. Функция checkAuth() - проверка токена (строка ~87)

```typescript
// ✅ НОВЫЙ КОД - включает все поля
const userObject = {
  id: userData.id,
  email: userData.email || '',
  username: userData.username || '',
  role: userData.role || '',
  branchId: userData.branchId || null,              // ✅ ДОБАВЛЕНО
  instanceId: userData.instanceId || null,
  masterId: userData.masterId || null,              // ✅ ДОБАВЛЕНО
  administratorId: userData.administratorId || null,// ✅ ДОБАВЛЕНО
  master_id: userData.master_id || null,            // deprecated, но сохранено
  organisationId: userData.organisationId || null,
  organization_id: userData.organization_id || null,
  orgId: userData.orgId || null,
  isActive: userData.isActive ?? true,              // ✅ ДОБАВЛЕНО
};

setUser(userObject);
```

#### 2. Функция checkAuth() - fallback через cookie (строка ~154)

Такие же изменения применены для fallback метода, когда данные читаются из cookie.

### Добавлено детальное логирование

Для отладки добавлены console.log:

```typescript
console.log("✅ Token valid, user data from API:", userData);
console.log("🔍 masterId from API:", userData.masterId);
console.log("🔍 administratorId from API:", userData.administratorId);
console.log("📦 Setting user object:", userObject);
```

Аналогичное логирование добавлено в функцию `login()`.

## Проверка в консоли браузера

После исправления при логине или перезагрузке страницы должны появиться логи:

```
✅ Token valid, user data from API: {
  id: 38,
  email: "please@gmail.com",
  username: "Азат",
  role: "master",
  branchId: "1",
  organisationId: 1,
  isActive: true,
  masterId: 6,              // ← есть в API
  administratorId: null
}

🔍 masterId from API: 6
🔍 administratorId from API: null

📦 Setting user object: {
  id: 38,
  email: "please@gmail.com",
  username: "Азат",
  role: "master",
  branchId: "1",
  masterId: 6,              // ← попало в user state!
  administratorId: null,
  isActive: true,
  ...
}
```

Затем в `MasterCalendarView.tsx`:

```
👤 MasterCalendarView - User info: {
  user: { id: 38, masterId: 6, ... },
  role: 'master',
  masterId: 6,              // ← теперь определяется!
  master_id: undefined,
  id: 38
}

🔍 Fetching master calendar: {
  masterId: 6,              // ← правильный ID!
  date: '2025-10-20',
  url: '.../api/crm/tasks-master-calendar?masterId=6&date=2025-10-20'
}
```

## Важно

### Почему это произошло?

Интерфейс `User` был обновлен с новыми полями:
```typescript
interface User {
  masterId?: number | null;
  administratorId?: number | null;
  branchId?: string | null;
  isActive?: boolean;
  ...
}
```

Но при создании объекта `user` из `userData` эти поля **не присваивались вручную**.

### Почему login() работал?

В функции `login()` используется прямое присваивание:
```typescript
setUser(result.user);  // напрямую из API
```

Поэтому при первом логине все поля попадают в state. Но при перезагрузке страницы:
1. Вызывается `checkAuth()`
2. Получаем данные из `/api/user`
3. Вручную создаем объект `user` ← здесь теряются новые поля!

## Тестирование

1. **Очистите localStorage и cookies:**
   ```javascript
   localStorage.clear();
   document.cookie.split(";").forEach(c => {
     document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
   });
   ```

2. **Залогиньтесь заново** как мастер

3. **Проверьте консоль:**
   - Должны появиться логи с `masterId: 6`
   - Календарь мастера должен загрузиться

4. **Перезагрузите страницу (F5)**
   - `checkAuth()` должен правильно восстановить `masterId`
   - Календарь должен продолжать работать

## Связанные исправления

Это исправление работает вместе с:
- `MASTER_ID_FIX_CRITICAL.md` - убран fallback на user.id
- `MASTER_ID_MIGRATION.md` - поддержка новых полей masterId/administratorId
- `USER_REGISTRATION_FIX.md` - регистрация с правильными ID

## Итог

✅ Новые поля из API теперь попадают в user state  
✅ masterId корректно доступен в компонентах  
✅ Календарь мастера работает после перезагрузки страницы  
✅ Добавлено детальное логирование для отладки
