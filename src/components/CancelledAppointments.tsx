import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useBranch } from '@/contexts/BranchContext';
import { useAuth } from '@/contexts/SimpleAuthContext';
import { getBranchId } from '@/utils/branch-utils';
import { apiGetJson } from '@/lib/api';
import { format } from 'date-fns';
import { XCircle, Edit, Calendar, User, Clock, Phone, Search } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import { type TaskWithMaster, type TaskFromAPI } from '@/hooks/use-tasks';
import { useMasters } from '@/hooks/use-masters';

interface CancelledAppointmentsProps {
  trigger?: React.ReactNode;
  selectedDate?: Date; // Добавляем выбранную дату
}

export default function CancelledAppointments({ trigger, selectedDate }: CancelledAppointmentsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentBranch } = useBranch();
  const { user, isAuthenticated } = useAuth();
  
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskWithMaster | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter] = useState('all');
  const [dateFilter] = useState('all');

  // Получаем мастеров для присваивания имен
  const { data: mastersData = [] } = useMasters();

  // Мемоизируем даты для выбранного дня
  const dateRange = useMemo(() => {
    const targetDate = selectedDate || new Date();
    
    // Создаем диапазон для выбранного дня (с начала до конца дня)
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    return {
      scheduledAfter: startOfDay.toISOString(),
      scheduledBefore: endOfDay.toISOString()
    };
  }, [selectedDate]); // Зависимость от selectedDate
  
  const branchId = getBranchId(currentBranch);
  
  // Создаем параметры запроса
  const endpoint = useMemo(() => {
    const queryParams = new URLSearchParams();
    if (branchId) queryParams.append('branchId', branchId);
    queryParams.append('scheduledAfter', dateRange.scheduledAfter);
    queryParams.append('scheduledBefore', dateRange.scheduledBefore);
    queryParams.append('sortBy', 'scheduleDate');
    queryParams.append('sortOrder', 'desc');
    if (user?.role) queryParams.append('userRole', user.role);
    if (user?.master_id) queryParams.append('userMasterId', user.master_id.toString());
    
    return `/api/tasks?${queryParams.toString()}`;
  }, [branchId, dateRange.scheduledAfter, dateRange.scheduledBefore, user?.role, user?.master_id]);

  const { data: allTasksRaw = [], isLoading, refetch } = useQuery({
    queryKey: ['cancelled-tasks', endpoint],
    queryFn: async (): Promise<TaskFromAPI[]> => {
      const data = await apiGetJson<TaskFromAPI[]>(endpoint);
      
      // Проверяем формат ответа и возвращаем массив задач
      if (Array.isArray(data)) {
        return data;
      }
      
      // Если данные в другом формате, пытаемся извлечь массив
      if (data && typeof data === 'object' && 'tasks' in data) {
        return (data as any).tasks || [];
      }
      
      return [];
    },
    enabled: isOpen && !!branchId && isAuthenticated && !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Объединяем данные задач с информацией о мастерах
  const allTasks = useMemo(() => {
    if (!allTasksRaw.length) {
      return [];
    }

    // Создаем карту мастеров для быстрого поиска
    const mastersMap = new Map(mastersData.map(master => [master.id, master]));

    const mergedTasks: TaskWithMaster[] = allTasksRaw.map(task => {
      const master = task.masterId ? mastersMap.get(task.masterId) : null;
      const masterName = master ? master.name : null;
      
      // Вычисляем clientName для совместимости со старым кодом
      const clientName = task.client?.customName || 
                        task.client?.firstName || 
                        (task.client?.firstName && task.client?.lastName ? 
                          `${task.client.firstName} ${task.client.lastName}` : '') ||
                        'Клиент';
      
      const mergedTask: TaskWithMaster = {
        ...task,
        masterName, // Перезаписываем данными из masters API
        master,
        clientName // Добавляем вычисляемое поле
      };

      return mergedTask;
    });

    return mergedTasks;
  }, [allTasksRaw, mastersData]);
  
  // Фильтруем только отмененные записи
  const cancelledTasks = useMemo(() => {
    return allTasks.filter(task => task.status === 'cancelled' || task.status === 'no_show');
  }, [allTasks]);

  // Мутация для обновления записи
  const updateTaskMutation = useMutation({
    mutationFn: async (updatedTask: Partial<TaskWithMaster>) => {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/tasks/${selectedTask?.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedTask),
        }
      );

      if (!response.ok) {
        throw new Error('Не удалось обновить запись');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Успешно',
        description: 'Запись обновлена',
      });
      refetch();
      setIsEditDialogOpen(false);
      setSelectedTask(null);
      
      // Обновляем основной календарь, если статус изменился
      queryClient.invalidateQueries({
        queryKey: ['tasks']
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Фильтрация записей
  const filteredTasks = useMemo(() => {
    return cancelledTasks.filter((task: TaskWithMaster) => {
      const matchesSearch = 
        task.client?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.client?.customName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.client?.phoneNumber?.includes(searchTerm) ||
        task.serviceType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.masterName?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;

      const matchesDate = (() => {
        if (dateFilter === 'all') return true;
        
        if (!task.scheduleDate) return false;
        
        const taskDate = new Date(task.scheduleDate);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

        switch (dateFilter) {
          case 'today':
            return taskDate >= today;
          case 'week':
            return taskDate >= weekAgo;
          case 'month':
            return taskDate >= monthAgo;
          default:
            return true;
        }
      })();

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [cancelledTasks, searchTerm, statusFilter, dateFilter]);

  const handleEditTask = (task: TaskWithMaster) => {
    setSelectedTask(task);
    setIsEditDialogOpen(true);
  };

  const handleSaveTask = () => {
    if (!selectedTask || !selectedTask.scheduleDate) return;

    updateTaskMutation.mutate({
      ...selectedTask,
      // Конвертируем дату в нужный формат для API
      scheduleDate: format(new Date(selectedTask.scheduleDate), 'yyyy-MM-dd'),
    });
  };

  const defaultTrigger = (
    <Button variant="outline" className="gap-2">
      <XCircle className="h-4 w-4" />
      Отмененные записи
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            Отмененные записи
            <Badge variant="secondary" className="ml-2">
              {filteredTasks.length}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 pt-4 space-y-4 overflow-auto">
          {/* Фильтры */}
          <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex-1 min-w-[200px]">
              <Label>Поиск</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Поиск по имени, телефону, услуге..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          {/* Список отмененных записей */}
          <div 
            className="space-y-3 max-h-[60vh] overflow-auto" 
            style={{ 
              scrollbarWidth: 'auto',
              scrollbarGutter: 'stable'
            }}
          >
            {isLoading ? (
              <div className="text-center py-8">Загрузка...</div>
            ) : filteredTasks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {cancelledTasks.length === 0 ? 'Нет отмененных записей' : 'Не найдено записей по критериям'}
              </div>
            ) : (
              filteredTasks.map((task: TaskWithMaster) => (
                <Card key={task.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-blue-500" />
                            <span className="font-medium">
                              {task.client?.customName || task.client?.firstName || 'Клиент не указан'}
                            </span>
                          </div>
                          {task.client?.phoneNumber && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Phone className="h-3 w-3" />
                              {task.client.phoneNumber}
                            </div>
                          )}
                          <StatusBadge status={task.status} />
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-green-500" />
                            <span>
                              {task.scheduleDate && format(new Date(task.scheduleDate), 'dd.MM.yyyy')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Clock className="h-3 w-3" />
                            {task.scheduleTime} - {task.endTime}
                          </div>
                          <div className="text-sm text-gray-600">
                            Мастер: {task.masterName || 'Не указан'}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="font-medium">{task.serviceType || 'Услуга не указана'}</div>
                          <div className="text-sm text-gray-600">
                            {task.serviceDuration} мин
                          </div>
                          {task.finalPrice && (
                            <div className="text-sm">
                              <span className="font-medium">{task.finalPrice} сом</span>
                              <Badge 
                                variant={task.paid === 'paid' ? 'default' : 'secondary'}
                                className="ml-2"
                              >
                                {task.paid === 'paid' ? 'Оплачено' : 'Не оплачено'}
                              </Badge>
                            </div>
                          )}
                          {task.notes && (
                            <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                              {task.notes}
                            </div>
                          )}
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditTask(task)}
                        className="ml-4"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Диалог редактирования */}
        {selectedTask && (
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Редактировать запись</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Статус</Label>
                  <Select
                    value={selectedTask.status}
                    onValueChange={(value) => setSelectedTask({...selectedTask, status: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Записан</SelectItem>
                      <SelectItem value="in_progress">В процессе</SelectItem>
                      <SelectItem value="completed">Завершен</SelectItem>
                      <SelectItem value="cancelled">Отменен</SelectItem>
                      <SelectItem value="no_show">Не пришел</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Заметки</Label>
                  <Input
                    value={selectedTask.notes || ''}
                    onChange={(e) => setSelectedTask({...selectedTask, notes: e.target.value})}
                    placeholder="Добавить заметку..."
                  />
                </div>

                <div className="flex justify-between">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsEditDialogOpen(false)}
                  >
                    Отмена
                  </Button>
                  <Button 
                    onClick={handleSaveTask}
                    disabled={updateTaskMutation.isPending}
                  >
                    {updateTaskMutation.isPending ? 'Сохранение...' : 'Сохранить'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}
