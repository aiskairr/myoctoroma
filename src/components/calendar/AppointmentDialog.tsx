import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Pencil, 
  CheckCircle, 
  XCircle,
  Trash2,
  ListTodo,
  ExternalLink,
  CreditCard,
  Save
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { Appointment, calendarService, ClientTask } from '@/services/calendar-service';
import axios from 'axios';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AppointmentDialogProps {
  appointment: Appointment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
  masters?: any[];
}

export const AppointmentDialog: React.FC<AppointmentDialogProps> = ({ appointment, open, onOpenChange }) => {
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [masters, setMasters] = useState<any[]>([]);
  const [clientTask, setClientTask] = useState<ClientTask | null>(null);
  const [additionalServices, setAdditionalServices] = useState<any[]>([]);
  const [serviceServices, setserviceServices] = useState<any[]>([]);
  
  // Определение типа для редактируемых полей
  interface EditedAppointmentData {
    client_name: string;
    service_type: string;
    master_name: string;
    price: number;
    start_time: string;
    end_time: string;
    duration: number;
    notes: string;
  }
  
  // Состояния для редактируемых полей
  const [editedData, setEditedData] = useState<EditedAppointmentData>({
    client_name: '',
    service_type: '',
    master_name: '',
    price: 0,
    start_time: '',
    end_time: '',
    duration: 0,
    notes: ''
  });
  
  // Загрузка данных задачи при открытии диалога
  useEffect(() => {
    if (appointment && appointment.is_from_task && open) {
      loadClientTask(appointment.id);
      loadMasters();
      loadAdditionalServices(appointment.id);
      loadserviceServices();
    }
    
    // Инициализация формы при открытии диалога
    if (appointment && open) {
      setEditedData({
        client_name: appointment.client_name,
        service_type: appointment.service_type,
        master_name: appointment.master_name,
        price: appointment.price,
        start_time: appointment.start_time,
        end_time: appointment.end_time,
        duration: appointment.duration || 60,
        notes: appointment.notes || ''
      });
    }
  }, [appointment, open]);
  
  // Загрузка списка мастеров
  const loadMasters = async () => {
    try {
      const mastersData = await calendarService.getMasters();
      setMasters(mastersData);
    } catch (error) {
      console.error('Error loading masters:', error);
    }
  };
  
  // Загрузка данных задачи клиента
  const loadClientTask = async (taskId: number) => {
    try {
      const task = await calendarService.getClientTask(taskId);
      setClientTask(task);
    } catch (error) {
      console.error('Error loading client task:', error);
      toast({
        title: "Ошибка загрузки",
        description: "Не удалось загрузить данные задачи клиента",
        variant: "destructive",
      });
    }
  };

  // Загрузка дополнительных услуг для записи
  const loadAdditionalServices = async (taskId: number) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/tasks/${taskId}/additional-services`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const services = await response.json();
        setAdditionalServices(services);
      }
    } catch (error) {
      console.error('Error loading additional services:', error);
    }
  };

  // Загрузка списка массажных услуг
  const loadserviceServices = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/public/service-services`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const services = await response.json();
        setserviceServices(services);
      }
    } catch (error) {
      console.error('Error loading service services:', error);
    }
  };

  // Добавление дополнительной услуги
  const addAdditionalService = async (serviceType: string, duration: number = 60) => {
    if (!appointment) return;
    
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/tasks/${appointment.id}/additional-services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          serviceType,
          duration
        })
      });

      if (response.ok) {
        const newService = await response.json();
        setAdditionalServices(prev => [...prev, newService]);
        
        // Пересчитываем общие данные
        await recalculateTaskTotals();
        
        toast({
          title: "Услуга добавлена",
          description: `Дополнительная услуга "${serviceType}" добавлена`
        });
      }
    } catch (error) {
      console.error('Error adding additional service:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось добавить дополнительную услугу",
        variant: "destructive"
      });
    }
  };

  // Удаление дополнительной услуги
  const removeAdditionalService = async (serviceId: number) => {
    if (!appointment) return;
    
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/tasks/${appointment.id}/additional-services/${serviceId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        setAdditionalServices(prev => prev.filter(s => s.id !== serviceId));
        
        // Пересчитываем общие данные
        await recalculateTaskTotals();
        
        toast({
          title: "Услуга удалена",
          description: "Дополнительная услуга удалена"
        });
      }
    } catch (error) {
      console.error('Error removing additional service:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить дополнительную услугу",
        variant: "destructive"
      });
    }
  };

  // Пересчет общих данных (стоимость и длительность)
  const recalculateTaskTotals = async () => {
    if (!appointment) return;
    
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/tasks/${appointment.id}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const updatedTask = await response.json();
        // Обновляем отображаемые данные
        setEditedData(prev => ({
          ...prev,
          price: updatedTask.final_price || updatedTask.service_price || 0,
          duration: updatedTask.service_duration || 60,
          end_time: updatedTask.end_time || prev.end_time
        }));
      }
    } catch (error) {
      console.error('Error recalculating totals:', error);
    }
  };
  
  // Определяем цвет и стиль для статуса
  const getStatusStyles = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'booked':
      case 'scheduled':
        return { variant: 'secondary' as const, label: 'Записан' };
      case 'completed':
        return { variant: 'success' as const, label: 'Выполнен' };
      case 'canceled':
        return { variant: 'destructive' as const, label: 'Отменен' };
      default:
        return { variant: 'outline' as const, label: status };
    }
  };
  
  // Обработчик изменения статуса записи
  const handleStatusChange = async (newStatus: string) => {
    if (!appointment) return;
    
    setIsUpdating(true);
    
    try {
      // Если задача из карточки клиента
      if (appointment.is_from_task) {
        await calendarService.updateClientTask(appointment.id, { 
          status: newStatus 
        });
      } else {
        await calendarService.updateAppointment(appointment.id, {
          status: newStatus
        });
      }
      
      toast({
        title: "Статус обновлен",
        description: `Запись изменена на статус "${getStatusStyles(newStatus).label}"`,
      });
      
      // Закрываем диалог
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast({
        title: "Ошибка обновления",
        description: error.message || "Не удалось обновить статус",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };
  
  // Обработчик удаления записи
  const handleDelete = async () => {
    if (!appointment) return;
    
    if (window.confirm("Вы уверены, что хотите удалить эту запись? Это действие невозможно отменить.")) {
      setIsUpdating(true);
      
      try {
        await calendarService.deleteAppointment(appointment.id);
        
        toast({
          title: "Запись удалена",
          description: "Запись успешно удалена из календаря",
        });
        
        // Закрываем диалог
        onOpenChange(false);
      } catch (error: any) {
        console.error('Error deleting appointment:', error);
        toast({
          title: "Ошибка удаления",
          description: error.message || "Не удалось удалить запись",
          variant: "destructive",
        });
      } finally {
        setIsUpdating(false);
      }
    }
  };
  
  // Автоматическое сохранение изменений в базу данных
  const autoSaveChanges = async (fieldName: string, newValue: any) => {
    if (!appointment) return;
    
    try {
      // Если задача из карточки клиента
      if (appointment.is_from_task) {
        // Формируем данные для обновления только измененного поля
        const taskUpdateData: any = {};
        
        // Маппинг полей формы к полям API
        switch (fieldName) {
          case 'service_type':
            taskUpdateData.serviceType = newValue;
            break;
          case 'start_time':
            taskUpdateData.scheduleTime = newValue;
            break;
          case 'end_time':
            taskUpdateData.endTime = newValue;
            break;
          case 'master_name':
            taskUpdateData.masterName = newValue;
            break;
          case 'price':
            taskUpdateData.servicePrice = newValue;
            break;
          case 'duration':
            taskUpdateData.serviceDuration = newValue;
            break;
          case 'notes':
            taskUpdateData.notes = newValue;
            break;
          case 'client_name':
            taskUpdateData.clientName = newValue;
            break;
        }
        
        await calendarService.updateClientTask(appointment.id, taskUpdateData);
        
        console.log(`Auto-saved field ${fieldName} with value:`, newValue);
      }
    } catch (error: any) {
      console.error('Error auto-saving changes:', error);
      // Показываем уведомление об ошибке только для критичных полей
      if (fieldName === 'start_time' || fieldName === 'master_name' || fieldName === 'service_type') {
        toast({
          title: "Ошибка сохранения",
          description: `Не удалось сохранить изменения в поле "${fieldName}"`,
          variant: "destructive",
        });
      }
    }
  };

  // Обработчик изменения поля с автосохранением
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    let processedValue: any = value;
    
    // Специальная обработка для числовых полей
    if (name === 'price' || name === 'duration') {
      const numericValue = parseInt(value) || 0;
      processedValue = numericValue;
      setEditedData((prev: any) => ({
        ...prev,
        [name]: numericValue
      }));
    } else {
      setEditedData((prev: any) => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Если изменяется время начала или длительность, пересчитать время окончания
    if (name === 'start_time' || name === 'duration') {
      let newEndTime = '';
      
      if (name === 'start_time' && editedData.duration) {
        // Рассчитываем время окончания на основе времени начала и длительности
        const [hours, minutes] = value.split(':').map(Number);
        const totalMinutes = hours * 60 + minutes + editedData.duration;
        const endHours = Math.floor(totalMinutes / 60) % 24;
        const endMinutes = totalMinutes % 60;
        newEndTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
        
        setEditedData((prev: any) => ({
          ...prev,
          end_time: newEndTime
        }));
      } else if (name === 'duration' && editedData.start_time) {
        // Рассчитываем время окончания на основе времени начала и новой длительности
        const timeParts = editedData.start_time.split(':');
        const hours = parseInt(timeParts[0]) || 0;
        const minutes = parseInt(timeParts[1]) || 0;
        const numericDuration = typeof processedValue === 'number' ? processedValue : parseInt(processedValue.toString()) || 0;
        const totalMinutes = hours * 60 + minutes + numericDuration;
        const endHours = Math.floor(totalMinutes / 60) % 24;
        const endMinutes = totalMinutes % 60;
        newEndTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
        
        setEditedData((prev: any) => ({
          ...prev,
          end_time: newEndTime
        }));
      }
    }
    

  };
  
  // Обработчик выбора мастера
  const handleMasterSelect = (value: string) => {
    const selectedMaster = masters.find(m => m.id.toString() === value);
    
    if (selectedMaster) {
      setEditedData((prev: any) => ({
        ...prev,
        master_name: selectedMaster.name
      }));
    }
  };
  
  // Обработчик сохранения изменений
  const handleSaveChanges = async () => {
    if (!appointment) return;
    
    setIsUpdating(true);
    
    try {
      // Если задача из карточки клиента
      if (appointment.is_from_task) {
        // Формируем данные для обновления задачи клиента
        const taskUpdateData = {
          serviceType: editedData.service_type,
          scheduleTime: editedData.start_time,
          endTime: editedData.end_time,
          masterName: editedData.master_name,
          servicePrice: editedData.price,
          serviceDuration: editedData.duration,
          notes: editedData.notes
        };
        
        await calendarService.updateClientTask(appointment.id, taskUpdateData);
      } else {
        // Формируем данные для обновления записи в календаре
        const appointmentUpdateData = {
          service_type: editedData.service_type,
          start_time: editedData.start_time,
          end_time: editedData.end_time,
          master_name: editedData.master_name,
          price: editedData.price,
          duration: editedData.duration,
          notes: editedData.notes
        };
        
        await calendarService.updateAppointment(appointment.id, appointmentUpdateData);
      }
      
      toast({
        title: "Запись обновлена",
        description: "Данные записи успешно обновлены",
      });
      
      // Выходим из режима редактирования
      setIsEditing(false);
      
      // Закрываем диалог для обновления данных
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating appointment:', error);
      toast({
        title: "Ошибка обновления",
        description: error.message || "Не удалось обновить данные записи",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (!appointment) return null;
  
  const statusStyle = getStatusStyles(appointment.status);
  const isFromTask = appointment.is_from_task === true;
  
  return (
    <Dialog open={open} onOpenChange={open => {
      // Сбрасываем режим редактирования при закрытии
      if (!open) setIsEditing(false);
      onOpenChange(open);
    }}>
      <DialogContent className={isEditing ? "sm:max-w-lg" : "sm:max-w-md"}>
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center">
              {isFromTask ? (
                <>
                  <ListTodo className="h-4 w-4 mr-2 text-amber-500" />
                  <span>Задача из карточки клиента</span>
                </>
              ) : (
                <span>Детали записи</span>
              )}
            </div>
            <Badge variant={statusStyle.variant}>
              {statusStyle.label}
            </Badge>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Просмотр и редактирование деталей записи клиента
          </DialogDescription>
        </DialogHeader>
        
        {isFromTask && !isEditing && (
          <div className="bg-amber-50 text-amber-800 p-3 rounded-md text-sm mb-4">
            <p className="flex items-center mb-2">
              <ListTodo className="h-4 w-4 mr-1" />
              <span className="font-medium">Карточка клиента</span>
            </p>
            <p>Это задача из карточки клиента. Все изменения будут сохранены в карточке клиента.</p>
          </div>
        )}
        

        
        {isEditing ? (
          // Форма редактирования
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="client_name">Имя клиента</Label>
                <Input 
                  id="client_name" 
                  name="client_name" 
                  value={editedData.client_name} 
                  onChange={handleChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="service_type">Тип массажа</Label>
                <Input 
                  id="service_type" 
                  name="service_type" 
                  value={editedData.service_type} 
                  onChange={handleChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="master_name">Мастер</Label>
                {masters.length > 0 ? (
                  <Select 
                    onValueChange={handleMasterSelect}
                    value={masters.find(m => m.name === editedData.master_name)?.id.toString() || ''}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите мастера" />
                    </SelectTrigger>
                    <SelectContent>
                      {masters.map(master => (
                        <SelectItem key={master.id} value={master.id.toString()}>
                          {master.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input 
                    id="master_name" 
                    name="master_name" 
                    value={editedData.master_name} 
                    onChange={handleChange}
                  />
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="price">Стоимость (KGS)</Label>
                <Input 
                  id="price" 
                  name="price" 
                  type="number" 
                  value={editedData.price} 
                  onChange={handleChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="start_time">Время начала</Label>
                <Input 
                  id="start_time" 
                  name="start_time" 
                  type="time" 
                  value={editedData.start_time} 
                  onChange={handleChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="duration">Длительность (мин)</Label>
                <Input 
                  id="duration" 
                  name="duration" 
                  type="number" 
                  value={editedData.duration} 
                  onChange={handleChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="end_time">Время окончания</Label>
                <Input 
                  id="end_time" 
                  name="end_time" 
                  type="time" 
                  value={editedData.end_time} 
                  onChange={handleChange}
                  disabled
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Заметки</Label>
              <Textarea 
                id="notes" 
                name="notes" 
                value={editedData.notes} 
                onChange={handleChange}
                rows={3}
              />
            </div>

            {/* Дополнительные услуги */}
            <div className="border-t pt-4 mt-4">
              <Label className="block font-semibold text-gray-700 text-sm mb-3">Дополнительные услуги</Label>
              
              {additionalServices.length > 0 && (
                <div className="space-y-2 mb-3">
                  {additionalServices.map((service) => (
                    <div key={service.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                      <span className="font-medium">{service.service_type}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-600">{service.service_duration} мин</span>
                        <span className="font-semibold">{service.final_price} сом</span>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => removeAdditionalService(service.id)}
                          className="h-7 w-7 p-0 text-red-500 hover:bg-red-100"
                        >
                          ×
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Select
                    value=""
                    onValueChange={(serviceType) => {
                      if (serviceType) {
                        addAdditionalService(serviceType, 60);
                      }
                    }}
                  >
                    <SelectTrigger className="w-full text-sm">
                      <SelectValue placeholder="Добавить дополнительную услугу" />
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
            </div>
            
            <div className="flex justify-end space-x-2 mt-4">
              <Button 
                variant="outline" 
                onClick={() => setIsEditing(false)}
                disabled={isUpdating}
              >
                Готово
              </Button>
            </div>
          </div>
        ) : (
          // Режим просмотра
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">{appointment.service_type}</h3>
              <p className="text-sm text-muted-foreground">
                {appointment.notes || "Без дополнительных заметок"}
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center">
                <User className="h-4 w-4 mr-2 text-primary" />
                <span className="text-sm font-medium">Клиент:</span>
                <span className="text-sm ml-2">{appointment.client_name}</span>
              </div>
              
              <div className="flex items-center">
                <User className="h-4 w-4 mr-2 text-primary" />
                <span className="text-sm font-medium">Мастер:</span>
                <span className="text-sm ml-2">{appointment.master_name || 'Не назначен'}</span>
              </div>
              
              <div className="flex items-center">
                <CalendarIcon className="h-4 w-4 mr-2 text-primary" />
                <span className="text-sm font-medium">Дата:</span>
                <span className="text-sm ml-2">
                  {format(
                    parseISO(appointment.appointment_date),
                    'dd MMMM yyyy (EEEE)',
                    { locale: ru }
                  )}
                </span>
              </div>
              
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2 text-primary" />
                <span className="text-sm font-medium">Время:</span>
                <span className="text-sm ml-2">
                  {appointment.start_time} - {appointment.end_time}
                </span>
              </div>
              
              <div className="flex items-center">
                <CreditCard className="h-4 w-4 mr-2 text-primary" />
                <span className="text-sm font-medium">Стоимость:</span>
                <span className="text-sm ml-2">{appointment.price} KGS</span>
              </div>
              
              {appointment.duration && (
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-primary" />
                  <span className="text-sm font-medium">Длительность:</span>
                  <span className="text-sm ml-2">{appointment.duration} минут</span>
                </div>
              )}
            </div>
          </div>
        )}
        
        {isEditing && (
          <DialogFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setIsEditing(false)}
              disabled={isUpdating}
            >
              Отмена
            </Button>
            <Button
              variant="default"
              onClick={handleSaveChanges}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <>
                  <span className="h-4 w-4 mr-1 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                  Сохранение...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-1" />
                  Сохранить изменения
                </>
              )}
            </Button>
          </DialogFooter>
        )}
        
        {!isEditing && (
          <DialogFooter className="flex justify-between">
            <div className="flex space-x-2">
              {/* Общая кнопка "к карточке" для обоих типов записей */}
              <Button
                size="sm"
                variant="secondary"
                onClick={() => window.location.href = `/CRMTasks?id=${appointment.is_from_task ? appointment.id : appointment.client_id}`}
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                К карточке
              </Button>
              
              {/* Кнопка редактирования */}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditing(true)}
                disabled={isUpdating}
              >
                <Pencil className="h-4 w-4 mr-1" />
                Изменить
              </Button>
              
              {/* Кнопки изменения статуса */}
              {appointment.status.toLowerCase() === 'booked' || 
               appointment.status.toLowerCase() === 'scheduled' ? (
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => handleStatusChange('completed')}
                  disabled={isUpdating}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Выполнено
                </Button>
              ) : null}
              
              {appointment.status.toLowerCase() === 'completed' && (
                <Button 
                  size="sm" 
                  variant="secondary"
                  onClick={() => handleStatusChange(isFromTask ? 'scheduled' : 'booked')}
                  disabled={isUpdating}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Не выполнено
                </Button>
              )}
            </div>
            
            {!isFromTask && (
              <Button 
                size="sm" 
                variant="destructive"
                onClick={handleDelete}
                disabled={isUpdating}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Удалить
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AppointmentDialog;