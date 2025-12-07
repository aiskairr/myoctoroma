import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Plus, X, Clock, User, Calendar, GripVertical, Coins, Clock3 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  MobileDialog, 
  MobileDialogContent, 
  MobileDialogTrigger
} from "@/components/ui/mobile-dialog";
import { MobileDialogWrapper } from './MobileDialogWrapper';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import TaskDialogBtn from './task-dialog-btn';
import CancelledAppointments from '@/components/CancelledAppointments';
import { useMasters } from '@/hooks/use-masters';
import { useCalendarTasks } from '@/hooks/use-calendar-tasks';
import { useServices, convertServicesToLegacyFormat } from '@/hooks/use-services';
import { useCreateTask, generateTaskId } from '@/hooks/use-task';
import { useBranch } from '@/contexts/BranchContext';
import { useAuth } from '@/contexts/SimpleAuthContext';
import { useMasterWorkingDates } from '@/hooks/use-master-working-dates';
import { useLocale } from '@/contexts/LocaleContext';
import { getBranchIdWithFallback } from '@/utils/branch-utils';
import { taskParserService } from '@/services/task-parser';
import type { Master } from '@/hooks/use-masters';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useIsMobile } from '@/hooks/use-mobile';

// Types
interface Employee {
    id: string;
    name: string;
    role: string;
    workHours: {
        start: string;
        end: string;
    };
    color: string;
    isWorking: boolean;
    workingDate: any | null;
    photoUrl?: string | null;
}

interface DragState {
    isDragging: boolean;
    draggedAppointment: Appointment | null;
    dragStartPosition: { x: number; y: number };
    currentPosition: { x: number; y: number };
    targetSlot: { employeeId: string; timeSlot: string } | null;
    dragOffset: { x: number; y: number };
}

interface ResizeState {
    isResizing: boolean;
    resizedAppointment: Appointment | null;
    originalDuration: number;
    direction: 'top' | 'bottom' | null;
}

interface Appointment {
    id: string;
    employeeId: string;
    clientName: string;
    service: string;
    startTime: string;
    endTime: string;
    duration: number;
    status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
    notes?: string;
    price?: number;
    motherId?: string; // ID родительской записи для дополнительных услуг
    childIds?: string[]; // ID дочерних дополнительных услуг
    isAdditionalService?: boolean; // Флаг дополнительной услуги
    serviceId?: number; // ID услуги из справочника
    paid?: string; // Статус оплаты: 'paid' или 'unpaid'
    childServices?: any[]; // Дочерние услуги для группировки
}

interface AdvancedScheduleComponentProps {
    initialDate?: Date;
}

interface NewEmployeeForm {
    masterId: string;
    startTime: string;
    endTime: string;
}

interface NewAppointmentForm {
    clientName: string;
    phone: string;
    service: string;
    startTime: string;
    duration: number;
    notes: string;
    durationPrice?: string; // Формат: "duration-price", например "20-1000"
}

// Constants
const EMPLOYEE_COLORS = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
];

const TIME_SLOT_HEIGHT = 24; // Соответствует h-6 в Tailwind CSS (24px)
const HEADER_HEIGHT = 64;

// Utility functions
const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

const generateTimeSlots = (startHour: number = 7, endHour: number = 24): string[] => {
    const slots: string[] = [];
    for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += 15) {
            slots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
        }
    }
    return slots;
};

// Генерация слотов для 24-часового режима (00:00 - 23:59)
const generateTimeSlots24h = (): string[] => {
    const slots: string[] = [];
    for (let hour = 0; hour < 24; hour++) {
        for (let minute = 0; minute < 60; minute += 15) {
            slots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
        }
    }
    return slots;
};

const getCurrentTimePosition = (is24hMode: boolean = false): number => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    // В режиме 24ч начинаем с 00:00, в обычном - с 07:00
    const startMinutes = is24hMode ? 0 : 7 * 60;
    return Math.max(0, (currentMinutes - startMinutes) / 15) * TIME_SLOT_HEIGHT;
};

