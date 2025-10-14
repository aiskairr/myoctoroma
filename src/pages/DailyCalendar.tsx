import { useState, useEffect, useMemo } from "react";
import { Redirect } from "wouter";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useBranch } from "@/contexts/BranchContext";
import { useIsMaster } from "@/hooks/use-master-role";
import { useServices } from "@/hooks/use-services";
import { getBranchIdWithFallback } from "@/utils/branch-utils";
import { getServiceDurations } from "@/hooks/use-services";
import { format, addMinutes, isSameDay, addDays, subDays, isToday } from "date-fns";
import { ru } from "date-fns/locale";
import { Loader2, Plus, UserPlus, Edit, X, User, Clock, MapPin, CalendarIcon, ChevronLeft, ChevronRight, CreditCard, Banknote, QrCode, Coins, CheckCircle, Scissors } from "lucide-react";
import { PaymentMethodIcon } from "@/components/BankIcons";
import { TaskParserControlPanel } from "@/components/TaskParserControlPanel";
import CancelledAppointments from "@/components/CancelledAppointments";

// Интерфейсы для массажных услуг (из CRMTasks)
interface serviceService {
  id: number;
  name: string;
  duration10Price?: number;
  duration15Price?: number;
  duration20Price?: number;
  duration30Price?: number;
  duration50Price?: number;
  duration60Price?: number;
  duration80Price?: number;
  duration90Price?: number;
  duration110Price?: number;
  duration120Price?: number;
  duration150Price?: number;
  duration220Price?: number;
  description?: string;
  defaultDuration: number;
}

interface DurationOption {
  duration: number;
  price: number;
}

interface serviceDurationsResponse {
  serviceType: string;
  availableDurations: DurationOption[];
  defaultDuration: number;
}

// Основные интерфейсы
interface Master {
  id: number;
  name: string;
  specialization?: string;
  isActive: boolean;
  startWorkHour?: string;
  endWorkHour?: string;
  schedules?: Array<{
    days: string[];
    from: string;
    to: string;
    branch: string;
  }>;
  branchId: string;
  photoUrl?: string;
}

interface Task {
  id: number;
  clientId: number;
  client: {
    id: number;
    telegramId: string;
    firstName?: string;
    lastName?: string;
    customName?: string;
    phoneNumber?: string;
  };
  status: string;
  serviceType?: string;
  serviceServiceId?: number; // ID услуги массажа
  serviceDuration?: number;
  duration?: number; // Добавляем поле duration для совместимости
  servicePrice?: number;
  finalPrice?: number;
  scheduleDate?: string; // Формат: YYYY-MM-DDTHH:MM:SS.sssZ (только дата, время всегда 00:00:00.000Z)
  scheduleTime?: string;
  endTime?: string;
  masterName?: string;
  masterId?: number;
  branchId?: string;
  notes?: string;
  mother?: number; // ID материнской записи для дополнительных услуг
  paid?: string; // Статус оплаты: 'paid' или 'unpaid'
  createdAt: string; // Формат: YYYY-MM-DDTHH:MM:SS.sssZ (полная timestamp с временем)
}

// Интерфейс для дополнительной услуги
interface AdditionalService {
  id: number;
  serviceId: number;
  serviceName: string;
  duration: number;
  price: number;
}

// Интерфейс для способов оплаты
interface PaymentMethod {
  value: string;
  label: string;
  icon: string;
  description: string;
}

interface serviceService {
  id: number;
  name: string;
  duration30Price?: number;
  duration50Price?: number;
  duration60Price?: number;
  duration80Price?: number;
  duration90Price?: number;
  duration110Price?: number;
  duration120Price?: number;
  duration150Price?: number;
  duration220Price?: number;
  defaultDuration: number;
}

interface TimeSlot {
  time: string;
  masterId: number;
  masterName: string;
  isAvailable: boolean;
  task?: Task;
}

// Интерфейс для формы создания клиента (из CRMTasks)
interface ClientFormData {
  clientName: string;
  phoneNumber: string;
  branchId: string;
  serviceType: string;
  masterName: string;
  masterId: number;
  notes: string;
  discount: number;
  finalPrice: number;
  scheduleDate: string; // Формат для отправки на API: YYYY-MM-DD
  scheduleTime: string;
  status?: string;
}

