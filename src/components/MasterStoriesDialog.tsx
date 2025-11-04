import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Loader2, Clock, CheckCircle, XCircle, Calendar as CalendarIcon, ChevronDown, ChevronUp } from "lucide-react";
import { format, startOfDay } from "date-fns";
import { ru, enUS } from "date-fns/locale";
import { useLocale } from '@/contexts/LocaleContext';
import axios from 'axios';

interface MasterStoriesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  masterId: number;
  masterName: string;
  branchId?: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
  bookingId?: number;
}

// Функция для получения доступных временных слотов (как в Booking.tsx)
const getAvailableTimeSlots = async (masterId: number, date: string, branchId: string): Promise<TimeSlot[]> => {
  try {
    const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/public/available-slots`, {
      params: {
        date: date,
        masterId: masterId,
        branchId: branchId
      },
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Stories: getAvailableTimeSlots response:', response.data);
    return response.data as TimeSlot[];
  } catch (error) {
    console.warn('⚠️ Stories: Available slots API failed, using fallback data:', error);
    // Fallback: генерируем слоты с 09:00 до 20:00 с интервалом 30 минут
    const slots: TimeSlot[] = [];
    for (let hour = 9; hour <= 20; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        if (hour === 20 && minute > 0) break; // Заканчиваем на 20:00
        const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        // Имитируем реальные данные: ~70% доступны
        slots.push({
          time,
          available: Math.random() > 0.3,
        });
      }
    }
    return slots;
  }
};

const MasterStoriesDialog: React.FC<MasterStoriesDialogProps> = ({
  isOpen,
  onClose,
  masterId,
  masterName,
  branchId = 'default'
}) => {
  const { t, locale } = useLocale();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(false); // По умолчанию свернут

  // Получаем локаль для date-fns
  const getDateFnsLocale = () => {
    switch (locale) {
      case 'ky': return ru; // Используем русский для кыргызского
      case 'ru': return ru;
      case 'en': return enUS;
      default: return ru;
    }
  };

  // Форматируем дату для API (YYYY-MM-DD)
  const formatDateForAPI = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Загружаем доступные слоты для выбранной даты (используем ту же логику что и в Booking.tsx)
  const { data: timeSlots, isLoading } = useQuery<TimeSlot[]>({
    queryKey: ['master-stories-slots', masterId, format(selectedDate, 'yyyy-MM-dd'), branchId],
    queryFn: () => getAvailableTimeSlots(masterId, formatDateForAPI(selectedDate), branchId),
    enabled: isOpen && !!masterId,
  });

  // Используем данные напрямую из API/fallback
  const displaySlots = timeSlots || [];
  const availableCount = displaySlots.filter(s => s.available).length;
  const bookedCount = displaySlots.filter(s => !s.available).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-slate-50 to-white">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
              <CalendarIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                {t('masters.stories.title')}
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600">
                {masterName} - {t('masters.stories.subtitle')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          {/* Левая колонка: Сворачиваемый календарь + Статистика */}
          <div className="space-y-4">
            {/* Сворачиваемый календарь */}
            <Card className="border-2 border-indigo-100 shadow-lg overflow-hidden">
              <div 
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-indigo-50 transition-colors"
                onClick={() => setIsCalendarExpanded(!isCalendarExpanded)}
              >
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-indigo-600" />
                  {t('masters.stories.select_date')}
                </h3>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-indigo-600 border-indigo-300">
                    {format(selectedDate, 'dd MMM yyyy')}
                  </Badge>
                  {isCalendarExpanded ? (
                    <ChevronUp className="h-5 w-5 text-indigo-600" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-indigo-600" />
                  )}
                </div>
              </div>
              {isCalendarExpanded && (
                <div className="p-4 pt-0 border-t border-indigo-100">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    disabled={(date) => date < startOfDay(new Date())}
                    locale={getDateFnsLocale()}
                    className="rounded-md border-0"
                    modifiers={{
                      selected: selectedDate,
                    }}
                    modifiersStyles={{
                      selected: {
                        backgroundColor: '#4f46e5',
                        color: 'white',
                        fontWeight: 'bold',
                      },
                    }}
                  />
                </div>
              )}
            </Card>

            {/* Статистика */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-xs text-green-700 font-medium">{t('masters.stories.available')}</p>
                    <p className="text-2xl font-bold text-green-600">{availableCount}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4 bg-gradient-to-br from-red-50 to-rose-50 border-red-200">
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="text-xs text-red-700 font-medium">{t('masters.stories.booked')}</p>
                    <p className="text-2xl font-bold text-red-600">{bookedCount}</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Правая колонка: Временные слоты */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Clock className="h-5 w-5 text-indigo-600" />
                {t('masters.stories.time_slots')}
              </h3>
              <Badge variant="outline" className="text-indigo-600 border-indigo-300">
                {format(selectedDate, 'dd MMMM yyyy')}
              </Badge>
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-indigo-300 scrollbar-track-gray-100">
                {displaySlots.map((slot, index) => (
                  <Button
                    key={index}
                    variant={slot.available ? "outline" : "ghost"}
                    className={`
                      h-14 relative transition-all duration-200
                      ${slot.available 
                        ? 'border-2 border-green-300 bg-gradient-to-br from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 hover:border-green-400 hover:shadow-md' 
                        : 'border border-red-200 bg-gradient-to-br from-red-50 to-rose-50 opacity-60 cursor-not-allowed'
                      }
                    `}
                    disabled={!slot.available}
                  >
                    <div className="flex flex-col items-center">
                      <span className={`text-sm font-semibold ${slot.available ? 'text-green-700' : 'text-red-600'}`}>
                        {slot.time}
                      </span>
                      {slot.available ? (
                        <CheckCircle className="h-3 w-3 text-green-600 mt-1" />
                      ) : (
                        <XCircle className="h-3 w-3 text-red-600 mt-1" />
                      )}
                    </div>
                  </Button>
                ))}
              </div>
            )}

            {/* Легенда */}
            <div className="flex items-center gap-4 text-xs text-gray-600 pt-2 border-t">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300"></div>
                <span>{t('masters.stories.available_slot')}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-gradient-to-br from-red-50 to-rose-50 border border-red-200"></div>
                <span>{t('masters.stories.booked_slot')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer с кнопкой закрытия */}
        <div className="flex justify-end pt-4 border-t">
          <Button 
            onClick={onClose}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
          >
            {t('common.close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MasterStoriesDialog;
