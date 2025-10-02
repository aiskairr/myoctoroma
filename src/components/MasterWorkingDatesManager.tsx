import React, { useState } from 'react';
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus } from "lucide-react";
import { format, addMonths, startOfMonth, endOfMonth } from "date-fns";
import { ru } from "date-fns/locale";
import { useBranch } from "@/contexts/BranchContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface WorkingDate {
  date: string; // ISO date string
  startTime: string;
  endTime: string;
  branchId: string;
}

interface MasterWorkingDatesManagerProps {
  workingDates: WorkingDate[];
  onWorkingDatesChange: (dates: WorkingDate[]) => void;
}

const MasterWorkingDatesManager: React.FC<MasterWorkingDatesManagerProps> = ({
  workingDates,
  onWorkingDatesChange
}) => {
  const { branches } = useBranch();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [viewMonth, setViewMonth] = useState(new Date());

  // Фильтруем рабочие даты для текущего месяца
  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  
  const workingDatesInMonth = workingDates.filter(wd => {
    const date = new Date(wd.date);
    return date >= monthStart && date <= monthEnd;
  });

  // Получаем массив дат для выделения в календаре
  const workingDays = workingDatesInMonth.map(wd => new Date(wd.date));

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
  };

  const handleAddWorkingDate = () => {
    if (!selectedDate || !selectedBranch) return;

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    
    const newWorkingDate: WorkingDate = {
      date: dateStr,
      startTime: startTime,
      endTime: endTime,
      branchId: selectedBranch
    };
    
    // Проверяем, есть ли уже рабочий день для этой даты и филиала
    const existingIndex = workingDates.findIndex(
      wd => wd.date === dateStr && wd.branchId === newWorkingDate.branchId
    );

    if (existingIndex >= 0) {
      // Обновляем существующую запись
      const updatedDates = [...workingDates];
      updatedDates[existingIndex] = {
        date: dateStr,
        startTime: newWorkingDate.startTime,
        endTime: newWorkingDate.endTime,
        branchId: newWorkingDate.branchId
      };
      onWorkingDatesChange(updatedDates);
    } else {
      // Добавляем новую запись
      onWorkingDatesChange([...workingDates, {
        date: dateStr,
        startTime: newWorkingDate.startTime,
        endTime: newWorkingDate.endTime,
        branchId: newWorkingDate.branchId
      }]);
    }

    // Сброс формы
    setSelectedDate(undefined);
  };

  const handleRemoveWorkingDate = (dateToRemove: string, branchId: string) => {
    const updatedDates = workingDates.filter(
      wd => !(wd.date === dateToRemove && wd.branchId === branchId)
    );
    onWorkingDatesChange(updatedDates);
  };

  const goToPreviousMonth = () => {
    setViewMonth(prev => addMonths(prev, -1));
  };

  const goToNextMonth = () => {
    setViewMonth(prev => addMonths(prev, 1));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Управление рабочими днями</CardTitle>
          <CardDescription>
            Добавьте или удалите рабочие дни для мастера
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Форма добавления рабочего дня */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="branch">Филиал</Label>
                <Select 
                  value={selectedBranch} 
                  onValueChange={setSelectedBranch}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите филиал" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id.toString()}>
                        {branch.branches}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="startTime">Начало</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="endTime">Конец</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>

              <Button 
                onClick={handleAddWorkingDate}
                disabled={!selectedDate || !selectedBranch}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Добавить рабочий день
              </Button>
            </div>

            <div>
              <Label>Выберите дату</Label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                locale={ru}
                className="rounded-md border"
                modifiers={{
                  working: workingDays
                }}
                modifiersStyles={{
                  working: { 
                    backgroundColor: 'hsl(var(--primary))', 
                    color: 'hsl(var(--primary-foreground))' 
                  }
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Список рабочих дней */}
      <Card>
        <CardHeader>
          <CardTitle>
            Рабочие дни в {format(viewMonth, 'LLLL yyyy')}
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
              ← Предыдущий месяц
            </Button>
            <Button variant="outline" size="sm" onClick={goToNextMonth}>
              Следующий месяц →
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {workingDatesInMonth.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Нет рабочих дней в этом месяце
            </p>
          ) : (
            <div className="space-y-2">
              {workingDatesInMonth
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map((wd, index) => {
                  const branch = branches.find(b => b.id.toString() === wd.branchId);
                  return (
                    <div
                      key={`${wd.date}-${wd.branchId}-${index}`}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <Badge variant="outline">
                          {format(new Date(wd.date), 'dd MMM yyyy')}
                        </Badge>
                        <Badge variant="secondary">
                          {branch ? branch.branches : wd.branchId}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {wd.startTime} - {wd.endTime}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveWorkingDate(wd.date, wd.branchId)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MasterWorkingDatesManager;