// Компонент создания новой записи (адаптированный из CRMTasks)
const CreateAppointmentDialog = ({
  isOpen,
  onClose,
  selectedDate,
  selectedTime,
  masterId,
  onTaskCreated
}: {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  selectedTime?: string;
  masterId?: number;
  onTaskCreated: () => void;
}) => {
  const { toast } = useToast();
  const { currentBranch, branches } = useBranch();

  // Загружаем мастеров для выбранной даты
  const { data: masters = [] } = useQuery<Master[]>({
    queryKey: [`${import.meta.env.VITE_BACKEND_URL}/api/calendar/masters`, format(selectedDate, 'yyyy-MM-dd'), currentBranch?.id],
    queryFn: () => fetch(`${import.meta.env.VITE_BACKEND_URL}/api/calendar/masters/${format(selectedDate, 'yyyy-MM-dd')}?branchId=${getBranchIdWithFallback(currentBranch, branches)}`, {
      credentials: 'include'
    }).then(res => res.json()),
    enabled: !!currentBranch?.id && isOpen
  });

  // Загружаем все мастеров для общего выбора
  const { data: allMasters = [] } = useQuery<Master[]>({
    queryKey: [`${import.meta.env.VITE_BACKEND_URL}/api/masters`],
    enabled: isOpen,
  });

  // Список услуг
  const { data: servicesData } = useServices();

  // Автоопределение выбранного мастера
  const selectedMaster = masters.find(m => m.id === masterId) || allMasters.find(m => m.id === masterId);

  // Инициализация формы с автоопределением
  const [formData, setFormData] = useState<ClientFormData>({
    clientName: "",
    phoneNumber: "",
    branchId: getBranchIdWithFallback(currentBranch, branches),
    serviceType: "",
    masterName: selectedMaster?.name || "",
    masterId: masterId || 0,
    notes: "",
    discount: 0,
    finalPrice: 0,
    // Форматируем дату для API в формат YYYY-MM-DD (scheduleDate format)
    scheduleDate: format(selectedDate, 'yyyy-MM-dd'),
    scheduleTime: selectedTime || ""
  });

  // Обновляем данные при изменении автоопределенных значений
  useEffect(() => {
    if (isOpen) {
      setFormData(prev => ({
        ...prev,
        branchId: getBranchIdWithFallback(currentBranch, branches),
        scheduleDate: format(selectedDate, 'yyyy-MM-dd'),
        scheduleTime: selectedTime || prev.scheduleTime,
        masterName: selectedMaster?.name || prev.masterName,
        masterId: masterId || prev.masterId
      }));
    }
  }, [isOpen, currentBranch, branches, selectedDate, selectedTime, masterId, selectedMaster]);

  // Доступные длительности для выбранного типа услуги
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);

  // Функция для получения доступных длительностей для выбранной услуги
  const getAvailableDurations = () => {
    if (!formData.serviceType || !servicesData) return [];
    
    const selectedService = servicesData.find(service => service.name === formData.serviceType);
    if (!selectedService) return [];
    
    return getServiceDurations(selectedService);
  };

  // Сброс длительности при изменении услуги
  useEffect(() => {
    if (formData.serviceType) {
      setSelectedDuration(null);
    }
  }, [formData.serviceType]);

  // Автоматически рассчитываем цену
  useEffect(() => {
    if (selectedDuration && formData.serviceType && servicesData) {
      const availableDurations = getAvailableDurations();
      const selectedOption = availableDurations.find(d => d.duration === selectedDuration);
      
      if (selectedOption) {
        const basePrice = selectedOption.price;
        const discountAmount = (basePrice * formData.discount) / 100;
        const finalPrice = Math.round(basePrice - discountAmount);

        setFormData(prev => ({ ...prev, finalPrice: finalPrice }));
      }
    }
  }, [selectedDuration, formData.serviceType, formData.discount, servicesData]);



  // Мутация для создания клиента (как в CRMTasks)
  const createClientMutation = useMutation({
    mutationFn: async () => {
      if (!formData.clientName) {
        throw new Error("Имя клиента обязательно");
      }

      const payload = {
        clientName: formData.clientName,
        clientPhone: formData.phoneNumber,
        serviceType: formData.serviceType,
        scheduleDate: formData.scheduleDate,
        scheduleTime: formData.scheduleTime,
        masterName: formData.masterName,
        notes: formData.notes,
        status: 'scheduled',
        duration: selectedDuration,
        finalPrice: formData.finalPrice,
        discount: formData.discount,
        branchId: formData.branchId // Добавляем branchId в payload
      };

      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/crm/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include'
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Ошибка создания записи');
      }

      const createdTask = await res.json();
      return createdTask;
    },
    onSuccess: () => {
      toast({
        title: "Запись создана",
        description: "Запись в календаре успешно создана"
      });
      // Сброс формы
      setFormData({
        clientName: "",
        phoneNumber: "",
        branchId: getBranchIdWithFallback(currentBranch, branches),
        serviceType: "",
        masterName: "",
        masterId: 0,
        notes: "",
        discount: 0,
        finalPrice: 0,
        scheduleDate: format(selectedDate, 'yyyy-MM-dd'),
        scheduleTime: selectedTime || ""
      });
      setSelectedDuration(null);
      onTaskCreated();
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: `${error}`,
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Валидация обязательного поля мастер
    if (!formData.masterId || formData.masterId === 0) {
      toast({
        title: "Ошибка",
        description: "Пожалуйста, выберите мастера. Это обязательное поле.",
        variant: "destructive"
      });
      return;
    }

    createClientMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="text-xl font-semibold text-gray-900">Добавить запись</DialogTitle>
          <DialogDescription className="text-gray-500">
            Заполните данные для новой записи клиента
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex gap-5 p-4 pt-0">
          {/* Левая колонка - Клиент */}
          <div className="flex-1 bg-white rounded-lg p-4">
            <div className="text-center text-blue-600 font-semibold text-lg mb-4">Клиент</div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="clientName" className="block font-semibold text-gray-700 text-sm mb-1">Имя клиента</Label>
                <Input
                  id="clientName"
                  className="w-full text-sm"
                  value={formData.clientName}
                  onChange={(e) => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
                  placeholder="Введите имя клиента"
                  required
                />
              </div>

              <div>
                <Label htmlFor="phoneNumber" className="block font-semibold text-gray-700 text-sm mb-1">Телефон</Label>
                <Input
                  id="phoneNumber"
                  className="w-full text-sm"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                  placeholder="Введите номер телефона"
                />
              </div>

              <div>
                <Label htmlFor="notes" className="block font-semibold text-gray-700 text-sm mb-1">Примечания</Label>
                <Textarea
                  id="notes"
                  className="w-full text-sm min-h-[80px]"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Дополнительные заметки"
                />
              </div>
            </div>
          </div>

          {/* Правая колонка - Запись */}
          <div className="flex-1 bg-white rounded-lg p-4">
            <div className="text-center text-blue-600 font-semibold text-lg mb-4">Запись</div>

            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="scheduleTime" className="block font-semibold text-gray-700 text-sm mb-1">Время</Label>
                  <Input
                    id="scheduleTime"
                    type="time"
                    className="w-full text-sm"
                    value={formData.scheduleTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, scheduleTime: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="duration" className="block font-semibold text-gray-700 text-sm mb-1">Длительность</Label>
                <Select
                  value={selectedDuration?.toString() || ""}
                  onValueChange={(value) => setSelectedDuration(Number(value))}
                  disabled={!formData.serviceType}
                >
                  <SelectTrigger className="w-full text-sm">
                    <SelectValue placeholder={!formData.serviceType ? "Сначала выберите услугу" : "Выберите длительность"} />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableDurations().map((duration) => (
                      <SelectItem key={duration.duration} value={duration.duration.toString()}>
                        {duration.duration} мин - {duration.price} сом
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="serviceType" className="block font-semibold text-gray-700 text-sm mb-1">Тип услуги</Label>
                <Select
                  value={formData.serviceType}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, serviceType: value }))}
                >
                  <SelectTrigger className="w-full text-sm">
                    <SelectValue placeholder="Выберите тип услуги" />
                  </SelectTrigger>
                  <SelectContent>
                    {servicesData?.map((service) => (
                      <SelectItem key={service.id} value={service.name}>
                        {service.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="masterName" className="block font-semibold text-gray-700 text-sm mb-1">
                  Мастер <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.masterName}
                  onValueChange={(value) => {
                    const master = [...masters, ...allMasters].find(m => m.name === value);
                    setFormData(prev => ({
                      ...prev,
                      masterName: value,
                      masterId: master?.id || 0
                    }));
                  }}
                  required
                >
                  <SelectTrigger className={`w-full text-sm ${!formData.masterId || formData.masterId === 0 ? 'border-red-300' : ''}`}>
                    <SelectValue placeholder="Выберите мастера" />
                  </SelectTrigger>
                  <SelectContent>
                    {allMasters?.map((master) => (
                      <SelectItem key={master.id} value={master.name}>
                        {master.name} {masters.find(m => m.id === master.id) ? '(работает сегодня)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="branchId" className="block font-semibold text-gray-700 text-sm mb-1">Филиал</Label>
                <Select
                  value={formData.branchId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, branchId: value }))}
                >
                  <SelectTrigger className="w-full text-sm">
                    <SelectValue placeholder="Выберите филиал" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wa1">Токтогула 93</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="scheduleDate" className="block font-semibold text-gray-700 text-sm mb-1">Дата</Label>
                <Input
                  id="scheduleDate"
                  type="date"
                  className="w-3/5 text-sm"
                  value={formData.scheduleDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, scheduleDate: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="discount" className="block font-semibold text-gray-700 text-sm mb-1">Скидка (%)</Label>
                <Input
                  id="discount"
                  type="number"
                  min="0"
                  max="100"
                  className="w-1/3 text-sm"
                  value={formData.discount}
                  onChange={(e) => {
                    const discount = parseFloat(e.target.value) || 0;
                    setFormData(prev => ({ ...prev, discount }));
                  }}
                />
              </div>


              {formData.finalPrice > 0 && (
                <div className="text-right mt-3">
                  <Label className="block font-semibold text-gray-700 text-sm mb-1">Общая стоимость:</Label>
                  <Input
                    type="number"
                    className="w-32 text-sm inline-block"
                    value={formData.finalPrice}
                    readOnly
                    placeholder="Сумма"
                  />
                </div>
              )}

              <div className="flex justify-between mt-4">
                <Button type="button" variant="outline" onClick={onClose} className="bg-red-500 text-white hover:bg-red-600">
                  Отмена
                </Button>
                <Button type="submit" disabled={createClientMutation.isPending} className="bg-green-500 text-white hover:bg-green-600">
                  {createClientMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Создать
                </Button>
              </div>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Компонент редактирования записи (адаптированный из CRMTasks)
const EditAppointmentDialog = ({
  task,
  isOpen,
  onClose,
  onTaskUpdated
}: {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdated: () => void;
}) => {
  const { toast } = useToast();
  const { currentBranch, branches } = useBranch();

  // Загружаем все мастеров для выбора
  const { data: allMasters = [] } = useQuery<Master[]>({
    queryKey: [`${import.meta.env.VITE_BACKEND_URL}/api/masters`],
    enabled: isOpen,
  });

  // Список услуг
  const { data: servicesData } = useServices();

  // Загружаем администраторов для выбора в модальном окне оплаты
  const { data: administrators = [] } = useQuery<{ id: number, name: string }[]>({
    queryKey: [`${import.meta.env.VITE_BACKEND_URL}/api/administrators`, currentBranch?.id],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/administrators?branchID=${getBranchIdWithFallback(currentBranch, branches)}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.filter((admin: any) => admin.isActive).map((admin: any) => ({
        id: admin.id,
        name: admin.name
      }));
    },
    enabled: isOpen,
  });

  // Инициализация формы с данными существующей записи
  const [formData, setFormData] = useState<ClientFormData>({
    clientName: task?.client?.customName || task?.client?.firstName || "",
    phoneNumber: task?.client?.phoneNumber || "",
    branchId: task?.branchId || getBranchIdWithFallback(currentBranch, branches),
    serviceType: task?.serviceType || "",
    masterName: task?.masterName || "",
    masterId: task?.masterId || 0,
    notes: task?.notes || "",
    discount: 0,
    finalPrice: task?.finalPrice || 0,
    // Извлекаем дату из формата API: YYYY-MM-DDTHH:MM:SS.sssZ -> YYYY-MM-DD
    scheduleDate: task?.scheduleDate?.split('T')[0] || "",
    scheduleTime: task?.scheduleTime || "",
    status: task?.status || 'new'
  });

  // Обновляем данные при изменении задачи
  useEffect(() => {
    if (task && isOpen) {
      setFormData({
        clientName: task.client?.customName || task.client?.firstName || "",
        phoneNumber: task.client?.phoneNumber || "",
        branchId: task.branchId || getBranchIdWithFallback(currentBranch, branches),
        serviceType: task.serviceType || "",
        masterName: task.masterName || "",
        masterId: task.masterId || 0,
        notes: task.notes || "",
        discount: 0,
        finalPrice: task.finalPrice || 0,
        scheduleDate: task.scheduleDate?.split('T')[0] || "",
        scheduleTime: task.scheduleTime || "",
        status: task.status || 'new'  // ✅ Привязываем к реальному статусу из client_tasks
      });
    }
  }, [task, isOpen, currentBranch]);

  // Доступные длительности для выбранного типа услуги
  const [selectedDuration, setSelectedDuration] = useState<number | null>(task?.duration || null);

  // Состояние для дополнительных услуг
  const [childTasks, setChildTasks] = useState<Task[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);

  // ✅ Локальное состояние для редактирования длительностей (не сохраняется сразу)
  const [localMainDuration, setLocalMainDuration] = useState<number>(0);
  const [localChildDurations, setLocalChildDurations] = useState<{ [key: number]: number }>({});

  // Состояние для диалога оплаты
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("");
  const [selectedAdministrator, setSelectedAdministrator] = useState<string>("");

  // Доступные способы оплаты на основе данных из таблицы accounting
  const paymentMethods: PaymentMethod[] = [
    {
      value: "Наличные",
      label: "Наличные",
      icon: "💰",
      description: "Оплата наличными деньгами"
    },
    {
      value: "МБанк - Перевод",
      label: "МБанк - Перевод",
      icon: "🏦",
      description: "Банковский перевод через МБанк"
    },
    {
      value: "МБанк - POS",
      label: "МБанк - POS",
      icon: "💳",
      description: "POS терминал МБанк"
    },
    {
      value: "МБизнес - Перевод",
      label: "МБизнес - Перевод",
      icon: "🏢",
      description: "Банковский перевод через МБизнес"
    },
    {
      value: "МБизнес - POS",
      label: "МБизнес - POS",
      icon: "💳",
      description: "POS терминал МБизнес"
    },
    {
      value: "О!Банк - Перевод",
      label: "О!Банк - Перевод",
      icon: "🔴",
      description: "Банковский перевод через О!Банк"
    },
    {
      value: "О!Банк - POS",
      label: "О!Банк - POS",
      icon: "💳",
      description: "POS терминал О!Банк"
    },
    {
      value: "Демир - Перевод",
      label: "Демир - Перевод",
      icon: "🏗️",
      description: "Банковский перевод через Демир Банк"
    },
    {
      value: "Демир - POS",
      label: "Демир - POS",
      icon: "💳",
      description: "POS терминал Демир Банк"
    },
    {
      value: "Bakai - Перевод",
      label: "Bakai - Перевод",
      icon: "🌊",
      description: "Банковский перевод через Bakai Банк"
    },
    {
      value: "Bakai - POS",
      label: "Bakai - POS",
      icon: "💳",
      description: "POS терминал Bakai Банк"
    },
    {
      value: "Оптима - Перевод",
      label: "Оптима - Перевод",
      icon: "⚡",
      description: "Банковский перевод через Оптима Банк"
    },
    {
      value: "Оптима - POS",
      label: "Оптима - POS",
      icon: "💳",
      description: "POS терминал Оптима Банк"
    },
    {
      value: "Подарочный Сертификат",
      label: "Подарочный Сертификат",
      icon: "🎁",
      description: "Оплата подарочным сертификатом"
    }
  ];

  // Функция для получения доступных длительностей для выбранной услуги
  const getAvailableDurations = () => {
    if (!formData.serviceType || !servicesData) return [];
    
    const selectedService = servicesData.find(service => service.name === formData.serviceType);
    if (!selectedService) return [];
    
    return getServiceDurations(selectedService);
  };

  // Сброс длительности при изменении услуги
  useEffect(() => {
    if (formData.serviceType) {
      const availableDurations = getAvailableDurations();
      if (availableDurations.length > 0 && !availableDurations.find(d => d.duration === selectedDuration)) {
        setSelectedDuration(availableDurations[0].duration);
      }
    }
  }, [formData.serviceType]);

  // ✅ Проверка есть ли несохраненные изменения длительности
  const hasUnsavedDurationChanges = (): boolean => {
    const mainDurationChanged = localMainDuration !== (task?.serviceDuration || task?.duration || 0);
    const childDurationChanged = childTasks.some(childTask => {
      const currentDuration = childTask.serviceDuration || childTask.duration || 0;
      const localDuration = localChildDurations[childTask.id] || 0;
      return currentDuration !== localDuration;
    });
    return mainDurationChanged || childDurationChanged;
  };

  // Проверяем является ли длительность стандартной (из services)
  const isStandardDuration = (duration: number): boolean => {
    const availableDurations = getAvailableDurations();
    return availableDurations.some(option => option.duration === duration);
  };
  const queryClient = useQueryClient();

  // Получаем дочерние задачи (дополнительные услуги)
  const { data: childTasksData } = useQuery<Task[]>({
    queryKey: [`${import.meta.env.VITE_BACKEND_URL}/api/tasks/children`, task?.id],
    enabled: isOpen && !!task?.id,
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/tasks/${task?.id}/children`);
      if (!res.ok) return [];
      return res.json();
    }
  });

  useEffect(() => {
    if (childTasksData) {
      setChildTasks(childTasksData);
      // ✅ Инициализируем локальные длительности дочерних задач
      const initialChildDurations: { [key: number]: number } = {};
      childTasksData.forEach(child => {
        initialChildDurations[child.id] = child.serviceDuration || child.duration || 0;
      });
      setLocalChildDurations(initialChildDurations);
    }
  }, [childTasksData]);

  // ✅ Инициализируем локальную длительность основной задачи
  useEffect(() => {
    if (task) {
      const availableDurations = getAvailableDurations();
      const defaultDuration = availableDurations.length > 0 ? availableDurations[0].duration : 60;
      setLocalMainDuration(task.serviceDuration || task.duration || defaultDuration);
    }
  }, [task, formData.serviceType, servicesData]);

  // Устанавливаем длительность по умолчанию
  useEffect(() => {
    const availableDurations = getAvailableDurations();
    if (availableDurations.length > 0) {
      if (!selectedDuration || !availableDurations.some(d => d.duration === selectedDuration)) {
        setSelectedDuration(task?.duration || availableDurations[0].duration);
      }
    }
  }, [formData.serviceType, servicesData, task]);

  // ✅ Упрощенная функция расчета цены основной услуги с учетом произвольной длительности
  const calculateMainServicePrice = (): number => {
    if (!task?.serviceDuration) return task?.servicePrice || task?.finalPrice || 0;

    const duration = task.serviceDuration;
    const availableDurations = getAvailableDurations();

    // ✅ Если длительность произвольная (не стандартная), возвращаем сохраненную цену без изменений
    if (!isStandardDuration(duration)) {
      return task?.servicePrice || task?.finalPrice || 0;
    }

    const durationOption = availableDurations.find(d => d.duration === duration);

    // Если есть точное соответствие стандартной длительности, используем его цену
    if (durationOption) {
      return durationOption.price;
    }

    // Иначе используем сохраненную цену
    return task?.servicePrice || task?.finalPrice || 0;
  };

  // Расчет общей цены с учетом дополнительных услуг
  const calculateTotalPrice = (): number => {
    const mainPrice = calculateMainServicePrice();
    const childrenPrice = childTasks.reduce((sum, child) => sum + (child.servicePrice || child.finalPrice || 0), 0);
    return mainPrice + childrenPrice;
  };

  // ✅ Расчет общей длительности на основе локальных значений (до сохранения)
  const calculateTotalDuration = (): number => {
    const mainDuration = localMainDuration;
    const childrenDuration = Object.values(localChildDurations).reduce((sum, duration) => sum + duration, 0);
    return mainDuration + childrenDuration;
  };

  // Функция для расчета времени окончания
  const calculateEndTime = (startTime: string, duration: number): string => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + duration;
    const newHours = Math.floor(totalMinutes / 60);
    const newMinutes = totalMinutes % 60;
    return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
  };

  // ✅ УБРАЛ синхронизацию статусов - она вызывала разъединение записей
  // const updateTaskChainStatus = async (taskId: number, newStatus: string) => {
  //   // Функция временно отключена для предотвращения разъединения записей
  // };

  // ✅ Функции для редактирования длительности отдельных услуг
  const updateMainServiceDuration = async (newDuration: number) => {
    if (!task?.id) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/tasks/${task.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceDuration: newDuration,
          endTime: calculateEndTime(task.scheduleTime || '', newDuration)
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status}`);
      }

      // Пересчитываем время дочерних услуг
      if (childTasks.length > 0) {
        let currentStartTime = calculateEndTime(task.scheduleTime || '', newDuration);

        for (const childTask of childTasks) {
          const childEndTime = calculateEndTime(currentStartTime, childTask.serviceDuration || 0);

          await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/tasks/${childTask.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              scheduleTime: currentStartTime,
              endTime: childEndTime
            }),
            credentials: 'include'
          });

          currentStartTime = childEndTime;
        }
      }

      queryClient.invalidateQueries({ queryKey: [`${import.meta.env.VITE_BACKEND_URL}/api/tasks/children`, task.id] });
      onTaskUpdated();

      toast({
        title: "Длительность обновлена",
        description: "Длительность основной услуги изменена",
        variant: "default",
      });
    } catch (error) {
      console.error('Error updating main service duration:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить длительность",
        variant: "destructive",
      });
    }
  };

  const updateChildServiceDuration = async (childTaskId: number, newDuration: number) => {
    try {
      const childIndex = childTasks.findIndex(child => child.id === childTaskId);
      if (childIndex === -1) return;

      // Рассчитываем новое время начала для данной дочерней услуги
      let currentStartTime = task?.scheduleTime || '';
      const mainDuration = task?.serviceDuration || task?.duration || 0;
      currentStartTime = calculateEndTime(currentStartTime, mainDuration);

      // Добавляем длительности предыдущих дочерних услуг
      for (let i = 0; i < childIndex; i++) {
        currentStartTime = calculateEndTime(currentStartTime, childTasks[i].serviceDuration || 0);
      }

      const childEndTime = calculateEndTime(currentStartTime, newDuration);

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/tasks/${childTaskId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceDuration: newDuration,
          scheduleTime: currentStartTime,
          endTime: childEndTime
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status}`);
      }

      // Пересчитываем время всех последующих дочерних услуг
      let nextStartTime = childEndTime;
      for (let i = childIndex + 1; i < childTasks.length; i++) {
        const nextChildTask = childTasks[i];
        const nextEndTime = calculateEndTime(nextStartTime, nextChildTask.serviceDuration || 0);

        await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/tasks/${nextChildTask.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scheduleTime: nextStartTime,
            endTime: nextEndTime
          }),
          credentials: 'include'
        });

        nextStartTime = nextEndTime;
      }

      queryClient.invalidateQueries({ queryKey: [`${import.meta.env.VITE_BACKEND_URL}/api/tasks/children`, task?.id] });
      onTaskUpdated();

      toast({
        title: "Длительность обновлена",
        description: "Длительность дополнительной услуги изменена",
        variant: "default",
      });
    } catch (error) {
      console.error('Error updating child service duration:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить длительность",
        variant: "destructive",
      });
    }
  };

  // ✅ Упрощенный автоматический расчет итоговой цены
  useEffect(() => {
    if (servicesData && task) {
      const totalPriceAllServices = calculateTotalPrice();
      const discountAmount = (totalPriceAllServices * formData.discount) / 100;
      const finalPriceAllServices = Math.round(totalPriceAllServices - discountAmount);

      setFormData(prev => ({ ...prev, finalPrice: finalPriceAllServices }));
    }
  }, [servicesData, task?.serviceDuration, formData.discount, childTasks]);

  // Мутация для создания дополнительной услуги
  const createAdditionalServiceMutation = useMutation({
    mutationFn: async (serviceData: { serviceId: number; serviceName: string; duration: number; price: number }) => {
      // Вычисляем время начала дочерней услуги = время окончания основной услуги
      const availableDurations = getAvailableDurations();
      const mainDuration = task?.serviceDuration || task?.duration || (availableDurations.length > 0 ? availableDurations[0].duration : 60);
      const childStartTime = calculateEndTime(task?.scheduleTime || '', mainDuration);
      const childEndTime = calculateEndTime(childStartTime, serviceData.duration);

      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: task?.clientId,
          status: task?.status || 'scheduled', // ✅ Дочерние услуги наследуют статус материнской записи
          serviceType: serviceData.serviceName,
          serviceServiceId: serviceData.serviceId,
          scheduleDate: task?.scheduleDate,
          scheduleTime: childStartTime, // Время начала = время окончания основной услуги
          endTime: childEndTime,        // Время окончания дочерней услуги
          masterName: task?.masterName,
          masterId: task?.masterId,
          notes: task?.notes,
          branchId: task?.branchId,
          source: 'manual',
          serviceDuration: serviceData.duration,
          servicePrice: serviceData.price,
          finalPrice: serviceData.price,
          mother: task?.id // Устанавливаем связь с материнской задачей
        })
      });

      if (!res.ok) {
        throw new Error('Failed to create additional service');
      }

      return res.json();
    },
    onSuccess: async () => {
      toast({
        title: "Дополнительная услуга добавлена",
        description: "Услуга успешно добавлена к задаче",
        variant: "default",
      });

      // Обновляем список дочерних задач
      await queryClient.invalidateQueries({ queryKey: [`${import.meta.env.VITE_BACKEND_URL}/api/tasks/children`, task?.id] });

      // Обновляем final_price основной задачи после добавления дочерней услуги
      if (task?.id) {
        const totalPriceAllServices = calculateTotalPrice();
        const discountAmount = (totalPriceAllServices * formData.discount) / 100;
        const finalPriceAllServices = Math.round(totalPriceAllServices - discountAmount);

        try {
          await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/tasks/${task.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              finalPrice: finalPriceAllServices
            })
          });
        } catch (error) {
          console.error('Error updating main task final price:', error);
        }
      }

      onTaskUpdated();
    },
    onError: (error) => {
      toast({
        title: "Ошибка при добавлении услуги",
        description: `${error}`,
        variant: "destructive",
      });
    }
  });

  // Мутация для удаления дополнительной услуги
  const deleteAdditionalServiceMutation = useMutation({
    mutationFn: async (childTaskId: number) => {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/tasks/${childTaskId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete additional service');
      }

      return res.json();
    },
    onSuccess: async () => {
      toast({
        title: "Дополнительная услуга удалена",
        description: "Услуга успешно удалена",
        variant: "default",
      });

      // Обновляем список дочерних задач
      await queryClient.invalidateQueries({ queryKey: [`${import.meta.env.VITE_BACKEND_URL}/api/tasks/children`, task?.id] });

      // Обновляем final_price основной задачи после удаления дочерней услуги
      if (task?.id) {
        const totalPriceAllServices = calculateTotalPrice();
        const discountAmount = (totalPriceAllServices * formData.discount) / 100;
        const finalPriceAllServices = Math.round(totalPriceAllServices - discountAmount);

        try {
          await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/tasks/${task.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              finalPrice: finalPriceAllServices
            })
          });
        } catch (error) {
          console.error('Error updating main task final price after deletion:', error);
        }
      }

      onTaskUpdated();
    },
    onError: (error) => {
      toast({
        title: "Ошибка при удалении услуги",
        description: `${error}`,
        variant: "destructive",
      });
    }
  });

  // Мутация для создания записи об оплате
  const createPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPaymentMethod || !task?.id) {
        throw new Error('Не выбран способ оплаты или задача');
      }

      if (!selectedAdministrator) {
        throw new Error('Не выбран администратор');
      }

      // Создаем основную запись об оплате
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/accounting`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          master: task.masterName || 'Неизвестный мастер',
          client: task.client?.customName || task.client?.firstName || 'Неизвестный клиент',
          serviceType: task.serviceType || 'Услуга',
          phoneNumber: task.client?.phoneNumber || '',
          amount: calculateTotalPrice() - Math.round(calculateTotalPrice() * formData.discount / 100),
          discount: formData.discount || 0,
          duration: task.duration || 60,
          comment: `Оплата через ${selectedPaymentMethod}`,
          paymentMethod: selectedPaymentMethod,
          dailyReport: calculateTotalPrice() - Math.round(calculateTotalPrice() * formData.discount / 100),
          adminName: selectedAdministrator,
          isGiftCertificateUsed: selectedPaymentMethod === 'Подарочный Сертификат',
          branchId: getBranchIdWithFallback(currentBranch, branches),
          date: task.scheduleDate || new Date().toISOString().split('T')[0]
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to create payment record');
      }

      // Обновляем статус задачи на completed и добавляем данные об оплате
      // Формируем полный payload для родительской задачи
      const calculateFinalPrice = (servicePrice: number, discount: number): number => {
        return Math.max(0, servicePrice - (servicePrice * discount / 100));
      };

      const calculateEndTime = (startTime: string, duration: number): string => {
        const [hours, minutes] = startTime.split(':').map(Number);
        const startMinutes = hours * 60 + minutes;
        const endMinutes = startMinutes + duration;
        const endHours = Math.floor(endMinutes / 60);
        const endMins = endMinutes % 60;
        return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
      };

      const servicePrice = task.finalPrice || task.servicePrice || 0;
      const discount = formData.discount || 0;
      const duration = task.duration || 60;

      const updatePayload: any = {
        clientName: task.clientName || 'Неизвестный клиент',
        phoneNumber: task.client?.phoneNumber || '',
        serviceType: task.serviceType || 'Услуга',
        masterName: task.masterName || 'Неизвестный мастер',
        masterId: task.masterId || null,
        notes: task.notes || '',
        scheduleTime: task.scheduleTime || '00:00',
        duration: duration,
        finalPrice: calculateFinalPrice(servicePrice, discount),
        discount: discount,
        branchId: task.branchId || getBranchIdWithFallback(currentBranch, branches).toString(),
        status: 'completed', // ВСЕГДА устанавливаем статус на completed при оплате
        endTime: calculateEndTime(task.scheduleTime || '00:00', duration),
        // Добавляем данные об оплате
        paymentMethod: selectedPaymentMethod,
        adminName: selectedAdministrator,
        paid: 'paid'
      };

      // scheduleDate только если есть валидная дата
      if (task.scheduleDate && task.scheduleDate !== null) {
        updatePayload.scheduleDate = task.scheduleDate;
      }

      await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });

      // Обновляем статус для всех дочерних записей
      if (childTasks.length > 0) {
        await Promise.all(childTasks.map(async (childTask) => {
          const childServicePrice = childTask.finalPrice || childTask.servicePrice || 0;
          const childDuration = childTask.duration || 60;
          
          const childUpdatePayload: any = {
            clientName: childTask.clientName || 'Неизвестный клиент',
            phoneNumber: childTask.client?.phoneNumber || '',
            serviceType: childTask.serviceType || 'Услуга',
            masterName: childTask.masterName || 'Неизвестный мастер',
            masterId: childTask.masterId || null,
            notes: childTask.notes || '',
            scheduleTime: childTask.scheduleTime || '00:00',
            duration: childDuration,
            finalPrice: calculateFinalPrice(childServicePrice, discount),
            discount: discount,
            branchId: childTask.branchId || getBranchIdWithFallback(currentBranch, branches).toString(),
            status: 'completed', // ВСЕГДА устанавливаем статус на completed при оплате
            endTime: calculateEndTime(childTask.scheduleTime || '00:00', childDuration),
            // Добавляем данные об оплате
            paymentMethod: selectedPaymentMethod,
            adminName: selectedAdministrator,
            paid: 'paid'
          };

          // scheduleDate только если есть валидная дата
          if (childTask.scheduleDate && childTask.scheduleDate !== null) {
            childUpdatePayload.scheduleDate = childTask.scheduleDate;
          }

          return fetch(`${import.meta.env.VITE_BACKEND_URL}/api/tasks/${childTask.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(childUpdatePayload),
          });
        }));
      }

      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Оплата зафиксирована",
        description: `Платеж через ${selectedPaymentMethod} успешно записан`,
        variant: "default",
      });

      setShowPaymentDialog(false);
      setSelectedPaymentMethod("");
      setSelectedAdministrator("");
      onTaskUpdated();
      onClose(); // Закрываем диалог редактирования после успешной оплаты
    },
    onError: (error) => {
      toast({
        title: "Ошибка при записи оплаты",
        description: `${error}`,
        variant: "destructive",
      });
    }
  });

  // Функция для обработки оплаты
  const handlePayment = () => {
    if (!selectedPaymentMethod) {
      toast({
        title: "Выберите способ оплаты",
        description: "Необходимо выбрать способ оплаты",
        variant: "destructive",
      });
      return;
    }

    if (!selectedAdministrator) {
      toast({
        title: "Выберите администратора",
        description: "Необходимо выбрать администратора",
        variant: "destructive",
      });
      return;
    }

    createPaymentMutation.mutate();
  };

  // Функция для добавления дополнительной услуги
  const handleAddAdditionalService = async (serviceName: string) => {
    const service = servicesData?.find(s => s.name === serviceName);
    if (service) {
      const duration = service.defaultDuration;
      const price = service.duration60_price || 0; // Используем цену за 60 минут по умолчанию

      createAdditionalServiceMutation.mutate({
        serviceId: service.id,
        serviceName: service.name,
        duration,
        price
      });
    }
  };

  // Функция для удаления дополнительной услуги
  const handleRemoveAdditionalService = (childTaskId: number) => {
    deleteAdditionalServiceMutation.mutate(childTaskId);
  };



  // Мутация для обновления записи
  const updateTaskMutation = useMutation({
    mutationFn: async () => {
      if (!task || !formData.clientName) {
        throw new Error("Данные задачи или имя клиента отсутствуют");
      }

      const payload = {
        clientName: formData.clientName,
        phoneNumber: formData.phoneNumber,
        serviceType: formData.serviceType,
        masterName: formData.masterName,
        masterId: formData.masterId,
        notes: formData.notes,
        scheduleDate: formData.scheduleDate,
        scheduleTime: formData.scheduleTime,
        duration: selectedDuration,
        finalPrice: formData.finalPrice,
        discount: formData.discount,
        branchId: formData.branchId,
        status: formData.status
      };

      // ✅ ВРЕМЕННО УБРАЛ синхронизацию статусов - она вызывала разъединение записей
      // Статус будет обновляться только для текущей записи без синхронизации с дочерними

      // Обновляем основную задачу
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/tasks/${task.id}`, {
        method: 'POST',  // ✅ Используем POST для совместимости с сервером
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include'
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Ошибка обновления записи');
      }

      // ✅ Сохранение локальных изменений длительности при нажатии кнопки "Сохранить"
      if (localMainDuration !== (task?.serviceDuration || task?.duration || 0)) {
        await updateMainServiceDuration(localMainDuration);
      }

      // Сохраняем изменения дочерних задач
      for (const childTask of childTasks) {
        const currentDuration = childTask.serviceDuration || childTask.duration || 0;
        const newDuration = localChildDurations[childTask.id] || 0;

        if (currentDuration !== newDuration) {
          await updateChildServiceDuration(childTask.id, newDuration);
        }
      }

      // Синхронизируем дочерние записи если они есть
      if (childTasks.length > 0) {
        const mainDuration = selectedDuration || task?.serviceDuration || 0;
        let currentStartTime = formData.scheduleTime;

        // Сдвигаем время основной записи
        currentStartTime = calculateEndTime(currentStartTime, mainDuration);

        // Обновляем каждую дочернюю запись
        for (const childTask of childTasks) {
          const childEndTime = calculateEndTime(currentStartTime, childTask.serviceDuration || 0);

          const childPayload = {
            scheduleDate: formData.scheduleDate,
            scheduleTime: currentStartTime,
            endTime: childEndTime,
            masterName: formData.masterName,
            masterId: formData.masterId,
            status: formData.status, // ✅ Автоматическая синхронизация статуса с материнской записью
            branchId: formData.branchId
          };

          await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/tasks/${childTask.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(childPayload),
            credentials: 'include'
          });

          // Следующая дочерняя услуга начинается после окончания текущей
          currentStartTime = childEndTime;
        }
      }

      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Запись обновлена",
        description: "Изменения успешно сохранены"
      });
      onTaskUpdated();
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: `${error}`,
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateTaskMutation.mutate();
  };

  if (!task) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Информация о записи</DialogTitle>
            <DialogDescription>
              Детали записи клиента
            </DialogDescription>
          </DialogHeader>
          {/* Статус оплаты в верхней части */}
          <div className={`px-4 py-3 border-b ${task?.paid === 'paid' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center justify-center gap-2">
              <div className={`w-3 h-3 rounded-full ${task?.paid === 'paid' ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className={`font-semibold text-sm ${task?.paid === 'paid' ? 'text-green-700' : 'text-red-700'}`}>
                {task?.paid === 'paid' ? 'ОПЛАЧЕНО' : 'НЕ ОПЛАЧЕНО'}
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex gap-5 p-4">
            {/* Левая колонка - Клиент */}
            <div className="flex-1 bg-white rounded-lg p-4">
              <div className="text-center text-blue-600 font-semibold text-lg mb-4">Клиент</div>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="clientName" className="block font-semibold text-gray-700 text-sm mb-1">Имя клиента</Label>
                  <Input
                    id="clientName"
                    className="w-full text-sm"
                    value={formData.clientName}
                    onChange={(e) => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
                    placeholder="Введите имя клиента"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="phoneNumber" className="block font-semibold text-gray-700 text-sm mb-1">Телефон</Label>
                  <Input
                    id="phoneNumber"
                    className="w-full text-sm"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                    placeholder="Введите номер телефона"
                  />
                </div>

                <div>
                  <Label htmlFor="notes" className="block font-semibold text-gray-700 text-sm mb-1">Примечания</Label>
                  <Textarea
                    id="notes"
                    className="w-full text-sm min-h-[80px]"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Дополнительные заметки"
                  />
                </div>
              </div>
            </div>

            {/* Правая колонка - Запись */}
            <div className="flex-1 bg-white rounded-lg p-4">
              <div className="text-center text-blue-600 font-semibold text-lg mb-4">Запись</div>

              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label htmlFor="scheduleTime" className="block font-semibold text-gray-700 text-sm mb-1">Время</Label>
                    <Input
                      id="scheduleTime"
                      type="time"
                      className="w-full text-sm"
                      value={formData.scheduleTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, scheduleTime: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="duration" className="block font-semibold text-gray-700 text-sm mb-1">Длительность</Label>
                  <Select
                    value={selectedDuration?.toString() || ""}
                    onValueChange={(value) => setSelectedDuration(Number(value))}
                    disabled={!formData.serviceType}
                  >
                    <SelectTrigger className="w-full text-sm">
                      <SelectValue placeholder="В минутах" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableDurations().map((duration) => (
                        <SelectItem key={duration.duration} value={duration.duration.toString()}>
                          {duration.duration} мин - {duration.price} сом
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="serviceType" className="block font-semibold text-gray-700 text-sm mb-1">Тип услуги</Label>
                  <Select
                    value={formData.serviceType}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, serviceType: value }))}
                  >
                    <SelectTrigger className="w-full text-sm">
                      <SelectValue placeholder="Выберите тип услуги" />
                    </SelectTrigger>
                    <SelectContent>
                      {servicesData?.map((service) => (
                        <SelectItem key={service.id} value={service.name}>
                          {service.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="masterName" className="block font-semibold text-gray-700 text-sm mb-1">Мастер</Label>
                  <Select
                    value={formData.masterName}
                    onValueChange={(value) => {
                      const master = allMasters.find(m => m.name === value);
                      setFormData(prev => ({
                        ...prev,
                        masterName: value,
                        masterId: master?.id || 0
                      }));
                    }}
                  >
                    <SelectTrigger className="w-full text-sm">
                      <SelectValue placeholder="Выберите мастера" />
                    </SelectTrigger>
                    <SelectContent>
                      {allMasters?.map((master) => (
                        <SelectItem key={master.id} value={master.name}>
                          {master.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="block font-semibold text-gray-700 text-sm mb-3">Статус</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={formData.status === 'scheduled' ? 'default' : 'outline'}
                      className={`h-16 flex flex-col items-center justify-center transition-all ${
                        formData.status === 'scheduled' 
                          ? 'bg-blue-500 text-white border-blue-500' 
                          : 'hover:bg-blue-50 hover:border-blue-300'
                      }`}
                      onClick={() => setFormData(prev => ({ ...prev, status: 'scheduled' }))}
                    >
                      <Clock className="h-5 w-5 mb-1" />
                      <span className="text-xs">Записан</span>
                    </Button>
                    
                    <Button
                      type="button"
                      variant={formData.status === 'in_progress' ? 'default' : 'outline'}
                      className={`h-16 flex flex-col items-center justify-center transition-all ${
                        formData.status === 'in_progress' 
                          ? 'bg-orange-500 text-white border-orange-500' 
                          : 'hover:bg-orange-50 hover:border-orange-300'
                      }`}
                      onClick={() => setFormData(prev => ({ ...prev, status: 'in_progress' }))}
                    >
                      <Scissors className="h-5 w-5 mb-1" />
                      <span className="text-xs">В процессе</span>
                    </Button>
                    
                    <Button
                      type="button"
                      variant={formData.status === 'completed' ? 'default' : 'outline'}
                      className={`h-16 flex flex-col items-center justify-center transition-all ${
                        formData.status === 'completed' 
                          ? 'bg-green-500 text-white border-green-500' 
                          : 'hover:bg-green-50 hover:border-green-300'
                      }`}
                      onClick={() => setFormData(prev => ({ ...prev, status: 'completed' }))}
                    >
                      <CheckCircle className="h-5 w-5 mb-1" />
                      <span className="text-xs">Завершен</span>
                    </Button>
                    
                    <Button
                      type="button"
                      variant={formData.status === 'cancelled' ? 'default' : 'outline'}
                      className={`h-16 flex flex-col items-center justify-center transition-all ${
                        formData.status === 'cancelled' 
                          ? 'bg-red-500 text-white border-red-500' 
                          : 'hover:bg-red-50 hover:border-red-300'
                      }`}
                      onClick={() => setFormData(prev => ({ ...prev, status: 'cancelled' }))}
                    >
                      <X className="h-5 w-5 mb-1" />
                      <span className="text-xs">Отменен</span>
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="branchId" className="block font-semibold text-gray-700 text-sm mb-1">Филиал</Label>
                  <Select
                    value={formData.branchId}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, branchId: value }))}
                  >
                    <SelectTrigger className="w-full text-sm">
                      <SelectValue placeholder="Выберите филиал" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="wa1">Токтогула 93</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="scheduleDate" className="block font-semibold text-gray-700 text-sm mb-1">Дата</Label>
                  <Input
                    id="scheduleDate"
                    type="date"
                    className="w-3/5 text-sm"
                    value={formData.scheduleDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, scheduleDate: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="discount" className="block font-semibold text-gray-700 text-sm mb-1">Скидка (%)</Label>
                  <Input
                    id="discount"
                    type="number"
                    min="0"
                    max="100"
                    className="w-1/3 text-sm"
                    value={formData.discount}
                    onChange={(e) => {
                      const discount = parseFloat(e.target.value) || 0;
                      setFormData(prev => ({ ...prev, discount }));
                    }}
                  />
                </div>

                {formData.finalPrice > 0 && (
                  <div className="text-right mt-3">
                    <Label className="block font-semibold text-gray-700 text-sm mb-1">Стоимость:</Label>
                    <Input
                      type="number"
                      className="w-32 text-sm inline-block"
                      value={formData.finalPrice}
                      readOnly
                      placeholder="Сумма"
                    />
                  </div>
                )}

                {/* Дополнительные услуги */}
                <div className="border-t pt-4 mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="font-semibold text-gray-700 text-sm">Дополнительные услуги</Label>
                    {/* ✅ Убрано редактирование общей длительности */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">
                        Общее время: {calculateTotalDuration()} мин
                      </span>
                      {hasUnsavedDurationChanges() && (
                        <span className="text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded">
                          Не сохранено
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Отображение связанных дополнительных услуг */}
                  <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg p-4 border border-amber-200">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-amber-600 text-lg">🔗</span>
                      <h4 className="font-semibold text-amber-800">Связанные услуги</h4>
                    </div>

                    {childTasks.length > 0 ? (
                      <div className="space-y-3">
                        {/* Основная услуга */}
                        <div className="bg-white rounded-md p-3 border-l-8 border-amber-400">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-amber-600 font-medium">🏆 Основная:</span>
                              <span className="text-gray-700">{task?.serviceType}</span>
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  value={localMainDuration}
                                  onChange={(e) => {
                                    const newDuration = parseInt(e.target.value) || 0;
                                    setLocalMainDuration(newDuration);
                                  }}
                                  className={`w-16 h-6 text-xs text-center ${localMainDuration !== (task?.serviceDuration || task?.duration || 0)
                                    ? 'border-amber-400 bg-amber-50'
                                    : ''
                                    }`}
                                  min="1"
                                />
                                <span className="text-gray-500 text-xs">мин</span>
                              </div>
                            </div>
                            <span className="font-medium text-gray-800">{calculateMainServicePrice()} сом</span>
                          </div>
                        </div>

                        {/* Дополнительные услуги */}
                        {childTasks.map((childTask, index) => (
                          <div key={childTask.id} className="bg-white rounded-md p-3 border-l-8 border-amber-300">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <span className="text-amber-500 font-medium">📎 Доп. услуга {index + 1}:</span>
                                <span className="text-gray-700">{childTask.serviceType}</span>
                                <div className="flex items-center gap-1">
                                  <Input
                                    type="number"
                                    value={localChildDurations[childTask.id] || 0}
                                    onChange={(e) => {
                                      const newDuration = parseInt(e.target.value) || 0;
                                      setLocalChildDurations(prev => ({
                                        ...prev,
                                        [childTask.id]: newDuration
                                      }));
                                    }}
                                    className={`w-16 h-6 text-xs text-center ${(localChildDurations[childTask.id] || 0) !== (childTask.serviceDuration || childTask.duration || 0)
                                      ? 'border-amber-400 bg-amber-50'
                                      : ''
                                      }`}
                                    min="0"
                                  />
                                  <span className="text-gray-500 text-xs">мин</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-800">{childTask.servicePrice} сом</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveAdditionalService(childTask.id)}
                                  disabled={deleteAdditionalServiceMutation.isPending}
                                  className="h-6 w-6 p-0 hover:bg-red-100"
                                >
                                  {deleteAdditionalServiceMutation.isPending ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <X className="h-3 w-3 text-red-500" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}

                        {/* Итоговая сумма */}
                        <div className="bg-amber-100 rounded-md p-3 border border-amber-300">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-amber-800">Итого:</span>
                              <span className="text-amber-700">{calculateTotalDuration()} мин</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-amber-700">Сумма всех услуг:</span>
                              <span className="font-bold text-amber-900 text-lg">{calculateTotalPrice()} сом</span>
                            </div>
                          </div>
                          {formData.discount > 0 && (
                            <div className="mt-2 text-sm text-amber-700">
                              Скидка {formData.discount}%: -{Math.round(calculateTotalPrice() * formData.discount / 100)} сом
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <span className="text-amber-600 text-sm">Дополнительных услуг пока нет</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 items-end mt-3">
                    <div className="flex-1">
                      <Select
                        value=""
                        onValueChange={(serviceName) => {
                          if (serviceName) {
                            handleAddAdditionalService(serviceName);
                          }
                        }}
                        disabled={createAdditionalServiceMutation.isPending}
                      >
                        <SelectTrigger className="w-full text-sm">
                          <SelectValue placeholder={createAdditionalServiceMutation.isPending ? "Добавление..." : "Добавить дополнительную услугу"} />
                        </SelectTrigger>
                        <SelectContent>
                          {servicesData?.map((service) => (
                            <SelectItem key={service.id} value={service.name}>
                              {service.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between mt-4">
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={onClose} className="bg-red-500 text-white hover:bg-red-600">
                      Отмена
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowPaymentDialog(true)}
                      className="bg-amber-500 text-white hover:bg-amber-600 flex items-center gap-2"
                    >
                      <CreditCard className="h-4 w-4" />
                      Оплатить
                    </Button>
                  </div>
                  <Button type="submit" disabled={updateTaskMutation.isPending} className="bg-green-500 text-white hover:bg-green-600">
                    {updateTaskMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Сохранить
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Диалог выбора способа оплаты */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-amber-600" />
              Оплата услуг
            </DialogTitle>
          </DialogHeader>

          <div className="flex gap-6">
            {/* Левая колонка - способы оплаты */}
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-4">Выберите способ оплаты</h3>
              <div className="space-y-2">
                {paymentMethods.map((method) => (
                  <div
                    key={method.value}
                    onClick={() => setSelectedPaymentMethod(method.value)}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${selectedPaymentMethod === method.value
                      ? 'border-amber-400 bg-amber-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">
                        <PaymentMethodIcon paymentMethod={method.value} className="w-8 h-8" />
                      </div>
                      <div>
                        <div className="font-medium">{method.label}</div>
                        <div className="text-sm text-gray-600">{method.description}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Правая колонка - детали оплаты */}
            <div className="w-64 bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-4">Детали оплаты</h3>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Услуга:</span>
                  <span className="text-sm font-medium">{task?.serviceType}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-sm">Мастер:</span>
                  <span className="text-sm font-medium">{task?.masterName}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-sm">Клиент:</span>
                  <span className="text-sm font-medium">{task?.client?.customName || task?.client?.firstName}</span>
                </div>

                <hr className="my-3" />

                <div className="flex justify-between">
                  <span className="text-sm">Сумма услуг:</span>
                  <span className="text-sm">{calculateTotalPrice()} сом</span>
                </div>

                {formData.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span className="text-sm">Скидка {formData.discount}%:</span>
                    <span className="text-sm">-{Math.round(calculateTotalPrice() * formData.discount / 100)} сом</span>
                  </div>
                )}

                <hr className="my-3" />

                <div className="flex justify-between font-bold text-lg">
                  <span>К оплате:</span>
                  <span className="text-amber-600">
                    {calculateTotalPrice() - Math.round(calculateTotalPrice() * formData.discount / 100)} сом
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Выбор администратора */}
          <div className="mt-4 border-t pt-4">
            <Label className="text-sm font-semibold mb-2 block">Администратор</Label>
            <Select value={selectedAdministrator} onValueChange={setSelectedAdministrator}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Выберите администратора" />
              </SelectTrigger>
              <SelectContent>
                {administrators.map((admin) => (
                  <SelectItem key={admin.id} value={admin.name}>
                    {admin.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="flex justify-between mt-4">
            <Button
              variant="outline"
              onClick={() => setShowPaymentDialog(false)}
            >
              Отмена
            </Button>
            <Button
              onClick={handlePayment}
              disabled={!selectedPaymentMethod || !selectedAdministrator || createPaymentMutation.isPending}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              {createPaymentMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Зафиксировать оплату
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Основной компонент календаря
// Функции для цветового кодирования статусов
// Функция для получения стилей связанных записей
const getRelatedTaskStyles = (task: Task, childTasksMap: { [taskId: number]: Task[] }) => {
  const isMainTask = !task.mother; // Основная задача не имеет поля mother
  const hasChildren = childTasksMap[task.id] && childTasksMap[task.id].length > 0;
  const isChildTask = !!task.mother;

  if (isMainTask && hasChildren) {
    return {
      indicator: '🔗', // Индикатор связанной записи
      borderStyle: 'border-l-8 border-l-amber-500 bg-amber-50 shadow-lg border-2 border-amber-300',
      connectLine: 'after:absolute after:top-full after:left-1/2 after:w-1 after:h-3 after:bg-amber-500 after:transform after:-translate-x-1/2 after:z-20'
    };
  }

  if (isChildTask) {
    return {
      indicator: '📎',
      borderStyle: 'border-l-8 border-l-amber-400 bg-amber-25 border-2 border-amber-200 ml-2',
      connectLine: 'before:absolute before:top-0 before:left-1/2 before:w-1 before:h-3 before:bg-amber-400 before:transform before:-translate-x-1/2 before:-top-3 before:z-20'
    };
  }

  return { indicator: '', borderStyle: '', connectLine: '' };
};

const getStatusColors = (status: string | null | undefined) => {
  // Нормализуем статус и убеждаемся, что он не null/undefined/пустая строка
  const normalizedStatus = status?.trim() || 'scheduled';
  
  switch (normalizedStatus) {
    case 'new':
      return {
        bg: 'bg-blue-200 hover:bg-blue-300',
        border: 'border-blue-400',
        text: 'text-blue-900',
        badge: 'bg-blue-600 text-white'
      };
    case 'scheduled':
      // Зеленый - записан
      return {
        bg: 'bg-green-100 hover:bg-green-200',
        border: 'border-green-500',
        text: 'text-green-800',
        badge: 'bg-green-500 text-white'
      };
    case 'in_progress':
      // Синий - в процессе
      return {
        bg: 'bg-blue-100 hover:bg-blue-200',
        border: 'border-blue-500',
        text: 'text-blue-800',
        badge: 'bg-blue-500 text-white'
      };
    case 'completed':
      // Желтый - завершен
      return {
        bg: 'bg-yellow-100 hover:bg-yellow-200',
        border: 'border-yellow-500',
        text: 'text-yellow-800',
        badge: 'bg-yellow-500 text-white'
      };
    case 'cancelled':
      return {
        bg: 'bg-red-200 hover:bg-red-300',
        border: 'border-red-400',
        text: 'text-red-900',
        badge: 'bg-red-600 text-white'
      };
    case 'regular':
      return {
        bg: 'bg-gray-200 hover:bg-gray-300',
        border: 'border-gray-400',
        text: 'text-gray-900',
        badge: 'bg-gray-500 text-white'
      };
    default:
      // Для любых неизвестных статусов используем зеленый (scheduled)
      console.warn(`Неизвестный статус задачи: "${status}". Используется fallback 'scheduled'.`);
      return {
        bg: 'bg-green-100 hover:bg-green-200',
        border: 'border-green-500',
        text: 'text-green-800',
        badge: 'bg-green-500 text-white'
      };
  }
};

const getStatusLabel = (status: string | null | undefined) => {
  const normalizedStatus = status?.trim() || 'scheduled';
  
  switch (normalizedStatus) {
    case 'new':
      return 'Неразобранные';
    case 'scheduled':
      return 'Записан';
    case 'in_progress':
      return 'В процессе';
    case 'completed':
      return 'Обслуженные';
    case 'cancelled':
      return 'Отмененные';
    case 'regular':
      return 'Постоянные';
    default:
      return 'Записан'; // Fallback для неизвестных статусов
  }
};

export default function DailyCalendar() {
  const { isMaster, isLoading: masterRoleLoading } = useIsMaster();
  const { toast } = useToast();

  // Если пользователь - мастер, перенаправляем на календарь мастеров
  if (!masterRoleLoading && isMaster) {
    return <Redirect to="/master/calendar" />;
  }

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{ time: string; masterId: number } | null>(null);
  const [hoveredSlot, setHoveredSlot] = useState<{ time: string; masterId: number } | null>(null);

  // Состояние для drag and drop
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [draggedOver, setDraggedOver] = useState<{ time: string; masterId: number } | null>(null);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { currentBranch, branches }: { currentBranch: any; branches: any[] } = useBranch();
  const queryClient = useQueryClient();

  // Обновляем текущее время каждую минуту
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 10000); // Обновляем каждые 10 секунд

    return () => clearInterval(timer);
  }, []);

  // Генерируем дни для горизонтального слайдера (текущий день + 30 дней вперед)
  const sliderDays = Array.from({ length: 31 }, (_, i) => addDays(new Date(), i));

  // Ленивая загрузка мастеров по дате (addResource функциональность)
  const formattedDate = format(selectedDate, 'yyyy-MM-dd');

  // Автоматическая синхронизация данных каждые 60 секунд
  useEffect(() => {
    const syncTimer = setInterval(() => {
      // Обновляем данные календаря
      queryClient.invalidateQueries({
        queryKey: ['/api/crm/tasks', formattedDate, getBranchIdWithFallback(currentBranch, branches)]
      });

      // Обновляем данные мастеров
      queryClient.invalidateQueries({
        queryKey: [`${import.meta.env.VITE_BACKEND_URL}/api/calendar/masters`, formattedDate, getBranchIdWithFallback(currentBranch, branches)]
      });
    }, 10000); // Синхронизация каждые 10 секунд

    return () => clearInterval(syncTimer);
  }, [formattedDate, currentBranch, branches, queryClient]);
  const { data: masters = [], isLoading: mastersLoading } = useQuery<Master[]>({
    queryKey: [`${import.meta.env.VITE_BACKEND_URL}/api/calendar/masters`, formattedDate, getBranchIdWithFallback(currentBranch, branches)],
    queryFn: () => fetch(`${import.meta.env.VITE_BACKEND_URL}/api/calendar/masters/${formattedDate}?branchId=${getBranchIdWithFallback(currentBranch, branches)}`, {
      credentials: 'include'
    }).then(res => res.json()),
    enabled: !!getBranchIdWithFallback(currentBranch, branches),
    staleTime: 5 * 60 * 1000, // Кэш на 5 минут для оптимизации
    refetchOnWindowFocus: false
  });

  // Загружаем все записи из crm_tasks для выбранной даты (исключая отмененные)
  const { data: allTasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: [`${import.meta.env.VITE_BACKEND_URL}/api/crm/tasks`, formattedDate, getBranchIdWithFallback(currentBranch, branches)],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/crm/tasks?date=${formattedDate}&branchId=${getBranchIdWithFallback(currentBranch, branches)}`, {
        credentials: 'include'
      });
      if (!res.ok) {
        throw new Error('Failed to fetch tasks');
      }
      return res.json();
    },
    enabled: !!getBranchIdWithFallback(currentBranch, branches)
  });

  // Фильтруем отмененные записи и дочерние услуги из основного календаря
  // Дочерние услуги (с полем mother) не должны отображаться отдельно
  const tasks = useMemo(() => {
    return allTasks.filter(task => 
      task.status !== 'cancelled' && 
      task.status !== 'no_show' &&
      !task.mother // Исключаем дочерние услуги - они будут показаны внутри родительской записи
    );
  }, [allTasks]);

  // Создаем карту дочерних задач из уже загруженных данных
  const childTasksMap = useMemo(() => {
    const childrenMap: { [taskId: number]: Task[] } = {};
    
    // Фильтруем дочерние задачи из allTasks
    const childTasks = allTasks.filter(task => 
      task.mother && 
      task.status !== 'cancelled' && 
      task.status !== 'no_show'
    );
    
    // Группируем дочерние задачи по mother ID
    childTasks.forEach(childTask => {
      const motherId = childTask.mother;
      if (motherId) {
        if (!childrenMap[motherId]) {
          childrenMap[motherId] = [];
        }
        childrenMap[motherId].push(childTask);
      }
    });
    
    return childrenMap;
  }, [allTasks]);

  // Загружаем услуги массажа для правильного расчета длительности
  const { data: serviceServices = [] } = useQuery<serviceService[]>({
    queryKey: [`${import.meta.env.VITE_BACKEND_URL}/api/public/service-services`],
  });

  // Генерируем временные слоты с 7:00 до 23:59 с шагом 15 минут
  const timeSlots = useMemo(() => {
    const slots = [];
    const startHour = 7;
    const endHour = 24; // до 23:59

    for (let hour = startHour; hour < endHour; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:15`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
      slots.push(`${hour.toString().padStart(2, '0')}:45`);
    }

    return slots;
  }, []);

  // Вычисляем позицию линии текущего времени
  const getCurrentTimePosition = () => {
    if (!isSameDay(selectedDate, currentTime)) return null;

    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;

    // Время начала календаря (7:00) в минутах
    const startTimeInMinutes = 7 * 60;
    const endTimeInMinutes = 24 * 60;

    // Если текущее время вне рабочих часов, не показываем линию
    if (currentTimeInMinutes < startTimeInMinutes || currentTimeInMinutes >= endTimeInMinutes) {
      return null;
    }

    // Вычисляем позицию относительно первого слота
    const relativeMinutes = currentTimeInMinutes - startTimeInMinutes;
    const slotHeight = 24; // px высота одного слота
    const position = (relativeMinutes / 15) * slotHeight; // каждый слот = 15 минут

    return position;
  };

  const currentTimePosition = getCurrentTimePosition();

  // Активные мастера уже отфильтрованы по дате на сервере
  const activeMasters = useMemo(() => {
    return masters.filter((master: Master) => master.isActive);
  }, [masters]);

  // Проверяем занятость временного слота с учетом длительности записи
  const isSlotOccupied = (time: string, masterId: number) => {
    const masterName = activeMasters.find(m => m.id === masterId)?.name;
    if (!masterName) return false;

    // Конвертируем время в минуты для сравнения
    const timeToMinutes = (timeStr: string) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const slotMinutes = timeToMinutes(time);

    return tasks.some((task: Task) => {
      if (task.masterName !== masterName) return false;
      const taskDateStr = (task.scheduleDate || '').split('T')[0];
      if (taskDateStr !== format(selectedDate, 'yyyy-MM-dd')) return false;

      const taskStartMinutes = timeToMinutes(task.scheduleTime || '');
      const taskDuration = task.serviceDuration || task.duration || 60;
      const taskEndMinutes = taskStartMinutes + taskDuration;

      // Проверяем, попадает ли слот в диапазон записи (с учетом 30-минутных интервалов)
      return slotMinutes >= taskStartMinutes && slotMinutes < taskEndMinutes;
    });
  };

  // Получаем задачу для временного слота с учетом длительности
  const getSlotTask = (time: string, masterId: number) => {
    const masterName = activeMasters.find(m => m.id === masterId)?.name;
    if (!masterName) return undefined;

    // Конвертируем время в минуты для сравнения
    const timeToMinutes = (timeStr: string) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const slotMinutes = timeToMinutes(time);

    return tasks.find((task: Task) => {
      if (task.masterName !== masterName) return false;
      const taskDateStr = (task.scheduleDate || '').split('T')[0];
      if (taskDateStr !== format(selectedDate, 'yyyy-MM-dd')) return false;

      const taskStartMinutes = timeToMinutes(task.scheduleTime || '');
      const taskDuration = task.serviceDuration || task.duration || 60;
      const taskEndMinutes = taskStartMinutes + taskDuration;

      // Возвращаем задачу только если слот является началом записи или попадает в её диапазон
      return slotMinutes >= taskStartMinutes && slotMinutes < taskEndMinutes;
    });
  };

  // Получаем ВСЕ задачи для временного слота (для поддержки наложения)
  const getAllSlotTasks = (time: string, masterId: number) => {
    const masterName = activeMasters.find(m => m.id === masterId)?.name;
    if (!masterName) return [];

    // Конвертируем время в минуты для сравнения
    const timeToMinutes = (timeStr: string) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const slotMinutes = timeToMinutes(time);

    return tasks.filter((task: Task) => {
      if (task.masterName !== masterName) return false;
      const taskDateStr = (task.scheduleDate || '').split('T')[0];
      if (taskDateStr !== format(selectedDate, 'yyyy-MM-dd')) return false;

      const taskStartMinutes = timeToMinutes(task.scheduleTime || '');
      const taskDuration = task.serviceDuration || task.duration || 60;
      const taskEndMinutes = taskStartMinutes + taskDuration;

      return slotMinutes >= taskStartMinutes && slotMinutes < taskEndMinutes;
    }).sort((a, b) => (a.id || 0) - (b.id || 0)); // Сортируем по ID для стабильного порядка наложения
  };

  const handleSlotClick = (time: string, masterId: number) => {
    const existingTask = getSlotTask(time, masterId);

    if (existingTask) {
      // Если есть запись - открываем для редактирования
      setSelectedTask(existingTask);
      setShowEditDialog(true);
    } else {
      // Если пустой слот - создаем новую запись
      setSelectedTimeSlot({ time, masterId });
      setShowCreateDialog(true);
    }
  };

  // Hover-to-create функциональность
  const handleSlotHover = (time: string, masterId: number) => {
    if (!isSlotOccupied(time, masterId)) {
      setHoveredSlot({ time, masterId });
    }
  };

  const handleSlotLeave = () => {
    setHoveredSlot(null);
  };

  const handleTaskCreated = () => {
    queryClient.invalidateQueries({ queryKey: [`${import.meta.env.VITE_BACKEND_URL}/api/crm/tasks`] });
    queryClient.invalidateQueries({ queryKey: [`${import.meta.env.VITE_BACKEND_URL}/api/calendar/masters`] });
    setSelectedTimeSlot(null);
  };

  const handleTaskUpdated = () => {
    queryClient.invalidateQueries({ queryKey: [`${import.meta.env.VITE_BACKEND_URL}/api/crm/tasks`] });
    queryClient.invalidateQueries({ queryKey: [`${import.meta.env.VITE_BACKEND_URL}/api/calendar/masters`] });
    setSelectedTask(null);
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, task: Task) => {
    console.log('handleDragStart called with task:', task);
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', ''); // Required for Firefox
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDraggedOver(null);
  };

  const handleDragOver = (e: React.DragEvent, time: string, masterId: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDraggedOver({ time, masterId });
  };

  const handleDragLeave = () => {
    setDraggedOver(null);
  };

  // Мутация для обновления времени и мастера записи
  const moveTaskMutation = useMutation({
    mutationFn: async ({ taskId, newTime, newMasterId }: { taskId: number; newTime: string; newMasterId: number }) => {
      console.log('moveTaskMutation called with:', { taskId, newTime, newMasterId });
      
      const newMaster = activeMasters.find(m => m.id === newMasterId);
      if (!newMaster) throw new Error('Мастер не найден');

      // Получаем текущие данные задачи для формирования полного payload
      let currentTask = null;
      try {
        const taskResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/tasks/${taskId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include'
        });
        
        if (taskResponse.ok) {
          currentTask = await taskResponse.json();
          console.log('📋 Current task data for move:', currentTask);
        } else {
          throw new Error('Could not fetch current task data');
        }
      } catch (error) {
        console.error('❌ Error fetching current task data:', error);
        throw new Error('Failed to fetch current task data for update');
      }

      // Вспомогательные функции
      const calculateFinalPrice = (servicePrice: number, discount: number): number => {
        return Math.max(0, servicePrice - (servicePrice * discount / 100));
      };

      const calculateEndTime = (startTime: string, duration: number): string => {
        const [hours, minutes] = startTime.split(':').map(Number);
        const startMinutes = hours * 60 + minutes;
        const endMinutes = startMinutes + duration;
        const endHours = Math.floor(endMinutes / 60);
        const endMins = endMinutes % 60;
        return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
      };

      // Формируем полный payload
      const serviceDuration = currentTask.serviceDuration || 60;
      const servicePrice = currentTask.finalPrice || currentTask.servicePrice || 0;
      const discount = currentTask.discount || 0;
      
      // Улучшенная логика получения имени клиента
      const clientName = currentTask.client?.customName || 
                        currentTask.client?.firstName || 
                        currentTask.clientName || 
                        'Неизвестный клиент';
      
      const payload: any = {
        clientName: clientName,
        phoneNumber: currentTask.client?.phoneNumber || '',
        serviceType: currentTask.serviceType || 'Услуга',
        masterName: newMaster.name,
        masterId: newMasterId,
        notes: currentTask.notes || '',
        scheduleTime: newTime,
        duration: serviceDuration,
        finalPrice: calculateFinalPrice(servicePrice, discount), // Обязательное поле
        discount: discount,
        endTime: calculateEndTime(newTime, serviceDuration), // Обязательное поле
        branchId: currentTask.branchId || '1',
        status: currentTask.status || 'scheduled'
      };

      // scheduleDate только если есть валидная дата
      if (currentTask.scheduleDate && currentTask.scheduleDate !== null) {
        payload.scheduleDate = currentTask.scheduleDate;
      }

      console.log('Sending PATCH request to:', `${import.meta.env.VITE_BACKEND_URL}/api/tasks/${taskId}`);
      console.log('Payload:', payload);

      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include'
      });

      console.log('Response status:', res.status);
      console.log('Response ok:', res.ok);

      if (!res.ok) {
        const errorData = await res.json();
        console.log('Error response:', errorData);
        throw new Error(errorData.message || 'Ошибка перемещения записи');
      }

      const result = await res.json();
      console.log('Success response:', result);
      return result;
    },
    onSuccess: () => {
      toast({
        title: "Запись перемещена",
        description: "Запись успешно перемещена"
      });
      queryClient.invalidateQueries({ queryKey: [`${import.meta.env.VITE_BACKEND_URL}/api/crm/tasks`] });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: `Не удалось переместить запись: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  const handleDrop = (e: React.DragEvent, time: string, masterId: number) => {
    e.preventDefault();
    setDraggedOver(null);

    console.log('handleDrop called:', { time, masterId, draggedTask });

    if (!draggedTask) {
      console.log('No dragged task, returning');
      return;
    }

    // Проверяем, изменились ли время или мастер
    if (draggedTask.scheduleTime === time && draggedTask.masterId === masterId) {
      console.log('Task not moved - same position');
      return; // Ничего не изменилось
    }

    console.log('Moving task from:', { 
      oldTime: draggedTask.scheduleTime, 
      oldMasterId: draggedTask.masterId 
    }, 'to:', { time, masterId });

    moveTaskMutation.mutate({
      taskId: draggedTask.id,
      newTime: time,
      newMasterId: masterId
    });
  };

  if (mastersLoading || tasksLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Загрузка календаря...</span>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6">
        {/* 🧪 ТЕСТ: Простая проверка событий */}
        <div style={{ 
          backgroundColor: 'yellow', 
          padding: '20px', 
          margin: '10px 0',
          border: '2px solid red'
        }}>
          <h3>🧪 ТЕСТ СОБЫТИЙ</h3>
          <button 
            onClick={() => console.log('✅ CLICK работает!')}
            onMouseDown={() => console.log('✅ MOUSE DOWN работает!')}
            style={{ 
              padding: '10px', 
              margin: '5px', 
              backgroundColor: 'red', 
              color: 'white',
              cursor: 'pointer'
            }}
          >
            Кликни меня
          </button>
          
          <div
            draggable={true}
            onDragStart={() => console.log('✅ DRAG START работает!')}
            onMouseDown={() => console.log('✅ DRAG MOUSE DOWN работает!')}
            style={{
              padding: '15px',
              backgroundColor: 'blue',
              color: 'white',
              cursor: 'move',
              userSelect: 'none',
              display: 'inline-block',
              margin: '5px'
            }}
          >
            Перетащи меня
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Календарь записей</h1>
            <p className="text-muted-foreground">
              Управление записями клиентов на {format(selectedDate, 'dd MMMM yyyy')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <CancelledAppointments selectedDate={selectedDate} />
            <Badge variant="outline" className="ml-2">
              {currentBranch?.branches || 'Филиал'}
            </Badge>
          </div>
        </div>

        {/* Task Parser Control Panel */}
        <TaskParserControlPanel 
          selectedDate={selectedDate}
          onDataReceived={(data) => {
            console.log('[DailyCalendar] Received parser data:', data);
            toast({
              title: "Данные обновлены",
              description: `Получено записей: ${data.count}`,
              variant: data.success ? "default" : "destructive"
            });
          }}
        />

        {/* Горизонтальный слайдер дней */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Выберите дату</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDatePicker(!showDatePicker)}
              >
                <CalendarIcon className="h-4 w-4 mr-2" />
                Календарь
              </Button>
            </div>
          </div>
          <div className="p-4">
            {/* Горизонтальный скроллер дней */}
            <div className="relative">
              <div className="flex space-x-2 overflow-x-auto pb-4 scrollbar-hide">
                {sliderDays.map((day, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedDate(day)}
                    className={`
                    flex-shrink-0 p-3 rounded-lg border transition-colors min-w-[80px] text-center
                    ${isSameDay(day, selectedDate)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'hover:bg-muted border-border'
                      }
                    ${isToday(day) ? 'ring-2 ring-primary/20' : ''}
                  `}
                  >
                    <div className="text-sm font-medium">
                      {format(day, 'EEE')}
                    </div>
                    <div className="text-lg font-bold">
                      {format(day, 'd')}
                    </div>
                    {isToday(day) && (
                      <div className="text-xs text-primary mt-1">Сегодня</div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Расширенный календарь */}
            {showDatePicker && (
              <div className="mt-4 p-4 border rounded-lg bg-muted/30">
                <div className="flex items-center justify-between mb-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedDate(subDays(selectedDate, 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <h3 className="font-semibold">
                    {format(selectedDate, 'MMMM yyyy')}
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex justify-center">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    className="rounded-md border"
                    locale={ru}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Дневное расписание */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">
              Расписание на {format(selectedDate, 'd MMMM')}
            </h2>
          </div>

          {/* Проверяем, есть ли мастера на выбранную дату */}
          {activeMasters.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p className="text-lg">На выбранную дату нет работающих мастеров</p>
              <p className="text-sm mt-2">Выберите другую дату или проверьте расписание мастеров</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-max">
                {/* Заголовки с именами мастеров - фиксированная сетка */}
                <div
                  className="grid border-b bg-gray-50"
                  style={{ gridTemplateColumns: `100px repeat(${activeMasters.length}, minmax(150px, 180px))` }}
                >
                  <div className="p-3 font-medium text-sm bg-gray-100 border-r">Время</div>
                  {activeMasters.map((master: Master) => (
                    <div key={master.id} className="p-3 font-medium text-sm text-center border-r bg-gray-50">
                      {/* Изображение мастера */}
                      <div className="flex justify-center mb-2">
                        {master.photoUrl ? (
                          <img
                            src={master.photoUrl}
                            alt={master.name}
                            className="w-10 h-10 rounded-full object-cover border-2 border-gray-300"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center border-2 border-gray-400">
                            <span className="text-gray-600 font-bold text-xs">
                              {master.name.charAt(0)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="font-bold">{master.name}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {master.specialization}
                      </div>
                      <div className="text-xs text-blue-600 mt-1">
                        {master.startWorkHour} - {master.endWorkHour}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Временные слоты - единая CSS Grid */}
                <div className="max-h-[600px] overflow-y-auto relative">
                  {/* Линия текущего времени */}
                  {currentTimePosition !== null && (
                    <div
                      className="absolute left-0 right-0 z-10 pointer-events-none"
                      style={{ top: `${currentTimePosition}px` }}
                    >
                      <div className="flex items-center">
                        <div className="bg-blue-500 text-white text-xs px-2 py-1 rounded-l font-medium min-w-[100px] text-center">
                          {format(currentTime, 'HH:mm')}
                        </div>
                        <div className="flex-1 h-0.5 bg-blue-500"></div>
                      </div>
                    </div>
                  )}

                  {/* Единая CSS Grid для всех слотов */}
                  <div
                    className="grid"
                    style={{
                      gridTemplateColumns: `100px repeat(${activeMasters.length}, minmax(150px, 180px))`,
                      gridTemplateRows: `repeat(${timeSlots.length}, 24px)`
                    }}
                  >
                    {timeSlots.map((time, timeIndex) => [
                      // Колонка времени
                      <div
                        key={`time-${time}`}
                        className={`p-1 bg-gray-50 border-r text-center flex items-center justify-center h-[24px] font-bold text-gray-800 text-[13px] border-b ${time.endsWith(':00')
                          ? ''
                          : time.endsWith(':30')
                            ? 'font-medium text-gray-600'
                            : 'font-normal text-gray-400'
                          }`}
                        style={{ gridColumn: 1, gridRow: timeIndex + 1 }}
                      >
                        {time}
                      </div>,
                      // Колонки для каждого мастера
                      ...activeMasters.map((master: Master, masterIndex) => {
                        const allSlotTasks = getAllSlotTasks(time, master.id);
                        const task = getSlotTask(time, master.id); // Получаем основную задачу для обратной совместимости
                        const isOccupied = isSlotOccupied(time, master.id);
                        const isHovered = hoveredSlot?.time === time && hoveredSlot?.masterId === master.id;

                        // Если есть несколько задач, показываем их с наложением
                        if (allSlotTasks.length > 1) {
                          return allSlotTasks.map((overlappingTask, taskIndex) => {
                            const isTaskStart = overlappingTask.scheduleTime === time;
                            const shouldShowTaskContent = isTaskStart;

                            if (!shouldShowTaskContent) return null;

                            // Рассчитываем grid positioning для многослотовых записей
                            let gridRow = timeIndex + 1;
                            let gridRowEnd: number | undefined;

                            // Логика для определения длительности (как в оригинале)
                            const childTasks = childTasksMap[overlappingTask.id] || [];
                            const childrenDuration = childTasks.reduce((sum, child) => sum + (child.serviceDuration || child.duration || 0), 0);

                            let mainDuration = overlappingTask.serviceDuration || overlappingTask.duration;

                            if (!mainDuration && overlappingTask.serviceServiceId && serviceServices.length > 0) {
                              const service = serviceServices.find(s => s.id === overlappingTask.serviceServiceId);
                              if (service) {
                                mainDuration = service.defaultDuration || 60;
                              }
                            }

                            if (!mainDuration) {
                              mainDuration = 60;
                            }

                            const totalDuration = mainDuration + childrenDuration;
                            const slotsCount = Math.ceil(totalDuration / 15);
                            if (slotsCount > 1) {
                              gridRowEnd = gridRow + slotsCount;
                            }

                            const relatedStyles = getRelatedTaskStyles(overlappingTask, childTasksMap);
                            const zIndex = 10 + taskIndex; // Более поздние задачи имеют больший z-index

                            return (
                              <Tooltip key={`${time}-${master.id}-${overlappingTask.id}-${taskIndex}`}>
                                <TooltipTrigger asChild>
                                  <div
                                    className={`p-1 border-r border-b cursor-move transition-all duration-200 relative rounded-lg overflow-hidden ${getStatusColors(overlappingTask?.status).bg
                                      } ${relatedStyles.borderStyle || (getStatusColors(overlappingTask?.status).border + ' border-l-8')}
                                ${draggedTask?.id === overlappingTask.id ? 'opacity-50 scale-95' : ''}`}
                                    style={{
                                      gridColumn: masterIndex + 2,
                                      gridRow: gridRowEnd ? `${gridRow} / ${gridRowEnd}` : gridRow,
                                      zIndex: zIndex,
                                      opacity: taskIndex > 0 ? 0.8 : 1 // Немного прозрачности для наложенных задач
                                    }}
                                    draggable={true}
                                    onDragStart={(e) => handleDragStart(e, overlappingTask)}
                                    onDragEnd={handleDragEnd}
                                    onClick={() => handleSlotClick(time, master.id)}
                                    onMouseEnter={() => handleSlotHover(time, master.id)}
                                    onMouseLeave={handleSlotLeave}
                                  >
                                    <div className="text-xs h-full w-full flex flex-col overflow-hidden leading-tight max-w-full relative">
                                      {overlappingTask.paid !== 'paid' && (
                                        <div className="absolute top-0 right-0 z-10">
                                          <Coins className="h-3 w-3 text-amber-500" />
                                        </div>
                                      )}

                                      <div className="flex items-center justify-between min-h-0 w-full max-w-full">
                                        <div className={`font-medium ${getStatusColors(overlappingTask?.status).text} flex items-center gap-0.5 truncate flex-1 text-xs max-w-full`}>
                                          {relatedStyles.indicator && (
                                            <span className="text-amber-500 text-xs flex-shrink-0">{relatedStyles.indicator}</span>
                                          )}
                                          <span className="truncate text-xs">{overlappingTask.client?.customName || overlappingTask.client?.firstName || 'Клиент'}</span>
                                          {taskIndex > 0 && <span className="text-xs text-gray-500 ml-1">#{taskIndex + 1}</span>}
                                        </div>
                                      </div>

                                      {overlappingTask.client?.phoneNumber && (
                                        <div className="text-gray-500 truncate text-xs leading-none">
                                          📞 {overlappingTask.client.phoneNumber}
                                        </div>
                                      )}

                                      <div className="text-gray-600 truncate text-xs leading-none">
                                        {overlappingTask.serviceType}
                                      </div>

                                      {childTasksMap[overlappingTask.id] && childTasksMap[overlappingTask.id].length > 0 && (
                                        <div className="text-indigo-600 truncate text-xs leading-none">
                                          +{childTasksMap[overlappingTask.id].length} доп. услуг
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs">
                                  <div className="space-y-1">
                                    <p><strong>Клиент:</strong> {overlappingTask.client?.customName || overlappingTask.client?.firstName}</p>
                                    <p><strong>Услуга:</strong> {overlappingTask.serviceType}</p>
                                    <p><strong>Время:</strong> {overlappingTask.scheduleTime} - {overlappingTask.endTime}</p>
                                    <p><strong>Мастер:</strong> {overlappingTask.masterName}</p>
                                    <p><strong>Статус:</strong> {overlappingTask.status}</p>
                                    {overlappingTask.paid !== 'paid' && <p><strong>Оплата:</strong> Не оплачено</p>}
                                    {childTasksMap[overlappingTask.id] && childTasksMap[overlappingTask.id].length > 0 && (
                                      <p><strong>Доп. услуги:</strong> {childTasksMap[overlappingTask.id].map(child => child.serviceType).join(', ')}</p>
                                    )}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            );
                          }).filter(Boolean);
                        }

                        // Оригинальная логика для одиночных задач
                        const isTaskStart = task && task.scheduleTime === time;
                        const shouldShowTaskContent = task && isTaskStart;
                        const isTaskContinuation = task && !isTaskStart;

                        // Для продолжающихся слотов не рендерим ничего - основная запись займет эти слоты через gridRowEnd
                        if (isTaskContinuation) {
                          return null;
                        }

                        // Рассчитываем grid positioning для многослотовых записей
                        let gridRow = timeIndex + 1;
                        let gridRowEnd: number | undefined;

                        if (shouldShowTaskContent && task) {
                          // ✅ Используем общую длительность включая дополнительные услуги
                          const childTasks = childTasksMap[task.id] || [];
                          const childrenDuration = childTasks.reduce((sum, child) => sum + (child.serviceDuration || child.duration || 0), 0);

                          // Улучшенная логика определения длительности основной услуги
                          let mainDuration = task.serviceDuration || task.duration;

                          // Если длительность не установлена, пытаемся найти её в данных услуги
                          if (!mainDuration && task.serviceServiceId && serviceServices.length > 0) {
                            const service = serviceServices.find(s => s.id === task.serviceServiceId);
                            if (service) {
                              mainDuration = service.defaultDuration || 60;
                            }
                          }

                          // Финальный fallback только если ничего не найдено
                          if (!mainDuration) {
                            mainDuration = 60;
                          }

                          const totalDuration = mainDuration + childrenDuration;

                          const slotsCount = Math.ceil(totalDuration / 15); // 15 минут на слот
                          if (slotsCount > 1) {
                            gridRowEnd = gridRow + slotsCount;
                          }
                        }

                        // Получаем стили для связанных записей
                        const relatedStyles = task ? getRelatedTaskStyles(task, childTasksMap) : { indicator: '', borderStyle: '', connectLine: '' };

                        return (
                          <Tooltip key={`${time}-${master.id}`}>
                            <TooltipTrigger asChild>
                              <div
                                className={`p-1 border-r border-b transition-all duration-200 relative rounded-lg overflow-hidden ${isOccupied
                                  ? getStatusColors(task?.status).bg + (task ? ' cursor-move' : '')
                                  : (isHovered || (draggedOver?.time === time && draggedOver?.masterId === master.id))
                                    ? 'bg-green-100 border-green-300 shadow-md cursor-pointer'
                                    : 'hover:bg-green-50 hover:border-green-200 cursor-pointer'
                                  } ${task ? (relatedStyles.borderStyle || (getStatusColors(task?.status).border + ' border-l-8')) : ''} ${isTaskStart ? 'border-2 border-black' : ''
                                  } ${task ? relatedStyles.connectLine : ''}
                            ${draggedOver?.time === time && draggedOver?.masterId === master.id ? 'ring-2 ring-blue-400 bg-blue-50' : ''}
                            ${draggedTask?.id === task?.id ? 'opacity-50 scale-95' : ''}`}
                                style={{
                                  gridColumn: masterIndex + 2,
                                  gridRow: gridRowEnd ? `${gridRow} / ${gridRowEnd}` : gridRow
                                }}
                                draggable={!!task}
                                onDragStart={task ? (e) => handleDragStart(e, task) : undefined}
                                onDragEnd={task ? handleDragEnd : undefined}
                                onDragOver={(e) => handleDragOver(e, time, master.id)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, time, master.id)}
                                onClick={() => handleSlotClick(time, master.id)}
                                onMouseEnter={() => handleSlotHover(time, master.id)}
                                onMouseLeave={handleSlotLeave}
                              >
                                {shouldShowTaskContent ? (
                                  <div className="text-xs h-full w-full flex flex-col overflow-hidden leading-tight max-w-full relative">
                                    {/* Иконка монеты для неоплаченных записей */}
                                    {task.paid !== 'paid' && (
                                      <div className="absolute top-0 right-0 z-10">
                                        <Coins className="h-3 w-3 text-amber-500" />
                                      </div>
                                    )}

                                    <div className="flex items-center justify-between min-h-0 w-full max-w-full">
                                      <div className={`font-medium ${getStatusColors(task?.status).text} flex items-center gap-0.5 truncate flex-1 text-xs max-w-full`}>
                                        {relatedStyles.indicator && (
                                          <span className="text-amber-500 text-xs flex-shrink-0">{relatedStyles.indicator}</span>
                                        )}
                                        <span className="truncate text-xs">{task.client?.customName || task.client?.firstName || 'Клиент'}</span>
                                      </div>
                                    </div>

                                    {/* Номер телефона клиента */}
                                    {task.client?.phoneNumber && (
                                      <div className="text-gray-500 truncate text-xs leading-none">
                                        📞 {task.client.phoneNumber}
                                      </div>
                                    )}

                                    <div className="text-gray-600 truncate text-xs leading-none">
                                      {task.serviceType}
                                    </div>

                                    {/* Показываем если есть дополнительные услуги */}
                                    {childTasksMap[task.id] && childTasksMap[task.id].length > 0 && (
                                      <div className="text-indigo-600 truncate text-xs leading-none">
                                        +{childTasksMap[task.id].length} доп. услуг
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center h-full">
                                    {isHovered ? (
                                      <div className="flex flex-col items-center text-green-600">
                                        <Plus className="h-5 w-5 mb-1" />
                                        <span className="text-xs font-medium">Создать запись</span>
                                      </div>
                                    ) : (
                                      <Plus className="h-4 w-4 text-gray-400" />
                                    )}
                                  </div>
                                )}

                                {/* Индикатор hover для создания записи */}
                                {isHovered && !isOccupied && (
                                  <div className="absolute inset-0 border-2 border-green-400 rounded-md pointer-events-none animate-pulse" />
                                )}
                              </div>
                            </TooltipTrigger>
                            {task && (
                              <TooltipContent side="top" className="max-w-xs">
                                <div className="space-y-2">
                                  <div className="font-semibold">
                                    {task.client?.customName || task.client?.firstName || 'Клиент'}
                                  </div>
                                  <div className="text-sm">
                                    <div><strong>Услуга:</strong> {task.serviceType}</div>
                                    {task.client?.phoneNumber && (
                                      <div><strong>Телефон:</strong> {task.client.phoneNumber}</div>
                                    )}
                                    <div><strong>Время:</strong> {task.scheduleTime} - {task.endTime}</div>
                                    <div><strong>Длительность:</strong> {task.duration || task.serviceDuration || 60} мин</div>
                                    <div><strong>Мастер:</strong> {task.masterName || 'Не назначен'}</div>
                                    <div><strong>Статус:</strong> {getStatusLabel(task?.status)}</div>
                                    <div><strong>Оплата:</strong> <span className={task.paid === 'paid' ? 'text-green-600' : 'text-red-600'}>{task.paid === 'paid' ? 'Оплачено' : 'Не оплачено'}</span></div>
                                    {task.finalPrice && (
                                      <div><strong>Цена:</strong> {task.finalPrice} сом</div>
                                    )}
                                    {/* Показываем дополнительные услуги в tooltip */}
                                    {childTasksMap[task.id] && childTasksMap[task.id].length > 0 && (
                                      <div>
                                        <strong>Дополнительные услуги:</strong>
                                        <ul className="ml-2 mt-1">
                                          {childTasksMap[task.id].map((childTask, index) => (
                                            <li key={index} className="text-xs">
                                              • {childTask.serviceType} ({childTask.serviceDuration || 0}мин - {childTask.finalPrice || 0}сом)
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                    {task.notes && (
                                      <div><strong>Заметки:</strong> {task.notes}</div>
                                    )}
                                  </div>
                                </div>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        );
                      })
                    ]).flat()}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Диалог создания записи */}
        <CreateAppointmentDialog
          isOpen={showCreateDialog}
          onClose={() => {
            setShowCreateDialog(false);
            setSelectedTimeSlot(null);
          }}
          selectedDate={selectedDate}
          selectedTime={selectedTimeSlot?.time}
          masterId={selectedTimeSlot?.masterId}
          onTaskCreated={handleTaskCreated}
        />

        {/* Диалог редактирования записи */}
        <EditAppointmentDialog
          task={selectedTask}
          isOpen={showEditDialog}
          onClose={() => {
            setShowEditDialog(false);
            setSelectedTask(null);
          }}
          onTaskUpdated={handleTaskUpdated}
        />
      </div>
    </TooltipProvider>
  );
}