# Исправление регистрации пользователей - добавление master_id и administrator_id

**Дата:** 20 октября 2025 г.  
**Компонент:** `src/pages/Masters.tsx`  
**API Endpoint:** `POST /api/register-user`

## Проблема

При регистрации новых пользователей через интерфейс не передавались идентификаторы:
- `master_id` для пользователей с ролью `master`
- `administrator_id` для пользователей с ролью `reception`

Согласно требованиям:
- `master_id` должен быть равен `id` мастера из `/api/crm/masters/`
- `administrator_id` должен быть равен `id` администратора из `/api/crm/administrators/`

## Решение

Обновлены все 4 места в `Masters.tsx`, где происходит регистрация пользователей:

### 1. Создание нового мастера (строка ~944)
```typescript
body: JSON.stringify({
  username: newMaster.name,
  email: accountEmail,
  password: accountPassword,
  role: 'master',
  master_id: newMaster.id,  // ✅ ДОБАВЛЕНО
  branchId: currentBranch?.id?.toString(),
  organisationId: currentBranch?.organisationId?.toString()
})
```

### 2. Обновление мастера с созданием аккаунта (строка ~1016)
```typescript
body: JSON.stringify({
  username: updatedMaster.name,
  email: accountEmail,
  password: accountPassword,
  role: 'master',
  master_id: id,  // ✅ ДОБАВЛЕНО - используем id из параметров функции
  branchId: currentBranch?.id?.toString(),
  organisationId: currentBranch?.organisationId?.toString()
})
```

### 3. Создание нового администратора/reception (строка ~1128)
```typescript
body: JSON.stringify({
  username: newAdmin.name,
  email: accountEmail,
  password: accountPassword,
  role: 'reception',
  administrator_id: newAdmin.id,  // ✅ ДОБАВЛЕНО
  branchId: currentBranch?.id?.toString(),
  organisationId: currentBranch?.organisationId?.toString()
})
```

### 4. Обновление администратора с созданием аккаунта (строка ~1185)
```typescript
body: JSON.stringify({
  username: updatedAdmin.name,
  email: accountEmail,
  password: accountPassword,
  role: 'reception',
  administrator_id: id,  // ✅ ДОБАВЛЕНО - используем id из параметров функции
  branchId: currentBranch?.id?.toString(),
  organisationId: currentBranch?.organisationId?.toString()
})
```

## Логика работы

### Для мастеров (role: 'master')
1. Создается запись мастера через `POST /api/crm/masters/{branchId}`
2. Получаем `newMaster.id` из ответа
3. При создании аккаунта передаем `master_id: newMaster.id`

### Для администраторов/reception (role: 'reception')
1. Создается запись администратора через `POST /api/crm/administrators/{branchId}`
2. Получаем `newAdmin.id` из ответа
3. При создании аккаунта передаем `administrator_id: newAdmin.id`

## Пример payload для API

### Master:
```json
{
  "username": "Бексултан",
  "email": "Beksultan2334@gmail.com",
  "password": "killer22",
  "role": "master",
  "master_id": 123,
  "branchId": "1",
  "organisationId": "1"
}
```

### Reception:
```json
{
  "username": "Администратор",
  "email": "admin@example.com",
  "password": "password123",
  "role": "reception",
  "administrator_id": 456,
  "branchId": "1",
  "organisationId": "1"
}
```

## Связь с календарем мастера

Это исправление также решает проблему с календарем мастера:
- При логине пользователь получает `master_id` в своем профиле
- `MasterCalendarView.tsx` использует `user.master_id` для запроса к `/api/crm/tasks-master-calendar`
- Если `master_id` не указан, используется fallback на `user.id`

## Тестирование

1. Создайте нового мастера с аккаунтом
2. Войдите под созданным аккаунтом мастера
3. Проверьте, что `/api/user` возвращает `master_id`
4. Убедитесь, что календарь мастера работает корректно
5. Повторите для администратора/reception

## Связанные файлы

- `src/pages/Masters.tsx` - обновлен
- `src/pages/Calendar/MasterCalendarView.tsx` - использует `master_id`
- `src/contexts/SimpleAuthContext.tsx` - интерфейс `User` содержит `master_id`
