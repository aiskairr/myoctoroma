import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useBranch } from "@/contexts/BranchContext";
import { getBranchIdWithFallback } from "@/utils/branch-utils";
import { Loader2, CreditCard, CheckCircle, X, Scissors, Clock } from "lucide-react";

// Интерфейсы
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
  serviceServiceId?: number;
  serviceDuration?: number;
  duration?: number;
  servicePrice?: number;
  finalPrice?: number;
  scheduleDate?: string;
  scheduleTime?: string;
  endTime?: string;
  masterName?: string;
  masterId?: number;
  branchId?: string;
  notes?: string;
  mother?: number;
  paid?: string;
  createdAt: string; // Формат: YYYY-MM-DD HH:mm:ss
}

interface Master {
  id: number;
  name: string;
  specialization?: string;
  isActive: boolean;
  startWorkHour?: string;
  endWorkHour?: string;
  branchId: string;
  photoUrl?: string;
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

interface DurationOption {
  duration: number;
  price: number;
}

interface serviceDurationsResponse {
  serviceType: string;
  availableDurations: DurationOption[];
  defaultDuration: number;
}

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
  scheduleDate: string; // Формат: YYYY-MM-DD
  scheduleTime: string;
  status?: string;
}

interface PaymentMethod {
  value: string;
  label: string;
  icon: string;
  description: string;
}

interface EditAppointmentDialogProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdated: () => void;
}

