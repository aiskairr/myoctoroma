import React, { useState, useEffect, useMemo } from 'react';
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus, Loader2, RefreshCw } from "lucide-react";
import { format } from "date-fns";
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
  onUnsavedDatesChange?: (hasUnsavedDates: boolean, count: number) => void; // Колбэк для отслеживания несохранённых дат
}

const MasterWorkingDatesManager: React.FC<MasterWorkingDatesManagerProps> = ({
  masterId,
  onUnsavedDatesChange
}) => {
  const { currentBranch } = useBranch();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useLocale();
  
  // ЛОКАЛЬНОЕ СОСТОЯНИЕ - компонент автономен и управляет своими данными
  const [workingDates, setWorkingDates] = useState<WorkingDate[]>([]);
  
  // Генерируем уникальный ключ для принудительного обновления календаря
  const [calendarKey, setCalendarKey] = useState(Date.now());
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [startTime, setStartTime] = useState('07:00');
  const [endTime, setEndTime] = useState('23:59');

  // Функция принудительного обновления календаря
  const forceRefreshCalendar = () => {
    setCalendarKey(Date.now());
    console.log('🔄 Force refresh calendar with key:', Date.now());
  };

  // Загружаем рабочие дни с сервера, если передан masterId
  // ВАЖНО: refetchOnMount='always' гарантирует загрузку свежих данных при каждом открытии диалога
  const { data: serverWorkingDates, refetch: refetchWorkingDates } = useQuery<ServerWorkingDate[]>({
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

  // Разделяем выбранные даты на новые (для добавления) и существующие (для удаления)
  const { newDatesToAdd, existingDatesToDelete } = useMemo(() => {
    const workingDatesSet = new Set(workingDates.map(wd => wd.date));
    
    const newDates: Date[] = [];
    const existingDates: Date[] = [];
    
    selectedDates.forEach(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      if (workingDatesSet.has(dateStr)) {
        existingDates.push(date);
      } else {
        newDates.push(date);
      }
    });
    
    return {
      newDatesToAdd: newDates,
      existingDatesToDelete: existingDates
    };
  }, [selectedDates, workingDates]);

  // Уведомляем родительский компонент о несохранённых датах (только новые, не существующие)
  useEffect(() => {
    if (onUnsavedDatesChange) {
      onUnsavedDatesChange(newDatesToAdd.length > 0, newDatesToAdd.length);
    }
  }, [newDatesToAdd.length, onUnsavedDatesChange]);

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
    
    // Используем только новые даты (не существующие)
    if (newDatesToAdd.length === 0 || !masterId || !currentBranch?.id) {
      toast({
        title: "Не удалось добавить рабочие дни",
        description: newDatesToAdd.length === 0 ? "Выберите новые даты для добавления" : "Убедитесь что выбран филиал",
        variant: "destructive",
      });
      return;
    }

    // Отправляем POST запросы только для новых дат
    const promises = newDatesToAdd.map(date => {
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
        description: `Успешно добавлено ${newDatesToAdd.length} рабочих дней`,
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

  // Функция для удаления выбранных существующих дат (через календарь)
  const handleDeleteExistingDatesFromCalendar = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (existingDatesToDelete.length === 0 || !masterId || !currentBranch?.id) {
      toast({
        title: "Не удалось удалить рабочие дни",
        description: "Выберите существующие даты для удаления",
        variant: "destructive",
      });
      return;
    }

    // Подтверждение перед удалением
    if (!window.confirm(`Вы уверены, что хотите удалить ${existingDatesToDelete.length} рабочих дней?`)) {
      return;
    }

    // Отправляем DELETE запросы для всех выбранных существующих дат
    try {
      for (const date of existingDatesToDelete) {
        const dateStr = format(date, 'yyyy-MM-dd');
        await deleteWorkingDateMutation.mutateAsync({
          workDate: dateStr,
          branchId: currentBranch.id.toString()
        });
      }
      
      toast({
        title: "Рабочие дни удалены",
        description: `Успешно удалено ${existingDatesToDelete.length} рабочих дней`,
        variant: "default",
      });

      // Обновляем данные с сервера
      queryClient.invalidateQueries({ queryKey: ['working-dates', masterId] });
      
      // Принудительно обновляем календарь
      forceRefreshCalendar();
      
      // Сброс выбора
      setSelectedDates([]);
      
      console.log('✅ Working days deleted successfully, calendar refreshed');
    } catch (error) {
      toast({
        title: "Ошибка при удалении",
        description: `Не удалось удалить некоторые рабочие дни: ${error}`,
        variant: "destructive",
      });
    }
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

              <div className="flex flex-col gap-2">
                {/* Кнопка добавления новых дат */}
                {newDatesToAdd.length > 0 && (
                  <Button 
                    type="button"
                    onClick={handleAddWorkingDate}
                    disabled={!masterId || createWorkingDateMutation.isPending || deleteWorkingDateMutation.isPending}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {createWorkingDateMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t('masters.saving_status')}
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Добавить {newDatesToAdd.length} {newDatesToAdd.length === 1 ? 'день' : 'дней'}
                      </>
                    )}
                  </Button>
                )}
                
                {/* Кнопка удаления существующих дат */}
                {existingDatesToDelete.length > 0 && (
                  <Button 
                    type="button"
                    variant="destructive"
                    onClick={handleDeleteExistingDatesFromCalendar}
                    disabled={!masterId || deleteWorkingDateMutation.isPending || createWorkingDateMutation.isPending}
                    className="w-full"
                  >
                    {deleteWorkingDateMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Удаление...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Удалить {existingDatesToDelete.length} {existingDatesToDelete.length === 1 ? 'день' : 'дней'}
                      </>
                    )}
                  </Button>
                )}
                
                {/* Кнопка очистки выбора */}
                {selectedDates.length > 0 && (
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => setSelectedDates([])}
                    disabled={createWorkingDateMutation.isPending || deleteWorkingDateMutation.isPending}
                    className="w-full"
                  >
                    {t('masters.clear_button')} ({selectedDates.length})
                  </Button>
                )}

                {/* Подсказка когда ничего не выбрано */}
                {selectedDates.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-2">
                    Выберите даты в календаре. Зелёные — уже добавленные дни.
                  </p>
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
    </div>
  );
};

export default MasterWorkingDatesManager;
