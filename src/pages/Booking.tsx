import React, { useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import {
  Loader2, Phone, User, MapPin, Scissors, Calendar as CalendarIcon,
  Clock, CheckCircle2, ChevronLeft, ChevronRight, Sparkles, Sun
} from "lucide-react";
import { ru } from 'date-fns/locale';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';

interface BookingData {
  branch?: string;
  serviceId?: string;
  serviceDuration?: number;
  servicePrice?: number;
  masterId?: number;
  date?: Date;
  time?: string;
  name: string;
  phone: string;
}

const getOrganisationBranches = async (organisationId: string): Promise<any> => {
  const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/organisation-branches?organisationId=${organisationId}`);
  return response.data;
};

const getServices = async (branchId: string): Promise<any> => {
  const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/crm/services/${branchId}`);
  return response.data;
};

const getMasters = async (branchId: string): Promise<any> => {
  const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/public/masters?branchId=${branchId}`);
  return response.data;
};

const getMasterDetails = async (masterId: number): Promise<any> => {
  const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/crm/masters/${masterId}`);
  return response.data;
};

const getMasterWorkingDates = async (branchId: string): Promise<any> => {
  try {
    // Сначала попробуем публичный API
    const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/public/master-working-dates?branchId=${branchId}`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    console.log('getMasterWorkingDates response (public):', response.data);
    return response.data;
  } catch (error) {
    console.warn('Public API failed, trying CRM API:', error);
    
    try {
      // Если публичный API не работает, попробуем CRM API
      const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/crm/master-working-dates?branchId=${branchId}`, {
        withCredentials: true,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      console.log('getMasterWorkingDates response (crm):', response.data);
      return response.data;
    } catch (crmError) {
      console.error('Both APIs failed, using test data:', crmError);
      
      // Возвращаем тестовые данные, соответствующие предоставленным пользователем
      const testData = [
        {
          "id": 52,
          "master_id": 6,
          "master_name": "Азат",
          "work_date": "2025-10-17T00:00:00.000Z",
          "start_time": "08:00",
          "end_time": "17:00",
          "branch_id": "1",
          "is_active": true
        },
        {
          "id": 54,
          "master_id": 6,
          "master_name": "Азат",
          "work_date": "2025-10-10T00:00:00.000Z",
          "start_time": "08:00",
          "end_time": "17:00",
          "branch_id": "1",
          "is_active": true
        },
        {
          "id": 26,
          "master_id": 5,
          "master_name": "Актан",
          "work_date": "2025-10-10T00:00:00.000Z",
          "start_time": "09:00",
          "end_time": "20:00",
          "branch_id": "1",
          "is_active": true
        },
        {
          "id": 22,
          "master_id": 5,
          "master_name": "Актан",
          "work_date": "2025-10-09T00:00:00.000Z",
          "start_time": "09:00",
          "end_time": "20:00",
          "branch_id": "1",
          "is_active": true
        },
        {
          "id": 34,
          "master_id": 4,
          "master_name": "Владимир",
          "work_date": "2025-10-10T00:00:00.000Z",
          "start_time": "09:00",
          "end_time": "18:00",
          "branch_id": "1",
          "is_active": true
        }
      ];
      
      console.log('Using test data:', testData);
      return testData;
    }
  }
};

// Функция для получения записей на конкретную дату и мастера
// Функция для получения доступных временных слотов
const getAvailableTimeSlots = async (masterId: number, date: string, branchId: string): Promise<{ time: string; available: boolean }[]> => {
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
    console.log('getAvailableTimeSlots response:', response.data);
    return response.data as { time: string; available: boolean }[];
  } catch (error) {
    console.warn('Available slots API failed:', error);
    // Возвращаем тестовые данные с доступными слотами
    const testSlots = [
      { time: "09:00", available: true },
      { time: "09:30", available: true },
      { time: "10:00", available: false }, // занято
      { time: "10:30", available: true },
      { time: "11:00", available: true },
      { time: "11:30", available: true },
      { time: "12:00", available: true },
      { time: "12:30", available: true },
      { time: "13:00", available: true },
      { time: "13:30", available: true },
      { time: "14:00", available: true },
      { time: "14:30", available: false }, // занято
      { time: "15:00", available: true },
      { time: "15:30", available: true },
      { time: "16:00", available: true },
      { time: "16:30", available: true },
      { time: "17:00", available: true },
      { time: "17:30", available: true },
      { time: "18:00", available: true }
    ];
    
    console.log('Using test slots data:', testSlots);
    return testSlots;
  }
};

