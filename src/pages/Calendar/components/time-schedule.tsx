import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Plus, X, Clock, User, Calendar, GripVertical } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import TaskDialogBtn from './task-dialog-btn';

// Types
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

interface Employee {
    id: string;
    name: string;
    role: string;
    workHours: {
        start: string;
        end: string;
    };
    color: string;
}

interface Appointment {
    id: string;
    employeeId: string;
    clientName: string;
    service: string;
    startTime: string;
    endTime: string;
    duration: number;
    status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
    notes?: string;
}

interface NewEmployeeForm {
    name: string;
    role: string;
    startTime: string;
    endTime: string;
}

interface NewAppointmentForm {
    clientName: string;
    service: string;
    startTime: string;
    duration: number;
    notes: string;
}

// Constants
const ROLES = [
    'Мужской стилист',
    'Женский стилист',
    'Универсальный стилист',
    'Колорист',
    'Барбер',
    'Мастер маникюра',
    'Массажист'
] as const;

const SERVICES = [
    { name: 'Мужская стрижка', duration: 45, price: 1500 },
    { name: 'Женская стрижка', duration: 60, price: 2500 },
    { name: 'Окрашивание', duration: 120, price: 4500 },
    { name: 'Укладка', duration: 30, price: 1200 },
    { name: 'Борода', duration: 30, price: 800 },
    { name: 'Маникюр', duration: 60, price: 1800 },
    { name: 'Массаж', duration: 90, price: 3000 }
] as const;

const EMPLOYEE_COLORS = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
];

const TIME_SLOT_HEIGHT = 32;
const TIME_COLUMN_WIDTH = 80;
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

const generateTimeSlots = (startHour: number = 8, endHour: number = 22): string[] => {
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
    const startMinutes = 8 * 60;
    return Math.max(0, (currentMinutes - startMinutes) / 15) * TIME_SLOT_HEIGHT;
};

