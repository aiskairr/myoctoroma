# Интеграция подарочных сертификатов в анализ платежей

## Описание

Функция анализа платежей теперь учитывает подарочные сертификаты из API endpoint'а `/api/gift-certificates`, анализируя их поле `payment_method` для правильного распределения по банкам.

## API Endpoints

### 1. Платежи (Accounting)
**GET** `/api/accounting?date=YYYY-MM-DD&branchId=ID`

Возвращает платежи с полем `daily_report` и `payment_method`.

### 2. Подарочные сертификаты
**GET** `/api/gift-certificates?date=YYYY-MM-DD&branchId=ID&isUsed=false&isExpired=false`

Возвращает подарочные сертификаты с полями:
- `amount` - сумма сертификата
- `payment_method` - способ оплаты при создании сертификата (например: "МБанк - Перевод", "Наличные", "О!Банк")

## Пример ответа API Gift Certificates

```json
{
  "id": 18,
  "certificate_number": "091003",
  "amount": 5000,
  "admin_name": null,
  "payment_method": "МБанк - Перевод",
  "discount": "0%",
  "expiry_date": "2025-12-31T00:00:00.000Z",
  "client_name": null,
  "phone_number": null,
  "duration": null,
  "master_name": null,
  "is_used": false,
  "is_expired": false,
  "branch_id": "1",
  "created_at": "2025-10-29T05:18:35.301Z",
  "updated_at": "2025-10-29T05:18:35.301Z",
  "service_type": null
}
```

## Обновления в сервисе Payment Analytics

### Функция `analyzePayments`

**Старая сигнатура:**
```typescript
export function analyzePayments(records: any[]): PaymentAnalysis
```

**Новая сигнатура:**
```typescript
export function analyzePayments(records: any[], giftCertificates: any[] = []): PaymentAnalysis
```

**Параметры:**
- `records` - платежи из API accounting
- `giftCertificates` - сертификаты из API gift-certificates (опционально)

### Как работает анализ подарочных сертификатов

1. Каждый сертификат анализируется отдельно
2. Поле `payment_method` разбирается функцией `getBank()` для определения банка
3. Сумма `amount` добавляется к суммам платежей соответствующего банка
4. Сертификаты также добавляют данные в `byPaymentMethod.giftCertificates`
5. В `details` добавляется запись "Подарочный сертификат - [payment_method]"

## Обновления в компоненте DailyCashReport

### Логика получения данных

```typescript
// 1. Получаем платежи
const dayRecords = records.filter(/* условия */);

// 2. Получаем сертификаты для этой даты
let giftCertificatesData: any[] = [];
try {
  const response = await fetch(
    `/api/gift-certificates?date=${selectedDateStr}&branchId=${branchId}&isUsed=false&isExpired=false`
  );
  if (response.ok) {
    giftCertificatesData = await response.json();
  }
} catch (error) {
  console.error('Ошибка загрузки сертификатов:', error);
}

// 3. Анализируем оба источника вместе
const analysis = analyzePayments(dayRecords, giftCertificatesData);
setPaymentAnalysis(analysis);
```

### Использование единого источника данных

Данные подарочных сертификатов теперь получаются один раз и используются для:
1. Анализа платежей по банкам
2. Расчета выручки по способам оплаты
3. Расчета общей выручки

Это исключает дублирование API запросов и обеспечивает согласованность данных.

## Пример использования

### Сценарий: Платежи с сертификатами

**Данные из API:**

**Платежи (accounting):**
- М-Банк: 3000 сом
- Оптима: 2000 сом

**Подарочные сертификаты (gift-certificates):**
- МБанк - Перевод: 5000 сом
- О!Банк: 1500 сом

**Результат анализа:**
```typescript
const analysis = analyzePayments(accounting, giftCerts);

analysis.byBank = {
  mbank: 8000,      // 3000 (платеж) + 5000 (сертификат)
  optima: 2000,     // 2000 (платеж)
  obank: 1500,      // 1500 (сертификат)
  // остальные: 0
};

analysis.details = [
  { paymentMethod: "М-Банк", amount: 3000, count: 1 },
  { paymentMethod: "Оптима", amount: 2000, count: 1 },
  { paymentMethod: "Подарочный сертификат - МБанк - Перевод", amount: 5000, count: 1 },
  { paymentMethod: "Подарочный сертификат - О!Банк", amount: 1500, count: 1 }
];

analysis.total = 11500; // Всего платежей с сертификатами
```

## Отправка отчета на сервер

При отправке дневного отчета используются финальные значения из анализа платежей, которые уже включают сертификаты:

```typescript
const bankData = paymentAnalysis?.byBank;

reportPayload = {
  optimaPayments: bankData.optima,      // Включает сертификаты
  mbankPayments: bankData.mbank,        // Включает сертификаты
  mbusinessPayments: bankData.mbusiness,
  demirPayments: bankData.demir,
  bakaiPayments: bankData.bakai,
  obankPayments: bankData.obank,
  // остальные поля...
};
```

## Поддерживаемые форматы payment_method в сертификатах

Функция `getBank()` распознает следующие форматы:

```
"МБанк - Перевод"           → mbank
"М-Банк"                     → mbank
"МБанк"                      → mbank
"Оптима"                     → optima
"О!Банк"                     → obank
"Демир"                      → demir
"Бакай"                      → bakai
"М-Бизнес"                   → mbusiness
"МБизнес"                    → mbusiness
```

## Отладка

При загрузке страницы Бухгалтерия в консоли браузера будут логи:

```javascript
console.log('Gift Certificates Debug:', {
  selectedDateStr: "2025-10-29",
  branchId: "1",
  totalCerts: 1,
  giftCertificatesRevenue: 5000,
  sampleCert: { id: 18, amount: 5000, payment_method: "МБанк - Перевод", ... }
});
```

## Преимущества интеграции

✅ **Точность** - Все платежи, включая сертификаты, учитываются в разбивке по банкам
✅ **Производительность** - Единственный GET запрос для сертификатов вместо нескольких
✅ **Согласованность** - Данные сертификатов используются везде одинаково
✅ **Расширяемость** - Легко добавить другие источники платежей

## Возможные расширения

1. Добавить поддержку других источников платежей (скидки, бонусы)
2. Реализовать кэширование данных сертификатов
3. Добавить визуализацию с разбивкой по источникам (платежи vs сертификаты)
4. Экспортировать детальный отчет с указанием источника каждого платежа
