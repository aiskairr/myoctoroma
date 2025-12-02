# Интеграция обновления сотрудников через PATCH /staff/{id}

## 📋 Обзор

Добавлена логика обновления мастеров и администраторов на странице `/crm/masters` через новый endpoint **PATCH /staff/{id}** (Secondary Backend).

## 🔄 Что изменилось

### До:
- Использовались старые endpoints:
  - `PUT /api/crm/masters/{id}` для мастеров
  - `PUT /api/administrators/{id}` для администраторов
- Отдельная логика для создания/обновления user accounts

### После:
- Единый endpoint для всех типов сотрудников:
  - `PATCH /staff/{id}` (Secondary Backend)
- Упрощенная логика обновления
- Автоматический маппинг полей

## 🚀 API Endpoint

### PATCH /staff/{id}

**URL**: `${VITE_SECONDARY_BACKEND_URL}/staff/{id}`

**Method**: `PATCH`

**Headers**:
```typescript
{
  'Content-Type': 'application/json',
  'Authorization': 'Bearer {token}'
}
```

**Request Body** (частичное обновление):
```typescript
{
  username?: string;
  firstname?: string;
  lastname?: string;
  email?: string;
  role?: "manager" | "employee";
  customRole?: string;
  specialty?: string;
  description?: string;
  is_active?: boolean;
  photoUrl?: string;
}
```

**Response (200 OK)**:
```typescript
{
  success: true,
  message: "Staff member updated successfully",
  data: {
    id: number;
    username: string;
    firstname: string;
    lastname: string;
    email: string;
    role: string;
    customRole?: string;
    specialty?: string;
    description?: string;
    isActive: boolean;
    is_active: boolean;
    photoUrl?: string;
    photo_url?: string;
    organization: {};
    branches: [];
    createdAt: string;
    updatedAt: string;
  }
}
```

## 🔧 Обновленные Mutations

### 1. updateMasterMutation

**Файл**: `src/pages/Masters.tsx:1775`

