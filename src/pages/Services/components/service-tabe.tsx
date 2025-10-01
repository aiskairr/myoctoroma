import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [viewDialogOpen, setViewDialogOpen] = useState(false);
    const [serviceToDelete, setServiceToDelete] = useState<number | null>(null);
    const [serviceToView, setServiceToView] = useState<any | null>(null);

    const branchOptions = [
        ...branches.map(branch => ({ id: branch.id.toString(), name: branch.branches }))
    ];

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

    React.useEffect(() => {
        if (services.length > 0) {
            const initialState: Record<number, any> = {};
            services.forEach((service) => {
                initialState[service.id] = { ...service };
            });
            setEditingServices(initialState);
        }
    }, [services]);

    const updateMutation = useMutation({
        mutationFn: async (service: any) => {
            const response = await apiPut(`/api/crm/services/${service.id}`, {
                name: service.name,
                description: service.description,
                isActive: service.isActive,
                branchID: service.branchID,
                branchId: service.branchID,
                defaultDuration: service.defaultDuration,
                duration10_price: service.duration10_price ?? 0,
                duration15_price: service.duration15_price ?? 0,
                duration20_price: service.duration20_price ?? 0,
                duration30_price: service.duration30_price ?? 0,
                duration40_price: service.duration40_price ?? 0,
                duration50_price: service.duration50_price ?? 0,
                duration60_price: service.duration60_price ?? 0,
                duration75_price: service.duration75_price ?? 0,
                duration80_price: service.duration80_price ?? 0,
                duration90_price: service.duration90_price ?? 0,
                duration110_price: service.duration110_price ?? 0,
                duration120_price: service.duration120_price ?? 0,
                duration150_price: service.duration150_price ?? 0,
                duration220_price: service.duration220_price ?? 0,
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
        setServiceToDelete(serviceId);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (serviceToDelete !== null) {
            deleteMutation.mutate(serviceToDelete);
            setDeleteDialogOpen(false);
            setServiceToDelete(null);
        }
    };

    const handleViewService = (service: any) => {
        setServiceToView(service);
        setViewDialogOpen(true);
    };

    const getBranchName = (branchID: string | null) => {
        const branch = branchOptions.find((b) => b.id === branchID);
        return branch ? branch.name : 'Не указан';
    };

    if (isLoading) {
        return <div className="text-center py-8">Загрузка услуг...</div>;
    }

    if (error) {
        return <div className="text-center py-8 text-red-500">Ошибка загрузки: {(error as Error).message}</div>;
    }

    return (
        <>
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
                                                value={editingService.branchID || ''}
                                                onValueChange={(value) => handleInputChange(service.id, 'branchID', value)}
                                            >
                                                <SelectTrigger className="border-0 shadow-none p-2 text-base bg-transparent focus:ring-1 focus:ring-blue-500 min-w-[150px]">
                                                    <SelectValue placeholder="Выберите филиал" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {branchOptions.map((branch) => (
                                                        <SelectItem key={branch.id} value={branch.id}>
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
                                                    <Check className="h-4 w-4" color='#000' />
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
                                                    <Eye className="h-4 w-4" color='#000' />
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

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Удалить услугу?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Вы уверены, что хотите удалить эту услугу? Это действие нельзя будет отменить.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
                            Удалить
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Информация об услуге</DialogTitle>
                    </DialogHeader>
                    {serviceToView && (
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Название</p>
                                <p className="text-base font-semibold">{serviceToView.name}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Описание</p>
                                <p className="text-base">{serviceToView.description || 'Описание отсутствует'}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Филиал</p>
                                <p className="text-base">{getBranchName(serviceToView.branchID)}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Стандартная длительность</p>
                                <p className="text-base">{serviceToView.defaultDuration} минут</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Статус</p>
                                <p className="text-base">{serviceToView.isActive ? 'Активна' : 'Неактивна'}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500 mb-2">Цены по длительности</p>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    {TIME_COLUMNS.map((time) => {
                                        const price = serviceToView[`duration${time}_price`];
                                        if (price && price > 0) {
                                            return (
                                                <div key={time} className="flex justify-between border-b pb-1">
                                                    <span>{time} минут:</span>
                                                    <span className="font-medium">{price} ₸</span>
                                                </div>
                                            );
                                        }
                                        return null;
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
};

export default ServicesTable;