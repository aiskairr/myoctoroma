# Интеграция новых Salary Endpoints

## 📋 Обзор

Добавлены новые endpoints для работы с зарплатами на **Primary Backend** (`VITE_BACKEND_URL`):

1. **GET /salaries** - Получение данных о зарплатах с расчетами
2. **POST /salaries?branchId={branchId}** - Создание новой записи о зарплате

## 🚀 Что было добавлено

### 1. Salary Service (`src/services/salary-service.ts`)

Создан новый сервис для работы с salary endpoints:

```typescript
import { salaryService } from '@/services/salary-service';

// Получить данные о зарплатах
const data = await salaryService.getSalaryData(branchId, startDate, endDate);

// Создать запись о зарплате
const result = await salaryService.createSalaryRecord({
  staff: { id: 4, firstname: 'Камила', lastname: 'Умарова', role: 'manager' },
  baseSalary: 1000,
  commissionRate: 0.1,
  createdBy: { id: 3, firstname: 'Admin', lastname: 'User', role: 'manager' }
});
```

#### Основные методы:

- `getSalaryData(branchId, startDate, endDate)` - получить данные о зарплатах
- `createSalaryRecord(salaryData)` - создать новую запись
- `getEmployeeSalaryData(branchId, staffId, startDate, endDate)` - данные конкретного сотрудника
- `calculateTotalSalary(response)` - общая сумма зарплат
- `calculateTotalPaid(response)` - общая выплаченная сумма
- `calculateTotalRemaining(response)` - общая оставшаяся сумма
- `getUnpaidEmployees(response)` - сотрудники с непогашенными зарплатами
- `formatSalaryDataForTable(data)` - форматирование для таблицы

### 2. Новая страница SalaryPageNew (`src/pages/SalaryPageNew.tsx`)

Полностью новая страница с использованием новых endpoints:

- ✅ Получение данных о зарплатах с расчетами (base_salary, commissions, total, payments, remaining)
- ✅ Создание новой записи о зарплате через Dialog форму
- ✅ Отображение статистики (всего к выплате, выплачено, осталось, количество сотрудников)
- ✅ Детальная таблица с информацией о каждом сотруднике
- ✅ Фильтрация по датам (startDate, endDate)
- ✅ Поддержка мультиязычности через LocaleContext
- ✅ Toast уведомления для всех операций

#### Доступ к новой странице:

**URL**: `/salary-new`

### 3. Обновлен App.tsx

Добавлен новый маршрут:

```typescript
<Route path="/salary-new">
  <ProtectedLayout>
    <SalaryPageNew />
  </ProtectedLayout>
</Route>
```

## 📊 API Endpoints

### GET /salaries

Получить данные о зарплатах для филиала за период с расчетами.

**Query Parameters:**
- `branchId` (required) - ID филиала
- `startDate` (required) - Дата начала (YYYY-MM-DD)
- `endDate` (required) - Дата окончания (YYYY-MM-DD)

**Response (200 OK):**
```json
{
  "data": [
    {
      "staff_id": 4,
      "staff": {
        "first_name": "Kamila",
        "last_name": "Umarova",
        "role": "manager"
      },
      "base_salary": 1000,
      "commission_rate": 0.1,
      "service_sum": 2000,
      "total_salary": 1200,
      "already_paid": 600,
      "remaining_amount": 600,
      "payments_count": 2,
      "payments": [
        {
          "id": 10,
          "period_start": "2025-11-01T00:00:00Z",
          "period_end": "2025-11-07T23:59:59Z",
          "paid_amount": 400,
          "remaining_amount": 800,
          "is_fully_paid": false
        }
      ]
    }
  ],
  "meta": {
    "branch_id": 7,
    "startDate": "2025-11-01",
    "endDate": "2025-11-10",
    "timezone": "Asia/Bishkek"
  }
}
```

**Errors:**
- `400` - Missing or invalid parameters
- `404` - No salary settings found for this branch
- `500` - Internal server error

### POST /salaries

Создать новую запись о зарплате для сотрудника.

**Query Parameters:**
- `branchId` (required) - ID филиала

