import { useEffect, useState } from "react";
import AdvancedScheduleComponent from "./components/time-schedule";

const CalendarScreen = () => {
    // Функция для извлечения даты из URL
    const getDateFromUrl = () => {
        const urlParams = new URLSearchParams(window.location.search);
        const dateParam = urlParams.get('date');
        
        console.log('📅 CalendarScreen - URL search params:', window.location.search);
        console.log('📅 CalendarScreen - date param:', dateParam);
        
        if (dateParam) {
            const parsedDate = new Date(dateParam);
            // Проверяем, что дата валидна
            if (!isNaN(parsedDate.getTime())) {
                console.log('📅 CalendarScreen - parsed valid date:', parsedDate.toISOString());
                return parsedDate;
            }
        }
        
        // Возвращаем текущую дату, если параметр отсутствует или невалидный
        const today = new Date();
        console.log('📅 CalendarScreen - using today:', today.toISOString());
        return today;
    };

    const [selectedDate, setSelectedDate] = useState<Date>(getDateFromUrl);
    
    console.log('📅 CalendarScreen render - selectedDate:', selectedDate.toISOString());

    // Слушаем изменения URL и обновляем дату
    useEffect(() => {
        const handleUrlChange = () => {
            const newDate = getDateFromUrl();
            setSelectedDate(newDate);
        };

        // Обновляем дату при изменении URL
        handleUrlChange();

        // Слушаем события навигации браузера (назад/вперед)
        const handlePopState = () => {
            handleUrlChange();
        };

        window.addEventListener('popstate', handlePopState);
        
        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, []);

    // Также слушаем изменения в URL через MutationObserver для случаев программного изменения URL
    useEffect(() => {
        const observer = new MutationObserver(() => {
            const newDate = getDateFromUrl();
            const currentDateString = selectedDate.toISOString().split('T')[0];
            const newDateString = newDate.toISOString().split('T')[0];
            
            if (currentDateString !== newDateString) {
                setSelectedDate(newDate);
            }
        });

        // Наблюдаем за изменениями в URL
        const checkUrl = () => {
            const newDate = getDateFromUrl();
            const currentDateString = selectedDate.toISOString().split('T')[0];
            const newDateString = newDate.toISOString().split('T')[0];
            
            if (currentDateString !== newDateString) {
                setSelectedDate(newDate);
            }
        };

        const interval = setInterval(checkUrl, 100);
        
        return () => {
            clearInterval(interval);
            observer.disconnect();
        };
    }, [selectedDate]);

    return (
        <div>
            <AdvancedScheduleComponent key={selectedDate.toISOString()} initialDate={selectedDate} />
        </div>
    )
}

export default CalendarScreen;