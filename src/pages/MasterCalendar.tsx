import { useState, useEffect, useMemo } from "react";
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
import { format, parseISO, addMinutes, isSameDay, addDays, subDays, isToday } from "date-fns";
import { ru } from "date-fns/locale";
import { Loader2, Edit, X, User, Clock, MapPin, CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";

// Интерфейсы
interface Master {
  id: number;
  name: string;
  specialization?: string;
  isActive: boolean;
  startWorkHour?: string;
  endWorkHour?: string;
  branchId: string;
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
  scheduleDate: string;
  scheduleTime: string;
  endTime?: string;
  masterName?: string;
  notes?: string;
  branchId: string;
  source?: string;
  serviceDuration?: number;
  servicePrice?: number;
  discount?: number;
  finalPrice?: number;
  paymentMethod?: string;
  paid?: string;
  createdAt: string;
  updatedAt: string;
  serviceServiceId?: number;
  additionalServices?: Array<{
    id: number;
    name: string;
    duration: number;
    price: number;
  }>;
  mother?: number;
  clientName?: string;
  clientPhone?: string;
}

const timeSlots = Array.from({ length: 52 }, (_, i) => {
  const hour = Math.floor(i / 4) + 10;
  const minute = (i % 4) * 15;
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}).filter((time) => {
  const hour = parseInt(time.split(":")[0]);
  return hour >= 10 && hour < 22;
});

const statusColors = {
  new: "bg-orange-100 text-orange-800",
  scheduled: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  regular: "bg-purple-100 text-purple-800",
};

const statusLabels = {
  new: "Новая",
  scheduled: "Записан",
  in_progress: "В процессе",
  completed: "Завершено",
  cancelled: "Отменено",
  regular: "Постоянная",
};

export default function MasterCalendar() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Получение пользователя для проверки роли
  const { data: user } = useQuery<{
    id: number;
    email: string;
    username: string;
    role: string;
    instanceId: string;
    master_id: number;
  }>({
    queryKey: ["${import.meta.env.VITE_BACKEND_URL}/api/user"],
    retry: false,
  });

  // Перенаправление если пользователь не мастер
  useEffect(() => {
    if (user && user.role !== 'master') {
      window.location.href = '/';
    }
  }, [user]);

  const dateString = format(selectedDate, "yyyy-MM-dd");

  // Для календаря мастеров показываем только текущего мастера
  const masters = user && user.role === 'master' ? [{
    id: user.master_id,
    name: user.username,
    specialization: 'Мастер',
    isActive: true,
    branchId: user.instanceId || ''
  }] : [];
  const mastersLoading = false;

  // Загрузка задач только для мастера
  const { data: tasks = [], isLoading: tasksLoading, refetch: refetchTasks } = useQuery({
    queryKey: ["${import.meta.env.VITE_BACKEND_URL}/api/crm/tasks-master-calendar"],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/crm/tasks-master-calendar?date=${dateString}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('Failed to fetch tasks:', response.status, response.statusText, errorData);
        
        if (response.status === 401) {
          // Показываем сообщение об ошибке аутентификации
          toast({
            title: "Ошибка аутентификации",
            description: errorData.message || "Вы должны войти в систему как мастер",
            variant: "destructive",
          });
          // Перенаправляем на страницу входа
          window.location.href = '/login';
        } else if (response.status === 403) {
          // Показываем сообщение об ошибке доступа
          toast({
            title: "Доступ запрещен",
            description: errorData.message || "Доступ разрешен только для мастеров",
            variant: "destructive",
          });
        }
        
        return []; // Возвращаем пустой массив при ошибке
      }
      
      const data = await response.json();
      return Array.isArray(data) ? data : []; // Убеждаемся что возвращаем массив
    },
    enabled: !!user && user.role === 'master',
  });

  // Мутация обновления задачи
  const updateTaskMutation = useMutation({
    mutationFn: async (updatedTask: Partial<Task> & { id: number }) => {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/crm/tasks/${updatedTask.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updatedTask),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update task");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["${import.meta.env.VITE_BACKEND_URL}/api/crm/tasks-master-calendar"] });
      toast({ title: "Запись успешно обновлена" });
      setEditDialogOpen(false);
      setEditingTask(null);
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Failed to update task",
        variant: "destructive",
      });
    },
  });

  // Обработчик сохранения изменений
  const handleSaveEdit = () => {
    if (!editingTask) return;

    const updatedData = {
      id: editingTask.id,
      status: editingTask.status,
      serviceType: editingTask.serviceType,
      scheduleDate: editingTask.scheduleDate,
      scheduleTime: editingTask.scheduleTime,
      masterName: editingTask.masterName,
      notes: editingTask.notes,
      serviceDuration: editingTask.serviceDuration,
      servicePrice: editingTask.servicePrice,
      discount: editingTask.discount,
      finalPrice: editingTask.finalPrice,
    };

    updateTaskMutation.mutate(updatedData);
  };

  // Определение текущего времени для индикатора
  const currentTime = useMemo(() => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
  }, []);

  // Получение задач для конкретного слота времени (упрощенная версия для мастеров)
  const getTasksForSlot = (time: string) => {
    console.log(`[DEBUG] getTasksForSlot: time=${time}`);
    console.log(`[DEBUG] Total tasks:`, Array.isArray(tasks) ? tasks.length : 0);
    
    // Убеждаемся что tasks является массивом
    if (!Array.isArray(tasks)) {
      console.warn('[DEBUG] tasks is not an array:', tasks);
      return [];
    }
    
    return tasks.filter((task: Task) => {
      console.log(`[DEBUG] Checking task ${task.id}:`, {
        scheduleTime: task.scheduleTime,
        endTime: task.endTime,
        time: time
      });
      
      if (!task.scheduleTime) {
        console.log(`[DEBUG] Task ${task.id} rejected: no scheduleTime`);
        return false;
      }
      
      const taskStartTime = task.scheduleTime;
      const taskEndTime = task.endTime;

      if (!taskEndTime) {
        const matches = taskStartTime === time;
        console.log(`[DEBUG] Task ${task.id} (no endTime): ${taskStartTime} === ${time} ? ${matches}`);
        return matches;
      }

      const slotStart = new Date(`2000-01-01T${time}:00`);
      const taskStart = new Date(`2000-01-01T${taskStartTime}:00`);
      const taskEnd = new Date(`2000-01-01T${taskEndTime}:00`);

      const matches = slotStart >= taskStart && slotStart < taskEnd;
      console.log(`[DEBUG] Task ${task.id} (with endTime): ${taskStartTime}-${taskEndTime}, slot ${time} matches: ${matches}`);
      return matches;
    });
  };

  // Расчет продолжительности задачи в слотах (15-минутные слоты)
  const getTaskDurationInSlots = (task: Task) => {
    if (!task.endTime || !task.scheduleTime) return 1;

    const startTime = new Date(`2000-01-01T${task.scheduleTime}:00`);
    const endTime = new Date(`2000-01-01T${task.endTime}:00`);
    const durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
    
    return Math.max(1, Math.ceil(durationMinutes / 15));
  };

  // Проверка, является ли слот первым для задачи
  const isFirstSlotForTask = (task: Task, time: string) => {
    return task.scheduleTime === time;
  };

  // Обновление времени каждые 10 секунд
  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["${import.meta.env.VITE_BACKEND_URL}/api/crm/tasks-master-calendar"] });
    }, 10000);

    return () => clearInterval(interval);
  }, [queryClient]);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <div className="text-red-600">
            <X className="h-12 w-12 mx-auto mb-2" />
            <h2 className="text-lg font-semibold">Доступ запрещен</h2>
            <p className="text-gray-600">Вы должны войти в систему как мастер</p>
          </div>
          <Button 
            onClick={() => window.location.href = '/login'}
            className="mt-4"
          >
            Войти в систему
          </Button>
        </div>
      </div>
    );
  }

  if (user.role !== 'master') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <div className="text-orange-600">
            <User className="h-12 w-12 mx-auto mb-2" />
            <h2 className="text-lg font-semibold">Недостаточно прав</h2>
            <p className="text-gray-600">Эта страница доступна только для мастеров</p>
            <p className="text-sm text-gray-500">Ваша роль: {user.role}</p>
          </div>
          <Button 
            onClick={() => window.location.href = '/'}
            variant="outline"
            className="mt-4"
          >
            На главную
          </Button>
        </div>
      </div>
    );
  }

  console.log('[DEBUG] MasterCalendar render:', {
    user: user,
    masters: masters,
    mastersCount: masters?.length,
    tasks: tasks,
    tasksCount: tasks?.length,
    mastersLoading,
    tasksLoading
  });

  if (mastersLoading || tasksLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Загрузка календаря...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Заголовок */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Календарь мастера</h1>
          <p className="text-gray-600 mt-1">Ваши записи на сегодня</p>
        </div>
      </div>

      {/* Навигация по датам */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(subDays(selectedDate, 1))}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Предыдущий день
            </Button>
            
            <div className="text-center">
              <h2 className="text-xl font-semibold">
                {format(selectedDate, "d MMMM yyyy", { locale: ru })}
              </h2>
              <p className="text-sm text-gray-600">
                {format(selectedDate, "EEEE", { locale: ru })}
              </p>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(addDays(selectedDate, 1))}
            >
              Следующий день
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          <div className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              locale={ru}
              className="rounded-md border"
            />
          </div>
        </CardContent>
      </Card>

      {/* Календарная сетка */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Расписание на {format(selectedDate, "d MMMM", { locale: ru })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TooltipProvider>
            <div className="overflow-x-auto">
              <div 
                className="grid gap-1 min-w-full"
                style={{ 
                  gridTemplateColumns: `80px repeat(${masters.length}, minmax(200px, 1fr))`,
                }}
              >
                {/* Заголовки */}
                <div className="p-2 font-medium text-sm text-gray-700 border-b">
                  Время
                </div>
                {masters.map((master: Master) => (
                  <div key={master.id} className="p-2 border-b">
                    <div className="font-medium text-sm text-gray-900">{master.name}</div>
                    <div className="text-xs text-gray-500">{master.specialization}</div>
                  </div>
                ))}

                {/* Слоты времени */}
                {timeSlots.map((time) => (
                  <div key={`row-${time}`} className="contents">
                    {/* Время */}
                    <div className="p-2 text-sm text-gray-600 border-r border-b bg-gray-50 relative">
                      {time}
                      {isToday(selectedDate) && time <= currentTime && 
                       timeSlots[timeSlots.indexOf(time) + 1] > currentTime && (
                        <div 
                          className="absolute left-0 right-0 h-0.5 bg-blue-500 z-10"
                          style={{
                            top: `${((parseInt(currentTime.split(':')[1]) % 30) / 30) * 100}%`
                          }}
                        />
                      )}
                    </div>

                    {/* Ячейки для каждого мастера */}
                    {masters.map((master: any) => {
                      const tasksInSlot = getTasksForSlot(time);
                      const primaryTask = tasksInSlot.find((task: any) => isFirstSlotForTask(task, time));

                      console.log(`[DEBUG] Slot ${time}, Master ${master.name}:`, {
                        tasksInSlot: tasksInSlot.length,
                        primaryTask: !!primaryTask,
                        taskDetails: primaryTask ? {
                          id: primaryTask.id,
                          scheduleTime: primaryTask.scheduleTime,
                          endTime: primaryTask.endTime
                        } : null
                      });

                      return (
                        <div
                          key={`${time}-${master.id}`}
                          className="p-1 border-r border-b min-h-[40px] bg-white hover:bg-gray-50 transition-colors relative"
                        >
                          {/* Принудительное отображение для дебага */}
                          {tasksInSlot.length > 0 && !primaryTask && (
                            <div className="text-xs text-red-500 p-1">
                              Tasks: {tasksInSlot.length} (no primary)
                            </div>
                          )}
                          {primaryTask && (
                            <div
                              className={`
                                absolute inset-1 rounded-lg p-2 text-xs
                                ${statusColors[primaryTask.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}
                                cursor-pointer hover:shadow-md transition-shadow
                              `}
                              style={{
                                height: `${getTaskDurationInSlots(primaryTask) * 40 - 8}px`,
                                zIndex: 1,
                              }}
                              onClick={() => {
                                setEditingTask(primaryTask);
                                setEditDialogOpen(true);
                              }}
                            >
                              <div className="font-medium truncate">
                                {primaryTask.client?.customName || 
                                 `${primaryTask.client?.firstName || ''} ${primaryTask.client?.lastName || ''}`.trim() ||
                                 primaryTask.clientName ||
                                 'Клиент'}
                              </div>
                              <div className="text-xs opacity-75 truncate">
                                {primaryTask.serviceType}
                              </div>
                              <div className="text-xs opacity-75">
                                {primaryTask.serviceDuration}мин • {primaryTask.finalPrice || primaryTask.servicePrice}сом
                              </div>
                              <Badge 
                                variant="secondary" 
                                className="text-xs mt-1"
                              >
                                {statusLabels[primaryTask.status as keyof typeof statusLabels]}
                              </Badge>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </TooltipProvider>
        </CardContent>
      </Card>

      {/* Диалог редактирования */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Редактировать запись</DialogTitle>
            <DialogDescription>
              Изменить детали записи клиента
            </DialogDescription>
          </DialogHeader>
          
          {editingTask && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-status">Статус</Label>
                  <Select
                    value={editingTask.status}
                    onValueChange={(value) =>
                      setEditingTask({ ...editingTask, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">Новая</SelectItem>
                      <SelectItem value="scheduled">Записан</SelectItem>
                      <SelectItem value="in_progress">В процессе</SelectItem>
                      <SelectItem value="completed">Завершено</SelectItem>
                      <SelectItem value="cancelled">Отменено</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="edit-time">Время</Label>
                  <Input
                    id="edit-time"
                    type="time"
                    value={editingTask.scheduleTime}
                    onChange={(e) =>
                      setEditingTask({ ...editingTask, scheduleTime: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="edit-service">Тип массажа</Label>
                <Input
                  id="edit-service"
                  value={editingTask.serviceType || ""}
                  onChange={(e) =>
                    setEditingTask({ ...editingTask, serviceType: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-duration">Длительность (мин)</Label>
                  <Input
                    id="edit-duration"
                    type="number"
                    value={editingTask.serviceDuration || ""}
                    onChange={(e) =>
                      setEditingTask({ ...editingTask, serviceDuration: Number(e.target.value) })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="edit-price">Цена (сом)</Label>
                  <Input
                    id="edit-price"
                    type="number"
                    value={editingTask.servicePrice || ""}
                    onChange={(e) =>
                      setEditingTask({ ...editingTask, servicePrice: Number(e.target.value) })
                    }
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="edit-notes">Примечания</Label>
                <Textarea
                  id="edit-notes"
                  value={editingTask.notes || ""}
                  onChange={(e) =>
                    setEditingTask({ ...editingTask, notes: e.target.value })
                  }
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
            >
              Отмена
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={updateTaskMutation.isPending}
            >
              {updateTaskMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}