
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Plus, X, Clock, User, Calendar, GripVertical, Coins } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useBranch } from '@/contexts/BranchContext';
import { format } from 'date-fns';
import { useLocation } from 'wouter';
import { Loader2, CreditCard } from 'lucide-react';
import { PaymentMethodIcon } from '@/components/BankIcons';

// Types
interface DragState {
    isDragging: boolean;
    draggedAppointment: Task | null;
    dragStartPosition: { x: number; y: number };
    currentPosition: { x: number; y: number };
    targetSlot: { employeeId: number; timeSlot: string } | null;
    dragOffset: { x: number; y: number };
}

interface Master {
    id: number;
    name: string;
    specialization?: string;
    isActive: boolean;
    startWorkHour?: string;
    endWorkHour?: string;
    photoUrl?: string;
    branchId: string;
    color: string;
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
    mother?: number;
    paid?: string;
    createdAt: string;
}

interface ServiceService {
    id: number;
    name: string;
    defaultDuration: number;
    duration10_price?: number;
    duration15_price?: number;
    duration20_price?: number;
    duration30_price?: number;
    duration40_price?: number;
    duration50_price?: number;
    duration60_price?: number;
    duration75_price?: number;
    duration80_price?: number;
    duration90_price?: number;
    duration110_price?: number;
    duration120_price?: number;
    duration150_price?: number;
    duration220_price?: number;
}

interface DurationOption {
    duration: number;
    price: number;
}

interface ServiceDurationsResponse {
    serviceType: string;
    availableDurations: DurationOption[];
    defaultDuration: number;
}

interface ClientFormData {
    clientName: string;
    phoneNumber: string;
    branchId: string;
    serviceType: string;
    masterName: string;
    masterId: number;
    notes: string;
    discount: number;
    finalPrice: number;
    scheduleDate: string;
    scheduleTime: string;
    status?: string;
}

interface PaymentMethod {
    value: string;
    label: string;
    icon: string;
    description: string;
}

// Constants
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

const getStatusColors = (status: string) => {
    switch (status) {
        case 'new':
            return { bg: 'bg-blue-200', border: 'border-blue-400', text: 'text-blue-900', badge: 'bg-blue-600' };
        case 'scheduled':
            return { bg: 'bg-green-200', border: 'border-green-400', text: 'text-green-900', badge: 'bg-green-600' };
        case 'in_progress':
            return { bg: 'bg-orange-200', border: 'border-orange-400', text: 'text-orange-900', badge: 'bg-orange-600' };
        case 'completed':
            return { bg: 'bg-purple-200', border: 'border-purple-400', text: 'text-purple-900', badge: 'bg-purple-600' };
        case 'cancelled':
            return { bg: 'bg-red-200', border: 'border-red-400', text: 'text-red-900', badge: 'bg-red-600' };
        case 'regular':
            return { bg: 'bg-yellow-200', border: 'border-yellow-400', text: 'text-yellow-900', badge: 'bg-yellow-600' };
        default:
            return { bg: 'bg-gray-200', border: 'border-gray-400', text: 'text-gray-900', badge: 'bg-gray-500' };
    }
};

const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
        'new': 'Неразобранные',
        'scheduled': 'Записан',
        'in_progress': 'В процессе',
        'completed': 'Обслуженные',
        'cancelled': 'Отмененные',
        'regular': 'Постоянные'
    };
    return labels[status] || 'Неизвестный';
};

const getRelatedTaskStyles = (task: Task, allTasks: Task[]) => {
    const isMainTask = !task.mother;
    const hasChildren = allTasks.some(t => t.mother === task.id);
    const isChildTask = !!task.mother;

    if (isMainTask && hasChildren) {
        return {
            indicator: '🔗',
            borderStyle: 'border-l-4 border-l-amber-500 bg-amber-50 shadow-lg border-2 border-amber-300',
        };
    }

    if (isChildTask) {
        return {
            indicator: '📎',
            borderStyle: 'border-l-4 border-l-amber-400 bg-amber-25 border-2 border-amber-200 ml-2',
        };
    }

    return { indicator: '', borderStyle: '' };
};

