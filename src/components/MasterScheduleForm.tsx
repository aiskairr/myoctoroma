import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { useBranch } from "@/contexts/BranchContext";
// Интерфейс для расписания мастера
export interface MasterSchedule {
  branch: string;  // Филиал (wa1)
  days: string[];  // Дни недели ["Mon", "Wed", "Fri"]
  from: string;    // Время начала "10:00"
  to: string;      // Время окончания "14:00"
}

// Перевод дней недели для отображения
const WEEKDAYS_MAP: Record<string, string> = {
  'Mon': 'Пн',
  'Tue': 'Вт',
  'Wed': 'Ср',
  'Thu': 'Чт',
  'Fri': 'Пт',
  'Sat': 'Сб',
  'Sun': 'Вс',
};

// Интерфейс для дня недели
interface WeekDay {
  id: string;
  label: string;
}

// Список всех дней недели
const WEEKDAYS: WeekDay[] = [
  { id: 'Mon', label: 'Понедельник' },
  { id: 'Tue', label: 'Вторник' },
  { id: 'Wed', label: 'Среда' },
  { id: 'Thu', label: 'Четверг' },
  { id: 'Fri', label: 'Пятница' },
  { id: 'Sat', label: 'Суббота' },
  { id: 'Sun', label: 'Воскресенье' },
];

// Интерфейс для филиала
interface Branch {
  id: string;
  label: string;
}

// Список филиалов
const BRANCHES: Branch[] = [
  { id: 'wa1', label: 'Токтогула 93 (wa1)' },
];

// Компонент для форматирования расписания в текстовый вид
export const formatSchedule = (schedule: MasterSchedule): string => {
  const days = schedule.days.map(day => WEEKDAYS_MAP[day]).join(', ');
  return `${days} — ${BRANCHES.find(b => b.id === schedule.branch)?.label.split(' ')[0]} ${schedule.from}–${schedule.to}`;
};

// Пустая схема расписания
const EMPTY_SCHEDULE: MasterSchedule = {
  branch: '',
  days: [],
  from: '10:00',
  to: '18:00',
};

interface MasterScheduleFormProps {
  schedules: MasterSchedule[];
  onChange: (schedules: MasterSchedule[]) => void;
}

const MasterScheduleForm: React.FC<MasterScheduleFormProps> = ({ schedules, onChange }) => {
  const { currentBranch } = useBranch();
  
  // Создаем пустую схему с текущим филиалом
  const getEmptySchedule = (): MasterSchedule => ({
    ...EMPTY_SCHEDULE,
    branch: currentBranch.waInstance
  });
  
  // Локальное состояние для редактирования расписаний
  const [editingSchedules, setEditingSchedules] = useState<MasterSchedule[]>(
    schedules.length > 0 ? schedules : [getEmptySchedule()]
  );
  
  // При изменении филиала в контексте, обновляем пустые расписания
  useEffect(() => {
    // Обновляем только пустые филиалы в расписаниях
    const updatedSchedules = editingSchedules.map(schedule => 
      schedule.branch === '' ? { ...schedule, branch: currentBranch.waInstance } : schedule
    );
    
    if (JSON.stringify(updatedSchedules) !== JSON.stringify(editingSchedules)) {
      setEditingSchedules(updatedSchedules);
      onChange(updatedSchedules);
    }
  }, [currentBranch]);

  // Обработчик изменения филиала
  const handleBranchChange = (value: string, index: number) => {
    const newSchedules = [...editingSchedules];
    newSchedules[index] = {
      ...newSchedules[index],
      branch: value
    };
    setEditingSchedules(newSchedules);
    onChange(newSchedules);
  };

  // Обработчик изменения дня недели (множественный выбор)
  const handleDayToggle = (checked: boolean | string, day: string, index: number) => {
    const newSchedules = [...editingSchedules];
    let newDays: string[];
    
    if (checked) {
      // Добавляем день, если его еще нет
      newDays = [...(newSchedules[index].days || [])];
      if (!newDays.includes(day)) {
        newDays.push(day);
      }
    } else {
      // Удаляем день
      newDays = (newSchedules[index].days || []).filter((d: string) => d !== day);
    }
    
    // Обновляем расписание, создавая новый объект
    newSchedules[index] = {
      ...newSchedules[index],
      days: newDays
    };
    
    setEditingSchedules(newSchedules);
    onChange(newSchedules);
  };

  // Обработчик изменения времени
  const handleTimeChange = (value: string, field: 'from' | 'to', index: number) => {
    const newSchedules = [...editingSchedules];
    newSchedules[index] = {
      ...newSchedules[index],
      [field]: value
    };
    setEditingSchedules(newSchedules);
    onChange(newSchedules);
  };

  // Добавление нового расписания
  const addSchedule = () => {
    const newSchedules = [...editingSchedules, getEmptySchedule()];
    setEditingSchedules(newSchedules);
    onChange(newSchedules);
  };

  // Удаление расписания
  const removeSchedule = (index: number) => {
    if (editingSchedules.length <= 1) return; // Всегда оставляем хотя бы одно расписание
    
    const newSchedules = editingSchedules.filter((_, i) => i !== index);
    setEditingSchedules(newSchedules);
    onChange(newSchedules);
  };

  return (
    <div className="space-y-4">
      <Label className="text-base">График работы</Label>
      
      {editingSchedules.map((schedule, index) => (
        <Card key={index} className="shadow-sm">
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Выбор филиала */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor={`branch-${index}`} className="col-span-1">
                  Филиал
                </Label>
                <div className="col-span-3">
                  <Select
                    value={schedule.branch}
                    onValueChange={(value) => handleBranchChange(value, index)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите филиал" />
                    </SelectTrigger>
                    <SelectContent>
                      {BRANCHES.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Выбор дней недели */}
              <div className="grid grid-cols-4 items-start gap-4">
                <Label className="col-span-1 pt-2">
                  Дни недели
                </Label>
                <div className="col-span-3 grid grid-cols-2 gap-2">
                  {WEEKDAYS.map((day) => (
                    <div key={day.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`day-${day.id}-${index}`}
                        checked={schedule.days.includes(day.id)}
                        onCheckedChange={(checked) => handleDayToggle(checked, day.id, index)}
                      />
                      <Label htmlFor={`day-${day.id}-${index}`} className="cursor-pointer">
                        {day.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Выбор времени работы */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor={`time-${index}`} className="col-span-1">
                  Время работы
                </Label>
                <div className="col-span-3 flex items-center space-x-2">
                  <Input
                    id={`time-from-${index}`}
                    type="time"
                    value={schedule.from}
                    onChange={(e) => handleTimeChange(e.target.value, 'from', index)}
                    className="w-24"
                  />
                  <span>до</span>
                  <Input
                    id={`time-to-${index}`}
                    type="time"
                    value={schedule.to}
                    onChange={(e) => handleTimeChange(e.target.value, 'to', index)}
                    className="w-24"
                  />
                  
                  {/* Кнопка удаления этого расписания */}
                  {editingSchedules.length > 1 && (
                    <Button 
                      type="button"
                      variant="ghost" 
                      size="icon" 
                      className="ml-auto text-destructive"
                      onClick={() => removeSchedule(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Кнопка добавления нового расписания */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addSchedule}
        className="w-full mt-2"
      >
        <Plus className="h-4 w-4 mr-2" />
        Добавить график работы
      </Button>
    </div>
  );
};

export default MasterScheduleForm;