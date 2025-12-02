# Интеграция нового API для отчетов (Reports)

## 🎯 Обзор

Интегрирован новый API для работы с ежедневными кассовыми отчетами на `VITE_BACKEND_URL`.

## 📡 Новые Endpoints

### 1. GET /reports
Получить отчеты для филиала за дату

**URL**: `GET /reports?branchId={branchId}&date={YYYY-MM-DD}`

**Query Parameters**:
- `branchId` (required) - ID филиала
- `date` (required) - Дата в формате YYYY-MM-DD

**Response**:
```json
[
  {
    "id": 1,
    "date": "2025-10-28T00:00:00.000Z",
    "branch_id": 3,
    "issued_by_id": 12,
    "issued_by": {
      "id": 12,
      "fist_name": "John",
      "last_name": "Doe",
      "role": "Manager"
    },
    "start_balance": 100000,
    "end_balance": 120000,
    "total_revenue": 50000,
    "total_income": 40000,
    "expenses_total": 10000,
    "expenses_detail": [...],
    "accounting_details": [...],
    "cash_collection": 20000,
    "cash_payments": 30000,
    "card_payments": 15000,
    "transfer_payments": 20000,
    "gift_certificate_payments": 5000,
    "bank_payments": [
      {
        "bank_name": "Optima Bank",
        "amount": 35000
      }
    ],
    "salary_payments": 15000,
    "timezone": "Asia/Bishkek",
    "status": "unconfirmed",
    "createdAt": "2025-10-28T10:00:00.000Z",
    "updatedAt": "2025-10-28T12:00:00.000Z"
  }
]
```

### 2. GET /reports/{id}
Получить отчет по ID

**URL**: `GET /reports/{id}`

**Response**: Объект отчета (та же структура)

## 🆕 Новые файлы

### `/src/services/report-service.ts`
Новый сервис для работы с API отчетов.

**Основные методы**:

```typescript
// Получить отчеты за дату
reportService.getReports(branchId: number, date: string)

// Получить отчет по ID
reportService.getReportById(id: number)

// Конвертировать тыйыны в сомы
reportService.convertToSom(tyiyn: number)

// Форматировать отчет для отображения (конвертация в сомы)
reportService.formatReportForDisplay(report: DailyCashReport)

// Вычислить общую сумму банковских платежей
reportService.calculateTotalBankPayments(report: DailyCashReport)

// Получить платеж по конкретному банку
reportService.getBankPaymentByName(report: DailyCashReport, bankName: string)

// Вычислить итоги по массиву отчетов
reportService.calculateTotals(reports: DailyCashReport[])
```

## 📝 Изменения в ReportPage.tsx

### Изменено:

1. **Импорты**:
```typescript
import { reportService, DailyCashReport } from '@/services/report-service';
```

2. **State**:
- Заменено `startDate` и `endDate` на `selectedDate` (работа с одной датой)
- Добавлено `currentBranch` из контекста

3. **fetchReports функция**:
```typescript
const fetchReports = async () => {
  const branchId = currentBranch?.id || (selectedBranch ? parseInt(selectedBranch) : 0);
  const data = await reportService.getReports(branchId, selectedDate);

  if (data) {
    // Конвертируем тыйыны в сомы
    const formattedReports = data.map(report =>
      reportService.formatReportForDisplay(report)
    );
    setReports(formattedReports);
  }
};
```

4. **calculateTotals функция**:
Теперь использует `reportService.calculateTotals(reports)`

5. **UI изменения**:
- Вместо диапазона дат (startDate - endDate) теперь выбор одной даты
- Кнопка "Текущий месяц" заменена на "Сегодня"
- Таблица упрощена:
  - Удалены отдельные колонки для каждого банка
  - Добавлена одна колонка "Банки" с суммой всех банковских платежей
  - Добавлена колонка "ID"
  - Добавлена колонка "Составил" (issued_by)
  - Добавлена колонка "Статус" (confirmed/unconfirmed)

### Новая структура таблицы:

