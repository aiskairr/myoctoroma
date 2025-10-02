import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Loader2 } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { useBranch } from "@/contexts/BranchContext";

interface WorkingDate {
  date?: string; // ISO date string
  work_date?: string; // API format
  startTime?: string;
  start_time?: string; // API format
  endTime?: string;
  end_time?: string; // API format
  branchId?: string;
  branch_id?: string; // API format
  masterId?: string; // ID мастера, если есть
}

interface MasterWorkingDatesDisplayProps {
  workingDates?: WorkingDate[];
  currentMonth?: Date;
  masterName?: string; // Имя мастера для отображения
  masterId?: number; // ID мастера для загрузки данных из API
}

const MasterWorkingDatesDisplay: React.FC<MasterWorkingDatesDisplayProps> = ({
  workingDates: propWorkingDates,
  currentMonth = new Date(),
  masterName,
  masterId
}) => {
  const { branches, currentBranch } = useBranch();

  // Загружаем данные из API, если передан masterId
  const { data: apiWorkingDates, isLoading } = useQuery({
    queryKey: ['master-working-dates', masterId, currentMonth.getMonth() + 1, currentMonth.getFullYear(), currentBranch?.id],
    queryFn: async (): Promise<WorkingDate[]> => {
      if (!masterId || !currentBranch) return [];
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/masters/${masterId}/working-dates?month=${currentMonth.getMonth() + 1}&year=${currentMonth.getFullYear()}&branchId=${currentBranch.id}`
      );
      if (!res.ok) throw new Error('Failed to fetch working dates');
      return res.json();
    },
    enabled: !!masterId && !!currentBranch,
  });

  // Используем данные из API или переданные пропсы
  const rawWorkingDates = masterId ? (apiWorkingDates || []) : (propWorkingDates || []);

  // Нормализуем данные (поддерживаем оба формата API и старые данные)
  const normalizedWorkingDates = React.useMemo(() => {
    return rawWorkingDates.map(wd => ({
      date: wd.date || wd.work_date || '',
      startTime: wd.startTime || wd.start_time || '',
      endTime: wd.endTime || wd.end_time || '',
      branchId: wd.branchId || wd.branch_id || '',
      masterId: wd.masterId
    })).filter(wd => wd.date && wd.branchId) as Array<{
      date: string;
      startTime: string;
      endTime: string;
      branchId: string;
      masterId?: string;
    }>; // Фильтруем только корректные записи
  }, [rawWorkingDates]);

  // Создаем карту филиалов для быстрого поиска
  const branchMap = React.useMemo(() => {
    return branches.reduce((acc, branch) => {
      acc[branch.id.toString()] = branch.branches;
      return acc;
    }, {} as Record<string, string>);
  }, [branches]);

  // Фильтруем рабочие даты для текущего месяца
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  
  const workingDatesInMonth = normalizedWorkingDates.filter(wd => {
    const date = new Date(wd.date);
    return date >= monthStart && date <= monthEnd;
  });

  // Группируем по филиалам
  const groupedByBranch = workingDatesInMonth.reduce((acc, wd) => {
    if (!acc[wd.branchId]) {
      acc[wd.branchId] = [];
    }
    acc[wd.branchId].push(wd);
    return acc;
  }, {} as Record<string, Array<{
    date: string;
    startTime: string;
    endTime: string;
    branchId: string;
    masterId?: string;
  }>>);

  // Показываем индикатор загрузки если загружаем данные из API
  if (masterId && isLoading) {
    return (
      <div className="space-y-2">
        <div className="flex items-center">
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          <span className="text-sm text-muted-foreground">Загрузка рабочих дней...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-start">
        <CalendarDays className="h-4 w-4 mr-2 mt-0.5" />
        <div className="flex-1">
          <span className="font-medium text-sm">
            {masterName && `${masterName}: `}{workingDatesInMonth.length} рабочих дней в {format(currentMonth, 'LLLL')}
          </span>
          {workingDatesInMonth.length === 0 ? (
            <div className="mt-1 text-sm text-gray-500">
              Нет запланированных рабочих дней
            </div>
          ) : (
            <div className="mt-1 space-y-2">
              {Object.entries(groupedByBranch).map(([branchId, dates]) => (
                <div key={branchId} className="text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="text-xs">
                      {branchMap[branchId] || branchId}
                    </Badge>
                    <span className="text-gray-600">
                      {dates.length} {dates.length === 1 ? 'день' : dates.length < 5 ? 'дня' : 'дней'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 ml-2">
                    {dates
                      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      .slice(0, 3)
                      .map(wd => format(new Date(wd.date), 'dd MMM'))
                      .join(', ')}
                    {dates.length > 3 && ` и ещё ${dates.length - 3}`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MasterWorkingDatesDisplay;
