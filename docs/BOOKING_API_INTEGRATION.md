# 📚 Интеграция Booking API

## Обзор

Полная интеграция новых booking endpoints для создания записей клиентов без аккаунта через публичную страницу бронирования.

---

## 🎯 Интегрированные эндпоинты

### 1. **Organizations (Организации)**

#### GET `/booking/organizations`
Получить список всех организаций

**Query параметры:**
- `ownerId` (опционально) - ID владельца
- `name` (опционально) - поиск по имени

**Ответ:**
```json
[
  {
    "id": 1,
    "name": "Салон красоты",
    "user_id": 5,
    "branches": 3,
    "paidDate": "2025-12-31",
    "isActive": true
  }
]
```

#### GET `/booking/organizations/{id}`
Получить организацию по ID

---

### 2. **Branches (Филиалы)**

#### GET `/booking/branches`
Получить список филиалов организации

**Query параметры:**
- `organizationId` (обязательно) - ID организации
- `name` (опционально) - поиск по имени

**Ответ:**
```json
[
  {
    "id": 1,
    "organization_id": 2,
    "name": "Main Office",
    "phone": "+996700000001",
    "address": "ул. Ленина, 1",
    "timezone": "Asia/Bishkek",
    "isActive": true
  }
]
```

#### GET `/booking/branches/{branchId}`
Получить филиал по ID

---

### 3. **Staff (Сотрудники)**

#### GET `/booking/staff`
Получить список сотрудников

**Query параметры:**
- `organizationId` (обязательно если нет branchId)
- `branchId` (опционально)
- `role` (опционально) - `manager` или `employee`

**Ответ:**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": 1,
      "organization": { "id": 2, "name": "Салон" },
      "branches": [
        { "id": 1, "name": "Филиал 1", "address": "ул. Ленина, 1" }
      ],
      "firstname": "Иван",
      "lastname": "Петров",
      "username": "ivan",
      "email": "ivan@example.com",
      "role": "employee",
      "specialty": "Парикмахер",
      "is_active": true,
      "photo_url": "https://..."
    }
  ]
}
```

---

### 4. **Guest Token (Гостевой токен)**

#### GET `/booking/auth/{organizationId}`
Получить одноразовый гостевой токен для доступа к тенантной БД

**Ответ:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI..."
}
```

**Использование:**
Токен автоматически сохраняется в `localStorage.guest_token` и используется для всех последующих запросов к booking API.

---

### 5. **Assignments (Записи)**

#### POST `/booking/assignments`
Создать новую запись клиента

**Request Body:**
```json
{
  "organizationId": 1,
  "branchId": 2,
  "client": {
    "id": "optional-client-id",
    "firstname": "Анна",
    "phoneNumber": "+996700123456"
  },
  "employeeId": 5,
  "assignmentDate": "2025-11-27",
  "startTime": "14:00",
  "endTime": "15:30",
  "notes": "Источник: Instagram",
  "source": "web",
  "discount": 0,
  "paid": "unpaid",
  "service": {
    "id": 10,
    "name": "Стрижка",
    "price": 500,
    "duration": 90
  },
  "additionalServices": []
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "organization_id": 1,
    "branch_id": 2,
    "client_id": "456",
    "employee_id": 5,
    "client_snapshot": {
      "first_name": "Анна",
      "phone_number": "+996700123456"
    },
    "employee_snapshot": {
      "first_name": "Иван",
      "last_name": "Петров",
      "role": "employee"
    },
    "service_snapshot": {
      "id": 10,
      "name": "Стрижка",
      "price": 500,
      "duration": 90
    },
    "assignment_date": "2025-11-27T00:00:00.000Z",
    "start_time": "14:00",
    "end_time": "15:30",
    "status": "new",
    "paid": "unpaid",
    "final_price": 500,
    "total_duration": 90,
    "timezone": "Asia/Bishkek",
    "notes": "Источник: Instagram",
    "createdAt": "2025-11-27T09:22:43.904Z",
    "updatedAt": "2025-11-27T09:22:43.904Z"
  },
  "message": "Assignment created successfully"
}
```

**Error Responses:**
- **400** - Ошибка валидации
- **404** - Не найдены организация/филиал/клиент/сотрудник
- **409** - Конфликт по времени (сотрудник занят)
- **500** - Ошибка сервера

---

## 📦 Структура проекта

### Созданные файлы:

#### `src/services/booking-service.ts`
Сервис для работы с booking API. Включает:

**Типы данных:**
- `Organization` - организация
- `Branch` - филиал
- `StaffMember` - сотрудник
- `CreateAssignmentRequest` - запрос на создание записи
- `CreateAssignmentResponse` - ответ при создании записи
- `GuestTokenResponse` - гостевой токен

