import { useQuery } from '@tanstack/react-query';

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
      
      const url = `${import.meta.env.VITE_BACKEND_URL}/api/crm/master-working-dates?${params.toString()}`;
      
      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized');
        } else if (response.status === 500) {
          throw new Error('Failed to fetch master working dates');
        } else {
          const errorText = await response.text();
          throw new Error(`Error ${response.status}: ${errorText}`);
        }
      }

      return response.json();
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
