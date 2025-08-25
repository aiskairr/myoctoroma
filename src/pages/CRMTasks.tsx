import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Calendar, User, Phone, Clock, X, EditIcon, CalendarIcon, ChevronDown, UserPlus, Filter } from "lucide-react";
import { format, parseISO, addMinutes } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "../lib/queryClient";
import { useBranchFilter } from "@/hooks/use-branch-filter";
import { useBranch } from "@/contexts/BranchContext";
import { useLocation } from "wouter";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";

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
interface MassageService {
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
interface MassageDurationsResponse {
  massageType: string;
  availableDurations: DurationOption[];
  defaultDuration: number;
}

// Интерфейс для расчета услуги
interface MassageServiceCalculation {
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
  massageType?: string;
  massageServiceId?: number; // ID услуги массажа
  massageDuration?: number;  // Длительность услуги в минутах
  massagePrice?: number;     // Цена услуги
  discount?: number;         // Скидка в процентах
  finalPrice?: number;       // Итоговая цена после скидки
  scheduleDate?: string;
  scheduleTime?: string;     // Время начала услуги
  endTime?: string;          // Время окончания услуги (вычисляется на основе scheduleTime и massageDuration)
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
        return { label: "Неразобранные", class: "bg-blue-100 text-blue-800" };
      case "scheduled":
        return { label: "Записан", class: "bg-green-100 text-green-800" };
      case "in_progress":
        return { label: "В процессе", class: "bg-orange-100 text-orange-800" };
      case "completed":
        return { label: "Обслуженные", class: "bg-purple-100 text-purple-800" };
      case "cancelled":
        return { label: "Отмененные", class: "bg-red-100 text-red-800" };
      case "regular":
        return { label: "Постоянные", class: "bg-yellow-100 text-yellow-800" };
      default:
        return { label: "Неизвестный", class: "bg-gray-100 text-gray-800" };
    }
  };
  
  const details = getStatusDetails(status);
  
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${details.class}`}>
      {details.label}
    </span>
  );
};

// Компонент диалогового окна с деталями задачи
const TaskDetailDialog = ({ task, onTaskUpdated }: { task: Task, onTaskUpdated: () => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [taskData, setTaskData] = useState({
    massageType: task.massageType || "",
    scheduleDate: task.scheduleDate || "",
    scheduleTime: task.scheduleTime || "",
    masterName: task.masterName || "",
    notes: task.notes || "",
    discount: task.discount || 0,
    finalPrice: task.finalPrice || 0,
    massageDuration: task.massageDuration || 0,
  });
  
  // Состояние для дополнительных услуг
  const [additionalServices, setAdditionalServices] = useState<AdditionalService[]>([]);
  const [childTasks, setChildTasks] = useState<Task[]>([]);
  
  const { toast } = useToast();
  
  // Получаем список доступных услуг
  const { data: massageServices, isLoading: isLoadingServices } = useQuery<MassageService[]>({
    queryKey: ['${import.meta.env.VITE_BACKEND_URL}/api/public/massage-services'],
    enabled: isOpen, // Запрашиваем только когда диалог открыт
  });

  // Получаем дочерние задачи (дополнительные услуги)
  const { data: childTasksData } = useQuery<Task[]>({
    queryKey: ['${import.meta.env.VITE_BACKEND_URL}/api/tasks/children', task.id],
    enabled: isOpen,
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/tasks/${task.id}/children`);
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
  const [selectedDuration, setSelectedDuration] = useState<number | null>(task.massageDuration || null);
  const [customDuration, setCustomDuration] = useState<string>("");
  const [isCustomDuration, setIsCustomDuration] = useState(false);
  
  const { data: massageDurations, isLoading: isLoadingDurations } = useQuery<MassageDurationsResponse>({
    queryKey: ['${import.meta.env.VITE_BACKEND_URL}/api/massage-services/durations', taskData.massageType],
    enabled: !!taskData.massageType && isOpen,
    queryFn: async () => {
      if (!taskData.massageType) return null;
      
      const res = await fetch('${import.meta.env.VITE_BACKEND_URL}/api/massage-services/durations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ massageType: taskData.massageType }),
      });
      if (!res.ok) return null;
      
      return res.json();
    }
  });
  
  // Устанавливаем длительность по умолчанию, когда данные загружены
  useEffect(() => {
    if (massageDurations && massageDurations.availableDurations && 
        (!selectedDuration || 
         !massageDurations.availableDurations.some((d: DurationOption) => d.duration === selectedDuration))) {
      setSelectedDuration(massageDurations.defaultDuration);
    }
  }, [massageDurations, selectedDuration]);
  
  // Получаем информацию о выбранной услуге для отображения цены
  const selectedDurationOption = massageDurations?.availableDurations?.find((d: DurationOption) => d.duration === selectedDuration);
  const massageDetails = selectedDurationOption && massageDurations ? {
    name: massageDurations.massageType,
    duration: selectedDurationOption.duration,
    price: selectedDurationOption.price
  } : null;
  
  const updateTaskMutation = useMutation({
    mutationFn: async (updatedTask: Partial<Task>) => {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/tasks/${task.id}`, {
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
      const res = await fetch('${import.meta.env.VITE_BACKEND_URL}/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: task.client.id,
          status: task.status,
          massageType: serviceData.serviceName,
          massageServiceId: serviceData.serviceId,
          scheduleDate: task.scheduleDate,
          scheduleTime: task.scheduleTime,
          masterName: task.masterName,
          notes: task.notes,
          branchId: task.branchId,
          source: task.source,
          massageDuration: serviceData.duration,
          massagePrice: serviceData.price,
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
      queryClient.invalidateQueries({ queryKey: ['${import.meta.env.VITE_BACKEND_URL}/api/tasks/children', task.id] });
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
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/tasks/${childTaskId}`, {
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
      queryClient.invalidateQueries({ queryKey: ['${import.meta.env.VITE_BACKEND_URL}/api/tasks/children', task.id] });
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
    const mainPrice = task.massagePrice || 0;
    const childrenPrice = childTasks.reduce((sum, child) => sum + (child.massagePrice || 0), 0);
    return mainPrice + childrenPrice;
  };

  const calculateTotalDuration = (): number => {
    const mainDuration = task.massageDuration || 0;
    const childrenDuration = childTasks.reduce((sum, child) => sum + (child.massageDuration || 0), 0);
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
    let massageDurationUpdate = {};
    const finalDuration = isCustomDuration ? parseInt(customDuration) : selectedDuration;
    
    if (finalDuration) {
      massageDurationUpdate = { 
        massageDuration: finalDuration,
        massagePrice: isCustomDuration ? 0 : (selectedDurationOption?.price || 0) // Не заполняем цену для произвольной длительности
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
      ...massageDurationUpdate,
      ...endTimeUpdate,
      massageDuration: taskData.massageDuration,
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
      >
        <EditIcon className="h-4 w-4 mr-2" />
        Изменить
      </Button>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Редактировать задачу</DialogTitle>
              <DialogDescription>
                Клиент: {task.client?.customName || task.client?.firstName || 'Неизвестный клиент'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="massageType" className="col-span-1">Вид услуги</Label>
                <div className="col-span-3">
                  <Select
                    name="massageType"
                    value={taskData.massageType}
                    onValueChange={(value) => handleSelectChange("massageType", value)}
                    disabled={isLoadingServices}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите тип услуги" />
                    </SelectTrigger>
                    <SelectContent>
                      {massageServices?.map((service) => (
                        <SelectItem key={service.id} value={service.name}>
                          {service.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Добавляем выбор длительности, если услуга выбрана */}
              {taskData.massageType && massageDurations && massageDurations.availableDurations && massageDurations.availableDurations.length > 0 && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="duration" className="col-span-1">Длительность</Label>
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
                        {massageDurations.availableDurations.map((option: DurationOption) => (
                          <SelectItem key={option.duration} value={option.duration.toString()}>
                            {option.duration} мин ({option.price} сом)
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
                  <Label htmlFor="customDuration" className="col-span-1">Длительность (мин)</Label>
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
              {massageDetails && massageDetails.name && massageDetails.duration && massageDetails.price && (
                <div className="grid grid-cols-4 items-center">
                  <div></div>
                  <div className="col-span-3 text-sm text-gray-500">
                    Выбрано: {massageDetails.name}, {massageDetails.duration} мин, {massageDetails.price} сом
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="scheduleDate" className="col-span-1">Дата</Label>
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
                <Label htmlFor="scheduleTime" className="col-span-1">Время</Label>
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
                <Label htmlFor="masterName" className="col-span-1">Мастер</Label>
                <Input
                  id="masterName"
                  name="masterName"
                  value={taskData.masterName}
                  onChange={handleInputChange}
                  className="col-span-3"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="massageDuration" className="col-span-1">Длительность (мин)</Label>
                <Input
                  id="massageDuration"
                  name="massageDuration"
                  type="number"
                  min="1"
                  value={taskData.massageDuration}
                  onChange={(e) => {
                    const duration = parseInt(e.target.value) || 0;
                    setTaskData(prev => ({
                      ...prev,
                      massageDuration: duration
                    }));
                  }}
                  className="col-span-3"
                  placeholder="Введите длительность в минутах"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="notes" className="col-span-1">Заметки</Label>
                <Input
                  id="notes"
                  name="notes"
                  value={taskData.notes}
                  onChange={handleInputChange}
                  className="col-span-3"
                />
              </div>
              
              {/* Поля для скидки и итоговой цены */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="discount" className="col-span-1">Скидка (%)</Label>
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
                      const basePrice = task.massagePrice || massageDetails?.price || 0;
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
                <Label htmlFor="finalPrice" className="col-span-1">Итоговая цена</Label>
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
            
            <DialogFooter>
              <Button 
                type="submit"
                disabled={updateTaskMutation.isPending}
              >
                {updateTaskMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
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
          return '#fff7cc'; // Жёлтый
        default:
          return 'white';
      }
    }
    
    // Приоритет 2: Определение филиала на основе telegramId
    if (telegramId) {
      // Если телефон из WhatsApp определяем по префиксу
      if (telegramId.startsWith('wa1_')) {
        return '#fff7cc'; // Жёлтый - для wa1
      } else if (telegramId.startsWith('wa2_')) {
        return '#d6f5d6'; // Зелёный - для wa2
      } else if (telegramId.startsWith('ig_')) {
        return '#ffffff'; // Белый для Instagram
      } else if (!telegramId.startsWith('wa') && source !== 'instagram') {
        return '#cdd5f7'; // Тёмно-синий для Telegram
      }
    }
    
    // Приоритет 3: Определение по источнику сообщения
    if (source === 'instagram') {
      return '#ffffff'; // Белый для Instagram
    } else if (source === 'telegram') {
      return '#cdd5f7'; // Тёмно-синий для Telegram
    }
    
    // По умолчанию белый фон
    return 'white';
  };
  
  // Мутация для анализа переписки с помощью CRM
  const analyzeCRMMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/tasks/${task.id}/analyze`, {
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
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/tasks/${task.id}/update-status`, {
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
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/tasks/${task.id}`, {
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
      const branch = currentBranch?.waInstance || 'wa1';
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
    const defaultBranch = currentBranch?.waInstance || 'wa1';
    console.log(`Не удалось определить филиал по задаче, используем текущий: ${defaultBranch}`);
    return defaultBranch;
  };
  
  // Состояние для формы выбора даты и времени
  const [dateTime, setDateTime] = useState({
    date: task.scheduleDate ? task.scheduleDate.split('T')[0] : '',
    time: task.scheduleTime || '',
    master: task.masterName || '',
    massageType: task.massageType || '',
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
    queryKey: ['${import.meta.env.VITE_BACKEND_URL}/api/crm/masters'],
  });
  
  // Получаем список услуг для диалога выбора времени
  const { data: massageServicesForSchedule, isLoading: isLoadingScheduleServices } = useQuery<MassageService[]>({
    queryKey: ['${import.meta.env.VITE_BACKEND_URL}/api/public/massage-services'],
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
    queryKey: ['${import.meta.env.VITE_BACKEND_URL}/api/masters/availability', dateTime.date, dateTime.branch],
    enabled: !!dateTime.date && !!dateTime.branch && isDialogOpen,
    queryFn: async () => {
      if (!dateTime.date || !dateTime.branch) return [];
      
      console.log(`Fetching masters for branch: ${dateTime.branch}, date: ${dateTime.date}`);
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/masters/availability?date=${dateTime.date}&branchId=${dateTime.branch}`);
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
  const { data: scheduleMassageDurations, isLoading: isLoadingScheduleDurations } = useQuery<MassageDurationsResponse>({
    queryKey: ['${import.meta.env.VITE_BACKEND_URL}/api/massage-services/durations', dateTime.massageType],
    enabled: !!dateTime.massageType,
    queryFn: async () => {
      if (!dateTime.massageType) {
        return { massageType: '', availableDurations: [], defaultDuration: 0 } as MassageDurationsResponse;
      }
      
      console.log(`Загружаем длительности для услуги: ${dateTime.massageType}`);
      
      const res = await fetch('${import.meta.env.VITE_BACKEND_URL}/api/massage-services/durations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ massageType: dateTime.massageType }),
      });
      if (!res.ok) {
        console.error('Failed to fetch massage durations', await res.text());
        return { 
          massageType: dateTime.massageType, 
          availableDurations: [], 
          defaultDuration: 0 
        } as MassageDurationsResponse;
      }
      
      const data = await res.json();
      console.log(`Получены данные о длительностях услуги:`, data);
      
      return data as MassageDurationsResponse;
    }
  });
  
  // Устанавливаем длительность по умолчанию, когда данные загружены
  useEffect(() => {
    if (scheduleMassageDurations && scheduleMassageDurations.availableDurations && 
        (!selectedScheduleDuration || 
         !scheduleMassageDurations.availableDurations.some((d: DurationOption) => d.duration === selectedScheduleDuration))) {
      setSelectedScheduleDuration(scheduleMassageDurations.defaultDuration);
    }
  }, [scheduleMassageDurations, selectedScheduleDuration]);
  
  // Получаем информацию о выбранной длительности услуги для отображения цены
  const selectedScheduleDurationOption = scheduleMassageDurations?.availableDurations?.find((d: DurationOption) => d.duration === selectedScheduleDuration);
  const selectedMassageDetails = selectedScheduleDurationOption && scheduleMassageDurations ? {
    name: scheduleMassageDurations.massageType,
    duration: selectedScheduleDurationOption.duration,
    price: selectedScheduleDurationOption.price
  } : null;
  
  const dateTimeMutation = useMutation({
    mutationFn: async (data: { 
      scheduleDate: string, 
      scheduleTime: string, 
      masterName: string, 
      massageType?: string,
      massageDuration?: number,
      massagePrice?: number,
      branchId?: string
    }) => {
      // Вычисляем время окончания услуги на основе даты, времени и длительности
      let endTime;
      if (data.scheduleDate && data.scheduleTime && data.massageDuration) {
        endTime = calculateEndTime(
          data.scheduleDate,
          data.scheduleTime,
          data.massageDuration
        );
        console.log(`Вычисленное время окончания (быстрая запись): ${endTime}`);
      }
      
      // Особая обработка для новых задач (task.status === 'new')
      // Для новых задач сохраняем филиал вместе с датой/временем
      const isNewTask = task.status === 'new';
      
      console.log(`Creating appointment for task id ${task.id}, status: ${task.status}, branch: ${data.branchId}`);
      
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/tasks/${task.id}`, {
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
    let massageDurationData = {};
    if (selectedScheduleDuration && selectedScheduleDurationOption) {
      massageDurationData = {
        massageDuration: selectedScheduleDuration,
        massagePrice: selectedScheduleDurationOption.price
      };
    }
    
    dateTimeMutation.mutate({
      scheduleDate: dateTime.date,
      scheduleTime: dateTime.time,
      masterName: dateTime.master,
      massageType: dateTime.massageType,
      branchId: dateTime.branch,
      ...massageDurationData
    }, {
      onSuccess: () => {
        // Закрываем диалог после успешной мутации
        setIsDialogOpen(false);
      }
    });
  };
  
  return (
    <Card style={{ backgroundColor: getCardBackgroundColor() }}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">
              {task.client?.customName || task.client?.firstName || 'Неизвестный клиент'}
            </CardTitle>
            <CardDescription>
              {task.client?.phoneNumber && (
                <div className="flex items-center mt-1">
                  <Phone className="h-3.5 w-3.5 mr-1" />
                  <span>{task.client.phoneNumber}</span>
                </div>
              )}
              {task.massageType && (
                <div className="mt-1">
                  <span className="block font-medium">{task.massageType}</span>
                  {task.massageDuration && task.massagePrice && (
                    <span className="text-sm text-gray-600">
                      {task.massageDuration} мин, {task.massagePrice} сом
                    </span>
                  )}
                </div>
              )}
            </CardDescription>
          </div>
          <StatusBadge status={task.status} />
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-2">
          {task.scheduleDate && (
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              <span>{format(new Date(task.scheduleDate), 'dd.MM.yyyy')}</span>
              {task.scheduleTime && (
                <>
                  {/* Если есть как время начала, так и время окончания, показываем диапазон */}
                  {task.endTime ? (
                    <span className="ml-2 font-medium">
                      {formatTimeRange(`${task.scheduleDate}T${task.scheduleTime}`, task.endTime)}
                    </span>
                  ) : (
                    <span className="ml-2">{task.scheduleTime}</span>
                  )}
                </>
              )}
            </div>
          )}
          
          {task.masterName && (
            <div className="flex items-center">
              <User className="h-4 w-4 mr-2" />
              <span>{task.masterName}</span>
            </div>
          )}
          
          {task.notes && (
            <div className="mt-2 text-sm text-gray-600">
              {task.notes.length > 100 
                ? `${task.notes.substring(0, 100)}...` 
                : task.notes}
            </div>
          )}
          
          <div className="mt-4">
            <Button 
              variant="outline" 
              size="sm" 
              className="mr-2"
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
                      massageType: task.massageType || '',
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
              <CalendarIcon className="h-4 w-4 mr-2" />
              Выбрать дату и время
            </Button>
            
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              console.log("Изменение состояния диалога:", open);
              setIsDialogOpen(open);
            }}>
              <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
                <form onSubmit={handleDateTimeSubmit}>
                  <DialogHeader>
                    <DialogTitle>Выбор даты и времени</DialogTitle>
                    <DialogDescription>
                      Выберите дату, время и мастера для записи клиента
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="massageType" className="col-span-1">Вид услуги</Label>
                      <div className="col-span-3">
                        <Select
                          name="massageType"
                          value={dateTime.massageType}
                          onValueChange={(value) => {
                            console.log(`Выбран тип услуги: ${value}`);
                            setDateTime({ ...dateTime, massageType: value });
                            
                            // При выборе типа услуги длительности загрузятся через отдельный useQuery
                            console.log(`Загружаем длительности для услуги через query hook: ${value}`);
                          }}
                          disabled={isLoadingScheduleServices}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите тип услуги" />
                          </SelectTrigger>
                          <SelectContent>
                            {massageServicesForSchedule?.map((service) => (
                              <SelectItem key={service.id} value={service.name}>
                                {service.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    {/* Добавляем выбор длительности, если услуга выбрана */}
                    {dateTime.massageType && scheduleMassageDurations && scheduleMassageDurations.availableDurations && scheduleMassageDurations.availableDurations.length > 0 && (
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="scheduleDuration" className="col-span-1">Длительность</Label>
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
                              {scheduleMassageDurations.availableDurations.map((option: DurationOption) => (
                                <SelectItem key={option.duration} value={option.duration.toString()}>
                                  {option.duration} мин ({option.price} сом)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                    
                    {/* Отображаем детали выбранной услуги */}
                    {selectedMassageDetails && selectedMassageDetails.name && selectedMassageDetails.duration && selectedMassageDetails.price && (
                      <div className="grid grid-cols-4 items-center">
                        <div></div>
                        <div className="col-span-3 text-sm text-gray-500">
                          Выбрано: {selectedMassageDetails.name}, {selectedMassageDetails.duration} мин, {selectedMassageDetails.price} сом
                        </div>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="date" className="col-span-1">Дата</Label>
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
                      <Label htmlFor="branch" className="col-span-1">Филиал</Label>
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
                            <SelectItem value="wa1">Токтогула 93 (wa1)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Выбор мастера */}
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="master" className="col-span-1">Мастер</Label>
                      <div className="col-span-3">
                        {isLoadingAvailability && dateTime.date && dateTime.branch ? (
                          <div className="flex items-center space-x-2">
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
                                  {master.name} {master.specialty ? `(${master.specialty})` : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : dateTime.date && dateTime.branch ? (
                          <div className="text-sm text-orange-600 p-2 border rounded">
                            Нет доступных мастеров на выбранную дату в этом филиале
                          </div>
                        ) : (
                          <Select
                            disabled={true}
                            value=""
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Сначала выберите дату и филиал" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">Укажите дату для выбора мастера</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>
                    
                    {/* Выбор времени */}
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="time" className="col-span-1">Время</Label>
                      <div className="col-span-3">
                        {dateTime.master && availableMasters && dateTime.date ? (
                          <div>
                            {(() => {
                              const selectedMaster = availableMasters.find(m => m.name === dateTime.master);
                              
                              if (!selectedMaster) {
                                return (
                                  <Input
                                    id="time"
                                    placeholder="Мастер не найден"
                                    disabled={true}
                                  />
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
                                          {slot.start}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                );
                              } else {
                                return (
                                  <div className="text-sm text-orange-600 p-2 border rounded">
                                    У мастера нет свободных слотов на эту дату
                                  </div>
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
                    >
                      {dateTimeMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
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
                className="mr-2"
                onClick={() => {
                  // Получаем telegramId клиента 
                  const clientId = task.client.telegramId;
                  // Переходим на страницу клиентов с указанием clientId в query параметрах
                  // Используем роутер wouter вместо прямого изменения window.location
                  setLocation(`/clients?clientId=${clientId}`);
                }}
              >
                Переписка
              </Button>
            )}
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <div className="flex space-x-2">
          <Select 
            onValueChange={updateStatus} 
            value={task.status}
            disabled={updateStatusMutation.isPending}
          >
            <SelectTrigger className="w-[130px]">
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
            <Loader2 className="h-4 w-4 animate-spin" />
          )}
        </div>
        
        <div className="flex space-x-2">
          {/* Кнопка для CRM-анализа, показываем только для новых задач с переписками (не вручную созданных) */}
          {task.status === 'new' && task.source !== 'manual' && !task.client.telegramId?.startsWith('manual_') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => analyzeCRMMutation.mutate()}
              disabled={analyzeCRMMutation.isPending}
              title="Анализировать переписку"
            >
              {analyzeCRMMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Clock className="h-4 w-4 mr-2" />
              )}
              Анализ CRM
            </Button>
          )}
          
          <TaskDetailDialog task={task} onTaskUpdated={onTaskUpdated} />
          <Button 
            variant="destructive" 
            size="icon"
            onClick={deleteTask}
            disabled={deleteTaskMutation.isPending}
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
    massageType: string;
    masterName: string;
    notes: string;
    discount: number;
    finalPrice: number;
  }
  
  const [formData, setFormData] = useState<ClientFormData>({
    clientName: "",
    phoneNumber: "",
    branchId: currentBranch && currentBranch.waInstance ? currentBranch.waInstance : 'wa1',
    massageType: "",
    masterName: "",
    notes: "",
    discount: 0,
    finalPrice: 0,
  });
  
  // Для отладки - проверяем значения при инициализации
  useEffect(() => {
    console.log("CreateClientDialog initialized with branch:", 
      currentBranch && currentBranch.waInstance ? currentBranch.waInstance : 'wa1',
      "currentBranch:", currentBranch);
  }, []);
  
  // При открытии диалога обновляем филиал
  useEffect(() => {
    if (isOpen) {
      console.log("Диалог создания клиента открыт");
      
      try {
        // Обновляем филиал при каждом открытии
        const currentInstanceId = currentBranch && currentBranch.waInstance ? currentBranch.waInstance : 'wa1';
        
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
    queryKey: ['${import.meta.env.VITE_BACKEND_URL}/api/masters'],
    enabled: isOpen,
  });
  
  // Список услуг
  const { data: massageServices, isLoading: isLoadingServices } = useQuery<MassageService[]>({
    queryKey: ['${import.meta.env.VITE_BACKEND_URL}/api/public/massage-services'],
    enabled: isOpen,
  });
  
  // Доступные длительности для выбранного типа услуги
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  
  const { data: massageDurations, isLoading: isLoadingDurations } = useQuery<MassageDurationsResponse>({
    queryKey: ['${import.meta.env.VITE_BACKEND_URL}/api/massage-services/durations', formData.massageType],
    enabled: !!formData.massageType && isOpen,
    queryFn: async () => {
      if (!formData.massageType) return null;
      
      const res = await fetch('${import.meta.env.VITE_BACKEND_URL}/api/massage-services/durations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ massageType: formData.massageType }),
      });
      if (!res.ok) return null;
      
      return res.json();
    }
  });
  
  // Устанавливаем длительность по умолчанию, когда данные загружены
  useEffect(() => {
    if (massageDurations && massageDurations.availableDurations && 
        (!selectedDuration || 
         !massageDurations.availableDurations.some((d: DurationOption) => d.duration === selectedDuration))) {
      setSelectedDuration(massageDurations.defaultDuration);
    }
  }, [massageDurations, selectedDuration]);

  // Автоматически рассчитываем цену при изменении типа услуги или длительности
  useEffect(() => {
    if (massageDurations && selectedDuration) {
      const selectedOption = massageDurations.availableDurations.find((d: DurationOption) => d.duration === selectedDuration);
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
  }, [massageDurations, selectedDuration, formData.discount]);
  
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
        massageType: formData.massageType,
        masterName: formData.masterName,
        notes: formData.notes,
        scheduleDate: dateTime.date,
        scheduleTime: dateTime.time,
        duration: selectedDuration,
        createAsCard: true, // Это новая карточка, созданная вручную
      };
      
      console.log("Отправляем данные для создания клиента:", payload);
      
      // Отправляем запрос на создание клиента
      const response = await fetch('${import.meta.env.VITE_BACKEND_URL}/api/clients', {
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
          const selectedOption = massageDurations?.availableDurations.find((d: DurationOption) => d.duration === selectedDuration);
          const massagePrice = selectedOption ? selectedOption.price : 0;
          
          const taskPayload = {
            clientId: clientId,
            status: 'new', // Статус "Неразобранные"
            massageType: formData.massageType,
            scheduleDate: dateTime.date || null,
            scheduleTime: dateTime.time || null,
            masterName: formData.masterName || null,
            notes: formData.notes || null,
            branchId: formData.branchId,
            source: 'manual', // Вручную созданная задача
            massageDuration: selectedDuration,
            massagePrice: massagePrice, // Базовая цена услуги
            discount: formData.discount,
            finalPrice: formData.finalPrice // Цена с учетом скидки
          };
          
          console.log("Создаем задачу для клиента:", taskPayload);
          
          // Отправляем запрос на создание задачи
          const taskResponse = await fetch('${import.meta.env.VITE_BACKEND_URL}/api/tasks', {
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
        branchId: currentBranch?.waInstance || 'wa1',
        massageType: "",
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
          branchId: currentBranch && currentBranch.waInstance ? currentBranch.waInstance : 'wa1'
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
    <Button 
      onClick={() => {
        console.log("Открываем диалог создания клиента");
        // Устанавливаем текущий филиал при открытии диалога
        try {
          // Инициализация формы при открытии
          setFormData(prev => ({
            ...prev,
            branchId: currentBranch && currentBranch.waInstance ? currentBranch.waInstance : 'wa1'
          }));
          console.log("Филиал для нового клиента:", currentBranch?.waInstance || 'wa1');
          
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
      className="mb-6"
    >
      <UserPlus className="h-4 w-4 mr-2" />
      Создать клиента
      
      <Dialog open={isOpen} onOpenChange={(open) => {
        console.log("Изменение состояния диалога создания клиента:", open);
        setIsOpen(open);
      }}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Создать нового клиента</DialogTitle>
              <DialogDescription>
                Введите данные клиента для создания новой карточки
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="clientName" className="col-span-1">Имя клиента</Label>
                <Input
                  id="clientName"
                  name="clientName"
                  className="col-span-3"
                  value={formData.clientName}
                  onChange={(e) => setFormData({...formData, clientName: e.target.value})}
                  placeholder="Введите имя клиента"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="phoneNumber" className="col-span-1">Телефон</Label>
                <Input
                  id="phoneNumber"
                  name="phoneNumber"
                  className="col-span-3"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                  placeholder="Введите номер телефона"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="branchId" className="col-span-1">Филиал</Label>
                <div className="col-span-3">
                  <Select
                    name="branchId"
                    value={formData.branchId}
                    onValueChange={(value) => setFormData({...formData, branchId: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите филиал" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="wa1">Токтогула 93</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="massageType" className="col-span-1">Тип услуги</Label>
                <div className="col-span-3">
                  <Select
                    name="massageType"
                    value={formData.massageType}
                    onValueChange={(value) => setFormData({...formData, massageType: value})}
                    disabled={isLoadingServices}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите тип услуги" />
                    </SelectTrigger>
                    <SelectContent>
                      {massageServices?.map((service) => (
                        <SelectItem key={service.id} value={service.name}>
                          {service.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="duration" className="col-span-1">Длительность</Label>
                <div className="col-span-3">
                  <Select
                    name="duration"
                    value={selectedDuration?.toString() || ""}
                    onValueChange={(value) => setSelectedDuration(Number(value))}
                    disabled={isLoadingDurations || !formData.massageType}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите длительность" />
                    </SelectTrigger>
                    <SelectContent>
                      {massageDurations?.availableDurations?.map((duration: DurationOption) => (
                        <SelectItem key={duration.duration} value={duration.duration.toString()}>
                          {duration.duration} мин - {duration.price} сом
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="masterName" className="col-span-1">Мастер</Label>
                <div className="col-span-3">
                  <Select
                    name="masterName"
                    value={formData.masterName}
                    onValueChange={(value) => setFormData({...formData, masterName: value})}
                    disabled={isLoadingMasters}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите мастера" />
                    </SelectTrigger>
                    <SelectContent>
                      {mastersData?.map((master) => (
                        <SelectItem key={master.id} value={master.name}>
                          {master.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="date" className="col-span-1">Дата</Label>
                <div className="col-span-3">
                  <Input
                    id="date"
                    name="date"
                    type="date"
                    className="col-span-3"
                    value={dateTime.date}
                    onChange={(e) => setDateTime({...dateTime, date: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="time" className="col-span-1">Время</Label>
                <div className="col-span-3">
                  <Input
                    id="time"
                    name="time"
                    type="time"
                    className="col-span-3"
                    value={dateTime.time}
                    onChange={(e) => setDateTime({...dateTime, time: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="discount" className="col-span-1">Скидка (%)</Label>
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
                      const selectedDurationOption = massageDurations?.availableDurations?.find((d: DurationOption) => d.duration === selectedDuration);
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
                <Label htmlFor="finalPrice" className="col-span-1">Итоговая цена</Label>
                <Input
                  id="finalPrice"
                  name="finalPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  className="col-span-3"
                  value={formData.finalPrice}
                  onChange={(e) => setFormData({...formData, finalPrice: parseFloat(e.target.value) || 0})}
                  placeholder="Введите итоговую цену"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="notes" className="col-span-1">Примечания</Label>
                <Input
                  id="notes"
                  name="notes"
                  className="col-span-3"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Дополнительная информация"
                />
              </div>
            </div>
            
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Отмена</Button>
              </DialogClose>
              <Button 
                type="submit"
                disabled={createClientMutation.isPending}
              >
                {createClientMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Создать клиента
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Button>
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
    { id: 'wa1', label: 'WhatsApp Токтогула (wa1)' },
    { id: 'telegram', label: 'Telegram' },
    { id: 'instagram', label: 'Instagram' },
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
            className="flex items-center gap-1"
          >
            <Filter className="w-4 h-4" />
            Фильтр по интеграциям
            {selectedIntegrations.length > 0 && (
              <span className="ml-1 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
                {selectedIntegrations.length}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel>Выберите интеграции</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {integrations.map((integration) => (
            <DropdownMenuCheckboxItem
              key={integration.id}
              checked={selectedIntegrations.includes(integration.id as IntegrationType)}
              onCheckedChange={() => toggleIntegration(integration.id as IntegrationType)}
              className="cursor-pointer"
            >
              {integration.label}
            </DropdownMenuCheckboxItem>
          ))}
          
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={resetIntegrations}
            className="cursor-pointer text-center font-medium text-red-500 hover:text-red-600"
          >
            Сбросить фильтры
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
    queryKey: ['${import.meta.env.VITE_BACKEND_URL}/api/tasks', activeTab, currentBranch.waInstance],
    queryFn: async () => {
      const url = activeTab === 'all' 
        ? '${import.meta.env.VITE_BACKEND_URL}/api/tasks' 
        : `${import.meta.env.VITE_BACKEND_URL}/api/tasks?status=${activeTab}`;
      
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
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-semibold text-gray-900">CRM - Управление задачами</h1>
        <CreateClientDialog onClientCreated={refreshTasks} />
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
        <TabsList className="grid grid-cols-6 w-full sm:w-[720px]">
          <TabsTrigger value="new">Новые</TabsTrigger>
          <TabsTrigger value="scheduled">Записанные</TabsTrigger>
          <TabsTrigger value="in_progress">В процессе</TabsTrigger>
          <TabsTrigger value="completed">Обслуженные</TabsTrigger>
          <TabsTrigger value="cancelled">Отмененные</TabsTrigger>
          <TabsTrigger value="regular">Постоянные</TabsTrigger>
        </TabsList>
      </Tabs>
      
      {/* Элементы управления сортировкой */}
      <div className="flex flex-wrap justify-between items-center mb-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium mr-2">Сортировка:</span>
          
          <Button 
            variant={sortType === 'date' ? "default" : "outline"}
            size="sm"
            onClick={() => handleSortTypeChange('date')}
            className="flex items-center gap-1 mr-2"
          >
            <CalendarIcon className="w-4 h-4" />
            По дате
            {sortType === 'date' && (
              <ChevronDown className={`w-4 h-4 transition-transform ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
            )}
          </Button>
          
          <Button 
            variant={sortType === 'master' ? "default" : "outline"}
            size="sm"
            onClick={() => handleSortTypeChange('master')}
            className="flex items-center gap-1 mr-2"
          >
            <User className="w-4 h-4" />
            По мастеру
            {sortType === 'master' && (
              <ChevronDown className={`w-4 h-4 transition-transform ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
            )}
          </Button>
          
          {/* Фильтр по интеграциям */}
          <div className="ml-2">
            <IntegrationsFilter 
              selectedIntegrations={selectedIntegrations}
              setSelectedIntegrations={setSelectedIntegrations}
            />
          </div>
        </div>
        

      </div>
      
      {isLoading ? (
        <div className="flex justify-center my-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : isError ? (
        <div className="bg-red-50 p-4 rounded-lg text-red-800 my-4">
          Ошибка при загрузке задач. Пожалуйста, попробуйте обновить страницу.
        </div>
      ) : tasks?.length === 0 ? (
        <div className="bg-gray-50 p-8 rounded-lg text-center my-8">
          <h3 className="text-lg font-medium mb-2">Нет задач с этим статусом</h3>
          <p className="text-gray-600">
            Задачи будут появляться здесь, когда клиенты будут писать в мессенджеры.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
