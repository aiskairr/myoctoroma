import React, { useState, useEffect } from 'react';
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus } from "lucide-react";
import { format, addMonths, startOfMonth, endOfMonth, isSameDay } from "date-fns";
import { ru } from "date-fns/locale";

interface WorkingDate {
  date: string; // ISO date string
  startTime: string;
  endTime: string;
  branchId: string;
}

interface MasterWorkingDatesManagerProps {
  masterId?: number;
  workingDates: WorkingDate[];
  onWorkingDatesChange: (dates: WorkingDate[]) => void;
  currentMonth?: Date;
}

const MasterWorkingDatesManager: React.FC<MasterWorkingDatesManagerProps> = ({
  masterId,
  workingDates,
  onWorkingDatesChange,
  currentMonth = new Date()
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [newWorkingDate, setNewWorkingDate] = useState({
    startTime: '09:00',
    endTime: '18:00',
    branchId: 'wa1'
  });
  const [viewMonth, setViewMonth] = useState(currentMonth);

  // Фильтруем рабочие даты для текущего месяца
  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  
  const workingDatesInMonth = workingDates.filter(wd => {
    const date = new Date(wd.date);
    return date >= monthStart && date <= monthEnd;
  });

  // Получаем массив дат для выделения в календаре
  const workingDays = workingDatesInMonth.map(wd => new Date(wd.date));

  const branches = [
    { id: 'wa1', name: 'Токтогула 93' }
  ];

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
  };

  const handleAddWorkingDate = () => {
    if (!selectedDate) return;

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    
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
      const newDate: WorkingDate = {
        date: dateStr,
        startTime: newWorkingDate.startTime,
        endTime: newWorkingDate.endTime,
        branchId: newWorkingDate.branchId
      };
      onWorkingDatesChange([...workingDates, newDate]);
    }

    setSelectedDate(undefined);
  };

  const handleRemoveWorkingDate = (dateStr: string, branchId: string) => {
    const updatedDates = workingDates.filter(
      wd => !(wd.date === dateStr && wd.branchId === branchId)
    );
    onWorkingDatesChange(updatedDates);
  };

  const handlePrevMonth = () => {
    setViewMonth(prev => addMonths(prev, -1));
  };

  const handleNextMonth = () => {
    setViewMonth(prev => addMonths(prev, 1));
  };

  return (
    <div className="space-y-6">
      {/* Навигация по месяцам */}
      <div className="flex items-center justify-between">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handlePrevMonth}
        >
          ← Предыдущий месяц
        </Button>
        <h3 className="text-lg font-medium">
          {format(viewMonth, 'LLLL yyyy', { locale: ru })}
        </h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleNextMonth}
        >
          Следующий месяц →
        </Button>
      </div>

      <div className="flex flex-col space-y-6">
        {/* Форма добавления рабочего дня - сверху */}
        <Card>
          <CardHeader>
            <CardTitle>Добавление рабочих дней</CardTitle>
            <CardDescription>
              Выберите дату и добавьте рабочие часы для нужного филиала
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedDate && (
              <div className="p-4 border rounded-lg bg-gray-50">
                <h4 className="font-medium mb-3">
                  Рабочий день {format(selectedDate, 'dd MMMM yyyy', { locale: ru })}
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Филиал</Label>
                    <select 
                      value={newWorkingDate.branchId}
                      onChange={(e) => setNewWorkingDate(prev => ({ ...prev, branchId: e.target.value }))}
                      className="w-full p-2 border rounded-md"
                    >
                      {branches.map(branch => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <Label>Начало работы</Label>
                    <Input
                      type="time"
                      value={newWorkingDate.startTime}
                      onChange={(e) => setNewWorkingDate(prev => ({ ...prev, startTime: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Конец работы</Label>
                    <Input
                      type="time"
                      value={newWorkingDate.endTime}
                      onChange={(e) => setNewWorkingDate(prev => ({ ...prev, endTime: e.target.value }))}
                    />
                  </div>
                </div>
                
                <Button 
                  onClick={handleAddWorkingDate}
                  size="sm"
                  className="w-full mt-4"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить рабочий день
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Календарь - в центре */}
        <Card>
          <CardHeader>
            <CardTitle>Календарь</CardTitle>
            <CardDescription>
              Выберите дату для добавления рабочего дня
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              modifiers={{
                working: workingDays
              }}
              modifiersStyles={{
                working: { backgroundColor: '#dcfce7', color: '#166534' }
              }}
              month={viewMonth}
              onMonthChange={setViewMonth}
              locale={ru}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        {/* Список рабочих дней - снизу */}
        <Card>
          <CardHeader>
            <CardTitle>Рабочие дни в этом месяце</CardTitle>
            <CardDescription>
              {workingDatesInMonth.length} рабочих дней
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {workingDatesInMonth.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  Нет рабочих дней в этом месяце
                </p>
              ) : (
                workingDatesInMonth
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .map((workingDate, index) => {
                    const branch = branches.find(b => b.id === workingDate.branchId);
                    return (
                      <div 
                        key={`${workingDate.date}-${workingDate.branchId}`}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <div className="font-medium">
                            {format(new Date(workingDate.date), 'dd MMM, EEEE', { locale: ru })}
                          </div>
                          <div className="text-sm text-gray-600">
                            {workingDate.startTime} - {workingDate.endTime}
                          </div>
                          <Badge variant="secondary" className="text-xs mt-1">
                            {branch?.name || workingDate.branchId}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveWorkingDate(workingDate.date, workingDate.branchId)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MasterWorkingDatesManager;