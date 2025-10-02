
interface AccountingRecord {
  id?: number;
  master: string;
  client: string;
  serviceType: string;
  phoneNumber: string;
  amount: number | string;
  discount: string;
  duration: string;
  comment: string;
  paymentMethod: string;
  dailyReport: string;
  adminName: string;
  isGiftCertificateUsed: boolean;
  branchId: string;
  date: string;
}

class AccountingService {
  async getRecordsForDate(date: string, branchId: string): Promise<AccountingRecord[]> {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/accounting?date=${date}&branchId=${branchId}`);
      if (response.ok) {
        return await response.json();
      }
      return [];
    } catch (error) {
      console.error('Error fetching accounting records:', error);
      return [];
    }
  }

  async saveRecord(record: Omit<AccountingRecord, 'id'>): Promise<AccountingRecord | null> {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/accounting`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          master: record.master,
          client: record.client,
          serviceType: record.serviceType,
          phoneNumber: record.phoneNumber,
          amount: Number(record.amount),
          discount: record.discount,
          duration: record.duration,
          comment: record.comment,
          paymentMethod: record.paymentMethod,
          dailyReport: record.dailyReport,
          adminName: record.adminName,
          isGiftCertificateUsed: record.isGiftCertificateUsed,
          branchId: record.branchId,
          date: record.date,
          schedule_date: record.date // Добавляем schedule_date для корректного сохранения
        }),
      });
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Error saving accounting record:', error);
      return null;
    }
  }

  async updateRecord(record: AccountingRecord): Promise<boolean> {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/accounting/${record.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          master: record.master,
          client: record.client,
          serviceType: record.serviceType,
          phoneNumber: record.phoneNumber,
          amount: Number(record.amount),
          discount: record.discount,
          duration: record.duration,
          comment: record.comment,
          paymentMethod: record.paymentMethod,
          dailyReport: record.dailyReport,
          adminName: record.adminName,
          isGiftCertificateUsed: record.isGiftCertificateUsed,
          branchId: record.branchId,
          date: record.date
        }),
      });
      return response.ok;
    } catch (error) {
      console.error('Error updating accounting record:', error);
      return false;
    }
  }

  async updateRecords(records: AccountingRecord[]): Promise<boolean> {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/accounting/bulk-update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(records),
      });
      return response.ok;
    } catch (error) {
      console.error('Error updating accounting records:', error);
      return false;
    }
  }

  async deleteRecord(id: number): Promise<boolean> {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/accounting/${id}`, {
        method: 'DELETE',
      });
      return response.ok;
    } catch (error) {
      console.error('Error deleting accounting record:', error);
      return false;
    }
  }
}

export const accountingService = new AccountingService();
