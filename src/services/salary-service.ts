// Salary Service - для работы с новыми endpoints зарплаты
// Endpoints на VITE_BACKEND_URL (Primary Backend)

interface StaffInfo {
  id: number;
  firstname?: string;
  lastname?: string;
  first_name?: string;
  last_name?: string;
  role: string;
}

interface PaymentInfo {
  id: number;
  period_start: string;
  period_end: string;
  paid_amount: number;
  remaining_amount: number;
  is_fully_paid: boolean;
}

interface SalaryData {
  staff_id: number;
  staff: StaffInfo;
  base_salary: number;
  commission_rate: number;
  service_sum: number;
  total_salary: number;
  already_paid: number;
  remaining_amount: number;
  payments_count: number;
  payments: PaymentInfo[];
  updated_by_id: number | null;
  updated_by_snapshot: any | null;
}

interface SalaryResponse {
  data: SalaryData[];
  meta: {
    branch_id: number;
    startDate: string;
    endDate: string;
    timezone: string;
  };
}

interface CreateSalaryRequest {
  staff: StaffInfo;
  baseSalary: number;
  commissionRate: number;
  createdBy: StaffInfo;
}

interface CreateSalaryResponse {
  id: number;
  branch_id: number;
  staff_id: number;
  staff_snapshot: {
    first_name: string;
    last_name: string;
    role: string;
  };
  created_by_snapshot: {
    first_name: string;
    role: string;
  };
  updated_by_id: number | null;
  updated_by_snapshot: any | null;
  base_salary: number;
  commission_rate: number;
  timezone: string;
  createdAt: string;
}

class SalaryService {
  private baseUrl: string;

  constructor() {
    // Используем вторичный бэкенд если задан (новые эндпоинты /api/tenant)
    const secondary = import.meta.env.VITE_SECONDARY_BACKEND_URL;
    if (secondary?.includes('/api/main')) {
      // salary endpoints сидят на /api/tenant
      this.baseUrl = secondary.replace('/api/main', '/api/tenant');
    } else {
      this.baseUrl = secondary || import.meta.env.VITE_BACKEND_URL;
    }
  }

  /**
   * Получить данные о зарплатах для филиала за период
   * GET /salaries
   *
   * @param branchId - ID филиала
   * @param startDate - Дата начала периода (формат: YYYY-MM-DD)
   * @param endDate - Дата окончания периода (формат: YYYY-MM-DD)
   * @returns Данные о зарплатах с расчетами
   */
  async getSalaryData(
    branchId: number,
    startDate: string,
    endDate: string
  ): Promise<SalaryResponse | null> {
    try {
      const url = new URL(`${this.baseUrl}/salaries`);
      url.searchParams.append('branchId', branchId.toString());
      url.searchParams.append('startDate', startDate);
      url.searchParams.append('endDate', endDate);

      console.log('🔍 Fetching salary data:', {
        url: url.toString(),
        branchId,
        startDate,
        endDate,
      });

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Failed to fetch salary data:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });

        if (response.status === 400) {
          throw new Error(errorData.error || 'Missing or invalid parameters');
        }
        if (response.status === 404) {
          throw new Error(errorData.error || 'No salary settings found for this branch');
        }

