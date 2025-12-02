import { $api } from '@/API/http';

interface ExpenseRecord {
  id?: number;
  name: string;
  amount: number;
  branchId: string;
  date: string;
  createdAt?: string;
}

class ExpenseService {
  async getExpensesForDate(date: string, branchId: string): Promise<ExpenseRecord[]> {
    try {
      const response = await $api.get<ExpenseRecord[]>(`/api/expenses?date=${date}&branchId=${branchId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching expenses:', error);
      return [];
    }
  }

  async createExpense(expense: Omit<ExpenseRecord, 'id'>): Promise<ExpenseRecord | null> {
    try {
      const response = await $api.post<ExpenseRecord>('/api/expenses', expense);
      return response.data;
    } catch (error) {
      console.error('Error creating expense:', error);
      return null;
    }
  }

  async deleteExpense(id: number): Promise<boolean> {
    try {
      await $api.delete(`/api/expenses/${id}`);
      return true;
    } catch (error) {
      console.error('Error deleting expense:', error);
      return false;
    }
  }
}

export const expenseService = new ExpenseService();
export type { ExpenseRecord };