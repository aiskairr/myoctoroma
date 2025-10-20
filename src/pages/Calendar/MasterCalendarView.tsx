import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/SimpleAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, X, Calendar as CalendarIcon, Clock, User, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { format, addDays, subDays, isSameDay } from 'date-fns';

interface MasterTask {
  id: string | number;
  clientId?: number;
  client?: {
    id: number;
    telegramId?: string;
    firstName?: string;
    lastName?: string;
    customName?: string;
    phoneNumber?: string;
  };
  status: string;
  serviceType?: string; // название услуги
  scheduleDate?: string;
  scheduleTime?: string; // время начала в формате "HH:MM"
  endTime?: string; // время окончания в формате "HH:MM"
  masterId?: string | number;
  masterName?: string | null;
  notes?: string;
  branchId?: string;
  source?: string | null;
  serviceDuration?: number; // длительность в минутах
  servicePrice?: number;
  discount?: number;
  finalPrice?: number;
  paymentMethod?: string | null;
  paid?: string; // "paid" | "unpaid"
  createdAt?: string;
  updatedAt?: string;
  serviceServiceId?: number;
  clientName?: string; // ФИО клиента
  clientPhone?: string; // телефон клиента
  
  // Legacy поля для обратной совместимости
  title?: string;
  date?: string;
  time?: string;
  master_name?: string;
  client_name?: string;
  service_name?: string;
  duration?: number;
  price?: number;
  start_time?: string;
  end_time?: string;
}

const statusColors: Record<string, string> = {
  new: 'bg-orange-100 text-orange-800 border-orange-300',
  scheduled: 'bg-blue-100 text-blue-800 border-blue-300',
  in_progress: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  completed: 'bg-green-100 text-green-800 border-green-300',
  cancelled: 'bg-red-100 text-red-800 border-red-300',
  no_show: 'bg-gray-100 text-gray-800 border-gray-300',
};

const statusLabels: Record<string, string> = {
  new: 'Новая',
  scheduled: 'Записан',
  in_progress: 'В процессе',
  completed: 'Завершено',
  cancelled: 'Отменено',
  no_show: 'Не пришел',
};

