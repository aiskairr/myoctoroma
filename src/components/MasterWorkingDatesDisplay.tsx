import React from 'react';
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Clock } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ru } from "date-fns/locale";

interface WorkingDate {
  date: string; // ISO date string
  startTime: string;
  endTime: string;
  branchId: string;
}

interface MasterWorkingDatesDisplayProps {
  workingDates: WorkingDate[];
  currentMonth?: Date;
}

const MasterWorkingDatesDisplay: React.FC<MasterWorkingDatesDisplayProps> = ({
  workingDates,
  currentMonth = new Date()
}) => {
  const branches = {
    'wa1': 'Токтогула 93'
  };

  // Фильтруем рабочие даты для текущего месяца
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  
  const workingDatesInMonth = workingDates.filter(wd => {
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
  }, {} as Record<string, WorkingDate[]>);

  if (workingDatesInMonth.length === 0) {
    return (
      <div className="flex items-center text-gray-500 text-sm">
        <CalendarDays className="h-4 w-4 mr-2" />
        <span>Нет рабочих дней в {format(currentMonth, 'LLLL', { locale: ru })}</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-start">
        <CalendarDays className="h-4 w-4 mr-2 mt-0.5" />
        <div className="flex-1">
          <span className="font-medium text-sm">
            Рабочие дни в {format(currentMonth, 'LLLL', { locale: ru })}:
          </span>
          <div className="mt-1 space-y-2">
            {Object.entries(groupedByBranch).map(([branchId, dates]) => (
              <div key={branchId} className="text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary" className="text-xs">
                    {branches[branchId as keyof typeof branches] || branchId}
                  </Badge>
                  <span className="text-gray-600">
                    {dates.length} {dates.length === 1 ? 'день' : dates.length < 5 ? 'дня' : 'дней'}
                  </span>
                </div>
                <div className="text-xs text-gray-500 ml-2">
                  {dates
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .slice(0, 3)
                    .map(wd => format(new Date(wd.date), 'dd MMM', { locale: ru }))
                    .join(', ')}
                  {dates.length > 3 && ` и ещё ${dates.length - 3}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MasterWorkingDatesDisplay;