**Функции:**
- `getOrganizations(ownerId?, name?)` - список организаций
- `getOrganizationById(id)` - организация по ID
- `getBranches(organizationId, name?)` - список филиалов
- `getBranchById(branchId)` - филиал по ID
- `getStaff(organizationId?, branchId?, role?)` - список сотрудников
- `getGuestToken(organizationId)` - получить гостевой токен
- `createAssignment(assignment)` - создать запись
- `getStaffFullName(staff)` - полное имя сотрудника
- `isBranchActive(branch)` - проверка активности филиала
- `isOrganizationActive(org)` - проверка активности организации
- `formatDateForBookingAPI(date)` - форматировать дату (YYYY-MM-DD)
- `formatTimeForBookingAPI(date)` - форматировать время (HH:mm)

---

## 🔧 Изменения в существующих файлах

### `src/lib/api.ts`
Добавлен роутинг для `/booking/*` эндпоинтов:

```typescript
// Строка 65
else if (endpoint.startsWith('/booking')) {
  baseUrl = SECONDARY_API_BASE_URL;
}
```

Все запросы к `/booking/*` теперь идут на `VITE_SECONDARY_BACKEND_URL`.

---

### `src/pages/Booking.tsx`

#### 1. Импорты
```typescript
import * as BookingService from '@/services/booking-service';
```

#### 2. Получение гостевого токена при загрузке
```typescript
useEffect(() => {
  const fetchGuestToken = async () => {
    const tokenResponse = await BookingService.getGuestToken(Number(organisationId));
    localStorage.setItem('guest_token', tokenResponse.token);
  };

  if (organisationId) {
    fetchGuestToken();
  }
}, [organisationId]);
```

#### 3. Обновленные функции

**getOrganisationBranches:**
```typescript
const getOrganisationBranches = async (organisationId: string) => {
  const branches = await BookingService.getBranches(Number(organisationId));
  return {
    branches: branches.map(branch => ({
      id: branch.id.toString(),
      branches: branch.name,
      name: branch.name,
      address: branch.address,
      // ...
    }))
  };
};
```

**getMasters:**
```typescript
const getMasters = async (branchId: string) => {
  const response = await BookingService.getStaff(undefined, branchId);
  return response.data.map(staff => ({
    id: staff.id,
    name: BookingService.getStaffFullName(staff),
    specialty: staff.specialty,
    // ...
  }));
};
```

**submitBooking:**
```typescript
const submitBooking = async () => {
  const assignmentPayload: BookingService.CreateAssignmentRequest = {
    organizationId: Number(organisationId),
    branchId: Number(bookingData.branch),
    client: {
      firstname: bookingData.name,
      phoneNumber: bookingData.phone
    },
    employeeId: Number(bookingData.masterId),
    assignmentDate: BookingService.formatDateForBookingAPI(selectedDate),
    startTime: bookingData.time || '00:00',
    endTime: /* вычисленное время окончания */,
    service: {
      id: Number(bookingData.serviceId),
      name: '',
      price: bookingData.servicePrice || 0,
      duration: bookingData.serviceDuration || 60
    },
    notes: trackingInfo.notesText || undefined,
    source: trackingInfo.trackingSource || 'web',
    paid: 'unpaid'
  };

  const response = await BookingService.createAssignment(assignmentPayload);
};
```

---

## 🚀 Как использовать

### 1. Открыть страницу бронирования

```
http://localhost:5173/booking?organisationId=1
```

### 2. Процесс бронирования

1. **Выбор филиала** - GET `/booking/branches?organizationId=1`
2. **Выбор услуги** - старый endpoint (пока не изменен)
3. **Выбор даты** - старый endpoint (пока не изменен)
4. **Выбор мастера** - GET `/booking/staff?branchId=1`
5. **Выбор времени** - старый endpoint (пока не изменен)
6. **Ввод контактов** - локальная валидация
7. **Создание записи** - POST `/booking/assignments`

### 3. Гостевой токен

Токен автоматически получается при загрузке страницы и сохраняется в `localStorage.guest_token`. Используется для доступа к тенантной базе данных организации.

---

## 📝 Примеры использования

### Получить филиалы организации

```typescript
import * as BookingService from '@/services/booking-service';

const branches = await BookingService.getBranches(1);
console.log(branches); // Array<Branch>
```

### Получить сотрудников филиала

```typescript
const staffList = await BookingService.getStaff(undefined, '1');
console.log(staffList.data); // Array<StaffMember>
```

### Создать запись

