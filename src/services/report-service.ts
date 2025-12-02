// Report Service - для работы с новыми endpoints отчетов
// Endpoints на VITE_BACKEND_URL (Primary Backend)

interface IssuedBy {
  id: number;
  fist_name: string; // Опечатка в API: fist_name вместо first_name
  last_name: string;
  role: string;
}

interface ExpenseDetail {
  source: string;
  amount: number;
  note: string;
}

interface AccountingDetail {
  source: string;
  amount: number;
  note: string;
}

interface BankPayment {
  bank_name: string;
  amount: number;
}

interface DailyCashReport {
  id: number;
  date: string;
  branch_id: number;
  issued_by_id: number;
  issued_by: IssuedBy;
  start_balance: number;
  end_balance: number;
  total_revenue: number;
  total_income: number;
  expenses_total: number;
  expenses_detail: ExpenseDetail[];
  accounting_details: AccountingDetail[];
  cash_collection: number;
  cash_payments: number;
  card_payments: number;
  transfer_payments: number;
  gift_certificate_payments: number;
  bank_payments: BankPayment[];
  salary_payments: number;
  timezone: string;
  status: 'confirmed' | 'unconfirmed';
  createdAt: string;
  updatedAt: string;
}

class ReportService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_BACKEND_URL;
  }

  /**
   * Получить отчеты для филиала за определенную дату
   * GET /reports?branchId={branchId}&date={date}
   *
   * @param branchId - ID филиала
   * @param date - Дата (формат: YYYY-MM-DD)
   * @returns Список отчетов
   */
  async getReports(
    branchId: number,
    date: string
  ): Promise<DailyCashReport[] | null> {
    try {
      const url = new URL(`${this.baseUrl}/reports`);
      url.searchParams.append('branchId', branchId.toString());
      url.searchParams.append('date', date);

      console.log('🔍 Fetching reports:', {
        url: url.toString(),
        branchId,
        date,
      });

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Failed to fetch reports:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });

        if (response.status === 400) {
          throw new Error(errorData.error || 'Missing or invalid parameters');
        }

        throw new Error('Failed to fetch reports');
      }

      const data: DailyCashReport[] = await response.json();
      console.log('✅ Reports loaded:', data);
      return data;
    } catch (error) {
      console.error('❌ Error fetching reports:', error);
      return null;
    }
  }

  /**
   * Получить отчет по ID
   * GET /reports/{id}
   *
   * @param id - ID отчета
   * @returns Детали отчета
   */
  async getReportById(id: number): Promise<DailyCashReport | null> {
    try {
      const url = `${this.baseUrl}/reports/${id}`;

      console.log('🔍 Fetching report by ID:', {
        url,
        id,
      });

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Failed to fetch report:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });

        if (response.status === 404) {
          throw new Error('Report not found');
        }

        throw new Error('Failed to fetch report');
      }

      const data: DailyCashReport = await response.json();
      console.log('✅ Report loaded:', data);
      return data;
    } catch (error) {
      console.error('❌ Error fetching report:', error);
      return null;
    }
  }

  /**
   * Конвертировать тыйыны в сомы (делить на 100)
   */
  convertToSom(tyiyn: number): number {
    return Math.round(tyiyn / 100);
  }

  /**
   * Форматировать отчет для отображения (конвертация в сомы)
   */
  formatReportForDisplay(report: DailyCashReport) {
    return {
      ...report,
      start_balance: this.convertToSom(report.start_balance),
      end_balance: this.convertToSom(report.end_balance),
      total_revenue: this.convertToSom(report.total_revenue),
      total_income: this.convertToSom(report.total_income),
      expenses_total: this.convertToSom(report.expenses_total),
      cash_collection: this.convertToSom(report.cash_collection),
      cash_payments: this.convertToSom(report.cash_payments),
      card_payments: this.convertToSom(report.card_payments),
      transfer_payments: this.convertToSom(report.transfer_payments),
      gift_certificate_payments: this.convertToSom(report.gift_certificate_payments),
      salary_payments: this.convertToSom(report.salary_payments),
      expenses_detail: report.expenses_detail.map(expense => ({
        ...expense,
        amount: this.convertToSom(expense.amount),
      })),
      accounting_details: report.accounting_details.map(detail => ({
        ...detail,
        amount: this.convertToSom(detail.amount),
      })),
      bank_payments: report.bank_payments.map(payment => ({
        ...payment,
        amount: this.convertToSom(payment.amount),
      })),
    };
  }

  /**
   * Вычислить общую сумму банковских платежей
   */
  calculateTotalBankPayments(report: DailyCashReport): number {
    return report.bank_payments.reduce((total, payment) => {
      return total + payment.amount;
    }, 0);
  }

  /**
   * Получить платеж по конкретному банку
   */
  getBankPaymentByName(report: DailyCashReport, bankName: string): number {
    const payment = report.bank_payments.find(
      p => p.bank_name.toLowerCase() === bankName.toLowerCase()
    );
    return payment ? payment.amount : 0;
  }

  /**
   * Вычислить итоги по массиву отчетов
   */
  calculateTotals(reports: DailyCashReport[]) {
    const totals = {
      total_revenue: 0,
      total_income: 0,
      expenses_total: 0,
      end_balance: 0,
      cash_collection: 0,
      salary_payments: 0,
      cash_payments: 0,
      card_payments: 0,
      transfer_payments: 0,
      gift_certificate_payments: 0,
      bank_payments_total: 0,
      bank_payments_by_name: {} as Record<string, number>,
    };

    reports.forEach(report => {
      totals.total_revenue += report.total_revenue;
      totals.total_income += report.total_income;
      totals.expenses_total += report.expenses_total;
      totals.end_balance += report.end_balance;
      totals.cash_collection += report.cash_collection;
      totals.salary_payments += report.salary_payments;
      totals.cash_payments += report.cash_payments;
      totals.card_payments += report.card_payments;
      totals.transfer_payments += report.transfer_payments;
      totals.gift_certificate_payments += report.gift_certificate_payments;

      // Суммируем банковские платежи
      report.bank_payments.forEach(payment => {
        totals.bank_payments_total += payment.amount;

        if (!totals.bank_payments_by_name[payment.bank_name]) {
          totals.bank_payments_by_name[payment.bank_name] = 0;
        }
        totals.bank_payments_by_name[payment.bank_name] += payment.amount;
      });
    });

    return totals;
  }
}

// Экспортируем singleton instance
export const reportService = new ReportService();

// Экспортируем типы для использования в компонентах
export type {
  DailyCashReport,
  IssuedBy,
  ExpenseDetail,
  AccountingDetail,
  BankPayment,
};
