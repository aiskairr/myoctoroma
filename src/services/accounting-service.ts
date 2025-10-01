
import { apiGetJson, apiPost, apiPut, apiDelete } from '@/lib/api';

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
      const response = await apiGetJson(`/api/accounting?date=${date}&branchId=${branchId}`);
      return response;
    } catch (error) {
      console.error('Error fetching accounting records:', error);
      return [];
    }
  }

  async saveRecord(record: Omit<AccountingRecord, 'id'>): Promise<AccountingRecord | null> {
    try {
      const recordData = {
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
      };
      
      console.log('Saving accounting record with data:', recordData);
      const response = await apiPost('/api/accounting', recordData);
      
      // Проверяем, что ответ успешный
      if (response.ok) {
        return await response.json();
      } else {
        const errorText = await response.text();
        console.error('Server response error:', response.status, errorText);
        throw new Error(`Server returned ${response.status}: ${errorText}`);
      }
    } catch (error) {
      console.error('Error saving accounting record:', error);
      throw error; // Пробрасываем ошибку для обработки в UI
    }
  }

  async updateRecord(record: AccountingRecord): Promise<boolean> {
    try {
      const recordData = {
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
      };
      
      const response = await apiPut(`/api/accounting/${record.id}`, recordData);
      return response.ok;
    } catch (error) {
      console.error('Error updating accounting record:', error);
      return false;
    }
  }

  async updateRecords(records: AccountingRecord[]): Promise<boolean> {
    try {
      const response = await apiPut('/api/accounting/bulk-update', records);
      return response.ok;
    } catch (error) {
      console.error('Error updating accounting records:', error);
      return false;
    }
  }

  async deleteRecord(id: number): Promise<boolean> {
    try {
      const response = await apiDelete(`/api/accounting/${id}`);
      return response.ok;
    } catch (error) {
      console.error('Error deleting accounting record:', error);
      return false;
    }
  }
}

export const accountingService = new AccountingService();
