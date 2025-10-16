import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Loader2 } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { useBranch } from "@/contexts/BranchContext";
import { getBranchIdWithFallback } from "@/utils/branch-utils";
import { useLocale } from "@/contexts/LocaleContext";

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
  const { t } = useLocale();

  // Функция для склонения слова "дни"
  const getDaysWord = (count: number) => {
    if (count === 1) return t('masters.days_count_1');
    if (count >= 2 && count <= 4) return t('masters.days_count_2_4');
    return t('masters.days_count_5_plus');
  };

  // Загружаем данные из API, если передан masterId
  const { data: apiWorkingDates, isLoading } = useQuery({
    queryKey: ['master-working-dates', masterId, currentMonth.getMonth() + 1, currentMonth.getFullYear(), getBranchIdWithFallback(currentBranch, branches)],
    queryFn: async (): Promise<WorkingDate[]> => {
      if (!masterId) return [];
      const branchId = getBranchIdWithFallback(currentBranch, branches);
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/masters/${masterId}/working-dates?month=${currentMonth.getMonth() + 1}&year=${currentMonth.getFullYear()}&branchId=${branchId}`
      );
      if (!res.ok) throw new Error('Failed to fetch working dates');
      return res.json();
    },
    enabled: !!masterId && !!(currentBranch || branches.length > 0),
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
          <span className="text-sm text-muted-foreground">{t('masters.loading_working_days')}</span>
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
            {masterName && `${masterName}: `}{t('masters.working_days_in_month', { 
              count: workingDatesInMonth.length.toString(), 
              month: format(currentMonth, 'LLLL') 
            })}
          </span>
          {workingDatesInMonth.length === 0 ? (
            <div className="mt-1 text-sm text-gray-500">
              {t('masters.no_scheduled_days')}
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
                      {dates.length} {getDaysWord(dates.length)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 ml-2">
                    {dates
                      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      .slice(0, 3)
                      .map(wd => format(new Date(wd.date), 'dd MMM'))
                      .join(', ')}
                    {dates.length > 3 && ` ${t('masters.and_more_days', { count: (dates.length - 3).toString() })}`}
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