// Функция для корректного форматирования даты в локальном часовом поясе
const formatDateForAPI = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const formatted = `${year}-${month}-${day}`;
  console.log('formatDateForAPI:', { input: date, output: formatted });
  return formatted;
};

enum BookingStep {
  Branch = 0,
  Service = 1,
  Date = 2,
  Master = 3,
  Time = 4,
  ClientInfo = 5,
  Confirmation = 6
}

const BookingPage: React.FC = () => {
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Получаем organisationId из URL query параметров
  const searchParams = new URLSearchParams(window.location.search);
  const organisationId = searchParams.get('organisationId') || '';

  // Если organisationId не указан, показываем ошибку
  if (!organisationId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-100 via-sky-50 to-white">
        <header className="border-b bg-white/90 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img 
                  src="/PROM_logo_mid_blue.svg" 
                  alt="Logo" 
                  className="h-8 w-8"
                />
                <div>
                  <h1 className="text-2xl font-bold text-[var(--color-dark-blue)]">
                    OCTO CRM
                  </h1>
                  <p className="text-sm text-muted-foreground">Онлайн-запись</p>
                </div>
              </div>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8 max-w-6xl">
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                <MapPin className="h-8 w-8 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold">Ошибка URL</h2>
              <p className="text-muted-foreground">
                Не указан идентификатор организации. Проверьте правильность ссылки.
              </p>
              <p className="text-sm text-muted-foreground">
                Правильный формат: booking?organisationId=1
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const [bookingData, setBookingData] = useState<BookingData>({
    name: '',
    phone: '',
    branch: '',
  });

  const { data: organisationBranches, isLoading: organisationBranchesLoading, error: organisationBranchesError } = useQuery({
    queryKey: ['organisationBranches', organisationId],
    queryFn: () => getOrganisationBranches(organisationId),
    enabled: !!organisationId
  });

  const { data: servicesList, isLoading: servicesLoading } = useQuery({
    queryKey: ['servicesList', bookingData?.branch],
    queryFn: () => getServices(bookingData?.branch || ''),
    enabled: !!bookingData?.branch
  });

  const { data: mastersList, isLoading: mastersLoading } = useQuery({
    queryKey: ['mastersList', bookingData?.branch],
    queryFn: () => getMasters(bookingData?.branch || ''),
    enabled: !!bookingData?.branch
  });

  const [currentStep, setCurrentStep] = useState<BookingStep>(BookingStep.Branch);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const { data: masterDetails, isLoading: masterDetailsLoading } = useQuery({
    queryKey: ['masterDetails', bookingData?.masterId],
    queryFn: () => getMasterDetails(bookingData?.masterId || 0),
    enabled: !!bookingData?.masterId
  });

  const { data: masterWorkingDates, isLoading: workingDatesLoading } = useQuery({
    queryKey: ['masterWorkingDates', bookingData?.branch],
    queryFn: () => getMasterWorkingDates(bookingData?.branch || ''),
    enabled: !!bookingData?.branch
  });

  // Запрос для получения доступных временных слотов
  const { data: availableSlots, isLoading: availableSlotsLoading } = useQuery({
    queryKey: ['availableSlots', bookingData?.masterId, selectedDate, bookingData?.branch],
    queryFn: () => {
      if (!bookingData.masterId || !selectedDate || !bookingData.branch) return [];
      const dateStr = formatDateForAPI(selectedDate);
      return getAvailableTimeSlots(bookingData.masterId, dateStr, bookingData.branch);
    },
    enabled: !!bookingData?.masterId && !!selectedDate && !!bookingData?.branch
  });

  const generateTimeSlots = (startHour: string, endHour: string): string[] => {
    // Проверяем, что startHour и endHour определены
    if (!startHour || !endHour) {
      console.warn('generateTimeSlots: startHour or endHour is undefined', { startHour, endHour });
      return [];
    }

    const slots: string[] = [];
    
    try {
      const [startH, startM] = startHour.split(':').map(Number);
      const [endH, endM] = endHour.split(':').map(Number);

      // Проверяем, что часы и минуты валидны
      if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) {
        console.warn('generateTimeSlots: Invalid time format', { startHour, endHour });
        return [];
      }

      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      let currentSlotHour = startH;
      let currentSlotMinute = startM;

      while (currentSlotHour < endH || (currentSlotHour === endH && currentSlotMinute < endM)) {
        // Показывать только будущие временные слоты
        if (currentSlotHour > currentHour || (currentSlotHour === currentHour && currentSlotMinute > currentMinute)) {
          slots.push(`${String(currentSlotHour).padStart(2, '0')}:${String(currentSlotMinute).padStart(2, '0')}`);
        }

        currentSlotMinute += 30;
        if (currentSlotMinute >= 60) {
          currentSlotMinute = 0;
          currentSlotHour += 1;
        }
      }

      return slots;
    } catch (error) {
      console.error('generateTimeSlots: Error generating time slots', error);
      return [];
    }
  };

  const goToStep = (step: BookingStep) => {
    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Функция для получения доступных дат (когда работает хотя бы один мастер)
  const getAvailableDates = (): Date[] => {
    if (!masterWorkingDates || !Array.isArray(masterWorkingDates)) {
      return [];
    }

    const availableDates = new Set<string>();
    
    masterWorkingDates.forEach((workingDate: any) => {
      if (workingDate.is_active && workingDate.work_date) {
        availableDates.add(workingDate.work_date);
      }
    });

    return Array.from(availableDates).map(dateStr => new Date(dateStr));
  };

  // Функция для получения мастеров, работающих в выбранную дату
  const getMastersForDate = (date: Date): any[] => {
    if (!masterWorkingDates || !Array.isArray(masterWorkingDates) || !mastersList) {
      return [];
    }

    const dateStr = formatDateForAPI(date);
    const workingMasterIds = new Set<number>();

    masterWorkingDates.forEach((workingDate: any) => {
      if (workingDate.is_active && workingDate.work_date) {
        // Приводим work_date к формату YYYY-MM-DD для сравнения
        const workDateStr = formatDateForAPI(new Date(workingDate.work_date));
        if (workDateStr === dateStr) {
          workingMasterIds.add(workingDate.master_id);
        }
      }
    });

    return mastersList.filter((master: any) => workingMasterIds.has(master.id));
  };

  const handleBranchSelect = (branchId: string) => {
    setBookingData(prev => ({ ...prev, branch: branchId }));
    goToStep(BookingStep.Service);
  };

  const handleServiceSelect = (serviceId: string, duration: number, price: number) => {
    setBookingData(prev => ({
      ...prev,
      serviceId,
      serviceDuration: duration,
      servicePrice: price
    }));
    goToStep(BookingStep.Date);
  };

  const handleMasterSelect = (masterId: number) => {
    setBookingData(prev => ({ ...prev, masterId }));
    goToStep(BookingStep.Time);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setBookingData(prev => ({ ...prev, date }));
      goToStep(BookingStep.Master);
    }
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTimeSlot(time);
    setBookingData(prev => ({ ...prev, time }));

    setTimeout(() => {
      goToStep(BookingStep.ClientInfo);
    }, 300);
  };

  const formatPhone = (input: string) => {
    let cleaned = input.replace(/\D/g, '');
    if (!cleaned.startsWith('996')) {
      cleaned = '996' + cleaned;
    }
    cleaned = cleaned.substring(0, 12);
    return '+' + cleaned;
  };

  const isPhoneValid = (phone: string) => {
    return /^\+996\d{9}$/.test(phone);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setBookingData(prev => ({ ...prev, phone: formatted }));
  };

  const submitBooking = async () => {
    try {
      setIsSubmitting(true);

      // Формируем datetime в формате YYYY-MM-DDTHH:mm
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const datetime = `${year}-${month}-${day}T${bookingData.time}`;

      const bookingPayload = {
        branchId: String(bookingData.branch),
        datetime: datetime,
        masterId: Number(bookingData.masterId),
        name: bookingData.name,
        phone: bookingData.phone,
        serviceDuration: Number(bookingData.serviceDuration),
        serviceId: String(bookingData.serviceId),
        servicePrice: Number(bookingData.servicePrice)
      };

      console.log('Booking payload:', bookingPayload);

      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/booking`,
        bookingPayload
      );

      console.log('Booking response:', response.data);

      toast({
        title: "Запись создана",
        description: "Ваша запись успешно создана! Пожалуйста, сделайте снимок экрана и сохраните это себе, чтобы не забыть.",
      });

      goToStep(BookingStep.Confirmation);
    } catch (error: any) {
      console.error('Booking error:', error);
      console.error('Error response:', error.response?.data);

      const errorMessage = error.response?.data?.message || "Не удалось создать запись. Попробуйте еще раз.";

      toast({
        title: "Ошибка",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const ProgressBar = () => {
    const steps = ['Филиал', 'Услуга', 'Дата', 'Мастер', 'Время', 'Контакты'];
    const progress = (currentStep / 5) * 100;

    return (
      <div className="w-full space-y-3 mb-8">
        <div className="flex justify-between text-xs">
          {steps.map((step, index) => (
            <div
              key={step}
              className={`flex-1 text-center transition-colors duration-300 ${index <= currentStep
                ? 'text-primary font-medium'
                : 'text-muted-foreground'
                }`}
            >
              {!isMobile && step}
            </div>
          ))}
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-sky-500 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  };

  const InfoCard = () => {
    const branch = organisationBranches?.branches?.find((b: any) => b.id === bookingData.branch);
    const service = servicesList?.find((s: any) => s.id === bookingData.serviceId);
    const master = mastersList?.find((m: any) => m.id === bookingData.masterId);

    if (!branch && !service && !master && !bookingData.date) return null;

    return (
      <Card className="mb-6 border-primary/20 bg-gradient-to-br from-blue-50/50 to-sky-50/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-600" />
            Ваша запись
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {branch && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{branch.branches}</span>
            </div>
          )}
          {service && (
            <div className="flex items-center gap-2">
              <Scissors className="h-4 w-4 text-muted-foreground" />
              <span>
                {service.name}
                {bookingData.serviceDuration && (
                  <Badge variant="secondary" className="ml-2">
                    {bookingData.serviceDuration} мин
                  </Badge>
                )}
              </span>
            </div>
          )}
          {master && (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{master.name}</span>
            </div>
          )}
          {bookingData.date && (
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <span>
                {bookingData.date.toLocaleDateString('ru-RU', { 
                  day: 'numeric', 
                  month: 'long' 
                })}
                {bookingData.time && ` в ${bookingData.time}`}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderBranchStep = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Выберите филиал</h2>
        <p className="text-muted-foreground">Где вам удобнее?</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {organisationBranches?.branches?.map((branch: any, index: number) => (
          <Card
            key={branch.id}
            className="cursor-pointer transition-all hover:shadow-lg hover:scale-105 hover:border-primary/50 group animate-in fade-in slide-in-from-bottom-2 duration-300"
            style={{ animationDelay: `${index * 150}ms` }}
            onClick={() => handleBranchSelect(branch.id)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="group-hover:text-primary transition-colors">
                    {branch.branches}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {branch.address}
                  </CardDescription>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderServiceStep = () => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-3xl font-bold tracking-tight">Выберите услугу</h2>
            <p className="text-muted-foreground">Что вам нужно?</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => goToStep(BookingStep.Branch)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </div>

        <InfoCard />

        <div className="grid gap-4 md:grid-cols-2">
          {servicesList?.map((service: any) => {
            const durationFields = [
              { key: 'duration10_price', duration: 10 },
              { key: 'duration15_price', duration: 15 },
              { key: 'duration20_price', duration: 20 },
              { key: 'duration30_price', duration: 30 },
              { key: 'duration40_price', duration: 40 },
              { key: 'duration50_price', duration: 50 },
              { key: 'duration60_price', duration: 60 },
              { key: 'duration75_price', duration: 75 },
              { key: 'duration80_price', duration: 80 },
              { key: 'duration90_price', duration: 90 },
              { key: 'duration110_price', duration: 110 },
              { key: 'duration120_price', duration: 120 },
              { key: 'duration150_price', duration: 150 },
              { key: 'duration220_price', duration: 220 },
            ];

            const firstAvailableDuration = durationFields.find(
              (field) => service[field.key] !== null
            );

            return (
              <Card
                key={service.id}
                className="cursor-pointer transition-all hover:shadow-lg hover:border-primary/50 group"
                onClick={() => handleServiceSelect(
                  service.id,
                  firstAvailableDuration?.duration || service.defaultDuration || 60,
                  firstAvailableDuration ? service[firstAvailableDuration.key] : 0
                )}
              >
                <CardHeader>
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1 flex-1">
                      <CardTitle className="text-lg group-hover:text-primary transition-colors">
                        {service.name}
                      </CardTitle>
                    </div>
                    <div className="text-right shrink-0">
                      {firstAvailableDuration ? (
                        <div className="font-semibold text-primary">
                          {service[firstAvailableDuration.key]} сом
                        </div>
                      ) : (
                        <div className="font-semibold text-primary">Цена не указана</div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        {firstAvailableDuration?.duration || service.defaultDuration} мин
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  const renderMasterStep = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight text-[var(--color-dark-blue)]">Выберите мастера</h2>
          <p className="text-muted-foreground">Кто вас обслужит?</p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => goToStep(BookingStep.Date)}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
      </div>

      <InfoCard />

      {mastersLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (() => {
        // Получаем мастеров, работающих в выбранную дату
        const availableMasters = getMastersForDate(selectedDate);
        
        return availableMasters && availableMasters.length > 0 ? (
          <div className="bg-white/60 backdrop-blur-sm rounded-xl shadow-lg border border-white/40 p-6 transition-all duration-300 hover:shadow-xl">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {availableMasters.map((master: any) => (
                <Card
                  key={master.id}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 active:scale-95 group ${
                    bookingData.masterId === master.id 
                      ? 'border-[var(--color-primary)] bg-gradient-to-br from-[var(--color-primary)]/10 to-[var(--color-light-blue)]/5 shadow-lg' 
                      : 'hover:border-[var(--color-primary)]/50 bg-white/80 backdrop-blur-sm'
                  }`}
                  onClick={() => handleMasterSelect(master.id)}
              >
                <CardContent className="p-6 text-center space-y-4">
                  <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-sky-100 flex items-center justify-center text-2xl font-semibold text-blue-700">
                    {master.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold group-hover:text-primary transition-colors">
                      {master.name}
                    </h3>
                    {master.specialty && (
                      <p className="text-sm text-muted-foreground">{master.specialty}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            </div>
          </div>
        ) : (
          <div className="bg-white/60 backdrop-blur-sm rounded-xl shadow-lg border border-white/40 p-6">
            <div className="p-12 text-center">
              <p className="text-muted-foreground">
                На выбранную дату ({selectedDate.toLocaleDateString('ru-RU')}) нет доступных мастеров
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Попробуйте выбрать другую дату
              </p>
            </div>
          </div>
        );
      })()}
    </div>
  );

  // Функция для рендера шага выбора даты
  const renderDateStep = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const availableDates = getAvailableDates();
    
    console.log('renderDateStep:', {
      masterWorkingDates,
      availableDates,
      workingDatesLoading
    });
    
    // Функция для проверки, доступна ли дата для записи
    const isDateAvailable = (date: Date): boolean => {
      if (date < today) return false; // Прошедшие даты недоступны
      
      if (!masterWorkingDates || !Array.isArray(masterWorkingDates)) {
        console.log('masterWorkingDates not available:', masterWorkingDates);
        return false;
      }
      
      const dateStr = formatDateForAPI(date);
      const isAvailable = masterWorkingDates.some((workingDate: any) => {
        if (!workingDate.is_active) return false;
        
        // Приводим work_date к формату YYYY-MM-DD для сравнения
        const workDateStr = formatDateForAPI(new Date(workingDate.work_date));
        return workDateStr === dateStr;
      });
      
      console.log(`Date ${dateStr} is available:`, isAvailable);
      return isAvailable;
    };

    return (
      <div className="space-y-6 max-w-full px-2 sm:px-0">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Выберите дату</h2>
            <p className="text-muted-foreground text-sm sm:text-base">Когда вам удобно записаться?</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => goToStep(BookingStep.Service)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </div>

        <InfoCard />

        {workingDatesLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !masterWorkingDates || !Array.isArray(masterWorkingDates) ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">Загрузка рабочих дат...</p>
              <p className="text-xs text-red-500 mt-2">
                Debug: masterWorkingDates = {JSON.stringify(masterWorkingDates)}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Кнопки быстрого выбора даты */}
            <div className="flex gap-3">
              <Button
                variant={(() => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const selected = new Date(selectedDate);
                  selected.setHours(0, 0, 0, 0);
                  return today.getTime() === selected.getTime() ? "default" : "outline";
                })()}
                size="sm"
                onClick={() => {
                  const today = new Date();
                  if (isDateAvailable(today)) {
                    handleDateSelect(today);
                  }
                }}
                disabled={!isDateAvailable(new Date())}
                className={`flex-1 h-12 text-sm sm:text-base transition-all duration-200 hover:scale-105 active:scale-95 ${
                  (() => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const selected = new Date(selectedDate);
                    selected.setHours(0, 0, 0, 0);
                    return today.getTime() === selected.getTime() 
                      ? "bg-gradient-to-r from-blue-500 to-sky-500 text-white border-transparent"
                      : "bg-gradient-to-r from-blue-50 to-sky-50 hover:from-blue-100 hover:to-sky-100";
                  })()
                }`}
              >
                <CalendarIcon className="h-4 w-4 mr-2" />
                <span className="font-medium">Сегодня</span>
                <span className="ml-2 text-xs opacity-70">
                  {new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                </span>
              </Button>
              
              <Button
                variant={(() => {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  tomorrow.setHours(0, 0, 0, 0);
                  const selected = new Date(selectedDate);
                  selected.setHours(0, 0, 0, 0);
                  return tomorrow.getTime() === selected.getTime() ? "default" : "outline";
                })()}
                size="sm"
                onClick={() => {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  if (isDateAvailable(tomorrow)) {
                    handleDateSelect(tomorrow);
                  }
                }}
                disabled={(() => {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  return !isDateAvailable(tomorrow);
                })()}
                className={`flex-1 h-12 text-sm sm:text-base transition-all duration-200 hover:scale-105 active:scale-95 ${
                  (() => {
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    tomorrow.setHours(0, 0, 0, 0);
                    const selected = new Date(selectedDate);
                    selected.setHours(0, 0, 0, 0);
                    return tomorrow.getTime() === selected.getTime() 
                      ? "bg-gradient-to-r from-sky-500 to-blue-500 text-white border-transparent"
                      : "bg-gradient-to-r from-sky-50 to-blue-50 hover:from-sky-100 hover:to-blue-100";
                  })()
                }`}
              >
                <Sun className="h-4 w-4 mr-2" />
                <span className="font-medium">Завтра</span>
                <span className="ml-2 text-xs opacity-70">
                  {(() => {
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    return tomorrow.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
                  })()}
                </span>
              </Button>
            </div>

            {/* Календарь */}
            <div className="bg-white/60 backdrop-blur-sm rounded-xl shadow-lg border border-white/40 p-6 transition-all duration-300 hover:shadow-xl">
              <div className="flex justify-center items-center py-4 w-full">
                <div className="w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl flex justify-center">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    disabled={(date) => !isDateAvailable(date)}
                    className="rounded-md border-0 mx-auto scale-110 sm:scale-100 transform-gpu
                      [&_.rdp]:flex 
                      [&_.rdp]:justify-center
                      [&_.rdp-month]:w-auto 
                      [&_.rdp-table]:w-auto 
                      [&_.rdp-tbody]:w-auto
                      [&_.rdp-day_button]:hover:bg-[var(--color-primary)]/10
                      [&_.rdp-day_selected]:bg-gradient-to-r
                      [&_.rdp-day_selected]:from-[var(--color-primary)]
                      [&_.rdp-day_selected]:to-[var(--color-light-blue)]
                      [&_.rdp-day_selected]:text-white
                      [&_.rdp-day_today]:bg-[var(--color-light-blue)]/20
                      [&_.rdp-day_today]:font-bold
                      [&_.rdp-head_cell]:text-[var(--color-dark-blue)]
                      [&_.rdp-head_cell]:font-semibold"
                    locale={ru}
                  />
                  {availableDates.length === 0 && (
                    <div className="text-center mt-4 text-muted-foreground">
                      <p>На данный момент нет доступных дат для записи.</p>
                      <p className="text-sm">Попробуйте выбрать другой филиал.</p>
                      <p className="text-xs text-red-500 mt-2">
                        Debug: {masterWorkingDates.length} working dates found
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTimeStep = () => {
    // Получаем рабочие часы выбранного мастера на выбранную дату
    const getSelectedMasterWorkingHours = () => {
      if (!masterWorkingDates || !Array.isArray(masterWorkingDates) || !bookingData.masterId || !selectedDate) {
        return { start: "09:00", end: "18:00" };
      }

      const dateStr = formatDateForAPI(selectedDate);
      const masterWorkingDate = masterWorkingDates.find((wd: any) => {
        if (wd.master_id !== bookingData.masterId || !wd.is_active) return false;
        
        // Приводим work_date к формату YYYY-MM-DD для сравнения
        const workDateStr = formatDateForAPI(new Date(wd.work_date));
        return workDateStr === dateStr;
      });

      if (masterWorkingDate) {
        return {
          start: masterWorkingDate.start_time || "09:00",
          end: masterWorkingDate.end_time || "18:00"
        };
      }

      return { start: "09:00", end: "18:00" };
    };

    const workingHours = getSelectedMasterWorkingHours();
    
    // Используем данные из API или генерируем слоты как fallback
    let availableTimeSlots: string[] = [];
    
    if (availableSlots && Array.isArray(availableSlots)) {
      // Используем данные из API
      availableTimeSlots = availableSlots
        .filter(slot => slot.available)
        .map(slot => slot.time);
    } else {
      // Fallback: генерируем слоты как раньше
      const allTimeSlots = generateTimeSlots(workingHours.start, workingHours.end);
      availableTimeSlots = allTimeSlots; // Все слоты считаем доступными
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-3xl font-bold tracking-tight text-[var(--color-dark-blue)]">Выберите время</h2>
            <p className="text-muted-foreground">Когда вам удобно?</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => goToStep(BookingStep.Master)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </div>

        <InfoCard />

        {masterDetailsLoading || availableSlotsLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white/60 backdrop-blur-sm rounded-xl shadow-lg border border-white/40 overflow-hidden">
              <div className="bg-gradient-to-r from-[var(--color-primary)]/10 via-[var(--color-light-blue)]/5 to-[var(--color-primary)]/10 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2 text-[var(--color-dark-blue)]">
                      <CalendarIcon className="h-5 w-5 text-[var(--color-primary)]" />
                      Дата записи
                    </h3>
                    <p className="mt-1 text-muted-foreground">
                      {selectedDate.toLocaleDateString('ru-RU', { 
                        weekday: 'long', 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric' 
                      })}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-sm bg-[var(--color-primary)]/10 text-[var(--color-dark-blue)] border-[var(--color-primary)]/20">
                    Выбрано
                  </Badge>
                </div>
              </div>
            </div>

            <div className="bg-white/60 backdrop-blur-sm rounded-xl shadow-lg border border-white/40 overflow-hidden">
              <div className="p-6">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-[var(--color-dark-blue)] mb-2">
                  <Clock className="h-5 w-5 text-[var(--color-primary)]" />
                  Свободное время
                </h3>
                <p className="text-muted-foreground mb-4">
                  Рабочие часы: {workingHours.start} - {workingHours.end}
                  {availableSlots && availableSlots.length > 0 && (
                    <span className="block text-xs text-green-600 mt-1">
                      Найдено {availableSlots.filter(slot => slot.available).length} доступных вариантов для записи
                    </span>
                  )}
                </p>
                <div>
                <div className="relative">
                  <div className="overflow-x-auto pb-4 scrollbar-track-transparent hover:scrollbar-thumb-primary/40" style={{ 
                    scrollbarWidth: 'auto',
                    scrollbarColor: 'rgba(0, 174, 239, 0.6) transparent',
                    scrollbarGutter: 'stable'
                  }}>
                    <div className="flex gap-3 min-w-max px-2">
                      {availableTimeSlots.map((time: string) => (
                        <button
                          key={time}
                          onClick={() => handleTimeSelect(time)}
                          className={`group relative flex-shrink-0 w-24 h-28 rounded-2xl border-2 transition-all duration-300 hover:scale-105 hover:shadow-lg ${selectedTimeSlot === time
                            ? 'border-primary bg-gradient-to-br from-blue-500 to-sky-500 text-white shadow-xl scale-105'
                            : 'border-gray-200 bg-white hover:border-primary/50 hover:bg-blue-50/50'
                            }`}
                        >
                          <div className="flex flex-col items-center justify-center h-full gap-2">
                            <Clock className={`h-5 w-5 transition-colors ${selectedTimeSlot === time ? 'text-white' : 'text-primary'
                              }`} />
                            <span className={`text-xl font-bold transition-colors ${selectedTimeSlot === time ? 'text-white' : 'text-gray-900'
                              }`}>
                              {time}
                            </span>
                            {selectedTimeSlot === time && (
                              <CheckCircle2 className="h-4 w-4 text-white" />
                            )}
                          </div>
                          {selectedTimeSlot === time && (
                            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-400/20 to-sky-400/20 animate-pulse" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="absolute right-0 top-0 bottom-4 w-16 bg-gradient-to-l from-white to-transparent pointer-events-none" />
                  <div className="absolute left-0 top-0 bottom-4 w-16 bg-gradient-to-r from-white to-transparent pointer-events-none" />
                </div>

                {availableTimeSlots.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Нет свободных временных слотов</p>
                    <p className="text-sm mt-2">Попробуйте выбрать другого мастера или дату</p>
                  </div>
                )}

                {availableTimeSlots.length > 0 && (
                  <div className="mt-4 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                    <div className="flex items-center gap-1">
                      <div className="w-6 h-0.5 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                      <span>Листайте для просмотра всех слотов</span>
                      <div className="w-6 h-0.5 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                    </div>
                  </div>
                )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderClientInfoStep = () => (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">Ваши контакты</h2>
          <p className="text-muted-foreground">Почти готово!</p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => goToStep(BookingStep.Time)}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
      </div>

      <InfoCard />

      <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 p-8 transition-all duration-300 hover:shadow-xl">
        <div className="pt-2 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Ваше имя</Label>
            <Input
              id="name"
              placeholder="Иван Иванов"
              value={bookingData.name}
              onChange={(e) => setBookingData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Номер телефона</Label>
            <Input
              id="phone"
              placeholder="+996 XXX XXX XXX"
              value={bookingData.phone}
              onChange={handlePhoneChange}
            />
            {bookingData.phone && !isPhoneValid(bookingData.phone) && (
              <p className="text-sm text-destructive">
                Введите корректный номер
              </p>
            )}
          </div>

          <Button
            className="w-full h-12 text-base animate-in fade-in slide-in-from-bottom-2 duration-400"
            style={{ animationDelay: '600ms' }}
            size="lg"
            onClick={submitBooking}
            disabled={!bookingData.name || !isPhoneValid(bookingData.phone) || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Создание записи...
              </>
            ) : (
              <>
                Подтвердить запись
                <ChevronRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );

  const renderConfirmationStep = () => {
    // Получаем данные о выбранном филиале и мастере
    const selectedBranch = organisationBranches?.branches?.find((b: any) => b.id === bookingData.branch);
    const selectedMaster = mastersList?.find((m: any) => m.id === bookingData.masterId);
    
    return (
    <div className="space-y-6 text-center max-w-2xl mx-auto">
      <div className="flex flex-col items-center">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-100 to-emerald-50 flex items-center justify-center mb-4 shadow-lg">
          <CheckCircle2 className="h-10 w-10 text-green-600" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight mb-2 text-[var(--color-dark-blue)]">Готово!</h2>
        <p className="text-muted-foreground text-lg">
          Ваша запись успешно создана
        </p>
      </div>

      <div className="bg-gradient-to-br from-green-50/80 via-emerald-50/60 to-white/70 backdrop-blur-sm rounded-xl shadow-lg border border-green-200/50 p-8 transition-all duration-300 hover:shadow-xl">
        <div className="pt-2 space-y-4 text-left">
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-muted-foreground" />
            <span>{bookingData.name}</span>
          </div>
          <Separator />
          <div className="flex items-center gap-3">
            <Phone className="h-5 w-5 text-muted-foreground" />
            <span>{bookingData.phone}</span>
          </div>
          <Separator />
          {selectedMaster && (
            <div className="flex items-center gap-3">
              <Scissors className="h-5 w-5 text-muted-foreground" />
              <span>Мастер: {selectedMaster.name}</span>
            </div>
          )}
          {selectedMaster && <Separator />}
          {selectedBranch && (
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <div className="flex flex-col">
                <span>{selectedBranch.name}</span>
                {selectedBranch.address && (
                  <span className="text-sm text-muted-foreground">{selectedBranch.address}</span>
                )}
              </div>
            </div>
          )}
          {selectedBranch && <Separator />}
          <div className="flex items-center gap-3">
            <CalendarIcon className="h-5 w-5 text-muted-foreground" />
            <span>
              {bookingData.date && bookingData.date.toLocaleDateString('ru-RU', { 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
              })}
              {' в '}
              {bookingData.time}
            </span>
          </div>
        </div>
      </div>

      <Button
        variant="outline"
        className="bg-gradient-to-r from-[var(--color-primary)]/10 to-[var(--color-light-blue)]/10 hover:from-[var(--color-primary)]/20 hover:to-[var(--color-light-blue)]/20 border-[var(--color-primary)]/30 text-[var(--color-dark-blue)] transition-all duration-200 hover:scale-105"
        onClick={() => {
          setBookingData({ name: '', phone: '' });
          goToStep(BookingStep.Branch);
        }}
      >
        Создать новую запись
      </Button>
    </div>
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case BookingStep.Branch: return renderBranchStep();
      case BookingStep.Service: return renderServiceStep();
      case BookingStep.Date: return renderDateStep();
      case BookingStep.Master: return renderMasterStep();
      case BookingStep.Time: return renderTimeStep();
      case BookingStep.ClientInfo: return renderClientInfoStep();
      case BookingStep.Confirmation: return renderConfirmationStep();
      default: return renderBranchStep();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/40 to-cyan-50/60 relative">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-tr from-[var(--color-primary)]/5 via-transparent to-[var(--color-light-blue)]/10 pointer-events-none"></div>
      
      <header className="border-b bg-white/95 backdrop-blur-md sticky top-0 z-50 shadow-sm relative">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img 
                src="/PROM_logo_mid_blue.svg" 
                alt="Logo" 
                className="h-8 w-8"
              />
              <div>
                <h1 className="text-2xl font-bold text-[var(--color-dark-blue)]">
                  OCTO CRM
                </h1>
                <p className="text-sm text-muted-foreground">Онлайн-запись</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl relative z-10">
        {currentStep !== BookingStep.Confirmation && <ProgressBar />}
        {renderStepContent()}
      </main>
    </div>
  );
};

export default BookingPage;