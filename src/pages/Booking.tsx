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
  Clock, CheckCircle2, ChevronLeft, ChevronRight, Sparkles
} from "lucide-react";
import { format, addDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import axios from 'axios';
import Cookies from 'js-cookie';
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

  // Получаем organisationId из URL query параметров
  const searchParams = new URLSearchParams(window.location.search);
  const organisationId = searchParams.get('organisationId') || '';

  const [bookingData, setBookingData] = useState<BookingData>({
    name: '',
    phone: '',
    branch: '',
  });

  const { data: organisationBranches, isLoading: organisationBranchesLoading } = useQuery({
    queryKey: ['organisationBranches'],
    queryFn: () => getOrganisationBranches(organisationId)
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

  const { data: masterDetails, isLoading: masterDetailsLoading } = useQuery({
    queryKey: ['masterDetails', bookingData?.masterId],
    queryFn: () => getMasterDetails(bookingData?.masterId || 0),
    enabled: !!bookingData?.masterId
  });

  const [currentStep, setCurrentStep] = useState<BookingStep>(BookingStep.Branch);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const generateTimeSlots = (startHour: string, endHour: string): string[] => {
    const slots: string[] = [];
    const [startH, startM] = startHour.split(':').map(Number);
    const [endH, endM] = endHour.split(':').map(Number);

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
  };

  const goToStep = (step: BookingStep) => {
    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    goToStep(BookingStep.Master);
  };

  const handleMasterSelect = (masterId: number) => {
    setBookingData(prev => ({ ...prev, masterId }));
    goToStep(BookingStep.DateTime);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const selectedDate = new Date(date);
      selectedDate.setHours(0, 0, 0, 0);

      // Устанавливаем сегодняшнюю дату
      setSelectedDate(today);
      setBookingData(prev => ({ ...prev, date: today }));
      setSelectedTimeSlot(null);
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
        branch: String(bookingData.branch),
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
        description: "Ваша запись успешно создана!",
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
    const steps = ['Филиал', 'Услуга', 'Мастер', 'Дата', 'Контакты'];
    const progress = (currentStep / 4) * 100;

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
            className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500 ease-out"
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
      <Card className="mb-6 border-primary/20 bg-gradient-to-br from-amber-50/50 to-orange-50/30">
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
          {bookingData.date && bookingData.time && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>
                {format(bookingData.date, 'dd MMMM', { locale: ru })} в {bookingData.time}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderBranchStep = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Выберите филиал</h2>
        <p className="text-muted-foreground">Где вам удобнее?</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {organisationBranches?.branches?.map((branch: any) => (
          <Card
            key={branch.id}
            className="cursor-pointer transition-all hover:shadow-lg hover:scale-105 hover:border-primary/50 group"
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
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">Выберите мастера</h2>
          <p className="text-muted-foreground">Кто вас обслужит?</p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => goToStep(BookingStep.Service)}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
      </div>

      <InfoCard />

      {mastersLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : mastersList && mastersList.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mastersList.map((master: any) => (
            <Card
              key={master.id}
              className={`cursor-pointer transition-all hover:shadow-lg hover:border-primary/50 group ${bookingData.masterId === master.id ? 'border-primary bg-primary/5' : ''
                }`}
              onClick={() => handleMasterSelect(master.id)}
            >
              <CardContent className="p-6 text-center space-y-4">
                <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center text-2xl font-semibold text-amber-700">
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
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">Нет доступных мастеров</p>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderDateTimeStep = () => {
    const timeSlots = masterDetails
      ? generateTimeSlots(masterDetails.startWorkHour, masterDetails.endWorkHour)
      : [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-3xl font-bold tracking-tight">Выберите время</h2>
            <p className="text-muted-foreground">Когда вам удобно?</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => goToStep(BookingStep.Master)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </div>

        <InfoCard />

        {masterDetailsLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            <Card className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CalendarIcon className="h-5 w-5 text-primary" />
                      Дата записи
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {format(selectedDate, 'EEEE, d MMMM yyyy', { locale: ru })}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="text-sm">
                    Сегодня
                  </Badge>
                </div>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Доступное время
                </CardTitle>
                <CardDescription>
                  Рабочие часы: {masterDetails?.startWorkHour} - {masterDetails?.endWorkHour}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <div className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent hover:scrollbar-thumb-primary/40">
                    <div className="flex gap-3 min-w-max px-2">
                      {timeSlots.map((time, index) => (
                        <button
                          key={time}
                          onClick={() => handleTimeSelect(time)}
                          className={`group relative flex-shrink-0 w-24 h-28 rounded-2xl border-2 transition-all duration-300 hover:scale-105 hover:shadow-lg ${selectedTimeSlot === time
                              ? 'border-primary bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-xl scale-105'
                              : 'border-gray-200 bg-white hover:border-primary/50 hover:bg-amber-50/50'
                            }`}
                          style={{
                            animationDelay: `${index * 30}ms`
                          }}
                        >
                          <div className="flex flex-col items-center justify-center h-full gap-2">
                            <Clock className={`h-5 w-5 transition-colors ${selectedTimeSlot === time ? 'text-white' : 'text-primary'
                              }`} />
                            <span className={`text-xl font-bold transition-colors ${selectedTimeSlot === time ? 'text-white' : 'text-gray-900'
                              }`}>
                              {time}
                            </span>
                            {selectedTimeSlot === time && (
                              <CheckCircle2 className="h-4 w-4 text-white animate-in zoom-in duration-200" />
                            )}
                          </div>
                          {selectedTimeSlot === time && (
                            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-400/20 to-orange-400/20 animate-pulse" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="absolute right-0 top-0 bottom-4 w-16 bg-gradient-to-l from-white to-transparent pointer-events-none" />
                  <div className="absolute left-0 top-0 bottom-4 w-16 bg-gradient-to-r from-white to-transparent pointer-events-none" />
                </div>

                {timeSlots.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Нет доступных временных слотов
                  </div>
                )}

                {timeSlots.length > 0 && (
                  <div className="mt-4 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                    <div className="flex items-center gap-1">
                      <div className="w-6 h-0.5 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                      <span>Листайте для просмотра всех слотов</span>
                      <div className="w-6 h-0.5 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    );
  };

  const renderClientInfoStep = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">Ваши контакты</h2>
          <p className="text-muted-foreground">Почти готово!</p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => goToStep(BookingStep.DateTime)}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
      </div>

      <InfoCard />

      <Card>
        <CardContent className="pt-6 space-y-6">
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
            className="w-full h-12 text-base"
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
        </CardContent>
      </Card>
    </div>
  );

  const renderConfirmationStep = () => (
    <div className="space-y-6 text-center max-w-2xl mx-auto animate-in fade-in zoom-in duration-700">
      <div className="flex flex-col items-center">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-4">
          <CheckCircle2 className="h-10 w-10 text-green-600" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight mb-2">Готово!</h2>
        <p className="text-muted-foreground text-lg">
          Ваша запись успешно создана
        </p>
      </div>

      <Card className="border-green-200 bg-green-50/50">
        <CardContent className="pt-6 space-y-4 text-left">
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
          <div className="flex items-center gap-3">
            <CalendarIcon className="h-5 w-5 text-muted-foreground" />
            <span>
              {bookingData.date && format(bookingData.date, 'dd MMMM yyyy', { locale: ru })}
              {' в '}
              {bookingData.time}
            </span>
          </div>
        </CardContent>
      </Card>

      <Button
        variant="outline"
        onClick={() => {
          setBookingData({ name: '', phone: '' });
          goToStep(BookingStep.Branch);
        }}
      >
        Создать новую запись
      </Button>
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case BookingStep.Branch: return renderBranchStep();
      case BookingStep.Service: return renderServiceStep();
      case BookingStep.Master: return renderMasterStep();
      case BookingStep.DateTime: return renderDateTimeStep();
      case BookingStep.ClientInfo: return renderClientInfoStep();
      case BookingStep.Confirmation: return renderConfirmationStep();
      default: return renderBranchStep();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                Elitaroma
              </h1>
              <p className="text-sm text-muted-foreground">Онлайн-запись</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {currentStep !== BookingStep.Confirmation && <ProgressBar />}
        {renderStepContent()}
      </main>
    </div>
  );
};

export default BookingPage;