        throw new Error('Failed to fetch salary data');
      }

      const data: SalaryResponse = await response.json();
      console.log('✅ Salary data loaded:', data);
      return data;
    } catch (error) {
      console.error('❌ Error fetching salary data:', error);
      return null;
    }
  }

  /**
   * Создать новую запись о зарплате для сотрудника
   * POST /salaries?branchId={branchId}
   *
   * @param salaryData - Данные о зарплате сотрудника
   * @param branchId - ID филиала
   * @returns Созданная запись о зарплате
   */
  async createSalaryRecord(
    salaryData: CreateSalaryRequest,
    branchId: number
  ): Promise<CreateSalaryResponse | null> {
    try {
      console.log('💰 Creating salary record:');
      console.log('  📋 Staff:', salaryData.staff);
      console.log('  💵 Base Salary:', salaryData.baseSalary);
      console.log('  📊 Commission Rate:', salaryData.commissionRate);
      console.log('  👤 Created By:', salaryData.createdBy);
      console.log('  🏢 Branch ID:', branchId);

      const url = new URL(`${this.baseUrl}/salaries`);
      url.searchParams.append('branchId', branchId.toString());
      url.searchParams.append('staffId', salaryData.staff.id.toString());

      console.log('📡 PATCH URL:', url.toString());
      console.log('📦 Request Body:', JSON.stringify(salaryData, null, 2));

      // Бэкенд ожидает staff и created_by в snake_case
      const payload = {
        staff_id: salaryData.staff.id,
        staff: {
          id: salaryData.staff.id,
          first_name: salaryData.staff.first_name || salaryData.staff.firstname || '',
          last_name: salaryData.staff.last_name || salaryData.staff.lastname || '',
          role: salaryData.staff.role,
        },
        base_salary: salaryData.baseSalary,
        commission_rate: salaryData.commissionRate,
        created_by: {
          id: salaryData.createdBy.id,
          first_name: salaryData.createdBy.first_name || salaryData.createdBy.firstname || '',
          last_name: salaryData.createdBy.last_name || salaryData.createdBy.lastname || '',
          role: salaryData.createdBy.role,
        },
      };

      const response = await fetch(url.toString(), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Failed to create salary record:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });

        if (response.status === 400) {
          throw new Error(errorData.error || 'Missing or invalid data');
        }

        throw new Error('Failed to create salary record');
      }

      const data: CreateSalaryResponse = await response.json();
      console.log('✅ Salary record created:', data);
      return data;
    } catch (error) {
      console.error('❌ Error creating salary record:', error);
      return null;
    }
  }

  /**
   * Получить данные о зарплате конкретного сотрудника
   * Вспомогательная функция для фильтрации данных по staff_id
   */
  async getEmployeeSalaryData(
    branchId: number,
    staffId: number,
    startDate: string,
    endDate: string
  ): Promise<SalaryData | null> {
    const response = await this.getSalaryData(branchId, startDate, endDate);

    if (!response || !response.data) {
      return null;
    }

    const employeeData = response.data.find(item => item.staff_id === staffId);
    return employeeData || null;
  }

  /**
   * Вычислить общую сумму зарплат для всех сотрудников
   */
  calculateTotalSalary(salaryResponse: SalaryResponse): number {
    if (!salaryResponse?.data) return 0;

    return salaryResponse.data.reduce((total, item) => {
      return total + item.total_salary;
    }, 0);
  }

  /**
   * Вычислить общую выплаченную сумму
   */
  calculateTotalPaid(salaryResponse: SalaryResponse): number {
    if (!salaryResponse?.data) return 0;

    return salaryResponse.data.reduce((total, item) => {
      return total + item.already_paid;
    }, 0);
  }

  /**
   * Вычислить общую оставшуюся сумму к выплате
   */
  calculateTotalRemaining(salaryResponse: SalaryResponse): number {
    if (!salaryResponse?.data) return 0;

    return salaryResponse.data.reduce((total, item) => {
      return total + item.remaining_amount;
    }, 0);
  }

  /**
   * Проверить, полностью ли выплачена зарплата сотруднику
   */
  isFullyPaid(salaryData: SalaryData): boolean {
    return salaryData.remaining_amount === 0;
  }

  /**
   * Получить список сотрудников с непогашенными зарплатами
   */
  getUnpaidEmployees(salaryResponse: SalaryResponse): SalaryData[] {
    if (!salaryResponse?.data) return [];

    return salaryResponse.data.filter(item => item.remaining_amount > 0);
  }

  /**
   * Форматировать данные для отображения в таблице
   */
  formatSalaryDataForTable(salaryData: SalaryData) {
    return {
      id: salaryData.staff_id,
      name: `${salaryData.staff.first_name} ${salaryData.staff.last_name}`,
      role: salaryData.staff.role,
      baseSalary: salaryData.base_salary,
      commissionRate: (salaryData.commission_rate * 100).toFixed(1) + '%',
      serviceSum: salaryData.service_sum,
      totalSalary: salaryData.total_salary,
      alreadyPaid: salaryData.already_paid,
      remaining: salaryData.remaining_amount,
      paymentsCount: salaryData.payments_count,
      isFullyPaid: this.isFullyPaid(salaryData),
    };
  }
}

// Экспортируем singleton instance
export const salaryService = new SalaryService();

// Экспортируем типы для использования в компонентах
export type {
  SalaryData,
  SalaryResponse,
  CreateSalaryRequest,
  CreateSalaryResponse,
  StaffInfo,
  PaymentInfo,
};
