import { $api } from '@/API/http';

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
      const response = await $api.get(`/accounting?date=${date}&branchId=${branchId}`);
      const data = response.data;
      // New API may return { accountings: [...] } or an array
      if (Array.isArray(data)) return data as AccountingRecord[];
      if (data && Array.isArray(data.accountings)) return data.accountings as AccountingRecord[];
      return [];
    } catch (error) {
      console.error('Error fetching accounting records:', error);
      return [];
    }
  }

  async saveRecord(record: Omit<AccountingRecord, 'id'>): Promise<AccountingRecord | null> {
    try {
      const response = await $api.post('/api/accounting', {
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
        schedule_date: record.date // Формат: YYYY-MM-DD (поле для совместимости с API)
      });
      return response.data;
    } catch (error) {
      console.error('Error saving accounting record:', error);
      return null;
    }
  }

  async updateRecord(record: AccountingRecord): Promise<boolean> {
    try {
      await $api.patch(`/accounting/${record.id}`, {
        comment: (record as any).comment,
        dailyReport: (record as any).dailyReport,
        certificateId: (record as any).giftCertificateId
      });
      return true;
    } catch (error) {
      console.error('Error updating accounting record:', error);
      return false;
    }
  }

  async updateRecords(records: AccountingRecord[]): Promise<boolean> {
    try {
      await $api.put('/api/accounting/bulk-update', records);
      return true;
    } catch (error) {
      console.error('Error updating accounting records:', error);
      return false;
    }
  }

  async deleteRecord(id: number): Promise<boolean> {
    try {
      await $api.delete(`/api/accounting/${id}`);
      return true;
    } catch (error) {
      console.error('Error deleting accounting record:', error);
      return false;
    }
  }
}

export const accountingService = new AccountingService();
