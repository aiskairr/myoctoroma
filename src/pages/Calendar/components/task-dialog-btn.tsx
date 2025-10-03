import { useForm, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Clock, CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import type React from "react";
import { useState, useEffect, useCallback } from "react";
import { useTask, formatTaskForForm, useCreateTask, generateTaskId } from "@/hooks/use-task";
import { useMasters } from "@/hooks/use-masters";
import { useServices, convertServicesToLegacyFormat, getServiceDurations } from "@/hooks/use-services";
import { useBranch } from "@/contexts/BranchContext";
import { useAuth } from "@/contexts/SimpleAuthContext";

interface FormData {
    clientName: string;
    phone: string;
    notes: string;
    time: string;
    duration: string;
    serviceType: string;
    master: string;
    status: string;
    branch: string;
    date: string;
    discount: string;
    cost: string;
}

interface Props {
    children: React.ReactNode;
    taskId?: number | null; // ID задачи для загрузки данных
}

const TaskDialogBtn: React.FC<Props> = ({ children, taskId = null }) => {
    const [isOpen, setIsOpen] = useState(false);

    // Fetch task data from API
    const { data: taskData, isLoading: taskLoading, error: taskError } = useTask(taskId);
    
    // API mutations
    const createTaskMutation = useCreateTask();
    
    // Fetch masters, services, and branches data
    const { data: mastersData = [] } = useMasters();
    const { data: servicesData = [] } = useServices();
    const { branches } = useBranch();
    const { user } = useAuth();
    
    // Convert services to legacy format
    const services = convertServicesToLegacyFormat(servicesData);

    const {
        control,
        handleSubmit,
        formState: { errors, isValid },
        reset
    } = useForm<FormData>({
        mode: 'onChange',
        defaultValues: {
            clientName: '',
            phone: '',
            notes: '',
            time: '',
            duration: '',
            serviceType: '',
            master: '',
            status: '',
            branch: '',
            date: '',
            discount: '0',
            cost: '0'
        }
    });

    // Update form when task data is loaded
    useEffect(() => {
        if (taskData && !taskLoading) {
            const formData = formatTaskForForm(taskData);
            reset(formData);
        }
    }, [taskData, taskLoading, reset]);

    const handleOpenChange = useCallback((open: boolean) => {
        setIsOpen(open);
    }, []);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    // Форматирование номера телефона для Кыргызстана
    const formatKyrgyzPhone = (value: string) => {
        const cleanValue = value.replace(/\D/g, '');

        if (cleanValue.length === 0) return '';

        let formattedValue = cleanValue;

        if (cleanValue.startsWith('996')) {
            formattedValue = cleanValue;
        } else if (cleanValue.startsWith('0')) {
            formattedValue = '996' + cleanValue.substring(1);
        } else if (cleanValue.length <= 9) {
            formattedValue = '996' + cleanValue;
        }

        if (formattedValue.length >= 3) {
            const countryCode = formattedValue.substring(0, 3);
            const operatorCode = formattedValue.substring(3, 6);
            const firstPart = formattedValue.substring(6, 9);
            const secondPart = formattedValue.substring(9, 12);

            let formatted = `+${countryCode}`;
            if (operatorCode) formatted += ` (${operatorCode}`;
            if (firstPart) {
                if (operatorCode.length === 3) formatted += ')';
                formatted += ` ${firstPart}`;
            }
            if (secondPart) formatted += `-${secondPart}`;

            return formatted;
        }

        return `+${formattedValue}`;
    };

    // Генерация временных слотов
    const generateTimeSlots = () => {
        const slots = [];
        for (let hour = 9; hour <= 21; hour++) {
            for (let minute = 0; minute < 60; minute += 30) {
                const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                slots.push(timeString);
            }
        }
        return slots;
    };

    const timeSlots = generateTimeSlots();

    const onSubmit = (data: FormData) => {
        console.log('📤 Form data:', data);
        
        // Если это редактирование существующей задачи, просто закрываем диалог
        if (taskId) {
            console.log('📝 Editing existing task, closing dialog');
            handleOpenChange(false);
            return;
        }
        
        // Валидация обязательных полей для новой задачи
        if (!data.clientName.trim()) {
            alert('Пожалуйста, введите имя клиента');
            return;
        }
        
        if (!data.phone.trim()) {
            alert('Пожалуйста, введите номер телефона');
            return;
        }
        
        if (!data.serviceType) {
            alert('Пожалуйста, выберите тип услуги');
            return;
        }
        
        if (!data.master) {
            alert('Пожалуйста, выберите мастера');
            return;
        }
        
        if (!data.date) {
            alert('Пожалуйста, выберите дату');
            return;
        }
        
        if (!data.time) {
            alert('Пожалуйста, выберите время');
            return;
        }
        
        // Для новой задачи - отправляем POST запрос
        console.log('🆕 Creating new task');
        
        // Generate unique task ID
        const organisationId = user?.organisationId || user?.organization_id || user?.orgId || '1';
        const branchId = data.branch || '1';
        const generatedTaskId = generateTaskId(organisationId, branchId);
        
        // Парсим данные формы для API
        const parsedData = {
            id: generatedTaskId,
            clientName: data.clientName,
            clientPhone: data.phone || undefined,
            notes: data.notes || undefined,
            scheduleDate: data.date,
            scheduleTime: data.time,
            serviceType: data.serviceType,
            masterId: parseInt(data.master),
            serviceDuration: parseInt(data.duration.split(' ')[0]), // Извлекаем числовое значение
            servicePrice: parseFloat(data.cost) || 0,
            branchId: branchId,
            status: 'scheduled'
        };
        
        console.log('📦 Parsed data for API:', parsedData);
        
        // Отправляем POST запрос
        createTaskMutation.mutate(parsedData, {
            onSuccess: (newTask) => {
                console.log('✅ Task created successfully:', newTask);
                handleOpenChange(false);
                // Форма автоматически сбросится при закрытии диалога
            },
            onError: (error) => {
                console.error('❌ Failed to create task:', error);
                // Можно добавить toast уведомление об ошибке
                alert(`Ошибка при создании задачи: ${error.message}`);
            }
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent
                className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto"
                // Убрали onInteractOutside - теперь клик по backdrop будет закрывать модалку
                onEscapeKeyDown={() => handleOpenChange(false)}
            >
                <DialogHeader className="pb-4">
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                        <DialogTitle className="text-sm font-medium text-gray-600">
                            НЕ ОПЛАЧЕНО
                        </DialogTitle>
                    </div>
                </DialogHeader>

                {/* Loading State */}
                {taskId && taskLoading && (
                    <div className="p-8 text-center">
                        <div className="flex items-center justify-center gap-3">
                            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                            <span className="text-gray-600">Загрузка данных задачи...</span>
                        </div>
                    </div>
                )}

                {/* Error State */}
                {taskId && taskError && !taskLoading && (
                    <div className="p-8 text-center">
                        <div className="text-red-600 mb-2">
                            Ошибка загрузки задачи
                        </div>
                        <p className="text-gray-600 text-sm">
                            {taskError?.message || 'Не удалось загрузить данные задачи'}
                        </p>
                    </div>
                )}

                {/* Form Content */}
                {(!taskId || (!taskLoading && !taskError)) && (
                    <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="grid grid-cols-2 gap-4">
                        {/* Левая колонка - Клиент */}
                        <div className="space-y-4">
                            <h3 className="text-blue-600 font-medium">Клиент</h3>

                            <div>
                                <Label className="text-sm text-gray-600">Имя клиента *</Label>
                                <Controller
                                    name="clientName"
                                    control={control}
                                    rules={{
                                        required: "Имя клиента обязательно",
                                        minLength: {
                                            value: 2,
                                            message: "Имя должно содержать минимум 2 символа"
                                        }
                                    }}
                                    render={({ field }) => (
                                        <Input
                                            {...field}
                                            className={`mt-1 ${errors.clientName ? 'border-red-500' : ''}`}
                                        />
                                    )}
                                />
                                {errors.clientName && (
                                    <p className="text-red-500 text-xs mt-1">{errors.clientName.message}</p>
                                )}
                            </div>

                            <div>
                                <Label className="text-sm text-gray-600">Телефон *</Label>
                                <Controller
                                    name="phone"
                                    control={control}
                                    rules={{
                                        required: "Номер телефона обязателен",
                                        validate: (value) => {
                                            const cleanPhone = value.replace(/\D/g, '');
                                            if (!cleanPhone.match(/^996\d{9}$/)) {
                                                return "Номер должен быть кыргызским: +996 (XXX) XXX-XXX";
                                            }
                                            return true;
                                        }
                                    }}
                                    render={({ field }) => (
                                        <Input
                                            {...field}
                                            placeholder="+996 (XXX) XXX-XXX"
                                            onChange={(e) => {
                                                const formatted = formatKyrgyzPhone(e.target.value);
                                                field.onChange(formatted);
                                            }}
                                            className={`mt-1 ${errors.phone ? 'border-red-500' : ''}`}
                                        />
                                    )}
                                />
                                {errors.phone && (
                                    <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>
                                )}
                            </div>

                            <div>
                                <Label className="text-sm text-gray-600">Примечания</Label>
                                <Controller
                                    name="notes"
                                    control={control}
                                    render={({ field }) => (
                                        <Textarea
                                            {...field}
                                            className="mt-1 min-h-[80px] resize-none"
                                        />
                                    )}
                                />
                            </div>
                        </div>

                        {/* Правая колонка - Запись */}
                        <div className="space-y-4">
                            <h3 className="text-blue-600 font-medium">Запись</h3>

                            <div>
                                <Label className="text-sm text-gray-600">Время</Label>
                                <Controller
                                    name="time"
                                    control={control}
                                    rules={{
                                        required: "Время обязательно"
                                    }}
                                    render={({ field }) => (
                                        <Select
                                            value={field.value}
                                            onValueChange={field.onChange}
                                        >
                                            <SelectTrigger className={`mt-1 ${errors.time ? 'border-red-500' : ''}`}>
                                                <div className="flex items-center gap-2">
                                                    <Clock className="w-4 h-4 text-gray-400" />
                                                    <SelectValue placeholder="Выберите время" />
                                                </div>
                                            </SelectTrigger>
                                            <SelectContent className="max-h-60">
                                                {timeSlots.map((time) => (
                                                    <SelectItem key={time} value={time}>
                                                        {time}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                                {errors.time && (
                                    <p className="text-red-500 text-xs mt-1">{errors.time.message}</p>
                                )}
                            </div>

                            <div>
                                <Label className="text-sm text-gray-600">Длительность</Label>
                                <Controller
                                    name="duration"
                                    control={control}
                                    rules={{ required: "Выберите длительность" }}
                                    render={({ field }) => (
                                        <Select
                                            value={field.value}
                                            onValueChange={field.onChange}
                                        >
                                            <SelectTrigger className={`mt-1 ${errors.duration ? 'border-red-500' : ''}`}>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {services.map(service => {
                                                    const durations = getServiceDurations(servicesData.find(s => s.name === service.name) || servicesData[0]);
                                                    return durations.map(({ duration, price }) => (
                                                        <SelectItem key={`${service.name}-${duration}`} value={`${duration} мин - ${price} сом`}>
                                                            {duration} мин - {price} сом
                                                        </SelectItem>
                                                    ));
                                                }).flat()}
                                                {/* Fallback options if no services loaded */}
                                                {services.length === 0 && (
                                                    <>
                                                        <SelectItem value="30 мин - 300 сом">30 мин - 300 сом</SelectItem>
                                                        <SelectItem value="60 мин - 500 сом">60 мин - 500 сом</SelectItem>
                                                        <SelectItem value="90 мин - 700 сом">90 мин - 700 сом</SelectItem>
                                                        <SelectItem value="120 мин - 900 сом">120 мин - 900 сом</SelectItem>
                                                    </>
                                                )}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                                {errors.duration && (
                                    <p className="text-red-500 text-xs mt-1">{errors.duration.message}</p>
                                )}
                            </div>

                            <div>
                                <Label className="text-sm text-gray-600">Тип услуги</Label>
                                <Controller
                                    name="serviceType"
                                    control={control}
                                    rules={{ required: "Выберите тип услуги" }}
                                    render={({ field }) => (
                                        <Select
                                            value={field.value}
                                            onValueChange={field.onChange}
                                        >
                                            <SelectTrigger className={`mt-1 ${errors.serviceType ? 'border-red-500' : ''}`}>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {services.map(service => (
                                                    <SelectItem key={service.id} value={service.name}>
                                                        {service.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                                {errors.serviceType && (
                                    <p className="text-red-500 text-xs mt-1">{errors.serviceType.message}</p>
                                )}
                            </div>

                            <div>
                                <Label className="text-sm text-gray-600">Мастер</Label>
                                <Controller
                                    name="master"
                                    control={control}
                                    rules={{ required: "Выберите мастера" }}
                                    render={({ field }) => (
                                        <Select
                                            value={field.value}
                                            onValueChange={field.onChange}
                                        >
                                            <SelectTrigger className={`mt-1 ${errors.master ? 'border-red-500' : ''}`}>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {mastersData.map(master => (
                                                    <SelectItem key={master.id} value={master.name}>
                                                        {master.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                                {errors.master && (
                                    <p className="text-red-500 text-xs mt-1">{errors.master.message}</p>
                                )}
                            </div>

                            <div>
                                <Label className="text-sm text-gray-600">Статус</Label>
                                <Controller
                                    name="status"
                                    control={control}
                                    rules={{ required: "Выберите статус" }}
                                    render={({ field }) => (
                                        <Select
                                            value={field.value}
                                            onValueChange={field.onChange}
                                        >
                                            <SelectTrigger className={`mt-1 ${errors.status ? 'border-red-500' : ''}`}>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Записан">Записан</SelectItem>
                                                <SelectItem value="Подтвержден">Подтвержден</SelectItem>
                                                <SelectItem value="В процессе">В процессе</SelectItem>
                                                <SelectItem value="Завершен">Завершен</SelectItem>
                                                <SelectItem value="Отменен">Отменен</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                                {errors.status && (
                                    <p className="text-red-500 text-xs mt-1">{errors.status.message}</p>
                                )}
                            </div>

                            <div>
                                <Label className="text-sm text-gray-600">Филиал</Label>
                                <Controller
                                    name="branch"
                                    control={control}
                                    rules={{ required: "Выберите филиал" }}
                                    render={({ field }) => (
                                        <Select
                                            value={field.value}
                                            onValueChange={field.onChange}
                                        >
                                            <SelectTrigger className={`mt-1 ${errors.branch ? 'border-red-500' : ''}`}>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {branches.map(branch => (
                                                    <SelectItem key={branch.id} value={branch.branches}>
                                                        {branch.branches}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                                {errors.branch && (
                                    <p className="text-red-500 text-xs mt-1">{errors.branch.message}</p>
                                )}
                            </div>

                            <div>
                                <Label className="text-sm text-gray-600">Дата</Label>
                                <Controller
                                    name="date"
                                    control={control}
                                    rules={{
                                        required: "Дата обязательна",
                                        validate: (value) => {
                                            const today = new Date();
                                            today.setHours(0, 0, 0, 0);

                                            const [day, month, year] = value.split('.');
                                            const selectedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

                                            if (selectedDate < today) {
                                                return "Дата не может быть в прошлом";
                                            }
                                            return true;
                                        }
                                    }}
                                    render={({ field }) => (
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className={`mt-1 w-full justify-start text-left font-normal ${!field.value ? "text-muted-foreground" : ""
                                                        } ${errors.date ? 'border-red-500' : ''}`}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {field.value ? (
                                                        field.value
                                                    ) : (
                                                        <span>Выберите дату</span>
                                                    )}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={
                                                        field.value
                                                            ? new Date(field.value.split('.').reverse().join('-'))
                                                            : undefined
                                                    }
                                                    onSelect={(date) => {
                                                        if (date) {
                                                            const formattedDate = format(date, "dd.MM.yyyy");
                                                            field.onChange(formattedDate);
                                                        }
                                                    }}
                                                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                                    locale={ru}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    )}
                                />
                                {errors.date && (
                                    <p className="text-red-500 text-xs mt-1">{errors.date.message}</p>
                                )}
                            </div>

                            <div>
                                <Label className="text-sm text-gray-600">Скидка (%)</Label>
                                <Controller
                                    name="discount"
                                    control={control}
                                    rules={{
                                        min: {
                                            value: 0,
                                            message: "Скидка не может быть отрицательной"
                                        },
                                        max: {
                                            value: 100,
                                            message: "Скидка не может быть больше 100%"
                                        }
                                    }}
                                    render={({ field }) => (
                                        <Input
                                            {...field}
                                            type="number"
                                            className={`mt-1 ${errors.discount ? 'border-red-500' : ''}`}
                                            min="0"
                                            max="100"
                                        />
                                    )}
                                />
                                {errors.discount && (
                                    <p className="text-red-500 text-xs mt-1">{errors.discount.message}</p>
                                )}
                            </div>

                            <div>
                                <Label className="text-sm text-gray-600 flex justify-end">Стоимость:</Label>
                                <Controller
                                    name="cost"
                                    control={control}
                                    rules={{
                                        required: "Стоимость обязательна",
                                        min: {
                                            value: 0,
                                            message: "Стоимость не может быть отрицательной"
                                        }
                                    }}
                                    render={({ field }) => (
                                        <Input
                                            {...field}
                                            type="number"
                                            className={`mt-1 text-right font-medium ${errors.cost ? 'border-red-500' : ''}`}
                                        />
                                    )}
                                />
                                {errors.cost && (
                                    <p className="text-red-500 text-xs mt-1">{errors.cost.message}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleOpenChange(false)}
                        >
                            Отмена
                        </Button>
                        <Button
                            type="submit"
                            disabled={!isValid || (!taskId && createTaskMutation.isPending)}
                            className={(!isValid || (!taskId && createTaskMutation.isPending)) ? 'opacity-50 cursor-not-allowed' : ''}
                        >
                            {!taskId && createTaskMutation.isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Создание...
                                </>
                            ) : (
                                taskId ? 'Сохранить' : 'Создать задачу'
                            )}
                        </Button>
                    </div>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default TaskDialogBtn;