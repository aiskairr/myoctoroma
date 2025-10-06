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
import { getBranchIdWithFallback } from '@/utils/branch-utils';
import { format } from 'date-fns';
import { XCircle, Edit, Calendar, User, Clock, Phone, Search } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';

interface CancelledTask {
  id: number;
  scheduleDate: string;
  scheduleTime: string;
  endTime?: string;
  serviceType: string;
  serviceDuration: number;
  masterName: string;
  status: string;
  finalPrice?: number;
  paid: string;
  notes?: string;
  client?: {
    firstName?: string;
    customName?: string;
    phoneNumber?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface CancelledAppointmentsProps {
  trigger?: React.ReactNode;
}

export default function CancelledAppointments({ trigger }: CancelledAppointmentsProps) {
  const { toast } = useToast();
  const { currentBranch, branches } = useBranch();
  const queryClient = useQueryClient();
  
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<CancelledTask | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  // Загрузка отмененных записей
  const { data: cancelledTasks = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/crm/tasks/cancelled', getBranchIdWithFallback(currentBranch, branches)],
    queryFn: async () => {
      const branchId = getBranchIdWithFallback(currentBranch, branches);
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/crm/tasks/cancelled?branchId=${branchId}`);
      
      if (!response.ok) {
        throw new Error('Не удалось загрузить отмененные записи');
      }
      
      const data = await response.json();
      return data.sort((a: CancelledTask, b: CancelledTask) => 
        new Date(b.scheduleDate).getTime() - new Date(a.scheduleDate).getTime()
      );
    },
    enabled: isOpen && !!currentBranch,
  });

  // Мутация для обновления записи
  const updateTaskMutation = useMutation({
    mutationFn: async (updatedTask: Partial<CancelledTask>) => {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/crm/tasks/${selectedTask?.id}`,
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
        queryKey: ['/api/crm/tasks']
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
    return cancelledTasks.filter((task: CancelledTask) => {
      const matchesSearch = 
        task.client?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.client?.customName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.client?.phoneNumber?.includes(searchTerm) ||
        task.serviceType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.masterName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;

      const matchesDate = (() => {
        if (dateFilter === 'all') return true;
        
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

  const handleEditTask = (task: CancelledTask) => {
    setSelectedTask(task);
    setIsEditDialogOpen(true);
  };

  const handleSaveTask = () => {
    if (!selectedTask) return;

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

            <div className="min-w-[150px]">
              <Label>Статус</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  <SelectItem value="cancelled">Отменен</SelectItem>
                  <SelectItem value="no_show">Не пришел</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-[150px]">
              <Label>Период</Label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все время</SelectItem>
                  <SelectItem value="today">Сегодня</SelectItem>
                  <SelectItem value="week">Неделя</SelectItem>
                  <SelectItem value="month">Месяц</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Список отмененных записей */}
          <div className="space-y-3 max-h-[60vh] overflow-auto">
            {isLoading ? (
              <div className="text-center py-8">Загрузка...</div>
            ) : filteredTasks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {cancelledTasks.length === 0 ? 'Нет отмененных записей' : 'Не найдено записей по критериям'}
              </div>
            ) : (
              filteredTasks.map((task: CancelledTask) => (
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
                              {format(new Date(task.scheduleDate), 'dd.MM.yyyy')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Clock className="h-3 w-3" />
                            {task.scheduleTime} - {task.endTime}
                          </div>
                          <div className="text-sm text-gray-600">
                            Мастер: {task.masterName}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="font-medium">{task.serviceType}</div>
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
