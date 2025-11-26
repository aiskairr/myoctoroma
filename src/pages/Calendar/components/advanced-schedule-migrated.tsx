import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Clock, User, Coins } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useBranch } from "@/contexts/BranchContext";
import { format } from "date-fns";

// Types from DailyCalendar
interface Master {
    id: number;
    name: string;
    specialization?: string;
    isActive: boolean;
    startWorkHour?: string;
    endWorkHour?: string;
    branchId: string;
    photoUrl?: string;
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
    serviceServiceId?: number;
    serviceDuration?: number;
    duration?: number;
    servicePrice?: number;
    finalPrice?: number;
    scheduleDate?: string;
    scheduleTime?: string;
    endTime?: string;
    masterName?: string;
    masterId?: number;
    branchId?: string;
    notes?: string;
    mother?: number; // ID материнской записи для дополнительных услуг
    paid?: string; // Статус оплаты: 'paid' или 'unpaid'
    createdAt: string; // Формат: YYYY-MM-DD HH:mm:ss
}

// UI Display interface
interface AppointmentDisplay {
    id: string;
    employeeId: string;
    clientName: string;
    service: string;
    startTime: string;
    endTime: string;
    duration: number;
    status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
    notes?: string;
    paid?: string;
    phone?: string;
    mother?: number;
    originalTask?: Task; // Keep reference to original task data
}

// Constants
const TIME_SLOT_HEIGHT = 20; // Height of each 15-minute slot
const HEADER_HEIGHT = 64;
const EMPLOYEE_COLORS = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', 
    '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
];

// Utility functions
const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60) % 24;
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

const generateTimeSlots = (): string[] => {
    const slots: string[] = [];
    for (let hour = 8; hour < 22; hour++) {
        for (let minute = 0; minute < 60; minute += 15) {
            slots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
        }
    }
    return slots;
};

const getCurrentTimePosition = (): number => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = 8 * 60;
    return Math.max(0, (currentMinutes - startMinutes) / 15) * TIME_SLOT_HEIGHT;
};

