/**
 * Сервис для анализа платежей и группировки по методам и банкам
 */

interface PaymentMethodBreakdown {
  cash: number;
  card: number;
  transfers: number;
  giftCertificates: number;
}

interface BankBreakdown {
  optima: number;
  mbank: number;
  mbusiness: number;
  demir: number;
  bakai: number;
  obank: number;
}

export interface PaymentAnalysis {
  total: number;
  byPaymentMethod: PaymentMethodBreakdown;
  byBank: BankBreakdown;
  details: Array<{
    paymentMethod: string;
    amount: number;
    count: number;
  }>;
}

/**
 * Определяет тип платежа по названию способа оплаты
 */
function getPaymentType(paymentMethod: string): 'cash' | 'card' | 'transfer' | 'certificate' | 'unknown' {
  if (!paymentMethod) return 'unknown';

  const method = paymentMethod.toLowerCase();
  
  if (method.includes('наличные') || method.includes('cash')) {
    return 'cash';
  }
  if (method.includes('pos') || method.includes('карта') || method.includes('card')) {
    return 'card';
  }
  if (method.includes('перевод') || method.includes('transfer')) {
    return 'transfer';
  }
  if (method.includes('подарочный') || method.includes('сертификат') || method.includes('gift')) {
    return 'certificate';
  }
  
  return 'unknown';
}

/**
 * Определяет банк по названию способа оплаты
 */
function getBank(paymentMethod: string): keyof BankBreakdown | null {
  if (!paymentMethod) return null;

  const method = paymentMethod.toLowerCase();

  if (method.includes('оптима') || method.includes('optima')) {
    return 'optima';
  }
  if ((method.includes('м-банк') || method.includes('мбанк') || method.includes('mbank')) && !method.includes('бизнес')) {
    return 'mbank';
  }
  if (method.includes('м-бизнес') || method.includes('мбизнес') || method.includes('mbusiness')) {
    return 'mbusiness';
  }
  if (method.includes('демир') || method.includes('demir')) {
    return 'demir';
  }
  if (method.includes('бакай') || method.includes('bakai')) {
    return 'bakai';
  }
  if (method.includes('о!банк') || method.includes('obank') || method.includes('o!bank')) {
    return 'obank';
  }

  return null;
}

/**
 * Анализирует ответ от API и группирует платежи
 * @param records - Массив записей из API accounting endpoint
 * @returns Объект с анализом платежей
 */
export function analyzePayments(records: any[]): PaymentAnalysis {
  const byPaymentMethod: PaymentMethodBreakdown = {
    cash: 0,
    card: 0,
    transfers: 0,
    giftCertificates: 0,
  };

  const byBank: BankBreakdown = {
    optima: 0,
    mbank: 0,
    mbusiness: 0,
    demir: 0,
    bakai: 0,
    obank: 0,
  };

  // Словарь для подсчета количества платежей по методам
  const paymentMethodDetails: Record<string, { amount: number; count: number }> = {};

  let total = 0;

  // Анализируем каждую запись
  records.forEach((record: any) => {
    const amount = Number(record.daily_report || record.dailyReport || 0);
    const paymentMethod = record.payment_method || record.paymentMethod || '';

    if (amount > 0) {
      // Суммируем в общий итог
      total += amount;

      // Группируем по типу платежа
      const paymentType = getPaymentType(paymentMethod);
      switch (paymentType) {
        case 'cash':
          byPaymentMethod.cash += amount;
          break;
        case 'card':
          byPaymentMethod.card += amount;
          break;
        case 'transfer':
          byPaymentMethod.transfers += amount;
          break;
        case 'certificate':
          byPaymentMethod.giftCertificates += amount;
          break;
      }

      // Группируем по банкам
      const bank = getBank(paymentMethod);
      if (bank) {
        byBank[bank] += amount;
      }

      // Подсчитываем детали по методам оплаты
      if (!paymentMethodDetails[paymentMethod]) {
        paymentMethodDetails[paymentMethod] = { amount: 0, count: 0 };
      }
      paymentMethodDetails[paymentMethod].amount += amount;
      paymentMethodDetails[paymentMethod].count += 1;
    }
  });

  // Конвертируем детали в массив
  const details = Object.entries(paymentMethodDetails)
    .map(([paymentMethod, data]) => ({
      paymentMethod,
      amount: data.amount,
      count: data.count,
    }))
    .sort((a, b) => b.amount - a.amount);

  return {
    total,
    byPaymentMethod,
    byBank,
    details,
  };
}

/**
 * Группирует платежи по банкам для отображения в разбивке
 */
export function getBankSummary(byBank: BankBreakdown): Array<{
  name: string;
  amount: number;
  logo?: string;
}> {
  const banks = [
    { name: 'М-Банк', key: 'mbank', logo: 'mbanklogo.png' },
    { name: 'М-Бизнес', key: 'mbusiness', logo: 'mbusinesslogo.png' },
    { name: 'Оптима', key: 'optima', logo: 'optimabanklogo.png' },
    { name: 'Демир', key: 'demir', logo: 'demirbanklogo.png' },
    { name: 'Бакай', key: 'bakai', logo: 'bakaibanklogo.png' },
    { name: 'О!Банк', key: 'obank', logo: 'obanklogo.png' },
  ];

  return banks
    .filter(bank => byBank[bank.key as keyof BankBreakdown] > 0)
    .map(bank => ({
      name: bank.name,
      amount: byBank[bank.key as keyof BankBreakdown],
      logo: bank.logo,
    }));
}

/**
 * Суммирует платежи за несколько дней для одного банка
 */
export function sumBankPayments(records: any[], bankName: string): number {
  return records
    .filter(record => {
      return getBank(record.payment_method || record.paymentMethod) === bankName.toLowerCase();
    })
    .reduce((sum, record) => sum + Number(record.daily_report || record.dailyReport || 0), 0);
}