```typescript
const assignment = await BookingService.createAssignment({
  organizationId: 1,
  branchId: 2,
  client: {
    firstname: "Анна",
    phoneNumber: "+996700123456"
  },
  employeeId: 5,
  assignmentDate: "2025-11-27",
  startTime: "14:00",
  endTime: "15:30",
  service: {
    id: 10,
    name: "Стрижка",
    price: 500,
    duration: 90
  },
  paid: "unpaid"
});

console.log(assignment.data.id); // ID созданной записи
```

---

## ⚠️ Важные замечания

### 1. Старые эндпоинты
Следующие функции пока используют старые эндпоинты:
- `getServices()` - получение списка услуг
- `getMasterWorkingDates()` - рабочие даты мастеров
- `getAvailableTimeSlots()` - доступные временные слоты
- `getMasterDetails()` - детали мастера

Эти эндпоинты будут заменены по мере добавления новых booking API.

### 2. Формат данных
Функции-адаптеры (`getOrganisationBranches`, `getMasters`) преобразуют новый формат API в старый для совместимости с существующим UI кодом.

### 3. Гостевой токен
Токен получается один раз при загрузке страницы. Если страница перезагружается, токен получается заново.

### 4. Обработка ошибок
Все функции booking-service используют `apiGetJson` и `apiPostJson` из `lib/api.ts`, которые автоматически:
- Добавляют Bearer токен из localStorage
- Обрабатывают 401 ошибки
- Пытаются обновить токен при необходимости
- Логируют все запросы

---

## 🧪 Тестирование

### Чеклист для тестирования

- [ ] **Загрузка страницы**
  - Открыть `/booking?organisationId=1`
  - В Console должно быть: `🔑 Fetching guest token for organization: 1`
  - В Console должно быть: `✅ Guest token received and saved`
  - В localStorage должен быть `guest_token`

- [ ] **Выбор филиала**
  - Должен отобразиться список филиалов
  - В Network tab: `GET /booking/branches?organizationId=1`
  - Статус: 200

- [ ] **Выбор мастера**
  - Должен отобразиться список мастеров для выбранной даты
  - В Network tab: `GET /booking/staff?branchId=1`
  - Статус: 200

- [ ] **Создание записи**
  - Заполнить имя и телефон
  - Нажать "Создать запись"
  - В Console: `📝 Creating assignment with payload:`
  - В Network tab: `POST /booking/assignments`
  - Статус: 200
  - В Console: `✅ Assignment created:`
  - Toast: "Запись создана"

### Проверка ошибок

- [ ] **Без organizationId**
  - Открыть `/booking` (без параметра)
  - Должна показаться ошибка: "Не указан идентификатор организации"

- [ ] **Неверный organizationId**
  - Открыть `/booking?organisationId=9999`
  - Должна показаться ошибка токена: "Ошибка авторизации"

- [ ] **Конфликт времени**
  - Попытаться создать запись на занятое время
  - Должна вернуться ошибка 409

---

## 🔍 Логирование

Все booking функции логируют свою работу:

```
🔑 Fetching guest token for organization: 1
✅ Guest token received and saved

🌐 API Request: {
  method: 'GET',
  url: 'https://api.example.com/booking/branches?organizationId=1',
  hasAuth: true,
  ...
}

📝 Creating assignment with payload: {...}
📌 Tracking info: { source: 'Instagram', parameters: {...} }
✅ Assignment created: { id: 123, ... }
```

---

## 📊 Статус интеграции

### ✅ Завершено

- [x] Создан `booking-service.ts` со всеми типами и функциями
- [x] Добавлен роутинг `/booking/*` в `lib/api.ts`
- [x] Интегрирован `GET /booking/branches`
- [x] Интегрирован `GET /booking/staff`
- [x] Интегрирован `POST /booking/assignments`
- [x] Интегрирован `GET /booking/auth/{organizationId}`
- [x] Обновлен `Booking.tsx` для использования новых эндпоинтов
- [x] Добавлено автоматическое получение гостевого токена

### 🚧 В процессе / Планируется

- [ ] Интеграция services endpoints (если будут добавлены)
- [ ] Интеграция working dates endpoints (если будут добавлены)
- [ ] Интеграция available slots endpoints (если будут добавлены)
- [ ] Полное тестирование всех сценариев
- [ ] Обработка edge cases

---

## 📞 Поддержка

Если возникли вопросы или проблемы:

1. Проверьте Console в DevTools на наличие ошибок
2. Проверьте Network tab для просмотра API запросов
3. Убедитесь, что `VITE_SECONDARY_BACKEND_URL` настроен в `.env`
4. Проверьте, что токен сохранен в `localStorage.guest_token`

---

**Дата создания:** 2025-11-27
**Версия:** 1.0
**Статус:** ✅ Готово к тестированию
