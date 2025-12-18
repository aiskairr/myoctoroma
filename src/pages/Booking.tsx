import React, { useState, useEffect } from 'react';
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
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { LocaleProvider, useLocale } from '@/contexts/LocaleContext';
import { LocaleToggle } from '@/components/ui/locale-toggle';
import { extractTrackingInfo } from '@/utils/tracking';
import PrivacyConsent from "@/components/PrivacyConsent";
import * as BookingService from '@/services/booking-service';

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

// Используем новый booking API для получения филиалов
const getOrganisationBranches = async (organisationId: string): Promise<any> => {
  const token = localStorage.getItem('guest_token') || localStorage.getItem('auth_token');
  const url = `${import.meta.env.VITE_SECONDARY_BACKEND_URL}/booking/branches?organizationId=${organisationId}`;
  
  const res = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    cache: 'no-store'
  });
  
  if (!res.ok && res.status !== 304) {
    const errorText = await res.text();
    throw new Error(`Failed to load branches: ${res.status} ${errorText}`);
  }

  // 304 может прийти с пустым телом — считаем, что данных нет, чтобы не падать
  const branches = res.status === 304 ? [] : await res.json().catch(() => []);

  // Преобразуем формат ответа для совместимости со старым кодом
  return {
    branches: branches.map((branch: any) => ({
      id: branch.id.toString(),
      branches: branch.name,
      name: branch.name,
      address: branch.address,
      phone: branch.phone,
      timezone: branch.timezone,
      isActive: branch.isActive,
      organization_id: branch.organization_id
    }))
  };
};

const getServices = async (branchId: string): Promise<any> => {
  const token = localStorage.getItem('auth_token');
  const response = await axios.get(
    `${import.meta.env.VITE_BACKEND_URL}/services?branchId=${branchId}&page=1&limit=1000&_=${Date.now()}`,
    {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
      withCredentials: true,
    }
  );
  // API возвращает пагинированный ответ { data: [...] }
  return (response.data as any).data || [];
};

// Используем новый booking API для получения сотрудников (мастеров)
const getMasters = async (branchId: string): Promise<any> => {
  const response = await BookingService.getStaff(undefined, branchId);
  // Преобразуем формат ответа для совместимости со старым кодом
  return response.data.map(staff => ({
    id: staff.id,
    name: BookingService.getStaffFullName(staff),
    specialty: staff.specialty,
    is_active: staff.is_active,
    role: staff.role,
    email: staff.email,
    photo_url: staff.photo_url
  }));
};

