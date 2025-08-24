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
      const response = await fetch(`/api/expenses?date=${date}&branchId=${branchId}`);
      if (response.ok) {
        return await response.json();
      }
      return [];
    } catch (error) {
      console.error('Error fetching expenses:', error);
      return [];
    }
  }

  async createExpense(expense: Omit<ExpenseRecord, 'id'>): Promise<ExpenseRecord | null> {
    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(expense),
      });
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Error creating expense:', error);
      return null;
    }
  }

  async deleteExpense(id: number): Promise<boolean> {
    try {
      const response = await fetch(`/api/expenses/${id}`, {
        method: 'DELETE',
      });
      return response.ok;
    } catch (error) {
      console.error('Error deleting expense:', error);
      return false;
    }
  }
}

export const expenseService = new ExpenseService();
export type { ExpenseRecord };