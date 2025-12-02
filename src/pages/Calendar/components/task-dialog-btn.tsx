import { useForm, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Clock, CalendarIcon, Loader2, CreditCard, Trash2, Plus, CheckCircle, X, Scissors } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import type React from "react";
import { useState, useEffect, useCallback } from "react";
import { useTask, formatTaskForForm, useCreateTask, generateTaskId } from "@/hooks/use-task";
import { useMasters } from "@/hooks/use-masters";
import { useServices, convertServicesToLegacyFormat, getServiceDurations } from "@/hooks/use-services";
import { useBranch } from "@/contexts/BranchContext";
import { useAuth } from "@/contexts/SimpleAuthContext";
import { PaymentMethodIcon } from "@/components/BankIcons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useLocale } from "@/contexts/LocaleContext";

// Интерфейс для способов оплаты
interface PaymentMethod {
  value: string;
  label: string;
  icon: string;
  description: string;
}

// Интерфейс для дополнительной услуги
interface AdditionalService {
    id: number;
    serviceId: number;
    serviceName: string;
    duration: number;
    price: number;
}

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
    const [showPaymentDialog, setShowPaymentDialog] = useState(false);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("");
    const [selectedAdministrator, setSelectedAdministrator] = useState<string>("");

    // States for additional services
    const [additionalServices, setAdditionalServices] = useState<AdditionalService[]>([]);
    const [newAdditionalService, setNewAdditionalService] = useState({
        serviceId: '',
        serviceName: '',
        duration: 0,
        price: 0
    });

    // Hooks
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { t } = useLocale();

    // Fetch task data from API
    const { data: taskData, isLoading: taskLoading, error: taskError } = useTask(taskId);
    
    // API mutations
    const createTaskMutation = useCreateTask();
    
    // Fetch masters, services, and branches data
    const { data: mastersData = [] } = useMasters();
    const { data: servicesData = [] } = useServices();
    const { branches } = useBranch();
    const { user } = useAuth();

    // Fetch administrators
    const getBranchIdWithFallback = (currentBranch: any, branches: any[]) => {
        if (currentBranch?.id) return currentBranch.id;
        if (branches?.length > 0) return branches[0].id;
        return 1; // Fallback ID
    };

    const { data: administrators = [] } = useQuery<{ id: number, name: string }[]>({
        queryKey: ['administrators', getBranchIdWithFallback(null, branches)],
        queryFn: async () => {
            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/administrators?branchID=${getBranchIdWithFallback(null, branches)}`);
            return res.json();
        },
    });

    // Доступные способы оплаты
    const paymentMethods: PaymentMethod[] = [
        {
            value: "cash",
            label: t('calendar.payment_cash'),
            icon: "💰",
            description: t('calendar.payment_cash_desc')
        },
        {
            value: "mbank_transfer",
            label: t('calendar.payment_mbank_transfer'),
            icon: "🏦",
            description: t('calendar.payment_mbank_transfer_desc')
        },
        {
            value: "mbank_pos",
            label: t('calendar.payment_mbank_pos'),
            icon: "💳",
            description: t('calendar.payment_mbank_pos_desc')
        },
        {
            value: "mbusiness_transfer",
            label: t('calendar.payment_mbusiness_transfer'),
            icon: "🏢",
            description: t('calendar.payment_mbusiness_transfer_desc')
        },
        {
            value: "mbusiness_pos",
            label: t('calendar.payment_mbusiness_pos'),
            icon: "💳",
            description: t('calendar.payment_mbusiness_pos_desc')
        },
        {
            value: "О!Банк - Перевод",
            label: "О!Банк - Перевод",
            icon: "🔴",
            description: "Банковский перевод через О!Банк"
        },
        {
            value: "О!Банк - POS",
            label: "О!Банк - POS",
            icon: "💳",
            description: "POS терминал О!Банк"
        },
        {
            value: "Демир - Перевод",
            label: "Демир - Перевод",
            icon: "🏗️",
            description: "Банковский перевод через Демир Банк"
        },
        {
            value: "Демир - POS",
            label: "Демир - POS",
            icon: "💳",
            description: "POS терминал Демир Банк"
        },
        {
            value: "Bakai - Перевод",
            label: "Bakai - Перевод",
            icon: "🌊",
            description: "Банковский перевод через Bakai Банк"
        },
        {
            value: "Bakai - POS",
            label: "Bakai - POS",
            icon: "💳",
            description: "POS терминал Bakai Банк"
        },
        {
            value: "Оптима - Перевод",
            label: "Оптима - Перевод",
            icon: "⚡",
            description: "Банковский перевод через Оптима Банк"
        },
        {
            value: "Оптима - POS",
            label: "Оптима - POS",
            icon: "💳",
            description: "POS терминал Оптима Банк"
        },
        {
            value: "Подарочный Сертификат",
            label: "Подарочный Сертификат",
            icon: "🎁",
            description: "Оплата подарочным сертификатом"
        }
    ];

    // Convert services to legacy format
    const services = convertServicesToLegacyFormat(servicesData);

    const {
        control,
        handleSubmit,
        formState: { errors, isValid },
        watch,
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

    // Watch для отслеживания изменений в форме
    const watchedServiceType = watch('serviceType');
    const watchedDuration = watch('duration');

    // Функция для получения длительностей для выбранной услуги
    const getAvailableDurations = () => {
        if (!watchedServiceType) return [];
        
        const selectedService = servicesData.find(s => s.name === watchedServiceType);
        if (!selectedService) return [];
        
        return getServiceDurations(selectedService);
    };

    // Автоматическое заполнение стоимости при изменении длительности
    useEffect(() => {
        if (watchedDuration && watchedDuration.includes('сом')) {
            const priceMatch = watchedDuration.match(/(\d+)\s*сом$/);
            if (priceMatch) {
                const price = priceMatch[1];
                reset((formValues) => ({
                    ...formValues,
                    cost: price
                }));
            }
        }
    }, [watchedDuration, reset]);

    // Сбрасываем длительность при изменении типа услуги
    useEffect(() => {
        if (watchedServiceType) {
            // Если услуга изменилась, сбрасываем длительность
            const currentDuration = watch('duration');
            const availableDurations = getAvailableDurations();
            const isDurationValid = availableDurations.some(d => `${d.duration} мин - ${d.price} сом` === currentDuration);
            
            if (!isDurationValid && availableDurations.length > 0) {
                // Автоматически выбираем первую доступную длительность
                const firstDuration = availableDurations[0];
                const durationString = `${firstDuration.duration} мин - ${firstDuration.price} сом`;
                
                reset((formValues) => ({
                    ...formValues,
                    duration: durationString,
                    cost: firstDuration.price.toString()
                }));
            }
        }
    }, [watchedServiceType, watch, reset]);

    // Update form when task data is loaded
    useEffect(() => {
        if (taskData && !taskLoading && servicesData.length > 0) {
            console.log('🔄 Loading task data into form:', taskData);
            console.log('🔄 Available masters:', mastersData);
            console.log('🔄 Available branches:', branches);
            console.log('🔍 taskData.branchId:', taskData.branchId);
            
            const formData = formatTaskForForm(taskData);
            console.log('📝 Formatted form data:', formData);
            console.log('🔍 formData.branch after formatTaskForForm:', formData.branch);
            
            // Дополнительная проверка для критических полей
            if (!formData.branch) {
                if (taskData.branchId) {
                    formData.branch = taskData.branchId.toString();
                    console.log('🔧 Set branch from taskData.branchId:', formData.branch);
                } else if (branches?.length > 0) {
                    formData.branch = branches[0].id.toString();
                    console.log('🔧 Set default branch:', formData.branch);
                }
            } else {
                console.log('🔧 Branch already set:', formData.branch);
            }
            
            if (!formData.time && taskData.scheduleTime) {
                formData.time = taskData.scheduleTime;
                console.log('🔧 Set time from taskData:', formData.time);
            }
            
            if (!formData.master) {
                console.log('🔍 Looking for master...');
                // Попробуем найти мастера по ID из данных
                if (taskData.masterId && mastersData?.length > 0) {
                    const masterById = mastersData.find(m => m.id === taskData.masterId);
                    if (masterById) {
                        formData.master = masterById.name;
                        console.log('🔧 Found master by ID:', masterById);
                    }
                }
                // Если не нашли по ID, попробуем по имени
                else if (taskData.master?.name) {
                    formData.master = taskData.master.name;
                    console.log('🔧 Set master from taskData.master:', formData.master);
                }
                // Последняя попытка - по masterName
                else if (taskData.masterName) {
                    formData.master = taskData.masterName;
                    console.log('🔧 Set master from masterName:', formData.master);
                }
                
                if (!formData.master) {
                    console.log('❌ Could not find master!');
                }
            }

            // Специальная обработка для длительности и стоимости
            if (taskData.serviceType && servicesData.length > 0) {
                const selectedService = servicesData.find(s => s.name === taskData.serviceType);
                if (selectedService) {
                    console.log('🔧 Found service for task:', selectedService);
                    const availableDurations = getServiceDurations(selectedService);
                    
                    // Если у нас есть длительность и цена из бэкенда
                    if (taskData.serviceDuration && (taskData.servicePrice || taskData.finalPrice)) {
                        const targetDuration = taskData.serviceDuration;
                        const targetPrice = taskData.finalPrice || taskData.servicePrice;
                        
                        // Ищем точное совпадение в доступных длительностях
                        const matchingDuration = availableDurations.find(d => 
                            d.duration === targetDuration && d.price === targetPrice
                        );
                        
                        if (matchingDuration) {
                            formData.duration = `${matchingDuration.duration} мин - ${matchingDuration.price} сом`;
                            formData.cost = matchingDuration.price.toString();
                            console.log('🔧 Set duration and cost from exact match:', formData.duration, formData.cost);
                        } else {
                            // Если точного совпадения нет, используем первую доступную длительность
                            if (availableDurations.length > 0) {
                                const firstDuration = availableDurations[0];
                                formData.duration = `${firstDuration.duration} мин - ${firstDuration.price} сом`;
                                formData.cost = firstDuration.price.toString();
                                console.log('🔧 Set duration and cost from first available:', formData.duration, formData.cost);
                            } else {
                                // Создаем кастомную длительность если нет доступных вариантов
                                formData.duration = `${targetDuration} мин - ${targetPrice} сом`;
                                formData.cost = targetPrice.toString();
                                console.log('🔧 Set custom duration and cost:', formData.duration, formData.cost);
                            }
                        }
                    } else if (availableDurations.length > 0) {
                        // Если нет данных о длительности, используем первую доступную
                        const firstDuration = availableDurations[0];
                        formData.duration = `${firstDuration.duration} мин - ${firstDuration.price} сом`;
                        formData.cost = firstDuration.price.toString();
                        console.log('🔧 Set default duration and cost:', formData.duration, formData.cost);
                    }
                }
            }
            
            console.log('✅ Final form data with corrections:', formData);
            reset(formData);
            
            // Загружаем дополнительные услуги для задачи
            if (taskId) {
                loadAdditionalServices(taskId.toString());
            }
        }
    }, [taskData, taskLoading, reset, branches, taskId, mastersData, servicesData]);

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

    // Additional services functions
    const calculateTotalDuration = useCallback((baseDuration: number = 0) => {
        console.log('🔍 calculateTotalDuration called with baseDuration:', baseDuration);
        console.log('🔍 additionalServices:', additionalServices);
        
        const additionalDuration = additionalServices.reduce((sum, service) => {
            const duration = service.duration || 0;
            console.log('🔍 Service duration:', service.serviceName, duration);
            return sum + duration;
        }, 0);
        
        const total = baseDuration + additionalDuration;
        console.log('🔍 Total duration:', total, '(base:', baseDuration, '+ additional:', additionalDuration, ')');
        return total;
    }, [additionalServices]);

    const calculateTotalPrice = useCallback((basePrice: number = 0) => {
        console.log('🔍 calculateTotalPrice called with basePrice:', basePrice);
        console.log('🔍 watch cost:', watch('cost'));
        console.log('🔍 taskData:', taskData);
        console.log('🔍 additionalServices:', additionalServices);
        
        // Если basePrice не передан, используем цену из формы или данных задачи
        const mainPrice = basePrice || parseFloat(watch('cost')) || taskData?.finalPrice || taskData?.servicePrice || 0;
        console.log('🔍 Main price:', mainPrice);
        
        const additionalPrice = additionalServices.reduce((sum, service) => {
            const price = service.price || 0;
            console.log('🔍 Service price:', service.serviceName, price);
            return sum + price;
        }, 0);
        
        const total = mainPrice + additionalPrice;
        console.log('🔍 Total price:', total, '(main:', mainPrice, '+ additional:', additionalPrice, ')');
        return total;
    }, [additionalServices, watch, taskData]);

    const addAdditionalService = useCallback(async () => {
        if (!newAdditionalService.serviceId) return;
        
        const service = services?.find(s => s.id === parseInt(newAdditionalService.serviceId));
        if (service) {
            const newService: AdditionalService = {
                id: Date.now(),
                serviceId: service.id,
                serviceName: service.name,
                duration: newAdditionalService.duration || service.duration,
                price: service.price
            };
            
            // Добавляем в локальное состояние
            const updatedServices = [...additionalServices, newService];
            setAdditionalServices(updatedServices);
            
            // Если это редактирование существующей записи, обновляем через PATCH
            if (taskId) {
                try {
                    const updatePayload = {
                        additionalServices: updatedServices.map(s => ({
                            id: s.serviceId,
                            name: s.serviceName,
                            duration: s.duration,
                            price: s.price
                        }))
                    };

                    const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/assignments/${taskId}`, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(updatePayload),
                        credentials: 'include'
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        console.error('❌ Error updating additional services:', errorData);
                        toast({
                            title: "Ошибка",
                            description: "Не удалось добавить дополнительную услугу",
                            variant: "destructive",
                        });
                        // Откатываем изменения в локальном состоянии
                        setAdditionalServices(additionalServices);
                        return;
                    }
                    
                    console.log('✅ Additional service added');
                    toast({
                        title: "Услуга добавлена",
                        description: "Дополнительная услуга успешно добавлена",
                        variant: "default",
                    });
                } catch (error) {
                    console.error('❌ Error updating additional services:', error);
                    toast({
                        title: "Ошибка",
                        description: "Не удалось добавить дополнительную услугу",
                        variant: "destructive",
                    });
                    // Откатываем изменения в локальном состоянии
                    setAdditionalServices(additionalServices);
                    return;
                }
            }
            setNewAdditionalService({
                serviceId: '',
                serviceName: '',
                duration: 0,
                price: 0
            });
        }
    }, [services, newAdditionalService, taskId, toast, additionalServices]);

    const removeAdditionalService = useCallback(async (serviceId: number) => {
        // Удаляем из локального состояния
        const updatedServices = additionalServices.filter(service => service.id !== serviceId);
        setAdditionalServices(updatedServices);
        
        // Если это редактирование существующей записи, обновляем через PATCH
        if (taskId) {
            try {
                const updatePayload = {
                    additionalServices: updatedServices.map(s => ({
                        id: s.serviceId,
                        name: s.serviceName,
                        duration: s.duration,
                        price: s.price
                    }))
                };

                const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/assignments/${taskId}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(updatePayload),
                    credentials: 'include'
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    console.error('❌ Error updating additional services:', errorData);
                    toast({
                        title: "Ошибка",
                        description: "Не удалось удалить дополнительную услугу",
                        variant: "destructive",
                    });
                    // Откатываем изменения в локальном состоянии
                    setAdditionalServices(additionalServices);
                    return;
                }
                
                console.log('✅ Additional service removed');
                toast({
                    title: "Услуга удалена",
                    description: "Дополнительная услуга успешно удалена",
                    variant: "default",
                });
            } catch (error) {
                console.error('❌ Error updating additional services:', error);
                toast({
                    title: "Ошибка",
                    description: "Не удалось удалить дополнительную услугу",
                    variant: "destructive",
                });
                // Откатываем изменения в локальном состоянии
                setAdditionalServices(additionalServices);
                return;
            }
        }
    }, [taskId, toast, additionalServices]);

    // Функция для загрузки дополнительных услуг
    const loadAdditionalServices = useCallback(async (taskId: string) => {
        console.log('🔍 loadAdditionalServices called for assignment ID:', taskId);
        try {
            // Загружаем assignment с дополнительными услугами
            const assignmentResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/assignments/${taskId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include'
            });

            console.log('🔍 assignment response status:', assignmentResponse.status);

            if (assignmentResponse.ok) {
                const responseData = await assignmentResponse.json();
                console.log('🔍 assignment data from API:', responseData);
                
                // Проверяем структуру ответа { success: true, data: {...} }
                const assignmentData = responseData.success ? responseData.data : responseData;
                
                // Извлекаем additionalServices из assignment
                if (assignmentData.additionalServices && Array.isArray(assignmentData.additionalServices)) {
                    const formattedServices: AdditionalService[] = assignmentData.additionalServices.map((service: any, index: number) => ({
                        id: service.id || index, // используем index если id нет
                        serviceId: service.id || 0,
                        serviceName: service.name || t('calendar.additional_service_default'),
                        duration: service.duration || 0,
                        price: service.price || 0
                    }));
                    
                    console.log('🔍 formattedServices from assignment:', formattedServices);
                    setAdditionalServices(formattedServices);
                } else {
                    console.log('ℹ️ No additional services found in assignment:', taskId);
                    setAdditionalServices([]);
                }
            } else {
                console.log('ℹ️ Failed to load assignment:', taskId);
                setAdditionalServices([]);
            }
        } catch (error) {
            console.error('❌ Error loading additional services:', error);
            setAdditionalServices([]);
        }
    }, [t]);

    // Функция конвертации даты из формата dd.MM.yyyy в YYYY-MM-DD для API
    const convertDateFormat = (dateStr: string): string => {
        const [day, month, year] = dateStr.split('.');
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    };

    const onSubmit = async (data: FormData) => {
        console.log('📤 Form submitted! Data:', data);
        console.log('🔍 Task ID:', taskId);
        console.log('📋 Is editing:', !!taskId);
        
        // Если это редактирование существующей задачи, отправляем PUT запрос
        if (taskId) {
            console.log('📝 Updating existing task with ID:', taskId);
            
            try {
                // Вспомогательная функция для расчета времени окончания
                const calculateEndTime = (startTime: string, duration: number): string => {
                    const [hours, minutes] = startTime.split(':').map(Number);
                    const startMinutes = hours * 60 + minutes;
                    const endMinutes = startMinutes + duration;
                    const endHours = Math.floor(endMinutes / 60);
                    const endMins = endMinutes % 60;
                    return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
                };

                const serviceDuration = parseInt(data.duration.split(' ')[0]) || 60;
                const servicePrice = parseFloat(data.cost) || 0;
                const discount = parseFloat(data.discount) || 0;
                
                // Находим service по имени для получения ID
                const selectedService = servicesData.find(s => s.name === data.serviceType);
                const serviceId = selectedService?.id || 0;
                
                const updatePayload = {
                    assignmentDate: data.date && data.date.trim() ? convertDateFormat(data.date) : undefined,
                    startTime: data.time,
                    endTime: calculateEndTime(data.time, serviceDuration),
                    service: {
                        id: serviceId,
                        name: data.serviceType,
                        duration: serviceDuration,
                        price: servicePrice
                    },
                    notes: data.notes,
                    discount: discount,
                    status: data.status
                };

                console.log('🚀 Sending PATCH request to:', `${import.meta.env.VITE_BACKEND_URL}/assignments/${taskId}`);
                console.log('📦 Update payload:', updatePayload);

                const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/assignments/${taskId}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(updatePayload),
                    credentials: 'include'
                });

                console.log('📡 Response status:', response.status);

                if (!response.ok) {
                    const errorData = await response.json();
                    console.error('❌ Error response:', errorData);
                    throw new Error(errorData.message || 'Failed to update task');
                }

                const result = await response.json();
                console.log('✅ Task updated successfully:', result);
                
                // НЕ создаем автоматически дополнительные услуги при обычном редактировании
                // Дополнительные услуги управляются отдельно через специальные кнопки в интерфейсе
                
                // Показываем уведомление об успехе
                toast({
                    title: "Задача обновлена",
                    description: "Данные задачи успешно сохранены",
                    variant: "default",
                });
                
                // Обновляем данные в кэше
                queryClient.invalidateQueries({ queryKey: ['calendar-tasks'] });
                queryClient.invalidateQueries({ queryKey: ['assignments', taskId] });
                
                // Закрываем диалог после успешного обновления
                handleOpenChange(false);
                
            } catch (error) {
                console.error('❌ Error updating task:', error);
                toast({
                    title: "Ошибка при обновлении",
                    description: `Не удалось обновить задачу: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
                    variant: "destructive",
                });
            }
            
            return;
        }
        
        // Валидация обязательных полей для новой задачи
        if (!data.clientName.trim()) {
            alert(t('calendar.please_enter_client_name'));
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
        
        // Вспомогательные функции
        const calculateFinalPrice = (servicePrice: number, discount: number): number => {
            return Math.max(0, servicePrice - (servicePrice * discount / 100));
        };

        const calculateEndTime = (startTime: string, duration: number): string => {
            const [hours, minutes] = startTime.split(':').map(Number);
            const startMinutes = hours * 60 + minutes;
            const endMinutes = startMinutes + duration;
            const endHours = Math.floor(endMinutes / 60);
            const endMins = endMinutes % 60;
            return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
        };

        // Парсим данные формы для API
        const serviceDuration = parseInt(data.duration.split(' ')[0]); // Извлекаем числовое значение
        const servicePrice = parseFloat(data.cost) || 0;
        const discount = parseFloat(data.discount) || 0;
        
        const parsedData = {
            id: generatedTaskId,
            clientName: data.clientName,
            clientPhone: data.phone || undefined,
            notes: data.notes || undefined,
            scheduleDate: convertDateFormat(data.date), // Конвертируем в формат YYYY-MM-DD
            scheduleTime: data.time,
            serviceType: data.serviceType,
            masterId: parseInt(data.master),
            serviceDuration: serviceDuration,
            servicePrice: servicePrice,
            finalPrice: calculateFinalPrice(servicePrice, discount), // Обязательное поле
            discount: discount,
            endTime: calculateEndTime(data.time, serviceDuration), // Обязательное поле
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

    // Мутация для создания записи об оплате
    const createPaymentMutation = useMutation({
        mutationFn: async () => {
            if (!selectedPaymentMethod || !taskId) {
                throw new Error('Не выбран способ оплаты или задача');
            }

            if (!selectedAdministrator) {
                throw new Error('Не выбран администратор');
            }

            // Создаем основную запись об оплате
            const clientName = taskData?.client?.customName || taskData?.client?.firstName || taskData?.clientName || 'Неизвестный клиент';
            
            // Улучшенная логика получения имени мастера
            let masterName = 'Неизвестный мастер';
            
            // Пробуем разные источники данных о мастере
            if (taskData?.masterName && taskData.masterName.trim()) {
                masterName = taskData.masterName;
                console.log('✅ Master name from taskData.masterName:', masterName);
            } else if (taskData?.master?.name && taskData.master.name.trim()) {
                masterName = taskData.master.name;
                console.log('✅ Master name from taskData.master.name:', masterName);
            } else if (taskData?.masterId && mastersData?.length > 0) {
                const masterFromData = mastersData.find(m => m.id === taskData.masterId);
                if (masterFromData?.name) {
                    masterName = masterFromData.name;
                    console.log('✅ Master name from mastersData by ID:', masterName);
                }
            }
            
            console.log('📊 Payment data debug:');
            console.log('  taskData.masterName:', taskData?.masterName);
            console.log('  taskData.master?.name:', taskData?.master?.name);
            console.log('  taskData.masterId:', taskData?.masterId);
            console.log('  Available masters:', mastersData?.map(m => ({ id: m.id, name: m.name })));
            console.log('  Final masterName:', masterName);
            console.log('  taskData.clientName:', taskData?.clientName);
            console.log('  taskData.client?.customName:', taskData?.client?.customName);
            console.log('  taskData.client?.firstName:', taskData?.client?.firstName);
            console.log('  Final clientName:', clientName);
            
            const paymentData = {
                master: masterName,
                client: clientName,
                serviceType: taskData?.serviceType || t('calendar.service_label'),
                phoneNumber: taskData?.client?.phoneNumber || '',
                amount: calculateTotalPrice() - Math.round(calculateTotalPrice() * ((taskData?.discount || 0) / 100)),
                discount: taskData?.discount || 0,
                duration: taskData?.serviceDuration || 60,
                comment: `Оплата через ${selectedPaymentMethod}`,
                paymentMethod: selectedPaymentMethod,
                dailyReport: calculateTotalPrice() - Math.round(calculateTotalPrice() * ((taskData?.discount || 0) / 100)),
                adminName: selectedAdministrator,
                isGiftCertificateUsed: selectedPaymentMethod === 'Подарочный Сертификат',
                branchId: getBranchIdWithFallback(null, branches),
                date: taskData?.scheduleDate || new Date().toISOString().split('T')[0]
            };
            
            console.log('💰 Sending payment data:', paymentData);
            
            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/accounting`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(paymentData),
            });

            if (!res.ok) {
                throw new Error('Failed to create payment record');
            }

            // Обновляем способ оплаты, администратора и статус оплаты для задачи
            // Формируем полный payload на основе текущих данных задачи
            const servicePrice = taskData?.finalPrice || taskData?.servicePrice || 0;
            const discount = taskData?.discount || 0;
            const serviceDuration = taskData?.serviceDuration || 60;
            
            const calculateFinalPrice = (price: number, discountPercent: number): number => {
                return Math.max(0, price - (price * discountPercent / 100));
            };

            const calculateEndTime = (startTime: string, duration: number): string => {
                const [hours, minutes] = startTime.split(':').map(Number);
                const startMinutes = hours * 60 + minutes;
                const endMinutes = startMinutes + duration;
                const endHours = Math.floor(endMinutes / 60);
                const endMins = endMinutes % 60;
                return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
            };

            // Улучшенная логика получения имени клиента для updatePayload
            const paymentClientName = taskData?.client?.customName || 
                              taskData?.client?.firstName || 
                              taskData?.clientName || 
                              'Неизвестный клиент';

            console.log('📊 Client data debug:');
            console.log('  taskData.client?.customName:', taskData?.client?.customName);
            console.log('  taskData.client?.firstName:', taskData?.client?.firstName);
            console.log('  taskData.clientName:', taskData?.clientName);
            console.log('  Final paymentClientName:', paymentClientName);

            const updatePayload: any = {
                clientName: paymentClientName,
                phoneNumber: taskData?.client?.phoneNumber || '',
                serviceType: taskData?.serviceType || t('calendar.service_label'),
                masterName: masterName, // Используем то же имя мастера, что и в payment
                masterId: taskData?.masterId || null,
                notes: taskData?.notes || '',
                scheduleTime: taskData?.scheduleTime || '00:00',
                duration: serviceDuration,
                finalPrice: calculateFinalPrice(servicePrice, discount), // Обязательное поле
                discount: discount,
                branchId: taskData?.branchId || getBranchIdWithFallback(null, branches).toString(),
                status: 'completed', // ВСЕГДА устанавливаем статус на completed при оплате
                endTime: calculateEndTime(taskData?.scheduleTime || '00:00', serviceDuration), // Обязательное поле
                // Добавляем данные об оплате
                paymentMethod: selectedPaymentMethod,
                adminName: selectedAdministrator,
                paid: 'paid'
            };

            // scheduleDate только если есть валидная дата
            if (taskData?.scheduleDate && taskData.scheduleDate !== null) {
                updatePayload.scheduleDate = taskData.scheduleDate;
            }

            console.log('💳 Updating task with payment info:', updatePayload);

            const updateResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/tasks/${taskId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatePayload),
            });

            if (!updateResponse.ok) {
                const errorData = await updateResponse.json();
                console.error('❌ Failed to update task with payment info:', errorData);
                throw new Error('Failed to update task with payment information');
            }

            return res.json();
        },
        onSuccess: () => {
            toast({
                title: "Оплата зафиксирована",
                description: t('calendar.payment_success', { method: selectedPaymentMethod }),
                variant: "default",
            });

            setShowPaymentDialog(false);
            setSelectedPaymentMethod("");
            setSelectedAdministrator("");
            handleOpenChange(false); // Закрываем диалог редактирования после успешной оплаты
        },
        onError: (error: Error) => {
            toast({
                title: "Ошибка при записи оплаты",
                description: `${error}`,
                variant: "destructive",
            });
        }
    });

    const handlePayment = () => {
        if (!selectedPaymentMethod) {
            toast({
                title: "Выберите способ оплаты",
                description: "Необходимо выбрать способ оплаты",
                variant: "destructive",
            });
            return;
        }

        if (!selectedAdministrator) {
            toast({
                title: "Выберите администратора",
                description: "Необходимо выбрать администратора",
                variant: "destructive",
            });
            return;
        }

        createPaymentMutation.mutate();
    };

    return (
        <>
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
                            {t('calendar.not_paid')}
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
                            <h3 className="text-blue-600 font-medium">{t('edit_appointment.client')}</h3>

                            <div>
                                <Label className="text-sm text-gray-600">{t('edit_appointment.client_name')} *</Label>
                                <Controller
                                    name="clientName"
                                    control={control}
                                    rules={{
                                        required: t('calendar.client_name_required_validation'),
                                        minLength: {
                                            value: 2,
                                            message: t('task_dialog.name_min_length')
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
                                <Label className="text-sm text-gray-600">{t('edit_appointment.phone')} *</Label>
                                <Controller
                                    name="phone"
                                    control={control}
                                    rules={{
                                        required: t('task_dialog.phone_required'),
                                        validate: (value) => {
                                            const cleanPhone = value.replace(/\D/g, '');
                                            if (!cleanPhone.match(/^996\d{9}$/)) {
                                                return t('task_dialog.phone_format_error');
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
                                <Label className="text-sm text-gray-600">{t('calendar.notes')}</Label>
                                <Controller
                                    name="notes"
                                    control={control}
                                    render={({ field }) => (
                                        <Textarea
                                            {...field}
                                            className="mt-1 min-h-[60px] resize-none"
                                        />
                                    )}
                                />
                            </div>

                            <div>
                                <Label className="text-sm text-gray-600 mb-3 block">{t('calendar.status_label')}</Label>
                                <Controller
                                    name="status"
                                    control={control}
                                    rules={{ required: t('calendar.select_status_required') }}
                                    render={({ field }) => (
                                        <div className="grid grid-cols-2 gap-2">
                                            <Button
                                                type="button"
                                                variant={field.value === 'scheduled' ? 'default' : 'outline'}
                                                className={`h-14 flex flex-col items-center justify-center transition-all text-xs ${
                                                    field.value === 'scheduled' 
                                                        ? 'bg-blue-500 text-white border-blue-500' 
                                                        : 'hover:bg-blue-50 hover:border-blue-300'
                                                }`}
                                                onClick={() => field.onChange('scheduled')}
                                            >
                                                <Clock className="h-4 w-4 mb-1" />
                                                <span>{t('calendar.status_scheduled')}</span>
                                            </Button>
                                            
                                            <Button
                                                type="button"
                                                variant={field.value === 'in_progress' ? 'default' : 'outline'}
                                                className={`h-14 flex flex-col items-center justify-center transition-all text-xs ${
                                                    field.value === 'in_progress' 
                                                        ? 'bg-orange-500 text-white border-orange-500' 
                                                        : 'hover:bg-orange-50 hover:border-orange-300'
                                                }`}
                                                onClick={() => field.onChange('in_progress')}
                                            >
                                                <Scissors className="h-4 w-4 mb-1" />
                                                <span>{t('calendar.status_in_progress')}</span>
                                            </Button>
                                            
                                            <Button
                                                type="button"
                                                variant={field.value === 'completed' ? 'default' : 'outline'}
                                                className={`h-14 flex flex-col items-center justify-center transition-all text-xs ${
                                                    field.value === 'completed' 
                                                        ? 'bg-green-500 text-white border-green-500' 
                                                        : 'hover:bg-green-50 hover:border-green-300'
                                                }`}
                                                onClick={() => field.onChange('completed')}
                                            >
                                                <CheckCircle className="h-4 w-4 mb-1" />
                                                <span>{t('calendar.status_completed')}</span>
                                            </Button>
                                            
                                            <Button
                                                type="button"
                                                variant={field.value === 'cancelled' ? 'default' : 'outline'}
                                                className={`h-14 flex flex-col items-center justify-center transition-all text-xs ${
                                                    field.value === 'cancelled' 
                                                        ? 'bg-red-500 text-white border-red-500' 
                                                        : 'hover:bg-red-50 hover:border-red-300'
                                                }`}
                                                onClick={() => field.onChange('cancelled')}
                                            >
                                                <X className="h-4 w-4 mb-1" />
                                                <span>{t('calendar.status_cancelled')}</span>
                                            </Button>
                                        </div>
                                    )}
                                />
                                {errors.status && (
                                    <p className="text-red-500 text-xs mt-1">{errors.status.message}</p>
                                )}
                            </div>
                        </div>

                        {/* Правая колонка - Запись */}
                        <div className="space-y-4">
                            <h3 className="text-blue-600 font-medium">{t('task_dialog.appointment')}</h3>

                            <div>
                                <Label className="text-sm text-gray-600">{t('task_dialog.time')}</Label>
                                <Controller
                                    name="time"
                                    control={control}
                                    rules={{
                                        required: t('calendar.time_required')
                                    }}
                                    render={({ field }) => (
                                        <Select
                                            value={field.value}
                                            onValueChange={field.onChange}
                                        >
                                            <SelectTrigger className={`mt-1 ${errors.time ? 'border-red-500' : ''}`}>
                                                <div className="flex items-center gap-2">
                                                    <Clock className="w-4 h-4 text-gray-400" />
                                                    <SelectValue placeholder={t('task_dialog.select_time')} />
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
                                    rules={{ required: "Выберите или введите длительность" }}
                                    render={({ field }) => {
                                        const availableDurations = getAvailableDurations();
                                        const [isCustomMode, setIsCustomMode] = useState(false);
                                        const [customDuration, setCustomDuration] = useState('');
                                        const [customPrice, setCustomPrice] = useState('');

                                        // Проверяем, является ли текущее значение кастомным
                                        const isCurrentValueCustom = field.value && !availableDurations.some(d => 
                                            `${d.duration} мин - ${d.price} сом` === field.value
                                        );

                                        return (
                                            <div className="space-y-2">
                                                {!isCustomMode && !isCurrentValueCustom ? (
                                                    // Обычный Select
                                                    <div className="space-y-2">
                                                        <Select
                                                            value={field.value}
                                                            onValueChange={(value) => {
                                                                if (value === 'custom') {
                                                                    setIsCustomMode(true);
                                                                    setCustomDuration('');
                                                                    setCustomPrice('');
                                                                } else {
                                                                    field.onChange(value);
                                                                    // Автоматически обновляем стоимость при выборе длительности
                                                                    if (value && value.includes('сом')) {
                                                                        const priceMatch = value.match(/(\d+)\s*сом$/);
                                                                        if (priceMatch) {
                                                                            const price = priceMatch[1];
                                                                            reset((formValues) => ({
                                                                                ...formValues,
                                                                                duration: value,
                                                                                cost: price
                                                                            }));
                                                                        }
                                                                    }
                                                                }
                                                            }}
                                                            disabled={!watchedServiceType}
                                                        >
                                                            <SelectTrigger className={`mt-1 ${errors.duration ? 'border-red-500' : ''}`}>
                                                                <SelectValue placeholder={
                                                                    !watchedServiceType 
                                                                        ? "Сначала выберите услугу" 
                                                                        : "Выберите длительность"
                                                                } />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {availableDurations.map(({ duration, price }) => (
                                                                    <SelectItem key={`${duration}-${price}`} value={`${duration} мин - ${price} сом`}>
                                                                        {duration} мин - {price} сом
                                                                    </SelectItem>
                                                                ))}
                                                                <SelectItem value="custom">
                                                                    ✏️ Произвольная длительность
                                                                </SelectItem>
                                                                {/* Fallback options */}
                                                                {!watchedServiceType && (
                                                                    <SelectItem value="" disabled>
                                                                        Выберите услугу для отображения длительностей
                                                                    </SelectItem>
                                                                )}
                                                                {watchedServiceType && availableDurations.length === 0 && (
                                                                    <SelectItem value="" disabled>
                                                                        Нет доступных длительностей для этой услуги
                                                                    </SelectItem>
                                                                )}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                ) : (
                                                    // Кастомный ввод
                                                    <div className="space-y-2">
                                                        <div className="flex gap-2">
                                                            <div className="flex-1">
                                                                <Input
                                                                    type="number"
                                                                    placeholder={t('calendar.minutes_placeholder')}
                                                                    value={isCurrentValueCustom ? field.value.match(/(\d+)\s*мин/)?.[1] || '' : customDuration}
                                                                    onChange={(e) => {
                                                                        const minutes = e.target.value;
                                                                        setCustomDuration(minutes);
                                                                        if (minutes && customPrice) {
                                                                            const newValue = `${minutes} мин - ${customPrice} сом`;
                                                                            field.onChange(newValue);
                                                                            reset((formValues) => ({
                                                                                ...formValues,
                                                                                duration: newValue,
                                                                                cost: customPrice
                                                                            }));
                                                                        }
                                                                    }}
                                                                    className={`${errors.duration ? 'border-red-500' : ''}`}
                                                                />
                                                            </div>
                                                            <div className="flex-1">
                                                                <Input
                                                                    type="number"
                                                                    placeholder={t('calendar.price_placeholder')}
                                                                    value={isCurrentValueCustom ? field.value.match(/(\d+)\s*сом/)?.[1] || '' : customPrice}
                                                                    onChange={(e) => {
                                                                        const price = e.target.value;
                                                                        setCustomPrice(price);
                                                                        if (customDuration && price) {
                                                                            const newValue = `${customDuration} мин - ${price} сом`;
                                                                            field.onChange(newValue);
                                                                            reset((formValues) => ({
                                                                                ...formValues,
                                                                                duration: newValue,
                                                                                cost: price
                                                                            }));
                                                                        }
                                                                    }}
                                                                    className={`${errors.duration ? 'border-red-500' : ''}`}
                                                                />
                                                            </div>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setIsCustomMode(false);
                                                                    field.onChange('');
                                                                    setCustomDuration('');
                                                                    setCustomPrice('');
                                                                }}
                                                                className="px-2"
                                                            >
                                                                ↩️
                                                            </Button>
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            Введите длительность в минутах и цену
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }}
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
                                                    <SelectItem key={branch.id} value={branch.id.toString()}>
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

                    {/* Секция дополнительных услуг */}
                    <div className="border-t pt-4 mt-4">
                        <h3 className="text-sm font-medium text-gray-700 mb-3">Дополнительные услуги</h3>
                        
                        {/* Список дополнительных услуг */}
                        {additionalServices.length > 0 && (
                            <div className="space-y-2 mb-4">
                                {additionalServices.map((additionalService) => (
                                    <div key={additionalService.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                                        <div className="flex-1">
                                            <span className="text-sm font-medium">{additionalService.serviceName || t('calendar.additional_service_default')}</span>
                                            <div className="text-xs text-gray-500">
                                                {parseFloat(String(additionalService.duration)) || 0} мин • {parseFloat(String(additionalService.price)) || 0} сом
                                            </div>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeAdditionalService(additionalService.id)}
                                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Форма добавления дополнительной услуги */}
                        <div className="grid grid-cols-4 gap-2">
                            <div className="col-span-2">
                                <Select
                                    value={newAdditionalService.serviceId}
                                    onValueChange={(value) =>
                                        setNewAdditionalService({
                                            ...newAdditionalService,
                                            serviceId: value,
                                            serviceName: services?.find(s => s.id === parseInt(value))?.name || '',
                                            duration: services?.find(s => s.id === parseInt(value))?.duration || 0,
                                            price: services?.find(s => s.id === parseInt(value))?.price || 0
                                        })
                                    }
                                >
                                    <SelectTrigger className="text-xs">
                                        <SelectValue placeholder={t('calendar.select_service_placeholder')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {services?.map((service) => (
                                            <SelectItem key={service.id} value={service.id.toString()}>
                                                {service.name} ({service.duration} мин, {service.price} сом)
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Input
                                    type="number"
                                    placeholder={t('calendar.duration_placeholder')}
                                    value={newAdditionalService.duration}
                                    onChange={(e) =>
                                        setNewAdditionalService({
                                            ...newAdditionalService,
                                            duration: parseInt(e.target.value) || 0
                                        })
                                    }
                                    className="text-xs"
                                />
                            </div>
                            <div>
                                <Button
                                    type="button"
                                    onClick={addAdditionalService}
                                    disabled={!newAdditionalService.serviceId}
                                    size="sm"
                                    className="w-full text-xs"
                                >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Добавить
                                </Button>
                            </div>
                        </div>

                        {/* Итоговая информация */}
                        {additionalServices.length > 0 && (
                            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                                {/* Список дополнительных услуг */}
                                <div className="mb-3">
                                    <div className="text-sm font-medium text-gray-700 mb-2">Дополнительные услуги:</div>
                                    <div className="space-y-1">
                                        {additionalServices.map((service) => (
                                            <div key={service.id} className="flex justify-between text-xs text-gray-600 pl-2">
                                                <span>• {service.serviceName || t('calendar.additional_service_default')}</span>
                                                <span>{parseFloat(String(service.duration)) || 0} мин</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                
                                {/* Итоговые суммы */}
                                <div className="text-sm text-gray-600 space-y-1 border-t pt-2">
                                    <div className="flex justify-between">
                                        <span>{t('calendar.main_service_label')}</span>
                                        <span>{parseInt(watch('cost')) || 0} сом</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Дополнительные услуги:</span>
                                        <span>{additionalServices.reduce((sum, service) => sum + (parseFloat(String(service.price)) || 0), 0)} сом</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>{t('calendar.total_time_label_short')}</span>
                                        <span>{(parseInt(watch('duration')) || 0) + additionalServices.reduce((sum, service) => sum + (parseFloat(String(service.duration)) || 0), 0)} мин</span>
                                    </div>
                                    <div className="flex justify-between font-medium border-t pt-1">
                                        <span>Итого:</span>
                                        <span>{(parseInt(watch('cost')) || 0) + additionalServices.reduce((sum, service) => sum + (parseFloat(String(service.price)) || 0), 0)} сом</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleOpenChange(false)}
                        >
                            Отмена
                        </Button>
                        
                        {/* Кнопка оплаты - показываем только при редактировании существующей задачи */}
                        {taskId && taskData && (
                            <Button
                                type="button"
                                onClick={() => setShowPaymentDialog(true)}
                                className="bg-amber-500 hover:bg-amber-600 text-white"
                            >
                                <CreditCard className="h-4 w-4 mr-2" />
                                Оплатить
                            </Button>
                        )}
                        
                        <Button
                            type="submit"
                            disabled={!taskId ? (!isValid || createTaskMutation.isPending) : false}
                            className={(!taskId ? (!isValid || createTaskMutation.isPending) : false) ? 'opacity-50 cursor-not-allowed' : ''}
                        >
                            {!taskId && createTaskMutation.isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Создание...
                                </>
                            ) : (
                                taskId ? t('calendar.save') : t('calendar.create_task')
                            )}
                        </Button>
                    </div>
                    </form>
                )}
            </DialogContent>
        </Dialog>

        {/* Диалог оплаты */}
        {taskId && taskData && (
            <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-amber-600" />
                            {t('calendar.payment_services_title')}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex gap-6">
                        {/* Левая колонка - способы оплаты */}
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold mb-4">Выберите способ оплаты</h3>
                            <div className="space-y-2">
                                {paymentMethods.map((method) => (
                                    <div
                                        key={method.value}
                                        onClick={() => setSelectedPaymentMethod(method.value)}
                                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${selectedPaymentMethod === method.value
                                            ? 'border-amber-400 bg-amber-50'
                                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="text-2xl">
                                                <PaymentMethodIcon paymentMethod={method.value} className="w-8 h-8" />
                                            </div>
                                            <div>
                                                <div className="font-medium">{method.label}</div>
                                                <div className="text-sm text-gray-600">{method.description}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Правая колонка - детали оплаты */}
                        <div className="w-64 bg-gray-50 rounded-lg p-4">
                            <h3 className="font-semibold text-lg mb-4">Детали оплаты</h3>

                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-sm">{t('calendar.service_title')}</span>
                                    <span className="text-sm font-medium">{taskData.serviceType}</span>
                                </div>

                                <div className="flex justify-between">
                                    <span className="text-sm">Мастер:</span>
                                    <span className="text-sm font-medium">{taskData.masterName}</span>
                                </div>

                                <div className="flex justify-between">
                                    <span className="text-sm">Клиент:</span>
                                    <span className="text-sm font-medium">{taskData.clientName}</span>
                                </div>

                                <hr className="my-3" />

                                <div className="flex justify-between">
                                    <span className="text-sm">Сумма услуг:</span>
                                    <span className="text-sm">{calculateTotalPrice()} сом</span>
                                </div>

                                {taskData.discount && taskData.discount > 0 && (
                                    <div className="flex justify-between text-green-600">
                                        <span className="text-sm">Скидка {taskData.discount}%:</span>
                                        <span className="text-sm">-{Math.round(calculateTotalPrice() * taskData.discount / 100)} сом</span>
                                    </div>
                                )}

                                <hr className="my-3" />

                                <div className="flex justify-between font-bold text-lg">
                                    <span>К оплате:</span>
                                    <span className="text-amber-600">
                                        {calculateTotalPrice() - Math.round(calculateTotalPrice() * (taskData.discount || 0) / 100)} сом
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Выбор администратора */}
                    <div className="mt-4 border-t pt-4">
                        <Label className="text-sm font-semibold mb-2 block">Администратор</Label>
                        <Select value={selectedAdministrator} onValueChange={setSelectedAdministrator}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder={t('calendar.select_administrator')} />
                            </SelectTrigger>
                            <SelectContent>
                                {administrators.map((admin: { id: number; name: string }) => (
                                    <SelectItem key={admin.id} value={admin.name}>
                                        {admin.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <DialogFooter className="flex justify-between mt-4">
                        <Button
                            variant="outline"
                            onClick={() => setShowPaymentDialog(false)}
                        >
                            Отмена
                        </Button>
                        <Button
                            onClick={handlePayment}
                            disabled={!selectedPaymentMethod || !selectedAdministrator || createPaymentMutation.isPending}
                            className="bg-amber-500 hover:bg-amber-600 text-white"
                        >
                            {createPaymentMutation.isPending && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Зафиксировать оплату
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        )}
        </>
    );
};

export default TaskDialogBtn;