**Request Body:**
```json
{
  "staff": {
    "id": 4,
    "firstname": "Kamila",
    "lastname": "Umarova",
    "role": "manager"
  },
  "baseSalary": 1000,
  "commissionRate": 0.1,
  "createdBy": {
    "id": 3,
    "firstname": "Admin",
    "lastname": "User",
    "role": "manager"
  }
}
```

**Response (201 Created):**
```json
{
  "id": 15,
  "branch_id": 7,
  "staff_id": 4,
  "staff_snapshot": {
    "first_name": "Kamila",
    "last_name": "Umarova",
    "role": "manager"
  },
  "created_by_snapshot": {
    "first_name": "Admin",
    "role": "manager"
  },
  "base_salary": 1000,
  "commission_rate": 0.1,
  "timezone": "Asia/Bishkek",
  "createdAt": "2025-11-01T10:00:00Z"
}
```

**Errors:**
- `400` - Missing required fields: baseSalary, commissionRate and createdBy
- `500` - Internal server error

## 🔧 Использование в коде

### Пример 1: Получение данных о зарплатах

```typescript
import { salaryService } from '@/services/salary-service';

const fetchSalaryData = async () => {
  const branchId = 7;
  const startDate = '2025-11-01';
  const endDate = '2025-11-10';

  const data = await salaryService.getSalaryData(branchId, startDate, endDate);

  if (data) {
    console.log('Всего к выплате:', salaryService.calculateTotalSalary(data));
    console.log('Выплачено:', salaryService.calculateTotalPaid(data));
    console.log('Осталось:', salaryService.calculateTotalRemaining(data));

    // Непогашенные зарплаты
    const unpaid = salaryService.getUnpaidEmployees(data);
    console.log('Сотрудники с долгами:', unpaid);
  }
};
```

### Пример 2: Создание новой записи

```typescript
import { salaryService } from '@/services/salary-service';

const createNewSalary = async () => {
  const branchId = 7; // ID текущего филиала

  const result = await salaryService.createSalaryRecord({
    staff: {
      id: 5,
      firstname: 'Айгуль',
      lastname: 'Токтогулова',
      role: 'master'
    },
    baseSalary: 1500,
    commissionRate: 0.15,
    createdBy: {
      id: user.id,
      firstname: user.firstname,
      lastname: user.lastname,
      role: user.role
    }
  }, branchId);

  if (result) {
    console.log('Запись создана:', result);
  }
};
```

### Пример 3: Форматирование для таблицы

```typescript
import { salaryService } from '@/services/salary-service';

const data = await salaryService.getSalaryData(7, '2025-11-01', '2025-11-10');

if (data) {
  data.data.forEach(employee => {
    const formatted = salaryService.formatSalaryDataForTable(employee);
    console.log(formatted);
    // {
    //   id: 4,
    //   name: "Kamila Umarova",
    //   role: "manager",
    //   baseSalary: 1000,
    //   commissionRate: "10.0%",
    //   serviceSum: 2000,
    //   totalSalary: 1200,
    //   alreadyPaid: 600,
    //   remaining: 600,
    //   paymentsCount: 2,
    //   isFullyPaid: false
    // }
  });
}
```

## 📱 Интерфейс

### Новая страница SalaryPageNew включает:

1. **Header с фильтрами дат**
   - Выбор периода (startDate - endDate)
   - Кнопка "Добавить сотрудника"

2. **Карточки статистики**
   - Всего к выплате
   - Выплачено
   - Осталось выплатить
   - Количество сотрудников

3. **Таблица с данными**
   - Сотрудник (ФИО)
   - Роль
   - Базовая зарплата
   - Процент комиссии
   - Сумма услуг
   - Итого зарплата
   - Выплачено
   - Осталось
   - Количество выплат

4. **Dialog форма создания**
   - ID сотрудника
   - Имя и Фамилия
   - Роль
   - Базовая зарплата
   - Процент комиссии

5. **Метаданные**
   - ID филиала
   - Часовой пояс
   - Период

## 🎨 Преимущества новых endpoints

### По сравнению со старыми endpoints (`/api/salaries`):

✅ **Автоматические расчеты на бэкенде**
- Сумма услуг (service_sum)
- Итоговая зарплата (total_salary)
- Выплаченная сумма (already_paid)
- Оставшаяся сумма (remaining_amount)

