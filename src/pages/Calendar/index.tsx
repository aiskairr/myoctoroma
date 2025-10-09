import { useEffect, useState } from "react";
import AdvancedScheduleComponent from "./components/time-schedule";

const CalendarScreen = () => {
    // Функция для извлечения даты из URL
    const getDateFromUrl = () => {
        const urlParams = new URLSearchParams(window.location.search);
        const dateParam = urlParams.get('date');
        
        
        if (dateParam) {
            const parsedDate = new Date(dateParam);
            // Проверяем, что дата валидная
            if (!isNaN(parsedDate.getTime())) {
                console.log('📅 Found date param in URL:', dateParam, 'parsed as:', parsedDate.toISOString());
                return parsedDate;
            } else {
                console.warn('⚠️ Invalid date param in URL:', dateParam);
            }
        }
        
        // Возвращаем текущую дату, если параметр отсутствует или невалидный
        const today = new Date();
        console.log('📅 No valid date param, using today:', today.toISOString());
        return today;
    };

    const [selectedDate, setSelectedDate] = useState<Date>(getDateFromUrl);
    
    console.log('📅 CalendarScreen render - selectedDate:', selectedDate.toISOString());

    // Слушаем изменения URL и обновляем дату
    useEffect(() => {
        const handleUrlChange = () => {
            const newDate = getDateFromUrl();
            console.log('📅 URL changed, new date:', newDate.toISOString(), 'current selectedDate:', selectedDate.toISOString());
            if (newDate.getTime() !== selectedDate.getTime()) {
                console.log('📅 Setting new selectedDate');
                setSelectedDate(newDate);
            }
        };

        // Обновляем дату при изменении URL
        handleUrlChange();

        // Слушаем события навигации браузера (назад/вперед)
        const handlePopState = () => {
            console.log('📅 popstate event');
            handleUrlChange();
        };

        window.addEventListener('popstate', handlePopState);
        
        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, []);

    // Периодическая проверка изменений URL (для случаев программного изменения)
    useEffect(() => {
        const checkUrlPeriodically = () => {
            const newDate = getDateFromUrl();
            if (newDate.getTime() !== selectedDate.getTime()) {
                console.log('📅 Periodic check: URL date changed from', selectedDate.toISOString(), 'to', newDate.toISOString());
                setSelectedDate(newDate);
            }
        };

        const interval = setInterval(checkUrlPeriodically, 500); // Проверяем каждые 500мс
        
        return () => clearInterval(interval);
    }, [selectedDate]);

    return (
        <div>
            <AdvancedScheduleComponent key={selectedDate.toISOString()} initialDate={selectedDate} />
        </div>
    )
}

export default CalendarScreen;