**Изменения**:
```typescript
const updateMasterMutation = useMutation({
  mutationFn: async ({ id, data }: { id: number, data: Partial<Master> }) => {
    const { workingDates, createAccount, accountEmail, accountPassword, baseSalary, commissionRate, ...masterData } = data;

    // Подготовка данных для обновления
    const staffUpdatePayload: any = {};

    // Маппинг полей: name -> firstname/lastname
    if (masterData.name) {
      const nameParts = masterData.name.split(' ');
      staffUpdatePayload.firstname = nameParts[0] || '';
      staffUpdatePayload.lastname = nameParts.slice(1).join(' ') || '';
      staffUpdatePayload.username = masterData.name;
    }

    // Остальные поля
    if (masterData.specialty !== undefined) staffUpdatePayload.specialty = masterData.specialty;
    if (masterData.description !== undefined) staffUpdatePayload.description = masterData.description;
    if (masterData.isActive !== undefined) staffUpdatePayload.is_active = masterData.isActive;
    if (accountEmail) staffUpdatePayload.email = accountEmail;

    // PATCH запрос
    const res = await fetch(`${VITE_SECONDARY_BACKEND_URL}/staff/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      },
      body: JSON.stringify(staffUpdatePayload)
    });

    // ... обработка ответа и рабочих дат

    return { updatedStaff, baseSalary, commissionRate };
  },
  onSuccess: (result) => {
    // Уведомление об успехе
    toast({ title: 'Мастер обновлен' });
    refetch();

    // Логирование изменений зарплаты
    if (result.baseSalary || result.commissionRate) {
      console.log('💰 Salary data changed:', { baseSalary, commissionRate });
    }
  }
});
```

### 2. updateAdministratorMutation

**Файл**: `src/pages/Masters.tsx:2012`

**Изменения**:
```typescript
const updateAdministratorMutation = useMutation({
  mutationFn: async ({ id, data }: { id: number, data: Partial<Administrator> }) => {
    const { createAccount, accountEmail, accountPassword, baseSalary, commissionRate, ...adminData } = data;

    // Подготовка данных для обновления
    const staffUpdatePayload: any = {};

    // Маппинг полей: name -> firstname/lastname
    if (adminData.name) {
      const nameParts = adminData.name.split(' ');
      staffUpdatePayload.firstname = nameParts[0] || '';
      staffUpdatePayload.lastname = nameParts.slice(1).join(' ') || '';
      staffUpdatePayload.username = adminData.name;
    }

    // Остальные поля
    if (adminData.notes !== undefined) staffUpdatePayload.description = adminData.notes;
    if (adminData.isActive !== undefined) staffUpdatePayload.is_active = adminData.isActive;
    if (accountEmail) staffUpdatePayload.email = accountEmail;
    if (adminData.role !== undefined) staffUpdatePayload.customRole = adminData.role;

    // PATCH запрос
    const res = await fetch(`${VITE_SECONDARY_BACKEND_URL}/staff/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      },
      body: JSON.stringify(staffUpdatePayload)
    });

    // ... обработка ответа

    return { updatedStaff, baseSalary, commissionRate };
  },
  onSuccess: (result) => {
    toast({ title: 'Администратор обновлен' });
    refetchAdministrators();
  }
});
```

## 📊 Маппинг полей

### Мастер (Master):
| Поле формы | API поле | Описание |
|------------|----------|----------|
| `name` | `firstname` + `lastname` + `username` | Разбивается по пробелу |
| `specialty` | `specialty` | Специализация мастера |
| `description` | `description` | Описание |
| `isActive` | `is_active` | Активен ли сотрудник |
| `accountEmail` | `email` | Email для входа |
| `baseSalary` | - | Только логируется |
| `commissionRate` | - | Только логируется |

### Администратор (Administrator):
| Поле формы | API поле | Описание |
|------------|----------|----------|
| `name` | `firstname` + `lastname` + `username` | Разбивается по пробелу |
| `notes` | `description` | Заметки |
| `role` | `customRole` | Роль администратора |
| `isActive` | `is_active` | Активен ли сотрудник |
| `accountEmail` | `email` | Email для входа |
| `baseSalary` | - | Только логируется |
| `commissionRate` | - | Только логируется |

## 💡 Особенности реализации

### 1. Частичное обновление
Отправляются только измененные поля:
```typescript
const staffUpdatePayload: any = {};

if (masterData.name) staffUpdatePayload.firstname = ...;
if (masterData.specialty !== undefined) staffUpdatePayload.specialty = ...;
// И т.д.
```

### 2. Маппинг полей name
Поле `name` из формы разбивается на:
- `firstname` - первое слово
- `lastname` - остальные слова
- `username` - полное имя

```typescript
if (masterData.name) {
  const nameParts = masterData.name.split(' ');
  staffUpdatePayload.firstname = nameParts[0] || '';
  staffUpdatePayload.lastname = nameParts.slice(1).join(' ') || '';
  staffUpdatePayload.username = masterData.name;
}
```

### 3. Обработка ответа
API возвращает объект с `success` и `data`:
```typescript
const response = await res.json();
const updatedStaff = response.success ? response.data : response;
```

### 4. Зарплата
`baseSalary` и `commissionRate` пока **только логируются**:
```typescript
if (baseSalary !== undefined || commissionRate !== undefined) {
  console.log('💰 Salary data changed:', { baseSalary, commissionRate });
  console.log('ℹ️ Note: Salary update endpoint not available yet.');
}
```

> **TODO**: Добавить endpoint для обновления salary record когда будет доступен на бэкенде.

### 5. Рабочие даты (только для мастеров)
Рабочие даты обновляются отдельно:
1. Удаляются все существующие рабочие даты
2. Добавляются новые рабочие даты

```typescript
if (workingDates) {
  // Удаление старых
  const allWorkingDates = await fetch('/working-dates').then(r => r.json());
  await Promise.all(allWorkingDates.map(wd =>
    fetch(`/working-dates/${wd.id}`, { method: 'DELETE' })
  ));

  // Добавление новых
  await Promise.all(workingDates.map(wd =>
    fetch('/working-dates/', {
      method: 'POST',
      body: JSON.stringify({
        workDate: wd.date,
        startTime: wd.startTime,
        endTime: wd.endTime,
        branchId: wd.branchId
      })
    })
  ));
}
```

## ✅ Преимущества нового подхода

1. **Единый endpoint** - одна точка для всех типов сотрудников
2. **Частичное обновление** - отправляются только измененные поля
3. **Упрощенная логика** - меньше запросов, проще код
4. **Лучшая обработка ошибок** - детальные сообщения от API
5. **Авторизация** - Bearer token в каждом запросе

## 🧪 Тестирование

### Обновление мастера:
1. Перейдите на `/crm/masters`
2. Найдите мастера и нажмите кнопку редактирования
3. Измените любое поле (имя, специализацию, зарплату)
4. Нажмите "Сохранить"
5. Проверьте что изменения применились

### Обновление администратора:
1. Перейдите на `/crm/masters`
2. Переключитесь на вкладку "Администраторы"
3. Найдите администратора и нажмите кнопку редактирования
4. Измените любое поле
5. Нажмите "Сохранить"
6. Проверьте что изменения применились

### Проверка в консоли:
```typescript
// При обновлении зарплаты увидите:
💰 Salary data changed: { baseSalary: 15000, commissionRate: 0.1 }
ℹ️ Note: Salary update endpoint not available yet. Please update salary manually on /salary page.
```

## 🐛 Возможные ошибки

### 400 Bad Request
```json
{
  "message": "Validation error",
  "errors": [...]
}
```
**Причина**: Неверный формат данных

**Решение**: Проверьте что все поля соответствуют типам API

### 401 Unauthorized
```json
{
  "message": "Unauthorized"
}
```
**Причина**: Отсутствует или невалиден Bearer token

**Решение**: Проверьте что токен сохранен в localStorage

### 404 Not Found
```json
{
  "message": "Staff member not found"
}
```
**Причина**: Сотрудник с таким ID не существует

**Решение**: Проверьте что ID корректен

### 500 Internal Server Error
**Причина**: Ошибка на сервере

**Решение**: Проверьте логи бэкенда

## 📝 Будущие улучшения

1. **Добавить endpoint для обновления salary**
   - `PATCH /salary/{staff_id}`
   - Автоматически обновлять зарплату при изменении

2. **Оптимизировать обновление рабочих дат**
   - Использовать bulk update вместо удаления и создания заново

3. **Добавить валидацию на фронтенде**
   - Проверка email формата
   - Проверка что имя не пустое

4. **История изменений**
   - Логировать кто и когда обновил сотрудника

## ✨ Связанные файлы

- `src/pages/Masters.tsx` - основной файл с логикой
- `src/services/salary-service.ts` - сервис для зарплат
- `docs/NEW_SALARY_ENDPOINTS_INTEGRATION.md` - документация по salary

---

**Автор**: Claude Code
**Дата**: 2025-11-13
**Версия**: 1.0.0