// Main Component
const AdvancedScheduleComponent: React.FC<AdvancedScheduleComponentProps> = ({ initialDate }) => {
    // Mobile detection
    const isMobile = useIsMobile();
    
    // Conditional wrappers for dialog
    const DialogWrapper = isMobile ? MobileDialog : Dialog;
    const DialogContentWrapper = isMobile ? MobileDialogContent : DialogContent;
    
    // State
    const currentDate = useMemo(() => initialDate || new Date(), [initialDate]);
    
    console.log('📅 AdvancedScheduleComponent mounted with initialDate:', initialDate?.toISOString(), 'currentDate:', currentDate.toISOString());

    // Debug: логируем изменения даты
    useEffect(() => {
        console.log('📅 currentDate changed to:', currentDate.toISOString());
    }, [currentDate]);

    // Context
    const { currentBranch, branches } = useBranch();
    const { user } = useAuth();
    const { t } = useLocale();

    // Состояние режима 24-часового отображения (локальное, с начальным значением из настроек филиала)
    const [is24hMode, setIs24hMode] = useState(false);
    
    // Синхронизация с настройками филиала при их изменении
    useEffect(() => {
        if (currentBranch?.view24h !== undefined) {
            setIs24hMode(currentBranch.view24h);
        }
    }, [currentBranch?.view24h]);

    // Fetch real data from API
    const { data: mastersData = [], isLoading: mastersLoading, error: mastersError } = useMasters();
    const { data: tasksData = [], isLoading: tasksLoading, error: tasksError } = useCalendarTasks(currentDate);
    const { data: servicesData = [], isLoading: servicesLoading, error: servicesError } = useServices();
    
    // Fetch master working dates for the current date
    // Конвертируем текущую дату в формат YYYY-MM-DD для API запроса (scheduleDate format)
    const currentDateStr = currentDate.toISOString().split('T')[0];
    const { 
        data: masterWorkingDates = [], 
        isLoading: workingDatesLoading, 
        error: workingDatesError 
    } = useMasterWorkingDates(
        currentDateStr, 
        currentBranch?.id?.toString()
    );

    // API mutations
    const createTaskMutation = useCreateTask();
    const queryClient = useQueryClient();
    const { toast } = useToast();

    // Мутация для обновления настройки view24h филиала
    const updateView24hMutation = useMutation({
        mutationFn: async (view24h: boolean) => {
            if (!currentBranch?.id) throw new Error('Филиал не выбран');
            
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/branches/${currentBranch.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ view24h })
            });

            if (!response.ok) {
                throw new Error('Ошибка при сохранении настройки');
            }
            
            return response.json();
        },
        onSuccess: () => {
            // Обновляем кэш филиалов
            queryClient.invalidateQueries({ queryKey: ['/api/crm/branches'] });
            toast({
                title: 'Успешно',
                description: is24hMode ? 'Включен 24-часовой режим' : 'Включен дневной режим (7:00-24:00)',
            });
        },
        onError: (error) => {
            console.error('Error updating view24h:', error);
            // Откатываем локальное состояние
            setIs24hMode(!is24hMode);
            toast({
                title: 'Ошибка',
                description: 'Не удалось сохранить настройку',
                variant: 'destructive',
            });
        }
    });

    // Функция переключения режима 24ч с сохранением на бэкенд
    const handleToggle24hMode = useCallback(() => {
        const newValue = !is24hMode;
        setIs24hMode(newValue);
        updateView24hMutation.mutate(newValue);
    }, [is24hMode, updateView24hMutation]);

    // Мутация для добавления мастера на рабочий день
    const addMasterToWorkingDayMutation = useMutation({
        mutationFn: async (workingDayData: {
            masterId: string;
            workDate: string;
            startTime: string;
            endTime: string;
            branchId: string;
        }) => {
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/masters/${workingDayData.masterId}/working-dates`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    workDate: workingDayData.workDate,
                    startTime: workingDayData.startTime,
                    endTime: workingDayData.endTime,
                    branchId: workingDayData.branchId
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || t('calendar.failed_to_add_master'));
            }
            
            return response.json();
        },
        onSuccess: () => {
            const selectedMaster = allBranchMasters.find(m => m.id.toString() === newEmployee.masterId);
            toast({
                title: 'Успешно',
                description: `Мастер ${selectedMaster?.name || 'Неизвестный'} добавлен на ${currentDateStr}`,
            });
            
            // Обновляем данные рабочих дат
            queryClient.invalidateQueries({ queryKey: ['/api/masters/working-dates'] });
            
            // Закрываем диалог и сбрасываем форму
            setIsAddEmployeeOpen(false);
            setNewEmployee({
                masterId: '',
                startTime: '07:00',
                endTime: '23:59'
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

    // Мутация для обновления задач
    const updateTaskMutation = useMutation({
        mutationFn: async ({ taskId, updates }: { taskId: string, updates: any }) => {
            console.log('🚀 Sending PATCH request to:', `${import.meta.env.VITE_BACKEND_URL}/api/tasks/${taskId}`);
            console.log('📦 Payload:', updates);

            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/tasks/${taskId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updates),
                credentials: 'include'
            });

            console.log('📡 Response status:', response.status);
            console.log('📡 Response ok:', response.ok);

            if (!response.ok) {
                const errorData = await response.json();
                console.error('❌ Error response:', errorData);
                throw new Error(errorData.message || 'Failed to update task');
            }

            const result = await response.json();
            console.log('✅ Success response:', result);
            return result;
        },
        onSuccess: () => {
            console.log('✅ Task updated successfully');
            // Инвалидируем ВСЕ кэши связанные с задачами
            // Это обновит данные во всех диалогах редактирования
            queryClient.invalidateQueries({ queryKey: ['calendar-tasks'] });
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['/api/tasks'] }); // Для useTask hook
            console.log('🔄 All task caches invalidated - dialogs will reload fresh data');
        },
        onError: (error: any) => {
            console.error('❌ Error updating task:', error);
            toast({
                title: "Ошибка обновления",
                description: error.message || "Не удалось обновить запись",
                variant: "destructive",
            });
        }
    });

    // Convert services data to legacy format for compatibility
    const services = useMemo(() => {
        return convertServicesToLegacyFormat(servicesData);
    }, [servicesData]);

    // Convert masters data to employees format using working dates - only show working masters
    const employees: Employee[] = useMemo(() => {
        console.log('🔄 Building employees list with working dates...');
        console.log('  - Masters data:', mastersData);
        console.log('  - Working dates:', masterWorkingDates);
        
        const workingEmployees = mastersData
            .map((master, index) => {
                // Найти рабочий день для этого мастера
                const workingDate = masterWorkingDates.find(
                    wd => wd.master_id === master.id && wd.is_active
                );
                
                // ОБНОВЛЕНО 5 декабря 2025: Используем startTime/endTime из master_working_dates
                // Fallback значения используются только если нет записи в master_working_dates
                const workHours = workingDate ? {
                    start: workingDate.start_time,
                    end: workingDate.end_time
                } : {
                    start: '07:00',
                    end: '23:59'
                };
                
                const isWorking = !!workingDate;
                
                console.log(`  - Master ${master.name}: working hours ${workHours.start} - ${workHours.end} (${workingDate ? 'from API' : 'fallback'}) - ${isWorking ? 'WORKING' : 'NOT WORKING'}`);
                
                return {
                    id: master.id.toString(),
                    name: master.name,
                    role: master.specialization || 'Мастер',
                    workHours,
                    color: EMPLOYEE_COLORS[index % EMPLOYEE_COLORS.length],
                    isWorking,
                    workingDate: workingDate || null,
                    photoUrl: master.photoUrl || null
                };
            })
            .filter(employee => employee.isWorking); // Показываем только работающих мастеров
        
        console.log(`  - Total working employees: ${workingEmployees.length} out of ${mastersData.length}`);
        return workingEmployees;
    }, [mastersData, masterWorkingDates]);

    // Convert tasks data to appointments format
    const [appointments, setAppointments] = useState<Appointment[]>([]);

    useEffect(() => {
        if (tasksData.length > 0) {
            console.log("🔄 Converting tasks to appointments...");
            console.log("  - Tasks data sample:", tasksData[0]);
            console.log("  - Tasks with masterName:", tasksData.filter(t => t.masterName).length);
            console.log("  - Tasks without masterName:", tasksData.filter(t => !t.masterName && t.masterId).length);
            
            // Создаем карту дочерних задач для расчета общей длительности
            const childTasksMap: { [taskId: string]: any[] } = {};
            tasksData
                .filter(task => task.mother && task.status !== 'cancelled' && task.status !== 'no_show')
                .forEach(childTask => {
                    const motherId = childTask.mother;
                    if (motherId) {
                        const motherIdStr = motherId.toString();
                        if (!childTasksMap[motherIdStr]) {
                            childTasksMap[motherIdStr] = [];
                        }
                        childTasksMap[motherIdStr].push(childTask);
                    }
                });
            
            const convertedAppointments = tasksData
                .filter(task => 
                    task.scheduleTime && 
                    task.masterId && 
                    task.status !== 'cancelled' && 
                    task.status !== 'no_show' &&
                    !task.mother // Исключаем дочерние услуги - они будут показаны внутри родительской записи
                )
                .map(task => {
                    // Функция для вычисления длительности в минутах между двумя временами
                    const calculateDurationFromTimes = (startTime: string, endTime: string): number => {
                        const [startHours, startMinutes] = startTime.split(':').map(Number);
                        const [endHours, endMinutes] = endTime.split(':').map(Number);
                        
                        const startTotalMinutes = startHours * 60 + startMinutes;
                        const endTotalMinutes = endHours * 60 + endMinutes;
                        
                        return Math.max(0, endTotalMinutes - startTotalMinutes);
                    };
                    
                    // Вычисляем endTime если его нет, с учетом дочерних услуг
                    let endTime = task.endTime;
                    let calculatedDuration = task.serviceDuration || 60; // fallback значение
                    
                    // Добавляем длительность дочерних услуг
                    const childTasks = childTasksMap[task.id.toString()] || [];
                    const childrenDuration = childTasks.reduce((sum, child) => sum + (child.serviceDuration || child.duration || 0), 0);
                    
                    if (endTime && task.scheduleTime) {
                        // Если у нас есть оба времени, вычисляем длительность на их основе
                        calculatedDuration = calculateDurationFromTimes(task.scheduleTime, endTime);
                        console.log(`⏱️ Calculated duration from times: ${task.scheduleTime} -> ${endTime} = ${calculatedDuration} minutes`);
                    } else if (!endTime && task.scheduleTime && (task.serviceDuration || childrenDuration)) {
                        // Если endTime нет, вычисляем его на основе serviceDuration + дочерние услуги
                        const totalDuration = (task.serviceDuration || 60) + childrenDuration;
                        const [hours, minutes] = task.scheduleTime.split(':').map(Number);
                        const startMinutes = hours * 60 + minutes;
                        const endMinutes = startMinutes + totalDuration;
                        const endHours = Math.floor(endMinutes / 60);
                        const endMins = endMinutes % 60;
                        endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
                        calculatedDuration = totalDuration;
                        console.log(`⏱️ Generated endTime with children: ${task.scheduleTime} + ${totalDuration}min (${task.serviceDuration}+${childrenDuration}) = ${endTime}`);
                    }
                    
                    const appointment = {
                        id: task.id.toString(),
                        employeeId: task.masterId!.toString(),
                        clientName: task.clientName || 'Клиент',
                        service: task.serviceType || 'Услуга',
                        startTime: task.scheduleTime!,
                        endTime: endTime || task.scheduleTime!,
                        duration: calculatedDuration,
                        status: (task.status === 'in-progress' ? 'in_progress' : task.status) as 'scheduled' | 'in_progress' | 'completed' | 'cancelled' || 'scheduled',
                        notes: task.notes || undefined,
                        paid: task.paid || 'unpaid', // Добавляем статус оплаты
                        childServices: childTasks // Добавляем информацию о дочерних услугах
                    };
                    
                    console.log(`📋 Converted appointment:`, {
                        id: appointment.id,
                        clientName: appointment.clientName,
                        startTime: appointment.startTime,
                        endTime: appointment.endTime,
                        duration: appointment.duration,
                        employeeId: appointment.employeeId
                    });
                    
                    return appointment;
                });
                
            console.log("✅ Converted appointments:", convertedAppointments.length);
            setAppointments(convertedAppointments);
        } else {
            console.log("📭 No tasks data available, clearing appointments");
            setAppointments([]);
        }
    }, [tasksData]);

    const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
    const [isAddAppointmentOpen, setIsAddAppointmentOpen] = useState(false);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
    const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
    const [currentTimePosition, setCurrentTimePosition] = useState(() => getCurrentTimePosition(currentBranch?.view24h === true));

    // Loading and error states
    const isLoading = mastersLoading || tasksLoading || servicesLoading || workingDatesLoading;
    const hasError = mastersError || tasksError || servicesError || workingDatesError;

    const [dragState, setDragState] = useState<DragState>({
        isDragging: false,
        draggedAppointment: null,
        dragStartPosition: { x: 0, y: 0 },
        currentPosition: { x: 0, y: 0 },
        targetSlot: null,
        dragOffset: { x: 0, y: 0 }
    });

    const [resizeState, setResizeState] = useState<ResizeState>({
        isResizing: false,
        resizedAppointment: null,
        originalDuration: 0,
        direction: null
    });

    const scheduleRef = useRef<HTMLDivElement>(null);

    const [newEmployee, setNewEmployee] = useState<NewEmployeeForm>({
        masterId: '',
        startTime: '07:00',
        endTime: '23:59'
    });

    const [newAppointment, setNewAppointment] = useState<NewAppointmentForm>({
        clientName: '',
        phone: '',
        service: '',
        startTime: '',
        duration: 30,
        notes: '',
        durationPrice: ''
    });

    // Отдельный запрос для получения всех мастеров филиала (для диалога добавления)
    const { data: allBranchMasters = [], isLoading: allMastersLoading } = useQuery<Master[]>({
        queryKey: [`/api/crm/masters/${currentBranch?.id}`],
        queryFn: async () => {
            if (!currentBranch?.id) return [];
            
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/crm/masters/${currentBranch.id}`, {
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error('Не удалось загрузить мастеров');
            }
            
            return response.json();
        },
        enabled: !!currentBranch?.id && isAddEmployeeOpen,
        staleTime: 5 * 60 * 1000, // 5 минут
    });

    // Update current time line
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTimePosition(getCurrentTimePosition(is24hMode));
        }, 60000);
        return () => clearInterval(interval);
    }, [is24hMode]);

    // Обновить позицию при смене режима 24ч
    useEffect(() => {
        setCurrentTimePosition(getCurrentTimePosition(is24hMode));
    }, [is24hMode]);

    // Настройка парсера для автоматической инвалидации кэша
    useEffect(() => {
        console.log('[Calendar] Setting up task parser with query invalidation');
        
        // Устанавливаем функцию инвалидации кэша
        taskParserService.setQueryInvalidator(() => {
            // Инвалидируем кэш tasks для текущей даты
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['calendar-tasks'] });
            console.log('[Calendar] Task cache invalidated by parser');
        });

        // Cleanup при размонтировании
        return () => {
            taskParserService.clearQueryInvalidator();
            console.log('[Calendar] Task parser query invalidator cleared');
        };
    }, [queryClient]);

    // Handle window resize for responsive column width
    useEffect(() => {
        const handleResize = () => {
            // Force recalculation of column width
            console.log('📱 Window resized, recalculating column widths...');
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Memoized values
    // Генерируем слоты в зависимости от режима: 24ч (00:00-23:59) или дневной (07:00-24:00)
    const timeSlots = useMemo(() => {
        if (is24hMode) {
            return generateTimeSlots24h();
        }
        return generateTimeSlots();
    }, [is24hMode]);

    const dateString = useMemo(() => {
        return currentDate.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long'
        });
    }, [currentDate]);

    // Calculate column width based on number of working employees (20% narrower)
    const getEmployeeColumnWidth = useMemo(() => {
        const workingEmployeeCount = employees.length;
        const maxEmployeesPerScreen = 6; // Увеличиваем до 6 из-за более узких колонок
        
        console.log(`📊 Column width calculation: ${workingEmployeeCount} working employees`);
        
        if (workingEmployeeCount === 0) {
            return 240; // Default width when no employees (was 300, now 20% smaller)
        }
        
        if (workingEmployeeCount <= maxEmployeesPerScreen) {
            // Stretch to full width when 6 or fewer employees
            const availableWidth = window.innerWidth - 80 - 40; // Minus time column and padding
            const columnWidth = Math.max(200, Math.floor(availableWidth / workingEmployeeCount)); // Min width 200px (was 250px)
            console.log(`  - Stretching: ${columnWidth}px per column (full width)`);
            return columnWidth;
        } else {
            // Fixed width when more than 6 employees (enables horizontal scroll)
            const fixedWidth = 200; // Fixed width 200px (was 250px, now 20% smaller)
            console.log(`  - Fixed width: ${fixedWidth}px per column (horizontal scroll enabled)`);
            return fixedWidth;
        }
    }, [employees.length]);

    // Appointment management
    const updateAppointment = useCallback(async (appointmentId: string, updates: Partial<Appointment>) => {
        console.log('🔄 updateAppointment called:', { appointmentId, updates });
        
        // Отладочная информация о всех мастерах
        console.log('👥 All mastersData:', mastersData.map(m => ({ id: m.id, name: m.name, branchId: m.branchId })));
        console.log('👥 All employees:', employees.map(e => ({ id: e.id, name: e.name })));
        
        // Получаем текущие данные appointment для формирования полного payload
        console.log('🔍 Searching for appointment with ID:', appointmentId, 'Type:', typeof appointmentId);
        console.log('📋 Available appointments:', appointments.map(apt => ({ id: apt.id, type: typeof apt.id })));
        
        const currentAppointment = appointments.find(apt => String(apt.id) === String(appointmentId));
        if (!currentAppointment) {
            console.error('❌ Current appointment not found for ID:', appointmentId);
            console.error('Available IDs:', appointments.map(apt => apt.id));
            return;
        }

        // Получаем текущие данные задачи с сервера для полного payload
        let currentTask = null;
        try {
            console.log('📡 Fetching current task data from server...')
            const taskResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/tasks/${appointmentId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include'
            });
            
            if (taskResponse.ok) {
                currentTask = await taskResponse.json();
                console.log('📋 Current task data:', currentTask);
            } else {
                console.warn('⚠️ Could not fetch current task data, using appointment data');
            }
        } catch (error) {
            console.warn('⚠️ Error fetching current task data:', error);
        }
        
        // Обновляем локальное состояние
        setAppointments(prev => prev.map(apt =>
            String(apt.id) === String(appointmentId) ? { ...apt, ...updates } : apt
        ));

        // Отправляем запрос на сервер
        try {
            // Вспомогательная функция для вычисления final_price
            const calculateFinalPrice = (servicePrice: number, discount: number): number => {
                return Math.max(0, servicePrice - (servicePrice * discount / 100));
            };

            // Вспомогательная функция для вычисления end_time
            const calculateEndTime = (startTime: string, duration: number): string => {
                const [hours, minutes] = startTime.split(':').map(Number);
                const startMinutes = hours * 60 + minutes;
                const endMinutes = startMinutes + duration;
                const endHours = Math.floor(endMinutes / 60);
                const endMins = endMinutes % 60;
                return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
            };

            // Формируем полный payload, используя текущие данные задачи и изменения
            const payload: any = {};
            
            // Обязательные поля из текущей задачи
            if (currentTask) {
                payload.clientName = currentTask.clientName || currentAppointment.clientName;
                payload.phoneNumber = currentTask.client?.phoneNumber || '';
                payload.serviceType = currentTask.serviceType || currentAppointment.service;
                payload.notes = currentTask.notes || currentAppointment.notes || '';
                
                // scheduleDate только если есть валидная дата
                if (currentTask.scheduleDate && currentTask.scheduleDate !== null) {
                    payload.scheduleDate = currentTask.scheduleDate;
                }
                
                const servicePrice = currentTask.finalPrice || currentTask.servicePrice || 0;
                const discount = currentTask.discount || 0;
                payload.finalPrice = calculateFinalPrice(servicePrice, discount);
                payload.discount = discount;
                // Используем branchId из задачи, если он есть, иначе текущий выбранный филиал
                payload.branchId = currentTask.branchId || getBranchIdWithFallback(currentBranch, branches);
                payload.status = currentTask.status || currentAppointment.status;
            } else {
                // Fallback to appointment data if task fetch failed
                payload.clientName = currentAppointment.clientName;
                payload.phoneNumber = '';
                payload.serviceType = currentAppointment.service;
                payload.notes = currentAppointment.notes || '';
                // НЕ добавляем scheduleDate если данных нет
                payload.finalPrice = 0;
                payload.discount = 0;
                // Используем текущий выбранный филиал
                payload.branchId = getBranchIdWithFallback(currentBranch, branches);
                payload.status = currentAppointment.status;
            }
            
            // Применяем изменения поверх базовых данных
            if (updates.startTime) {
                payload.scheduleTime = updates.startTime;
                // Вычисляем end_time на основе startTime и текущей длительности
                const duration = updates.duration || currentAppointment.duration || 60;
                payload.endTime = calculateEndTime(updates.startTime, duration);
            }
            if (updates.endTime) {
                payload.endTime = updates.endTime;
            }
            if (updates.duration) {
                payload.duration = updates.duration;
                // Если есть startTime, пересчитываем endTime
                const startTime = updates.startTime || currentAppointment.startTime;
                if (startTime) {
                    payload.endTime = calculateEndTime(startTime, updates.duration);
                }
            }

            // Обязательные поля для API
            if (!payload.endTime && payload.scheduleTime) {
                const duration = currentAppointment.duration || 60;
                payload.endTime = calculateEndTime(payload.scheduleTime, duration);
            }
            
            if (updates.employeeId) {
                console.log('🔍 Looking for employeeId:', updates.employeeId);
                
                // Найдем мастера по employeeId в employees (где id - строка)
                const employee = employees.find(emp => emp.id === updates.employeeId);
                console.log('👤 Found employee:', employee);
                
                if (employee) {
                    // Найдем соответствующий объект в mastersData для получения реального ID
                    const masterData = mastersData.find(master => master.id.toString() === updates.employeeId);
                    console.log('🎯 Found masterData:', masterData);
                    
                    if (masterData) {
                        payload.masterId = masterData.id; // Используем оригинальный числовой ID
                        payload.masterName = masterData.name;
                        console.log('✅ Master mapping successful:', { 
                            employeeId: updates.employeeId, 
                            masterId: masterData.id, 
                            masterName: masterData.name 
                        });
                    } else {
                        console.warn('⚠️ Master not found in mastersData for employeeId:', updates.employeeId);
                        console.log('Available masters IDs:', mastersData.map(m => m.id.toString()));
                    }
                } else {
                    console.warn('⚠️ Employee not found for employeeId:', updates.employeeId);
                    console.log('Available employee IDs:', employees.map(e => e.id));
                }
            } else {
                // Сохраняем текущего мастера если он не изменяется
                // Приоритет: currentTask > currentAppointment
                if (currentTask) {
                    payload.masterId = currentTask.masterId;
                    payload.masterName = currentTask.masterName || currentTask.master?.name;
                    console.log('📋 Using master from currentTask:', { masterId: payload.masterId, masterName: payload.masterName });
                } else if (currentAppointment) {
                    // Fallback на данные из appointment, если currentTask не загружен
                    const appointmentMaster = mastersData.find(m => m.id.toString() === currentAppointment.employeeId);
                    if (appointmentMaster) {
                        payload.masterId = appointmentMaster.id;
                        payload.masterName = appointmentMaster.name;
                        console.log('📋 Using master from currentAppointment:', { masterId: payload.masterId, masterName: payload.masterName });
                    } else {
                        console.warn('⚠️ Could not find master for currentAppointment.employeeId:', currentAppointment.employeeId);
                    }
                }
            }

            console.log('🚀 Sending PATCH request to:', `${import.meta.env.VITE_BACKEND_URL}/api/tasks/${appointmentId}`);
            console.log('📦 Payload:', payload);

            // Используем мутацию вместо прямого fetch
            updateTaskMutation.mutate({ taskId: appointmentId, updates: payload });

        } catch (error) {
            console.error('❌ Error updating appointment:', error);
            // В случае ошибки, откатываем локальное состояние
            setAppointments(prev => prev.map(apt =>
                String(apt.id) === String(appointmentId) ? apt : apt
            ));
        }
    }, [employees, mastersData, updateTaskMutation, appointments, currentBranch, branches]);

    // Validation functions
    const isWithinWorkingHours = useCallback((employeeId: string, timeSlot: string): boolean => {
        const employee = employees.find(emp => emp.id === employeeId);
        if (!employee || !employee.isWorking) return false;

        const slotMinutes = timeToMinutes(timeSlot);
        const startMinutes = timeToMinutes(employee.workHours.start);
        const endMinutes = timeToMinutes(employee.workHours.end);

        return slotMinutes >= startMinutes && slotMinutes < endMinutes;
    }, [employees]);

    const doesAppointmentFitWorkingHours = useCallback((employeeId: string, startTime: string, duration: number): boolean => {
        const employee = employees.find(emp => emp.id === employeeId);
        if (!employee || !employee.isWorking) return false;

        const startMinutes = timeToMinutes(startTime);
        const endMinutes = startMinutes + duration;
        const workStartMinutes = timeToMinutes(employee.workHours.start);
        const workEndMinutes = timeToMinutes(employee.workHours.end);

        return startMinutes >= workStartMinutes && endMinutes <= workEndMinutes;
    }, [employees]);

    // Get position info from mouse coordinates
    const getPositionFromMouse = useCallback((x: number, y: number) => {
        const employeeColumnWidth = getEmployeeColumnWidth;
        const employeeIndex = Math.floor(x / employeeColumnWidth);
        const timeSlotIndex = Math.floor((y - HEADER_HEIGHT) / TIME_SLOT_HEIGHT);

        if (employeeIndex >= 0 && employeeIndex < employees.length &&
            timeSlotIndex >= 0 && timeSlotIndex < timeSlots.length) {
            return {
                employeeId: employees[employeeIndex].id,
                timeSlot: timeSlots[timeSlotIndex],
                employeeIndex,
                timeSlotIndex
            };
        }
        return null;
    }, [employees, timeSlots, getEmployeeColumnWidth]);

    // Drag and drop handlers
    const handleMouseDown = useCallback((e: React.MouseEvent, appointment: Appointment, action: 'drag' | 'resize-top' | 'resize-bottom') => {
        e.preventDefault();
        e.stopPropagation();
        console.log('🖱️ handleMouseDown called:', { action, appointmentId: appointment.id })

        if (action === 'drag') {
            setDragState({
                isDragging: true,
                draggedAppointment: appointment,
                dragStartPosition: { x: e.clientX, y: e.clientY },
                currentPosition: { x: e.clientX, y: e.clientY },
                targetSlot: null,
                dragOffset: { x: 0, y: 0 }
            });
        } else {
            console.log('📏 Setting resize state:', { action, appointmentId: appointment.id, duration: appointment.duration })
            setResizeState({
                isResizing: true,
                resizedAppointment: appointment,
                originalDuration: appointment.duration,
                direction: action === 'resize-top' ? 'top' : 'bottom'
            });
        }
    }, []);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!scheduleRef.current) return;

        const rect = scheduleRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        if (dragState.isDragging && dragState.draggedAppointment) {
            const position = getPositionFromMouse(mouseX, mouseY);

            if (position) {
                const { employeeId, timeSlot } = position;

                if (dragState.targetSlot?.employeeId !== employeeId || dragState.targetSlot?.timeSlot !== timeSlot) {
                    setDragState(prev => ({
                        ...prev,
                        currentPosition: { x: e.clientX, y: e.clientY },
                        targetSlot: { employeeId, timeSlot }
                    }));
                } else {
                    setDragState(prev => ({
                        ...prev,
                        currentPosition: { x: e.clientX, y: e.clientY }
                    }));
                }
            } else {
                setDragState(prev => ({
                    ...prev,
                    currentPosition: { x: e.clientX, y: e.clientY },
                    targetSlot: null
                }));
            }
        }

        if (resizeState.isResizing && resizeState.resizedAppointment) {
            const appointment = resizeState.resizedAppointment;
            const startIndex = timeSlots.findIndex(slot => slot === appointment.startTime);
            const startY = startIndex * TIME_SLOT_HEIGHT + HEADER_HEIGHT;

            let newDuration = resizeState.originalDuration;
            let newStartTime = appointment.startTime;

            if (resizeState.direction === 'bottom') {
                const deltaY = mouseY - startY;
                newDuration = Math.max(15, Math.round(deltaY / TIME_SLOT_HEIGHT) * 15);
            } else if (resizeState.direction === 'top') {
                const originalEndY = startY + (resizeState.originalDuration / 15) * TIME_SLOT_HEIGHT;
                const deltaY = originalEndY - mouseY;
                newDuration = Math.max(15, Math.round(deltaY / TIME_SLOT_HEIGHT) * 15);

                const newStartMinutes = timeToMinutes(appointment.startTime) - (newDuration - resizeState.originalDuration);
                newStartTime = minutesToTime(Math.max(0, newStartMinutes));
            }

            // Only update local state during resize for smooth interaction
            // Final API call will be made in handleMouseUp
            console.log('🔄 Resize preview update:', { newDuration, newStartTime, originalDuration: resizeState.originalDuration })
            if (newDuration !== appointment.duration || newStartTime !== appointment.startTime) {
                console.log('📝 Updating local state for resize preview')
                const newEndMinutes = timeToMinutes(newStartTime) + newDuration;
                setAppointments(prev => prev.map(apt =>
                    String(apt.id) === String(appointment.id) ? {
                        ...apt,
                        startTime: newStartTime,
                        duration: newDuration,
                        endTime: minutesToTime(newEndMinutes)
                    } : apt
                ));
            } else {
                console.log('⚠️ No changes detected in resize preview')
            }
        }
    }, [dragState, resizeState, getPositionFromMouse, timeSlots]);

    const handleMouseUp = useCallback(() => {
        console.log('🖱️ handleMouseUp called')
        console.log('dragState:', dragState)
        console.log('resizeState:', resizeState)

        if (dragState.isDragging && dragState.draggedAppointment && dragState.targetSlot) {
            console.log('🎯 Drag completed, calling updateAppointment')
            console.log('Dragged appointment ID:', dragState.draggedAppointment.id, 'Type:', typeof dragState.draggedAppointment.id)
            const { employeeId, timeSlot } = dragState.targetSlot;
            const appointment = dragState.draggedAppointment;

            if (doesAppointmentFitWorkingHours(employeeId, timeSlot, appointment.duration)) {
                const newEndMinutes = timeToMinutes(timeSlot) + appointment.duration;
                console.log('📤 Calling updateAppointment with:', {
                    appointmentId: appointment.id,
                    employeeId,
                    startTime: timeSlot,
                    endTime: minutesToTime(newEndMinutes)
                })
                updateAppointment(appointment.id, {
                    employeeId,
                    startTime: timeSlot,
                    endTime: minutesToTime(newEndMinutes)
                });
            } else {
                console.log('⚠️ Appointment does not fit working hours')
            }
        }

        // Handle resize completion
        if (resizeState.isResizing && resizeState.resizedAppointment) {
            console.log('📏 Resize completed, calling updateAppointment')
            const appointment = resizeState.resizedAppointment;
            console.log('Resized appointment:', appointment)
            const currentAppointment = appointments.find(apt => String(apt.id) === String(appointment.id));
            console.log('Current appointment in state:', currentAppointment)
            console.log('Original duration:', resizeState.originalDuration, 'Current duration:', currentAppointment?.duration)
            
            if (currentAppointment && currentAppointment.duration !== resizeState.originalDuration) {
                console.log('🔄 Resize completed - sending final update:', {
                    appointmentId: appointment.id,
                    originalDuration: resizeState.originalDuration,
                    newDuration: currentAppointment.duration,
                    direction: resizeState.direction
                });

                // Send final PUT request with the updated duration
                const newEndMinutes = timeToMinutes(currentAppointment.startTime) + currentAppointment.duration;
                console.log('📤 Calling updateAppointment for resize with:', {
                    startTime: currentAppointment.startTime,
                    endTime: minutesToTime(newEndMinutes),
                    duration: currentAppointment.duration
                })
                updateAppointment(appointment.id, {
                    startTime: currentAppointment.startTime,
                    endTime: minutesToTime(newEndMinutes),
                    duration: currentAppointment.duration
                });
            } else {
                console.log('⚠️ No resize changes detected')
            }
        }

        console.log('🔄 Resetting drag and resize states')
        setDragState({
            isDragging: false,
            draggedAppointment: null,
            dragStartPosition: { x: 0, y: 0 },
            currentPosition: { x: 0, y: 0 },
            targetSlot: null,
            dragOffset: { x: 0, y: 0 }
        });

        setResizeState({
            isResizing: false,
            resizedAppointment: null,
            originalDuration: 0,
            direction: null
        });
    }, [dragState, resizeState, appointments, updateAppointment, doesAppointmentFitWorkingHours]);

    // Global mouse event listeners
    useEffect(() => {
        if (dragState.isDragging || resizeState.isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.userSelect = 'none';
            document.body.style.cursor = dragState.isDragging ? 'grabbing' : 'ns-resize';

            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                document.body.style.userSelect = '';
                document.body.style.cursor = '';
            };
        }
    }, [dragState.isDragging, resizeState.isResizing, handleMouseMove, handleMouseUp]);

    // Employee management
    const handleAddEmployee = useCallback(() => {
        if (!newEmployee.masterId) {
            toast({
                title: 'Ошибка',
                description: 'Выберите мастера',
                variant: 'destructive',
            });
            return;
        }

        if (!currentBranch?.id) {
            toast({
                title: 'Ошибка',
                description: 'Не выбран филиал',
                variant: 'destructive',
            });
            return;
        }

        // Добавляем мастера на рабочий день
        addMasterToWorkingDayMutation.mutate({
            masterId: newEmployee.masterId,
            workDate: currentDateStr,
            startTime: newEmployee.startTime,
            endTime: newEmployee.endTime,
            branchId: currentBranch.id.toString()
        });
    }, [newEmployee, currentBranch, currentDateStr, addMasterToWorkingDayMutation, toast, allBranchMasters]);

    const handleRemoveEmployee = useCallback((_employeeId: string) => {
        // This would need to call the API to deactivate a master
        // For now, we'll show a message that this should be done in the Masters page
        alert(t('calendar.delete_masters_on_masters_page'));
    }, []);

    // Appointment management
    const handleAddAppointment = useCallback(() => {
        // Валидация обязательных полей
        if (!newAppointment.clientName.trim()) {
            alert(t('calendar.please_enter_client_name'));
            return;
        }

        if (!newAppointment.phone.trim()) {
            alert(t('calendar.please_enter_phone'));
            return;
        }

        if (!newAppointment.service) {
            alert(t('calendar.please_select_service'));
            return;
        }

        if (!selectedEmployeeId) {
            alert(t('calendar.please_select_master'));
            return;
        }

        if (!selectedTimeSlot) {
            alert(t('calendar.please_select_time'));
            return;
        }

        if (newAppointment.clientName.trim() && newAppointment.phone.trim() && newAppointment.service && selectedEmployeeId && selectedTimeSlot) {
            // Проверяем, что выбрана длительность
            if (!newAppointment.durationPrice) {
                alert(t('calendar.please_select_duration'));
                return;
            }

            // Извлекаем длительность и цену из выбранного значения "duration-price"
            const [duration, servicePrice] = newAppointment.durationPrice.split('-').map(Number);
            
            console.log('📝 Creating appointment with:', { 
                service: newAppointment.service, 
                duration, 
                servicePrice,
                durationPrice: newAppointment.durationPrice 
            });

            if (!doesAppointmentFitWorkingHours(selectedEmployeeId, selectedTimeSlot, duration)) {
                alert(t('calendar.appointment_not_fit'));
                return;
            }

            // Форматируем дату для API в формат YYYY-MM-DD (scheduleDate format)
            const scheduleDate = currentDate.toISOString().split('T')[0];

            // Generate unique task ID
            const organisationId = user?.organisationId || user?.organization_id || user?.orgId || '1';
            const branchId = getBranchIdWithFallback(currentBranch, branches);
            const taskId = generateTaskId(organisationId, branchId);

            // Prepare data for API
            const taskData = {
                id: taskId,
                clientName: newAppointment.clientName.trim(),
                clientPhone: newAppointment.phone.trim() || undefined,
                scheduleDate: scheduleDate,
                scheduleTime: selectedTimeSlot,
                serviceType: newAppointment.service,
                masterId: parseInt(selectedEmployeeId),
                serviceDuration: duration,
                servicePrice: servicePrice,
                branchId: branchId,
                notes: newAppointment.notes || undefined,
                status: 'scheduled'
            };

            console.log('📤 Creating new task with data:', taskData);

            // Send POST request to create task
            createTaskMutation.mutate(taskData, {
                onSuccess: (newTask) => {
                    console.log('✅ Task created successfully:', newTask);

                    // Update local state for immediate UI feedback
                    const startMinutes = timeToMinutes(selectedTimeSlot);
                    const endMinutes = startMinutes + duration;

                    const appointment: Appointment = {
                        id: newTask.id.toString(),
                        employeeId: selectedEmployeeId,
                        clientName: newAppointment.clientName.trim(),
                        service: newAppointment.service,
                        startTime: selectedTimeSlot,
                        endTime: minutesToTime(endMinutes),
                        duration: duration,
                        status: 'scheduled',
                        notes: newAppointment.notes,
                        price: servicePrice,
                        childIds: []
                    };

                    setAppointments(prev => [...prev, appointment]);

                    // Reset form and close dialog
                    setNewAppointment({ clientName: '', phone: '', service: '', startTime: '', duration: 30, notes: '', durationPrice: '' });
                    setSelectedEmployeeId('');
                    setSelectedTimeSlot('');
                    setIsAddAppointmentOpen(false);
                },
                onError: (error) => {
                    console.error('❌ Failed to create task:', error);
                    alert(`Ошибка при создании записи: ${error.message}`);
                }
            });
        }
    }, [newAppointment, selectedEmployeeId, selectedTimeSlot, doesAppointmentFitWorkingHours, currentDate, currentBranch, createTaskMutation, services]);

    const handleTimeSlotClick = useCallback((employeeId: string, timeSlot: string) => {
        if (!isWithinWorkingHours(employeeId, timeSlot)) return;

        setSelectedEmployeeId(employeeId);
        setSelectedTimeSlot(timeSlot);
        setNewAppointment(prev => ({ ...prev, startTime: timeSlot }));
        setIsAddAppointmentOpen(true);
    }, [isWithinWorkingHours]);

    const handleServiceChange = useCallback((serviceName: string) => {
        // Сбрасываем длительность и цену при смене услуги
        setNewAppointment(prev => ({
            ...prev,
            service: serviceName,
            duration: 30, // Временное значение по умолчанию
            durationPrice: '' // Сбрасываем выбранную длительность-цену
        }));
    }, []);

    // Get overlapping appointments and calculate positioning
    const getAppointmentLayout = useCallback((employeeId: string) => {
        const employeeAppointments = appointments.filter(apt => apt.employeeId === employeeId);

        const sortedAppointments = employeeAppointments.sort((a, b) => {
            const aStart = timeToMinutes(a.startTime);
            const bStart = timeToMinutes(b.startTime);
            if (aStart !== bStart) return aStart - bStart;
            return b.duration - a.duration;
        });

        const layoutData: Array<{
            appointment: Appointment;
            column: number;
            width: number;
            totalColumns: number;
            zIndex: number;
        }> = [];

        for (let i = 0; i < sortedAppointments.length; i++) {
            const currentApt = sortedAppointments[i];
            const currentStart = timeToMinutes(currentApt.startTime);
            const currentEnd = timeToMinutes(currentApt.endTime);

            const overlapping = sortedAppointments.filter(apt => {
                const start = timeToMinutes(apt.startTime);
                const end = timeToMinutes(apt.endTime);
                return start < currentEnd && end > currentStart;
            });

            overlapping.sort((a, b) => b.duration - a.duration);

            const totalColumns = overlapping.length;
            const columnIndex = overlapping.findIndex(apt => String(apt.id) === String(currentApt.id));

            const zIndex = 10 + (overlapping.length - columnIndex - 1);

            layoutData.push({
                appointment: currentApt,
                column: columnIndex,
                width: totalColumns > 1 ? 100 / totalColumns : 100,
                totalColumns,
                zIndex
            });
        }

        return layoutData;
    }, [appointments]);

    // Generate colors based on status instead of employee
    const getOverlapColor = useCallback((appointment: Appointment) => {
        // Define colors for each status - новая цветовая схема
        const statusColors = {
            'scheduled': '#10B981',    // green - записан
            'in_progress': '#3B82F6',  // blue - в процессе
            'completed': '#F59E0B',    // yellow - завершен 
            'cancelled': '#EF4444'     // red - отменен
        };

        // Нормализуем статус и обеспечиваем fallback
        const normalizedStatus = appointment.status?.trim() || 'scheduled';
        return statusColors[normalizedStatus] || statusColors.scheduled;
    }, []);

    // Render appointment block with smart positioning
    const renderAppointmentBlock = (layoutInfo: {
        appointment: Appointment;
        column: number;
        width: number;
        totalColumns: number;
        zIndex: number;
    }) => {
        const { appointment, column, width, zIndex } = layoutInfo;
        const startIndex = timeSlots.findIndex(slot => slot === appointment.startTime);
        
        // Вычисляем высоту на основе реального времени между startTime и endTime
        const calculateHeightFromTimes = (startTime: string, endTime: string): number => {
            const [startHours, startMinutes] = startTime.split(':').map(Number);
            const [endHours, endMinutes] = endTime.split(':').map(Number);
            
            const startTotalMinutes = startHours * 60 + startMinutes;
            const endTotalMinutes = endHours * 60 + endMinutes;
            
            const actualDurationMinutes = Math.max(0, endTotalMinutes - startTotalMinutes);
            
            // Каждые 15 минут = один временной слот = TIME_SLOT_HEIGHT пикселей
            return Math.max(20, (actualDurationMinutes / 15) * TIME_SLOT_HEIGHT - 2);
        };
        
        // Используем точное время для вычисления высоты
        const height = appointment.endTime 
            ? calculateHeightFromTimes(appointment.startTime, appointment.endTime)
            : Math.ceil(appointment.duration / 15) * TIME_SLOT_HEIGHT - 2; // fallback к старой логике
        
        const durationSlots = Math.ceil(appointment.duration / 15);

        // Логирование для отладки высоты
        console.log(`📏 Appointment height calculation:`, {
            appointmentId: appointment.id,
            clientName: appointment.clientName,
            duration: appointment.duration,
            durationSlots: durationSlots,
            TIME_SLOT_HEIGHT: TIME_SLOT_HEIGHT,
            calculatedHeight: height,
            startIndex: startIndex,
            startTime: appointment.startTime,
            endTime: appointment.endTime
        });

        const statusColors = {
            'scheduled': 'bg-gradient-to-br from-green-100 to-white text-green-900',        // Зеленый градиент - записан
            'in_progress': 'bg-gradient-to-br from-blue-100 to-white text-blue-900',        // Синий градиент - в процессе  
            'completed': 'bg-gradient-to-br from-yellow-100 to-white text-yellow-900',      // Желтый градиент - завершен
            'cancelled': 'bg-gradient-to-br from-red-100 to-white text-red-900',            // Красный градиент - отменен
            // Fallback для пустых/null значений
            '': 'bg-gradient-to-br from-green-100 to-white text-green-900',
            'null': 'bg-gradient-to-br from-green-100 to-white text-green-900',
            'undefined': 'bg-gradient-to-br from-green-100 to-white text-green-900'
        };

        const statusLabels = {
            'scheduled': 'Запланировано',
            'in_progress': 'В процессе',
            'completed': 'Завершено',
            'cancelled': 'Отменено',
            // Fallback для пустых/null значений
            '': 'Запланировано',
            'null': 'Запланировано',
            'undefined': 'Запланировано'
        };

        const statusColorsTooltip = {
            'scheduled': 'text-green-700 bg-gradient-to-br from-green-100 to-gray-50',       // Зеленый градиент - записан
            'in_progress': 'text-blue-700 bg-gradient-to-br from-blue-100 to-gray-50',       // Синий градиент - в процессе
            'completed': 'text-yellow-700 bg-gradient-to-br from-yellow-100 to-gray-50',     // Желтый градиент - завершен
            'cancelled': 'text-red-700 bg-gradient-to-br from-red-100 to-gray-50',           // Красный градиент - отменен
            // Fallback для пустых/null значений
            '': 'text-green-700 bg-gradient-to-br from-green-100 to-gray-50',
            'null': 'text-green-700 bg-gradient-to-br from-green-100 to-gray-50',
            'undefined': 'text-green-700 bg-gradient-to-br from-green-100 to-gray-50'
        };

        const isDragging = dragState.isDragging && dragState.draggedAppointment?.id === appointment.id;
        const isResizing = resizeState.isResizing && resizeState.resizedAppointment?.id === appointment.id;

        const borderColor = getOverlapColor(appointment);

        // Обновленная логика размеров с учетом новой высоты
        const isVerySmall = height <= 20; // Очень маленькие записи (меньше одного слота)
        const isSmall = height > 20 && height <= 30; // Маленькие записи
        const isMedium = height > 30 && height <= 48; // Средние записи (2 слота)
        // isLarge используется в else condition

        const employee = employees.find(emp => emp.id === appointment.employeeId);
        const service = services.find(s => s.name === appointment.service);

        return (
            <Tooltip key={appointment.id}>
                <TaskDialogBtn taskId={parseInt(appointment.id)}>
                    <TooltipTrigger asChild>
                        <div
                            className={`absolute border-l-8 rounded-r-md text-xs group transition-all duration-100 ${statusColors[appointment.status as keyof typeof statusColors] || statusColors.scheduled
                                } ${isDragging ? 'opacity-70 scale-105 shadow-xl ring-2 ring-blue-400/50' : 'shadow-sm hover:shadow-md'} ${isResizing ? 'ring-2 ring-blue-400' : ''
                                } hover:opacity-90`}
                            style={{
                                top: startIndex * TIME_SLOT_HEIGHT + 1,
                                height: Math.max(height, 20), // Минимальная высота уменьшена до 20px
                                left: `${(column * width)}%`,
                                width: `${width}%`,
                                paddingLeft: column > 0 ? '4px' : '8px',
                                paddingRight: '4px',
                                borderLeftColor: borderColor,
                                zIndex: zIndex,
                                cursor: 'grab'
                            }}
                        >
                            {/* Resize handles */}
                            <div
                                className="absolute top-0 left-0 right-0 h-3 cursor-ns-resize opacity-0"
                                onMouseDown={(e) => handleMouseDown(e, appointment, 'resize-top')}
                            />

                            {/* Content */}
                            <div
                                className={`${isVerySmall || isSmall ? 'px-1 py-0.5' : 'px-2 py-1'} h-full flex ${isVerySmall || isSmall ? 'items-center' : 'flex-col justify-between'} cursor-grab active:cursor-grabbing relative`}
                                onMouseDown={(e) => handleMouseDown(e, appointment, 'drag')}
                            >
                                {/* Иконка монетки для неоплаченных записей */}
                                {appointment.paid !== 'paid' && (
                                    <div className="absolute top-0 right-0 z-10">
                                        <Coins className="h-6 w-6 text-amber-500" />
                                    </div>
                                )}
                                
                                {isVerySmall ? (
                                    // Очень маленькие записи - только инициалы клиента
                                    <div className="flex-1 min-w-0 pointer-events-none">
                                        <div className="font-semibold truncate text-xs leading-none">
                                            {appointment.clientName.split(' ').map(name => name[0]).join('.')}
                                        </div>
                                    </div>
                                ) : isSmall ? (
                                    // Маленькие записи - только имя клиента
                                    <div className="flex-1 min-w-0 pointer-events-none pr-4">
                                        <div className="font-semibold truncate text-xs leading-tight">{appointment.clientName}</div>
                                    </div>
                                ) : isMedium ? (
                                    // Средние записи - имя клиента и услуга
                                    <div className="flex-1 min-w-0 pointer-events-none pr-4">
                                        <div className="font-semibold truncate text-xs leading-tight">{appointment.clientName}</div>
                                        <div className="truncate text-xs opacity-70 leading-tight mt-0.5">{appointment.service}</div>
                                    </div>
                                ) : (
                                    // Большие записи - полная информация
                                    <>
                                        <div className="flex items-start justify-between pr-4">
                                            <div className="flex-1 min-w-0 pointer-events-none">
                                                <div className="font-semibold truncate text-sm leading-tight">{appointment.clientName}</div>
                                                <div className="truncate text-xs opacity-70 leading-tight mt-0.5">{appointment.service}</div>
                                            </div>
                                        </div>

                                        {width > 50 && (
                                            <div className="text-xs opacity-60 mt-auto pointer-events-none leading-tight">
                                                {appointment.startTime} - {appointment.endTime}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            <div
                                className="absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize opacity-0"
                                onMouseDown={(e) => handleMouseDown(e, appointment, 'resize-bottom')}
                            />
                        </div>
                    </TooltipTrigger>
                </TaskDialogBtn>
                <TooltipContent className="bg-white border border-gray-300 rounded-lg shadow-xl p-4 min-w-64 max-w-80">
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: employee?.color || '#3B82F6' }}
                            />
                            <h3 className="font-semibold text-gray-900">{appointment.clientName}</h3>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${statusColorsTooltip[appointment.status as keyof typeof statusColorsTooltip] || statusColorsTooltip.scheduled}`}>
                            {statusLabels[appointment.status as keyof typeof statusLabels] || statusLabels.scheduled}
                        </span>
                    </div>

                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Мастер:</span>
                            <span className="font-medium">{employee?.name}</span>
                        </div>

                        <div className="flex justify-between">
                            <span className="text-gray-600">Услуга:</span>
                            <span className="font-medium">{appointment.service}</span>
                        </div>

                        <div className="flex justify-between">
                            <span className="text-gray-600">Время:</span>
                            <span className="font-medium">{appointment.startTime} - {appointment.endTime}</span>
                        </div>

                        <div className="flex justify-between">
                            <span className="text-gray-600">Длительность:</span>
                            <span className="font-medium">{appointment.duration} {t('calendar.min')}</span>
                        </div>

                        {service && (
                            <div className="flex justify-between">
                                <span className="text-gray-600">Стоимость:</span>
                                <span className="font-medium">{service.price} сом</span>
                            </div>
                        )}

                        <div className="flex justify-between">
                            <span className="text-gray-600">Оплата:</span>
                            <span className={`font-medium ${appointment.paid === 'paid' ? 'text-green-600' : 'text-red-600'}`}>
                                {appointment.paid === 'paid' ? t('calendar.paid') : t('calendar.not_paid_status')}
                                {appointment.paid !== 'paid' && <Coins className="inline h-6 w-6 ml-1 text-amber-500" />}
                            </span>
                        </div>

                        {/* Дополнительные услуги */}
                        {appointment.childServices && appointment.childServices.length > 0 && (
                            <div className="pt-2 border-t border-gray-200">
                                <span className="text-gray-600 text-xs font-medium">{t('calendar.additional_services_label')}</span>
                                <div className="mt-1 space-y-1">
                                    {appointment.childServices.map((childService, index) => (
                                        <div key={index} className="text-xs bg-amber-50 p-2 rounded">
                                            <div className="font-medium text-amber-800">
                                                📎 {childService.serviceType || 'Дополнительная услуга'}
                                            </div>
                                            <div className="text-amber-600">
                                                {childService.serviceDuration || childService.duration || 0} {t('calendar.min')}
                                                {childService.servicePrice && ` • ${childService.servicePrice} сом`}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {appointment.notes && (
                            <div className="pt-2 border-t border-gray-200">
                                <span className="text-gray-600 text-xs">Примечания:</span>
                                <p className="text-gray-900 mt-1">{appointment.notes}</p>
                            </div>
                        )}
                    </div>
                </TooltipContent>
            </Tooltip>
        );
    };

    return (
        <TooltipProvider>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {/* Loading State */}
                {isLoading && (
                    <div className="p-8 text-center">
                        <div className="flex items-center justify-center gap-3">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                            <span className="text-gray-600">Загрузка расписания...</span>
                        </div>
                    </div>
                )}

                {/* Error State */}
                {hasError && !isLoading && (
                    <div className="p-8 text-center">
                        <div className="text-red-600 mb-2">
                            <X size={24} className="mx-auto mb-2" />
                            Ошибка загрузки данных
                        </div>
                        <p className="text-gray-600 text-sm">
                            {mastersError?.message || tasksError?.message || servicesError?.message || workingDatesError?.message || 'Неизвестная ошибка'}
                        </p>
                    </div>
                )}

                {/* Empty State - No working masters */}
                {!isLoading && !hasError && employees.length === 0 && (
                    <div className="p-8 text-center">
                        <Calendar size={24} className="mx-auto mb-2 text-gray-400" />
                        <p className="text-gray-600">Нет мастеров, работающих в выбранную дату</p>
                        <p className="text-gray-400 text-sm mt-1">
                            {mastersData.length > 0 
                                ? `Найдено ${mastersData.length} мастеров, но они не работают ${dateString}`
                                : 'Добавьте мастеров на странице "Мастера"'
                            }
                        </p>
                    </div>
                )}

                {/* Main Content */}
                {!isLoading && !hasError && employees.length > 0 && (
                    <>
                        {/* Header */}
                        <div className="p-3 sm:p-6 border-b border-gray-200 bg-gray-50">
                            {/* Mobile Date Selector - visible only on mobile */}
                            <div className="mb-3 sm:hidden">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="date"
                                        value={currentDate.toISOString().split('T')[0]}
                                        onChange={(e) => {
                                            const newDate = new Date(e.target.value);
                                            if (!isNaN(newDate.getTime())) {
                                                const newUrl = `${window.location.pathname}?date=${e.target.value}`;
                                                window.history.pushState({ date: e.target.value }, '', newUrl);
                                                window.location.reload();
                                            }
                                        }}
                                        className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs"
                                    />
                                    <button
                                        onClick={() => {
                                            const today = new Date().toISOString().split('T')[0];
                                            const newUrl = `${window.location.pathname}?date=${today}`;
                                            window.history.pushState({ date: today }, '', newUrl);
                                            window.location.reload();
                                        }}
                                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium whitespace-nowrap"
                                    >
                                        {t('common.today') || 'Сегодня'}
                                    </button>
                                    {/* Переключатель 24-часового режима */}
                                    <button
                                        onClick={handleToggle24hMode}
                                        disabled={updateView24hMutation.isPending}
                                        className={`px-3 py-1.5 rounded-lg transition-colors text-xs font-medium whitespace-nowrap flex items-center gap-1 ${
                                            is24hMode 
                                                ? 'bg-purple-600 text-white hover:bg-purple-700' 
                                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        } ${updateView24hMutation.isPending ? 'opacity-50 cursor-wait' : ''}`}
                                        title={is24hMode ? 'Переключить на дневной режим (7:00-24:00)' : 'Переключить на 24-часовой режим (00:00-23:59)'}
                                    >
                                        <Clock3 size={14} />
                                        {updateView24hMutation.isPending ? '...' : (is24hMode ? '24ч' : '7-24')}
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-2 sm:gap-3">
                                    <Calendar className="text-gray-600 hidden sm:block" size={20} />
                                    <div>
                                        <h2 className="text-sm sm:text-xl font-semibold text-gray-900">
                                            {t('calendar.schedule_for', { date: dateString })}
                                        </h2>
                                        <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">
                                            {employees.length > 0 
                                                ? t('calendar.working_masters', { working: employees.length, total: mastersData.length })
                                                : mastersData.length > 0
                                                    ? `Ни один из ${mastersData.length} мастеров не работает`
                                                    : 'Нет мастеров'
                                            }
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                                    {/* Переключатель 24-часового режима (десктоп) */}
                                    <button
                                        onClick={handleToggle24hMode}
                                        disabled={updateView24hMutation.isPending}
                                        className={`hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                                            is24hMode 
                                                ? 'bg-purple-600 text-white hover:bg-purple-700' 
                                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        } ${updateView24hMutation.isPending ? 'opacity-50 cursor-wait' : ''}`}
                                        title={is24hMode ? 'Переключить на дневной режим (7:00-24:00)' : 'Переключить на 24-часовой режим (00:00-23:59)'}
                                    >
                                        <Clock3 size={16} />
                                        {updateView24hMutation.isPending ? 'Сохранение...' : (is24hMode ? '24 часа' : '7:00-24:00')}
                                    </button>
                                    
                                    <CancelledAppointments selectedDate={currentDate} />
                                    
                                    <DialogWrapper open={isAddEmployeeOpen} onOpenChange={setIsAddEmployeeOpen}>
                                        <DialogTrigger asChild>
                                            <button className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-xs sm:text-sm">
                                                <Plus size={16} className="sm:w-[18px] sm:h-[18px]" />
                                                <span className="hidden sm:inline">{t('calendar.add_employee')}</span>
                                                <span className="sm:hidden">{t('calendar.add_master') || 'Мастер'}</span>
                                            </button>
                                        </DialogTrigger>
                                    <DialogContentWrapper className={isMobile ? "" : "sm:max-w-[500px]"}>
                                        <MobileDialogWrapper
                                            isMobile={isMobile}
                                            header={
                                                isMobile ? (
                                                    <div className="flex items-center gap-2">
                                                        <User size={18} />
                                                        <span className="font-semibold">{t('calendar.add_master_to_day')}</span>
                                                    </div>
                                                ) : (
                                                    <DialogHeader>
                                                        <DialogTitle className="flex items-center gap-2">
                                                            <User size={20} />
                                                            {t('calendar.add_master_to_day')}
                                                        </DialogTitle>
                                                    </DialogHeader>
                                                )
                                            }
                                            content={
                                                <div className="space-y-6 py-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    {t('calendar.select_master_required')}
                                                </label>
                                                <select
                                                    value={newEmployee.masterId}
                                                    onChange={(e) => setNewEmployee(prev => ({ ...prev, masterId: e.target.value }))}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    disabled={allMastersLoading}
                                                >
                                                    <option value="">{allMastersLoading ? t('calendar.loading') : t('calendar.select_master')}</option>
                                                    {allBranchMasters
                                                        .filter(master => master.isActive)
                                                        .filter(master => !employees.some(emp => emp.id === master.id.toString()))
                                                        .map(master => (
                                                            <option key={master.id} value={master.id}>
                                                                {master.name} - {master.specialization || 'Без специализации'}
                                                            </option>
                                                        ))
                                                    }
                                                </select>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {t('calendar.date_label', { date: currentDateStr })}
                                                </p>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        {t('calendar.start_shift')}
                                                    </label>
                                                    <select
                                                        value={newEmployee.startTime}
                                                        onChange={(e) => setNewEmployee(prev => ({ ...prev, startTime: e.target.value }))}
                                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    >
                                                        {timeSlots.filter((_, index) => index % 4 === 0).map(time => (
                                                            <option key={time} value={time}>{time}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        {t('calendar.end_shift')}
                                                    </label>
                                                    <select
                                                        value={newEmployee.endTime}
                                                        onChange={(e) => setNewEmployee(prev => ({ ...prev, endTime: e.target.value }))}
                                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    >
                                                        {timeSlots.filter((_, index) => index % 4 === 0).map(time => (
                                                            <option key={time} value={time}>{time}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                                </div>
                                            }
                                            footer={
                                                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                                                    <button
                                                        onClick={() => setIsAddEmployeeOpen(false)}
                                                        className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                                    >
                                                        {t('common.cancel')}
                                                    </button>
                                                    <button
                                                        onClick={handleAddEmployee}
                                                        disabled={!newEmployee.masterId || addMasterToWorkingDayMutation.isPending}
                                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                                                    >
                                                        {addMasterToWorkingDayMutation.isPending && (
                                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                        )}
                                                        {addMasterToWorkingDayMutation.isPending ? t('calendar.adding') : t('calendar.add_to_day_button')}
                                                    </button>
                                                </div>
                                            }
                                        />
                                    </DialogContentWrapper>
                                </DialogWrapper>
                            </div>
                            </div>
                        </div>

                        {/* Schedule Grid */}
                        <div className="flex overflow-x-auto max-h-screen overflow-y-auto">
                            {/* Status indicator */}
                            {(dragState.isDragging || resizeState.isResizing) && (
                                <div className="fixed top-4 right-4 bg-blue-600 text-white px-3 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2">
                                    {dragState.isDragging && (
                                        <>
                                            <GripVertical size={16} />
                                            {dragState.targetSlot ? (
                                                <span>
                                                    {t('calendar.moving_to', { 
                                                        masterName: employees.find(emp => emp.id === dragState.targetSlot!.employeeId)?.name,
                                                        timeSlot: dragState.targetSlot.timeSlot
                                                    })}
                                                </span>
                                            ) : (
                                                t('calendar.drag_to_position')
                                            )}
                                        </>
                                    )}
                                    {resizeState.isResizing && (
                                        <>
                                            <Clock size={16} />
                                            {t('calendar.duration_change', { duration: String(resizeState.resizedAppointment?.duration || 0) })}
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Time Column - Sticky при горизонтальном и вертикальном скролле */}
                            <div className="w-14 sm:w-20 flex-shrink-0 border-r border-gray-200 bg-gray-50 sticky left-0 z-30">
                                <div className="h-12 sm:h-16 border-b border-gray-200 flex items-center justify-center sticky top-0 z-40 bg-gray-50 shadow-sm">
                                    <Clock size={14} className="text-gray-500 sm:w-4 sm:h-4" />
                                </div>
                                {timeSlots.map((slot, index) => (
                                    <div
                                        key={slot}
                                        className={`flex items-center justify-center text-[9px] sm:text-sm border-b border-gray-100 ${index % 4 === 0 ? 'font-medium text-gray-700' : 'text-gray-500'
                                            }`}
                                        style={{ height: `${TIME_SLOT_HEIGHT}px` }} // Используем точную высоту из константы
                                    >
                                        {index % 4 === 0 ? slot : ''}
                                    </div>
                                ))}
                            </div>

                            {/* Employee Columns */}
                            <div className="flex-1 relative" ref={scheduleRef}>
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

                                {/* Drag Preview */}
                                {dragState.isDragging && dragState.targetSlot && (
                                    <div
                                        className={`fixed border-l-4 rounded-r-xl z-50 pointer-events-none ${doesAppointmentFitWorkingHours(
                                            dragState.targetSlot.employeeId,
                                            dragState.targetSlot.timeSlot,
                                            dragState.draggedAppointment?.duration || 45
                                        )
                                            ? 'bg-gradient-to-r from-blue-100 via-blue-50 to-transparent border-blue-400 shadow-xl'
                                            : 'bg-gradient-to-r from-red-100 via-red-50 to-transparent border-red-400 shadow-xl'
                                            } backdrop-blur-sm`}
                                        style={{
                                            top: dragState.currentPosition.y - 20,
                                            left: dragState.currentPosition.x - 100,
                                            width: '200px',
                                            height: Math.ceil((dragState.draggedAppointment?.duration || 45) / 15) * TIME_SLOT_HEIGHT - 2
                                        }}
                                    >
                                        <div className={`p-3 text-xs font-medium h-full flex flex-col justify-between relative overflow-hidden ${doesAppointmentFitWorkingHours(
                                            dragState.targetSlot.employeeId,
                                            dragState.targetSlot.timeSlot,
                                            dragState.draggedAppointment?.duration || 45
                                        )
                                            ? 'text-blue-800'
                                            : 'text-red-800'
                                            }`}>
                                            <div className="relative z-10">
                                                <div className="font-bold truncate text-sm tracking-tight">{dragState.draggedAppointment?.clientName}</div>
                                                <div className="truncate opacity-80 font-medium">{dragState.draggedAppointment?.service}</div>
                                            </div>

                                            <div className="opacity-70 mt-auto relative z-10">
                                                <div className="font-semibold">
                                                    {dragState.targetSlot.timeSlot} - {minutesToTime(
                                                        timeToMinutes(dragState.targetSlot.timeSlot) + (dragState.draggedAppointment?.duration || 45)
                                                    )}
                                                </div>
                                                <div className="text-xs opacity-60">
                                                    ({dragState.draggedAppointment?.duration} {t('calendar.min')})
                                                    <br />
                                                    → {employees.find(emp => emp.id === dragState.targetSlot!.employeeId)?.name}
                                                </div>
                                                {!doesAppointmentFitWorkingHours(
                                                    dragState.targetSlot.employeeId,
                                                    dragState.targetSlot.timeSlot,
                                                    dragState.draggedAppointment?.duration || 45
                                                ) && (
                                                        <div className="text-red-700 font-bold text-xs mt-1">⚠ Вне рабочих часов</div>
                                                    )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Drop zone indicator */}
                                {dragState.isDragging && dragState.targetSlot && (
                                    <div
                                        className={`absolute rounded-md z-20 pointer-events-none ${doesAppointmentFitWorkingHours(
                                            dragState.targetSlot.employeeId,
                                            dragState.targetSlot.timeSlot,
                                            dragState.draggedAppointment?.duration || 45
                                        )
                                            ? 'bg-blue-200/30 border-2 border-dashed border-blue-400'
                                            : 'bg-red-200/30 border-2 border-dashed border-red-400'
                                            }`}
                                        style={{
                                            top: timeSlots.findIndex(slot => slot === dragState.targetSlot!.timeSlot) * TIME_SLOT_HEIGHT + HEADER_HEIGHT + 1,
                                            height: Math.ceil((dragState.draggedAppointment?.duration || 45) / 15) * TIME_SLOT_HEIGHT - 2,
                                            left: employees.findIndex(emp => emp.id === dragState.targetSlot!.employeeId) * getEmployeeColumnWidth + 4,
                                            width: getEmployeeColumnWidth - 8
                                        }}
                                    />
                                )}

                                <div className="flex">
                                    {employees.map((employee) => (
                                        <div
                                            key={employee.id}
                                            className="border-r border-gray-200 last:border-r-0 flex-shrink-0"
                                            style={{ 
                                                width: `${getEmployeeColumnWidth}px`,
                                                minWidth: `${getEmployeeColumnWidth}px`
                                            }}
                                        >
                                            {/* Employee Header - Sticky */}
                                            <div className="h-12 sm:h-16 p-2 sm:p-3 border-b border-gray-200 bg-white relative group sticky top-0 z-10 shadow-sm">
                                                <div className="flex items-center gap-1.5 sm:gap-3">
                                                    {/* Фото или аватар мастера */}
                                                    {employee.photoUrl ? (
                                                        <Avatar className="w-7 h-7 sm:w-10 sm:h-10 flex-shrink-0">
                                                            <AvatarImage src={employee.photoUrl} alt={employee.name} />
                                                            <AvatarFallback style={{ backgroundColor: employee.color }} className="text-white font-medium text-xs sm:text-sm">
                                                                {employee.name[0]}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                    ) : (
                                                        <div
                                                            className="w-7 h-7 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white font-medium text-xs sm:text-sm flex-shrink-0"
                                                            style={{ backgroundColor: employee.color }}
                                                        >
                                                            {employee.name[0]}
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-semibold text-[10px] sm:text-sm text-gray-900 truncate">
                                                            {employee.name}
                                                        </div>
                                                        <div className="text-[9px] sm:text-xs text-gray-500 truncate">
                                                            {employee.role}
                                                        </div>
                                                        <div className="text-[9px] sm:text-xs font-medium" style={{ color: employee.color }}>
                                                            {employee.workHours.start} - {employee.workHours.end}
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleRemoveEmployee(employee.id)}
                                                        className="p-0.5 sm:p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded flex-shrink-0"
                                                        title={t('calendar.delete_employee')}
                                                    >
                                                        <X size={14} className="sm:w-4 sm:h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Time Slots */}
                                            <div className="relative">
                                                {timeSlots.map((slot) => {
                                                    const isWorkingHours = isWithinWorkingHours(employee.id, slot);

                                                    if (!isWorkingHours) {
                                                        return (
                                                            <div
                                                                key={`${employee.id}-${slot}`}
                                                                className="bg-gray-100 border-b border-gray-200"
                                                                style={{ height: `${TIME_SLOT_HEIGHT}px` }}
                                                            />
                                                        );
                                                    }

                                                    return (
                                                        <button
                                                            key={`${employee.id}-${slot}`}
                                                            onClick={() => handleTimeSlotClick(employee.id, slot)}
                                                            className="w-full border-b border-gray-200 hover:bg-blue-50 group transition-colors flex items-center justify-center relative"
                                                            style={{ height: `${TIME_SLOT_HEIGHT}px` }}
                                                        >
                                                            <Plus
                                                                size={14}
                                                                className="text-gray-300 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all"
                                                            />
                                                        </button>
                                                    );
                                                })}

                                                {/* Render appointment blocks for this employee with smart layout */}
                                                {getAppointmentLayout(employee.id).map((layoutInfo) =>
                                                    renderAppointmentBlock(layoutInfo)
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Add Appointment Modal */}
                        <DialogWrapper open={isAddAppointmentOpen} onOpenChange={setIsAddAppointmentOpen}>
                            <DialogContentWrapper className={isMobile ? "" : "sm:max-w-[500px]"}>
                                <MobileDialogWrapper
                                    isMobile={isMobile}
                                    header={
                                        isMobile ? (
                                            <div className="flex items-center gap-2">
                                                <Calendar size={18} />
                                                <span className="font-semibold">{t('calendar.new_appointment_at')} {selectedTimeSlot}</span>
                                            </div>
                                        ) : (
                                            <DialogHeader>
                                                <DialogTitle className="flex items-center gap-2">
                                                    <Calendar size={20} />
                                                    {t('calendar.new_appointment_at')} {selectedTimeSlot}
                                                </DialogTitle>
                                            </DialogHeader>
                                        )
                                    }
                                    content={
                                        <div className="space-y-6 py-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            {t('calendar.client_name_label')} *
                                        </label>
                                        <input
                                            type="text"
                                            value={newAppointment.clientName}
                                            onChange={(e) => setNewAppointment(prev => ({ ...prev, clientName: e.target.value }))}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder={t('calendar.client_name_placeholder')}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            {t('calendar.phone_label')} *
                                        </label>
                                        <input
                                            type="tel"
                                            value={newAppointment.phone}
                                            onChange={(e) => setNewAppointment(prev => ({ ...prev, phone: e.target.value }))}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder={t('calendar.phone_placeholder')}
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            {t('calendar.service_label')} *
                                        </label>
                                        <select
                                            value={newAppointment.service}
                                            onChange={(e) => handleServiceChange(e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            <option value="">{t('calendar.select_service')}</option>
                                            {servicesData.map(service => (
                                                <option key={service.id} value={service.name}>
                                                    {service.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            {t('calendar.duration_label')} *
                                        </label>
                                        <select
                                            value={newAppointment.durationPrice || ''}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                if (value) {
                                                    const [duration, price] = value.split('-').map(Number);
                                                    setNewAppointment(prev => ({
                                                        ...prev,
                                                        duration: duration,
                                                        durationPrice: value
                                                    }));
                                                }
                                            }}
                                            disabled={!newAppointment.service}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                                        >
                                            <option value="">
                                                {!newAppointment.service 
                                                    ? t('calendar.select_service_first') 
                                                    : t('calendar.select_duration_label')}
                                            </option>
                                            {newAppointment.service && (() => {
                                                const selectedService = servicesData.find(s => s.name === newAppointment.service);
                                                if (!selectedService) return null;
                                                
                                                const durations = [
                                                    { duration: 10, price: selectedService.duration10_price },
                                                    { duration: 15, price: selectedService.duration15_price },
                                                    { duration: 20, price: selectedService.duration20_price },
                                                    { duration: 30, price: selectedService.duration30_price },
                                                    { duration: 40, price: selectedService.duration40_price },
                                                    { duration: 50, price: selectedService.duration50_price },
                                                    { duration: 60, price: selectedService.duration60_price },
                                                    { duration: 75, price: selectedService.duration75_price },
                                                    { duration: 80, price: selectedService.duration80_price },
                                                    { duration: 90, price: selectedService.duration90_price },
                                                    { duration: 110, price: selectedService.duration110_price },
                                                    { duration: 120, price: selectedService.duration120_price },
                                                    { duration: 150, price: selectedService.duration150_price },
                                                    { duration: 220, price: selectedService.duration220_price },
                                                ].filter(d => d.price && d.price > 0);
                                                
                                                return durations.map(({ duration, price }) => (
                                                    <option key={`${duration}-${price}`} value={`${duration}-${price}`}>
                                                        {duration} {t('calendar.min')} - {price} {t('calendar.som')}
                                                    </option>
                                                ));
                                            })()}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            {t('calendar.notes_label')}
                                        </label>
                                        <textarea
                                            value={newAppointment.notes}
                                            onChange={(e) => setNewAppointment(prev => ({ ...prev, notes: e.target.value }))}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                                            rows={3}
                                            placeholder={t('calendar.notes_placeholder')}
                                        />
                                    </div>

                                    {selectedEmployeeId && (
                                        <div className="p-3 bg-gray-50 rounded-lg">
                                            <div className="text-sm font-medium text-gray-700">
                                                {t('calendar.employee_label')} {employees.find(emp => emp.id === selectedEmployeeId)?.name}
                                            </div>
                                            <div className="text-sm text-gray-600">
                                                {t('calendar.time_label')} {selectedTimeSlot} - {minutesToTime(timeToMinutes(selectedTimeSlot) + newAppointment.duration)}
                                            </div>
                                        </div>
                                    )}

                                        </div>
                                    }
                                    footer={
                                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                                            <button
                                                onClick={() => setIsAddAppointmentOpen(false)}
                                                className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                            >
                                                {t('common.cancel')}
                                            </button>
                                            <button
                                                onClick={handleAddAppointment}
                                                disabled={!newAppointment.clientName.trim() || !newAppointment.phone.trim() || !newAppointment.service || createTaskMutation.isPending}
                                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                                            >
                                                {createTaskMutation.isPending && (
                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                )}
                                                {createTaskMutation.isPending ? t('calendar.creating') : t('calendar.create_appointment')}
                                            </button>
                                        </div>
                                    }
                                />
                            </DialogContentWrapper>
                        </DialogWrapper>
                    </>
                )}
            </div>
        </TooltipProvider>
    );
};

export default AdvancedScheduleComponent;