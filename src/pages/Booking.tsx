import React, { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { useIsMobile, useScreenSize } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Loader2, Phone, User, MapPin, Scissors, Calendar as CalendarIcon, Clock, Check, CheckCircle, AlertTriangle } from "lucide-react";
import { format, parse, addDays } from 'date-fns';
import { ru } from 'date-fns/locale';

// Интерфейсы
interface Branch {
  id: string;
  name: string;
  address: string;
}

interface DurationOption {
  duration: number;
  price: number;
}

interface Service {
  id: string;
  name: string;
  description?: string;
  defaultDuration: number;
  availableDurations: DurationOption[];
}

interface Master {
  id: number;
  name: string;
  specialty?: string;
  isActive: boolean;
  branchId: string; // API возвращает branchId, а не branch_id
  photoUrl?: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

interface BookingData {
  branch?: string;
  serviceId?: string;
  serviceDuration?: number; // Добавляем выбранную длительность
  servicePrice?: number;    // Добавляем стоимость для выбранной длительности
  masterId?: number;
  date?: Date;
  time?: string;
  name: string;
  phone: string;
}

// Константы
const BRANCHES: Branch[] = [
  { id: 'wa1', name: 'ЭлитАрома', address: 'ул. Токтогула, 93' }
];

// Используем предопределенные услуги (можно расширить до динамической загрузки позже)

// Предопределенные услуги для обратной совместимости (будут заменены загруженными)
const PREDEFINED_SERVICES: Service[] = [
  { 
    id: '1', 
    name: 'Классический массаж', 
    description: 'Расслабляющий массаж с кокосовым маслом. Снимает напряжение, улучшает кровообращение.',
    defaultDuration: 60,
    availableDurations: [
      { duration: 60, price: 2200 },
      { duration: 90, price: 2700 }
    ]
  },
  { 
    id: '2', 
    name: 'Лечебно-оздоровительный массаж', 
    description: 'Глубокая проработка мышц и триггерных точек. Банки в подарок.',
    defaultDuration: 60,
    availableDurations: [
      { duration: 60, price: 2800 },
      { duration: 90, price: 3200 }
    ]
  },
  { 
    id: '3', 
    name: 'Триггерный массаж', 
    description: 'Интенсивное воздействие на болевые точки. Банки в подарок.',
    defaultDuration: 60, 
    availableDurations: [
      { duration: 30, price: 1800 },
      { duration: 60, price: 3400 },
      { duration: 90, price: 5200 }
    ]
  },
  { 
    id: '4', 
    name: 'Арома релакс', 
    description: 'Легкий расслабляющий массаж с аромамаслами.',
    defaultDuration: 60,
    availableDurations: [
      { duration: 60, price: 2500 },
      { duration: 90, price: 2800 }
    ]
  },
  { 
    id: '5', 
    name: 'Спортивный массаж', 
    description: 'Интенсивная проработка мышц. Кедровая бочка в подарок.',
    defaultDuration: 60,
    availableDurations: [
      { duration: 60, price: 3000 },
      { duration: 90, price: 3500 }
    ]
  },
  { 
    id: '6', 
    name: 'Микс массаж', 
    description: 'Комбо: классика + точечный массаж + горячие камни. Подарок: горячие камни.',
    defaultDuration: 110,
    availableDurations: [
      { duration: 110, price: 4200 }
    ]
  },
  { 
    id: '7', 
    name: 'Тайский массаж', 
    description: 'Растяжка и точечное воздействие. Проводится в одежде на мате.',
    defaultDuration: 80,
    availableDurations: [
      { duration: 80, price: 3500 }
    ]
  },
  { 
    id: '8', 
    name: 'Перезагрузка (4 стихии)', 
    description: 'Комплекс: лечебный + прогрев + триггерный массаж + кедровая бочка.',
    defaultDuration: 150,
    availableDurations: [
      { duration: 150, price: 7000 },
      { duration: 220, price: 10000 }
    ]
  },
  { 
    id: '9', 
    name: 'Стоун-терапия', 
    description: 'Массаж горячими камнями.',
    defaultDuration: 90,
    availableDurations: [
      { duration: 90, price: 3400 }
    ]
  },
  { 
    id: '10', 
    name: 'Медовый массаж', 
    description: 'Массаж с использованием натурального мёда.',
    defaultDuration: 90,
    availableDurations: [
      { duration: 90, price: 3200 }
    ]
  },
  { 
    id: '11', 
    name: 'Огненный массаж', 
    description: 'Интенсивный массаж с элементами огненной терапии.',
    defaultDuration: 90,
    availableDurations: [
      { duration: 90, price: 3500 }
    ]
  },
  { 
    id: '12', 
    name: 'Королевский массаж (4 руки)', 
    description: 'Два мастера одновременно. Максимальное расслабление.',
    defaultDuration: 90,
    availableDurations: [
      { duration: 90, price: 5200 }
    ]
  },
  { 
    id: '13', 
    name: 'Массаж для беременных', 
    description: 'Безопасный массаж, адаптированный под беременных женщин.',
    defaultDuration: 50,
    availableDurations: [
      { duration: 50, price: 2000 }
    ]
  },
  { 
    id: '14', 
    name: 'Детский массаж', 
    description: 'Мягкий массаж для малышей и детей.',
    defaultDuration: 30,
    availableDurations: [
      { duration: 30, price: 800 },
      { duration: 50, price: 1400 }
    ]
  },
  { 
    id: '15', 
    name: 'Мама + дочка', 
    description: 'Мама: лечебный (60 мин) + арома релакс (60 мин) + кедровая бочка. Дочка: массаж лица.',
    defaultDuration: 90,
    availableDurations: [
      { duration: 90, price: 7000 }
    ]
  },
  { 
    id: '16', 
    name: 'Райское спа-свидание', 
    description: 'Арома релакс по 80 мин каждому + горячие камни + чай/шампанское.',
    defaultDuration: 120,
    availableDurations: [
      { duration: 120, price: 8000 }
    ]
  },
  { 
    id: '17', 
    name: 'Массаж шейно-воротниковой зоны и спины', 
    description: 'Массаж шейно-воротниковой зоны (ШВЗ) и спины',
    defaultDuration: 40,
    availableDurations: [
      { duration: 40, price: 1200 }
    ]
  },
  { 
    id: '22', 
    name: 'Массаж шейно-воротниковой зоны и головы', 
    description: 'Массаж шейно-воротниковой зоны (ШВЗ) и головы',
    defaultDuration: 30,
    availableDurations: [
      { duration: 30, price: 900 }
    ]
  },
  { 
    id: '23', 
    name: 'Массаж рук', 
    description: 'Массаж рук',
    defaultDuration: 30,
    availableDurations: [
      { duration: 30, price: 900 }
    ]
  },
  { 
    id: '24', 
    name: 'Массаж ног и стоп', 
    description: 'Массаж ног и стоп',
    defaultDuration: 50,
    availableDurations: [
      { duration: 50, price: 1900 }
    ]
  },
  { 
    id: '25', 
    name: 'Массаж лица', 
    description: 'Массаж лица',
    defaultDuration: 80,
    availableDurations: [
      { duration: 80, price: 2400 }
    ]
  }
];

// Цвета для элементов бронирования - нежные и плавные тона для EliteAroma
const BOOKING_COLORS = {
  primary: '#143A65', // Нежный золотисто-коричневый цвет EliteAroma
  lightBackground: '#F5EEE7', // Очень светлый кремовый фон
  border: '#CBB499', // Мягкая граница
  activeBackground: '#ECB84A', // Цвет активного элемента
};

// Компонент для отображения информации о выбранных элементах
const InfoLabel = ({ 
  icon, 
  text 
}: { 
  icon: React.ReactNode; 
  text: React.ReactNode; 
}) => {
  return (
    <div className="p-2 rounded-md inline-flex items-center" 
         style={{ backgroundColor: `${BOOKING_COLORS.primary}15`, border: `1px solid ${BOOKING_COLORS.border}` }}>
      <span className="mr-2" style={{ color: BOOKING_COLORS.primary }}>{icon}</span>
      <span className="text-sm">{text}</span>
    </div>
  );
};

// Примечание о массажах
const MassageNote: React.FC = () => {
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mt-3 flex items-start">
      <AlertTriangle className="text-yellow-500 h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
      <p className="text-sm text-muted-foreground">
        Все услуги предоставляются опытными и квалифицированными мастерами.
      </p>
    </div>
  );
};

