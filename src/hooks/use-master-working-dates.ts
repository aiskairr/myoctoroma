import { useQuery } from '@tanstack/react-query';
import { apiGetJson } from '@/lib/api';

// Интерфейс для рабочих дат мастеров
export interface MasterWorkingDate {
  id: number;
  master_id: number;
  master_name: string;
  work_date: string;
  start_time: string;
  end_time: string;
  branch_id: string;
  is_active: boolean;
}

// Hook для получения рабочих дат мастеров для календаря
export const useMasterWorkingDates = (date?: string, branchId?: string) => {
  return useQuery<MasterWorkingDate[]>({
    queryKey: ['master-working-dates', date, branchId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (date) params.append('date', date);
      if (branchId) params.append('branchId', branchId);
      
      const url = `/working-dates?${params.toString()}`;
      
      // Use shared API helper to avoid credentialed CORS failures and cached 304s
      const response = await apiGetJson<MasterWorkingDate[] | { data?: MasterWorkingDate[]; results?: MasterWorkingDate[] }>(url);
      // Backend может отдавать массив напрямую или оборачивать в { data }
      const raw = Array.isArray(response) ? response : response.data || response.results || [];
      // Нормализуем поля: master_id может называться staff_id
      return raw.map((item: any) => ({
        ...item,
        master_id: item.master_id ?? item.staff_id,
        branch_id: item.branch_id?.toString?.() ?? item.branch_id,
        is_active: item.is_active ?? item.is_day_off === false,
      }));
    },
    enabled: !!date && !!branchId, // Запрос выполняется только если переданы и дата и branchId
    staleTime: 5 * 60 * 1000, // Данные считаются свежими 5 минут
    refetchOnWindowFocus: false,
  });
};

// Hook для получения рабочего времени конкретного мастера на конкретную дату
export const useMasterWorkingHoursForDate = (masterId: number, date: string, branchId?: string) => {
  const { data: workingDates } = useMasterWorkingDates(date, branchId);
  
  // Находим рабочий день для конкретного мастера
  const masterWorkingDate = workingDates?.find(
    wd => wd.master_id === masterId && wd.is_active
  );
  
  return {
    isWorking: !!masterWorkingDate,
    startTime: masterWorkingDate?.start_time || '09:00',
    endTime: masterWorkingDate?.end_time || '20:00',
    workingDate: masterWorkingDate
  };
};
