import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Loader2, Check, X, Calendar, Clock, User } from 'lucide-react';
import { queryClient } from '@/lib/queryClient';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Типы для задач
interface Client {
  id: number;
  firstName?: string;
  lastName?: string;
  username?: string;
  customName?: string;
  phoneNumber?: string;
}

interface Task {
  id: number;
  clientId: number;
  status: string;
  massageType?: string;
  scheduleDate?: string;
  scheduleTime?: string;
  masterName?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  client?: Client;
}

// Компонент для отображения детальной информации о задаче и ее редактирования
const TaskDetailDialog = ({ task, onTaskUpdated }: { task: Task, onTaskUpdated: () => void }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    massageType: task.massageType || '',
    scheduleDate: task.scheduleDate ? format(new Date(task.scheduleDate), 'yyyy-MM-dd') : '',
    scheduleTime: task.scheduleTime || '',
    masterName: task.masterName || '',
    notes: task.notes || '',
    status: task.status
  });
  
  const { toast } = useToast();
  
  const updateTaskMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (!res.ok) {
        throw new Error('Failed to update task');
      }
      
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Задача обновлена',
        description: 'Информация о задаче успешно обновлена',
        variant: 'default',
      });
      setIsEditing(false);
      onTaskUpdated();
    },
    onError: (error) => {
      toast({
        title: 'Ошибка при обновлении',
        description: `${error}`,
        variant: 'destructive',
      });
    }
  });
  
  const handleSave = () => {
    updateTaskMutation.mutate(formData);
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleStatusChange = (value: string) => {
    setFormData(prev => ({ ...prev, status: value }));
  };
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Подробности</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Редактирование задачи' : 'Детали задачи'}
            {task.client && (
              <span className="block text-sm font-normal mt-1">
                Клиент: {task.client.customName || task.client.firstName || 'Неизвестный клиент'}
                {task.client.phoneNumber && ` (${task.client.phoneNumber})`}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {isEditing ? (
            // Форма редактирования
            <>
              <div className="grid gap-2">
                <Label htmlFor="status">Статус</Label>
                <Select name="status" value={formData.status} onValueChange={handleStatusChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите статус" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">Неразобранные</SelectItem>
                    <SelectItem value="scheduled">Записан</SelectItem>
                    <SelectItem value="completed">Обслуженные</SelectItem>
                    <SelectItem value="cancelled">Отмененные</SelectItem>
                    <SelectItem value="regular">Постоянные</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="massageType">Вид массажа</Label>
                <Input 
                  id="massageType" 
                  name="massageType" 
                  value={formData.massageType} 
                  onChange={handleInputChange} 
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="scheduleDate">Дата</Label>
                  <Input 
                    id="scheduleDate" 
                    name="scheduleDate" 
                    type="date" 
                    value={formData.scheduleDate} 
                    onChange={handleInputChange} 
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="scheduleTime">Время</Label>
                  <Input 
                    id="scheduleTime" 
                    name="scheduleTime" 
                    value={formData.scheduleTime} 
                    onChange={handleInputChange} 
                    placeholder="Например: 15:00"
                  />
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="masterName">Имя мастера</Label>
                <Input 
                  id="masterName" 
                  name="masterName" 
                  value={formData.masterName} 
                  onChange={handleInputChange} 
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="notes">Заметки</Label>
                <Textarea 
                  id="notes" 
                  name="notes" 
                  rows={3} 
                  value={formData.notes} 
                  onChange={handleInputChange} 
                />
              </div>
              
              <div className="flex justify-end space-x-2 mt-4">
                <Button variant="outline" onClick={() => setIsEditing(false)}>Отмена</Button>
                <Button onClick={handleSave} disabled={updateTaskMutation.isPending}>
                  {updateTaskMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Сохранить
                </Button>
              </div>
            </>
          ) : (
            // Просмотр деталей
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium">Статус</h4>
                  <p className="mt-1">
                    <StatusBadge status={task.status} />
                  </p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium">Вид массажа</h4>
                  <p className="mt-1">{task.massageType || 'Не указан'}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium">
                    <Calendar className="inline mr-1 h-4 w-4" /> Дата
                  </h4>
                  <p className="mt-1">
                    {task.scheduleDate 
                      ? format(new Date(task.scheduleDate), 'dd.MM.yyyy') 
                      : 'Не указана'}
                  </p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium">
                    <Clock className="inline mr-1 h-4 w-4" /> Время
                  </h4>
                  <p className="mt-1">{task.scheduleTime || 'Не указано'}</p>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium">
                  <User className="inline mr-1 h-4 w-4" /> Мастер
                </h4>
                <p className="mt-1">{task.masterName || 'Не указан'}</p>
              </div>
              
              {task.notes && (
                <div>
                  <h4 className="text-sm font-medium">Заметки</h4>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{task.notes}</p>
                </div>
              )}
              
              <div className="flex justify-between items-center mt-4">
                <div className="text-xs text-gray-500">
                  Создано: {format(new Date(task.createdAt), 'dd.MM.yyyy HH:mm')}
                </div>
                <Button onClick={() => setIsEditing(true)}>Редактировать</Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Компонент для отображения статуса задачи
const StatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case 'new':
      return <Badge variant="outline" className="bg-gray-100">Неразобранные</Badge>;
    case 'scheduled':
      return <Badge variant="outline" className="bg-blue-100 text-blue-800">Записан</Badge>;
    case 'completed':
      return <Badge variant="outline" className="bg-green-100 text-green-800">Обслуженные</Badge>;
    case 'cancelled':
      return <Badge variant="outline" className="bg-red-100 text-red-800">Отмененные</Badge>;
    case 'regular':
      return <Badge variant="outline" className="bg-purple-100 text-purple-800">Постоянные</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

// Компонент карточки задачи
const TaskCard = ({ task, onTaskUpdated }: { task: Task, onTaskUpdated: () => void }) => {
  const { toast } = useToast();
  
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
    onSuccess: (data) => {
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
  
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">
              {task.client?.customName || task.client?.firstName || 'Неизвестный клиент'}
            </CardTitle>
            <CardDescription>
              {task.client?.phoneNumber && (
                <span className="block">{task.client.phoneNumber}</span>
              )}
              {task.massageType && (
                <span className="block font-medium">{task.massageType}</span>
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
                <span className="ml-2">{task.scheduleTime}</span>
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
          {/* Кнопка для CRM-анализа, показываем только для новых и незаполненных задач */}
          {task.status === 'new' && (
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
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
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

// Компонент диалога создания новой задачи
const CreateTaskDialog = ({ onTaskCreated }: { onTaskCreated: () => void }) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    clientPhone: '',
    clientName: '',
    massageType: '',
    scheduleDate: '',
    scheduleTime: '',
    masterName: '',
    notes: '',
    status: 'new'
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Запрос для получения списка мастеров
  const { data: masters } = useQuery({
    queryKey: ['/api/masters'],
    queryFn: async () => {
      const res = await fetch('/api/masters');
      if (!res.ok) throw new Error('Failed to fetch masters');
      return res.json();
    },
    enabled: isDialogOpen // загружаем только когда диалог открыт
  });
  
  // Мутация для создания задачи
  const createTaskMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create task');
      }
      
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Задача создана',
        description: 'Новая задача успешно создана',
        variant: 'default',
      });
      setFormData({
        clientPhone: '',
        clientName: '',
        massageType: '',
        scheduleDate: '',
        scheduleTime: '',
        masterName: '',
        notes: '',
        status: 'new'
      });
      setIsDialogOpen(false);
      onTaskCreated();
    },
    onError: (error) => {
      toast({
        title: 'Ошибка при создании задачи',
        description: `${error}`,
        variant: 'destructive',
      });
    }
  });
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createTaskMutation.mutate(formData);
  };
  
  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button>
          <User className="mr-2 h-4 w-4" />
          Создать задачу
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Создать новую задачу</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="clientPhone">Телефон клиента*</Label>
              <Input 
                id="clientPhone" 
                name="clientPhone" 
                value={formData.clientPhone} 
                onChange={handleInputChange}
                placeholder="+7XXXXXXXXXХ"
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="clientName">Имя клиента</Label>
              <Input 
                id="clientName" 
                name="clientName" 
                value={formData.clientName} 
                onChange={handleInputChange}
                placeholder="Имя клиента"
              />
            </div>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="massageType">Вид массажа</Label>
            <Input 
              id="massageType" 
              name="massageType" 
              value={formData.massageType} 
              onChange={handleInputChange} 
              placeholder="Например: Общий массаж"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="scheduleDate">Дата</Label>
              <Input 
                id="scheduleDate" 
                name="scheduleDate" 
                type="date" 
                value={formData.scheduleDate} 
                onChange={handleInputChange} 
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="scheduleTime">Время</Label>
              <Input 
                id="scheduleTime" 
                name="scheduleTime" 
                value={formData.scheduleTime} 
                onChange={handleInputChange} 
                placeholder="Например: 15:00"
              />
            </div>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="masterName">Имя мастера</Label>
            <Select 
              value={formData.masterName} 
              onValueChange={(value) => handleSelectChange('masterName', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите мастера" />
              </SelectTrigger>
              <SelectContent>
                {masters?.map((master: any) => (
                  <SelectItem key={master.id} value={master.name}>
                    {master.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="status">Статус</Label>
            <Select 
              value={formData.status} 
              onValueChange={(value) => handleSelectChange('status', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">Неразобранные</SelectItem>
                <SelectItem value="scheduled">Записан</SelectItem>
                <SelectItem value="completed">Обслуженные</SelectItem>
                <SelectItem value="cancelled">Отмененные</SelectItem>
                <SelectItem value="regular">Постоянные</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="notes">Заметки</Label>
            <Textarea 
              id="notes" 
              name="notes" 
              rows={3} 
              value={formData.notes} 
              onChange={handleInputChange} 
              placeholder="Дополнительная информация о записи"
            />
          </div>
          
          <div className="flex justify-end space-x-2 mt-4">
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={createTaskMutation.isPending}>
              {createTaskMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Создать задачу
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Основной компонент страницы задач
const TasksPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('new');
  const { toast } = useToast();
  
  // Состояние для фильтров и сортировки
  const [createdAfter, setCreatedAfter] = useState<string>('');
  const [createdBefore, setCreatedBefore] = useState<string>('');
  const [scheduledAfter, setScheduledAfter] = useState<string>('');
  const [scheduledBefore, setScheduledBefore] = useState<string>('');
  const [selectedMaster, setSelectedMaster] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<string>('desc');
  const [showFilters, setShowFilters] = useState(false);
  
  // Запрос на получение списка мастеров для фильтрации
  const { data: mastersData } = useQuery({
    queryKey: ['/api/masters'],
    queryFn: async () => {
      const res = await fetch('/api/masters');
      if (!res.ok) throw new Error('Failed to fetch masters');
      return res.json();
    }
  });
  
  // Запрос на получение задач с учетом фильтров и сортировки
  const { data: tasks, isLoading, isError, refetch } = useQuery({
    queryKey: ['/api/tasks', activeTab, createdAfter, createdBefore, scheduledAfter, scheduledBefore, selectedMaster, sortBy, sortOrder],
    queryFn: async () => {
      // Строим URL с параметрами
      let url = activeTab === 'all' ? '/api/tasks' : `/api/tasks?status=${activeTab}`;
      
      // Добавляем параметры фильтрации и сортировки
      const params = new URLSearchParams();
      if (activeTab !== 'all') params.append('status', activeTab);
      if (createdAfter) params.append('createdAfter', createdAfter);
      if (createdBefore) params.append('createdBefore', createdBefore);
      if (scheduledAfter) params.append('scheduledAfter', scheduledAfter);
      if (scheduledBefore) params.append('scheduledBefore', scheduledBefore);
      if (selectedMaster) params.append('masterName', selectedMaster);
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);
      
      // Формируем окончательный URL
      url = `${url}${url.includes('?') ? '&' : '?'}${params.toString()}`;
      
      const res = await fetch(url);
      
      if (!res.ok) {
        throw new Error('Failed to fetch tasks');
      }
      
      return res.json();
    }
  });
  
  // Функция для сброса всех фильтров
  const resetFilters = () => {
    setCreatedAfter('');
    setCreatedBefore('');
    setScheduledAfter('');
    setScheduledBefore('');
    setSelectedMaster('');
    setSortBy('createdAt');
    setSortOrder('desc');
  };
  
  // Функция для обновления списка задач
  const refreshTasks = () => {
    refetch();
  };
  
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Управление задачами</h1>
      
      <div className="flex justify-between items-center mb-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-2">
          <TabsList className="grid grid-cols-5 w-full sm:w-[600px]">
            <TabsTrigger value="new">Новые</TabsTrigger>
            <TabsTrigger value="scheduled">Записанные</TabsTrigger>
            <TabsTrigger value="completed">Обслуженные</TabsTrigger>
            <TabsTrigger value="cancelled">Отмененные</TabsTrigger>
            <TabsTrigger value="regular">Постоянные</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? 'Скрыть фильтры' : 'Показать фильтры'}
          </Button>
          
          <CreateTaskDialog onTaskCreated={refreshTasks} />
        </div>
      </div>
      
      {showFilters && (
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h3 className="text-lg font-medium mb-3">Фильтры и сортировка</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <h4 className="font-medium mb-2">По мастеру</h4>
              <Select 
                value={selectedMaster} 
                onValueChange={setSelectedMaster}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Все мастера" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Все мастера</SelectItem>
                  {mastersData?.map((master: any) => (
                    <SelectItem key={master.id} value={master.name}>
                      {master.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">По дате создания</h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="createdAfter">С даты</Label>
                  <Input
                    id="createdAfter"
                    type="date"
                    value={createdAfter}
                    onChange={(e) => setCreatedAfter(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="createdBefore">По дату</Label>
                  <Input
                    id="createdBefore"
                    type="date"
                    value={createdBefore}
                    onChange={(e) => setCreatedBefore(e.target.value)}
                  />
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">По дате выполнения</h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="scheduledAfter">С даты</Label>
                  <Input
                    id="scheduledAfter"
                    type="date"
                    value={scheduledAfter}
                    onChange={(e) => setScheduledAfter(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="scheduledBefore">По дату</Label>
                  <Input
                    id="scheduledBefore"
                    type="date"
                    value={scheduledBefore}
                    onChange={(e) => setScheduledBefore(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <Label htmlFor="sortBy">Сортировать по</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger id="sortBy">
                  <SelectValue placeholder="Выберите поле для сортировки" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt">Дата создания</SelectItem>
                  <SelectItem value="scheduleDate">Дата выполнения</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="sortOrder">Порядок сортировки</Label>
              <Select value={sortOrder} onValueChange={setSortOrder}>
                <SelectTrigger id="sortOrder">
                  <SelectValue placeholder="Выберите порядок сортировки" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Сначала новые</SelectItem>
                  <SelectItem value="asc">Сначала старые</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={resetFilters}
              className="mr-2"
            >
              Сбросить
            </Button>
            <Button 
              size="sm" 
              onClick={() => refreshTasks()}
            >
              Применить
            </Button>
          </div>
        </div>
      )}
      
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

export default TasksPage;