// Create Appointment Dialog
const CreateAppointmentDialog = ({
    isOpen,
    onClose,
    selectedDate,
    selectedTime,
    masterId,
    onTaskCreated
}: {
    isOpen: boolean;
    onClose: () => void;
    selectedDate: Date;
    selectedTime?: string;
    masterId?: number;
    onTaskCreated: () => void;
}) => {
    const { toast } = useToast();
    const { currentBranch } = useBranch();

    const { data: allMasters = [] } = useQuery<Master[]>({
        queryKey: ['all-masters'],
        enabled: isOpen,
    });

    const { data: serviceServices = [] } = useQuery<ServiceService[]>({
        queryKey: ['service-services'],
        enabled: isOpen,
    });

    const selectedMaster = allMasters.find(m => m.id === masterId);

    const [formData, setFormData] = useState<ClientFormData>({
        clientName: "",
        phoneNumber: "",
        branchId: currentBranch?.id?.toString() || 'wa1',
        serviceType: "",
        masterName: selectedMaster?.name || "",
        masterId: masterId || 0,
        notes: "",
        discount: 0,
        finalPrice: 0,
        scheduleDate: format(selectedDate, 'yyyy-MM-dd'),
        scheduleTime: selectedTime || ""
    });

    const [selectedDuration, setSelectedDuration] = useState<number | null>(null);

    const { data: serviceDurations } = useQuery<ServiceDurationsResponse>({
        queryKey: ['service-durations', formData.serviceType],
        enabled: !!formData.serviceType && isOpen,
        queryFn: async () => {
            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/service-services/durations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ serviceType: formData.serviceType }),
            });
            if (!res.ok) return null;
            return res.json();
        }
    });

    useEffect(() => {
        if (serviceDurations && serviceDurations.availableDurations && !selectedDuration) {
            setSelectedDuration(serviceDurations.defaultDuration);
        }
    }, [serviceDurations, selectedDuration]);

    useEffect(() => {
        if (serviceDurations && selectedDuration) {
            const selectedOption = serviceDurations.availableDurations.find((d: DurationOption) => d.duration === selectedDuration);
            if (selectedOption) {
                const basePrice = selectedOption.price;
                const discountAmount = (basePrice * formData.discount) / 100;
                const finalPrice = Math.round(basePrice - discountAmount);
                setFormData(prev => ({ ...prev, finalPrice }));
            }
        }
    }, [serviceDurations, selectedDuration, formData.discount]);

    const createClientMutation = useMutation({
        mutationFn: async () => {
            const payload = {
                clientName: formData.clientName,
                clientPhone: formData.phoneNumber,
                serviceType: formData.serviceType,
                scheduleDate: formData.scheduleDate,
                scheduleTime: formData.scheduleTime,
                masterName: formData.masterName,
                notes: formData.notes,
                status: 'scheduled',
                duration: selectedDuration,
                finalPrice: formData.finalPrice,
                discount: formData.discount,
                branchId: formData.branchId
            };

            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/crm/tasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                credentials: 'include'
            });

            if (!res.ok) throw new Error('Ошибка создания записи');
            return res.json();
        },
        onSuccess: () => {
            toast({ title: "Запись создана" });
            onTaskCreated();
            onClose();
        },
        onError: (error) => {
            toast({ title: "Ошибка", description: `${error}`, variant: "destructive" });
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.masterId) {
            toast({ title: "Ошибка", description: "Выберите мастера", variant: "destructive" });
            return;
        }
        createClientMutation.mutate();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[700px]">
                <DialogHeader>
                    <DialogTitle>Добавить запись</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="flex gap-5">
                    <div className="flex-1 space-y-3">
                        <h3 className="text-blue-600 font-semibold">Клиент</h3>
                        <div>
                            <Label>Имя клиента</Label>
                            <Input value={formData.clientName} onChange={(e) => setFormData(prev => ({ ...prev, clientName: e.target.value }))} required />
                        </div>
                        <div>
                            <Label>Телефон</Label>
                            <Input value={formData.phoneNumber} onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))} />
                        </div>
                        <div>
                            <Label>Примечания</Label>
                            <Textarea value={formData.notes} onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} />
                        </div>
                    </div>

                    <div className="flex-1 space-y-3">
                        <h3 className="text-blue-600 font-semibold">Запись</h3>
                        <div>
                            <Label>Время</Label>
                            <Input type="time" value={formData.scheduleTime} onChange={(e) => setFormData(prev => ({ ...prev, scheduleTime: e.target.value }))} />
                        </div>
                        <div>
                            <Label>Длительность</Label>
                            <Select value={selectedDuration?.toString()} onValueChange={(v) => setSelectedDuration(Number(v))} disabled={!formData.serviceType}>
                                <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
                                <SelectContent>
                                    {serviceDurations?.availableDurations?.map((d: DurationOption) => (
                                        <SelectItem key={d.duration} value={d.duration.toString()}>{d.duration} мин - {d.price} сом</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Тип услуги</Label>
                            <Select value={formData.serviceType} onValueChange={(v) => setFormData(prev => ({ ...prev, serviceType: v }))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {serviceServices?.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Мастер *</Label>
                            <Select value={formData.masterName} onValueChange={(v) => {
                                const master = allMasters.find(m => m.name === v);
                                setFormData(prev => ({ ...prev, masterName: v, masterId: master?.id || 0 }));
                            }} required>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {allMasters?.map((m) => <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Скидка (%)</Label>
                            <Input type="number" min="0" max="100" value={formData.discount} onChange={(e) => setFormData(prev => ({ ...prev, discount: parseFloat(e.target.value) || 0 }))} />
                        </div>
                        {formData.finalPrice > 0 && (
                            <div className="text-right">
                                <Label>Стоимость:</Label>
                                <Input type="number" value={formData.finalPrice} readOnly className="w-32 inline-block ml-2" />
                            </div>
                        )}
                        <div className="flex justify-between mt-4">
                            <Button type="button" variant="outline" onClick={onClose} className="bg-red-500 text-white">Отмена</Button>
                            <Button type="submit" disabled={createClientMutation.isPending} className="bg-green-500 text-white">
                                {createClientMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Создать
                            </Button>
                        </div>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};

// Edit Appointment Dialog
const EditAppointmentDialog = ({
    task,
    isOpen,
    onClose,
    onTaskUpdated
}: {
    task: Task | null;
    isOpen: boolean;
    onClose: () => void;
    onTaskUpdated: () => void;
}) => {
    const { toast } = useToast();
    const { currentBranch } = useBranch();
    const queryClient = useQueryClient();

    const { data: allMasters = [] } = useQuery<Master[]>({
        queryKey: ['all-masters'],
        enabled: isOpen,
    });

    const { data: serviceServices = [] } = useQuery<ServiceService[]>({
        queryKey: ['service-services'],
        enabled: isOpen,
    });

    const { data: administrators = [] } = useQuery<{ id: number; name: string }[]>({
        queryKey: ['administrators', currentBranch?.id],
        queryFn: async () => {
            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/administrators?branchId=${currentBranch?.id}`);
            if (!res.ok) return [];
            const data = await res.json();
            return data.filter((admin: any) => admin.isActive).map((admin: any) => ({
                id: admin.id,
                name: admin.name
            }));
        },
        enabled: isOpen,
    });

    const [formData, setFormData] = useState({
        clientName: task?.client?.customName || task?.client?.firstName || "",
        phoneNumber: task?.client?.phoneNumber || "",
        branchId: task?.branchId || currentBranch?.id || 'wa1',
        serviceType: task?.serviceType || "",
        masterName: task?.masterName || "",
        masterId: task?.masterId || 0,
        notes: task?.notes || "",
        discount: 0,
        finalPrice: task?.finalPrice || 0,
        scheduleDate: task?.scheduleDate?.split('T')[0] || "",
        scheduleTime: task?.scheduleTime || "",
        status: task?.status || 'scheduled'
    });

    const [selectedDuration, setSelectedDuration] = useState<number | null>(task?.duration || null);
    const [childTasks, setChildTasks] = useState<Task[]>([]);
    const [localMainDuration, setLocalMainDuration] = useState<number>(0);
    const [localChildDurations, setLocalChildDurations] = useState<{ [key: number]: number }>({});
    const [showPaymentDialog, setShowPaymentDialog] = useState(false);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("");
    const [selectedAdministrator, setSelectedAdministrator] = useState<string>("");

    const paymentMethods: PaymentMethod[] = [
        { value: "Наличные", label: "Наличные", icon: "💰", description: "Оплата наличными" },
        { value: "МБанк - Перевод", label: "МБанк - Перевод", icon: "🏦", description: "Перевод МБанк" },
        { value: "МБанк - POS", label: "МБанк - POS", icon: "💳", description: "POS МБанк" },
        { value: "О!Банк - Перевод", label: "О!Банк - Перевод", icon: "🔴", description: "Перевод О!Банк" },
        { value: "О!Банк - POS", label: "О!Банк - POS", icon: "💳", description: "POS О!Банк" },
        { value: "Подарочный Сертификат", label: "Подарочный Сертификат", icon: "🎁", description: "Сертификат" },
    ];

    useEffect(() => {
        if (task) {
            setFormData({
                clientName: task.client?.customName || task.client?.firstName || "",
                phoneNumber: task.client?.phoneNumber || "",
                branchId: task.branchId || currentBranch?.id || 'wa1',
                serviceType: task.serviceType || "",
                masterName: task.masterName || "",
                masterId: task.masterId || 0,
                notes: task.notes || "",
                discount: 0,
                finalPrice: task.finalPrice || 0,
                scheduleDate: task.scheduleDate?.split('T')[0] || "",
                scheduleTime: task.scheduleTime || "",
                status: task.status || 'scheduled'
            });
            setLocalMainDuration(task.serviceDuration || task.duration || 0);
        }
    }, [task, currentBranch]);

    const { data: childTasksData } = useQuery<Task[]>({
        queryKey: ['child-tasks', task?.id],
        enabled: isOpen && !!task?.id,
        queryFn: async () => {
            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/tasks/${task?.id}/children`);
            if (!res.ok) return [];
            return res.json();
        }
    });

    useEffect(() => {
        if (childTasksData) {
            setChildTasks(childTasksData);
            const initialChildDurations: { [key: number]: number } = {};
            childTasksData.forEach(child => {
                initialChildDurations[child.id] = child.serviceDuration || child.duration || 0;
            });
            setLocalChildDurations(initialChildDurations);
        }
    }, [childTasksData]);

    const { data: serviceDurations } = useQuery<ServiceDurationsResponse>({
        queryKey: ['service-durations', formData.serviceType],
        enabled: !!formData.serviceType && isOpen,
        queryFn: async () => {
            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/service-services/durations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ serviceType: formData.serviceType }),
            });
            if (!res.ok) return null;
            return res.json();
        }
    });

    const calculateMainServicePrice = (): number => {
        if (!serviceDurations || !task?.serviceDuration) return task?.servicePrice || task?.finalPrice || 0;
        const duration = task.serviceDuration;
        const durationOption = serviceDurations.availableDurations.find((d: DurationOption) => d.duration === duration);
        return durationOption ? durationOption.price : (task?.servicePrice || task?.finalPrice || 0);
    };

    const calculateTotalPrice = (): number => {
        const mainPrice = calculateMainServicePrice();
        const childrenPrice = childTasks.reduce((sum, child) => sum + (child.servicePrice || child.finalPrice || 0), 0);
        return mainPrice + childrenPrice;
    };

    const calculateTotalDuration = (): number => {
        const mainDuration = localMainDuration;
        const childrenDuration = Object.values(localChildDurations).reduce((sum, duration) => sum + duration, 0);
        return mainDuration + childrenDuration;
    };

    const calculateEndTime = (startTime: string, duration: number): string => {
        const [hours, minutes] = startTime.split(':').map(Number);
        const totalMinutes = hours * 60 + minutes + duration;
        const newHours = Math.floor(totalMinutes / 60);
        const newMinutes = totalMinutes % 60;
        return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
    };

    const updateMainServiceDuration = async (newDuration: number) => {
        if (!task?.id) return;
        try {
            await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/tasks/${task.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    serviceDuration: newDuration,
                    endTime: calculateEndTime(task.scheduleTime || '', newDuration)
                }),
                credentials: 'include'
            });

            if (childTasks.length > 0) {
                let currentStartTime = calculateEndTime(task.scheduleTime || '', newDuration);
                for (const childTask of childTasks) {
                    const childEndTime = calculateEndTime(currentStartTime, childTask.serviceDuration || 0);
                    await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/tasks/${childTask.id}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ scheduleTime: currentStartTime, endTime: childEndTime }),
                        credentials: 'include'
                    });
                    currentStartTime = childEndTime;
                }
            }

            queryClient.invalidateQueries({ queryKey: ['child-tasks', task.id] });
            onTaskUpdated();
            toast({ title: "Длительность обновлена" });
        } catch (error) {
            toast({ title: "Ошибка", variant: "destructive" });
        }
    };

    const createAdditionalServiceMutation = useMutation({
        mutationFn: async (serviceData: { serviceId: number; serviceName: string; duration: number; price: number }) => {
            const mainDuration = task?.serviceDuration || task?.duration || 0;
            const childStartTime = calculateEndTime(task?.scheduleTime || '', mainDuration);
            const childEndTime = calculateEndTime(childStartTime, serviceData.duration);

            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/tasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientId: task?.clientId,
                    status: task?.status,
                    serviceType: serviceData.serviceName,
                    serviceServiceId: serviceData.serviceId,
                    scheduleDate: task?.scheduleDate,
                    scheduleTime: childStartTime,
                    endTime: childEndTime,
                    masterName: task?.masterName,
                    masterId: task?.masterId,
                    notes: task?.notes,
                    branchId: task?.branchId,
                    source: 'manual',
                    serviceDuration: serviceData.duration,
                    servicePrice: serviceData.price,
                    finalPrice: serviceData.price,
                    mother: task?.id
                })
            });

            if (!res.ok) throw new Error('Failed to create additional service');
            return res.json();
        },
        onSuccess: async () => {
            toast({ title: "Дополнительная услуга добавлена" });
            await queryClient.invalidateQueries({ queryKey: ['child-tasks', task?.id] });
            onTaskUpdated();
        },
        onError: (error) => {
            toast({ title: "Ошибка", description: `${error}`, variant: "destructive" });
        }
    });

    const deleteAdditionalServiceMutation = useMutation({
        mutationFn: async (childTaskId: number) => {
            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/tasks/${childTaskId}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Failed to delete');
            return res.json();
        },
        onSuccess: async () => {
            toast({ title: "Дополнительная услуга удалена" });
            await queryClient.invalidateQueries({ queryKey: ['child-tasks', task?.id] });
            onTaskUpdated();
        },
        onError: (error) => {
            toast({ title: "Ошибка", description: `${error}`, variant: "destructive" });
        }
    });

    const createPaymentMutation = useMutation({
        mutationFn: async () => {
            if (!selectedPaymentMethod || !task?.id || !selectedAdministrator) {
                throw new Error('Не выбран способ оплаты или администратор');
            }

            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/accounting`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    master: task.masterName || 'Неизвестный мастер',
                    client: task.client?.customName || task.client?.firstName || 'Неизвестный клиент',
                    serviceType: task.serviceType || 'Услуга',
                    phoneNumber: task.client?.phoneNumber || '',
                    amount: calculateTotalPrice() - Math.round(calculateTotalPrice() * formData.discount / 100),
                    discount: formData.discount || 0,
                    duration: task.duration || 60,
                    comment: `Оплата через ${selectedPaymentMethod}`,
                    paymentMethod: selectedPaymentMethod,
                    dailyReport: calculateTotalPrice() - Math.round(calculateTotalPrice() * formData.discount / 100),
                    adminName: selectedAdministrator,
                    isGiftCertificateUsed: selectedPaymentMethod === 'Подарочный Сертификат',
                    branchId: currentBranch?.id || '1',
                    date: task.scheduleDate || new Date().toISOString().split('T')[0]
                }),
            });

            if (!res.ok) throw new Error('Failed to create payment');

            await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/tasks/${task.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    paymentMethod: selectedPaymentMethod,
                    adminName: selectedAdministrator,
                    paid: 'paid'
                }),
            });

            if (childTasks.length > 0) {
                await Promise.all(childTasks.map(childTask =>
                    fetch(`${import.meta.env.VITE_BACKEND_URL}/api/tasks/${childTask.id}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            paymentMethod: selectedPaymentMethod,
                            adminName: selectedAdministrator,
                            paid: 'paid'
                        }),
                    })
                ));
            }

            return res.json();
        },
        onSuccess: () => {
            toast({ title: "Оплата зафиксирована", description: `Платеж через ${selectedPaymentMethod}` });
            setShowPaymentDialog(false);
            setSelectedPaymentMethod("");
            setSelectedAdministrator("");
            onTaskUpdated();
            onClose();
        },
        onError: (error) => {
            toast({ title: "Ошибка", description: `${error}`, variant: "destructive" });
        }
    });

    const updateTaskMutation = useMutation({
        mutationFn: async () => {
            if (!task) throw new Error("Нет данных");

            const payload = {
                clientName: formData.clientName,
                phoneNumber: formData.phoneNumber,
                serviceType: formData.serviceType,
                masterName: formData.masterName,
                masterId: formData.masterId,
                notes: formData.notes,
                scheduleDate: formData.scheduleDate,
                scheduleTime: formData.scheduleTime,
                duration: selectedDuration,
                finalPrice: formData.finalPrice,
                discount: formData.discount,
                branchId: formData.branchId,
                status: formData.status
            };

            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/tasks/${task.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                credentials: 'include'
            });

            if (!res.ok) throw new Error('Ошибка обновления');

            if (localMainDuration !== (task?.serviceDuration || task?.duration || 0)) {
                await updateMainServiceDuration(localMainDuration);
            }

            return res.json();
        },
        onSuccess: () => {
            toast({ title: "Запись обновлена" });
            onTaskUpdated();
            onClose();
        },
        onError: (error) => {
            toast({ title: "Ошибка", description: `${error}`, variant: "destructive" });
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateTaskMutation.mutate();
    };

    const handleAddService = (serviceName: string) => {
        const service = serviceServices.find(s => s.name === serviceName);
        if (service) {
            createAdditionalServiceMutation.mutate({
                serviceId: service.id,
                serviceName: service.name,
                duration: service.defaultDuration,
                price: service.duration60_price || 0
            });
        }
    };

    if (!task) return null;

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Редактировать запись</DialogTitle>
                    </DialogHeader>
                    <div className={`px-4 py-3 border-b ${task?.paid === 'paid' ? 'bg-green-50' : 'bg-red-50'}`}>
                        <div className="flex items-center justify-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${task?.paid === 'paid' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                            <span className={`font-semibold ${task?.paid === 'paid' ? 'text-green-700' : 'text-red-700'}`}>
                                {task?.paid === 'paid' ? 'ОПЛАЧЕНО' : 'НЕ ОПЛАЧЕНО'}
                            </span>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="flex gap-5 p-4">
                        <div className="flex-1 space-y-3">
                            <h3 className="text-blue-600 font-semibold">Клиент</h3>
                            <div><Label>Имя</Label><Input value={formData.clientName} onChange={(e) => setFormData(prev => ({ ...prev, clientName: e.target.value }))} /></div>
                            <div><Label>Телефон</Label><Input value={formData.phoneNumber} onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))} /></div>
                            <div><Label>Примечания</Label><Textarea value={formData.notes} onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} /></div>
                        </div>

                        <div className="flex-1 space-y-3">
                            <h3 className="text-blue-600 font-semibold">Запись</h3>
                            <div><Label>Время</Label><Input type="time" value={formData.scheduleTime} onChange={(e) => setFormData(prev => ({ ...prev, scheduleTime: e.target.value }))} /></div>
                            <div><Label>Услуга</Label><Input value={formData.serviceType} readOnly /></div>
                            <div>
                                <Label>Мастер</Label>
                                <Select value={formData.masterName} onValueChange={(v) => {
                                    const master = allMasters.find(m => m.name === v);
                                    setFormData(prev => ({ ...prev, masterName: v, masterId: master?.id || 0 }));
                                }}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {allMasters?.map((m) => <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Статус</Label>
                                <Select value={formData.status} onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="new">Неразобранные</SelectItem>
                                        <SelectItem value="scheduled">Записан</SelectItem>
                                        <SelectItem value="in_progress">В процессе</SelectItem>
                                        <SelectItem value="completed">Обслуженные</SelectItem>
                                        <SelectItem value="cancelled">Отмененные</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="border-t pt-4">
                                <div className="flex items-center justify-between mb-3">
                                    <Label>Дополнительные услуги</Label>
                                    <span className="text-sm text-gray-600">Общее время: {calculateTotalDuration()} мин</span>
                                </div>

                                <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                                    {childTasks.length > 0 ? (
                                        <div className="space-y-2">
                                            <div className="bg-white rounded p-2 border-l-4 border-amber-400">
                                                <div className="flex justify-between text-sm">
                                                    <span>🏆 Основная: {task?.serviceType}</span>
                                                    <span>{calculateMainServicePrice()} сом</span>
                                                </div>
                                            </div>
                                            {childTasks.map((child, idx) => (
                                                <div key={child.id} className="bg-white rounded p-2 border-l-4 border-amber-300">
                                                    <div className="flex justify-between text-sm items-center">
                                                        <span>📎 Доп. {idx + 1}: {child.serviceType}</span>
                                                        <div className="flex items-center gap-2">
                                                            <span>{child.servicePrice} сом</span>
                                                            <Button type="button" variant="ghost" size="sm" onClick={() => deleteAdditionalServiceMutation.mutate(child.id)} className="h-6 w-6 p-0">
                                                                <X className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="bg-amber-100 rounded p-2">
                                                <div className="flex justify-between font-bold">
                                                    <span>Итого: {calculateTotalDuration()} мин</span>
                                                    <span>{calculateTotalPrice()} сом</span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-2 text-amber-600 text-sm">Нет дополнительных услуг</div>
                                    )}
                                </div>

                                <Select value="" onValueChange={handleAddService} disabled={createAdditionalServiceMutation.isPending}>
                                    <SelectTrigger className="w-full mt-2"><SelectValue placeholder="Добавить услугу" /></SelectTrigger>
                                    <SelectContent>
                                        {serviceServices?.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex justify-between mt-4">
                                <div className="flex gap-2">
                                    <Button type="button" variant="outline" onClick={onClose} className="bg-red-500 text-white">Отмена</Button>
                                    <Button type="button" variant="outline" onClick={() => setShowPaymentDialog(true)} className="bg-amber-500 text-white">
                                        <CreditCard className="h-4 w-4 mr-2" />Оплатить
                                    </Button>
                                </div>
                                <Button type="submit" disabled={updateTaskMutation.isPending} className="bg-green-500 text-white">
                                    {updateTaskMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Сохранить
                                </Button>
                            </div>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader><DialogTitle>Оплата услуг</DialogTitle></DialogHeader>
                    <div className="flex gap-6">
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold mb-4">Способ оплаты</h3>
                            <div className="space-y-2">
                                {paymentMethods.map((method) => (
                                    <div key={method.value} onClick={() => setSelectedPaymentMethod(method.value)}
                                        className={`p-3 border rounded-lg cursor-pointer ${selectedPaymentMethod === method.value ? 'border-amber-400 bg-amber-50' : 'hover:bg-gray-50'}`}>
                                        <div className="flex items-center gap-3">
                                            <div className="text-2xl">{method.icon}</div>
                                            <div>
                                                <div className="font-medium">{method.label}</div>
                                                <div className="text-sm text-gray-600">{method.description}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="w-64 bg-gray-50 rounded-lg p-4">
                            <h3 className="font-semibold mb-4">Детали</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between"><span>Услуга:</span><span className="font-medium">{task?.serviceType}</span></div>
                                <div className="flex justify-between"><span>Мастер:</span><span className="font-medium">{task?.masterName}</span></div>
                                <div className="flex justify-between"><span>Клиент:</span><span className="font-medium">{task?.client?.customName || task?.client?.firstName}</span></div>
                                <hr />
                                <div className="flex justify-between"><span>Сумма:</span><span>{calculateTotalPrice()} сом</span></div>
                                {formData.discount > 0 && <div className="flex justify-between text-green-600"><span>Скидка:</span><span>-{Math.round(calculateTotalPrice() * formData.discount / 100)} сом</span></div>}
                                <hr />
                                <div className="flex justify-between font-bold text-lg"><span>К оплате:</span><span className="text-amber-600">{calculateTotalPrice() - Math.round(calculateTotalPrice() * formData.discount / 100)} сом</span></div>
                            </div>
                        </div>
                    </div>
                    <div className="border-t pt-4">
                        <Label>Администратор</Label>
                        <Select value={selectedAdministrator} onValueChange={setSelectedAdministrator}>
                            <SelectTrigger><SelectValue placeholder="Выберите администратора" /></SelectTrigger>
                            <SelectContent>
                                {administrators.map((admin) => <SelectItem key={admin.id} value={admin.name}>{admin.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>Отмена</Button>
                        <Button onClick={() => createPaymentMutation.mutate()} disabled={!selectedPaymentMethod || !selectedAdministrator || createPaymentMutation.isPending} className="bg-amber-500">
                            {createPaymentMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Зафиксировать оплату
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

// Main Component
const AdvancedScheduleComponent: React.FC = () => {
    const [location, setLocation] = useLocation();
    const { toast } = useToast();
    const { currentBranch } = useBranch();
    const queryClient = useQueryClient();

    const urlParams = new URLSearchParams(location.split('?')[1] || '');
    const dateParam = urlParams.get('date');
    const [currentDate, setCurrentDate] = useState(() => dateParam ? new Date(dateParam) : new Date());

    useEffect(() => {
        const formattedDate = format(currentDate, 'yyyy-MM-dd');
        setLocation(`/crm/calendar?date=${formattedDate}`, { replace: true });
    }, [currentDate, setLocation]);

    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [selectedTimeSlot, setSelectedTimeSlot] = useState<{ time: string; masterId: number } | null>(null);
    const [currentTimePosition, setCurrentTimePosition] = useState(getCurrentTimePosition());

    const [dragState, setDragState] = useState<DragState>({
        isDragging: false,
        draggedAppointment: null,
        dragStartPosition: { x: 0, y: 0 },
        currentPosition: { x: 0, y: 0 },
        targetSlot: null,
        dragOffset: { x: 0, y: 0 }
    });

    const scheduleRef = useRef<HTMLDivElement>(null);
    const formattedDate = format(currentDate, 'yyyy-MM-dd');

    const { data: masters = [], isLoading: mastersLoading } = useQuery<Master[]>({
        queryKey: ['calendar-masters', formattedDate, currentBranch?.id],
        queryFn: () => fetch(`${import.meta.env.VITE_BACKEND_URL}/api/calendar/masters/${formattedDate}?branchId=${currentBranch?.id}`, {
            credentials: 'include'
        }).then(res => res.json()),
        enabled: !!currentBranch?.id,
    });

    const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
        queryKey: ['calendar-tasks', formattedDate, currentBranch?.id],
        queryFn: async () => {
            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/crm/tasks?date=${formattedDate}&branchId=${currentBranch?.id}`, {
                credentials: 'include'
            });
            if (!res.ok) throw new Error('Failed to fetch tasks');
            return res.json();
        },
        enabled: !!currentBranch?.id
    });

    useEffect(() => {
        const interval = setInterval(() => {
            queryClient.invalidateQueries({ queryKey: ['calendar-masters'] });
            queryClient.invalidateQueries({ queryKey: ['calendar-tasks'] });
            setCurrentTimePosition(getCurrentTimePosition());
        }, 10000);
        return () => clearInterval(interval);
    }, [queryClient]);

    const timeSlots = useMemo(() => generateTimeSlots(), []);
    const dateString = useMemo(() => currentDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }), [currentDate]);

    const activeMasters = useMemo(() => {
        return masters.filter((m: Master) => m.isActive).map((m, idx) => ({
            ...m,
            color: m.color || EMPLOYEE_COLORS[idx % EMPLOYEE_COLORS.length]
        }));
    }, [masters]);

    const getEmployeeColumnWidth = useCallback(() => {
        if (!scheduleRef.current) return 200;
        return Math.max(200, scheduleRef.current.clientWidth / activeMasters.length);
    }, [activeMasters.length]);

    const moveTaskMutation = useMutation({
        mutationFn: async ({ taskId, newTime, newMasterId }: { taskId: number; newTime: string; newMasterId: number }) => {
            const newMaster = activeMasters.find(m => m.id === newMasterId);
            if (!newMaster) throw new Error('Мастер не найден');

            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/tasks/${taskId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    scheduleTime: newTime,
                    masterId: newMasterId,
                    masterName: newMaster.name
                }),
                credentials: 'include'
            });

            if (!res.ok) throw new Error('Ошибка перемещения');
            return res.json();
        },
        onSuccess: () => {
            toast({ title: "Запись перемещена" });
            queryClient.invalidateQueries({ queryKey: ['calendar-tasks'] });
        },
        onError: (error: Error) => {
            toast({ title: "Ошибка", description: error.message, variant: "destructive" });
        }
    });

    const getPositionFromMouse = useCallback((x: number, y: number) => {
        const employeeColumnWidth = getEmployeeColumnWidth();
        const employeeIndex = Math.floor(x / employeeColumnWidth);
        const timeSlotIndex = Math.floor((y - HEADER_HEIGHT) / TIME_SLOT_HEIGHT);

        if (employeeIndex >= 0 && employeeIndex < activeMasters.length &&
            timeSlotIndex >= 0 && timeSlotIndex < timeSlots.length) {
            return {
                employeeId: activeMasters[employeeIndex].id,
                timeSlot: timeSlots[timeSlotIndex],
            };
        }
        return null;
    }, [activeMasters, timeSlots, getEmployeeColumnWidth]);

    const handleMouseDown = useCallback((e: React.MouseEvent, appointment: Task) => {
        e.preventDefault();
        e.stopPropagation();

        setDragState({
            isDragging: true,
            draggedAppointment: appointment,
            dragStartPosition: { x: e.clientX, y: e.clientY },
            currentPosition: { x: e.clientX, y: e.clientY },
            targetSlot: null,
            dragOffset: { x: 0, y: 0 }
        });
    }, []);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!scheduleRef.current) return;

        const rect = scheduleRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        if (dragState.isDragging && dragState.draggedAppointment) {
            const position = getPositionFromMouse(mouseX, mouseY);

            if (position) {
                setDragState(prev => ({
                    ...prev,
                    currentPosition: { x: e.clientX, y: e.clientY },
                    targetSlot: { employeeId: position.employeeId, timeSlot: position.timeSlot }
                }));
            }
        }
    }, [dragState, getPositionFromMouse]);

    const handleMouseUp = useCallback(() => {
        if (dragState.isDragging && dragState.draggedAppointment && dragState.targetSlot) {
            moveTaskMutation.mutate({
                taskId: dragState.draggedAppointment.id,
                newTime: dragState.targetSlot.timeSlot,
                newMasterId: dragState.targetSlot.employeeId
            });
        }

        setDragState({
            isDragging: false,
            draggedAppointment: null,
            dragStartPosition: { x: 0, y: 0 },
            currentPosition: { x: 0, y: 0 },
            targetSlot: null,
            dragOffset: { x: 0, y: 0 }
        });
    }, [dragState, moveTaskMutation]);

    useEffect(() => {
        if (dragState.isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'grabbing';

            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                document.body.style.cursor = '';
            };
        }
    }, [dragState.isDragging, handleMouseMove, handleMouseUp]);

    const handleTimeSlotClick = useCallback((employeeId: number, timeSlot: string) => {
        const existingTask = tasks.find(t =>
            t.masterId === employeeId &&
            t.scheduleTime === timeSlot &&
            t.scheduleDate?.split('T')[0] === formattedDate
        );

        if (existingTask) {
            setSelectedTask(existingTask);
            setShowEditDialog(true);
        } else {
            setSelectedTimeSlot({ time: timeSlot, masterId: employeeId });
            setShowCreateDialog(true);
        }
    }, [tasks, formattedDate]);

    const getAppointmentLayout = useCallback((employeeId: number) => {
        const employeeAppointments = tasks.filter(apt =>
            apt.masterId === employeeId &&
            apt.scheduleDate?.split('T')[0] === formattedDate
        );

        const sortedAppointments = employeeAppointments.sort((a, b) => {
            const aStart = timeToMinutes(a.scheduleTime || '');
            const bStart = timeToMinutes(b.scheduleTime || '');
            if (aStart !== bStart) return aStart - bStart;
            return (b.serviceDuration || b.duration || 0) - (a.serviceDuration || a.duration || 0);
        });

        const layoutData: Array<{
            appointment: Task;
            column: number;
            width: number;
            totalColumns: number;
            zIndex: number;
        }> = [];

        for (let i = 0; i < sortedAppointments.length; i++) {
            const currentApt = sortedAppointments[i];
            const currentStart = timeToMinutes(currentApt.scheduleTime || '');
            const currentEnd = timeToMinutes(currentApt.endTime || '');

            const overlapping = sortedAppointments.filter(apt => {
                const start = timeToMinutes(apt.scheduleTime || '');
                const end = timeToMinutes(apt.endTime || '');
                return start < currentEnd && end > currentStart;
            });

            overlapping.sort((a, b) => (b.serviceDuration || b.duration || 0) - (a.serviceDuration || a.duration || 0));

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
    }, [tasks, formattedDate]);

    const renderAppointmentBlock = (layoutInfo: {
        appointment: Task;
        column: number;
        width: number;
        totalColumns: number;
        zIndex: number;
    }) => {
        const { appointment, column, width, zIndex } = layoutInfo;
        const startIndex = timeSlots.findIndex(slot => slot === appointment.scheduleTime);
        const duration = appointment.serviceDuration || appointment.duration || 60;
        const durationSlots = Math.ceil(duration / 15);
        const height = durationSlots * TIME_SLOT_HEIGHT - 2;

        const statusColors = getStatusColors(appointment.status || 'scheduled');
        const relatedStyles = getRelatedTaskStyles(appointment, tasks);
        const isDragging = dragState.isDragging && dragState.draggedAppointment?.id === appointment.id;

        const isSmall = height <= 32;
        const isMedium = height > 32 && height <= 64;

        return (
            <Tooltip key={appointment.id}>
                <TooltipTrigger asChild>
                    <div
                        className={`absolute border-l-4 rounded-r-md text-xs group transition-all duration-100 ${statusColors.bg} ${relatedStyles.borderStyle || (statusColors.border + ' border-l-4')
                            } ${isDragging ? 'opacity-70 scale-105 shadow-xl ring-2 ring-blue-400/50' : 'shadow-sm hover:shadow-md'} hover:opacity-90`}
                        style={{
                            top: startIndex * TIME_SLOT_HEIGHT + 1,
                            height: Math.max(height, 32),
                            left: `${(column * width)}%`,
                            width: `${width}%`,
                            paddingLeft: column > 0 ? '2px' : '4px',
                            paddingRight: '4px',
                            zIndex: zIndex,
                            cursor: 'grab'
                        }}
                    >
                        <div
                            className={`${isSmall ? 'px-1 py-1' : 'px-2 py-1'} h-full flex ${isSmall ? 'items-center' : 'flex-col justify-between'} cursor-grab active:cursor-grabbing`}
                            onMouseDown={(e) => handleMouseDown(e, appointment)}
                        >
                            {isSmall ? (
                                <div className="flex-1 min-w-0 pointer-events-none pr-6">
                                    <div className="font-semibold truncate text-xs leading-tight flex items-center gap-1">
                                        {relatedStyles.indicator && <span>{relatedStyles.indicator}</span>}
                                        {appointment.client?.customName || appointment.client?.firstName || 'Клиент'}
                                    </div>
                                    <div className="truncate text-xs opacity-70 leading-tight">{appointment.serviceType}</div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-start justify-between pr-6">
                                        <div className="flex-1 min-w-0 pointer-events-none">
                                            <div className="font-semibold truncate text-sm leading-tight flex items-center gap-1">
                                                {relatedStyles.indicator && <span>{relatedStyles.indicator}</span>}
                                                {appointment.client?.customName || appointment.client?.firstName || 'Клиент'}
                                            </div>
                                            <div className="truncate text-xs opacity-70 leading-tight">{appointment.serviceType}</div>
                                            {appointment.client?.phoneNumber && (
                                                <div className="truncate text-xs opacity-60 leading-tight">{appointment.client.phoneNumber}</div>
                                            )}
                                        </div>
                                    </div>

                                    {width > 50 && (
                                        <div className="text-xs opacity-60 mt-auto pointer-events-none leading-tight">
                                            {appointment.scheduleTime} - {appointment.endTime}
                                        </div>
                                    )}
                                </>
                            )}

                            {appointment.paid !== 'paid' && (
                                <Coins className="absolute top-1 right-1 h-3 w-3 text-amber-500" />
                            )}
                        </div>
                    </div>
                </TooltipTrigger>
                <TooltipContent className="bg-white border border-gray-300 rounded-lg shadow-xl p-4 min-w-64 max-w-80">
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: statusColors.badge }} />
                            <h3 className="font-semibold text-gray-900">{appointment.client?.customName || appointment.client?.firstName}</h3>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${statusColors.badge} text-white`}>
                            {getStatusLabel(appointment.status || 'scheduled')}
                        </span>
                    </div>

                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Мастер:</span>
                            <span className="font-medium">{appointment.masterName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Услуга:</span>
                            <span className="font-medium">{appointment.serviceType}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Время:</span>
                            <span className="font-medium">{appointment.scheduleTime} - {appointment.endTime}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Длительность:</span>
                            <span className="font-medium">{duration} мин</span>
                        </div>
                        {appointment.finalPrice && (
                            <div className="flex justify-between">
                                <span className="text-gray-600">Стоимость:</span>
                                <span className="font-medium">{appointment.finalPrice} сом</span>
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

    if (mastersLoading || tasksLoading) {
        return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <TooltipProvider>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Calendar className="text-gray-600" size={20} />
                            <h2 className="text-xl font-semibold text-gray-900">Расписание на {dateString}</h2>
                        </div>
                    </div>
                </div>

                <div className="flex overflow-x-auto">
                    {dragState.isDragging && dragState.targetSlot && (
                        <div className="fixed top-4 right-4 bg-blue-600 text-white px-3 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2">
                            <GripVertical size={16} />
                            Перемещение к {activeMasters.find(emp => emp.id === dragState.targetSlot!.employeeId)?.name} на {dragState.targetSlot.timeSlot}
                        </div>
                    )}

                    <div className="w-20 flex-shrink-0 border-r border-gray-200 bg-gray-50">
                        <div className="h-16 border-b border-gray-200 flex items-center justify-center">
                            <Clock size={16} className="text-gray-500" />
                        </div>
                        {timeSlots.map((slot, index) => (
                            <div key={slot} className={`h-8 flex items-center justify-center text-sm border-b border-gray-100 ${index % 4 === 0 ? 'font-medium text-gray-700' : 'text-gray-500'
                                }`}>
                                {index % 4 === 0 ? slot : ''}
                            </div>
                        ))}
                    </div>

                    <div className="flex-1 relative" ref={scheduleRef}>
                        <div className="absolute left-0 right-0 h-0.5 bg-red-500 z-30 shadow-sm flex items-center" style={{ top: currentTimePosition + HEADER_HEIGHT - 1 }}>
                            <div className="w-2 h-2 bg-red-500 rounded-full -ml-1"></div>
                            <div className="flex-1 h-0.5 bg-red-500"></div>
                        </div>

                        <div className="flex">
                            {activeMasters.map((employee) => (
                                <div key={employee.id} className="flex-1 min-w-48 border-r border-gray-200 last:border-r-0" style={{ minWidth: '200px' }}>
                                    <div className="h-16 p-3 border-b border-gray-200 bg-white relative group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm flex-shrink-0" style={{ backgroundColor: employee.color }}>
                                                {employee.photoUrl ? (
                                                    <img src={employee.photoUrl} alt={employee.name} className="w-full h-full rounded-full object-cover" />
                                                ) : (
                                                    employee.name[0]
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-semibold text-sm text-gray-900 truncate">{employee.name}</div>
                                                <div className="text-xs text-gray-500 truncate">{employee.specialization}</div>
                                                <div className="text-xs font-medium" style={{ color: employee.color }}>
                                                    {employee.startWorkHour} - {employee.endWorkHour}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="relative">
                                        {timeSlots.map((slot) => (
                                            <button
                                                key={`${employee.id}-${slot}`}
                                                onClick={() => handleTimeSlotClick(employee.id, slot)}
                                                className="w-full h-8 border-b border-gray-200 hover:bg-blue-50 group transition-colors flex items-center justify-center relative"
                                            >
                                                <Plus size={14} className="text-gray-300 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all" />
                                            </button>
                                        ))}

                                        {getAppointmentLayout(employee.id).map((layoutInfo) => renderAppointmentBlock(layoutInfo))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <CreateAppointmentDialog
                isOpen={showCreateDialog}
                onClose={() => setShowCreateDialog(false)}
                selectedDate={currentDate}
                selectedTime={selectedTimeSlot?.time}
                masterId={selectedTimeSlot?.masterId}
                onTaskCreated={() => {
                    queryClient.invalidateQueries({ queryKey: ['calendar-tasks'] });
                    setSelectedTimeSlot(null);
                }}
            />

            <EditAppointmentDialog
                task={selectedTask}
                isOpen={showEditDialog}
                onClose={() => setShowEditDialog(false)}
                onTaskUpdated={() => {
                    queryClient.invalidateQueries({ queryKey: ['calendar-tasks'] });
                    setSelectedTask(null);
                }}
            />
        </TooltipProvider>
    );
};

export default AdvancedScheduleComponent;