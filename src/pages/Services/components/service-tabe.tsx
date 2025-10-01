import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Check, Trash2, Eye, Pen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiGet, apiPut, apiDelete } from '@/lib/api';
import { useBranch } from '@/contexts/BranchContext';

const TIME_COLUMNS = [10, 15, 20, 30, 40, 50, 60, 75, 80, 90, 110, 120, 150, 220] as const;
type TimeColumn = (typeof TIME_COLUMNS)[number];

const ServicesTable: React.FC = () => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { branches } = useBranch();
    const [editingServices, setEditingServices] = useState<Record<number, any>>({});
    const [editingCell, setEditingCell] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<string>('');

    // Создаем список филиалов с опцией "Все филиалы"
    const branchOptions = [
        { id: null, name: "Все филиалы" },
        ...branches.map(branch => ({ id: branch.id.toString(), name: branch.branches }))
    ];

    // Fetch services using our custom API function
    const { data: services = [], isLoading, error } = useQuery<any[]>({
        queryKey: ['crm-services'],
        queryFn: async () => {
            const response = await apiGet('/api/crm/services');
            if (!response.ok) {
                throw new Error('Failed to fetch services');
            }
            return response.json();
        }
    });

    // Initialize editing state
    React.useEffect(() => {
        if (services.length > 0) {
            const initialState: Record<number, any> = {};
            services.forEach((service) => {
                initialState[service.id] = { ...service };
            });
            setEditingServices(initialState);
        }
    }, [services]);

    // Update service mutation
    const updateMutation = useMutation({
        mutationFn: async (service: any) => {
            const response = await apiPut(`/api/crm/services/${service.id}`, {
                name: service.name,
                description: service.description,
                isActive: service.isActive,
                instanceId: service.instanceId,
                duration: service.duration
            });
            
            if (!response.ok) {
                throw new Error('Failed to update service');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['crm-services'] });
            toast({ title: 'Услуга обновлена успешно' });
        },
        onError: (error: Error) => {
            toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
        },
    });

    // Delete service mutation
    const deleteMutation = useMutation({
        mutationFn: async (serviceId: number) => {
            const response = await apiDelete(`/api/crm/services/${serviceId}`);
            if (!response.ok) throw new Error('Ошибка удаления услуги');
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['crm-services'] });
            toast({ title: 'Услуга удалена успешно' });
        },
        onError: (error: Error) => {
            toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
        },
    });

    const handleInputChange = (serviceId: number, field: any, value: string | number | boolean | null) => {
        setEditingServices((prev) => ({
            ...prev,
            [serviceId]: {
                ...prev[serviceId],
                [field]: field.includes('price') ? (value === '' ? null : Number(value)) : value,
            },
        }));
    };

    const handleCellClick = (serviceId: number, timeColumn: TimeColumn) => {
        const service = editingServices[serviceId] || services.find((s) => s.id === serviceId);
        if (!service) return;
        const price = service[`duration${timeColumn}_price` as keyof any] || 0;
        setEditingCell(`${serviceId}-${timeColumn}`);
        setEditValue(price.toString());
    };

    const handleCellSave = (serviceId: number, timeColumn: TimeColumn) => {
        const newPrice = parseInt(editValue) || null;
        handleInputChange(serviceId, `duration${timeColumn}_price` as keyof any, newPrice);
        setEditingCell(null);
        setEditValue('');
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>, serviceId: number, timeColumn: TimeColumn) => {
        if (e.key === 'Enter') {
            handleCellSave(serviceId, timeColumn);
        } else if (e.key === 'Escape') {
            setEditingCell(null);
            setEditValue('');
        }
    };

    const handleSaveService = (serviceId: number) => {
        const service = editingServices[serviceId];
        if (service) {
            updateMutation.mutate(service);
        }
    };

    const handleDeleteService = (serviceId: number) => {
        if (window.confirm('Вы уверены, что хотите удалить эту услугу?')) {
            deleteMutation.mutate(serviceId);
        }
    };

    const handleViewService = (service: any) => {
        toast({
            title: 'Информация об услуге',
            description: `${service.name}: ${service.description || 'Описание отсутствует'}`,
        });
    };

    const getBranchName = (instanceId: string | null) => {
        const branch = branchOptions.find((b) => b.id === instanceId);
        return branch ? branch.name : 'Все филиалы';
    };

    if (isLoading) {
        return <div className="text-center py-8">Загрузка услуг...</div>;
    }

    if (error) {
        return <div className="text-center py-8 text-red-500">Ошибка загрузки: {(error as Error).message}</div>;
    }

    return (
        <Card className="w-full p-4">
            <div className="overflow-x-auto">
                <table className="w-full border-collapse rounded-xl">
                    <thead>
                        <tr className="bg-gray-50">
                            <th className="min-w-[180px] border border-gray-300 px-4 py-3 text-left text-base font-semibold">Название услуги</th>
                            <th className="min-w-[140px] border border-gray-300 px-4 py-3 text-left text-base font-semibold">Описание</th>
                            <th className="min-w-[120px] border border-gray-300 px-4 py-3 text-left text-base font-semibold">Филиал</th>
                            <th className="min-w-[140px] border border-gray-300 px-4 py-3 text-left text-base font-semibold">Длительность</th>
                            <th className="min-w-[100px] text-center border border-gray-300 px-4 py-3 text-base font-semibold">Активна</th>
                            {TIME_COLUMNS.map((time) => (
                                <th key={time} className="min-w-[90px] text-center border border-gray-300 px-4 py-3 text-base font-semibold">
                                    {time} мин
                                </th>
                            ))}
                            <th className="min-w-[140px] text-center border border-gray-300 px-4 py-3 text-base font-semibold">Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        {services.map((service, index) => {
                            const editingService = editingServices[service.id] || service;
                            return (
                                <tr key={service.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                    <td className="border border-gray-300 px-4 py-3">
                                        <Input
                                            value={editingService.name}
                                            onChange={(e) => handleInputChange(service.id, 'name', e.target.value)}
                                            className="border-0 shadow-none p-2 text-base font-medium bg-transparent focus-visible:ring-1 focus-visible:ring-blue-500 min-w-[250px]"
                                        />
                                    </td>
                                    <td className="border border-gray-300 px-4 py-3">
                                        <Input
                                            value={editingService.description || ''}
                                            onChange={(e) => handleInputChange(service.id, 'description', e.target.value)}
                                            placeholder="Описание"
                                            className="border-0 shadow-none p-2 text-base bg-transparent min-w-[150px] focus-visible:ring-1 focus-visible:ring-blue-500"
                                        />
                                    </td>
                                    <td className="border border-gray-300 px-4 py-3">
                                        <Select
                                            value={editingService.instanceId || 'null'}
                                            onValueChange={(value) => handleInputChange(service.id, 'instanceId', value === 'null' ? null : value)}
                                        >
                                            <SelectTrigger className="border-0 shadow-none p-2 text-base bg-transparent focus:ring-1 focus:ring-blue-500 min-w-[150px]">
                                                <SelectValue placeholder="Выберите филиал" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {branchOptions.map((branch) => (
                                                    <SelectItem key={branch.id || 'null'} value={branch.id || 'null'}>
                                                        {branch.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </td>
                                    <td className="border border-gray-300 px-4 py-3">
                                        <Select
                                            value={editingService.defaultDuration.toString()}
                                            onValueChange={(value) => handleInputChange(service.id, 'defaultDuration', parseInt(value))}
                                        >
                                            <SelectTrigger className="border-0 shadow-none p-2 text-base bg-transparent focus:ring-1 focus:ring-blue-500">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {TIME_COLUMNS.map((time) => (
                                                    <SelectItem key={time} value={time.toString()}>
                                                        {time} мин
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </td>
                                    <td className="text-center border border-gray-300 px-4 py-3">
                                        <Switch
                                            checked={editingService.isActive}
                                            onCheckedChange={(checked) => handleInputChange(service.id, 'isActive', checked)}
                                        />
                                    </td>
                                    {TIME_COLUMNS.map((time) => {
                                        const cellKey = `${service.id}-${time}`;
                                        const isEditing = editingCell === cellKey;
                                        const price = editingService[`duration${time}_price` as keyof any] || 0;

                                        return (
                                            <td key={time} className="text-center border border-gray-300 px-4 py-3">
                                                {isEditing ? (
                                                    <Input
                                                        value={editValue}
                                                        onChange={(e) => setEditValue(e.target.value)}
                                                        onBlur={() => handleCellSave(service.id, time)}
                                                        onKeyDown={(e) => handleKeyPress(e, service.id, time)}
                                                        className="w-full text-center text-base font-medium border border-blue-500 focus:ring-2 focus:ring-blue-500 min-w-[80px]"
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <div
                                                        onClick={() => handleCellClick(service.id, time)}
                                                        className="cursor-pointer hover:bg-blue-100 rounded p-3 min-h-[40px] flex items-center justify-center transition-colors text-base font-medium"
                                                    >
                                                        {price > 0 ? `${price}` : <Pen width={15} height={15} strokeWidth={1} />}
                                                    </div>
                                                )}
                                            </td>
                                        );
                                    })}
                                    <td className="border border-gray-300 px-4 py-3">
                                        <div className="flex gap-2 justify-center">
                                            <Button
                                                onClick={() => handleSaveService(service.id)}
                                                disabled={updateMutation.isPending}
                                                className="inline-flex items-center justify-center h-9 w-9 p-0 border border-gray-300 bg-white hover:bg-gray-50 rounded-md transition-colors"
                                            >
                                                <Check className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                onClick={() => handleDeleteService(service.id)}
                                                disabled={deleteMutation.isPending}
                                                className="inline-flex items-center justify-center h-9 w-9 p-0 border border-gray-300 bg-white text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                onClick={() => handleViewService(editingService)}
                                                className="inline-flex items-center justify-center h-9 w-9 p-0 border border-gray-300 bg-white hover:bg-gray-50 rounded-md transition-colors"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            {services.length === 0 && <div className="text-center py-8 text-gray-500">Услуги не найдены. Добавьте новую услугу.</div>}
        </Card>
    );
};

export default ServicesTable;