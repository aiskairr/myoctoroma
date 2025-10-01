import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiGetJson, apiPost } from '@/lib/api';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Loader2, Calendar, User, Phone, Clock, X, EditIcon, CalendarIcon, ChevronDown, UserPlus, Filter, MapPin, DollarSign, Timer, Star } from "lucide-react";
import { format, parseISO, addMinutes } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "../lib/queryClient";
import { useBranchFilter } from "@/hooks/use-branch-filter";
import { useBranch } from "@/contexts/BranchContext";
import { useLocation } from "wouter";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Функции для работы с временем

/**
 * Вычисляет время окончания на основе времени начала и длительности услуги
 * @param scheduleDate Дата услуги в формате YYYY-MM-DD
 * @param scheduleTime Время начала услуги в формате HH:MM
 * @param durationMinutes Длительность услуги в минутах
 * @returns Время окончания в формате ISO (YYYY-MM-DDTHH:MM)
 */
const calculateEndTime = (scheduleDate: string, scheduleTime: string, durationMinutes: number): string => {
  if (!scheduleDate || !scheduleTime || !durationMinutes) return '';

  // Объединяем дату и время в одну строку ISO
  const startDateTimeISO = `${scheduleDate}T${scheduleTime}`;

  try {
    // Преобразуем строку ISO в объект Date
    const startDateTime = parseISO(startDateTimeISO);
    // Добавляем к начальному времени длительность услуги
    const endDateTime = addMinutes(startDateTime, durationMinutes);
    // Возвращаем результат в ISO формате (YYYY-MM-DDTHH:MM)
    return endDateTime.toISOString().slice(0, 16);
  } catch (error) {
    console.error("Ошибка расчета времени окончания:", error);
    return '';
  }
};

/**
 * Форматирует время начала и окончания в удобный для отображения формат
 * @param startTime Время начала в формате ISO
 * @param endTime Время окончания в формате ISO
 * @returns Отформатированная строка "HH:MM–HH:MM"
 */
const formatTimeRange = (startTime: string, endTime: string): string => {
  try {
    if (!startTime || !endTime) return '';

    const start = parseISO(startTime);
    const end = parseISO(endTime);

    return `${format(start, 'HH:mm')}–${format(end, 'HH:mm')}`;
  } catch (error) {
    console.error("Ошибка форматирования временного диапазона:", error);
    return '';
  }
};

// Интерфейс для услуги
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
  description?: string;
  defaultDuration: number;
}

// Интерфейс для опции длительности услуги
interface DurationOption {
  duration: number;
  price: number;
}

// Интерфейс для ответа API с доступными длительностями
interface serviceDurationsResponse {
  serviceType: string;
  availableDurations: DurationOption[];
  defaultDuration: number;
}

// Интерфейс для расчета услуги
interface serviceServiceCalculation {
  name: string;
  duration: number;
  price: number;
  description?: string;
}

// Интерфейс для мастера
interface Master {
  id: number;
  name: string;
  specialty?: string;
  description?: string;
  isActive: boolean;
  startWorkHour?: string;
  endWorkHour?: string;
  createdAt?: string;
}

// Интерфейс для задачи
interface Task {
  id: number;
  client: {
    id: number;
    telegramId: string;
    firstName?: string;
    lastName?: string;
    username?: string;
    customName?: string;
    phoneNumber?: string;
    source?: string;  // Источник клиента (instagram, telegram и т.д.)
  };
  status: string;
  source?: string;           // Источник задачи (manual, instagram, telegram и т.д.)
  serviceType?: string;
  serviceServiceId?: number; // ID услуги массажа
  serviceDuration?: number;  // Длительность услуги в минутах
  servicePrice?: number;     // Цена услуги
  discount?: number;         // Скидка в процентах
  finalPrice?: number;       // Итоговая цена после скидки
  scheduleDate?: string;
  scheduleTime?: string;     // Время начала услуги
  endTime?: string;          // Время окончания услуги (вычисляется на основе scheduleTime и serviceDuration)
  masterName?: string;
  branchId?: string;         // Идентификатор филиала (wa1, wa2)
  notes?: string;
  manual?: boolean;          // Флаг для ручного создания клиента
  mother?: number;           // ID материнской записи для дополнительных услуг
  createdAt: string;
  updatedAt: string;
}

// Интерфейс для дополнительной услуги
interface AdditionalService {
  serviceId: number;
  serviceName: string;
  duration: number;
  price: number;
}

// Компонент статуса задачи
const StatusBadge = ({ status }: { status: string }) => {
  const getStatusDetails = (status: string) => {
    switch (status) {
      case "new":
        return { label: "Неразобранные", variant: "secondary" as const, className: "bg-blue-50 text-blue-700 border-blue-200" };
      case "scheduled":
        return { label: "Записан", variant: "default" as const, className: "bg-green-50 text-green-700 border-green-200" };
      case "in_progress":
        return { label: "В процессе", variant: "secondary" as const, className: "bg-orange-50 text-orange-700 border-orange-200" };
      case "completed":
        return { label: "Обслуженные", variant: "secondary" as const, className: "bg-purple-50 text-purple-700 border-purple-200" };
      case "cancelled":
        return { label: "Отмененные", variant: "destructive" as const, className: "bg-red-50 text-red-700 border-red-200" };
      case "regular":
        return { label: "Постоянные", variant: "secondary" as const, className: "bg-yellow-50 text-yellow-700 border-yellow-200" };
      default:
        return { label: "Неизвестный", variant: "outline" as const, className: "bg-gray-50 text-gray-700 border-gray-200" };
    }
  };

  const details = getStatusDetails(status);

  return (
    <Badge variant={details.variant} className={`${details.className} font-medium`}>
      {details.label}
    </Badge>
  );
};