export const EditAppointmentDialog = ({
  task,
  isOpen,
  onClose,
  onTaskUpdated
}: EditAppointmentDialogProps) => {
  const { toast } = useToast();
  const { currentBranch, branches } = useBranch();
  const queryClient = useQueryClient();

  // Загружаем все мастеров для выбора
  const { data: allMasters = [] } = useQuery<Master[]>({
    queryKey: [`${import.meta.env.VITE_BACKEND_URL}/api/masters`],
    enabled: isOpen,
  });

  // Список услуг
  const { data: serviceServices = [] } = useQuery<serviceService[]>({
    queryKey: [`${import.meta.env.VITE_BACKEND_URL}/api/public/service-services`],
    enabled: isOpen,
  });

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

  // Инициализация формы с пустыми данными (заполняется в useEffect)
  const [formData, setFormData] = useState<ClientFormData>({
    clientName: "",
    phoneNumber: "",
    branchId: getBranchIdWithFallback(currentBranch, branches),
    serviceType: "",
    masterName: "",
    masterId: 0,
    notes: "",
    discount: 0,
    finalPrice: 0,
    scheduleDate: "",
    scheduleTime: "",
    status: 'new'
  });

  // Доступные длительности для выбранного типа услуги
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);

  // Состояние для дополнительных услуг
  const [childTasks, setChildTasks] = useState<Task[]>([]);

  // Локальное состояние для редактирования длительностей
  const [localMainDuration, setLocalMainDuration] = useState<number>(0);
  const [localChildDurations, setLocalChildDurations] = useState<{ [key: number]: number }>({});

  // Состояние для диалога оплаты
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("");
  const [selectedAdministrator, setSelectedAdministrator] = useState<string>("");

  // Доступные способы оплаты
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
      value: "Подарочный Сертификат",
      label: "Подарочный Сертификат",
      icon: "🎁",
      description: "Оплата подарочным сертификатом"
    }
  ];

  const { data: serviceDurations } = useQuery<serviceDurationsResponse>({
    queryKey: [`${import.meta.env.VITE_BACKEND_URL}/api/service-services/durations`, formData.serviceType],
    enabled: !!formData.serviceType && isOpen,
    queryFn: async () => {
      if (!formData.serviceType) return null;

      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/service-services/durations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceType: formData.serviceType }),
      });
      if (!res.ok) return null;

      return res.json();
    }
  });

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
    console.log('🔍 useEffect for childTasksData triggered');
    console.log('🔍 childTasksData:', childTasksData);
    
    if (childTasksData) {
      console.log('🔍 Setting childTasks to:', childTasksData);
      setChildTasks(childTasksData);
      const initialChildDurations: { [key: number]: number } = {};
      childTasksData.forEach(child => {
        initialChildDurations[child.id] = child.serviceDuration || child.duration || 0;
        console.log('🔍 Child duration mapping:', {
          id: child.id,
          serviceDuration: child.serviceDuration,
          duration: child.duration,
          mapped: initialChildDurations[child.id]
        });
      });
      setLocalChildDurations(initialChildDurations);
    } else {
      console.log('🔍 childTasksData is null/undefined, clearing childTasks');
      setChildTasks([]);
    }
  }, [childTasksData]);

  // Инициализируем локальную длительность основной задачи
  useEffect(() => {
    if (task) {
      setLocalMainDuration(task.serviceDuration || task.duration || serviceDurations?.defaultDuration || 0);
    }
  }, [task, serviceDurations]);

  // Обновляем данные при изменении задачи
  useEffect(() => {
    console.log('EditDialog useEffect triggered:', { task, isOpen });
    if (task && isOpen) {
      const newFormData = {
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
        status: task.status || 'new'
      };
      
      console.log('Setting form data:', newFormData);
      setFormData(newFormData);
      
      // Инициализируем выбранную длительность из данных задачи
      const duration = task.serviceDuration || task.duration || null;
      setSelectedDuration(duration);
    }
  }, [task, isOpen, currentBranch, branches]);

  // Устанавливаем длительность по умолчанию
  useEffect(() => {
    if (serviceDurations && serviceDurations.availableDurations) {
      if (!selectedDuration || !serviceDurations.availableDurations.some((d: DurationOption) => d.duration === selectedDuration)) {
        setSelectedDuration(task?.serviceDuration || task?.duration || serviceDurations.defaultDuration);
      }
    }
  }, [serviceDurations, selectedDuration, task]);

  // Проверяем является ли длительность стандартной
  const isStandardDuration = (duration: number): boolean => {
    return serviceDurations?.availableDurations?.some((option: any) => option.duration === duration) || false;
  };

  // Проверка есть ли несохраненные изменения длительности
  const hasUnsavedDurationChanges = (): boolean => {
    const mainDurationChanged = localMainDuration !== (task?.serviceDuration || task?.duration || 0);
    const childDurationChanged = childTasks.some(childTask => {
      const currentDuration = childTask.serviceDuration || childTask.duration || 0;
      const localDuration = localChildDurations[childTask.id] || 0;
      return currentDuration !== localDuration;
    });
    return mainDurationChanged || childDurationChanged;
  };

  // Функция для расчета времени окончания
  const calculateEndTime = (startTime: string, duration: number): string => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + duration;
    const newHours = Math.floor(totalMinutes / 60);
    const newMinutes = totalMinutes % 60;
    return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
  };

  // Функции для редактирования длительности
  const updateMainServiceDuration = async (newDuration: number) => {
    if (!task?.id) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceDuration: newDuration,
          endTime: calculateEndTime(task.scheduleTime || '', newDuration)
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
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

  // Функция расчета цены основной услуги
  const calculateMainServicePrice = (): number => {
    console.log('🔍 calculateMainServicePrice called');
    console.log('🔍 task:', task);
    console.log('🔍 task.finalPrice:', task?.finalPrice);
    console.log('🔍 task.servicePrice:', task?.servicePrice);
    
    const result = parseFloat(String(task?.finalPrice || 0)) || 0;
    console.log('🔍 Main service price:', result, 'isNaN:', isNaN(result));
    return isNaN(result) ? 0 : result;
  };

  // Расчет цены дополнительных услуг (только дочерние задачи)
  const calculateAdditionalServicesPrice = (): number => {
    console.log('🔍 calculateAdditionalServicesPrice called');
    console.log('🔍 childTasks:', childTasks);
    console.log('🔍 childTasks.length:', childTasks?.length);
    
    if (!childTasks || childTasks.length === 0) {
      console.log('🔍 No child tasks, returning 0');
      return 0;
    }
    
    const result = childTasks.reduce((sum, child) => {
      const price = parseFloat(String(child.finalPrice || 0)) || 0;
      console.log('🔍 Child task:', {
        id: child.id,
        serviceType: child.serviceType,
        finalPrice: child.finalPrice,
        servicePrice: child.servicePrice,
        calculatedPrice: price,
        isNaN: isNaN(price)
      });
      return sum + price;
    }, 0);
    
    console.log('🔍 Total additional services price:', result, 'isNaN:', isNaN(result));
    return isNaN(result) ? 0 : result;
  };

  // Расчет общего времени (основная + дочерние)
  const calculateTotalDuration = (): number => {
    console.log('🔍 calculateTotalDuration called');
    console.log('🔍 task:', task);
    console.log('🔍 task.serviceDuration:', task?.serviceDuration);
    console.log('🔍 childTasks:', childTasks);
    
    const mainDuration = parseFloat(String(task?.serviceDuration || 0)) || 0;
    const childrenDuration = childTasks.reduce((sum, child) => {
      const duration = parseFloat(String(child.serviceDuration || 0)) || 0;
      console.log('🔍 Child duration:', {
        id: child.id,
        serviceDuration: child.serviceDuration,
        duration: child.duration,
        calculatedDuration: duration,
        isNaN: isNaN(duration)
      });
      return sum + duration;
    }, 0);
    
    const total = mainDuration + childrenDuration;
    console.log('🔍 Total duration:', total, '(main:', mainDuration, '+ children:', childrenDuration, ') isNaN:', isNaN(total));
    return isNaN(total) ? 0 : total;
  };

  // Расчет общей цены (сумма всех finalPrice)
  const calculateTotalPrice = (): number => {
    console.log('🔍 calculateTotalPrice called');
    const mainPrice = parseFloat(String(task?.finalPrice || 0)) || 0;
    const childrenPrice = childTasks.reduce((sum, child) => {
      const price = parseFloat(String(child.finalPrice || 0)) || 0;
      return sum + price;
    }, 0);
    const total = mainPrice + childrenPrice;
    console.log('🔍 Total price:', total, '(main:', mainPrice, '+ children:', childrenPrice, ') isNaN:', isNaN(total));
    return isNaN(total) ? 0 : total;
  };

  // Автоматический расчет итоговой цены
  useEffect(() => {
    if (serviceDurations && task) {
      const totalPriceAllServices = calculateTotalPrice();
      const discountAmount = (totalPriceAllServices * formData.discount) / 100;
      const finalPriceAllServices = Math.round(totalPriceAllServices - discountAmount);

      setFormData(prev => ({ ...prev, finalPrice: finalPriceAllServices }));
    }
  }, [serviceDurations, task?.serviceDuration, formData.discount, childTasks]);

  // Мутация для создания записи об оплате
  const createPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPaymentMethod || !task?.id) {
        throw new Error('Не выбран способ оплаты или задача');
      }

      if (!selectedAdministrator) {
        throw new Error('Не выбран администратор');
      }

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
      // Формируем полный payload на основе текущих данных задачи
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

      // Улучшенная логика получения имени клиента
      const clientName = task.client?.customName || 
                        task.client?.firstName || 
                        task.clientName || 
                        'Неизвестный клиент';

      const updatePayload: any = {
        clientName: clientName,
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
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });

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
      onClose();
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

  // Мутация для обновления записи
  const updateTaskMutation = useMutation({
    mutationFn: async () => {
      if (!task || !formData.clientName) {
        throw new Error("Данные задачи или имя клиента отсутствуют");
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

      const servicePrice = formData.finalPrice || 0;
      const discount = formData.discount || 0;
      const duration = selectedDuration || 60;

      const payload: any = {
        clientName: formData.clientName,
        phoneNumber: formData.phoneNumber,
        serviceType: formData.serviceType,
        masterName: formData.masterName,
        masterId: formData.masterId,
        notes: formData.notes,
        scheduleTime: formData.scheduleTime,
        duration: duration,
        finalPrice: calculateFinalPrice(servicePrice, discount), // Обязательное поле
        discount: discount,
        endTime: calculateEndTime(formData.scheduleTime, duration), // Обязательное поле
        branchId: formData.branchId,
        status: formData.status
      };

      // scheduleDate только если есть валидная дата
      if (formData.scheduleDate && formData.scheduleDate !== null && formData.scheduleDate.trim()) {
        payload.scheduleDate = formData.scheduleDate;
      }

      console.log('Sending PATCH request to:', `${import.meta.env.VITE_BACKEND_URL}/api/tasks/${task.id}`);
      console.log('Payload:', payload);

      // Обновляем основную задачу
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/tasks/${task.id}`, {
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
        throw new Error(errorData.message || 'Ошибка обновления записи');
      }

      // Сохранение локальных изменений длительности при нажатии кнопки "Сохранить"
      if (localMainDuration !== (task?.serviceDuration || task?.duration || 0)) {
        await updateMainServiceDuration(localMainDuration);
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
      console.error('Update task error:', error);
      toast({
        title: "Ошибка",
        description: `${error}`,
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted!', { task, formData, selectedDuration });
    updateTaskMutation.mutate();
  };

  if (!task) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto p-0" aria-describedby="edit-appointment-description">
          <DialogHeader className="sr-only">
            <DialogTitle>Редактирование записи</DialogTitle>
            <DialogDescription id="edit-appointment-description">
              Редактирование деталей записи клиента
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
                      {serviceDurations?.availableDurations?.map((duration: DurationOption) => (
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
                      {serviceServices?.map((service) => (
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
                    value={formData.masterId?.toString() || ""}
                    onValueChange={(value) => {
                      const master = allMasters.find(m => m.id === Number(value));
                      if (master) {
                        setFormData(prev => ({
                          ...prev,
                          masterName: master.name,
                          masterId: master.id
                        }));
                      }
                    }}
                  >
                    <SelectTrigger className="w-full text-sm">
                      <SelectValue placeholder="Выберите мастера" />
                    </SelectTrigger>
                    <SelectContent>
                      {allMasters?.map((master) => (
                        <SelectItem key={master.id} value={master.id.toString()}>
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
                      {branches?.map((branch: any) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.branches}
                        </SelectItem>
                      ))}
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

                {/* Длительность услуги */}
                <div>
                  <Label className="block font-semibold text-gray-700 text-sm mb-1">
                    Длительность основной услуги: {localMainDuration} мин
                    {!isStandardDuration(localMainDuration) && (
                      <span className="text-amber-600 ml-2">(произвольная)</span>
                    )}
                  </Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="number"
                      min="10"
                      max="300"
                      step="5"
                      value={localMainDuration}
                      onChange={(e) => setLocalMainDuration(Number(e.target.value))}
                      className="w-24 text-sm"
                    />
                    <span className="text-sm text-gray-500">минут</span>
                    {hasUnsavedDurationChanges() && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => updateMainServiceDuration(localMainDuration)}
                        className="ml-2"
                      >
                        Сохранить
                      </Button>
                    )}
                  </div>
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
                    onChange={(e) => setFormData(prev => ({ ...prev, discount: Number(e.target.value) }))}
                  />
                </div>

                {formData.finalPrice > 0 && (
                  <div>
                    <Label className="block font-semibold text-gray-700 text-sm mb-1">Итоговая цена</Label>
                    <div className="text-lg font-bold text-green-600">{formData.finalPrice} сом</div>
                  </div>
                )}

                <div className="flex justify-between mt-4">
                  <Button type="button" variant="outline" onClick={onClose}>
                    Отмена
                  </Button>
                  <div className="flex gap-2">
                    {task?.paid !== 'paid' && (
                      <Button
                        type="button"
                        onClick={() => setShowPaymentDialog(true)}
                        className="bg-amber-500 hover:bg-amber-600 text-white"
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Оплатить
                      </Button>
                    )}
                    <Button 
                      type="submit" 
                      disabled={updateTaskMutation.isPending}
                      className="bg-blue-500 hover:bg-blue-600 text-white"
                    >
                      {updateTaskMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Сохранить
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Диалог выбора способа оплаты */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-2xl" aria-describedby="payment-dialog-description">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-amber-600" />
              Оплата услуг
            </DialogTitle>
            <DialogDescription id="payment-dialog-description">
              Выберите способ оплаты и подтвердите операцию
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-6">
            {/* Левая колонка - способы оплаты */}
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-4">Выберите способ оплаты</h3>
              <div className="space-y-2">
                {paymentMethods.map((method) => (
                  <Button
                    key={method.value}
                    variant={selectedPaymentMethod === method.value ? "default" : "outline"}
                    className="w-full justify-start"
                    onClick={() => setSelectedPaymentMethod(method.value)}
                  >
                    <span className="mr-2">{method.icon}</span>
                    {method.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Правая колонка - детали оплаты */}
            <div className="w-64 bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-4">Детали оплаты</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Основная услуга:</span>
                  <span>{calculateMainServicePrice()} сом</span>
                </div>
                {childTasks.length > 0 && (
                  <div className="flex justify-between">
                    <span>Дополнительные услуги:</span>
                    <span>{calculateAdditionalServicesPrice()} сом</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Общее время:</span>
                  <span>{calculateTotalDuration()} мин</span>
                </div>
                {formData.discount > 0 && (
                  <div className="flex justify-between">
                    <span>Скидка ({formData.discount}%):</span>
                    <span>-{Math.round(calculateTotalPrice() * formData.discount / 100)} сом</span>
                  </div>
                )}
                <hr className="my-3" />
                <div className="flex justify-between font-bold">
                  <span>Итого:</span>
                  <span>{calculateTotalPrice() - Math.round(calculateTotalPrice() * formData.discount / 100)} сом</span>
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