export default function MasterCalendarView() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Debug: выводим информацию о пользователе
  console.log('👤 MasterCalendarView - User info:', {
    user,
    role: user?.role,
    masterId: user?.masterId,
    master_id: user?.master_id,
    id: user?.id
  });

  // Проверка доступа
  if (!user || user.role !== 'master') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <div className="text-red-600">
            <X className="h-12 w-12 mx-auto mb-2" />
            <h2 className="text-lg font-semibold">Доступ запрещен</h2>
            <p className="text-gray-600">Эта страница доступна только для мастеров</p>
          </div>
        </div>
      </div>
    );
  }

  // Определяем ID мастера - используем только masterId или master_id (БЕЗ fallback на user.id!)
  // user.id - это ID пользователя в таблице users, а masterId - это ID в таблице masters
  const masterId = user.masterId || user.master_id;

  // Если нет ID мастера, показываем ошибку
  if (!masterId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <div className="text-orange-600">
            <X className="h-12 w-12 mx-auto mb-2" />
            <h2 className="text-lg font-semibold">Ошибка конфигурации</h2>
            <p className="text-gray-600">
              Поле masterId отсутствует в профиле пользователя
            </p>
            <p className="text-sm text-gray-500 mt-2">
              User ID: {user.id}<br />
              masterId: {user.masterId ?? 'не задан'}<br />
              master_id: {user.master_id ?? 'не задан'}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Обратитесь к администратору для привязки аккаунта к профилю мастера
            </p>
          </div>
        </div>
      </div>
    );
  }

  const dateString = format(selectedDate, 'yyyy-MM-dd');

  // Получаем задачи мастера через специальный API
  const { data: tasks = [], isLoading, error, refetch } = useQuery<MasterTask[]>({
    queryKey: ['master-calendar-tasks', masterId, dateString],
    queryFn: async () => {
      const params = new URLSearchParams({
        masterId: masterId.toString(),
        date: dateString
      });

      console.log('🔍 Fetching master calendar:', {
        masterId,
        date: dateString,
        url: `${import.meta.env.VITE_BACKEND_URL}/api/crm/tasks-master-calendar?${params}`
      });

      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/crm/tasks-master-calendar?${params}`,
        {
          credentials: 'include'
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('❌ Master calendar fetch error:', errorData);
        throw new Error(errorData.error || errorData.message || 'Failed to fetch tasks');
      }

      const data = await response.json();
      console.log('✅ Master calendar data received:', data);
      return data;
    },
    enabled: !!masterId,
    refetchInterval: 60000, // Обновляем каждую минуту
  });

  const goToPreviousDay = () => {
    setSelectedDate(prev => subDays(prev, 1));
  };

  const goToNextDay = () => {
    setSelectedDate(prev => addDays(prev, 1));
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const getStatusColor = (status: string) => {
    return statusColors[status] || statusColors.scheduled;
  };

  const getStatusText = (status: string) => {
    return statusLabels[status] || status;
  };

  const formatTime = (timeString: string) => {
    return timeString?.substring(0, 5) || '';
  };

  const isToday = isSameDay(selectedDate, new Date());

  // Сортируем задачи по времени
  const sortedTasks = [...tasks].sort((a, b) => {
    const timeA = a.scheduleTime || a.time || a.start_time || '';
    const timeB = b.scheduleTime || b.time || b.start_time || '';
    return timeA.localeCompare(timeB);
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Загрузка календаря...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <div className="text-red-600">
            <X className="h-12 w-12 mx-auto mb-2" />
            <h2 className="text-lg font-semibold">Ошибка загрузки</h2>
            <p className="text-gray-600">{(error as Error).message}</p>
          </div>
          <Button onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Попробовать снова
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Заголовок */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Мой календарь</h1>
          <p className="text-gray-600 mt-1">Ваши записи на {format(selectedDate, 'yyyy-MM-dd')}</p>
        </div>
      </div>

      {/* Навигация по датам */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4 gap-2">
            {/* Кнопка "Предыдущий день" - на мобильных только иконка */}
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousDay}
              className="flex-shrink-0"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Предыдущий день</span>
            </Button>
            
            {/* Текущая дата */}
            <div className="text-center flex-grow min-w-0">
              <h2 className="text-lg sm:text-xl font-semibold truncate">
                {format(selectedDate, "yyyy-MM-dd")}
              </h2>
              <p className="text-xs sm:text-sm text-gray-600">
                {format(selectedDate, "EEEE")}
              </p>
            </div>
            
            {/* Кнопка "Следующий день" - на мобильных только иконка */}
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextDay}
              className="flex-shrink-0"
            >
              <span className="hidden sm:inline mr-1">Следующий день</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex justify-center gap-2 flex-wrap">
            {!isToday && (
              <Button variant="outline" size="sm" onClick={goToToday}>
                <CalendarIcon className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Сегодня</span>
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline ml-1">Обновить</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Список задач */}
      <div className="space-y-3">
        {sortedTasks.length === 0 ? (
          <Card className="py-8">
            <CardContent className="text-center">
              <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">
                На эту дату записей нет
              </p>
            </CardContent>
          </Card>
        ) : (
          sortedTasks.map((task) => (
            <Card key={task.id} className="shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="font-medium text-gray-900">
                        {formatTime(task.scheduleTime || task.time || task.start_time || '')}
                        {(task.endTime || task.end_time) && ` - ${formatTime(task.endTime || task.end_time || '')}`}
                      </span>
                      {(task.serviceDuration || task.duration) && (
                        <span className="text-sm text-gray-500">
                          ({task.serviceDuration || task.duration} мин)
                        </span>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <Badge className={getStatusColor(task.status)} variant="outline">
                        {getStatusText(task.status)}
                      </Badge>
                      {task.paid && (
                        <Badge 
                          className={task.paid === 'paid' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-slate-100 text-slate-600 border-slate-300'} 
                          variant="outline"
                        >
                          {task.paid === 'paid' ? 'Оплачено' : 'Не оплачено'}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <Separator className="my-3" />
                  
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-900 font-medium">
                        {task.clientName || 
                         task.client_name || 
                         (task.client?.firstName && task.client?.lastName 
                          ? `${task.client.firstName} ${task.client.lastName}`.trim()
                          : null) ||
                         'Клиент не указан'}
                      </span>
                    </div>
                    
                    {(task.clientPhone || task.client?.phoneNumber) && (
                      <div className="text-sm text-gray-600 ml-6">
                        📞 {task.clientPhone || task.client?.phoneNumber}
                      </div>
                    )}
                    
                    {(task.serviceType || task.service_name) && (
                      <div className="text-sm text-gray-600 ml-6">
                        <span className="font-medium">Услуга:</span> {task.serviceType || task.service_name}
                      </div>
                    )}
                  </div>
                  
                  {task.notes && (
                    <>
                      <Separator className="my-3" />
                      <p className="text-sm text-gray-600 italic">
                        {task.notes}
                      </p>
                    </>
                  )}
                  
                  {(task.finalPrice || task.servicePrice || task.price) && (
                    <>
                      <Separator className="my-3" />
                      <div className="space-y-1">
                        {task.servicePrice && task.discount && task.discount > 0 && (
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>Стоимость услуги:</span>
                            <span className="line-through">{task.servicePrice} сом</span>
                          </div>
                        )}
                        {task.discount && task.discount > 0 && (
                          <div className="flex items-center justify-between text-xs text-emerald-600">
                            <span>Скидка:</span>
                            <span>-{task.discount} сом</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">
                            {task.discount && task.discount > 0 ? 'Итого:' : 'Стоимость:'}
                          </span>
                          <span className="font-semibold text-gray-900">
                            {task.finalPrice || task.servicePrice || task.price || 0} сом
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
          ))
        )}
      </div>

      {/* Статистика дня */}
      {sortedTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Статистика дня</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{sortedTasks.length}</div>
                <div className="text-sm text-gray-600">Всего записей</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {sortedTasks.filter(t => t.status === 'completed').length}
                </div>
                <div className="text-sm text-gray-600">Завершено</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {sortedTasks.filter(t => t.status === 'scheduled' || t.status === 'in_progress').length}
                </div>
                <div className="text-sm text-gray-600">Предстоит</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {sortedTasks.reduce((sum, t) => sum + (t.finalPrice || t.servicePrice || t.price || 0), 0)}
                </div>
                <div className="text-sm text-gray-600">Сумма (сом)</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
