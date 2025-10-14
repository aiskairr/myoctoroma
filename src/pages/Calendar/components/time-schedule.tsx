import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Plus, X, Clock, User, Calendar, GripVertical, Coins } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
import type { Master } from '@/hooks/use-masters';

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

// Интерфейс для дополнительной услуги
interface AdditionalService {
    id: number;
    serviceId: number;
    serviceName: string;
    duration: number;
    price: number;
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

const getCurrentTimePosition = (): number => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = 7 * 60;
    return Math.max(0, (currentMinutes - startMinutes) / 15) * TIME_SLOT_HEIGHT;
};

// Main Component
const AdvancedScheduleComponent: React.FC<AdvancedScheduleComponentProps> = ({ initialDate }) => {
    // State
    const currentDate = useMemo(() => initialDate || new Date(), [initialDate]);
    
    console.log('📅 AdvancedScheduleComponent mounted with initialDate:', initialDate?.toISOString(), 'currentDate:', currentDate.toISOString());

    // Debug: логируем изменения даты
    useEffect(() => {
        console.log('📅 currentDate changed to:', currentDate.toISOString());
    }, [currentDate]);

    // Context
    const { currentBranch } = useBranch();
    const { user } = useAuth();
    const { t } = useLocale();

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
            // Инвалидируем кэш календарных задач
            queryClient.invalidateQueries({ queryKey: ['calendar-tasks'] });
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
                
                const workHours = workingDate ? {
                    start: workingDate.start_time,
                    end: workingDate.end_time
                } : {
                    start: master.startWorkHour || '07:00',
                    end: master.endWorkHour || '23:59'
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
                    workingDate: workingDate || null
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
    const [currentTimePosition, setCurrentTimePosition] = useState(getCurrentTimePosition());

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

    // States for additional services
    const [additionalServices, setAdditionalServices] = useState<AdditionalService[]>([]);
    const [selectedAdditionalService, setSelectedAdditionalService] = useState<string>('');

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
        duration: 45,
        notes: ''
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
            setCurrentTimePosition(getCurrentTimePosition());
        }, 60000);
        return () => clearInterval(interval);
    }, []);

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
    const timeSlots = useMemo(() => generateTimeSlots(), []);

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
                payload.branchId = currentTask.branchId || '1';
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
                payload.branchId = '1';
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
            } else if (currentTask) {
                // Сохраняем текущего мастера если он не изменяется
                payload.masterId = currentTask.masterId;
                payload.masterName = currentTask.masterName || currentTask.master?.name;
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
    }, [employees, mastersData, updateTaskMutation]);

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

    // Additional services functions
    const calculateTotalDuration = useCallback((baseAppointment?: Partial<Appointment> | null) => {
        const mainDuration = baseAppointment?.duration || 0;
        const additionalDuration = additionalServices.reduce((sum, service) => sum + service.duration, 0);
        return mainDuration + additionalDuration;
    }, [additionalServices]);

    const calculateTotalPrice = useCallback((baseAppointment?: Partial<Appointment> | null) => {
        const mainPrice = baseAppointment?.price || 0;
        const additionalPrice = additionalServices.reduce((sum, service) => sum + service.price, 0);
        return mainPrice + additionalPrice;
    }, [additionalServices]);

    const addAdditionalService = useCallback((serviceName: string) => {
        const service = services.find(s => s.name === serviceName);
        if (service) {
            const newService: AdditionalService = {
                id: Date.now(), // Temporary ID
                serviceId: service.id || 0,
                serviceName: service.name,
                duration: service.duration,
                price: service.price
            };
            setAdditionalServices(prev => [...prev, newService]);
            setSelectedAdditionalService('');
        }
    }, [services]);

    const removeAdditionalService = useCallback((serviceId: number) => {
        setAdditionalServices(prev => prev.filter(service => service.id !== serviceId));
    }, []);

    const updateAdditionalServiceDuration = useCallback((serviceId: number, duration: number) => {
        setAdditionalServices(prev => 
            prev.map(service => 
                service.id === serviceId 
                    ? { ...service, duration, price: Math.round((duration / 60) * service.price) }
                    : service
            )
        );
    }, []);

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
        alert('Удаление мастеров выполняется на странице "Мастера"');
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
            alert('Пожалуйста, выберите услугу');
            return;
        }

        if (!selectedEmployeeId) {
            alert('Пожалуйста, выберите мастера');
            return;
        }

        if (!selectedTimeSlot) {
            alert('Пожалуйста, выберите время');
            return;
        }

        if (newAppointment.clientName.trim() && newAppointment.phone.trim() && newAppointment.service && selectedEmployeeId && selectedTimeSlot) {
            const service = services.find(s => s.name === newAppointment.service);
            const duration = service?.duration || newAppointment.duration;

            if (!doesAppointmentFitWorkingHours(selectedEmployeeId, selectedTimeSlot, duration)) {
                alert(t('calendar.appointment_not_fit'));
                return;
            }

            // Форматируем дату для API в формат YYYY-MM-DD (scheduleDate format)
            const scheduleDate = currentDate.toISOString().split('T')[0];

            // Get service price
            const servicePrice = service?.price || 0;

            // Generate unique task ID
            const organisationId = user?.organisationId || user?.organization_id || user?.orgId || '1';
            const branchId = currentBranch?.id?.toString() || '1';
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
                onSuccess: async (newTask) => {
                    console.log('✅ Task created successfully:', newTask);

                    // Create additional services if any
                    if (additionalServices.length > 0) {
                        for (const [index, service] of additionalServices.entries()) {
                            try {
                                // Calculate start time for additional service
                                let additionalStartTime = selectedTimeSlot;
                                
                                // Add main service duration
                                let totalPreviousDuration = duration;
                                
                                // Add duration of previous additional services
                                for (let i = 0; i < index; i++) {
                                    totalPreviousDuration += additionalServices[i].duration;
                                }
                                
                                additionalStartTime = minutesToTime(timeToMinutes(selectedTimeSlot) + totalPreviousDuration);

                                const additionalTaskData = {
                                    id: generateTaskId(organisationId, branchId),
                                    clientName: newAppointment.clientName.trim(),
                                    clientPhone: newAppointment.phone.trim() || undefined,
                                    scheduleDate: scheduleDate,
                                    scheduleTime: additionalStartTime,
                                    serviceType: service.serviceName,
                                    masterId: parseInt(selectedEmployeeId),
                                    serviceDuration: service.duration,
                                    servicePrice: service.price,
                                    branchId: branchId,
                                    notes: `Дополнительная услуга к основной записи #${newTask.id}`,
                                    status: 'scheduled',
                                    motherId: newTask.id // Link to main appointment
                                };

                                console.log(`📤 Creating additional service ${index + 1}:`, additionalTaskData);
                                
                                // Create additional service
                                await createTaskMutation.mutateAsync(additionalTaskData);
                                
                            } catch (error) {
                                console.error(`❌ Failed to create additional service ${index + 1}:`, error);
                                // Continue with other services even if one fails
                            }
                        }
                    }

                    // Optionally update local state for immediate UI feedback
                    const startMinutes = timeToMinutes(selectedTimeSlot);
                    const totalDurationWithServices = calculateTotalDuration({ duration });
                    const endMinutes = startMinutes + totalDurationWithServices;

                    const appointment: Appointment = {
                        id: newTask.id.toString(),
                        employeeId: selectedEmployeeId,
                        clientName: newAppointment.clientName.trim(),
                        service: newAppointment.service,
                        startTime: selectedTimeSlot,
                        endTime: minutesToTime(endMinutes),
                        duration: totalDurationWithServices,
                        status: 'scheduled',
                        notes: newAppointment.notes,
                        price: calculateTotalPrice({ price: servicePrice }),
                        childIds: additionalServices.map(s => s.id.toString())
                    };

                    setAppointments(prev => [...prev, appointment]);

                    // Reset form and close dialog
                    setNewAppointment({ clientName: '', phone: '', service: '', startTime: '', duration: 45, notes: '' });
                    setAdditionalServices([]);
                    setSelectedAdditionalService('');
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
        const service = services.find(s => s.name === serviceName);
        setNewAppointment(prev => ({
            ...prev,
            service: serviceName,
            duration: service?.duration || 45
        }));
    }, [services]);

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
            'scheduled': 'bg-green-50 text-green-900',        // Зеленый - записан
            'in_progress': 'bg-blue-50 text-blue-900',        // Синий - в процессе  
            'completed': 'bg-yellow-50 text-yellow-900',      // Желтый - завершен
            'cancelled': 'bg-red-50 text-red-900',            // Красный - отменен
            // Fallback для пустых/null значений
            '': 'bg-green-50 text-green-900',
            'null': 'bg-green-50 text-green-900',
            'undefined': 'bg-green-50 text-green-900'
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
            'scheduled': 'text-green-700 bg-green-100',       // Зеленый - записан
            'in_progress': 'text-blue-700 bg-blue-100',       // Синий - в процессе
            'completed': 'text-yellow-700 bg-yellow-100',     // Желтый - завершен
            'cancelled': 'text-red-700 bg-red-100',           // Красный - отменен
            // Fallback для пустых/null значений
            '': 'text-green-700 bg-green-100',
            'null': 'text-green-700 bg-green-100',
            'undefined': 'text-green-700 bg-green-100'
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
                        <div className="p-6 border-b border-gray-200 bg-gray-50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Calendar className="text-gray-600" size={20} />
                                    <div>
                                        <h2 className="text-xl font-semibold text-gray-900">
                                            {t('calendar.schedule_for', { date: dateString })}
                                        </h2>
                                        <p className="text-sm text-gray-500 mt-1">
                                            {employees.length > 0 
                                                ? t('calendar.working_masters', { working: employees.length, total: mastersData.length })
                                                : mastersData.length > 0
                                                    ? `Ни один из ${mastersData.length} мастеров не работает`
                                                    : 'Нет мастеров'
                                            }
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <CancelledAppointments selectedDate={currentDate} />
                                    
                                    <Dialog open={isAddEmployeeOpen} onOpenChange={setIsAddEmployeeOpen}>
                                        <DialogTrigger asChild>
                                            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                                                <Plus size={18} />
                                                {t('calendar.add_employee')}
                                            </button>
                                        </DialogTrigger>
                                    <DialogContent className="sm:max-w-[500px]">
                                        <DialogHeader>
                                            <DialogTitle className="flex items-center gap-2">
                                                <User size={20} />
                                                {t('calendar.add_master_to_day')}
                                            </DialogTitle>
                                        </DialogHeader>
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

                                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                                                <button
                                                    onClick={() => setIsAddEmployeeOpen(false)}
                                                    className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                                >
                                                    Отмена
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
                                        </div>
                                    </DialogContent>
                                </Dialog>
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
                            <div className="w-20 flex-shrink-0 border-r border-gray-200 bg-gray-50 sticky left-0 z-30">
                                <div className="h-16 border-b border-gray-200 flex items-center justify-center sticky top-0 z-40 bg-gray-50 shadow-sm">
                                    <Clock size={16} className="text-gray-500" />
                                </div>
                                {timeSlots.map((slot, index) => (
                                    <div
                                        key={slot}
                                        className={`flex items-center justify-center text-sm border-b border-gray-100 ${index % 4 === 0 ? 'font-medium text-gray-700' : 'text-gray-500'
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
                                            <div className="h-16 p-3 border-b border-gray-200 bg-white relative group sticky top-0 z-10 shadow-sm">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm flex-shrink-0"
                                                        style={{ backgroundColor: employee.color }}
                                                    >
                                                        {employee.name[0]}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-semibold text-sm text-gray-900 truncate">
                                                            {employee.name}
                                                        </div>
                                                        <div className="text-xs text-gray-500 truncate">
                                                            {employee.role}
                                                        </div>
                                                        <div className="text-xs font-medium" style={{ color: employee.color }}>
                                                            {employee.workHours.start} - {employee.workHours.end}
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleRemoveEmployee(employee.id)}
                                                        className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded flex-shrink-0"
                                                        title={t('calendar.delete_employee')}
                                                    >
                                                        <X size={16} />
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
                        <Dialog open={isAddAppointmentOpen} onOpenChange={setIsAddAppointmentOpen}>
                            <DialogContent className="sm:max-w-[500px]">
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2">
                                        <Calendar size={20} />
                                        Новая запись на {selectedTimeSlot}
                                    </DialogTitle>
                                </DialogHeader>
                                <div className="space-y-6 py-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Имя клиента *
                                        </label>
                                        <input
                                            type="text"
                                            value={newAppointment.clientName}
                                            onChange={(e) => setNewAppointment(prev => ({ ...prev, clientName: e.target.value }))}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="Введите имя клиента"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Телефон *
                                        </label>
                                        <input
                                            type="tel"
                                            value={newAppointment.phone}
                                            onChange={(e) => setNewAppointment(prev => ({ ...prev, phone: e.target.value }))}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="+996 500 123 456"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Услуга *
                                        </label>
                                        <select
                                            value={newAppointment.service}
                                            onChange={(e) => handleServiceChange(e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            <option value="">{t('calendar.select_service')}</option>
                                            {services.map(service => (
                                                <option key={service.name} value={service.name}>
                                                    {service.name} ({service.duration} {t('calendar.min')}, {service.price} {t('calendar.som')})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            {t('calendar.duration_minutes_label')}
                                        </label>
                                        <input
                                            type="number"
                                            value={newAppointment.duration}
                                            onChange={(e) => setNewAppointment(prev => ({ ...prev, duration: parseInt(e.target.value) || 45 }))}
                                            min="15"
                                            max="300"
                                            step="15"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Примечания
                                        </label>
                                        <textarea
                                            value={newAppointment.notes}
                                            onChange={(e) => setNewAppointment(prev => ({ ...prev, notes: e.target.value }))}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                                            rows={3}
                                            placeholder="Дополнительная информация..."
                                        />
                                    </div>

                                    {/* Additional Services Section */}
                                    <div className="border-t pt-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <label className="block text-sm font-medium text-gray-700">
                                                {t('calendar.additional_services')}
                                            </label>
                                            <div className="text-sm text-gray-600">
                                                {t('calendar.total_time_label', { time: String(calculateTotalDuration({ duration: newAppointment.duration })) })}
                                            </div>
                                        </div>

                                        {/* Additional Services List */}
                                        {additionalServices.length > 0 && (
                                            <div className="space-y-2 mb-4">
                                                {additionalServices.map((service) => (
                                                    <div key={service.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-amber-600 font-medium">📎</span>
                                                            <span className="text-sm font-medium">{service.serviceName}</span>
                                                            <div className="flex items-center gap-1">
                                                                <input
                                                                    type="number"
                                                                    value={service.duration}
                                                                    onChange={(e) => updateAdditionalServiceDuration(service.id, parseInt(e.target.value) || 0)}
                                                                    className="w-16 h-6 text-xs text-center border border-amber-300 rounded"
                                                                    min="0"
                                                                />
                                                                <span className="text-xs text-gray-500">мин</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-medium">{service.price} сом</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeAdditionalService(service.id)}
                                                                className="w-6 h-6 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center"
                                                            >
                                                                <X size={12} className="text-red-600" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Add Additional Service */}
                                        <div className="flex gap-2">
                                            <select
                                                value={selectedAdditionalService}
                                                onChange={(e) => setSelectedAdditionalService(e.target.value)}
                                                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="">Добавить дополнительную услугу</option>
                                                {services.filter(s => !additionalServices.some(as => as.serviceName === s.name)).map(service => (
                                                    <option key={service.name} value={service.name}>
                                                        {service.name} ({service.duration} мин, {service.price} сом)
                                                    </option>
                                                ))}
                                            </select>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (selectedAdditionalService) {
                                                        addAdditionalService(selectedAdditionalService);
                                                    }
                                                }}
                                                disabled={!selectedAdditionalService}
                                                className="px-3 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <Plus size={16} />
                                            </button>
                                        </div>

                                        {/* Total Price */}
                                        {additionalServices.length > 0 && (
                                            <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm font-medium text-blue-800">Общая стоимость:</span>
                                                    <span className="text-lg font-bold text-blue-800">
                                                        {calculateTotalPrice({ price: services.find(s => s.name === newAppointment.service)?.price || 0 })} сом
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {selectedEmployeeId && (
                                        <div className="p-3 bg-gray-50 rounded-lg">
                                            <div className="text-sm font-medium text-gray-700">
                                                {t('calendar.employee_label')} {employees.find(emp => emp.id === selectedEmployeeId)?.name}
                                            </div>
                                            <div className="text-sm text-gray-600">
                                                Время: {selectedTimeSlot} - {minutesToTime(timeToMinutes(selectedTimeSlot) + newAppointment.duration)}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                                        <button
                                            onClick={() => setIsAddAppointmentOpen(false)}
                                            className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                        >
                                            Отмена
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
                                </div>
                            </DialogContent>
                        </Dialog>
                    </>
                )}
            </div>
        </TooltipProvider>
    );
};

export default AdvancedScheduleComponent;