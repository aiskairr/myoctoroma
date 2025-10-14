import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { CalendarComponent } from './calendar';
import { useLocale } from '@/contexts/LocaleContext';

const ListCalendar = () => {
    const { t } = useLocale();
    const today = new Date();
    const [selectedFullDate, setSelectedFullDate] = useState<Date>(today);
    const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

    // Синхронизируем текущий месяц с выбранной датой
    useEffect(() => {
        const newCurrentMonth = new Date(selectedFullDate.getFullYear(), selectedFullDate.getMonth(), 1);
        setCurrentMonth(newCurrentMonth);
    }, [selectedFullDate]);

    const getDayOfWeek = (date: Date) => {
        const days = [
            t('calendar.day_sun'),
            t('calendar.day_mon'),
            t('calendar.day_tue'),
            t('calendar.day_wed'),
            t('calendar.day_thu'),
            t('calendar.day_fri'),
            t('calendar.day_sat')
        ];
        return days[date.getDay()];
    };

    const getMonthName = (date: Date) => {
        const months = [
            t('calendar.month_jan'), t('calendar.month_feb'), t('calendar.month_mar'),
            t('calendar.month_apr'), t('calendar.month_may'), t('calendar.month_jun'),
            t('calendar.month_jul'), t('calendar.month_aug'), t('calendar.month_sep'),
            t('calendar.month_oct'), t('calendar.month_nov'), t('calendar.month_dec')
        ];
        return months[date.getMonth()];
    };

    const getDaysInMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };

    const generateDates = () => {
        const daysInMonth = getDaysInMonth(currentMonth);
        const dates = [];

        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i);
            const isToday = date.toDateString() === today.toDateString();
            const isSelected = date.toDateString() === selectedFullDate.toDateString();

            dates.push({
                day: i,
                dayOfWeek: getDayOfWeek(date),
                date: date,
                isToday: isToday,
                isSelected: isSelected
            });
        }
        return dates;
    };

    const navigateMonth = (direction: number) => {
        const newMonth = new Date(currentMonth);
        newMonth.setMonth(currentMonth.getMonth() + direction);
        setCurrentMonth(newMonth);
    };

    const goToToday = () => {
        setSelectedFullDate(today);
        setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    };

    const handleDateSelect = (day: number) => {
        const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        setSelectedFullDate(newDate);
    };

    const dates = generateDates();

    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <CalendarComponent />
                </div>
            </div>

            {/* Календарь в виде списка */}
            <div className="relative rounded-lg">
                <div className="flex gap-3 overflow-x-auto rounded-lg pb-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                    {dates.map((dateItem) => {
                        const isSelected = dateItem.isSelected;
                        const isToday = dateItem.isToday;

                        return (
                            <Card
                                key={dateItem.day}
                                className={`flex-shrink-0 cursor-pointer transition-all duration-200 hover:shadow-md relative ${isSelected
                                    ? 'bg-blue-500 text-white border-blue-500 shadow-lg'
                                    : isToday
                                        ? 'bg-blue-50 hover:bg-blue-100 border-blue-200'
                                        : 'bg-white hover:bg-gray-50 border-gray-200'
                                    }`}
                                onClick={() => handleDateSelect(dateItem.day)}
                            >
                                <CardContent className="p-3 text-center min-w-[60px]">
                                    <div className={`text-xs uppercase mb-1 ${isSelected
                                        ? 'text-blue-100'
                                        : isToday
                                            ? 'text-blue-600'
                                            : 'text-gray-500'
                                        }`}>
                                        {dateItem.dayOfWeek}
                                    </div>
                                    <div className={`text-lg font-semibold ${isSelected
                                        ? 'text-white'
                                        : isToday
                                            ? 'text-blue-700'
                                            : 'text-gray-900'
                                        }`}>
                                        {dateItem.day}
                                    </div>
                                    {/* Индикатор сегодняшней даты */}
                                    {isToday && !isSelected && (
                                        <div className="w-1 h-1 bg-blue-500 rounded-full mx-auto mt-1"></div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default ListCalendar;