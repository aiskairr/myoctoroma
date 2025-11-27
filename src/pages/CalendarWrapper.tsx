import { useIsMobile } from "@/hooks/use-mobile";
import CalendarScreen from "./Calendar";
import MobileCalendarScreen from "./MobileCalendar";

// Компонент-обертка для условного рендеринга календаря
const CalendarWrapper = () => {
  const isMobile = useIsMobile();
  
  return isMobile ? <MobileCalendarScreen /> : <CalendarScreen />;
};

export default CalendarWrapper;