// Main Component
const AdvancedScheduleComponent: React.FC = () => {
    // State
    const [currentDate] = useState(() => new Date());
    const [employees, setEmployees] = useState<Employee[]>([
        {
            id: '1',
            name: 'Алладин',
            role: 'Мужской стилист',
            workHours: { start: '09:00', end: '20:00' },
            color: EMPLOYEE_COLORS[0]
        },
        {
            id: '2',
            name: 'Антон',
            role: 'Мужской стилист',
            workHours: { start: '09:00', end: '20:00' },
            color: EMPLOYEE_COLORS[1]
        }
    ]);

    const [appointments, setAppointments] = useState<Appointment[]>([
        {
            id: '1',
            employeeId: '1',
            clientName: 'Иван Петров',
            service: 'Мужская стрижка',
            startTime: '11:15',
            endTime: '12:00',
            duration: 45,
            status: 'in-progress'
        },
        {
            id: '2',
            employeeId: '1',
            clientName: 'шоферов',
            service: 'Мужская стрижка',
            startTime: '13:30',
            endTime: '14:30',
            duration: 60,
            status: 'scheduled'
        },
        {
            id: '3',
            employeeId: '1',
            clientName: 'Петр Сидоров',
            service: 'Борода',
            startTime: '13:45',
            endTime: '14:15',
            duration: 30,
            status: 'scheduled'
        }
    ]);

    const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
    const [isAddAppointmentOpen, setIsAddAppointmentOpen] = useState(false);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
    const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
    const [currentTimePosition, setCurrentTimePosition] = useState(getCurrentTimePosition());

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
        name: '',
        role: '',
        startTime: '09:00',
        endTime: '20:00'
    });

    const [newAppointment, setNewAppointment] = useState<NewAppointmentForm>({
        clientName: '',
        service: '',
        startTime: '',
        duration: 45,
        notes: ''
    });

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
        return currentDate.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long'
        });
    }, [currentDate]);

    // Get column width for employees
    const getEmployeeColumnWidth = useCallback(() => {
        if (!scheduleRef.current) return 200;
        const scheduleWidth = scheduleRef.current.clientWidth;
        return Math.max(200, scheduleWidth / employees.length);
    }, [employees.length]);

    // Appointment management
    const updateAppointment = useCallback((appointmentId: string, updates: Partial<Appointment>) => {
        setAppointments(prev => prev.map(apt =>
            apt.id === appointmentId ? { ...apt, ...updates } : apt
        ));
    }, []);

    // Validation functions
    const isWithinWorkingHours = useCallback((employeeId: string, timeSlot: string): boolean => {
        const employee = employees.find(emp => emp.id === employeeId);
        if (!employee) return false;

        const slotMinutes = timeToMinutes(timeSlot);
        const startMinutes = timeToMinutes(employee.workHours.start);
        const endMinutes = timeToMinutes(employee.workHours.end);

        return slotMinutes >= startMinutes && slotMinutes < endMinutes;
    }, [employees]);

    const doesAppointmentFitWorkingHours = useCallback((employeeId: string, startTime: string, duration: number): boolean => {
        const employee = employees.find(emp => emp.id === employeeId);
        if (!employee) return false;

        const startMinutes = timeToMinutes(startTime);
        const endMinutes = startMinutes + duration;
        const workStartMinutes = timeToMinutes(employee.workHours.start);
        const workEndMinutes = timeToMinutes(employee.workHours.end);

        return startMinutes >= workStartMinutes && endMinutes <= workEndMinutes;
    }, [employees]);


    // Get position info from mouse coordinates
    const getPositionFromMouse = useCallback((x: number, y: number) => {
        const employeeColumnWidth = getEmployeeColumnWidth();
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

            if (resizeState.direction === 'bottom') {
                const deltaY = mouseY - startY;
                newDuration = Math.max(15, Math.round(deltaY / TIME_SLOT_HEIGHT) * 15);
            } else if (resizeState.direction === 'top') {
                const originalEndY = startY + (resizeState.originalDuration / 15) * TIME_SLOT_HEIGHT;
                const deltaY = originalEndY - mouseY;
                newDuration = Math.max(15, Math.round(deltaY / TIME_SLOT_HEIGHT) * 15);

                const newStartMinutes = timeToMinutes(appointment.startTime) - (newDuration - resizeState.originalDuration);
                const newStartTime = minutesToTime(Math.max(0, newStartMinutes));

                updateAppointment(appointment.id, {
                    startTime: newStartTime,
                    duration: newDuration,
                    endTime: minutesToTime(timeToMinutes(newStartTime) + newDuration)
                });
                return;
            }

            if (newDuration !== appointment.duration) {
                const newEndMinutes = timeToMinutes(appointment.startTime) + newDuration;
                updateAppointment(appointment.id, {
                    duration: newDuration,
                    endTime: minutesToTime(newEndMinutes)
                });
            }
        }
    }, [dragState, resizeState, getPositionFromMouse, timeSlots, updateAppointment]);

    const handleMouseUp = useCallback(() => {
        if (dragState.isDragging && dragState.draggedAppointment && dragState.targetSlot) {
            const { employeeId, timeSlot } = dragState.targetSlot;
            const appointment = dragState.draggedAppointment;

            if (doesAppointmentFitWorkingHours(employeeId, timeSlot, appointment.duration)) {
                const newEndMinutes = timeToMinutes(timeSlot) + appointment.duration;
                updateAppointment(appointment.id, {
                    employeeId,
                    startTime: timeSlot,
                    endTime: minutesToTime(newEndMinutes)
                });
            }
        }

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
    }, [dragState, updateAppointment, doesAppointmentFitWorkingHours]);

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
        if (newEmployee.name.trim() && newEmployee.role) {
            const employee: Employee = {
                id: Date.now().toString(),
                name: newEmployee.name.trim(),
                role: newEmployee.role,
                workHours: {
                    start: newEmployee.startTime,
                    end: newEmployee.endTime
                },
                color: EMPLOYEE_COLORS[employees.length % EMPLOYEE_COLORS.length]
            };

            setEmployees(prev => [...prev, employee]);
            setNewEmployee({ name: '', role: '', startTime: '09:00', endTime: '20:00' });
            setIsAddEmployeeOpen(false);
        }
    }, [newEmployee, employees.length]);

    const handleRemoveEmployee = useCallback((employeeId: string) => {
        setEmployees(prev => prev.filter(emp => emp.id !== employeeId));
        setAppointments(prev => prev.filter(apt => apt.employeeId !== employeeId));
    }, []);

    // Appointment management
    const handleAddAppointment = useCallback(() => {
        if (newAppointment.clientName.trim() && newAppointment.service && selectedEmployeeId && selectedTimeSlot) {
            const service = SERVICES.find(s => s.name === newAppointment.service);
            const duration = service?.duration || newAppointment.duration;

            if (!doesAppointmentFitWorkingHours(selectedEmployeeId, selectedTimeSlot, duration)) {
                alert('Запись не помещается в рабочее время сотрудника');
                return;
            }

            const startMinutes = timeToMinutes(selectedTimeSlot);
            const endMinutes = startMinutes + duration;

            const appointment: Appointment = {
                id: Date.now().toString(),
                employeeId: selectedEmployeeId,
                clientName: newAppointment.clientName.trim(),
                service: newAppointment.service,
                startTime: selectedTimeSlot,
                endTime: minutesToTime(endMinutes),
                duration,
                status: 'scheduled',
                notes: newAppointment.notes
            };

            setAppointments(prev => [...prev, appointment]);
            setNewAppointment({ clientName: '', service: '', startTime: '', duration: 45, notes: '' });
            setSelectedEmployeeId('');
            setSelectedTimeSlot('');
            setIsAddAppointmentOpen(false);
        }
    }, [newAppointment, selectedEmployeeId, selectedTimeSlot, doesAppointmentFitWorkingHours]);

    const handleTimeSlotClick = useCallback((employeeId: string, timeSlot: string) => {
        if (!isWithinWorkingHours(employeeId, timeSlot)) return;

        setSelectedEmployeeId(employeeId);
        setSelectedTimeSlot(timeSlot);
        setNewAppointment(prev => ({ ...prev, startTime: timeSlot }));
        setIsAddAppointmentOpen(true);
    }, [isWithinWorkingHours]);

    const handleServiceChange = useCallback((serviceName: string) => {
        const service = SERVICES.find(s => s.name === serviceName);
        setNewAppointment(prev => ({
            ...prev,
            service: serviceName,
            duration: service?.duration || 45
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
            const columnIndex = overlapping.findIndex(apt => apt.id === currentApt.id);

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

    // Generate unique colors for overlapping appointments
    const getOverlapColor = useCallback((appointment: Appointment, column: number, totalColumns: number) => {
        if (totalColumns === 1) {
            const employee = employees.find(emp => emp.id === appointment.employeeId);
            return employee?.color || '#3B82F6';
        }

        const colors = [
            '#3B82F6',
            '#10B981',
            '#F59E0B',
            '#EF4444',
            '#8B5CF6',
            '#06B6D4',
            '#84CC16',
            '#F97316',
        ];

        return colors[column % colors.length];
    }, [employees]);

    // Render appointment block with smart positioning
    const renderAppointmentBlock = (layoutInfo: {
        appointment: Appointment;
        column: number;
        width: number;
        totalColumns: number;
        zIndex: number;
    }) => {
        const { appointment, column, width, totalColumns, zIndex } = layoutInfo;
        const startIndex = timeSlots.findIndex(slot => slot === appointment.startTime);
        const durationSlots = Math.ceil(appointment.duration / 15);
        const height = durationSlots * TIME_SLOT_HEIGHT - 2;

        const statusColors = {
            'scheduled': 'bg-blue-50 text-blue-900',
            'in-progress': 'bg-green-50 text-green-900',
            'completed': 'bg-gray-50 text-gray-900',
            'cancelled': 'bg-red-50 text-red-900'
        };

        const statusLabels = {
            'scheduled': 'Запланировано',
            'in-progress': 'В процессе',
            'completed': 'Завершено',
            'cancelled': 'Отменено'
        };

        const statusColorsTooltip = {
            'scheduled': 'text-blue-700 bg-blue-100',
            'in-progress': 'text-green-700 bg-green-100',
            'completed': 'text-gray-700 bg-gray-100',
            'cancelled': 'text-red-700 bg-red-100'
        };

        const isDragging = dragState.isDragging && dragState.draggedAppointment?.id === appointment.id;
        const isResizing = resizeState.isResizing && resizeState.resizedAppointment?.id === appointment.id;

        const borderColor = getOverlapColor(appointment, column, totalColumns);

        const isSmall = height <= 32;
        const isMedium = height > 32 && height <= 64;

        const employee = employees.find(emp => emp.id === appointment.employeeId);
        const service = SERVICES.find(s => s.name === appointment.service);

        return (
            <Tooltip key={appointment.id}>
                <TooltipTrigger asChild>
                    <div
                        className={`absolute border-l-4 rounded-r-md text-xs group transition-all duration-100 ${statusColors[appointment.status]
                            } ${isDragging ? 'opacity-70 scale-105 shadow-xl ring-2 ring-blue-400/50' : 'shadow-sm hover:shadow-md'} ${isResizing ? 'ring-2 ring-blue-400' : ''
                            } hover:opacity-90`}
                        style={{
                            top: startIndex * TIME_SLOT_HEIGHT + 1,
                            height: Math.max(height, 32),
                            left: `${(column * width)}%`,
                            width: `${width}%`,
                            paddingLeft: column > 0 ? '2px' : '4px',
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

                        {/* Task Dialog Button */}
                        <div className="absolute top-1 right-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
                            <TaskDialogBtn />
                        </div>

                        {/* Content */}
                        <div
                            className={`${isSmall ? 'px-1 py-1' : 'px-2 py-1'} h-full flex ${isSmall ? 'items-center' : 'flex-col justify-between'} cursor-grab active:cursor-grabbing`}
                            onMouseDown={(e) => handleMouseDown(e, appointment, 'drag')}
                        >
                            {isSmall ? (
                                <div className="flex-1 min-w-0 pointer-events-none pr-6">
                                    <div className="font-semibold truncate text-xs leading-tight">{appointment.clientName}</div>
                                </div>
                            ) : isMedium ? (
                                <div className="flex-1 min-w-0 pointer-events-none pr-6">
                                    <div className="font-semibold truncate text-xs leading-tight">{appointment.clientName}</div>
                                    <div className="truncate text-xs opacity-70 leading-tight">{appointment.service}</div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-start justify-between pr-6">
                                        <div className="flex-1 min-w-0 pointer-events-none">
                                            <div className="font-semibold truncate text-sm leading-tight">{appointment.clientName}</div>
                                            <div className="truncate text-xs opacity-70 leading-tight">{appointment.service}</div>
                                        </div>
                                        {width > 50 && (
                                            <div className="ml-1 pointer-events-none">
                                            </div>
                                        )}
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
                <TooltipContent className="bg-white border border-gray-300 rounded-lg shadow-xl p-4 min-w-64 max-w-80">
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: employee?.color || '#3B82F6' }}
                            />
                            <h3 className="font-semibold text-gray-900">{appointment.clientName}</h3>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${statusColorsTooltip[appointment.status]}`}>
                            {statusLabels[appointment.status]}
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
                            <span className="font-medium">{appointment.duration} мин</span>
                        </div>

                        {service && (
                            <div className="flex justify-between">
                                <span className="text-gray-600">Стоимость:</span>
                                <span className="font-medium">{service.price}₽</span>
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
                {/* Header */}
                <div className="p-6 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Calendar className="text-gray-600" size={20} />
                            <h2 className="text-xl font-semibold text-gray-900">
                                Расписание на {dateString}
                            </h2>
                        </div>

                        <Dialog open={isAddEmployeeOpen} onOpenChange={setIsAddEmployeeOpen}>
                            <DialogTrigger asChild>
                                <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                                    <Plus size={18} />
                                    Добавить сотрудника
                                </button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[500px]">
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2">
                                        <User size={20} />
                                        Новый сотрудник
                                    </DialogTitle>
                                </DialogHeader>
                                <div className="space-y-6 py-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Имя сотрудника *
                                        </label>
                                        <input
                                            type="text"
                                            value={newEmployee.name}
                                            onChange={(e) => setNewEmployee(prev => ({ ...prev, name: e.target.value }))}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="Введите имя сотрудника"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Специализация *
                                        </label>
                                        <select
                                            value={newEmployee.role}
                                            onChange={(e) => setNewEmployee(prev => ({ ...prev, role: e.target.value }))}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            <option value="">Выберите специализацию</option>
                                            {ROLES.map(role => (
                                                <option key={role} value={role}>{role}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Начало смены
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
                                                Конец смены
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
                                            disabled={!newEmployee.name.trim() || !newEmployee.role}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                                        >
                                            Добавить сотрудника
                                        </button>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* Schedule Grid */}
                <div className="flex overflow-x-auto">
                    {/* Status indicator */}
                    {(dragState.isDragging || resizeState.isResizing) && (
                        <div className="fixed top-4 right-4 bg-blue-600 text-white px-3 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2">
                            {dragState.isDragging && (
                                <>
                                    <GripVertical size={16} />
                                    {dragState.targetSlot ? (
                                        <span>
                                            Перемещение к {employees.find(emp => emp.id === dragState.targetSlot!.employeeId)?.name}
                                            на {dragState.targetSlot.timeSlot}
                                        </span>
                                    ) : (
                                        'Перетащите в нужную позицию'
                                    )}
                                </>
                            )}
                            {resizeState.isResizing && (
                                <>
                                    <Clock size={16} />
                                    Изменение длительности: {resizeState.resizedAppointment?.duration || 0} мин
                                </>
                            )}
                        </div>
                    )}

                    {/* Time Column */}
                    <div className="w-20 flex-shrink-0 border-r border-gray-200 bg-gray-50">
                        <div className="h-16 border-b border-gray-200 flex items-center justify-center">
                            <Clock size={16} className="text-gray-500" />
                        </div>
                        {timeSlots.map((slot, index) => (
                            <div
                                key={slot}
                                className={`h-8 flex items-center justify-center text-sm border-b border-gray-100 ${index % 4 === 0 ? 'font-medium text-gray-700' : 'text-gray-500'
                                    }`}
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
                                            ({dragState.draggedAppointment?.duration} мин)
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
                                    left: employees.findIndex(emp => emp.id === dragState.targetSlot!.employeeId) * getEmployeeColumnWidth() + 4,
                                    width: getEmployeeColumnWidth() - 8
                                }}
                            />
                        )}

                        <div className="flex">
                            {employees.map((employee, employeeIndex) => (
                                <div
                                    key={employee.id}
                                    className="flex-1 min-w-48 border-r border-gray-200 last:border-r-0"
                                    style={{ minWidth: '200px' }}
                                >
                                    {/* Employee Header */}
                                    <div className="h-16 p-3 border-b border-gray-200 bg-white relative group">
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
                                                title="Удалить сотрудника"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Time Slots */}
                                    <div className="relative">
                                        {timeSlots.map((slot, slotIndex) => {
                                            const isWorkingHours = isWithinWorkingHours(employee.id, slot);

                                            if (!isWorkingHours) {
                                                return (
                                                    <div
                                                        key={`${employee.id}-${slot}`}
                                                        className="h-8 bg-gray-100 border-b border-gray-200"
                                                    />
                                                );
                                            }

                                            return (
                                                <button
                                                    key={`${employee.id}-${slot}`}
                                                    onClick={() => handleTimeSlotClick(employee.id, slot)}
                                                    className="w-full h-8 border-b border-gray-200 hover:bg-blue-50 group transition-colors flex items-center justify-center relative"
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
                                    Услуга *
                                </label>
                                <select
                                    value={newAppointment.service}
                                    onChange={(e) => handleServiceChange(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Выберите услугу</option>
                                    {SERVICES.map(service => (
                                        <option key={service.name} value={service.name}>
                                            {service.name} ({service.duration} мин, {service.price}₽)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Продолжительность (минуты)
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

                            {selectedEmployeeId && (
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <div className="text-sm font-medium text-gray-700">
                                        Сотрудник: {employees.find(emp => emp.id === selectedEmployeeId)?.name}
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
                                    disabled={!newAppointment.clientName.trim() || !newAppointment.service}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                                >
                                    Создать запись
                                </button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </TooltipProvider>
    );
};

export default AdvancedScheduleComponent;