// Main Component
const AdvancedScheduleComponent: React.FC = () => {
    const { toast } = useToast();
    const { currentBranch } = useBranch();
    const queryClient = useQueryClient();
    
    // State
    const [selectedDate] = useState(() => new Date());
    const [currentTimePosition, setCurrentTimePosition] = useState(getCurrentTimePosition());

    // API calls for real data
    const { data: masters = [], isLoading: mastersLoading } = useQuery<Master[]>({
        queryKey: ['masters', format(selectedDate, 'yyyy-MM-dd'), currentBranch?.id],
        queryFn: async () => {
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/calendar/masters/${format(selectedDate, 'yyyy-MM-dd')}?branchId=${currentBranch?.id}`, {
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Failed to fetch masters');
            return response.json();
        },
        enabled: !!currentBranch?.id,
        refetchInterval: 60000, // Auto-refresh every 60 seconds
        refetchOnWindowFocus: true, // Refresh when returning to the tab
    });

    const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
        queryKey: ['tasks', format(selectedDate, 'yyyy-MM-dd'), currentBranch?.id],
        queryFn: async () => {
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/crm/tasks?date=${format(selectedDate, 'yyyy-MM-dd')}&branchId=${currentBranch?.id}`, {
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Failed to fetch tasks');
            return response.json();
        },
        enabled: !!currentBranch?.id,
        refetchInterval: 60000, // Auto-refresh every 60 seconds
        refetchOnWindowFocus: true, // Refresh when returning to the tab
    });

    // Convert masters to employees format for existing UI compatibility
    const employees = useMemo(() => {
        return masters.map((master, index) => ({
            id: master.id.toString(),
            name: master.name,
            role: master.specialization || 'Мастер',
            workHours: {
                start: master.startWorkHour || '09:00',
                end: master.endWorkHour || '20:00'
            },
            color: EMPLOYEE_COLORS[index % EMPLOYEE_COLORS.length]
        }));
    }, [masters]);

    // Convert tasks to appointments format for existing UI compatibility
    const appointments = useMemo(() => {
        return tasks.map(task => ({
            id: task.id.toString(),
            employeeId: task.masterId?.toString() || '',
            clientName: task.client?.customName || task.client?.firstName || 'Клиент',
            service: task.serviceType || 'Услуга',
            startTime: task.scheduleTime || '',
            endTime: task.endTime || '',
            duration: task.duration || task.serviceDuration || 60,
            status: task.status as 'scheduled' | 'in_progress' | 'completed' | 'cancelled',
            notes: task.notes,
            paid: task.paid,
            phone: task.client?.phoneNumber,
            mother: task.mother,
            originalTask: task // Keep reference to original task data
        }));
    }, [tasks]);

    // Update current time line
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTimePosition(getCurrentTimePosition());
        }, 60000);
        return () => clearInterval(interval);
    }, []);

    // Memoized values
    const timeSlots = useMemo(() => generateTimeSlots(), []);

    const dateString = useMemo(() => {
        return selectedDate.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long'
        });
    }, [selectedDate]);

    // Status helper functions from DailyCalendar
    const getStatusColors = useCallback((status: string) => {
        switch (status.toLowerCase()) {
            case 'scheduled':
            case 'new':
                return { bg: 'bg-gradient-to-br from-blue-100 to-white', text: 'text-blue-800', border: 'border-blue-200' };
            case 'in_progress':
                return { bg: 'bg-gradient-to-br from-orange-100 to-white', text: 'text-orange-800', border: 'border-orange-200' };
            case 'completed':
                return { bg: 'bg-gradient-to-br from-green-100 to-white', text: 'text-green-800', border: 'border-green-200' };
            case 'cancelled':
                return { bg: 'bg-gradient-to-br from-red-100 to-white', text: 'text-red-800', border: 'border-red-200' };
            default:
                return { bg: 'bg-gradient-to-br from-gray-100 to-white', text: 'text-gray-800', border: 'border-gray-200' };
        }
    }, []);

    // Get column width for employees
    const getEmployeeColumnWidth = useCallback(() => {
        const scheduleWidth = 800; // Fixed width for now
        return Math.max(200, scheduleWidth / employees.length);
    }, [employees.length]);

    // Click handlers for creating appointments
    const handleTimeSlotClick = useCallback((timeSlot: string, employeeId: string) => {
        console.log('Time slot clicked:', timeSlot, employeeId);
        // TODO: Open CreateAppointmentDialog
    }, []);

    // Render appointment block with business logic
    const renderAppointmentBlock = useCallback((appointment: AppointmentDisplay) => {
        const startIndex = timeSlots.findIndex(slot => slot === appointment.startTime);
        const durationSlots = Math.ceil(appointment.duration / 15);
        const height = durationSlots * TIME_SLOT_HEIGHT - 2;
        const columnWidth = getEmployeeColumnWidth();
        const employeeIndex = employees.findIndex(emp => emp.id === appointment.employeeId);

        if (startIndex === -1 || employeeIndex === -1) return null;

        const statusColors = getStatusColors(appointment.status);
        const employee = employees.find(emp => emp.id === appointment.employeeId);

        // Child tasks count for mother tasks
        const childTasksCount = appointment.mother ? 0 : appointments.filter(apt => apt.mother === parseInt(appointment.id)).length;

        const isSmall = height <= 32;

        return (
            <Tooltip key={appointment.id}>
                <TooltipTrigger asChild>
                    <div
                        className={`absolute ${statusColors.bg} ${statusColors.text} ${statusColors.border} border-l-4 rounded-r-xl shadow-sm transition-all duration-200 hover:shadow-md overflow-hidden cursor-pointer`}
                        style={{
                            top: startIndex * TIME_SLOT_HEIGHT + HEADER_HEIGHT + 1,
                            height: Math.max(height, 32),
                            left: employeeIndex * columnWidth + 4,
                            width: columnWidth - 8,
                            zIndex: 10,
                            borderLeftColor: employee?.color || '#3B82F6'
                        }}
                        onClick={() => console.log('Appointment clicked:', appointment)}
                    >
                        {/* Content */}
                        <div className={`${isSmall ? 'px-1 py-1' : 'px-2 py-1'} h-full flex ${isSmall ? 'items-center' : 'flex-col justify-between'}`}>
                            {isSmall ? (
                                <div className="flex items-center justify-between w-full text-xs">
                                    <span className="font-medium truncate">{appointment.clientName}</span>
                                    <div className="flex items-center gap-1 ml-1">
                                        {appointment.paid !== 'paid' && (
                                            <Coins className="h-3 w-3 text-amber-500" />
                                        )}
                                        {appointment.mother && <span>🔗</span>}
                                        {!appointment.mother && childTasksCount > 0 && (
                                            <span className="bg-blue-500 text-white rounded-full text-xs px-1">{childTasksCount}</span>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium text-sm truncate">{appointment.clientName}</span>
                                            <div className="flex items-center gap-1">
                                                {appointment.paid !== 'paid' && (
                                                    <Coins className="h-3 w-3 text-amber-500" />
                                                )}
                                                {appointment.mother && <span>🔗</span>}
                                                {!appointment.mother && childTasksCount > 0 && (
                                                    <span className="bg-blue-500 text-white rounded-full text-xs px-1">{childTasksCount}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-xs text-gray-600 truncate">{appointment.service}</div>
                                        {appointment.phone && (
                                            <div className="text-xs text-gray-500 truncate">{appointment.phone}</div>
                                        )}
                                    </div>
                                    <div className="text-xs text-gray-500">{appointment.duration}мин</div>
                                </>
                            )}
                        </div>
                    </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-sm">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="font-semibold">{appointment.clientName}</span>
                            <span className={`px-2 py-1 text-xs rounded-full ${statusColors.bg} ${statusColors.text}`}>
                                {appointment.status}
                            </span>
                        </div>
                        <div className="text-sm">
                            <div><strong>Услуга:</strong> {appointment.service}</div>
                            <div><strong>Время:</strong> {appointment.startTime} - {appointment.endTime}</div>
                            <div><strong>Длительность:</strong> {appointment.duration} минут</div>
                            <div><strong>Мастер:</strong> {employee?.name}</div>
                            {appointment.phone && <div><strong>Телефон:</strong> {appointment.phone}</div>}
                            {appointment.notes && <div><strong>Заметки:</strong> {appointment.notes}</div>}
                            {appointment.paid !== 'paid' && (
                                <div className="text-amber-600"><strong>Статус оплаты:</strong> Не оплачено</div>
                            )}
                            {appointment.mother && (
                                <div className="text-blue-600"><strong>Связана с:</strong> Основная услуга #{appointment.mother}</div>
                            )}
                            {childTasksCount > 0 && (
                                <div className="text-blue-600"><strong>Доп. услуги:</strong> {childTasksCount}</div>
                            )}
                        </div>
                    </div>
                </TooltipContent>
            </Tooltip>
        );
    }, [timeSlots, getEmployeeColumnWidth, employees, getStatusColors, appointments]);

    if (mastersLoading || tasksLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-gray-600">Загрузка расписания...</p>
                </div>
            </div>
        );
    }

    return (
        <TooltipProvider>
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            <Clock size={20} />
                            Расписание на {dateString}
                        </h2>
                        <div className="text-sm opacity-90">
                            {employees.length} мастеров, {appointments.length} записей
                        </div>
                    </div>
                </div>

                {/* Schedule Grid */}
                <div className="flex overflow-x-auto">
                    {/* Time Column */}
                    <div className="w-20 flex-shrink-0 border-r border-gray-200 bg-gray-50">
                        <div className="h-16 border-b border-gray-200 flex items-center justify-center">
                            <Clock size={16} className="text-gray-500" />
                        </div>
                        {timeSlots.map((slot, index) => (
                            <div
                                key={slot}
                                className={`h-5 flex items-center justify-center text-xs border-b border-gray-100 ${
                                    index % 4 === 0 ? 'font-medium text-gray-700' : 'text-gray-500'
                                }`}
                            >
                                {index % 4 === 0 ? slot : ''}
                            </div>
                        ))}
                    </div>

                    {/* Employee Columns */}
                    <div className="flex-1 relative">
                        {/* Current Time Line */}
                        <div
                            className="absolute left-0 right-0 h-0.5 bg-red-500 z-30 shadow-sm flex items-center"
                            style={{
                                top: currentTimePosition + HEADER_HEIGHT - 1,
                            }}
                        >
                            <div className="w-2 h-2 bg-red-500 rounded-full -ml-1"></div>
                            <div className="flex-1 h-0.5 bg-red-500"></div>
                        </div>

                        <div className="flex">
                            {employees.map((employee, employeeIndex) => (
                                <div
                                    key={employee.id}
                                    style={{ width: getEmployeeColumnWidth() }}
                                    className="border-r border-gray-200 bg-white"
                                >
                                    {/* Employee Header */}
                                    <div 
                                        className="h-16 border-b border-gray-200 p-2 bg-gray-50 sticky top-0 z-20"
                                        style={{ backgroundColor: employee.color + '20' }}
                                    >
                                        <div className="flex items-center space-x-2">
                                            <div 
                                                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                                                style={{ backgroundColor: employee.color }}
                                            >
                                                <User size={14} />
                                            </div>
                                            <div>
                                                <div className="font-medium text-sm truncate">{employee.name}</div>
                                                <div className="text-xs text-gray-600 truncate">{employee.role}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Time slots */}
                                    <div className="relative">
                                        {timeSlots.map((timeSlot, timeIndex) => (
                                            <div
                                                key={timeSlot}
                                                className="h-5 border-b border-gray-100 hover:bg-blue-50 cursor-pointer relative"
                                                onClick={() => handleTimeSlotClick(timeSlot, employee.id)}
                                            />
                                        ))}

                                        {/* Render appointments for this employee */}
                                        {appointments
                                            .filter(appointment => appointment.employeeId === employee.id)
                                            .map(appointment => renderAppointmentBlock(appointment))
                                        }
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </TooltipProvider>
    );
};

export default AdvancedScheduleComponent;