| ID | Составил | Выручка | Расходы | Доход | Остаток | Банки | Инкассация | Зарплата | Статус |
|----|----------|---------|---------|-------|---------|-------|------------|----------|--------|

## 💱 Конвертация валюты

**Важно**: API возвращает все финансовые значения в **тыйынах** (1 сом = 100 тыйын).

Автоматическая конвертация в сомы применяется для:
- `start_balance`
- `end_balance`
- `total_revenue`
- `total_income`
- `expenses_total`
- `cash_collection`
- `cash_payments`
- `card_payments`
- `transfer_payments`
- `gift_certificate_payments`
- `salary_payments`
- Все элементы в `expenses_detail[]`
- Все элементы в `accounting_details[]`
- Все элементы в `bank_payments[]`

Конвертация: `Math.round(tyiyn / 100)`

## 🔄 Отличия от старого API

### Старое API:
- Отдельные поля для каждого банка:
  - `optima_payments`
  - `mbank_payments`
  - `mbusiness_payments`
  - `demir_payments`
  - `bakai_payments`
  - `obank_payments`
- Поле `petty_expenses`
- Поле `admin_name` (строка)
- Диапазон дат (startDate - endDate)

### Новое API:
- `bank_payments[]` - массив объектов:
  ```typescript
  {
    bank_name: string,
    amount: number
  }
  ```
- Поле `expenses_total`
- Объект `issued_by`:
  ```typescript
  {
    id: number,
    fist_name: string,  // Опечатка в API
    last_name: string,
    role: string
  }
  ```
- Работа с одной датой
- Добавлен `status` (confirmed/unconfirmed)
- Добавлены детализированные массивы:
  - `expenses_detail[]`
  - `accounting_details[]`

## 🐛 Известные проблемы

### Опечатка в API
В объекте `issued_by` поле называется `fist_name` вместо `first_name`.

**Обходное решение**: Используем `fist_name` как есть в коде.

## 🧪 Тестирование

### Проверка работы:

1. Откройте страницу `/reports`
2. Выберите филиал
3. Выберите дату
4. Проверьте консоль браузера:
   ```
   🔍 Fetching reports: { url: "...", branchId: 7, date: "2025-11-14" }
   ✅ Reports loaded: [...]
   ✅ Reports loaded and formatted: [...]
   ```
5. Убедитесь что данные отображаются в таблице
6. Проверьте что суммы в сомах (а не тыйынах)
7. Проверьте что банковские платежи суммируются правильно

### Возможные ошибки:

**400 Bad Request**:
- Проверьте что `branchId` и `date` передаются корректно

**401 Unauthorized**:
- Проверьте токен в localStorage: `localStorage.getItem('auth_token')`

**404 Not Found**:
- Нет отчетов за эту дату для данного филиала

**No organization in token**:
- Эта ошибка относится к другому endpoint (salaries), не к reports

## 📊 Использование в компонентах

```typescript
import { reportService, DailyCashReport } from '@/services/report-service';

// Получить отчеты
const reports = await reportService.getReports(branchId, '2025-11-14');

// Форматировать для отображения (конвертация в сомы)
const formatted = reports.map(r => reportService.formatReportForDisplay(r));

// Вычислить итоги
const totals = reportService.calculateTotals(formatted);
console.log('Общая выручка:', totals.total_revenue);
console.log('Банковские платежи:', totals.bank_payments_total);
console.log('По банкам:', totals.bank_payments_by_name);

// Получить платеж по конкретному банку
const optimaPayment = reportService.getBankPaymentByName(report, 'Optima Bank');
```

## ✅ Преимущества

1. **Детализация**: Больше информации о каждом отчете
2. **Гибкость**: Динамический список банков (не привязаны к конкретным названиям)
3. **Структурированность**: Детальные массивы расходов и бухгалтерии
4. **Статус**: Отслеживание подтверждения отчетов
5. **Автор**: Информация о том, кто создал отчет

---

**Автор**: Claude Code
**Дата**: 2025-11-14
**Версия**: 1.0.0