✅ **История выплат**
- Детальная информация о каждой выплате
- Периоды выплат
- Статус оплаты

✅ **Метаданные**
- Часовой пояс
- ID филиала
- Период запроса

✅ **Меньше запросов к API**
- Один запрос вместо трех (salaries + accounting + payments)
- Все данные в одном ответе

## 🔀 Миграция со старого API

### Старый способ:

```typescript
// 3 отдельных запроса
const salaries = await fetch('/api/salaries?branchId=7');
const accounting = await fetch('/api/accounting/period?startDate=...&endDate=...');
const payments = await fetch('/api/salary-payments?branchId=7&startDate=...&endDate=...');

// Ручной расчет зарплаты
const totalSalary = calculateSalary(salary, accounting);
const totalPaid = getTotalPaidAmount(salary, payments);
const remaining = totalSalary - totalPaid;
```

### Новый способ:

```typescript
// 1 запрос с готовыми расчетами
const data = await salaryService.getSalaryData(7, '2025-11-01', '2025-11-10');

// Данные уже рассчитаны
data.data.forEach(employee => {
  console.log(employee.total_salary);      // Готово
  console.log(employee.already_paid);      // Готово
  console.log(employee.remaining_amount);  // Готово
});
```

## 🧪 Тестирование

### Проверка GET /salaries

```bash
curl -X 'GET' \
  'http://localhost:8000/salaries?branchId=7&startDate=2025-11-01&endDate=2025-11-10' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

### Проверка POST /salaries

```bash
curl -X 'POST' \
  'http://localhost:8000/salaries?branchId=7' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -d '{
  "staff": {
    "id": 4,
    "firstname": "Kamila",
    "lastname": "Umarova",
    "role": "manager"
  },
  "baseSalary": 1000,
  "commissionRate": 0.1,
  "createdBy": {
    "id": 3,
    "firstname": "Admin",
    "lastname": "User",
    "role": "manager"
  }
}'
```

## 📝 TypeScript типы

Все типы экспортированы из `salary-service.ts`:

```typescript
import type {
  SalaryData,
  SalaryResponse,
  CreateSalaryRequest,
  CreateSalaryResponse,
  StaffInfo,
  PaymentInfo,
} from '@/services/salary-service';
```

## 🔒 Безопасность

- ✅ Endpoints защищены аутентификацией (Bearer Token)
- ✅ Проверка branchId на уровне API
- ✅ Валидация всех обязательных полей
- ✅ Sanitization данных перед отправкой

## 📚 Дальнейшие шаги

1. Протестировать новую страницу `/salary-new`
2. Убедиться, что бэкенд возвращает корректные данные
3. При необходимости добавить новые функции в `salary-service.ts`
4. Постепенно мигрировать с `/salary` на `/salary-new`
5. После полной миграции удалить старую страницу `SalaryPage.tsx`

## 🐛 Troubleshooting

### Проблема: Получаю 400 ошибку "Specify the date range"

**Решение:** Убедитесь, что передаете `startDate` и `endDate` в формате `YYYY-MM-DD`

### Проблема: Получаю 404 ошибку "No salary settings found"

**Решение:** В базе данных нет записей о зарплате для этого филиала. Создайте запись через POST /salary

### Проблема: commission_rate отображается неправильно

**Решение:** API ожидает число от 0 до 1 (0.1 = 10%). Используйте `(rate * 100).toFixed(1) + '%'` для отображения

### Проблема: Дублирование данных при изменении дат

**Решение:** Используйте `useEffect` с зависимостями `[startDate, endDate, currentBranch]`

## ✅ Чек-лист интеграции

- [x] Создан `salary-service.ts`
- [x] Создана страница `SalaryPageNew.tsx`
- [x] Добавлен маршрут `/salary-new` в `App.tsx`
- [x] Исправлены TypeScript ошибки
- [x] Добавлены type imports
- [ ] Протестирована работа GET /salary
- [ ] Протестирована работа POST /salary
- [ ] Проверена работа на production backend
- [ ] Добавлена локализация для новых текстов
- [ ] Обновлен Sidebar с ссылкой на новую страницу (опционально)

---

**Автор**: Claude Code
**Дата**: 2025-11-13
**Версия**: 1.0.0
