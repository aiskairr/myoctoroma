import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CalendarDays, Plus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useBranch } from "@/contexts/BranchContext";
import { useLocale } from "@/contexts/LocaleContext";
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface WorkingDate {
  work_date: string;
  start_time: string;
  end_time: string;
  branch_id: string;
  is_active: boolean;
}

interface MasterWorkingDatesCalendarProps {
  masterId: number;
  masterName: string;
}

const MasterWorkingDatesCalendar: React.FC<MasterWorkingDatesCalendarProps> = ({ masterId, masterName }) => {
  const { toast } = useToast();
  const { currentBranch } = useBranch();
  const { t } = useLocale();
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDate, setEditingDate] = useState<WorkingDate | null>(null);
  const [formData, setFormData] = useState({
    startTime: '07:00',
    endTime: '23:59'
  });

  // Получаем рабочие даты мастера для текущего месяца
  const { data: workingDates = [], isLoading, refetch } = useQuery<WorkingDate[]>({
    queryKey: ['${import.meta.env.VITE_BACKEND_URL}/api/masters', masterId, 'working-dates', currentMonth.getMonth() + 1, currentMonth.getFullYear(), currentBranch?.id],
    queryFn: async (): Promise<WorkingDate[]> => {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/masters/${masterId}/working-dates?month=${currentMonth.getMonth() + 1}&year=${currentMonth.getFullYear()}&branchId=${currentBranch?.id}`);
      if (!res.ok) throw new Error('Failed to fetch working dates');
      return res.json();
    },
  });

  // Мутация для сохранения рабочей даты
  const saveWorkingDate = useMutation({
    mutationFn: async (data: { workDate: string; startTime: string; endTime: string }) => {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/masters/${masterId}/working-dates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workDate: data.workDate,
          startTime: data.startTime,
          endTime: data.endTime,
          branchId: currentBranch?.id
        }),
      });
      if (!res.ok) throw new Error('Failed to save working date');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t('common.success'), description: t('masters.working_date_saved') });
      refetch();
      setIsDialogOpen(false);
      setSelectedDate(undefined);
      setEditingDate(null);
    },
    onError: () => {
      toast({ title: t('common.error'), description: t('masters.error_saving_working_date'), variant: "destructive" });
    },
  });

  // Мутация для удаления рабочей даты
  const deleteWorkingDate = useMutation({
    mutationFn: async (workDate: string) => {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/masters/${masterId}/working-dates/${workDate}?branchId=${currentBranch?.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete working date');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t('common.success'), description: t('masters.working_date_deleted') });
      refetch();
    },
    onError: () => {
      toast({ title: t('common.error'), description: t('masters.error_deleting_working_date'), variant: "destructive" });
    },
  });

  // Преобразуем даты в объекты Date для календаря
  const workingDateObjects = workingDates.map(wd => new Date(wd.work_date));

  // Обработчик выбора даты в календаре
  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    
    setSelectedDate(date);
    
    // Проверяем, есть ли уже рабочая дата для этого дня
    const dateStr = format(date, 'yyyy-MM-dd');
    const existingDate = workingDates.find(wd => wd.work_date === dateStr);
    
    if (existingDate) {
      setEditingDate(existingDate);
      setFormData({
        startTime: existingDate.start_time,
        endTime: existingDate.end_time
      });
    } else {
      setEditingDate(null);
      setFormData({
        startTime: '07:00',
        endTime: '23:59'
      });
    }
    
    setIsDialogOpen(true);
  };

  // Обработчик сохранения рабочей даты
  const handleSave = () => {
    if (!selectedDate) return;
    
    const workDate = format(selectedDate, 'yyyy-MM-dd');
    saveWorkingDate.mutate({
      workDate,
      startTime: formData.startTime,
      endTime: formData.endTime
    });
  };

  // Обработчик удаления рабочей даты
  const handleDelete = () => {
    if (!selectedDate) return;
    
    const workDate = format(selectedDate, 'yyyy-MM-dd');
    deleteWorkingDate.mutate(workDate);
    setIsDialogOpen(false);
  };

  // Обновляем данные при изменении месяца
  useEffect(() => {
    refetch();
  }, [currentMonth, refetch]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CalendarDays className="h-5 w-5 mr-2" />
            {t('masters.working_dates_title', { masterName })}
          </CardTitle>
          <CardDescription>
            {t('masters.working_dates_description', { month: new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(currentMonth) })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              className="rounded-md border"
              modifiers={{
                working: workingDateObjects,
              }}
              modifiersStyles={{
                working: { backgroundColor: 'hsl(var(--primary))', color: 'white' },
              }}
              locale={ru}
            />
          )}
          
          <div className="mt-4 text-sm text-muted-foreground">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-primary rounded mr-2"></div>
                <span>{t('masters.working_days_legend')}</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-muted rounded mr-2"></div>
                <span>{t('masters.days_off_legend')}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Диалог редактирования рабочей даты */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingDate ? t('masters.edit_working_day') : t('masters.add_working_day')} {t('masters.working_day_label')}
            </DialogTitle>
            <DialogDescription>
              {selectedDate && new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' }).format(selectedDate)}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="startTime" className="text-right">
                {t('masters.work_start_time')}
              </Label>
              <Input
                id="startTime"
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="endTime" className="text-right">
                {t('masters.work_end_time')}
              </Label>
              <Input
                id="endTime"
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                className="col-span-3"
              />
            </div>
          </div>
          
          <DialogFooter>
            {editingDate && (
              <Button 
                variant="destructive" 
                onClick={handleDelete}
                disabled={deleteWorkingDate.isPending}
              >
                {deleteWorkingDate.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {t('masters.deleting')}
                  </>
                ) : (
                  <>
                    <X className="h-4 w-4 mr-2" />
                    {t('common.delete')}
                  </>
                )}
              </Button>
            )}
            <Button 
              onClick={handleSave}
              disabled={saveWorkingDate.isPending}
            >
              {saveWorkingDate.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {t('common.loading')}
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('common.save')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MasterWorkingDatesCalendar;