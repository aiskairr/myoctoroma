import React, { useState, useEffect } from 'react';
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus, Loader2 } from "lucide-react";
import { format, addMonths, startOfMonth, endOfMonth } from "date-fns";
import { ru } from "date-fns/locale";
import { useBranch } from "@/contexts/BranchContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface WorkingDate {
  id?: number;
  date: string; // ISO date string
  startTime: string;
  endTime: string;
  branchId: string;
}

// Интерфейс для данных с сервера
interface ServerWorkingDate {
  id?: number;
  work_date: string;
  start_time: string;
  end_time: string;
  branch_id: string;
  is_active: boolean;
}

interface MasterWorkingDatesManagerProps {
  workingDates: WorkingDate[];
  onWorkingDatesChange: (dates: WorkingDate[]) => void;
  masterId?: number; // Добавляем ID мастера для загрузки данных с сервера
}

const MasterWorkingDatesManager: React.FC<MasterWorkingDatesManagerProps> = ({
  workingDates,
  onWorkingDatesChange,
  masterId
}) => {
  const { branches, currentBranch } = useBranch();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [viewMonth, setViewMonth] = useState(new Date());

  // Загружаем рабочие дни с сервера, если передан masterId
  const { data: serverWorkingDates, isLoading: isLoadingServerDates } = useQuery<ServerWorkingDate[] | { data: ServerWorkingDate[] }>({
    queryKey: [`working-dates?staffId=${masterId}&branchId=${currentBranch?.id}`],
    queryFn: async () => {
      if (!masterId) return [];
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${import.meta.env.VITE_SECONDARY_BACKEND_URL}/working-dates?staffId=${masterId}&branchId=${currentBranch?.id}`, {
        headers: {
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch working dates');
      }
      const result = await response.json();
      if (Array.isArray(result)) return result;
      if (result && Array.isArray((result as any).data)) return (result as any).data;
      return [];
    },
    enabled: !!masterId,
  });

  // Функция конвертации данных с сервера в локальный формат
  const convertServerToLocalFormat = (serverDates: ServerWorkingDate[] | { data: ServerWorkingDate[] }): WorkingDate[] => {
    const dates = Array.isArray(serverDates) ? serverDates : serverDates?.data || [];
    return dates.map(date => ({
      id: date.id,
      date: format(new Date(date.work_date), 'yyyy-MM-dd'),
      startTime: date.start_time,
      endTime: date.end_time,
      branchId: date.branch_id?.toString?.() || ''
    }));
  };

  // Обновляем локальные данные при получении данных с сервера
  useEffect(() => {
    if (serverWorkingDates && masterId) {
      const convertedDates = convertServerToLocalFormat(serverWorkingDates);
      onWorkingDatesChange(convertedDates);
    }
  }, [serverWorkingDates, masterId, onWorkingDatesChange]);

  // Мутация для создания/обновления рабочего дня
  const createWorkingDateMutation = useMutation({
    mutationFn: async (data: { workDate: string; startTime: string; endTime: string; branchId: string }) => {
      if (!masterId) {
        throw new Error('Master ID is required');
      }

      const authToken = localStorage.getItem('auth_token');
      const branchParam = data.branchId || currentBranch?.id;

      const response = await fetch(`${import.meta.env.VITE_SECONDARY_BACKEND_URL}/working-dates/${masterId}?branchId=${branchParam}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify(data),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || 'Failed to save working date');
      }

      return response.json();
    },
    onError: (error: Error) => {
      console.error('Failed to save working date:', error);
    }
  });

  // Мутация для удаления рабочего дня
  const deleteWorkingDateMutation = useMutation({
    mutationFn: async (data: { workDate: string; branchId: string; id?: string | number }) => {
      if (!masterId) {
        throw new Error('Master ID is required');
      }

      const authToken = localStorage.getItem('auth_token');

      const response = await fetch(
        `${import.meta.env.VITE_SECONDARY_BACKEND_URL}/working-dates/${data.id || data.workDate}?branchId=${data.branchId}`,
        {
          method: 'DELETE',
          headers: {
            ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
          },
          credentials: 'include'
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || 'Failed to delete working date');
      }

      return response.json();
    },
    onSuccess: (_data, variables) => {
      // Мгновенно убираем дату из UI
      onWorkingDatesChange(
        workingDates.filter(wd => {
          if (variables.id) return wd.id !== Number(variables.id);
          return !(wd.date === variables.workDate && wd.branchId === variables.branchId);
        })
      );

      toast({
        title: "Рабочий день удален",
        description: "Рабочий день успешно удален",
        variant: "default",
      });

      // Обновляем данные с сервера
      queryClient.invalidateQueries({ queryKey: [`working-dates?staffId=${masterId}&branchId=${currentBranch?.id}`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка при удалении",
        description: `Не удалось удалить рабочий день: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Фильтруем рабочие даты для текущего месяца
  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  
  const workingDatesInMonth = workingDates.filter(wd => {
    const date = new Date(wd.date);
    return date >= monthStart && date <= monthEnd;
  });

  // Получаем массив дат для выделения в календаре
  const workingDays = workingDatesInMonth.map(wd => new Date(wd.date));

  const handleAddWorkingDate = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (selectedDates.length === 0 || !selectedBranch || !masterId) {
      toast({
        title: "Заполните все поля",
        description: "Выберите даты, филиал и убедитесь что выбран мастер",
        variant: "destructive",
      });
      return;
    }

    // Отправляем POST запросы для всех выбранных дат
    const promises = selectedDates.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      return createWorkingDateMutation.mutateAsync({
        workDate: dateStr,
        startTime: startTime,
        endTime: endTime,
        branchId: selectedBranch
      });
    });

    try {
      await Promise.all(promises);
      
      toast({
        title: "Рабочие дни добавлены",
        description: `Успешно добавлено ${selectedDates.length} рабочих дней`,
        variant: "default",
      });

      // Обновляем данные с сервера
      queryClient.invalidateQueries({ queryKey: ['working-dates', masterId] });
      
      // Сброс формы
      setSelectedDates([]);
      setStartTime('07:00');
      setEndTime('23:59');
    } catch (error) {
      toast({
        title: "Ошибка при сохранении",
        description: `Не удалось сохранить некоторые рабочие дни: ${error}`,
        variant: "destructive",
      });
    }
  };

  const handleRemoveWorkingDate = (dateToRemove: string, branchId: string, id?: string | number) => {
    if (!masterId) {
      toast({
        title: "Ошибка",
        description: "Не удалось определить мастера",
        variant: "destructive",
      });
      return;
    }

    // Отправляем DELETE запрос на сервер
    deleteWorkingDateMutation.mutate({
      id,
      workDate: dateToRemove,
      branchId: branchId
    });
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
                        {branch.name}
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

              <div className="flex gap-2">
                <Button 
                  type="button"
                  onClick={handleAddWorkingDate}
                  disabled={selectedDates.length === 0 || !selectedBranch || !masterId || createWorkingDateMutation.isPending}
                  className="flex-1"
                >
                  {createWorkingDateMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Сохранение...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Добавить рабочие дни ({selectedDates.length})
                    </>
                  )}
                </Button>
                
                {selectedDates.length > 0 && (
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => setSelectedDates([])}
                    disabled={createWorkingDateMutation.isPending}
                  >
                    Очистить
                  </Button>
                )}
              </div>
            </div>

            <div>
              <Label>Выберите даты (можно выбрать несколько)</Label>
              <Calendar
                mode="multiple"
                selected={selectedDates}
                onSelect={(dates) => setSelectedDates(dates || [])}
                locale={ru}
                className="rounded-md border"
                modifiers={{
                  working: workingDays,
                  selected: selectedDates
                }}
                modifiersStyles={{
                  working: { 
                    backgroundColor: 'hsl(var(--primary))', 
                    color: 'hsl(var(--primary-foreground))' 
                  },
                  selected: {
                    backgroundColor: 'hsl(var(--secondary))',
                    color: 'hsl(var(--secondary-foreground))',
                    fontWeight: 'bold'
                  }
                }}
              />
              {selectedDates.length > 0 && (
                <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                  <p className="font-medium">Выбрано дат: {selectedDates.length}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedDates.map((date, index) => (
                      <span key={index} className="px-2 py-1 bg-blue-100 rounded text-xs">
                        {format(date, 'dd.MM.yyyy')}
                      </span>
                    ))}
                  </div>
                </div>
              )}
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
          {isLoadingServerDates && masterId ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span className="text-muted-foreground">Загрузка рабочих дней...</span>
            </div>
          ) : workingDatesInMonth.length === 0 ? (
            <div className="space-y-4">
              <p className="text-muted-foreground text-center py-4">
                Нет рабочих дней в этом месяце
              </p>
              {masterId && serverWorkingDates && (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <h4 className="font-medium mb-3">Данные с сервера для мастера #{masterId}:</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {serverWorkingDates.map((date, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-white rounded border text-sm">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs">
                            {format(new Date(date.work_date), 'dd MMM yyyy')}
                          </Badge>
                          <span className="text-muted-foreground">
                            {date.start_time} - {date.end_time}
                          </span>
                          <Badge variant={date.is_active ? "default" : "secondary"} className="text-xs">
                            Филиал {date.branch_id}
                          </Badge>
                          <Badge variant={date.is_active ? "default" : "destructive"} className="text-xs">
                            {date.is_active ? "Активен" : "Неактивен"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {workingDatesInMonth
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map((wd, index) => {
                  const branch = branches.find(b => b.id.toString() === wd.branchId);
                  return (
                    <div
                      key={`${wd.id || wd.date}-${wd.branchId}-${index}`}
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
                        onClick={() => handleRemoveWorkingDate(wd.date, wd.branchId, wd.id)}
                        disabled={deleteWorkingDateMutation.isPending}
                        className="text-destructive hover:text-destructive"
                      >
                        {deleteWorkingDateMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
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
