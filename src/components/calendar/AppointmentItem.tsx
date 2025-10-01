import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, User, ListTodo, Calendar } from "lucide-react";
import { Appointment } from '@/services/calendar-service';

interface AppointmentItemProps {
  appointment: Appointment;
  onClick: (appointment: Appointment) => void;
}

const AppointmentItem: React.FC<AppointmentItemProps> = ({ appointment, onClick }) => {
  // Определяем цвет и стиль для статуса
  const getStatusStyles = (status: string) => {
    switch (status.toLowerCase()) {
      case 'new':
        return { variant: 'outline' as const, label: 'Неразобранные' };
      case 'scheduled':
      case 'booked':
        return { variant: 'secondary' as const, label: 'Записан' };
      case 'in_progress':
        return { variant: 'default' as const, label: 'В процессе' };
      case 'completed':
        return { variant: 'success' as const, label: 'Обслуженные' };
      case 'cancelled':
      case 'canceled':
        return { variant: 'destructive' as const, label: 'Отмененные' };
      case 'regular':
        return { variant: 'secondary' as const, label: 'Постоянные' };
      default:
        return { variant: 'outline' as const, label: status };
    }
  };

  // Определяем цвет границы по статусу задачи
  const getBorderColor = (status: string, isFromTask: boolean) => {
    if (isFromTask) {
      return 'border-blue-500'; // Синяя обводка для записей из онлайн бронирования
    }
    
    switch (status.toLowerCase()) {
      case 'completed':
        return 'border-green-500'; // Зеленая обводка для выполненных
      case 'booked':
      case 'new':
      default:
        return 'border-black'; // Черная обводка для записанных или новых
    }
  };
  
  // Определяем, является ли запись созданной из карточки задачи
  const isFromTask = appointment.is_from_task === true;
  
  const statusStyle = getStatusStyles(appointment.status);
  const borderColor = getBorderColor(appointment.status, isFromTask);
  
  return (
    <Card 
      className={`cursor-pointer hover:bg-primary/5 transition-colors bg-yellow-50 border-2 ${borderColor}`}
      onClick={() => onClick(appointment)}
    >
      <CardContent className="p-3">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center">
              {isFromTask ? (
                <ListTodo className="h-3.5 w-3.5 mr-1 text-amber-500" />
              ) : (
                <Calendar className="h-3.5 w-3.5 mr-1 text-primary" />
              )}
              <h4 className="font-medium text-sm">{appointment.service_type}</h4>
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <User className="h-3 w-3 mr-1" />
              <span>{appointment.client_name}</span>
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <Clock className="h-3 w-3 mr-1" />
              <span>
                {appointment.start_time} - {appointment.end_time}
              </span>
            </div>
            {appointment.master_name && (
              <div className="text-xs text-muted-foreground mt-1">
                <span className="font-medium">Мастер:</span> {appointment.master_name}
              </div>
            )}
          </div>
          <div className="flex flex-col items-end">
            <Badge variant={statusStyle.variant}>{statusStyle.label}</Badge>
            {isFromTask && (
              <span className="text-xs text-amber-500 mt-1">Из карточки</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AppointmentItem;