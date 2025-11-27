import { useEffect, useState } from "react";
import AdvancedScheduleComponent from "../Calendar/components/time-schedule";

const MobileCalendarScreen = () => {
    // Функция для извлечения даты из URL
    const getDateFromUrl = () => {
        const urlParams = new URLSearchParams(window.location.search);
        const dateParam = urlParams.get('date');
        
        
        if (dateParam) {
            const parsedDate = new Date(dateParam);
            // Проверяем, что дата валидная
            if (!isNaN(parsedDate.getTime())) {
                console.log('📅 [Mobile] Found date param in URL:', dateParam, 'parsed as:', parsedDate.toISOString());
                return parsedDate;
            } else {
                console.warn('⚠️ [Mobile] Invalid date param in URL:', dateParam);
            }
        }
        
        // Возвращаем текущую дату, если параметр отсутствует или невалидный
        const today = new Date();
        console.log('📅 [Mobile] No valid date param, using today:', today.toISOString());
        return today;
    };

    const [selectedDate, setSelectedDate] = useState<Date>(getDateFromUrl);
    
    console.log('📅 MobileCalendarScreen render - selectedDate:', selectedDate.toISOString());

    // Слушаем изменения URL и обновляем дату
    useEffect(() => {
        const handleUrlChange = () => {
            const newDate = getDateFromUrl();
            console.log('📅 [Mobile] URL changed, new date:', newDate.toISOString(), 'current selectedDate:', selectedDate.toISOString());
            if (newDate.getTime() !== selectedDate.getTime()) {
                console.log('📅 [Mobile] Setting new selectedDate');
                setSelectedDate(newDate);
            }
        };

        // Слушаем события навигации браузера (назад/вперед)
        const handlePopState = () => {
            console.log('📅 [Mobile] popstate event');
            handleUrlChange();
        };

        // Слушаем изменения истории через hashchange
        const handleHashChange = () => {
            console.log('📅 [Mobile] hashchange event');
            handleUrlChange();
        };

        window.addEventListener('popstate', handlePopState);
        window.addEventListener('hashchange', handleHashChange);
        
        return () => {
            window.removeEventListener('popstate', handlePopState);
            window.removeEventListener('hashchange', handleHashChange);
        };
    }, [selectedDate]);

    return (
        <div className="mobile-calendar-container">
            {/* TODO: Здесь будем добавлять мобильные оптимизации */}
            <AdvancedScheduleComponent key={selectedDate.toISOString()} initialDate={selectedDate} />
        </div>
    )
}

export default MobileCalendarScreen;