const getMasterDetails = async (masterId: number): Promise<any> => {
  const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/staff/${masterId}`);
  return response.data;
};

// Функция для получения назначений (assignments) с использованием нового эндпоинта
const getAssignments = async (branchId: string, date?: string, employeeId?: number): Promise<any> => {
  try {
    const params = new URLSearchParams({
      branchId: branchId,
      page: '1',
      limit: '1000',
      _: Date.now().toString()
    });

    if (date) {
      params.append('date', date);
    }

    if (employeeId) {
      params.append('employeeId', employeeId.toString());
    }

    const token = localStorage.getItem('auth_token') || localStorage.getItem('guest_token');
    const response = await axios.get(`${import.meta.env.VITE_SECONDARY_BACKEND_URL}/assignments?${params.toString()}`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
      withCredentials: true,
    });

    console.log('getAssignments response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch assignments:', error);
    throw error;
  }
};

// Функция для получения рабочих дат мастеров из assignments
const getMasterWorkingDates = async (branchId: string): Promise<any> => {
  try {
    const assignmentsData = await getAssignments(branchId);

    // Извлекаем уникальные даты и сотрудников из назначений
    const workingDates: any[] = [];
    const dateEmployeeMap = new Map<string, Set<number>>();

    assignmentsData.data?.forEach((assignment: any) => {
      const date = assignment.assignment_date.split('T')[0];
      const employeeId = assignment.employee_id;

      if (!dateEmployeeMap.has(date)) {
        dateEmployeeMap.set(date, new Set());
      }
      dateEmployeeMap.get(date)?.add(employeeId);
    });

    // Преобразуем в формат, совместимый со старым API
    dateEmployeeMap.forEach((employeeIds, date) => {
      employeeIds.forEach(employeeId => {
        const assignments = assignmentsData.data.filter(
          (a: any) => a.employee_id === employeeId && a.assignment_date.split('T')[0] === date
        );

        if (assignments.length > 0) {
          const firstAssignment = assignments[0];
          const lastAssignment = assignments[assignments.length - 1];

          workingDates.push({
            id: `${employeeId}-${date}`,
            master_id: employeeId,
            master_name: firstAssignment.employee_snapshot?.first_name || '',
            work_date: date,
            start_time: firstAssignment.start_time || '09:00',
            end_time: lastAssignment.end_time || '18:00',
            branch_id: branchId,
            is_active: true
          });
        }
      });
    });

    console.log('getMasterWorkingDates (from assignments):', workingDates);
    return workingDates;
  } catch (error) {
    console.error('Failed to get master working dates:', error);
    return [];
  }
};

// Функция для получения доступных временных слотов на основе assignments
const getAvailableTimeSlots = async (masterId: number, date: string, branchId: string): Promise<{ time: string; available: boolean }[]> => {
  try {
    // Получаем назначения для конкретного мастера и даты
    const assignmentsData = await getAssignments(branchId, date, masterId);

    // Получаем все занятые временные слоты
    const bookedSlots = new Set<string>();
    assignmentsData.data?.forEach((assignment: any) => {
      const startTime = assignment.start_time;
      const endTime = assignment.end_time;

      // Добавляем все временные слоты в диапазоне от startTime до endTime
      const [startHour, startMinute] = startTime.split(':').map(Number);
      const [endHour, endMinute] = endTime.split(':').map(Number);

      let currentHour = startHour;
      let currentMinute = startMinute;

      while (currentHour < endHour || (currentHour === endHour && currentMinute < endMinute)) {
        const timeSlot = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
        bookedSlots.add(timeSlot);

        currentMinute += 30;
        if (currentMinute >= 60) {
          currentMinute = 0;
          currentHour += 1;
        }
      }
    });

    // Генерируем все возможные временные слоты (с 09:00 до 20:00)
    const allSlots: { time: string; available: boolean }[] = [];
    for (let hour = 9; hour < 20; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeSlot = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        allSlots.push({
          time: timeSlot,
          available: !bookedSlots.has(timeSlot)
        });
      }
    }

    console.log('getAvailableTimeSlots (from assignments):', allSlots);
    return allSlots;
  } catch (error) {
    console.error('Failed to get available time slots:', error);
    // В случае ошибки возвращаем все слоты как доступные
    const fallbackSlots: { time: string; available: boolean }[] = [];
    for (let hour = 9; hour < 20; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeSlot = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        fallbackSlots.push({
          time: timeSlot,
          available: true
        });
      }
    }
    return fallbackSlots;
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

const BookingStep = {
  Branch: 0,
  Service: 1,
  Date: 2,
  Master: 3,
  Time: 4,
  ClientInfo: 5,
  Confirmation: 6
} as const;

type BookingStepType = typeof BookingStep[keyof typeof BookingStep];

const BookingPageWithTheme: React.FC = () => {
  return (
    <ThemeProvider>
      <LocaleProvider>
        <BookingPageContent />
        <PrivacyConsent storageKey="consent_booking_v1" />
      </LocaleProvider>
    </ThemeProvider>
  );
};

const BookingPageContent: React.FC = () => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { theme } = useTheme();
  const { t } = useLocale();

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
                    Octō CRM
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

  // Получаем гостевой токен при загрузке страницы
  useEffect(() => {
    const fetchGuestToken = async () => {
      try {
        console.log('🔑 Fetching guest token for organization:', organisationId);
        const tokenResponse = await BookingService.getGuestToken(Number(organisationId));

        // Сохраняем токен в localStorage для использования в API запросах
        localStorage.setItem('guest_token', tokenResponse.token);
        console.log('✅ Guest token received and saved');
      } catch (error) {
        console.error('❌ Failed to fetch guest token:', error);
        toast({
          title: "Ошибка авторизации",
          description: "Не удалось получить доступ к системе бронирования",
          variant: "destructive"
        });
      }
    };

    if (organisationId) {
      fetchGuestToken();
    }
  }, [organisationId, toast]);

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

  const [currentStep, setCurrentStep] = useState<BookingStepType>(BookingStep.Branch);
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

  const goToStep = (step: BookingStepType) => {
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

      // Извлекаем информацию об источнике записи для отслеживания
      const trackingInfo = extractTrackingInfo();

      // Формируем дату и время
      const selectedDate = bookingData.date || new Date();
      const assignmentDate = BookingService.formatDateForBookingAPI(selectedDate);

      // Парсим время начала и вычисляем время окончания
      const [hours, minutes] = (bookingData.time || '00:00').split(':').map(Number);
      const startTime = bookingData.time || '00:00';

      // Вычисляем endTime на основе duration
      const duration = bookingData.serviceDuration || 60;
      const endDate = new Date(selectedDate);
      endDate.setHours(hours);
      endDate.setMinutes(minutes + duration);
      const endTime = BookingService.formatTimeForBookingAPI(endDate);

      // Подготавливаем payload для нового API
      const assignmentPayload: BookingService.CreateAssignmentRequest = {
        organizationId: Number(organisationId),
        branchId: Number(bookingData.branch),
        client: {
          firstname: bookingData.name,
          phoneNumber: bookingData.phone
        },
        employeeId: Number(bookingData.masterId),
        assignmentDate: assignmentDate,
        startTime: startTime,
        endTime: endTime,
        service: {
          id: Number(bookingData.serviceId),
          name: '', // Будет заполнено на бэкенде
          price: bookingData.servicePrice || 0,
          duration: duration
        },
        notes: trackingInfo.notesText || undefined,
        source: trackingInfo.trackingSource || 'web',
        paid: 'unpaid'
      };

      console.log('📝 Creating assignment with payload:', assignmentPayload);
      if (trackingInfo.notesText) {
        console.log('📌 Tracking info:', {
          source: trackingInfo.trackingSource || 'Direct',
          parameters: trackingInfo.parameters
        });
      }

      const response = await BookingService.createAssignment(assignmentPayload);

      console.log('✅ Assignment created:', response.data);

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
    const steps = [
      t('booking.step.branch'),
      t('booking.step.service'),
      t('booking.step.date'),
      t('booking.step.master'),
      t('booking.step.time'),
      t('booking.step.contacts')
    ];
    const progress = (currentStep / 5) * 100;

    return (
      <div className="w-full space-y-3 mb-8">
        <div className="flex justify-between text-xs">
          {steps.map((step, index) => (
            <div
              key={step}
              className={`flex-1 text-center transition-colors duration-300 ${
                index <= currentStep
                  ? theme === 'dark' 
                    ? 'text-blue-400 font-medium' 
                    : 'text-primary font-medium'
                  : theme === 'dark'
                    ? 'text-slate-400'
                    : 'text-muted-foreground'
              }`}
            >
              {!isMobile && step}
            </div>
          ))}
        </div>
        <div className={`h-2 rounded-full overflow-hidden transition-colors duration-300 ${
          theme === 'dark' ? 'bg-slate-700' : 'bg-secondary'
        }`}>
          <div
            className={`h-full transition-all duration-500 ease-out ${
              theme === 'dark'
                ? 'bg-gradient-to-r from-blue-500 to-purple-500'
                : 'bg-gradient-to-r from-blue-500 to-sky-500'
            }`}
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
      <Card className={`mb-6 transition-all duration-500 ${
        theme === 'dark'
          ? 'border-blue-700/50 bg-gradient-to-br from-slate-800/80 to-slate-700/60 backdrop-blur-sm'
          : 'border-primary/20 bg-gradient-to-br from-blue-50/50 to-sky-50/30'
      }`}>
        <CardHeader className="pb-3">
          <CardTitle className={`text-base flex items-center gap-2 transition-colors duration-300 ${
            theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
          }`}>
            <Sparkles className="h-4 w-4" />
            {t('booking.confirmation.title').replace('!', '')} {t('booking.title').toLowerCase()}
          </CardTitle>
        </CardHeader>
        <CardContent className={`space-y-2 text-sm transition-colors duration-300 ${
          theme === 'dark' ? 'text-slate-200' : ''
        }`}>
          {branch && (
            <div className="flex items-center gap-2">
              <MapPin className={`h-4 w-4 transition-colors duration-300 ${
                theme === 'dark' ? 'text-slate-400' : 'text-muted-foreground'
              }`} />
              <span>{branch.branches}</span>
            </div>
          )}
          {service && (
            <div className="flex items-center gap-2">
              <Scissors className={`h-4 w-4 transition-colors duration-300 ${
                theme === 'dark' ? 'text-slate-400' : 'text-muted-foreground'
              }`} />
              <span>
                {service.name}
                {bookingData.serviceDuration && (
                  <Badge variant="secondary" className={`ml-2 transition-all duration-300 ${
                    theme === 'dark' 
                      ? 'bg-slate-700 text-slate-200 border-slate-600' 
                      : ''
                  }`}>
                    {bookingData.serviceDuration} мин
                  </Badge>
                )}
              </span>
            </div>
          )}
          {master && (
            <div className="flex items-center gap-2">
              <User className={`h-4 w-4 transition-colors duration-300 ${
                theme === 'dark' ? 'text-slate-400' : 'text-muted-foreground'
              }`} />
              <span>{master.name}</span>
            </div>
          )}
          {bookingData.date && (
            <div className="flex items-center gap-2">
              <CalendarIcon className={`h-4 w-4 transition-colors duration-300 ${
                theme === 'dark' ? 'text-slate-400' : 'text-muted-foreground'
              }`} />
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
        <h2 className={`text-3xl font-bold tracking-tight transition-colors duration-300 ${
          theme === 'dark' ? 'text-white' : ''
        }`}>
          {t('booking.branch.title')}
        </h2>
        <p className={`transition-colors duration-300 ${
          theme === 'dark' ? 'text-slate-300' : 'text-muted-foreground'
        }`}>
          {t('booking.branch.subtitle')}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {organisationBranches?.branches?.map((branch: any, index: number) => (
          <Card
            key={branch.id}
            className={`cursor-pointer transition-all hover:scale-105 group animate-in fade-in slide-in-from-bottom-2 duration-300 booking-card ${
              theme === 'dark'
                ? 'bg-slate-800/80 border-slate-700 hover:border-blue-500/50 hover:bg-slate-700/90 backdrop-blur-sm dark-card-bg shadow-dark hover:glow-blue'
                : 'hover:shadow-lg hover:border-primary/50'
            }`}
            style={{ animationDelay: `${index * 150}ms` }}
            onClick={() => handleBranchSelect(branch.id)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className={`transition-colors ${
                    theme === 'dark' 
                      ? 'text-white group-hover:text-blue-400' 
                      : 'group-hover:text-primary'
                  }`}>
                    {branch.branches}
                  </CardTitle>
                  <CardDescription className={`flex items-center gap-1 transition-colors duration-300 ${
                    theme === 'dark' ? 'text-slate-400' : ''
                  }`}>
                    <MapPin className="h-3 w-3" />
                    {branch.address}
                  </CardDescription>
                </div>
                <ChevronRight className={`h-5 w-5 transition-all ${
                  theme === 'dark'
                    ? 'text-slate-400 group-hover:text-blue-400 group-hover:translate-x-1'
                    : 'text-muted-foreground group-hover:text-primary group-hover:translate-x-1'
                }`} />
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
            <h2 className={`text-3xl font-bold tracking-tight transition-colors duration-300 ${
              theme === 'dark' ? 'text-white' : ''
            }`}>
              {t('booking.service.title')}
            </h2>
            <p className={`transition-colors duration-300 ${
              theme === 'dark' ? 'text-slate-300' : 'text-muted-foreground'
            }`}>
              {t('booking.service.subtitle')}
            </p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => goToStep(BookingStep.Branch)}
            className={`transition-all duration-300 ${
              theme === 'dark' 
                ? 'hover:bg-slate-700 text-slate-300 hover:text-white' 
                : ''
            }`}
          >
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
                className={`cursor-pointer transition-all group ${
                  theme === 'dark'
                    ? 'bg-slate-800/80 border-slate-700 hover:border-blue-500/50 hover:bg-slate-700/90 backdrop-blur-sm'
                    : 'hover:shadow-lg hover:border-primary/50'
                }`}
                onClick={() => handleServiceSelect(
                  service.id,
                  firstAvailableDuration?.duration || service.defaultDuration || 60,
                  firstAvailableDuration ? service[firstAvailableDuration.key] : 0
                )}
              >
                <CardHeader>
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1 flex-1">
                      <CardTitle className={`text-lg transition-colors ${
                        theme === 'dark'
                          ? 'text-white group-hover:text-blue-400'
                          : 'group-hover:text-primary'
                      }`}>
                        {service.name}
                      </CardTitle>
                    </div>
                    <div className="text-right shrink-0">
                      {firstAvailableDuration ? (
                        <div className={`font-semibold transition-colors duration-300 ${
                          theme === 'dark' ? 'text-blue-400' : 'text-primary'
                        }`}>
                          {t('booking.service.price')} {service[firstAvailableDuration.key]} сом
                        </div>
                      ) : (
                        <div className={`font-semibold transition-colors duration-300 ${
                          theme === 'dark' ? 'text-blue-400' : 'text-primary'
                        }`}>
                          Цена не указана
                        </div>
                      )}
                      <div className={`text-xs transition-colors duration-300 ${
                        theme === 'dark' ? 'text-slate-400' : 'text-muted-foreground'
                      }`}>
                        {firstAvailableDuration?.duration || service.defaultDuration} {t('booking.service.duration')}
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
          <h2 className={`text-3xl font-bold tracking-tight transition-colors duration-300 ${
            theme === 'dark' ? 'text-white' : 'text-[var(--color-dark-blue)]'
          }`}>
            {t('booking.master.title')}
          </h2>
          <p className={`transition-colors duration-300 ${
            theme === 'dark' ? 'text-slate-300' : 'text-muted-foreground'
          }`}>
            {t('booking.master.subtitle')}
          </p>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => goToStep(BookingStep.Date)}
          className={`transition-all duration-300 ${
            theme === 'dark' 
              ? 'hover:bg-slate-700 text-slate-300 hover:text-white' 
              : ''
          }`}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
      </div>

      <InfoCard />

      {mastersLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className={`h-8 w-8 animate-spin transition-colors duration-300 ${
            theme === 'dark' ? 'text-blue-400' : 'text-primary'
          }`} />
        </div>
      ) : (() => {
        // Получаем мастеров, работающих в выбранную дату
        const availableMasters = getMastersForDate(selectedDate);
        
        return availableMasters && availableMasters.length > 0 ? (
          <div className={`rounded-xl shadow-lg border transition-all duration-500 p-6 hover:shadow-xl ${
            theme === 'dark'
              ? 'bg-slate-800/60 backdrop-blur-sm border-slate-700'
              : 'bg-white/60 backdrop-blur-sm border-white/40'
          }`}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {availableMasters.map((master: any) => (
                <Card
                  key={master.id}
                  className={`cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 group ${
                    bookingData.masterId === master.id 
                      ? theme === 'dark'
                        ? 'border-blue-500 bg-gradient-to-br from-blue-900/30 to-purple-900/20 shadow-lg shadow-blue-500/20'
                        : 'border-[var(--color-primary)] bg-gradient-to-br from-[var(--color-primary)]/10 to-[var(--color-light-blue)]/5 shadow-lg'
                      : theme === 'dark'
                        ? 'hover:border-blue-500/50 bg-slate-700/80 backdrop-blur-sm border-slate-600'
                        : 'hover:border-[var(--color-primary)]/50 bg-white/80 backdrop-blur-sm'
                  }`}
                  onClick={() => handleMasterSelect(master.id)}
                >
                  <CardContent className="p-6 text-center space-y-4">
                    <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center text-2xl font-semibold transition-all duration-300 ${
                      theme === 'dark'
                        ? 'bg-gradient-to-br from-blue-800 to-purple-800 text-blue-200'
                        : 'bg-gradient-to-br from-blue-100 to-sky-100 text-blue-700'
                    }`}>
                      {master.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className={`font-semibold transition-colors ${
                        theme === 'dark'
                          ? 'text-white group-hover:text-blue-400'
                          : 'group-hover:text-primary'
                      }`}>
                        {master.name}
                      </h3>
                      {master.specialty && (
                        <p className={`text-sm transition-colors duration-300 ${
                          theme === 'dark' ? 'text-slate-400' : 'text-muted-foreground'
                        }`}>
                          {master.specialty}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <div className={`rounded-xl shadow-lg border p-6 transition-all duration-500 ${
            theme === 'dark'
              ? 'bg-slate-800/60 backdrop-blur-sm border-slate-700'
              : 'bg-white/60 backdrop-blur-sm border-white/40'
          }`}>
            <div className="p-12 text-center">
              <p className={`transition-colors duration-300 ${
                theme === 'dark' ? 'text-slate-300' : 'text-muted-foreground'
              }`}>
                На выбранную дату ({selectedDate.toLocaleDateString('ru-RU')}) нет доступных мастеров
              </p>
              <p className={`text-sm mt-2 transition-colors duration-300 ${
                theme === 'dark' ? 'text-slate-400' : 'text-muted-foreground'
              }`}>
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
            <h2 className={`text-2xl sm:text-3xl font-bold tracking-tight transition-colors duration-300 ${
              theme === 'dark' ? 'text-white' : ''
            }`}>
              {t('booking.time.select_date_title')}
            </h2>
            <p className={`text-sm sm:text-base transition-colors duration-300 ${
              theme === 'dark' ? 'text-slate-300' : 'text-muted-foreground'
            }`}>
              {t('booking.time.select_date_subtitle')}
            </p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => goToStep(BookingStep.Service)}
            className={`transition-all duration-300 ${
              theme === 'dark' 
                ? 'hover:bg-slate-700 text-slate-300 hover:text-white' 
                : ''
            }`}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </div>

        <InfoCard />

        {workingDatesLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className={`h-8 w-8 animate-spin transition-colors duration-300 ${
              theme === 'dark' ? 'text-blue-400' : 'text-primary'
            }`} />
          </div>
        ) : !masterWorkingDates || !Array.isArray(masterWorkingDates) ? (
          <Card className={`transition-all duration-500 ${
            theme === 'dark'
              ? 'bg-slate-800/80 border-slate-700 backdrop-blur-sm'
              : ''
          }`}>
            <CardContent className="p-6 text-center">
              <p className={`transition-colors duration-300 ${
                theme === 'dark' ? 'text-slate-300' : 'text-muted-foreground'
              }`}>
                Загрузка рабочих дат...
              </p>
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
                    const isSelected = today.getTime() === selected.getTime();
                    
                    if (theme === 'dark') {
                      return isSelected 
                        ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white border-transparent shadow-lg shadow-blue-500/25"
                        : "bg-gradient-to-r from-slate-700 to-slate-600 hover:from-blue-700/50 hover:to-purple-700/50 border-slate-600 text-slate-200 hover:text-white";
                    } else {
                      return isSelected 
                        ? "bg-gradient-to-r from-blue-500 to-sky-500 text-white border-transparent"
                        : "bg-gradient-to-r from-blue-50 to-sky-50 hover:from-blue-100 hover:to-sky-100";
                    }
                  })()
                }`}
              >
                <CalendarIcon className="h-4 w-4 mr-2" />
                <span className="font-medium">{t('booking.time.today')}</span>
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
                    const isSelected = tomorrow.getTime() === selected.getTime();
                    
                    if (theme === 'dark') {
                      return isSelected 
                        ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white border-transparent shadow-lg shadow-purple-500/25"
                        : "bg-gradient-to-r from-slate-700 to-slate-600 hover:from-purple-700/50 hover:to-blue-700/50 border-slate-600 text-slate-200 hover:text-white";
                    } else {
                      return isSelected 
                        ? "bg-gradient-to-r from-sky-500 to-blue-500 text-white border-transparent"
                        : "bg-gradient-to-r from-sky-50 to-blue-50 hover:from-sky-100 hover:to-blue-100";
                    }
                  })()
                }`}
              >
                <Sun className="h-4 w-4 mr-2" />
                <span className="font-medium">{t('booking.time.tomorrow')}</span>
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
            <div className={`rounded-xl shadow-lg border p-6 transition-all duration-500 hover:shadow-xl ${
              theme === 'dark'
                ? 'bg-slate-800/70 backdrop-blur-sm border-slate-700 shadow-dark hover:glow-blue'
                : 'bg-white/60 backdrop-blur-sm border-white/40'
            }`}>
              <div className="flex justify-center items-center py-4 w-full">
                <div className="w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl flex justify-center">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    disabled={(date) => !isDateAvailable(date)}
                    className={`rounded-md border-0 mx-auto scale-110 sm:scale-100 transform-gpu transition-all duration-300 ${
                      theme === 'dark' 
                        ? `
                          [&_.rdp]:flex [&_.rdp]:justify-center
                          [&_.rdp-month]:w-auto [&_.rdp-table]:w-auto [&_.rdp-tbody]:w-auto
                          [&_.rdp-day_button]:text-slate-200
                          [&_.rdp-day_button]:hover:bg-blue-600/30
                          [&_.rdp-day_button]:hover:text-white
                          [&_.rdp-day_selected]:bg-gradient-to-r
                          [&_.rdp-day_selected]:from-blue-600
                          [&_.rdp-day_selected]:to-purple-600
                          [&_.rdp-day_selected]:text-white
                          [&_.rdp-day_selected]:shadow-lg
                          [&_.rdp-day_selected]:shadow-blue-500/25
                          [&_.rdp-day_today]:bg-blue-500/30
                          [&_.rdp-day_today]:font-bold
                          [&_.rdp-day_today]:text-blue-200
                          [&_.rdp-head_cell]:text-slate-300
                          [&_.rdp-head_cell]:font-semibold
                          [&_.rdp-caption]:text-slate-200
                          [&_.rdp-nav_button]:text-slate-300
                          [&_.rdp-nav_button]:hover:text-white
                          [&_.rdp-nav_button]:hover:bg-slate-700
                        `
                        : `
                          [&_.rdp]:flex [&_.rdp]:justify-center
                          [&_.rdp-month]:w-auto [&_.rdp-table]:w-auto [&_.rdp-tbody]:w-auto
                          [&_.rdp-day_button]:hover:bg-[var(--color-primary)]/10
                          [&_.rdp-day_selected]:bg-gradient-to-r
                          [&_.rdp-day_selected]:from-[var(--color-primary)]
                          [&_.rdp-day_selected]:to-[var(--color-light-blue)]
                          [&_.rdp-day_selected]:text-white
                          [&_.rdp-day_today]:bg-[var(--color-light-blue)]/20
                          [&_.rdp-day_today]:font-bold
                          [&_.rdp-head_cell]:text-[var(--color-dark-blue)]
                          [&_.rdp-head_cell]:font-semibold
                        `
                    }`}
                    locale={ru}
                  />
                  {availableDates.length === 0 && (
                    <div className={`text-center mt-4 transition-colors duration-300 ${
                      theme === 'dark' ? 'text-slate-300' : 'text-muted-foreground'
                    }`}>
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
            <h2 className={`text-3xl font-bold tracking-tight transition-colors duration-300 ${
              theme === 'dark' ? 'text-white' : 'text-[var(--color-dark-blue)]'
            }`}>
              {t('booking.time.title')}
            </h2>
            <p className={`transition-colors duration-300 ${
              theme === 'dark' ? 'text-slate-300' : 'text-muted-foreground'
            }`}>
              {t('booking.time.subtitle')}
            </p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => goToStep(BookingStep.Master)}
            className={`transition-all duration-300 ${
              theme === 'dark' 
                ? 'hover:bg-slate-700 text-slate-300 hover:text-white' 
                : ''
            }`}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </div>

        <InfoCard />

        {masterDetailsLoading || availableSlotsLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className={`h-8 w-8 animate-spin transition-colors duration-300 ${
              theme === 'dark' ? 'text-blue-400' : 'text-primary'
            }`} />
          </div>
        ) : (
          <div className="space-y-6">
            <div className={`rounded-xl shadow-lg border overflow-hidden transition-all duration-500 ${
              theme === 'dark'
                ? 'bg-slate-800/70 backdrop-blur-sm border-slate-700 shadow-dark'
                : 'bg-white/60 backdrop-blur-sm border-white/40'
            }`}>
              <div className={`p-6 transition-all duration-500 ${
                theme === 'dark'
                  ? 'bg-gradient-to-r from-blue-900/30 via-purple-900/20 to-blue-900/30'
                  : 'bg-gradient-to-r from-[var(--color-primary)]/10 via-[var(--color-light-blue)]/5 to-[var(--color-primary)]/10'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className={`text-lg font-semibold flex items-center gap-2 transition-colors duration-300 ${
                      theme === 'dark' ? 'text-white' : 'text-[var(--color-dark-blue)]'
                    }`}>
                      <CalendarIcon className={`h-5 w-5 transition-colors duration-300 ${
                        theme === 'dark' ? 'text-blue-400' : 'text-[var(--color-primary)]'
                      }`} />
                      {t('booking.time.appointment_date')}
                    </h3>
                    <p className={`mt-1 transition-colors duration-300 ${
                      theme === 'dark' ? 'text-slate-300' : 'text-muted-foreground'
                    }`}>
                      {selectedDate.toLocaleDateString('ru-RU', { 
                        weekday: 'long', 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric' 
                      })}
                    </p>
                  </div>
                  <Badge 
                    variant="secondary" 
                    className={`text-sm transition-all duration-300 ${
                      theme === 'dark'
                        ? 'bg-blue-500/20 text-blue-200 border-blue-500/30'
                        : 'bg-[var(--color-primary)]/10 text-[var(--color-dark-blue)] border-[var(--color-primary)]/20'
                    }`}
                  >
                    {t('booking.time.selected')}
                  </Badge>
                </div>
              </div>
            </div>

            <div className={`rounded-xl shadow-lg border overflow-hidden transition-all duration-500 ${
              theme === 'dark'
                ? 'bg-slate-800/70 backdrop-blur-sm border-slate-700 shadow-dark'
                : 'bg-white/60 backdrop-blur-sm border-white/40'
            }`}>
              <div className="p-6">
                <h3 className={`text-lg font-semibold flex items-center gap-2 mb-2 transition-colors duration-300 ${
                  theme === 'dark' ? 'text-white' : 'text-[var(--color-dark-blue)]'
                }`}>
                  <Clock className={`h-5 w-5 transition-colors duration-300 ${
                    theme === 'dark' ? 'text-blue-400' : 'text-[var(--color-primary)]'
                  }`} />
                  {t('booking.time.available')}
                </h3>
                <p className={`mb-4 transition-colors duration-300 ${
                  theme === 'dark' ? 'text-slate-300' : 'text-muted-foreground'
                }`}>
                  {t('booking.time.working_hours')}: {workingHours.start} - {workingHours.end}
                  {availableSlots && availableSlots.length > 0 && (
                    <span className={`block text-xs mt-1 transition-colors duration-300 ${
                      theme === 'dark' ? 'text-green-400' : 'text-green-600'
                    }`}>
                      {t('booking.time.slots_found').replace('{count}', availableSlots.filter(slot => slot.available).length.toString())}
                    </span>
                  )}
                </p>
                <div>
                <div className="relative">
                  <div className={`overflow-x-auto pb-4 scrollbar-track-transparent transition-all duration-300 ${
                    theme === 'dark' ? 'hover:scrollbar-thumb-blue-400/40' : 'hover:scrollbar-thumb-primary/40'
                  }`} style={{ 
                    scrollbarWidth: 'auto',
                    scrollbarColor: theme === 'dark' ? 'rgba(59, 130, 246, 0.6) transparent' : 'rgba(0, 174, 239, 0.6) transparent',
                    scrollbarGutter: 'stable'
                  }}>
                    <div className="flex gap-3 min-w-max px-2">
                      {availableTimeSlots.map((time: string) => (
                        <button
                          key={time}
                          onClick={() => handleTimeSelect(time)}
                          className={`group relative flex-shrink-0 w-24 h-28 rounded-2xl border-2 transition-all duration-300 hover:scale-105 hover:shadow-lg booking-card ${
                            selectedTimeSlot === time
                              ? theme === 'dark'
                                ? 'border-blue-500 bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-xl shadow-blue-500/25 scale-105'
                                : 'border-primary bg-gradient-to-br from-blue-500 to-sky-500 text-white shadow-xl scale-105'
                              : theme === 'dark'
                                ? 'border-slate-600 bg-slate-700/80 hover:border-blue-500/50 hover:bg-blue-600/20 text-slate-200'
                                : 'border-gray-200 bg-white hover:border-primary/50 hover:bg-blue-50/50'
                          }`}
                        >
                          <div className="flex flex-col items-center justify-center h-full gap-2">
                            <Clock className={`h-5 w-5 transition-colors ${
                              selectedTimeSlot === time 
                                ? 'text-white' 
                                : theme === 'dark' 
                                  ? 'text-blue-400' 
                                  : 'text-primary'
                            }`} />
                            <span className={`text-xl font-bold transition-colors ${
                              selectedTimeSlot === time 
                                ? 'text-white' 
                                : theme === 'dark' 
                                  ? 'text-slate-200' 
                                  : 'text-gray-900'
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
                      <span>{t('booking.time.scroll_hint')}</span>
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
          <h2 className={`text-3xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{t('booking.contacts.title')}</h2>
          <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-muted-foreground'}`}>{t('booking.contacts.subtitle')}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => goToStep(BookingStep.Time)}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
      </div>

      <InfoCard />

      <div className={`${
        theme === 'dark' 
          ? 'bg-slate-800/90 border-slate-700/50 shadow-xl' 
          : 'bg-white/70 border-white/50 shadow-lg'
      } backdrop-blur-sm rounded-xl border p-8 transition-all duration-300 hover:shadow-xl`}>
        <div className="pt-2 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name" className={theme === 'dark' ? 'text-gray-200' : ''}>{t('booking.contacts.name')}</Label>
            <Input
              id="name"
              placeholder={t('booking.contacts.name_placeholder')}
              value={bookingData.name}
              onChange={(e) => setBookingData(prev => ({ ...prev, name: e.target.value }))}
              className={theme === 'dark' ? 'bg-slate-700/50 border-slate-600 text-white placeholder:text-gray-400 focus:border-blue-400 focus:ring-blue-400/20' : ''}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className={theme === 'dark' ? 'text-gray-200' : ''}>{t('booking.contacts.phone')}</Label>
            <Input
              id="phone"
              placeholder={t('booking.contacts.phone_placeholder')}
              value={bookingData.phone}
              onChange={handlePhoneChange}
              className={theme === 'dark' ? 'bg-slate-700/50 border-slate-600 text-white placeholder:text-gray-400 focus:border-blue-400 focus:ring-blue-400/20' : ''}
            />
            {bookingData.phone && !isPhoneValid(bookingData.phone) && (
              <p className="text-sm text-destructive">
                {t('booking.contacts.phone_error')}
              </p>
            )}
          </div>

          <Button
            className={`w-full h-12 text-base animate-in fade-in slide-in-from-bottom-2 duration-400 ${
              theme === 'dark' 
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white' 
                : ''
            }`}
            style={{ animationDelay: '600ms' }}
            size="lg"
            onClick={submitBooking}
            disabled={!bookingData.name || !isPhoneValid(bookingData.phone) || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {t('booking.contacts.creating')}
              </>
            ) : (
              <>
                {t('booking.contacts.submit')}
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
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 shadow-lg ${
          theme === 'dark' 
            ? 'bg-gradient-to-br from-green-600/20 to-emerald-600/20 border border-green-500/30' 
            : 'bg-gradient-to-br from-green-100 to-emerald-50'
        }`}>
          <CheckCircle2 className={`h-10 w-10 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
        </div>
        <h2 className={`text-3xl font-bold tracking-tight mb-2 ${
          theme === 'dark' ? 'text-white' : 'text-[var(--color-dark-blue)]'
        }`}>{t('booking.confirmation.title')}</h2>
        <p className={`text-lg ${
          theme === 'dark' ? 'text-gray-300' : 'text-muted-foreground'
        }`}>
          {t('booking.confirmation.subtitle')}
        </p>
      </div>

      <div className={`backdrop-blur-sm rounded-xl shadow-lg border p-8 transition-all duration-300 hover:shadow-xl ${
        theme === 'dark' 
          ? 'bg-gradient-to-br from-slate-800/90 via-slate-700/80 to-slate-800/90 border-slate-600/50' 
          : 'bg-gradient-to-br from-green-50/80 via-emerald-50/60 to-white/70 border-green-200/50'
      }`}>
        <div className="pt-2 space-y-4 text-left">
          <div className="flex items-center gap-3">
            <User className={`h-5 w-5 ${theme === 'dark' ? 'text-gray-400' : 'text-muted-foreground'}`} />
            <span className={theme === 'dark' ? 'text-gray-200' : ''}>{bookingData.name}</span>
          </div>
          <Separator className={theme === 'dark' ? 'bg-slate-600' : ''} />
          <div className="flex items-center gap-3">
            <Phone className={`h-5 w-5 ${theme === 'dark' ? 'text-gray-400' : 'text-muted-foreground'}`} />
            <span className={theme === 'dark' ? 'text-gray-200' : ''}>{bookingData.phone}</span>
          </div>
          <Separator className={theme === 'dark' ? 'bg-slate-600' : ''} />
          {selectedMaster && (
            <div className="flex items-center gap-3">
              <Scissors className={`h-5 w-5 ${theme === 'dark' ? 'text-gray-400' : 'text-muted-foreground'}`} />
              <span className={theme === 'dark' ? 'text-gray-200' : ''}>{t('booking.confirmation.master')}: {selectedMaster.name}</span>
            </div>
          )}
          {selectedMaster && <Separator className={theme === 'dark' ? 'bg-slate-600' : ''} />}
          {selectedBranch && (
            <div className="flex items-center gap-3">
              <MapPin className={`h-5 w-5 ${theme === 'dark' ? 'text-gray-400' : 'text-muted-foreground'}`} />
              <div className="flex flex-col">
                <span className={theme === 'dark' ? 'text-gray-200' : ''}>{selectedBranch.name}</span>
                {selectedBranch.address && (
                  <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-muted-foreground'}`}>{selectedBranch.address}</span>
                )}
              </div>
            </div>
          )}
          {selectedBranch && <Separator className={theme === 'dark' ? 'bg-slate-600' : ''} />}
          <div className="flex items-center gap-3">
            <CalendarIcon className={`h-5 w-5 ${theme === 'dark' ? 'text-gray-400' : 'text-muted-foreground'}`} />
            <span className={theme === 'dark' ? 'text-gray-200' : ''}>
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
        className={`transition-all duration-200 hover:scale-105 ${
          theme === 'dark' 
            ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 hover:from-blue-500/30 hover:to-purple-500/30 border-blue-500/30 text-blue-300 hover:text-blue-200' 
            : 'bg-gradient-to-r from-[var(--color-primary)]/10 to-[var(--color-light-blue)]/10 hover:from-[var(--color-primary)]/20 hover:to-[var(--color-light-blue)]/20 border-[var(--color-primary)]/30 text-[var(--color-dark-blue)]'
        }`}
        onClick={() => {
          setBookingData({ name: '', phone: '' });
          goToStep(BookingStep.Branch);
        }}
      >
        {t('booking.confirmation.new_booking')}
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
    <div className={`min-h-screen transition-all duration-500 theme-transition ${
      theme === 'dark' 
        ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark-gradient-bg' 
        : 'bg-gradient-to-br from-gray-50 via-blue-50/40 to-cyan-50/60'
    } relative`}>
      {/* Background decoration */}
      <div className={`absolute inset-0 pointer-events-none transition-opacity duration-500 ${
        theme === 'dark'
          ? 'bg-gradient-to-tr from-blue-900/20 via-transparent to-purple-900/20'
          : 'bg-gradient-to-tr from-[var(--color-primary)]/5 via-transparent to-[var(--color-light-blue)]/10'
      }`}></div>
      
      <header className={`border-b sticky top-0 z-50 shadow-sm relative transition-all duration-500 ${
        theme === 'dark'
          ? 'bg-slate-800/95 border-slate-700 backdrop-blur-md'
          : 'bg-white/95 backdrop-blur-md'
      }`}>
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img 
                src="/PROM_logo_mid_blue.svg" 
                alt="Logo" 
                className={`h-8 w-8 transition-all duration-300 ${
                  theme === 'dark' ? 'filter brightness-150' : ''
                }`}
              />
              <div>
                <h1 className={`text-2xl font-bold transition-colors duration-300 ${
                  theme === 'dark' ? 'text-white' : 'text-[var(--color-dark-blue)]'
                }`}>
                  Octō CRM
                </h1>
                <p className={`text-sm transition-colors duration-300 ${
                  theme === 'dark' ? 'text-slate-300' : 'text-muted-foreground'
                }`}>
                  {t('booking.title')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <LocaleToggle />
              <ThemeToggle />
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

export default BookingPageWithTheme;
