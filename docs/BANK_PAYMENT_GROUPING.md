# Анализ и группировка платежей по банкам

## Описание

На странице "Бухгалтерия" в разделе "Разбивка по банкам" реализована функциональность для анализа и суммирования платежей, полученных от API endpoint'а.

## API Integration

**Endpoint:** `GET /api/accounting?date=YYYY-MM-DD&branchId=ID`

**Ответ:** Массив объектов с информацией о платежах

```json
[
  {
    "id": 1,
    "daily_report": 5000,
    "payment_method": "М-Банк",
    "client": "Клиент 1",
    "master": "Мастер 1",
    ...
  }
]
```

## Сервис Payment Analytics

**Файл:** `src/services/payment-analytics.ts`

### Основные функции

#### 1. `analyzePayments(records: any[]): PaymentAnalysis`

Анализирует массив записей платежей и группирует их по методам и банкам.

**Параметры:**
- `records` - массив записей из API (может использовать `daily_report` или `dailyReport`)

**Возвращает объект `PaymentAnalysis`:**
```typescript
{
  total: number,                      // Общая сумма всех платежей
  byPaymentMethod: {
    cash: number,                    // Наличные
    card: number,                    // Карты (POS)
    transfers: number,               // Переводы
    giftCertificates: number         // Подарочные сертификаты
  },
  byBank: {
    mbank: number,                   // М-Банк
    mbusiness: number,               // М-Бизнес
    optima: number,                  // Оптима
    demir: number,                   // Демир
    bakai: number,                   // Бакай
    obank: number                    // О!Банк
  },
  details: Array<{
    paymentMethod: string,           // Название способа оплаты
    amount: number,                  // Сумма
    count: number                    // Количество операций
  }>
}
```

#### 2. `getBankSummary(byBank: BankBreakdown): Array`

Преобразует объект разбивки по банкам в массив для отображения, фильтруя банки с нулевыми суммами.

```typescript
[
  {
    name: "М-Банк",
    amount: 5000,
    logo: "mbanklogo.png"
  }
]
```

#### 3. `sumBankPayments(records: any[], bankName: string): number`

Суммирует платежи для конкретного банка.

## Интеграция в компонент DailyCashReport

### Использование в компоненте

```typescript
import { analyzePayments, type PaymentAnalysis } from '@/services/payment-analytics';

const [paymentAnalysis, setPaymentAnalysis] = useState<PaymentAnalysis | null>(null);

// В useEffect при расчете данных
useEffect(() => {
  const dayRecords = records.filter(/* условия фильтрации */);
  const analysis = analyzePayments(dayRecords);
  setPaymentAnalysis(analysis);
}, [records, selectedDate]);
```

### Отображение разбивки по банкам

```tsx
<div className="mt-6">
  <h3 className="text-lg font-semibold mb-3">Разбивка по банкам</h3>
  {paymentAnalysis && Object.values(paymentAnalysis.byBank).some(v => v > 0) ? (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {paymentAnalysis.byBank.mbank > 0 && (
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="text-sm text-gray-600">М-Банк</div>
          <div className="text-lg font-semibold">
            {paymentAnalysis.byBank.mbank.toLocaleString()} сом
          </div>
        </div>
      )}
      {/* Остальные банки... */}
    </div>
  ) : (
    <div className="text-center py-4 text-gray-500">
      Нет платежей по банкам
    </div>
  )}
</div>
```

## Поддерживаемые банки и способы оплаты

### Банки
1. **М-Банк** - ключевые слова: "М-Банк", "МБанк", "mbank"
2. **М-Бизнес** - ключевые слова: "М-Бизнес", "МБизнес", "mbusiness"
3. **Оптима** - ключевые слова: "Оптима", "optima"
4. **Демир** - ключевые слова: "Демир", "demir"
5. **Бакай** - ключевые слова: "Бакай", "bakai"
6. **О!Банк** - ключевые слова: "О!Банк", "obank", "o!bank"

### Способы оплаты
1. **Наличные** - ключевые слова: "наличные", "cash"
2. **Карта/POS** - ключевые слова: "pos", "карта", "card"
3. **Переводы** - ключевые слова: "перевод", "transfer"
4. **Подарочные сертификаты** - ключевые слова: "подарочный", "сертификат", "gift"

## Примеры использования

### Пример 1: Анализ платежей за день

```typescript
const records = [
  { daily_report: 3000, payment_method: "М-Банк", ... },
  { daily_report: 2000, payment_method: "Оптима", ... },
  { daily_report: 1500, payment_method: "М-Банк", ... }
];

const analysis = analyzePayments(records);
console.log(analysis.byBank);
// Результат:
// {
//   mbank: 4500,
//   optima: 2000,
//   mbusiness: 0,
//   demir: 0,
//   bakai: 0,
//   obank: 0
// }
```

### Пример 2: Получение сводки по банкам

```typescript
const summary = getBankSummary(analysis.byBank);
console.log(summary);
// [
//   { name: "М-Банк", amount: 4500, logo: "mbanklogo.png" },
//   { name: "Оптима", amount: 2000, logo: "optimabanklogo.png" }
// ]
```

## Отправка отчета на сервер

При отправке дневного отчета в функции `handleSubmitReport` используются данные из анализа платежей:

```typescript
const bankData = paymentAnalysis ? paymentAnalysis.byBank : {
  optima: reportData.optimaPayments,
  mbank: reportData.mbankPayments,
  mbusiness: reportData.mbusinessPayments,
  demir: reportData.demirPayments,
  bakai: reportData.bakaiPayments,
  obank: reportData.obankPayments,
};

const reportPayload = {
  date: dateString,
  branchId: branchId,
  adminName: currentAdmin,
  optimaPayments: bankData.optima,
  mbankPayments: bankData.mbank,
  mbusinessPayments: bankData.mbusiness,
  demirPayments: bankData.demir,
  bakaiPayments: bankData.bakai,
  obankPayments: bankData.obank,
  // Остальные поля...
};
```

## Отладка

Компонент логирует анализ платежей в консоль для отладки:

```javascript
console.log('Payment Analysis:', {
  total: analysis.total,
  byBank: analysis.byBank,
  details: analysis.details
});
```

## Тестирование

Для проверки функциональности:

1. Откройте страницу "Бухгалтерия"
2. Выберите дату с платежами
3. Проверьте раздел "Разбивка по банкам" - должны отобразиться банки с платежами
4. Откройте консоль браузера (F12) и проверьте логи анализа платежей
5. Отправьте отчет и проверьте, что данные банков передаются корректно

## Возможные расширения

1. Добавить отображение логотипов банков в интерфейсе
2. Добавить экспорт детальной информации по платежам (CSV, PDF)
3. Реализовать фильтрацию по датам для аналитики за период
4. Добавить визуализацию распределения платежей по банкам (диаграммы)
5. Синхронизация с системой бухгалтерии для валидации данных
