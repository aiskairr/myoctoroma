import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MobileNavbarMaster } from "@/components/MobileNavbarMaster";
import { 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  MapPin, 
  ChevronLeft, 
  ChevronRight, 
  LogOut,
  RefreshCw,
  Smartphone
} from "lucide-react";
import { format, addDays, subDays, startOfDay, isSameDay } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Task {
  id: number;
  clientName: string;
  clientPhone: string;
  startTime: string;
  endTime: string;
  duration: number;
  massageType: string;
  totalPrice: number;
  finalPrice: number;
  status: string;
  paid: string;
  note?: string;
  masterId: number;
}

interface MobileMasterCalendarProps {
  masterId: number;
  masterName: string;
  onLogout: () => void;
}

export const MobileMasterCalendar: React.FC<MobileMasterCalendarProps> = ({ masterId, masterName, onLogout }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Получение пользователя для проверки роли
  const { data: user } = useQuery({
    queryKey: ["/api/user"],
    retry: false,
  });

  // Перенаправление если пользователь не мастер
  useEffect(() => {
    if (user && user.role !== 'master') {
      window.location.href = '/';
    }
  }, [user]);

  // Получаем задачи для конкретного мастера на выбранную дату через новый API
  const { data: tasksData = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/crm/tasks-master-calendar', format(currentDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      const response = await fetch(
        `/api/crm/tasks-master-calendar?date=${format(currentDate, 'yyyy-MM-dd')}`,
        {
          credentials: 'include'
        }
      );
      if (!response.ok) throw new Error('Failed to fetch tasks');
      
      return response.json();
    },
    enabled: !!masterId,
    refetchInterval: 60000, // Обновляем каждую минуту
  });

  // Преобразуем данные в формат, ожидаемый мобильным интерфейсом
  const tasks: Task[] = tasksData.map((task: any) => ({
    id: task.id,
    clientName: task.client_name,
    clientPhone: task.client?.phoneNumber || 'Не указан',
    startTime: task.start_time,
    endTime: task.end_time,
    duration: task.duration,
    massageType: task.massage_type,
    totalPrice: task.price,
    finalPrice: task.price,
    status: task.status,
    paid: task.paid || 'unpaid',
    note: task.notes,
    masterId: task.master_id
  }));

  const goToPreviousDay = () => {
    setCurrentDate(prev => subDays(prev, 1));
  };

  const goToNextDay = () => {
    setCurrentDate(prev => addDays(prev, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-orange-100 text-orange-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'new': return 'Новая';
      case 'scheduled': return 'Записан';
      case 'in_progress': return 'В процессе';
      case 'completed': return 'Завершено';
      case 'cancelled': return 'Отменено';
      default: return status;
    }
  };

  const getPaidStatusColor = (paid: string) => {
    return paid === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600';
  };

  const formatTime = (timeString: string) => {
    return timeString?.substring(0, 5) || '';
  };

  const isToday = isSameDay(currentDate, new Date());

  // Проверка доступа только для мастеров
  if (!user || user.role !== 'master') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-500 mb-4">Проверка доступа...</div>
          <p className="text-sm text-gray-400">Только для мастеров</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Navbar for Masters */}
      <MobileNavbarMaster />

      {/* Date Navigation */}
      <div className="bg-white border-b p-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={goToPreviousDay}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          <div className="flex flex-col items-center">
            <h2 className="text-xl font-semibold text-gray-900">
              {format(currentDate, 'EEEE', { locale: ru })}
            </h2>
            <p className="text-sm text-gray-500">
              {format(currentDate, 'd MMMM yyyy', { locale: ru })}
            </p>
          </div>
          
          <Button variant="ghost" size="sm" onClick={goToNextDay}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="flex items-center justify-center space-x-2 mt-3">
          {!isToday && (
            <Button variant="outline" size="sm" onClick={goToToday}>
              <Calendar className="w-4 h-4 mr-1" />
              Сегодня
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Обновить
          </Button>
        </div>
      </div>

      {/* Tasks List */}
      <div className="p-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500">Загрузка...</div>
          </div>
        ) : tasks.length === 0 ? (
          <Card className="py-8">
            <CardContent className="text-center">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">
                На эту дату записей нет
              </p>
            </CardContent>
          </Card>
        ) : (
          tasks
            .sort((a: Task, b: Task) => a.startTime.localeCompare(b.startTime))
            .map((task: Task) => (
              <Card key={task.id} className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="font-medium text-gray-900">
                        {formatTime(task.startTime)} - {formatTime(task.endTime)}
                      </span>
                      <span className="text-sm text-gray-500">
                        ({task.duration} мин)
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      <Badge className={getStatusColor(task.status)} variant="secondary">
                        {getStatusText(task.status)}
                      </Badge>
                      <Badge className={getPaidStatusColor(task.paid)} variant="secondary">
                        {task.paid === 'paid' ? 'Оплачено' : 'Не оплачено'}
                      </Badge>
                    </div>
                  </div>
                  
                  <Separator className="my-3" />
                  
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-900">
                        {task.clientName || 'Имя не указано'}
                      </span>
                    </div>
                    
                    {task.clientPhone && (
                      <div className="flex items-center space-x-2">
                        <Phone className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600">
                          {task.clientPhone}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">
                        {task.massageType || 'Массаж'}
                      </span>
                    </div>
                  </div>
                  
                  {task.note && (
                    <>
                      <Separator className="my-3" />
                      <p className="text-sm text-gray-600 italic">
                        {task.note}
                      </p>
                    </>
                  )}
                  
                  <Separator className="my-3" />
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      Стоимость:
                    </span>
                    <span className="font-semibold text-gray-900">
                      {task.finalPrice || task.totalPrice || 0} сом
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))
        )}
      </div>
    </div>
  );
};