// Компонент диалогового окна с деталями задачи
const TaskDetailDialog = ({ task, onTaskUpdated }: { task: Task, onTaskUpdated: () => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [taskData, setTaskData] = useState({
    serviceType: task.serviceType || "",
    scheduleDate: task.scheduleDate || "",
    scheduleTime: task.scheduleTime || "",
    masterName: task.masterName || "",
    notes: task.notes || "",
    discount: task.discount || 0,
    finalPrice: task.finalPrice || 0,
    serviceDuration: task.serviceDuration || 0,
  });

  // Состояние для дополнительных услуг
  const [additionalServices, setAdditionalServices] = useState<AdditionalService[]>([]);
  const [childTasks, setChildTasks] = useState<Task[]>([]);

  const { toast } = useToast();

  // Получаем список доступных услуг
  const { data: serviceServices, isLoading: isLoadingServices } = useQuery<serviceService[]>({
    queryKey: ['/api/public/service-services'],
    enabled: isOpen, // Запрашиваем только когда диалог открыт
  });

  // Получаем дочерние задачи (дополнительные услуги)
  const { data: childTasksData } = useQuery<Task[]>({
    queryKey: ['/api/tasks/children', task.id],
    enabled: isOpen,
    queryFn: async () => {
      const res = await fetch(`/api/tasks/${task.id}/children`);
      if (!res.ok) return [];
      return res.json();
    }
  });

  useEffect(() => {
    if (childTasksData) {
      setChildTasks(childTasksData);
    }
  }, [childTasksData]);

  // Получаем доступные длительности для выбранной услуги
  const [selectedDuration, setSelectedDuration] = useState<number | null>(task.serviceDuration || null);
  const [customDuration, setCustomDuration] = useState<string>("");
  const [isCustomDuration, setIsCustomDuration] = useState(false);

  const { data: serviceDurations, isLoading: isLoadingDurations } = useQuery<serviceDurationsResponse>({
    queryKey: ['/api/service-services/durations', taskData.serviceType],
    enabled: !!taskData.serviceType && isOpen,
    queryFn: async () => {
      if (!taskData.serviceType) return null;

      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/service-services/durations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ serviceType: taskData.serviceType }),
      });
      if (!res.ok) return null;

      return res.json();
    }
  });

  // Устанавливаем длительность по умолчанию, когда данные загружены
  useEffect(() => {
    if (serviceDurations && serviceDurations.availableDurations &&
      (!selectedDuration ||
        !serviceDurations.availableDurations.some((d: DurationOption) => d.duration === selectedDuration))) {
      setSelectedDuration(serviceDurations.defaultDuration);
    }
  }, [serviceDurations, selectedDuration]);

  // Получаем информацию о выбранной услуге для отображения цены
  const selectedDurationOption = serviceDurations?.availableDurations?.find((d: DurationOption) => d.duration === selectedDuration);
  const serviceDetails = selectedDurationOption && serviceDurations ? {
    name: serviceDurations.serviceType,
    duration: selectedDurationOption.duration,
    price: selectedDurationOption.price
  } : null;

  const updateTaskMutation = useMutation({
    mutationFn: async (updatedTask: Partial<Task>) => {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTask)
      });

      if (!res.ok) {
        throw new Error('Failed to update task');
      }

      return res.json();
    },
    onSuccess: () => {
      setIsOpen(false);
      toast({
        title: "Задача обновлена",
        description: "Данные задачи успешно обновлены",
        variant: "default",
      });
      onTaskUpdated();
    },
    onError: (error) => {
      toast({
        title: "Ошибка при обновлении",
        description: `${error}`,
        variant: "destructive",
      });
    }
  });

  // Мутация для создания дополнительной услуги
  const createAdditionalServiceMutation = useMutation({
    mutationFn: async (serviceData: { serviceId: number; serviceName: string; duration: number; price: number }) => {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: task.client.id,
          status: task.status,
          serviceType: serviceData.serviceName,
          serviceServiceId: serviceData.serviceId,
          scheduleDate: task.scheduleDate,
          scheduleTime: task.scheduleTime,
          masterName: task.masterName,
          notes: task.notes,
          branchId: task.branchId,
          source: task.source,
          serviceDuration: serviceData.duration,
          servicePrice: serviceData.price,
          finalPrice: serviceData.price,
          mother: task.id // Устанавливаем связь с материнской задачей
        })
      });

      if (!res.ok) {
        throw new Error('Failed to create additional service');
      }

      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Дополнительная услуга добавлена",
        description: "Услуга успешно добавлена к задаче",
        variant: "default",
      });
      // Обновляем список дочерних задач
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/children', task.id] });
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTaskData(prev => ({ ...prev, [name]: value }));
  };

  // Обработчик для изменения значения в селекте
  const handleSelectChange = (name: string, value: string) => {
    setTaskData(prev => ({ ...prev, [name]: value }));
  };

  // Функция для добавления дополнительной услуги
  const handleAddAdditionalService = (serviceId: number, serviceName: string, duration: number, price: number) => {
    createAdditionalServiceMutation.mutate({
      serviceId,
      serviceName,
      duration,
      price
    });
  };

  // Функция для удаления дополнительной услуги
  const deleteAdditionalServiceMutation = useMutation({
    mutationFn: async (childTaskId: number) => {
      const res = await fetch(`/api/tasks/${childTaskId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete additional service');
      }

      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Дополнительная услуга удалена",
        description: "Услуга успешно удалена",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/children', task.id] });
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

  // Расчет общей цены и времени с учетом дополнительных услуг
  const calculateTotalPrice = (): number => {
    const mainPrice = task.servicePrice || 0;
    const childrenPrice = childTasks.reduce((sum, child) => sum + (child.servicePrice || 0), 0);
    return mainPrice + childrenPrice;
  };

  const calculateTotalDuration = (): number => {
    const mainDuration = task.serviceDuration || 0;
    const childrenDuration = childTasks.reduce((sum, child) => sum + (child.serviceDuration || 0), 0);
    return mainDuration + childrenDuration;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Если дата и время указаны, то автоматически меняем статус на "scheduled"
    let statusUpdate = {};
    if (taskData.scheduleDate && taskData.scheduleTime && task.status === "new") {
      statusUpdate = { status: "scheduled" };
    }

    // Включаем выбранную длительность услуги, если она есть
    let serviceDurationUpdate = {};
    const finalDuration = isCustomDuration ? parseInt(customDuration) : selectedDuration;

    if (finalDuration) {
      serviceDurationUpdate = {
        serviceDuration: finalDuration,
        servicePrice: isCustomDuration ? 0 : (selectedDurationOption?.price || 0) // Не заполняем цену для произвольной длительности
      };
    }

    // Вычисляем и добавляем время окончания (endTime), если указаны дата, время и длительность
    let endTimeUpdate = {};
    if (taskData.scheduleDate && taskData.scheduleTime && finalDuration) {
      const endTime = calculateEndTime(
        taskData.scheduleDate,
        taskData.scheduleTime,
        finalDuration
      );

      if (endTime) {
        endTimeUpdate = { endTime };
        console.log(`Вычисленное время окончания: ${endTime}`);
      }
    }

    updateTaskMutation.mutate({
      ...taskData,
      ...statusUpdate,
      ...serviceDurationUpdate,
      ...endTimeUpdate,
      serviceDuration: taskData.serviceDuration,
      discount: taskData.discount,
      finalPrice: taskData.finalPrice || undefined
    });
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2"
      >
        <EditIcon className="h-4 w-4" />
        Изменить
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <EditIcon className="h-5 w-5" />
                Редактировать задачу
              </DialogTitle>
              <DialogDescription className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Клиент: {task.client?.customName || task.client?.firstName || 'Неизвестный клиент'}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-6 py-4">
              <div className="space-y-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="serviceType" className="text-right font-medium">Вид услуги</Label>
                  <div className="col-span-3">
                    <Select
                      name="serviceType"
                      value={taskData.serviceType}
                      onValueChange={(value) => handleSelectChange("serviceType", value)}
                      disabled={isLoadingServices}
                    >
                      <SelectTrigger>
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
                </div>

                {/* Добавляем выбор длительности, если услуга выбрана */}
                {taskData.serviceType && serviceDurations && serviceDurations.availableDurations && serviceDurations.availableDurations.length > 0 && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="duration" className="text-right font-medium">Длительность</Label>
                    <div className="col-span-3">
                      <Select
                        name="duration"
                        value={isCustomDuration ? "custom" : selectedDuration?.toString() || ''}
                        onValueChange={(value) => {
                          if (value === "custom") {
                            setIsCustomDuration(true);
                            setSelectedDuration(null);
                          } else {
                            setIsCustomDuration(false);
                            setSelectedDuration(parseInt(value));
                            setCustomDuration("");
                          }
                        }}
                        disabled={isLoadingDurations}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите длительность" />
                        </SelectTrigger>
                        <SelectContent>
                          {serviceDurations.availableDurations.map((option: DurationOption) => (
                            <SelectItem key={option.duration} value={option.duration.toString()}>
                              <div className="flex items-center gap-2">
                                <Timer className="h-4 w-4" />
                                {option.duration} мин
                                <Badge variant="secondary" className="ml-2">
                                  {option.price} сом
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                          <SelectItem value="custom">
                            Другая длительность
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Поле для ввода произвольной длительности */}
                {isCustomDuration && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="customDuration" className="text-right font-medium">Длительность (мин)</Label>
                    <Input
                      id="customDuration"
                      type="number"
                      value={customDuration}
                      onChange={(e) => setCustomDuration(e.target.value)}
                      className="col-span-3"
                      placeholder="Введите длительность в минутах"
                    />
                  </div>
                )}

                {/* Отображаем детали выбранной услуги */}
                {serviceDetails && serviceDetails.name && serviceDetails.duration && serviceDetails.price && (
                  <Alert>
                    <Star className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Выбрано:</strong> {serviceDetails.name}, {serviceDetails.duration} мин, {serviceDetails.price} сом
                    </AlertDescription>
                  </Alert>
                )}

                <Separator />

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="scheduleDate" className="text-right font-medium">Дата</Label>
                  <Input
                    id="scheduleDate"
                    name="scheduleDate"
                    type="date"
                    value={taskData.scheduleDate ? taskData.scheduleDate.split('T')[0] : ''}
                    onChange={handleInputChange}
                    className="col-span-3"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="scheduleTime" className="text-right font-medium">Время</Label>
                  <Input
                    id="scheduleTime"
                    name="scheduleTime"
                    value={taskData.scheduleTime}
                    onChange={handleInputChange}
                    className="col-span-3"
                    placeholder="HH:MM"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="masterName" className="text-right font-medium">Мастер</Label>
                  <Input
                    id="masterName"
                    name="masterName"
                    value={taskData.masterName}
                    onChange={handleInputChange}
                    className="col-span-3"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="serviceDuration" className="text-right font-medium">Длительность (мин)</Label>
                  <Input
                    id="serviceDuration"
                    name="serviceDuration"
                    type="number"
                    min="1"
                    value={taskData.serviceDuration}
                    onChange={(e) => {
                      const duration = parseInt(e.target.value) || 0;
                      setTaskData(prev => ({
                        ...prev,
                        serviceDuration: duration
                      }));
                    }}
                    className="col-span-3"
                    placeholder="Введите длительность в минутах"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="notes" className="text-right font-medium">Заметки</Label>
                  <Input
                    id="notes"
                    name="notes"
                    value={taskData.notes}
                    onChange={handleInputChange}
                    className="col-span-3"
                  />
                </div>

                <Separator />

                {/* Поля для скидки и итоговой цены */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="discount" className="text-right font-medium">Скидка (%)</Label>
                  <Input
                    id="discount"
                    name="discount"
                    type="number"
                    min="0"
                    max="100"
                    value={taskData.discount}
                    onChange={(e) => {
                      const discount = parseInt(e.target.value) || 0;
                      setTaskData(prev => {
                        const basePrice = task.servicePrice || serviceDetails?.price || 0;
                        const finalPrice = basePrice - (basePrice * discount / 100);
                        return {
                          ...prev,
                          discount,
                          finalPrice: Math.round(finalPrice)
                        };
                      });
                    }}
                    className="col-span-3"
                    placeholder="0"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="finalPrice" className="text-right font-medium">Итоговая цена</Label>
                  <Input
                    id="finalPrice"
                    name="finalPrice"
                    type="number"
                    min="0"
                    value={taskData.finalPrice}
                    onChange={(e) => {
                      const finalPrice = parseInt(e.target.value) || 0;
                      setTaskData(prev => ({
                        ...prev,
                        finalPrice,
                        discount: 0 // Сбрасываем скидку при ручном вводе цены
                      }));
                    }}
                    className="col-span-3"
                    placeholder="Введите итоговую цену"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="submit"
                disabled={updateTaskMutation.isPending}
                className="flex items-center gap-2"
              >
                {updateTaskMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <EditIcon className="h-4 w-4" />
                )}
                Сохранить изменения
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Компонент карточки задачи
const TaskCard = ({ task, onTaskUpdated }: { task: Task, onTaskUpdated: () => void }) => {
  const { toast } = useToast();
  const { currentBranch } = useBranch();
  const [, setLocation] = useLocation();

  // Функция для определения цвета карточки в зависимости от источника и филиала
  const getCardBackgroundColor = () => {
    // Получаем данные о клиенте и задаче
    const telegramId = task.client?.telegramId;
    const source = task.client?.source;
    const branchId = task.branchId;

    // Приоритет 1: Если задача привязана к филиалу (через branchId)
    if (branchId) {
      // Выбираем цвет в зависимости от филиала
      switch (branchId) {
        case 'wa1': // Токтогула 93
          return 'border-l-4 border-l-yellow-400 bg-yellow-50/30';
        default:
          return '';
      }
    }

    // Приоритет 2: Определение филиала на основе telegramId
    if (telegramId) {
      // Если телефон из WhatsApp определяем по префиксу
      if (telegramId.startsWith('wa1_')) {
        return 'border-l-4 border-l-yellow-400 bg-yellow-50/30';
      } else if (telegramId.startsWith('wa2_')) {
        return 'border-l-4 border-l-green-400 bg-green-50/30';
      } else if (telegramId.startsWith('ig_')) {
        return 'border-l-4 border-l-purple-400 bg-purple-50/30';
      } else if (!telegramId.startsWith('wa') && source !== 'instagram') {
        return 'border-l-4 border-l-blue-400 bg-blue-50/30';
      }
    }

    // Приоритет 3: Определение по источнику сообщения
    if (source === 'instagram') {
      return 'border-l-4 border-l-purple-400 bg-purple-50/30';
    } else if (source === 'telegram') {
      return 'border-l-4 border-l-blue-400 bg-blue-50/30';
    }

    // По умолчанию без дополнительного оформления
    return '';
  };

  // Мутация для анализа переписки с помощью CRM
  const analyzeCRMMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/tasks/${task.id}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to analyze task');
      }

      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Анализ выполнен',
        description: 'CRM-анализ переписки успешно выполнен',
        variant: 'default',
      });
      onTaskUpdated();
    },
    onError: (error) => {
      toast({
        title: 'Ошибка анализа',
        description: `${error}`,
        variant: 'destructive',
      });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const res = await fetch(`/api/tasks/${task.id}/update-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      if (!res.ok) {
        throw new Error('Failed to update status');
      }

      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Статус обновлен',
        description: 'Статус задачи успешно изменен',
        variant: 'default',
      });
      onTaskUpdated();
    },
    onError: (error) => {
      toast({
        title: 'Ошибка при обновлении статуса',
        description: `${error}`,
        variant: 'destructive',
      });
    }
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        throw new Error('Failed to delete task');
      }

      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Задача удалена',
        description: 'Задача успешно удалена',
        variant: 'default',
      });
      onTaskUpdated();
    },
    onError: (error) => {
      toast({
        title: 'Ошибка при удалении',
        description: `${error}`,
        variant: 'destructive',
      });
    }
  });

  // Функция для обновления статуса
  const updateStatus = (status: string) => {
    updateStatusMutation.mutate(status);
  };

  // Функция для удаления задачи
  const deleteTask = () => {
    if (window.confirm('Вы уверены, что хотите удалить эту задачу?')) {
      deleteTaskMutation.mutate();
    }
  };

  // Определяем филиал задачи
  const determineTaskBranch = () => {
    // Проверяем, есть ли явно указанный branchId в задаче
    if (task.branchId) {
      console.log(`Определен филиал из task.branchId: ${task.branchId}`);
      return task.branchId;
    }

    // Проверяем source клиента (для автоматического определения филиала)
    const clientSource = task.client?.source;
    if (clientSource === 'instagram' || clientSource === 'telegram') {
      // Для Instagram и Telegram используем текущий филиал оператора
      const branch = currentBranch?.id?.toString() || 'wa1';
      console.log(`Определен филиал из source ${clientSource}: ${branch}`);
      return branch;
    }

    // Проверяем telegramId клиента для определения филиала из префикса
    const telegramId = task.client?.telegramId || '';
    if (telegramId.startsWith('wa1_')) {
      console.log(`Определен филиал из telegramId (wa1_): wa1`);
      return 'wa1';
    }
    if (telegramId.startsWith('wa2_')) {
      console.log(`Определен филиал из telegramId (wa2_): wa2`);
      return 'wa2';
    }

    // По умолчанию используем текущий филиал оператора
    const defaultBranch = currentBranch?.id?.toString() || 'wa1';
    console.log(`Не удалось определить филиал по задаче, используем текущий: ${defaultBranch}`);
    return defaultBranch;
  };

  // Состояние для формы выбора даты и времени
  const [dateTime, setDateTime] = useState({
    date: task.scheduleDate ? task.scheduleDate.split('T')[0] : '',
    time: task.scheduleTime || '',
    master: task.masterName || '',
    serviceType: task.serviceType || '',
    branch: determineTaskBranch(), // Используем функцию для определения филиала
  });

  // Для отладки - проверяем значения при инициализации
  useEffect(() => {
    console.log("TaskCard initialized with branch:", dateTime.branch, "task status:", task.status);
  }, []);

  // Для выбора длительности услуги
  const [selectedScheduleDuration, setSelectedScheduleDuration] = useState<number | null>(null);

  // Определяем интерфейс для мастера (Master)
  interface Master {
    id: number;
    name: string;
    specialty?: string;
    description?: string;
    isActive: boolean;
    startWorkHour?: string;
    endWorkHour?: string;
    createdAt?: string;
  }

  // Интерфейс для доступного мастера с временными слотами
  interface AvailableMaster {
    id: number;
    name: string;
    specialty?: string;
    timeSlots: { from: string; to: string }[];
    availableSlots: { start: string; end: string }[];
  }

  // Получаем список мастеров для выбора
  const { data: mastersData, isLoading: isLoadingMasters } = useQuery<Master[]>({
    queryKey: ['/api/crm/masters'],
  });

  // Получаем список услуг для диалога выбора времени
  const { data: serviceServicesForSchedule, isLoading: isLoadingScheduleServices } = useQuery<serviceService[]>({
    queryKey: ['/api/public/service-services'],
  });

  // Состояние для управления диалогом
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Состояние для отслеживания загрузки длительностей
  const [isLoadingDurations, setIsLoadingDurations] = useState(false);

  // Обновляем состояние при открытии диалога, чтобы всегда иметь актуальный филиал
  useEffect(() => {
    if (isDialogOpen) {
      console.log("Диалог открыт. Статус задачи:", task.status);
      console.log("Текущий dateTime:", dateTime);

      // Проверяем, нужно ли добавить филиал или его вообще нет
      const branch = dateTime.branch || determineTaskBranch();
      console.log("Выбранный филиал для диалога:", branch);

      // Всегда обновляем филиал при открытии, чтобы исправить возможные проблемы
      setDateTime(prev => ({
        ...prev,
        branch,
        // Для вкладки "Новые" устанавливаем сегодняшнюю дату по умолчанию
        // если дата еще не установлена
        date: prev.date || (task.status === 'new' ? new Date().toISOString().split('T')[0] : '')
      }));
    }
  }, [isDialogOpen]);

  // Получаем доступных мастеров и временные слоты для выбранной даты и филиала
  const { data: availableMasters, isLoading: isLoadingAvailability } = useQuery<AvailableMaster[]>({
    queryKey: ['/api/masters/availability', dateTime.date, dateTime.branch],
    enabled: !!dateTime.date && !!dateTime.branch && isDialogOpen,
    queryFn: async () => {
      if (!dateTime.date || !dateTime.branch) return [];

      console.log(`Fetching masters for branch: ${dateTime.branch}, date: ${dateTime.date}`);
      const res = await fetch(`/api/masters/availability?date=${dateTime.date}&branchId=${dateTime.branch}`);
      if (!res.ok) {
        console.error('Failed to fetch master availability', await res.text());
        return [];
      }

      const data = await res.json();

      // Подробное логирование для отладки
      console.log(`Получено ${data?.length || 0} доступных мастеров`);

      return data as AvailableMaster[];
    }
  });

  // Получаем доступные длительности для выбранной услуги
  const { data: scheduleserviceDurations, isLoading: isLoadingScheduleDurations } = useQuery<serviceDurationsResponse>({
    queryKey: ['/api/service-services/durations', dateTime.serviceType],
    enabled: !!dateTime.serviceType,
    queryFn: async () => {
      if (!dateTime.serviceType) {
        return { serviceType: '', availableDurations: [], defaultDuration: 0 } as serviceDurationsResponse;
      }

      console.log(`Загружаем длительности для услуги: ${dateTime.serviceType}`);

      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/service-services/durations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ serviceType: dateTime.serviceType }),
      });
      if (!res.ok) {
        console.error('Failed to fetch service durations', await res.text());
        return {
          serviceType: dateTime.serviceType,
          availableDurations: [],
          defaultDuration: 0
        } as serviceDurationsResponse;
      }

      const data = await res.json();
      console.log(`Получены данные о длительностях услуги:`, data);

      return data as serviceDurationsResponse;
    }
  });

  // Устанавливаем длительность по умолчанию, когда данные загружены
  useEffect(() => {
    if (scheduleserviceDurations && scheduleserviceDurations.availableDurations &&
      (!selectedScheduleDuration ||
        !scheduleserviceDurations.availableDurations.some((d: DurationOption) => d.duration === selectedScheduleDuration))) {
      setSelectedScheduleDuration(scheduleserviceDurations.defaultDuration);
    }
  }, [scheduleserviceDurations, selectedScheduleDuration]);

  // Получаем информацию о выбранной длительности услуги для отображения цены
  const selectedScheduleDurationOption = scheduleserviceDurations?.availableDurations?.find((d: DurationOption) => d.duration === selectedScheduleDuration);
  const selectedserviceDetails = selectedScheduleDurationOption && scheduleserviceDurations ? {
    name: scheduleserviceDurations.serviceType,
    duration: selectedScheduleDurationOption.duration,
    price: selectedScheduleDurationOption.price
  } : null;

  const dateTimeMutation = useMutation({
    mutationFn: async (data: {
      scheduleDate: string,
      scheduleTime: string,
      masterName: string,
      serviceType?: string,
      serviceDuration?: number,
      servicePrice?: number,
      branchId?: string
    }) => {
      // Вычисляем время окончания услуги на основе даты, времени и длительности
      let endTime;
      if (data.scheduleDate && data.scheduleTime && data.serviceDuration) {
        endTime = calculateEndTime(
          data.scheduleDate,
          data.scheduleTime,
          data.serviceDuration
        );
        console.log(`Вычисленное время окончания (быстрая запись): ${endTime}`);
      }

      // Особая обработка для новых задач (task.status === 'new')
      // Для новых задач сохраняем филиал вместе с датой/временем
      const isNewTask = task.status === 'new';

      console.log(`Creating appointment for task id ${task.id}, status: ${task.status}, branch: ${data.branchId}`);

      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          endTime, // Добавляем вычисленное время окончания
          status: 'scheduled', // Автоматически меняем статус на "записан"
          // Для новых задач добавляем важное примечание о филиале
          notes: isNewTask
            ? `Филиал: ${data.branchId}. ${task.notes || 'Запись из "Новые задачи"'}`
            : task.notes
        })
      });

      if (!res.ok) {
        // Пытаемся извлечь детальное сообщение об ошибке
        const errorData = await res.json().catch(() => null);
        const errorMessage = errorData && errorData.message
          ? errorData.message
          : res.status === 409
            ? 'Это время уже занято другим клиентом. Выберите другое время или мастера.'
            : 'Не удалось создать запись';

        throw new Error(errorMessage);
      }

      return res.json();
    },
    onSuccess: () => {
      // Закрытие диалога будет обрабатываться в handleDateTimeSubmit
      toast({
        title: 'Запись создана',
        description: 'Дата и время успешно установлены',
        variant: 'default',
      });
      onTaskUpdated();
    },
    onError: (error: any) => {
      console.error('Error creating appointment:', error);
      toast({
        title: 'Ошибка при создании записи',
        description: error.message || 'Не удалось создать запись. Проверьте доступность выбранного времени.',
        variant: 'destructive',
      });
    }
  });

  const handleDateTimeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateTime.date || !dateTime.time) {
      toast({
        title: 'Ошибка',
        description: 'Необходимо указать дату и время',
        variant: 'destructive',
      });
      return;
    }

    // Включаем выбранную длительность услуги, если она есть
    let serviceDurationData = {};
    if (selectedScheduleDuration && selectedScheduleDurationOption) {
      serviceDurationData = {
        serviceDuration: selectedScheduleDuration,
        servicePrice: selectedScheduleDurationOption.price
      };
    }

    dateTimeMutation.mutate({
      scheduleDate: dateTime.date,
      scheduleTime: dateTime.time,
      masterName: dateTime.master,
      serviceType: dateTime.serviceType,
      branchId: dateTime.branch,
      ...serviceDurationData
    }, {
      onSuccess: () => {
        // Закрываем диалог после успешной мутации
        setIsDialogOpen(false);
      }
    });
  };

  return (
    <Card className={`transition-all duration-200 hover:shadow-md ${getCardBackgroundColor()}`}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              {task.client?.customName || task.client?.firstName || 'Неизвестный клиент'}
            </CardTitle>
            <CardDescription className="space-y-2">
              {task.client?.phoneNumber && (
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm">{task.client.phoneNumber}</span>
                </div>
              )}
              {task.serviceType && (
                <div className="space-y-1">
                  <Badge variant="outline" className="text-xs">
                    {task.serviceType}
                  </Badge>
                  {task.serviceDuration && task.servicePrice && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Timer className="h-3 w-3" />
                      <span>{task.serviceDuration} мин</span>
                      <DollarSign className="h-3 w-3" />
                      <span>{task.servicePrice} сом</span>
                    </div>
                  )}
                </div>
              )}
            </CardDescription>
          </div>
          <StatusBadge status={task.status} />
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {task.scheduleDate && (
          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{format(new Date(task.scheduleDate), 'dd.MM.yyyy')}</span>
            {task.scheduleTime && (
              <>
                {/* Если есть как время начала, так и время окончания, показываем диапазон */}
                {task.endTime ? (
                  <Badge variant="secondary" className="ml-auto">
                    {formatTimeRange(`${task.scheduleDate}T${task.scheduleTime}`, task.endTime)}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="ml-auto">
                    {task.scheduleTime}
                  </Badge>
                )}
              </>
            )}
          </div>
        )}

        {task.masterName && (
          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{task.masterName}</span>
          </div>
        )}

        {task.branchId && (
          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              {task.branchId === 'wa1' ? 'Токтогула 93' : task.branchId}
            </span>
          </div>
        )}

        {task.notes && (
          <div className="p-3 bg-muted/30 rounded-md border-l-2 border-muted-foreground/20">
            <p className="text-sm text-muted-foreground">
              {task.notes.length > 100
                ? `${task.notes.substring(0, 100)}...`
                : task.notes}
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            onClick={() => {
              // Более детальное логирование
              console.log(`Открываем диалог выбора даты/времени для задачи ID:${task.id}, статус:${task.status}`);
              console.log(`Данные клиента:`, task.client);

              try {
                // Для новых задач (вкладка "Новые") прединициализируем данные
                if (task.status === 'new') {
                  const todayDate = new Date().toISOString().split('T')[0];
                  const branch = determineTaskBranch();

                  console.log(`Предустановка для задачи (${task.status}): дата=${todayDate}, филиал=${branch}`);

                  // Обновляем данные перед открытием диалога
                  setDateTime({
                    date: todayDate,
                    time: '',
                    master: '',
                    serviceType: task.serviceType || '',
                    branch: branch
                  });
                }

                // Открываем диалог
                setIsDialogOpen(true);
              } catch (error) {
                console.error("Ошибка при открытии диалога:", error);
                toast({
                  title: "Ошибка",
                  description: "Не удалось открыть диалог выбора даты и времени",
                  variant: "destructive"
                });
              }
            }}
          >
            <CalendarIcon className="h-4 w-4" />
            Выбрать дату и время
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            console.log("Изменение состояния диалога:", open);
            setIsDialogOpen(open);
          }}>
            <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
              <form onSubmit={handleDateTimeSubmit}>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5" />
                    Выбор даты и времени
                  </DialogTitle>
                  <DialogDescription>
                    Выберите дату, время и мастера для записи клиента
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="serviceType" className="text-right font-medium">Вид услуги</Label>
                    <div className="col-span-3">
                      <Select
                        name="serviceType"
                        value={dateTime.serviceType}
                        onValueChange={(value) => {
                          console.log(`Выбран тип услуги: ${value}`);
                          setDateTime({ ...dateTime, serviceType: value });

                          // При выборе типа услуги длительности загрузятся через отдельный useQuery
                          console.log(`Загружаем длительности для услуги через query hook: ${value}`);
                        }}
                        disabled={isLoadingScheduleServices}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите тип услуги" />
                        </SelectTrigger>
                        <SelectContent>
                          {serviceServicesForSchedule?.map((service) => (
                            <SelectItem key={service.id} value={service.name}>
                              {service.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Добавляем выбор длительности, если услуга выбрана */}
                  {dateTime.serviceType && scheduleserviceDurations && scheduleserviceDurations.availableDurations && scheduleserviceDurations.availableDurations.length > 0 && (
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="scheduleDuration" className="text-right font-medium">Длительность</Label>
                      <div className="col-span-3">
                        <Select
                          name="scheduleDuration"
                          value={selectedScheduleDuration?.toString() || ''}
                          onValueChange={(value) => setSelectedScheduleDuration(parseInt(value))}
                          disabled={isLoadingScheduleDurations}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите длительность" />
                          </SelectTrigger>
                          <SelectContent>
                            {scheduleserviceDurations.availableDurations.map((option: DurationOption) => (
                              <SelectItem key={option.duration} value={option.duration.toString()}>
                                <div className="flex items-center gap-2">
                                  <Timer className="h-4 w-4" />
                                  {option.duration} мин
                                  <Badge variant="secondary" className="ml-2">
                                    {option.price} сом
                                  </Badge>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {/* Отображаем детали выбранной услуги */}
                  {selectedserviceDetails && selectedserviceDetails.name && selectedserviceDetails.duration && selectedserviceDetails.price && (
                    <Alert>
                      <Star className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Выбрано:</strong> {selectedserviceDetails.name}, {selectedserviceDetails.duration} мин, {selectedserviceDetails.price} сом
                      </AlertDescription>
                    </Alert>
                  )}

                  <Separator />

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="date" className="text-right font-medium">Дата</Label>
                    <Input
                      id="date"
                      type="date"
                      className="col-span-3"
                      value={dateTime.date}
                      onChange={(e) => setDateTime({ ...dateTime, date: e.target.value })}
                    />
                  </div>

                  {/* Выбор филиала */}
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="branch" className="text-right font-medium">Филиал</Label>
                    <div className="col-span-3">
                      <Select
                        name="branch"
                        value={dateTime.branch}
                        onValueChange={(value) => setDateTime({ ...dateTime, branch: value, master: '', time: '' })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите филиал" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="wa1">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              Токтогула 93 (wa1)
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Выбор мастера */}
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="master" className="text-right font-medium">Мастер</Label>
                    <div className="col-span-3">
                      {isLoadingAvailability && dateTime.date && dateTime.branch ? (
                        <div className="flex items-center space-x-2 p-3 border rounded-md">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm">Загрузка доступных мастеров...</span>
                        </div>
                      ) : availableMasters && availableMasters.length > 0 ? (
                        <Select
                          name="master"
                          value={dateTime.master}
                          onValueChange={(value) => setDateTime({ ...dateTime, master: value, time: '' })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите мастера" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableMasters.map((master) => (
                              <SelectItem key={master.id} value={master.name}>
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4" />
                                  {master.name}
                                  {master.specialty && (
                                    <Badge variant="outline" className="text-xs">
                                      {master.specialty}
                                    </Badge>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : dateTime.date && dateTime.branch ? (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            Нет доступных мастеров на выбранную дату в этом филиале
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <Select disabled={true} value="">
                          <SelectTrigger>
                            <SelectValue placeholder="Сначала выберите дату и филиал" />
                          </SelectTrigger>
                        </Select>
                      )}
                    </div>
                  </div>

                  {/* Выбор времени */}
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="time" className="text-right font-medium">Время</Label>
                    <div className="col-span-3">
                      {dateTime.master && availableMasters && dateTime.date ? (
                        <div>
                          {(() => {
                            const selectedMaster = availableMasters.find(m => m.name === dateTime.master);

                            if (!selectedMaster) {
                              return (
                                <Alert>
                                  <AlertCircle className="h-4 w-4" />
                                  <AlertDescription>
                                    Мастер не найден
                                  </AlertDescription>
                                </Alert>
                              );
                            }

                            if (selectedMaster.availableSlots && selectedMaster.availableSlots.length > 0) {
                              return (
                                <Select
                                  value={dateTime.time}
                                  onValueChange={(value) => setDateTime({ ...dateTime, time: value })}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Выберите время" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {selectedMaster.availableSlots.map((slot, index) => (
                                      <SelectItem key={index} value={slot.start}>
                                        <div className="flex items-center gap-2">
                                          <Clock className="h-4 w-4" />
                                          {slot.start}
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              );
                            } else {
                              return (
                                <Alert>
                                  <AlertCircle className="h-4 w-4" />
                                  <AlertDescription>
                                    У мастера нет свободных слотов на эту дату
                                  </AlertDescription>
                                </Alert>
                              );
                            }
                          })()}
                        </div>
                      ) : (
                        <Input
                          id="time"
                          className="col-span-3"
                          placeholder="Сначала выберите мастера"
                          value={dateTime.time}
                          onChange={(e) => setDateTime({ ...dateTime, time: e.target.value })}
                          disabled={!dateTime.master}
                        />
                      )}
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={dateTimeMutation.isPending}
                    className="flex items-center gap-2"
                  >
                    {dateTimeMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CalendarIcon className="h-4 w-4" />
                    )}
                    Создать запись
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* 
            Кнопка "Переписка" не отображается для клиентов, созданных вручную.
            Проверяем source задачи и telegramId клиента.
          */}
          {(task.source !== 'manual' && !task.client.telegramId?.startsWith('manual_')) && (
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              onClick={() => {
                // Получаем telegramId клиента 
                const clientId = task.client.telegramId;
                // Переходим на страницу клиентов с указанием clientId в query параметрах
                // Используем роутер wouter вместо прямого изменения window.location
                setLocation(`/clients?clientId=${clientId}`);
              }}
            >
              <Phone className="h-4 w-4" />
              Переписка
            </Button>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex justify-between items-center pt-4">
        <div className="flex items-center gap-2">
          <Select
            onValueChange={updateStatus}
            value={task.status}
            disabled={updateStatusMutation.isPending}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Изменить статус" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">Неразобранные</SelectItem>
              <SelectItem value="scheduled">Записан</SelectItem>
              <SelectItem value="in_progress">В процессе</SelectItem>
              <SelectItem value="completed">Обслуженные</SelectItem>
              <SelectItem value="cancelled">Отмененные</SelectItem>
              <SelectItem value="regular">Постоянные</SelectItem>
            </SelectContent>
          </Select>

          {updateStatusMutation.isPending && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Кнопка для CRM-анализа, показываем только для новых задач с переписками (не вручную созданных) */}
          {task.status === 'new' && task.source !== 'manual' && !task.client.telegramId?.startsWith('manual_') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => analyzeCRMMutation.mutate()}
              disabled={analyzeCRMMutation.isPending}
              title="Анализировать переписку"
              className="flex items-center gap-2"
            >
              {analyzeCRMMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Clock className="h-4 w-4" />
              )}
              Анализ CRM
            </Button>
          )}

          <TaskDetailDialog task={task} onTaskUpdated={onTaskUpdated} />

          <Button
            variant="destructive"
            size="sm"
            onClick={deleteTask}
            disabled={deleteTaskMutation.isPending}
            className="flex items-center gap-1"
          >
            {deleteTaskMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <X className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

// Тип сортировки задач
type SortType = 'date' | 'master';
type SortDirection = 'asc' | 'desc';

// Тип интеграции для фильтрации
type IntegrationType = 'wa1' | 'wa2' | 'telegram' | 'instagram';

// Компонент для создания нового клиента вручную
const CreateClientDialog = ({ onClientCreated }: { onClientCreated: () => void }) => {
  // Состояние для управления диалогом
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const { currentBranch } = useBranch();

  // Начальное состояние формы
  interface ClientFormData {
    clientName: string;
    phoneNumber: string;
    branchId: string;
    serviceType: string;
    masterName: string;
    notes: string;
    discount: number;
    finalPrice: number;
  }

  const [formData, setFormData] = useState<ClientFormData>({
    clientName: "",
    phoneNumber: "",
    branchId: currentBranch && currentBranch.id ? currentBranch.id.toString() : 'wa1',
    serviceType: "",
    masterName: "",
    notes: "",
    discount: 0,
    finalPrice: 0,
  });

  // Для отладки - проверяем значения при инициализации
  useEffect(() => {
    console.log("CreateClientDialog initialized with branch:",
      currentBranch && currentBranch.id ? currentBranch.id.toString() : 'wa1',
      "currentBranch:", currentBranch);
  }, []);

  // При открытии диалога обновляем филиал
  useEffect(() => {
    if (isOpen) {
      console.log("Диалог создания клиента открыт");

      try {
        // Обновляем филиал при каждом открытии
        const currentInstanceId = currentBranch && currentBranch.id ? currentBranch.id.toString() : 'wa1';

        // Обновляем форму если нужно
        if (formData.branchId !== currentInstanceId) {
          console.log(`Обновляем филиал в форме с ${formData.branchId} на ${currentInstanceId}`);
          setFormData(prev => ({
            ...prev,
            branchId: currentInstanceId
          }));
        }
      } catch (error) {
        console.error("Ошибка при обновлении данных диалога создания клиента:", error);
      }
    }
  }, [isOpen]);

  // Интерфейс для отслеживания даты и времени
  interface DateTimeData {
    date: string;
    time: string;
  }

  // Для отслеживания даты и времени
  const [dateTime, setDateTime] = useState<DateTimeData>({
    date: "",
    time: ""
  });

  // Список мастеров
  const { data: mastersData, isLoading: isLoadingMasters } = useQuery<Master[]>({
    queryKey: ['/api/masters'],
    enabled: isOpen,
  });

  // Список услуг
  const { data: serviceServices, isLoading: isLoadingServices } = useQuery<serviceService[]>({
    queryKey: ['/api/public/service-services'],
    enabled: isOpen,
  });

  // Доступные длительности для выбранного типа услуги
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);

  const { data: serviceDurations, isLoading: isLoadingDurations } = useQuery<serviceDurationsResponse>({
    queryKey: ['/api/service-services/durations', formData.serviceType],
    enabled: !!formData.serviceType && isOpen,
    queryFn: async () => {
      if (!formData.serviceType) return null;

      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/service-services/durations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ serviceType: formData.serviceType }),
      });
      if (!res.ok) return null;

      return res.json();
    }
  });

  // Устанавливаем длительность по умолчанию, когда данные загружены
  useEffect(() => {
    if (serviceDurations && serviceDurations.availableDurations &&
      (!selectedDuration ||
        !serviceDurations.availableDurations.some((d: DurationOption) => d.duration === selectedDuration))) {
      setSelectedDuration(serviceDurations.defaultDuration);
    }
  }, [serviceDurations, selectedDuration]);

  // Автоматически рассчитываем цену при изменении типа услуги или длительности
  useEffect(() => {
    if (serviceDurations && selectedDuration) {
      const selectedOption = serviceDurations.availableDurations.find((d: DurationOption) => d.duration === selectedDuration);
      if (selectedOption) {
        const basePrice = selectedOption.price;
        const discountAmount = (basePrice * formData.discount) / 100;
        const finalPrice = Math.round(basePrice - discountAmount);

        setFormData(prev => ({
          ...prev,
          finalPrice: finalPrice
        }));

        console.log(`Автоматически рассчитана цена: базовая ${basePrice}, скидка ${formData.discount}%, итоговая ${finalPrice}`);
      }
    }
  }, [serviceDurations, selectedDuration, formData.discount]);

  // Мутация для создания клиента
  const createClientMutation = useMutation({
    mutationFn: async () => {
      // Обязательные поля для создания клиента
      if (!formData.clientName) {
        throw new Error("Имя клиента обязательно");
      }

      // Генерируем уникальный telegramId для вручную созданного клиента
      const manualClientPrefix = "manual_";
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 10);
      const telegramId = `${manualClientPrefix}${timestamp}_${randomStr}`;

      // Собираем данные из формы
      const payload = {
        // Поля для создания клиента
        telegramId: telegramId, // Добавляем уникальный telegramId
        firstName: formData.clientName, // Используем имя клиента как firstName
        lastName: "", // Пустая фамилия для вручную созданных клиентов
        customName: formData.clientName,
        phoneNumber: formData.phoneNumber,
        instanceId: formData.branchId, // Используем branchId как instanceId
        // Дополнительная информация для задачи
        clientName: formData.clientName,
        branchId: formData.branchId,
        serviceType: formData.serviceType,
        masterName: formData.masterName,
        notes: formData.notes,
        scheduleDate: dateTime.date,
        scheduleTime: dateTime.time,
        duration: selectedDuration,
        createAsCard: true, // Это новая карточка, созданная вручную
      };

      console.log("Отправляем данные для создания клиента:", payload);

      // Отправляем запрос на создание клиента
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/clients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Ошибка при создании клиента:", errorText);
        throw new Error(`Ошибка при создании клиента: ${errorText}`);
      }

      const result = await response.json();
      console.log("Клиент успешно создан:", result);

      return result;
    },
    onSuccess: async (data) => {
      console.log("Клиент успешно создан, создаем задачу", data);

      try {
        // Создаем задачу для клиента, если клиент был успешно создан
        if (data && data.client && data.client.id) {
          const clientId = data.client.id;
          // Получаем базовую цену услуги
          const selectedOption = serviceDurations?.availableDurations.find((d: DurationOption) => d.duration === selectedDuration);
          const servicePrice = selectedOption ? selectedOption.price : 0;

          const taskPayload = {
            clientId: clientId,
            status: 'new', // Статус "Неразобранные"
            serviceType: formData.serviceType,
            scheduleDate: dateTime.date || null,
            scheduleTime: dateTime.time || null,
            masterName: formData.masterName || null,
            notes: formData.notes || null,
            branchId: formData.branchId,
            source: 'manual', // Вручную созданная задача
            serviceDuration: selectedDuration,
            servicePrice: servicePrice, // Базовая цена услуги
            discount: formData.discount,
            finalPrice: formData.finalPrice // Цена с учетом скидки
          };

          console.log("Создаем задачу для клиента:", taskPayload);

          // Отправляем запрос на создание задачи
          const taskResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/tasks`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(taskPayload),
          });

          if (!taskResponse.ok) {
            const errorText = await taskResponse.text();
            console.error("Ошибка при создании задачи:", errorText);
            // Продолжаем выполнение, даже если задача не создалась
          } else {
            const taskResult = await taskResponse.json();
            console.log("Задача успешно создана:", taskResult);
          }
        }
      } catch (error) {
        console.error("Ошибка при создании задачи:", error);
        // Продолжаем выполнение, даже если задача не создалась
      }

      // Закрываем диалог
      setIsOpen(false);

      // Сбрасываем форму
      setFormData({
        clientName: "",
        phoneNumber: "",
        branchId: currentBranch?.id?.toString() || 'wa1',
        serviceType: "",
        masterName: "",
        notes: "",
        discount: 0,
        finalPrice: 0,
      });
      setDateTime({
        date: "",
        time: ""
      });
      setSelectedDuration(null);

      // Уведомляем пользователя
      toast({
        title: "Клиент создан",
        description: "Клиент успешно создан и задача добавлена",
        variant: "default"
      });

      // Обновляем список задач
      onClientCreated();
    },
    onError: (error) => {
      console.error("Ошибка при создании клиента:", error);
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Произошла ошибка при создании клиента",
        variant: "destructive"
      });
    }
  });

  // Обработчик отправки формы
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Подробное логирование
    console.log("Отправка формы создания клиента:", formData);

    try {
      // Проверка минимального набора данных
      if (!formData.clientName) {
        console.log("Ошибка валидации: имя клиента не указано");
        toast({
          title: "Ошибка валидации",
          description: "Необходимо указать имя клиента",
          variant: "destructive",
        });
        return;
      }

      // Проверяем наличие филиала
      if (!formData.branchId) {
        console.log("Не указан филиал, используем текущий филиал оператора");
        // Устанавливаем текущий филиал если не указан
        setFormData(prev => ({
          ...prev,
          branchId: currentBranch && currentBranch.id ? currentBranch.id.toString() : 'wa1'
        }));
      }

      console.log("Запускаем мутацию для создания клиента");
      createClientMutation.mutate();
    } catch (error) {
      console.error("Ошибка при отправке формы создания клиента:", error);
      toast({
        title: "Ошибка",
        description: "Произошла ошибка при создании клиента",
        variant: "destructive"
      });
    }
  };

  return (
    <>
      <Button
        onClick={() => {
          console.log("Открываем диалог создания клиента");
          // Устанавливаем текущий филиал при открытии диалога
          try {
            // Инициализация формы при открытии
            setFormData(prev => ({
              ...prev,
              branchId: currentBranch && currentBranch.id ? currentBranch.id.toString() : 'wa1'
            }));
            console.log("Филиал для нового клиента:", currentBranch?.id?.toString() || 'wa1');

            // Открываем диалог
            setIsOpen(true);
          } catch (error) {
            console.error("Ошибка при открытии диалога создания клиента:", error);
            toast({
              title: "Ошибка",
              description: "Не удалось открыть форму создания клиента",
              variant: "destructive"
            });
          }
        }}
        className="mb-6 flex items-center gap-2"
      >
        <UserPlus className="h-4 w-4" />
        Создать клиента
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Создать нового клиента
              </DialogTitle>
              <DialogDescription>
                Введите данные клиента для создания новой карточки
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-6 py-4">
              <div className="space-y-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="clientName" className="text-right font-medium">Имя клиента*</Label>
                  <Input
                    id="clientName"
                    name="clientName"
                    className="col-span-3"
                    value={formData.clientName}
                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                    placeholder="Введите имя клиента"
                    required
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="phoneNumber" className="text-right font-medium">Телефон</Label>
                  <Input
                    id="phoneNumber"
                    name="phoneNumber"
                    className="col-span-3"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    placeholder="Введите номер телефона"
                  />
                </div>

                <Separator />

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="branchId" className="text-right font-medium">Филиал</Label>
                  <div className="col-span-3">
                    <Select
                      name="branchId"
                      value={formData.branchId}
                      onValueChange={(value) => setFormData({ ...formData, branchId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите филиал" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="wa1">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            Токтогула 93
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="serviceType" className="text-right font-medium">Тип услуги</Label>
                  <div className="col-span-3">
                    <Select
                      name="serviceType"
                      value={formData.serviceType}
                      onValueChange={(value) => setFormData({ ...formData, serviceType: value })}
                      disabled={isLoadingServices}
                    >
                      <SelectTrigger>
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
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="duration" className="text-right font-medium">Длительность</Label>
                  <div className="col-span-3">
                    <Select
                      name="duration"
                      value={selectedDuration?.toString() || ""}
                      onValueChange={(value) => setSelectedDuration(Number(value))}
                      disabled={isLoadingDurations || !formData.serviceType}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите длительность" />
                      </SelectTrigger>
                      <SelectContent>
                        {serviceDurations?.availableDurations?.map((duration: DurationOption) => (
                          <SelectItem key={duration.duration} value={duration.duration.toString()}>
                            <div className="flex items-center gap-2">
                              <Timer className="h-4 w-4" />
                              {duration.duration} мин
                              <Badge variant="secondary" className="ml-2">
                                {duration.price} сом
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="masterName" className="text-right font-medium">Мастер</Label>
                  <div className="col-span-3">
                    <Select
                      name="masterName"
                      value={formData.masterName}
                      onValueChange={(value) => setFormData({ ...formData, masterName: value })}
                      disabled={isLoadingMasters}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите мастера" />
                      </SelectTrigger>
                      <SelectContent>
                        {mastersData?.map((master) => (
                          <SelectItem key={master.id} value={master.name}>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              {master.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="date" className="text-right font-medium">Дата</Label>
                  <div className="col-span-3">
                    <Input
                      id="date"
                      name="date"
                      type="date"
                      className="col-span-3"
                      value={dateTime.date}
                      onChange={(e) => setDateTime({ ...dateTime, date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="time" className="text-right font-medium">Время</Label>
                  <div className="col-span-3">
                    <Input
                      id="time"
                      name="time"
                      type="time"
                      className="col-span-3"
                      value={dateTime.time}
                      onChange={(e) => setDateTime({ ...dateTime, time: e.target.value })}
                    />
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="discount" className="text-right font-medium">Скидка (%)</Label>
                  <Input
                    id="discount"
                    name="discount"
                    type="number"
                    min="0"
                    max="100"
                    className="col-span-3"
                    value={formData.discount}
                    onChange={(e) => {
                      const discount = parseFloat(e.target.value) || 0;
                      setFormData(prev => {
                        // Get the base price from selected duration
                        const selectedDurationOption = serviceDurations?.availableDurations?.find((d: DurationOption) => d.duration === selectedDuration);
                        const basePrice = selectedDurationOption?.price || 0;
                        const finalPrice = basePrice - (basePrice * discount / 100);
                        return {
                          ...prev,
                          discount,
                          finalPrice: Math.round(finalPrice)
                        };
                      });
                    }}
                    placeholder="Введите размер скидки в процентах"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="finalPrice" className="text-right font-medium">Итоговая цена</Label>
                  <Input
                    id="finalPrice"
                    name="finalPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    className="col-span-3"
                    value={formData.finalPrice}
                    onChange={(e) => setFormData({ ...formData, finalPrice: parseFloat(e.target.value) || 0 })}
                    placeholder="Введите итоговую цену"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="notes" className="text-right font-medium">Примечания</Label>
                  <Input
                    id="notes"
                    name="notes"
                    className="col-span-3"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Дополнительная информация"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2"
              >
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={createClientMutation.isPending}
                className="flex items-center gap-2"
              >
                {createClientMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                Создать клиента
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Компонент фильтра интеграций
const IntegrationsFilter = ({
  selectedIntegrations,
  setSelectedIntegrations
}: {
  selectedIntegrations: IntegrationType[],
  setSelectedIntegrations: React.Dispatch<React.SetStateAction<IntegrationType[]>>
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Список всех доступных интеграций
  const integrations = [
    { id: 'wa1', label: 'WhatsApp Токтогула (wa1)', icon: Phone },
    { id: 'telegram', label: 'Telegram', icon: Phone },
    { id: 'instagram', label: 'Instagram', icon: Phone },
  ];

  // Переключение состояния чекбокса интеграции
  const toggleIntegration = (integration: IntegrationType) => {
    setSelectedIntegrations(prev => {
      // Если интеграция уже выбрана, удаляем ее из списка
      if (prev.includes(integration)) {
        return prev.filter(i => i !== integration);
      }
      // Иначе добавляем в список
      return [...prev, integration];
    });
  };

  // Сброс всех выбранных интеграций
  const resetIntegrations = () => {
    setSelectedIntegrations([]);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Фильтр по интеграциям
            {selectedIntegrations.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {selectedIntegrations.length}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64">
          <DropdownMenuLabel className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Выберите интеграции
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {integrations.map((integration) => {
            const IconComponent = integration.icon;
            return (
              <DropdownMenuCheckboxItem
                key={integration.id}
                checked={selectedIntegrations.includes(integration.id as IntegrationType)}
                onCheckedChange={() => toggleIntegration(integration.id as IntegrationType)}
                className="cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <IconComponent className="w-4 h-4" />
                  {integration.label}
                </div>
              </DropdownMenuCheckboxItem>
            );
          })}

          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={resetIntegrations}
            className="cursor-pointer text-center font-medium text-red-500 hover:text-red-600"
          >
            <div className="flex items-center gap-2 w-full justify-center">
              <X className="w-4 h-4" />
              Сбросить фильтры
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

// Основной компонент страницы CRM задач
const CRMTasks: React.FC = () => {
  const [activeTab, setActiveTab] = useState('new');
  const { toast } = useToast();
  const { currentBranch } = useBranch();

  // Состояние для сортировки
  const [sortType, setSortType] = useState<SortType>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Состояние для фильтрации по интеграциям
  const [selectedIntegrations, setSelectedIntegrations] = useState<IntegrationType[]>([]);

  // Запрос на получение задач по статусу
  const { data: tasksData, isLoading, isError, refetch } = useQuery({
    queryKey: ['/api/tasks', activeTab, currentBranch?.id],
    queryFn: async () => {
      const url = activeTab === 'all'
        ? '/api/tasks'
        : `/api/tasks?status=${activeTab}`;

      const res = await fetch(url);

      if (!res.ok) {
        throw new Error('Failed to fetch tasks');
      }

      return res.json();
    }
  });

  // Применяем фильтрацию по филиалу
  // Важно: для вкладки "new" (новые) отключаем фильтрацию, чтобы показать все новые задачи независимо от филиала
  const filteredTasks = useBranchFilter(tasksData as Record<string, any>[], {
    applyFilter: activeTab !== 'new' // Не применяем фильтр для "новых" задач
  });

  // Сортировка задач
  const sortTasks = (tasksToSort: any[] | undefined): Task[] => {
    if (!tasksToSort) return [];

    return [...tasksToSort].sort((a, b) => {
      if (sortType === 'date') {
        const dateA = new Date(a.createdAt || '').getTime();
        const dateB = new Date(b.createdAt || '').getTime();
        return sortDirection === 'desc' ? dateB - dateA : dateA - dateB;
      } else if (sortType === 'master') {
        const masterA = a.masterName || '';
        const masterB = b.masterName || '';
        return sortDirection === 'desc'
          ? masterB.localeCompare(masterA)
          : masterA.localeCompare(masterB);
      }
      return 0;
    }) as Task[];
  };

  // Функция для проверки, соответствует ли задача выбранным интеграциям
  const matchesIntegrationFilter = (task: Record<string, any>): boolean => {
    // Если фильтры не выбраны, показываем все задачи
    if (selectedIntegrations.length === 0) {
      return true;
    }

    // Определяем интеграцию на основе telegramId клиента, source задачи и/или branchId задачи
    const telegramId = task.client?.telegramId || '';
    const branchId = task.branchId;

    // Проверяем source задачи (используем поле самой задачи)
    const source = task.source || '';

    // Для ручного создания проверяем филиал и source='manual'
    if (source === 'manual' && branchId) {
      // Если выбран соответствующий филиал, показываем вручную созданную карточку
      if (selectedIntegrations.includes(branchId as IntegrationType)) {
        return true;
      }
    }

    // Проверяем branchId (если он указан явно в задаче)
    if (branchId && selectedIntegrations.includes(branchId as IntegrationType)) {
      return true;
    }

    // Проверяем telegramId для определения филиала WhatsApp
    if (telegramId.startsWith('wa1_') && selectedIntegrations.includes('wa1')) {
      return true;
    }
    if (telegramId.startsWith('wa2_') && selectedIntegrations.includes('wa2')) {
      return true;
    }

    // Проверяем для мануальных клиентов по формату telegramId=manual_XXXXXX
    if (telegramId.startsWith('manual_') && branchId) {
      if (selectedIntegrations.includes(branchId as IntegrationType)) {
        return true;
      }
    }

    // Проверяем источник для Telegram
    if ((source === 'telegram' || telegramId.startsWith('tg_')) &&
      selectedIntegrations.includes('telegram')) {
      return true;
    }

    // Проверяем источник для Instagram или telegramId с префиксом ig_
    if ((source === 'instagram' || telegramId.startsWith('ig_')) &&
      selectedIntegrations.includes('instagram')) {
      return true;
    }

    // По умолчанию задача не соответствует выбранным фильтрам
    return false;
  };

  // Применяем фильтрацию по интеграциям
  const integrationFilteredTasks = useMemo(() => {
    if (!filteredTasks) return [];
    return filteredTasks.filter((task) => matchesIntegrationFilter(task));
  }, [filteredTasks, selectedIntegrations]);

  // Получаем отфильтрованные и отсортированные задачи
  const tasks = sortTasks(integrationFilteredTasks);

  // Функция для обновления списка задач
  const refreshTasks = () => {
    refetch();
  };

  // Функция для изменения типа сортировки
  const handleSortTypeChange = (type: SortType) => {
    if (sortType === type) {
      // Если тип уже выбран, меняем направление сортировки
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Если выбран новый тип, устанавливаем его и сбрасываем направление сортировки
      setSortType(type);
      setSortDirection('desc');
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">CRM - Управление задачами</h1>
          <p className="text-muted-foreground mt-2">Управляйте клиентскими задачами и записями</p>
        </div>
        <CreateClientDialog onClientCreated={refreshTasks} />
      </div>

      <Card className="mb-8">
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-6 w-full">
              <TabsTrigger value="new" className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Новые
              </TabsTrigger>
              <TabsTrigger value="scheduled" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Записанные
              </TabsTrigger>
              <TabsTrigger value="in_progress" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                В процессе
              </TabsTrigger>
              <TabsTrigger value="completed" className="flex items-center gap-2">
                <Star className="h-4 w-4" />
                Обслуженные
              </TabsTrigger>
              <TabsTrigger value="cancelled" className="flex items-center gap-2">
                <X className="h-4 w-4" />
                Отмененные
              </TabsTrigger>
              <TabsTrigger value="regular" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Постоянные
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Элементы управления сортировкой и фильтрацией */}
      <Card className="mb-8">
        <CardContent className="p-4">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Сортировка:</span>
                <div className="flex gap-2">
                  <Button
                    variant={sortType === 'date' ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSortTypeChange('date')}
                    className="flex items-center gap-2"
                  >
                    <Calendar className="w-4 h-4" />
                    По дате
                    {sortType === 'date' && (
                      <ChevronDown className={`w-4 h-4 transition-transform ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
                    )}
                  </Button>

                  <Button
                    variant={sortType === 'master' ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSortTypeChange('master')}
                    className="flex items-center gap-2"
                  >
                    <User className="w-4 h-4" />
                    По мастеру
                    {sortType === 'master' && (
                      <ChevronDown className={`w-4 h-4 transition-transform ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
                    )}
                  </Button>
                </div>
              </div>

              <Separator orientation="vertical" className="h-8" />

              {/* Фильтр по интеграциям */}
              <IntegrationsFilter
                selectedIntegrations={selectedIntegrations}
                setSelectedIntegrations={setSelectedIntegrations}
              />
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Показано задач: {tasks?.length || 0}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="flex justify-center items-center py-12">
            <div className="flex items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span>Загрузка задач...</span>
            </div>
          </CardContent>
        </Card>
      ) : isError ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Ошибка при загрузке задач. Пожалуйста, попробуйте обновить страницу.
          </AlertDescription>
        </Alert>
      ) : tasks?.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Нет задач с этим статусом</h3>
            <p className="text-muted-foreground">
              Задачи будут появляться здесь, когда клиенты будут писать в мессенджеры.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tasks.map((task: Task) => (
            <TaskCard
              key={task.id}
              task={task}
              onTaskUpdated={refreshTasks}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CRMTasks;