// Шаги для UX-потока
enum BookingStep {
  Branch = 0,
  Service = 1,
  Master = 2,
  DateTime = 3,
  ClientInfo = 4,
  Confirmation = 5
}

const BookingPage: React.FC = () => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const screenSize = useScreenSize();
  
  // CSS стили для нежной и элегантной темы бронирования EliteAroma
  const bookingStyles = {
    container: "min-h-screen flex flex-col bg-gradient-to-b from-amber-50/30 to-orange-50/20",
    header: "px-4 py-4 sm:py-6 text-center border-b border-amber-100/50",
    logo: "text-xl sm:text-2xl font-light text-amber-700 my-2 tracking-wide",
    tagline: "text-sm text-amber-600/70 font-light",
    content: isMobile 
      ? "flex-grow p-3 w-full" 
      : "flex-grow p-4 sm:p-6 md:p-8 w-full max-w-5xl mx-auto",
    card: `bg-white/90 border border-amber-100/50 rounded-xl shadow-sm transition-all duration-300 hover:shadow-lg hover:border-amber-200/60 ${isMobile ? 'p-3' : 'p-4'}`,
    cardHighlight: `border-2 border-amber-200/80`,
    branchCard: `cursor-pointer hover:border-amber-300/60 transition-all duration-300 hover:shadow-md`,
    button: "bg-amber-600/90 hover:bg-amber-700/90 text-white font-light transition-all duration-300 rounded-lg",
    stepIndicator: "flex items-center text-sm space-x-2 mb-4 text-amber-600/70 font-light",
    // Сетка для мастеров и услуг - адаптивная
    grid: isMobile 
      ? "grid grid-cols-1 gap-3" 
      : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4",
    // Слоты времени
    timeSlotContainer: isMobile
      ? "flex flex-wrap gap-2" 
      : "grid grid-cols-4 sm:grid-cols-6 gap-2",
    timeSlot: `px-2 py-1 rounded-lg border border-amber-200/50 text-sm cursor-pointer hover:bg-amber-50/50 hover:border-amber-300/60 text-center transition-all duration-200 font-light ${isMobile ? 'min-w-[60px]' : 'min-w-[70px]'}`,
    timeSlotSelected: "bg-amber-600/90 text-white hover:bg-amber-700/90 border-amber-600/90 hover:border-amber-700/90 transition-all duration-200"
  };
  
  // Состояния
  const [currentStep, setCurrentStep] = useState<BookingStep>(BookingStep.Branch);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [services, setServices] = useState<Service[]>([]);
  const [masters, setMasters] = useState<Master[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [unavailableDates, setUnavailableDates] = useState<Date[]>([]);
  const [bookingData, setBookingData] = useState<BookingData>({
    name: '',
    phone: ''
  });
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  // Добавляем состояние для управления шагами выбора услуги и длительности
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [selectedPrice, setSelectedPrice] = useState<number | null>(null);
  
  // Добавляем состояние для отслеживания выбранного временного слота и состояние загрузки для кнопки
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [isTimeSlotSelecting, setIsTimeSlotSelecting] = useState<boolean>(false);
  
  // Состояние для рабочих дат мастера


  // Загрузка услуг из API
  const fetchServices = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('${import.meta.env.VITE_BACKEND_URL}/api/public/massage-services');
      if (response.ok) {
        const data = await response.json();
        console.log("Loaded services from API:", data);
        
        // Преобразуем данные API в формат Service[]
        const mappedServices: Service[] = data.map((service: any) => ({
          id: service.id.toString(),
          name: service.name,
          description: service.description || '',
          defaultDuration: service.defaultDuration,
          availableDurations: service.availableDurations || []
        }));
        
        setServices(mappedServices);
      } else {
        console.error('Failed to fetch services, using predefined services');
        setServices(PREDEFINED_SERVICES);
        toast({
          title: "Предупреждение",
          description: "Не удалось загрузить актуальный список услуг",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error fetching services:', error);
      setServices(PREDEFINED_SERVICES);
      // Удаляем уведомление об ошибке сети
    } finally {
      setIsLoading(false);
    }
  };
  
  // Обработка query-параметров и восстановление данных при первой загрузке
  useEffect(() => {
    // Загружаем услуги из API при инициализации
    fetchServices();
    
    // Пробуем восстановить данные бронирования из localStorage в случае перезагрузки страницы
    try {
      const savedData = localStorage.getItem('lastBookingData');
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        console.log('Restored booking data from localStorage:', parsedData);
        
        // Конвертируем строковую дату обратно в объект Date если она есть
        if (parsedData.date) {
          parsedData.date = new Date(parsedData.date);
        }
        
        // Восстанавливаем данные и шаг
        setBookingData(prev => ({ ...prev, ...parsedData }));
        
        // Определяем шаг для восстановления
        if (parsedData.time && parsedData.date && parsedData.masterId) {
          setSelectedTimeSlot(parsedData.time);
          setSelectedDate(parsedData.date);
          
          // Если был выбран временной слот, восстанавливаем шаг ClientInfo
          if (parsedData.time) {
            setCurrentStep(BookingStep.ClientInfo);
          } else if (parsedData.masterId) {
            setCurrentStep(BookingStep.DateTime);
            fetchTimeSlots(parsedData.masterId, parsedData.date);
          }
        }
        
        toast({
          title: "Данные восстановлены",
          description: "Ваша сессия бронирования была восстановлена",
          duration: 3000
        });
        
        // Очищаем сохраненные данные
        localStorage.removeItem('lastBookingData');
        return;
      }
    } catch (e) {
      console.error('Failed to restore booking data from localStorage:', e);
    }
    
    // Обрабатываем параметры URL если нет сохраненных данных
    const searchParams = new URLSearchParams(window.location.search);
    const branchParam = searchParams.get('branch');
    const serviceParam = searchParams.get('service');
    
    if (branchParam) {
      const validBranch = BRANCHES.find(b => b.id === branchParam);
      if (validBranch) {
        setBookingData(prev => ({ ...prev, branch: branchParam }));
        setCurrentStep(BookingStep.Service);
      }
    }
    
    if (serviceParam && branchParam) {
      setBookingData(prev => ({ ...prev, serviceId: serviceParam }));
      fetchMasters(branchParam, serviceParam);
      setCurrentStep(BookingStep.Master);
    }
  }, []);
  
  // Загрузка мастеров для выбранного филиала и услуги
  const fetchMasters = async (branchId: string, serviceId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/public/masters?branchId=${branchId}`);
      if (response.ok) {
        const data = await response.json();
        console.log("Loaded masters:", data);
        setMasters(data);
      } else {
        console.error("Failed to load masters:", await response.text());
        toast({
          title: "Ошибка загрузки",
          description: "Не удалось загрузить список мастеров",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error fetching masters:', error);
      // Удаляем уведомление об ошибке сети
    } finally {
      setIsLoading(false);
    }
  };
  
  // Проверка доступности мастера на 60 дней вперед
  const fetchMasterAvailability = async (masterId: number) => {
    try {
      // Получаем все рабочие даты мастера (без параметров месяца/года)
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/public/masters/${masterId}/working-dates`);
      
      let workingDates: any[] = [];
      
      if (response.ok) {
        workingDates = await response.json();
        console.log(`Master ${masterId} working dates from API:`, workingDates);
      } else {
        console.error('Failed to fetch working dates:', await response.text());
      }
      
      // Создаем список всех дат от сегодня до 60 дней вперед
      const unavailable: Date[] = [];
      const today = new Date();
      
      for (let i = 0; i < 60; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() + i);
        
        const dateStr = format(checkDate, 'yyyy-MM-dd');
        // Ищем соответствующую рабочую дату и проверяем активность
        const workingDate = workingDates.find(wd => {
          // Преобразуем дату из базы данных в локальный формат и сравниваем
          const dbDate = new Date(wd.work_date);
          // Используем UTC методы для правильного сравнения
          const dbYear = dbDate.getUTCFullYear();
          const dbMonth = dbDate.getUTCMonth();
          const dbDay = dbDate.getUTCDate();
          
          const checkYear = checkDate.getFullYear();
          const checkMonth = checkDate.getMonth();
          const checkDay = checkDate.getDate();
          
          return dbYear === checkYear && dbMonth === checkMonth && dbDay === checkDay;
        });
        
        const isWorking = workingDate && workingDate.is_active;
        
        // Добавляем отладочную информацию
        if (i < 10) { // Логируем только первые 10 дней для экономии места
          console.log(`Date ${dateStr}: working=${isWorking}, found date:`, workingDate);
        }
        
        if (!isWorking) {
          unavailable.push(new Date(checkDate));
        }
      }
      
      setUnavailableDates(unavailable);
      console.log(`Master ${masterId} unavailable dates:`, unavailable.length, 'out of 60 days');
      console.log(`Available dates count:`, 60 - unavailable.length);
      
    } catch (error) {
      console.error('Error fetching master availability:', error);
      // В случае ошибки делаем все даты недоступными
      const unavailable: Date[] = [];
      const today = new Date();
      
      for (let i = 0; i < 60; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() + i);
        unavailable.push(new Date(checkDate));
      }
      
      setUnavailableDates(unavailable);
      console.log('Error occurred, marked all dates as unavailable');
    }
  };

  // Загрузка временных слотов на выбранную дату
  const fetchTimeSlots = async (masterId: number, date: Date) => {
    setIsLoading(true);
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      console.log(`Fetching time slots for masterId: ${masterId}, date: ${dateStr}`);
      
      const serviceDuration = bookingData.serviceDuration || 60;
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/public/available-slots?masterId=${masterId}&date=${dateStr}&serviceDuration=${serviceDuration}`);
      if (response.ok) {
        const data = await response.json() as TimeSlot[];
        console.log("Loaded time slots:", data);
        
        // Если нет доступных слотов, значит мастер не работает в этот день
        if (data.length === 0) {
          toast({
            title: "Мастер не работает",
            description: "Выберите другую дату",
            variant: "destructive"
          });
          setTimeSlots([]);
          return;
        }
        
        // Проверяем, является ли выбранная дата сегодняшней
        const today = new Date();
        const isToday = 
          today.getFullYear() === date.getFullYear() && 
          today.getMonth() === date.getMonth() && 
          today.getDate() === date.getDate();
        
        if (isToday) {
          // Получаем текущее время по GMT+6
          const now = new Date();
          // Бишкек находится в часовом поясе GMT+6
          const currentHour = (now.getUTCHours() + 6) % 24; // GMT+6, учитываем переход через полночь
          const currentMinute = now.getUTCMinutes();
          
          console.log(`Filtering time slots for today. Current time in GMT+6: ${currentHour}:${currentMinute < 10 ? '0' + currentMinute : currentMinute}`);
          
          // Фильтруем слоты, оставляя только те, что позже текущего времени
          const filteredSlots = data.filter((slot) => {
            const [slotHour, slotMinute] = slot.time.split(':').map(Number);
            return slotHour > currentHour || (slotHour === currentHour && slotMinute > currentMinute);
          });
          
          console.log(`Filtered from ${data.length} to ${filteredSlots.length} time slots for today`);
          setTimeSlots(filteredSlots);
        } else {
          // Для других дней показываем все слоты
          setTimeSlots(data);
        }
      } else {
        console.error("Failed to load time slots:", await response.text());
        toast({
          title: "Ошибка загрузки",
          description: "Не удалось загрузить доступное время",
          variant: "destructive"
        });
        setTimeSlots([]);
      }
    } catch (error) {
      console.error('Error fetching time slots:', error);
      // Удаляем уведомление об ошибке сети
      setTimeSlots([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Отправка формы бронирования
  const submitBooking = async () => {
    if (!bookingData.branch || !bookingData.serviceId || !bookingData.masterId || !bookingData.date || !bookingData.time) {
      toast({
        title: "Ошибка бронирования",
        description: "Пожалуйста, заполните все поля",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const datetime = `${format(bookingData.date, 'yyyy-MM-dd')}T${bookingData.time}`;
      
      const requestData = {
        branch: bookingData.branch,
        serviceId: bookingData.serviceId,
        serviceDuration: bookingData.serviceDuration,
        servicePrice: bookingData.servicePrice, 
        masterId: bookingData.masterId,
        datetime: datetime,
        name: bookingData.name,
        phone: bookingData.phone
      };
      
      const response = await fetch('${import.meta.env.VITE_BACKEND_URL}/api/booking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });
      
      if (response.ok) {
        setCurrentStep(BookingStep.Confirmation);
      } else {
        const error = await response.json();
        toast({
          title: "Ошибка бронирования",
          description: error.message || "Не удалось создать запись",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error submitting booking:', error);
      toast({
        title: "Ошибка отправки",
        description: "Не удалось отправить заявку",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };


  
  // Обработчики выбора на каждом шаге
  const handleBranchSelect = (branchId: string) => {
    setBookingData(prev => ({ ...prev, branch: branchId }));
    setCurrentStep(BookingStep.Service);
  };
  
  const handleServiceSelect = (serviceId: string) => {
    const service = services.find((s: Service) => s.id === serviceId);
    
    // Устанавливаем сервис и сбрасываем длительность
    setBookingData(prev => ({ 
      ...prev, 
      serviceId,
      serviceDuration: service?.defaultDuration || undefined,
      servicePrice: undefined
    }));
    
    setSelectedDuration(null);
    setSelectedPrice(null);
    
    // Если у сервиса есть несколько доступных длительностей, показываем шаг выбора длительности
    if (service && service.availableDurations.length > 1) {
      // Оставляем на шаге выбора услуги, но покажем опции длительности
      setSelectedDuration(service.defaultDuration);
    } else if (service && service.availableDurations.length === 1) {
      // Если только одна длительность, устанавливаем её автоматически
      const duration = service.availableDurations[0];
      setBookingData(prev => ({ 
        ...prev, 
        serviceDuration: duration.duration,
        servicePrice: duration.price
      }));
      
      if (bookingData.branch) {
        fetchMasters(bookingData.branch, serviceId);
        setCurrentStep(BookingStep.Master);
      }
    } else if (bookingData.branch) {
      // Если нет длительностей (странный кейс), просто идём дальше
      fetchMasters(bookingData.branch, serviceId);
      setCurrentStep(BookingStep.Master);
    }
  };
  
  const handleDurationSelect = (duration: number, price: number) => {
    setSelectedDuration(duration);
    setSelectedPrice(price);
    
    setBookingData(prev => ({ 
      ...prev, 
      serviceDuration: duration,
      servicePrice: price
    }));
    
    if (bookingData.branch && bookingData.serviceId) {
      fetchMasters(bookingData.branch, bookingData.serviceId);
      setCurrentStep(BookingStep.Master);
    }
  };
  
  const handleMasterSelect = (masterId: number) => {
    setBookingData(prev => ({ ...prev, masterId }));
    fetchMasterAvailability(masterId); // Загружаем доступность мастера
    fetchTimeSlots(masterId, selectedDate);
    setCurrentStep(BookingStep.DateTime);
  };
  
  const handleDateSelect = (date: Date | undefined) => {
    if (date && bookingData.masterId) {
      // Сбрасываем предыдущий выбор временного слота при смене даты
      setSelectedTimeSlot(null);
      setIsTimeSlotSelecting(false); // Сбрасываем флаг выбора времени
      setBookingData(prev => ({ ...prev, date, time: undefined }));
      
      setSelectedDate(date);
      fetchTimeSlots(bookingData.masterId, date);
      
      // Отображаем уведомление пользователю
      toast({
        title: "Дата выбрана",
        description: `Выбрана дата: ${format(date, 'dd.MM.yyyy')}`,
        duration: 1500
      });
      
      console.log(`Date selected: ${date.toISOString().split('T')[0]}, resetting time selection`);
    }
  };
  
  const handleTimeSelect = (time: string) => {
    // Проверяем, не выбран ли уже слот (защита от двойного нажатия)
    if (isTimeSlotSelecting) {
      console.log(`Time slot selection already in progress, ignoring click on ${time}`);
      return;
    }
    
    // Проверяем необходимые данные и, если дата не выбрана, но есть мастер, используем текущую дату
    if (!bookingData.masterId || !bookingData.branch || !bookingData.serviceId) {
      console.error('Missing required booking data (master/branch/service) before selecting time slot:', bookingData);
      toast({
        title: "Ошибка выбора времени",
        description: "Пожалуйста, убедитесь, что вы выбрали филиал, услугу и мастера",
        variant: "destructive"
      });
      return;
    }
    
    // Если дата не выбрана, используем текущую дату
    if (!bookingData.date) {
      const today = new Date();
      console.log(`Date not selected, using today's date: ${today.toISOString().split('T')[0]}`);
      
      // Устанавливаем сегодняшнюю дату
      setSelectedDate(today);
      setBookingData(prev => ({ ...prev, date: today }));
      
      toast({
        title: "Выбрана текущая дата",
        description: `Автоматически выбрана сегодняшняя дата: ${format(today, 'dd.MM.yyyy')}`,
        duration: 3000
      });
    }
    
    // Показываем состояние загрузки и устанавливаем выбранный слот
    setIsTimeSlotSelecting(true);
    setSelectedTimeSlot(time);
    
    console.log(`Selecting time slot: ${time}`);
    
    // Сразу отображаем явное уведомление пользователю
    toast({
      title: "Время выбрано",
      description: `Выбрано время: ${time}`,
      duration: 2000
    });
    
    // Обновляем данные бронирования
    setBookingData(prevData => {
      const updatedData = { ...prevData, time };
      
      // Сохраняем обновленные данные в локальное хранилище для надежности
      try {
        localStorage.setItem('lastBookingData', JSON.stringify({
          ...updatedData,
          date: updatedData.date ? format(updatedData.date, 'yyyy-MM-dd') : null
        }));
      } catch (e) {
        console.error('Failed to save booking data to localStorage:', e);
      }
      
      // Используем асинхронный setTimeout с задержкой 500мс для гарантии обновления
      setTimeout(() => {
        // Логируем данные для отладки
        console.log(`Time slot '${time}' selected, data updated:`, updatedData);
        
        // Выводим дополнительный лог для отладки
        console.log(`Final booking data before moving to client info:`, {
          ...updatedData,
          time: time,
          date: updatedData.date ? format(updatedData.date, 'yyyy-MM-dd') : 'not set'
        });
        
        // Переходим к следующему шагу и сбрасываем состояние загрузки
        setCurrentStep(BookingStep.ClientInfo);
        setIsTimeSlotSelecting(false);
      }, 500); // Используем задержку 500мс для большей надежности
      
      return updatedData;
    });
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setBookingData(prev => ({ ...prev, [name]: value }));
  };
  
  // Валидация телефона
  const isPhoneValid = (phone: string) => {
    // Простая валидация для киргизских номеров
    const phoneRegex = /^\+996\d{9}$/;
    return phoneRegex.test(phone);
  };

  // Форматирование телефона
  const formatPhone = (input: string) => {
    // Форматирование для киргизского номера: +996 XXX XXX XXX
    let cleaned = input.replace(/\D/g, '');
    
    // Добавляем код страны если его нет
    if (!cleaned.startsWith('996') && cleaned.length > 0) {
      cleaned = '996' + cleaned;
    }
    
    // Ограничиваем длину до 12 цифр (код страны + 9 цифр)
    cleaned = cleaned.substring(0, 12);
    
    // Добавляем + в начало
    let formatted = '+' + cleaned;
    
    return formatted;
  };
  
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setBookingData(prev => ({ ...prev, phone: formatted }));
  };
  
  // Получение данных для текущего шага
  const getSelectedBranch = () => {
    return BRANCHES.find(b => b.id === bookingData.branch);
  };
  
  const getSelectedService = () => {
    return services.find((s: Service) => s.id === bookingData.serviceId);
  };
  
  const getSelectedMaster = () => {
    return masters.find(m => m.id === bookingData.masterId);
  };
  
  // Форматированная дата для отображения
  const formattedDate = bookingData.date ? format(bookingData.date, 'dd MMMM yyyy', { locale: ru }) : '';
  
  // Отображение шагов бронирования
  const renderStepContent = () => {
    switch (currentStep) {
      case BookingStep.Branch:
        return renderBranchStep();
      case BookingStep.Service:
        return renderServiceStep();
      case BookingStep.Master:
        return renderMasterStep();
      case BookingStep.DateTime:
        return renderDateTimeStep();
      case BookingStep.ClientInfo:
        return renderClientInfoStep();
      case BookingStep.Confirmation:
        return renderConfirmationStep();
      default:
        return renderBranchStep();
    }
  };
  
  // Рендер шага выбора филиала
  const renderBranchStep = () => (
    <div className="space-y-4">
      <h2 className="text-2xl font-light text-amber-700">Выберите филиал</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {BRANCHES.map(branch => (
          <Card 
            key={branch.id}
            className={`${bookingStyles.card} ${bookingStyles.branchCard}`}
            onClick={() => handleBranchSelect(branch.id)}
            style={{ borderColor: BOOKING_COLORS.border }}
          >
            <CardContent className="p-4 flex flex-col items-center text-center space-y-2">
              <MapPin className="h-8 w-8 mb-2" style={{ color: BOOKING_COLORS.primary }} />
              <h3 className="font-light text-lg text-amber-700">{branch.name}</h3>
              <p className="text-muted-foreground text-sm">{branch.address}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
  
  // Рендер шага выбора услуги
  const renderServiceStep = () => {
    const selectedBranch = getSelectedBranch();
    
    return (
      <div className="space-y-4">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentStep(BookingStep.Branch)}
            className="mr-2"
          >
            &larr; Назад
          </Button>
          <h2 className="text-2xl font-light text-amber-700">Выберите услугу</h2>
        </div>
        
        {selectedBranch && (
          <InfoLabel
            icon={<MapPin className="h-4 w-4" />}
            text={`${selectedBranch.name} (${selectedBranch.address})`}
          />
        )}
        
        {/* Выбор конкретной услуги (первый этап) */}
        {!bookingData.serviceId ? (
          <div className="mt-4">
            <MassageNote />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {services.length > 0 ? (
                services.map((service: Service) => (
                  <Card
                    key={service.id}
                    className="cursor-pointer hover:border-primary transition-all"
                    onClick={() => handleServiceSelect(service.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-col h-full">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-light text-lg text-amber-700">{service.name}</h3>
                          </div>
                          <div className="text-right">
                            {service.availableDurations.length > 0 && (
                              <>
                                <div className="font-light text-amber-600">
                                  от {service.availableDurations[0].price} сом
                                </div>
                                <div className="text-muted-foreground text-sm">
                                  {service.defaultDuration} мин
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                        {service.description && (
                          <p className="text-muted-foreground text-sm mt-2">{service.description}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <p className="text-muted-foreground col-span-2 text-center py-4">
                  Нет доступных услуг
                </p>
              )}
            </div>
          </div>
        ) : (
          /* Выбор длительности для выбранной услуги (второй этап) */
          <div className="mt-4">
            <div className="mb-4 flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setBookingData(prev => ({ ...prev, serviceId: undefined }));
                  setSelectedDuration(null);
                  setSelectedPrice(null);
                }}
                className="mr-2"
              >
                &larr; К выбору услуги
              </Button>
              <h3 className="text-lg font-light text-amber-700">Выберите длительность</h3>
            </div>
            
            {/* Показываем выбранную услугу */}
            {getSelectedService() && (
              <InfoLabel
                icon={<Scissors className="h-4 w-4" />}
                text={getSelectedService()?.name}
              />
            )}
            
            {/* Варианты длительности */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
              {getSelectedService()?.availableDurations.map((duration: DurationOption) => (
                <Card
                  key={duration.duration}
                  className={`cursor-pointer hover:border-primary transition-all ${
                    selectedDuration === duration.duration ? 'border-primary border-2' : ''
                  }`}
                  onClick={() => handleDurationSelect(duration.duration, duration.price)}
                >
                  <CardContent className="p-4 text-center">
                    <div className="font-light mb-1 text-amber-700">{duration.duration} мин</div>
                    <div className="text-sm">{duration.price} сом</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };
  
  // Рендер шага выбора мастера
  const renderMasterStep = () => {
    const selectedBranch = getSelectedBranch();
    const selectedService = getSelectedService();
    
    // Отладка
    console.log("Рендер мастеров:", {
      masters: masters,
      bookingData: bookingData,
      selectedMasterId: bookingData.masterId
    });
    
    return (
      <div className="space-y-4">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentStep(BookingStep.Service)}
            className="mr-2"
          >
            &larr; Назад
          </Button>
          <h2 className="text-2xl font-light text-amber-700">Выберите мастера</h2>
        </div>
        
        <div className="flex flex-col space-y-2">
          {selectedBranch && (
            <InfoLabel 
              icon={<MapPin className="h-4 w-4" />} 
              text={selectedBranch.name} 
            />
          )}
          
          {selectedService && (
            <InfoLabel 
              icon={<Scissors className="h-4 w-4" />} 
              text={<>
                {selectedService.name} 
                {bookingData.serviceDuration && bookingData.servicePrice ? (
                  <> - {bookingData.serviceDuration} мин, {bookingData.servicePrice} сом</>
                ) : (
                  <> - {selectedService.defaultDuration} мин</>
                )}
              </>} 
            />
          )}
        </div>
        
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            {masters.length > 0 ? (
              masters.map(master => (
                <Card
                  key={master.id}
                  className={`cursor-pointer hover:border-primary transition-all ${bookingData.masterId === master.id ? 'border-primary bg-primary/5' : ''}`}
                  onClick={() => handleMasterSelect(master.id)}
                >
                  <CardContent className="p-4 flex flex-col items-center text-center">
                    <div className="h-24 w-24 mb-2 rounded-full overflow-hidden">
                      {master.photoUrl ? (
                        <img 
                          src={master.photoUrl} 
                          alt={`Мастер ${master.name}`} 
                          className="w-full h-full object-cover"
                          onLoad={() => console.log(`Фото ${master.name} загружено:`, master.photoUrl)}
                          onError={(e) => {
                            console.error(`Ошибка загрузки фото для ${master.name}:`, master.photoUrl);
                            // Когда произошла ошибка загрузки, устанавливаем photoUrl в undefined
                            // Это вызовет повторный рендер компонента и покажет fallback
                            const updatedMasters = masters.map(m => 
                              m.id === master.id ? {...m, photoUrl: undefined} : m
                            );
                            setMasters(updatedMasters);
                          }}
                        />
                      ) : (
                        <div className="h-24 w-24 flex items-center justify-center bg-muted rounded-full">
                          <span className="text-4xl">{master.name.charAt(0)}</span>
                        </div>
                      )}
                    </div>
                    <h3 className="font-light text-lg text-amber-700">{master.name}</h3>
                    {master.specialty && (
                      <p className="text-muted-foreground text-sm">{master.specialty}</p>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-4 text-muted-foreground">
                Нет доступных мастеров для выбранного филиала
              </div>
            )}
          </div>
        )}
      </div>
    );
  };
  
  // Рендер шага выбора даты и времени
  const renderDateTimeStep = () => {
    const selectedBranch = getSelectedBranch();
    const selectedService = getSelectedService();
    const selectedMaster = getSelectedMaster();
    
    return (
      <div className="space-y-4">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentStep(BookingStep.Master)}
            className="mr-2"
          >
            &larr; Назад
          </Button>
          <div>
            <h2 className="text-2xl font-light text-amber-700">Выберите дату и время</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Для текущего дня доступны только слоты после {new Date().getUTCHours() + 6}:00. Выберите дату или нажмите сразу на время.
            </p>
          </div>
        </div>
        
        <div className="flex flex-col space-y-2">
          {selectedBranch && (
            <InfoLabel 
              icon={<MapPin className="h-4 w-4" />} 
              text={selectedBranch.name} 
            />
          )}
          
          {selectedService && (
            <InfoLabel 
              icon={<Scissors className="h-4 w-4" />} 
              text={<>
                {selectedService.name} 
                {bookingData.serviceDuration && bookingData.servicePrice ? (
                  <> - {bookingData.serviceDuration} мин, {bookingData.servicePrice} сом</>
                ) : (
                  <> - {selectedService.defaultDuration} мин</>
                )}
              </>} 
            />
          )}
          
          {selectedMaster && (
            <InfoLabel
              icon={<User className="h-4 w-4" />}
              text={selectedMaster.name}
            />
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          <div>
            <h3 className="font-light mb-2 text-amber-700">Выберите дату:</h3>
            <Card className="overflow-hidden">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                locale={ru}
                className="rounded-md"
                disabled={(date) => {
                  // Отключаем только полностью прошедшие даты (сравниваем только дату, не время)
                  const today = new Date();
                  today.setHours(0, 0, 0, 0); // Сбрасываем время к началу дня
                  const checkDate = new Date(date);
                  checkDate.setHours(0, 0, 0, 0); // Сбрасываем время к началу дня
                  
                  if (checkDate < today) return true;
                  
                  // Отключаем даты далее чем через 60 дней
                  if (date > addDays(new Date(), 60)) return true;
                  
                  // Отключаем недоступные даты мастера
                  if (bookingData.masterId && unavailableDates.some(unavailableDate => 
                    unavailableDate.getFullYear() === date.getFullYear() &&
                    unavailableDate.getMonth() === date.getMonth() &&
                    unavailableDate.getDate() === date.getDate()
                  )) {
                    return true;
                  }
                  
                  return false;
                }}
                fromDate={new Date()}
                toDate={addDays(new Date(), 60)}
                modifiers={{
                  unavailable: unavailableDates
                }}
                modifiersStyles={{
                  selected: {
                    backgroundColor: BOOKING_COLORS.primary,
                  },
                  today: {
                    borderColor: BOOKING_COLORS.primary,
                  },
                  unavailable: { 
                    backgroundColor: '#f3f4f6', 
                    color: '#9ca3af',
                    textDecoration: 'line-through'
                  }
                }}
              />
            </Card>
          </div>
          
          <div>
            <h3 className="font-light mb-2 text-amber-700">Выберите время:</h3>
            <div className="space-y-2">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : timeSlots.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {timeSlots
                    .sort((a, b) => {
                      // Сортировка слотов по времени
                      const timeA = a.time.split(':').map(Number);
                      const timeB = b.time.split(':').map(Number);
                      
                      // Сравниваем часы
                      if (timeA[0] !== timeB[0]) {
                        return timeA[0] - timeB[0];
                      }
                      
                      // Если часы одинаковые, сравниваем минуты
                      return timeA[1] - timeB[1];
                    })
                    .map((slot, index) => (
                      <Button
                        key={index}
                        variant={
                          selectedTimeSlot === slot.time 
                            ? "default" 
                            : slot.available 
                              ? "outline" 
                              : "ghost"
                        }
                        disabled={Boolean(!slot.available || isTimeSlotSelecting)}
                        onClick={() => selectedTimeSlot !== slot.time ? handleTimeSelect(slot.time) : null}
                        className={`
                          ${selectedTimeSlot === slot.time ? "bg-amber-600/90 text-white border-amber-600/90 hover:border-amber-600/90 font-light" : ""}
                          ${!slot.available ? "opacity-40 cursor-not-allowed" : ""}
                          ${isTimeSlotSelecting ? "cursor-wait" : ""}
                          ${isTimeSlotSelecting && selectedTimeSlot !== slot.time ? "opacity-50" : ""}
                          ${slot.available && !isTimeSlotSelecting && selectedTimeSlot !== slot.time ? "hover:border-orange-500 hover:text-orange-500" : ""}
                          p-2 h-auto transition-all duration-300 relative shadow-sm
                        `}
                      >
                        <div className="flex items-center justify-center w-full">
                          {isTimeSlotSelecting && selectedTimeSlot === slot.time ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              <span>Выбрано</span>
                            </>
                          ) : selectedTimeSlot === slot.time ? (
                            <>
                              <Check className="h-3 w-3 mr-1 text-white" />
                              <span>{slot.time}</span>
                            </>
                          ) : (
                            <>
                              <Clock className="h-3 w-3 mr-1" />
                              <span>{slot.time}</span>
                            </>
                          )}
                        </div>
                      </Button>
                    ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <p>Выберите дату или нажмите на любое доступное время</p>
                  <p className="mt-2 text-sm">Если дата не выбрана, будет использована текущая дата</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Рендер шага ввода данных клиента
  const renderClientInfoStep = () => {
    const selectedBranch = getSelectedBranch();
    const selectedService = getSelectedService();
    const selectedMaster = getSelectedMaster();
    
    return (
      <div className="space-y-4">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentStep(BookingStep.DateTime)}
            className="mr-2"
          >
            &larr; Назад
          </Button>
          <h2 className="text-2xl font-light text-amber-700">Ваши данные</h2>
        </div>
        
        <Card className="bg-muted/50">
          <CardContent className="p-4 space-y-2">
            <h3 className="font-light text-amber-700">Информация о записи:</h3>
            {selectedBranch && (
              <div className="flex items-center">
                <MapPin className="h-4 w-4 mr-2" style={{ color: BOOKING_COLORS.primary }} />
                <span>{selectedBranch.name} ({selectedBranch.address})</span>
              </div>
            )}
            {selectedService && (
              <div className="flex items-center">
                <Scissors className="h-4 w-4 mr-2" style={{ color: BOOKING_COLORS.primary }} />
                <span>{selectedService.name} - 
                  {bookingData.serviceDuration && bookingData.servicePrice ? (
                    <>{bookingData.serviceDuration} мин, {bookingData.servicePrice} сом</>
                  ) : (
                    <>{selectedService.defaultDuration} мин</>
                  )}
                </span>
              </div>
            )}
            {selectedMaster && (
              <div className="flex items-center">
                <User className="h-4 w-4 mr-2" style={{ color: BOOKING_COLORS.primary }} />
                <span>{selectedMaster.name}</span>
              </div>
            )}
            {formattedDate && bookingData.time && (
              <div className="flex items-center">
                <CalendarIcon className="h-4 w-4 mr-2" style={{ color: BOOKING_COLORS.primary }} />
                <span>{formattedDate}, {bookingData.time}</span>
              </div>
            )}
          </CardContent>
        </Card>
        
        <form className="space-y-4" onSubmit={(e) => {
          e.preventDefault();
          submitBooking();
        }}>
          <div className="space-y-3">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="name">Ваше имя</Label>
              <Input
                id="name"
                name="name"
                value={bookingData.name}
                onChange={handleInputChange}
                placeholder="Введите ваше имя"
                required
              />
            </div>
            
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="phone">Номер телефона</Label>
              <div className="relative">
                <Phone className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  name="phone"
                  value={bookingData.phone}
                  onChange={handlePhoneChange}
                  placeholder="+996 XXX XXX XXX"
                  className="pl-8"
                  required
                />
              </div>
              {bookingData.phone && !isPhoneValid(bookingData.phone) && (
                <p className="text-sm text-destructive">
                  Введите корректный номер телефона в формате +996 XXX XXX XXX
                </p>
              )}
            </div>
          </div>
          
          <Button
            type="submit"
            className={bookingStyles.button}
            disabled={
              isLoading || 
              !bookingData.name || 
              !bookingData.phone || 
              !isPhoneValid(bookingData.phone)
            }
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Отправка...
              </>
            ) : (
              "Записаться на услугу"
            )}
          </Button>
        </form>
      </div>
    );
  };
  
  // Рендер шага подтверждения
  const renderConfirmationStep = () => {
    const selectedService = getSelectedService();
    const selectedMaster = getSelectedMaster();
    const formattedDate = bookingData.date ? format(bookingData.date, 'dd MMMM yyyy', { locale: ru }) : '';
    
    return (
      <div className="space-y-6 text-center">
        <div className="flex flex-col items-center justify-center">
          <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <Check className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-light text-amber-700 mb-2">Ваша запись подтверждена!</h2>
          <p className="text-muted-foreground">
            Мы ждем вас в указанное время
          </p>
        </div>
        
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 space-y-3">
            <h3 className="font-light text-lg text-amber-700">Детали записи:</h3>
            {selectedService && (
              <div className="flex items-center">
                <Scissors className="h-4 w-4 mr-2" style={{ color: BOOKING_COLORS.primary }} />
                <span>{selectedService.name}</span>
              </div>
            )}
            {selectedMaster && (
              <div className="flex items-center">
                <User className="h-4 w-4 mr-2" style={{ color: BOOKING_COLORS.primary }} />
                <span>Мастер: {selectedMaster.name}</span>
              </div>
            )}
            {formattedDate && bookingData.time && (
              <div className="flex items-center">
                <CalendarIcon className="h-4 w-4 mr-2" style={{ color: BOOKING_COLORS.primary }} />
                <span>Дата и время: {formattedDate}, {bookingData.time}</span>
              </div>
            )}
            <div className="flex items-center">
              <Phone className="h-4 w-4 mr-2" style={{ color: BOOKING_COLORS.primary }} />
              <span>Контактный телефон: {bookingData.phone}</span>
            </div>
          </CardContent>
        </Card>
        
        <div className="pt-4">
          <Button 
            variant="outline" 
            onClick={() => {
              setBookingData({
                name: '',
                phone: ''
              });
              setCurrentStep(BookingStep.Branch);
            }}
          >
            Создать новую запись
          </Button>
        </div>
      </div>
    );
  };
  
  // Индикатор текущего шага (линия прогресса)
  const renderStepIndicator = () => (
    <div className="mb-6">
      {!isMobile ? (
        // Десктопная версия индикатора
        <div className="flex justify-between items-center mb-2">
          <span className={currentStep >= BookingStep.Branch ? "text-amber-600 font-light" : "text-gray-400"}>
            Филиал
          </span>
          <span className={currentStep >= BookingStep.Service ? "text-amber-600 font-light" : "text-gray-400"}>
            Услуга
          </span>
          <span className={currentStep >= BookingStep.Master ? "text-amber-600 font-light" : "text-gray-400"}>
            Мастер
          </span>
          <span className={currentStep >= BookingStep.DateTime ? "text-amber-600 font-light" : "text-gray-400"}>
            Дата/Время
          </span>
          <span className={currentStep >= BookingStep.ClientInfo ? "text-amber-600 font-light" : "text-gray-400"}>
            Данные
          </span>
        </div>
      ) : (
        // Мобильная версия индикатора - только текущий шаг
        <div className="text-center mb-2">
          <span className="text-amber-600 font-light text-lg">
            {currentStep === BookingStep.Branch ? "Выберите филиал" : 
             currentStep === BookingStep.Service ? "Выберите услугу" : 
             currentStep === BookingStep.Master ? "Выберите мастера" : 
             currentStep === BookingStep.DateTime ? "Выберите дату и время" : 
             "Введите ваши данные"}
          </span>
        </div>
      )}
      <div className="relative h-2 bg-amber-100/50 rounded-full overflow-hidden">
        <div 
          className="absolute left-0 top-0 h-full bg-amber-600/90 transition-all duration-500 rounded-full"
          style={{ width: `${(currentStep / (Object.keys(BookingStep).length / 2 - 1)) * 100}%` }}
        ></div>
      </div>
    </div>
  );
  
  return (
    <div className={bookingStyles.container}>
      <header className={bookingStyles.header}>
        <h1 className={bookingStyles.logo}>Octo CRM</h1>
        <p className={bookingStyles.tagline}>Онлайн-запись</p>
      </header>
      
      <main className={bookingStyles.content}>
        {/* Индикатор прогресса */}
        {renderStepIndicator()}
        
        {/* Содержимое текущего шага */}
        {renderStepContent()}
      </main>
    </div>
  );
};

export default BookingPage;