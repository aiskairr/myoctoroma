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
        // Слушаем события навигации браузера (назад/вперед)
        const handlePopState = () => {
            console.log('📅 popstate event');
            const newDate = getDateFromUrl();
            console.log('📅 URL changed via popstate, new date:', newDate.toISOString());
            setSelectedDate(newDate);
        };

        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, []);

    // Убрали периодическую проверку - она вызывала бесконечный цикл
    // URL изменения отслеживаются через popstate выше

    return (
        <div>
            <AdvancedScheduleComponent key={selectedDate.toISOString()} initialDate={selectedDate} />
        </div>
    )
}

export default CalendarScreen;