import React, { useState, useEffect, useMemo } from 'react';
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus, Loader2, RefreshCw } from "lucide-react";
import { format, addMonths, startOfMonth, endOfMonth } from "date-fns";
import { ru } from "date-fns/locale";
import { useBranch } from "@/contexts/BranchContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocale } from '@/contexts/LocaleContext';

interface WorkingDate {
  date: string; // ISO date string
  startTime: string;
  endTime: string;
  branchId: string;
}

// Интерфейс для данных с сервера
interface ServerWorkingDate {
  work_date: string;
  start_time: string;
  end_time: string;
  branch_id: string;
  is_active: boolean;
}

interface MasterWorkingDatesManagerProps {
  masterId: number; // ID мастера - единственный обязательный проп
}

const MasterWorkingDatesManager: React.FC<MasterWorkingDatesManagerProps> = ({
  masterId
}) => {
  const { branches, currentBranch } = useBranch();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useLocale();
  
  // ЛОКАЛЬНОЕ СОСТОЯНИЕ - компонент автономен и управляет своими данными
  const [workingDates, setWorkingDates] = useState<WorkingDate[]>([]);
  
  // Генерируем уникальный ключ для принудительного обновления календаря
  const [calendarKey, setCalendarKey] = useState(Date.now());
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [selectedWorkingDatesToDelete, setSelectedWorkingDatesToDelete] = useState<Set<string>>(new Set());
  const [startTime, setStartTime] = useState('07:00');
  const [endTime, setEndTime] = useState('23:59');
  const [viewMonth, setViewMonth] = useState(new Date());

  // Функция принудительного обновления календаря
  const forceRefreshCalendar = () => {
    setCalendarKey(Date.now());
    console.log('🔄 Force refresh calendar with key:', Date.now());
  };

  // Загружаем рабочие дни с сервера, если передан masterId
  // ВАЖНО: refetchOnMount='always' гарантирует загрузку свежих данных при каждом открытии диалога
  const { data: serverWorkingDates, isLoading: isLoadingServerDates, refetch: refetchWorkingDates } = useQuery<ServerWorkingDate[]>({
    queryKey: ['working-dates', masterId],
    queryFn: async () => {
      if (!masterId) return [];
      console.log('🔄 Fetching working dates for master:', masterId);
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/masters/${masterId}/working-dates`);
      if (!response.ok) {
        throw new Error('Failed to fetch working dates');
      }
      const data = await response.json();
      console.log('✅ Fetched working dates:', data);
      return data;
    },
    enabled: !!masterId,
    refetchOnMount: 'always', // Всегда перезагружать при монтировании
    refetchOnWindowFocus: false, // Не перезагружать при фокусе окна (избегаем лишних запросов)
    staleTime: 0, // Данные всегда считаются устаревшими
  });

  // Функция конвертации данных с сервера в локальный формат
  const convertServerToLocalFormat = (serverDates: ServerWorkingDate[]): WorkingDate[] => {
    return serverDates.map(date => {
      // Парсим дату из ISO формата "2025-11-06T00:00:00.000Z"
      const workDate = new Date(date.work_date);
      
      // Форматируем в yyyy-MM-dd используя UTC методы для корректности
      const year = workDate.getUTCFullYear();
      const month = String(workDate.getUTCMonth() + 1).padStart(2, '0');
      const day = String(workDate.getUTCDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      
      console.log('📅 Converting server date:', {
        original: date.work_date,
        parsed: workDate.toISOString(),
        formatted: dateString
      });
      
      return {
        date: dateString,
        startTime: date.start_time,
        endTime: date.end_time,
        branchId: date.branch_id
      };
    });
  };

  // CRITICAL: Принудительно загружаем данные при монтировании компонента
  useEffect(() => {
    if (masterId) {
      console.log('🚀 Component mounted, fetching working dates for master:', masterId);
      refetchWorkingDates();
    }
  }, [masterId, refetchWorkingDates]);

  // Обновляем локальные данные при получении данных с сервера
  useEffect(() => {
    if (serverWorkingDates && masterId) {
      console.log('📥 Raw server data received:', serverWorkingDates);
      
      const convertedDates = convertServerToLocalFormat(serverWorkingDates);
      
      console.log('✅ Server data converted:', {
        rawCount: serverWorkingDates.length,
        convertedCount: convertedDates.length,
        dates: convertedDates.map(d => d.date)
      });
      
      // Обновляем ЛОКАЛЬНОЕ состояние - компонент автономен
      setWorkingDates(convertedDates);
      
      // Принудительно обновляем календарь при получении новых данных
      forceRefreshCalendar();
      
      console.log('✅ Calendar refreshed with server data');
    }
  }, [serverWorkingDates, masterId]);

  // Мутация для создания/обновления рабочего дня
  const createWorkingDateMutation = useMutation({
    mutationFn: async (data: { workDate: string; startTime: string; endTime: string; branchId: string }) => {
      if (!masterId) {
        throw new Error('Master ID is required');
      }

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/masters/${masterId}/working-dates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
    onSuccess: () => {
      console.log('✅ Working date created, refetching from server...');
      // Принудительно перезагружаем данные с сервера
      refetchWorkingDates();
    },
    onError: (error: Error) => {
      console.error('Failed to save working date:', error);
    }
  });

  // Мутация для удаления рабочего дня
  const deleteWorkingDateMutation = useMutation({
    mutationFn: async (data: { workDate: string; branchId: string }) => {
      if (!masterId) {
        throw new Error('Master ID is required');
      }

      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/masters/${masterId}/working-dates/${data.workDate}?branchId=${data.branchId}`,
        {
          method: 'DELETE',
          credentials: 'include'
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || 'Failed to delete working date');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Рабочий день удален",
        description: "Рабочий день успешно удален",
        variant: "default",
      });

      console.log('✅ Working date deleted, refetching from server...');
      // Принудительно перезагружаем данные с сервера
      refetchWorkingDates();
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

  // Мемоизируем workingDays для стабильности и производительности
  const workingDays = useMemo(() => {
    console.log('🔄 Recalculating workingDays with:', {
      workingDatesCount: workingDates.length,
      calendarKey,
      workingDatesRaw: workingDates
    });
    
    const days = workingDates
      .filter(wd => wd.date) // Убеждаемся что дата существует
      .map(wd => {
        // Парсим строку формата "YYYY-MM-DD"
        const [year, month, day] = wd.date.split('-').map(Number);
        
        // Создаем Date объект используя UTC для избежания проблем с часовыми поясами
        const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
        
        console.log('📅 Converting working date:', {
          original: wd.date,
          parsed: date.toISOString(),
          dateString: date.toDateString()
        });
        
        return date;
      });
    
    console.log('✅ Working days memoized:', {
      totalWorkingDates: workingDates.length,
      totalWorkingDays: days.length,
      dates: days.map(d => d.toISOString().split('T')[0]),
      calendarKey
    });
    
    return days;
  }, [workingDates, calendarKey]); // Зависим от calendarKey для принудительного обновления

  // Отладочное логирование
  useEffect(() => {
    console.log('� Working days state update:', {
      workingDatesCount: workingDates.length,
      workingDaysCount: workingDays.length,
      workingDatesRaw: workingDates,
      workingDaysFormatted: workingDays.map(d => d.toISOString().split('T')[0]),
      workingDaysISO: workingDays.map(d => d.toISOString()),
      calendarKey,
      timestamp: new Date().toISOString()
    });
  }, [workingDates, workingDays, calendarKey]);

  const handleAddWorkingDate = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (selectedDates.length === 0 || !masterId || !currentBranch?.id) {
      toast({
        title: "Не удалось добавить рабочие дни",
        description: "Выберите даты и убедитесь что выбран филиал",
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
        branchId: currentBranch.id.toString()
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
      
      // Принудительно обновляем календарь
      forceRefreshCalendar();
      
      // Сброс формы
      setSelectedDates([]);
      setStartTime('07:00');
      setEndTime('23:59');
      
      console.log('✅ Working days added successfully, calendar refreshed');
    } catch (error) {
      toast({
        title: "Ошибка при сохранении",
        description: `Не удалось сохранить некоторые рабочие дни: ${error}`,
        variant: "destructive",
      });
    }
  };

  const handleRemoveWorkingDate = (dateToRemove: string, branchId: string) => {
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
      workDate: dateToRemove,
      branchId: branchId
    });
  };

  const toggleWorkingDateSelection = (date: string, branchId: string) => {
    const key = `${date}-${branchId}`;
    setSelectedWorkingDatesToDelete(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const handleDeleteSelectedWorkingDates = async () => {
    if (selectedWorkingDatesToDelete.size === 0) {
      toast({
        title: "Ошибка",
        description: "Выберите хотя бы один рабочий день для удаления",
        variant: "destructive",
      });
      return;
    }

    // Подтверждение перед удалением
    if (!window.confirm(`Вы уверены, что хотите удалить ${selectedWorkingDatesToDelete.size} рабочих дней?`)) {
      return;
    }

    // Отправляем DELETE запросы для всех выбранных дней подряд
    try {
      for (const key of Array.from(selectedWorkingDatesToDelete)) {
        // Парсим правильно: key имеет формат "YYYY-MM-DD-branchId"
        const lastDashIndex = key.lastIndexOf('-');
        const dateStr = key.substring(0, lastDashIndex);
        const branchIdStr = key.substring(lastDashIndex + 1);
        
        await deleteWorkingDateMutation.mutateAsync({
          workDate: dateStr,
          branchId: branchIdStr
        });
      }
      
      toast({
        title: "Успех",
        description: `Удалено ${selectedWorkingDatesToDelete.size} рабочих дней`,
        variant: "default",
      });
      
      setSelectedWorkingDatesToDelete(new Set());
      
      // Принудительно обновляем календарь
      forceRefreshCalendar();
      
      console.log('✅ Multiple working days deleted, calendar refreshed');
    } catch (error) {
      toast({
        title: "Ошибка",
        description: `Ошибка при удалении рабочих дней: ${error}`,
        variant: "destructive",
      });
    }
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
          <CardTitle>{t('masters.manage_working_days')}</CardTitle>
          <CardDescription>
            {t('masters.add_remove_days_description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Форма добавления рабочего дня */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-sm font-medium text-blue-900">
                  Филиал: <strong>{currentBranch?.branches || 'Не выбран'}</strong>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="startTime">{t('masters.start_time_field')}</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="endTime">{t('masters.end_time_field')}</Label>
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
                  disabled={selectedDates.length === 0 || !masterId || createWorkingDateMutation.isPending}
                  className="flex-1"
                >
                  {createWorkingDateMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t('masters.saving_status')}
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Добавить {selectedDates.length} {selectedDates.length === 1 ? 'дней' : 'дней'}
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
                    {t('masters.clear_button')}
                  </Button>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>{t('masters.select_dates_instruction')}</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={forceRefreshCalendar}
                  className="h-7 px-2 text-xs"
                  title="Принудительно обновить календарь"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Обновить
                </Button>
              </div>
              <Calendar
                key={`calendar-${calendarKey}-${workingDays.length}`}
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
                    backgroundColor: 'rgb(34 197 94)', // green-500
                    color: 'white',
                    fontWeight: '600',
                    borderRadius: '0.375rem'
                  },
                  selected: {
                    backgroundColor: 'rgb(59 130 246)', // blue-500
                    color: 'white',
                    fontWeight: 'bold',
                    borderRadius: '0.375rem'
                  }
                }}
                modifiersClassNames={{
                  working: 'bg-green-500 text-white font-semibold hover:bg-green-600',
                  selected: 'bg-blue-500 text-white font-bold hover:bg-blue-600'
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
              {/* Легенда для календаря */}
              <div className="mt-3 p-2 bg-gray-50 rounded text-xs space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span className="text-gray-700">Рабочий день</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded"></div>
                  <span className="text-gray-700">Выбранная дата</span>
                </div>
                {/* Отладочная информация */}
                <div className="pt-2 border-t border-gray-200 text-[10px] text-gray-500">
                  <div>Рабочих дней: {workingDays.length}</div>
                  <div>Ключ календаря: {calendarKey}</div>
                  <div>Обновлен: {new Date().toLocaleTimeString()}</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Список рабочих дней */}
      <Card>
        <CardHeader>
          <CardTitle>
            {t('masters.working_days_month', { month: format(viewMonth, 'LLLL yyyy') })}
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
              {t('masters.prev_month_button')}
            </Button>
            <Button variant="outline" size="sm" onClick={goToNextMonth}>
              {t('masters.next_month_button')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingServerDates && masterId ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span className="text-muted-foreground">{t('masters.loading_working_days')}</span>
            </div>
          ) : workingDatesInMonth.length === 0 ? (
            <div className="space-y-4">
              <p className="text-muted-foreground text-center py-4">
                {t('masters.no_days_this_month')}
              </p>
              {masterId && serverWorkingDates && (
                <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
                  {selectedWorkingDatesToDelete.size > 0 && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
                      <span className="text-sm font-medium text-red-900">
                        Выбрано {selectedWorkingDatesToDelete.size} рабочих дней
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedWorkingDatesToDelete(new Set())}
                          className="text-gray-600"
                        >
                          Отменить выбор
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={handleDeleteSelectedWorkingDates}
                          disabled={deleteWorkingDateMutation.isPending}
                        >
                          {deleteWorkingDateMutation.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Удаление...
                            </>
                          ) : (
                            <>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Удалить выбранные
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                  <h4 className="font-medium mb-3">{t('masters.server_data_title', { masterId: masterId?.toString() || '' })}</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {serverWorkingDates.map((date, index) => {
                      const key = `${date.work_date}-${date.branch_id}`;
                      const isSelected = selectedWorkingDatesToDelete.has(key);
                      return (
                        <div 
                          key={index} 
                          className={`flex items-center justify-between p-2 bg-white rounded border text-sm transition-colors ${
                            isSelected ? 'bg-red-50 border-red-300' : ''
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleWorkingDateSelection(date.work_date, date.branch_id)}
                              className="w-4 h-4 rounded cursor-pointer"
                            />
                            <Badge variant="outline" className="text-xs">
                              {format(new Date(date.work_date), 'dd MMM yyyy')}
                            </Badge>
                            <span className="text-muted-foreground">
                              {date.start_time} - {date.end_time}
                            </span>
                            <Badge variant={date.is_active ? "default" : "secondary"} className="text-xs">
                              {t('masters.branch_badge', { branchId: date.branch_id })}
                            </Badge>
                            <Badge variant={date.is_active ? "default" : "destructive"} className="text-xs">
                              {date.is_active ? t('masters.active') : t('masters.inactive')}
                            </Badge>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveWorkingDate(date.work_date, date.branch_id)}
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
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {selectedWorkingDatesToDelete.size > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
                  <span className="text-sm font-medium text-red-900">
                    Выбрано {selectedWorkingDatesToDelete.size} рабочих дней
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedWorkingDatesToDelete(new Set())}
                      className="text-gray-600"
                    >
                      Отменить выбор
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDeleteSelectedWorkingDates}
                      disabled={deleteWorkingDateMutation.isPending}
                    >
                      {deleteWorkingDateMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Удаление...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Удалить выбранные
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                {workingDatesInMonth
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .map((wd, index) => {
                    const branch = branches.find(b => b.id.toString() === wd.branchId);
                    const key = `${wd.date}-${wd.branchId}`;
                    const isSelected = selectedWorkingDatesToDelete.has(key);
                    return (
                      <div
                        key={`${wd.date}-${wd.branchId}-${index}`}
                        className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                          isSelected ? 'bg-red-50 border-red-300' : ''
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleWorkingDateSelection(wd.date, wd.branchId)}
                            className="w-4 h-4 rounded cursor-pointer"
                          />
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MasterWorkingDatesManager;
