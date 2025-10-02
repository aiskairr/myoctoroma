import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useBranch } from '@/contexts/BranchContext';

interface ServiceFormData {
    name: string;
    description: string;
    instanceId: string;
    defaultDuration: string;
    isActive: boolean;
}

const DURATIONS = [
    { value: '10', label: '10 минут' },
    { value: '15', label: '15 минут' },
    { value: '20', label: '20 минут' },
    { value: '30', label: '30 минут' },
    { value: '40', label: '40 минут' },
    { value: '50', label: '50 минут' },
    { value: '60', label: '60 минут' },
    { value: '75', label: '75 минут' },
    { value: '80', label: '80 минут' },
    { value: '90', label: '90 минут' },
    { value: '110', label: '110 минут' },
    { value: '120', label: '120 минут' },
    { value: '150', label: '150 минут' },
    { value: '220', label: '220 минут' },
];

const CreateServiceBtn = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { branches, currentBranch } = useBranch();
    const branchID = currentBranch?.id;
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
        setValue,
        watch,
    } = useForm<ServiceFormData>({
        defaultValues: {
            name: '',
            description: '',
            instanceId: branches.length > 0 ? branches[0].id.toString() : '',
            defaultDuration: '60',
            isActive: true,
        },
    });

    const watchedInstanceId = watch('instanceId');
    const watchedDefaultDuration = watch('defaultDuration');
    const watchedIsActive = watch('isActive');

    useEffect(() => {
        if (isOpen && branches.length > 0) {
            setValue('instanceId', branches[0].id.toString());
        }
    }, [isOpen, branches, setValue]);

    const createMutation = useMutation({
        mutationFn: async (service: Omit<any, 'id' | 'createdAt'>) => {
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/crm/services`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: service.name,
                    description: service.description,
                    isActive: service.isActive,
                    branchID: service.instanceId,
                    defaultDuration: service.defaultDuration,
                    duration10_price: 0,
                    duration15_price: 0,
                    duration20_price: 0,
                    duration30_price: 0,
                    duration40_price: 0,
                    duration50_price: 0,
                    duration60_price: 0,
                    duration75_price: 0,
                    duration80_price: 0,
                    duration90_price: 0,
                    duration110_price: 0,
                    duration120_price: 0,
                    duration150_price: 0,
                    duration220_price: 0,
                }),
            });
            if (!response.ok) throw new Error('Ошибка создания услуги');
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['crm-services'] });
            toast({ title: 'Услуга создана успешно' });
            setIsOpen(false);
            reset();
        },
        onError: (error: Error) => {
            toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
        },
    });

    const onSubmit = (data: ServiceFormData) => {
        if (!data.name.trim()) {
            toast({
                title: 'Ошибка',
                description: 'Название услуги обязательно для заполнения',
                variant: 'destructive',
            });
            return;
        }

        createMutation.mutate({
            name: data.name,
            description: data.description || null,
            isActive: data.isActive,
            instanceId: data.instanceId === 'null' ? null : data.instanceId,
            defaultDuration: parseInt(data.defaultDuration),
        } as Omit<any, 'id' | 'createdAt'>);
    };

    const handleClose = () => {
        setIsOpen(false);
        reset();
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <Plus className="w-4 h-4" />
                    Создать новую услугу
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] p-6">
                <DialogHeader>
                    <DialogTitle>Создать новую услугу</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                            Название
                        </Label>
                        <Input
                            id="name"
                            placeholder="Введите название услуги"
                            className={errors.name ? 'border-red-500' : ''}
                            {...register('name', {
                                required: 'Название услуги обязательно',
                                minLength: { value: 2, message: 'Название должно содержать минимум 2 символа' },
                                maxLength: { value: 100, message: 'Название не должно превышать 100 символов' },
                            })}
                        />
                        {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                            Описание
                        </Label>
                        <Textarea
                            id="description"
                            placeholder="Введите описание услуги"
                            rows={4}
                            className="resize-none"
                            {...register('description')}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Филиал</Label>
                        <Select
                            value={watchedInstanceId}
                            onValueChange={(value) => setValue('instanceId', value)}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Выберите филиал" />
                            </SelectTrigger>
                            <SelectContent>
                                {branches.map((branch) => (
                                    <SelectItem key={branch.id} value={branch.id.toString()}>
                                        {branch.branches}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Стандартная длительность</Label>
                        <Select
                            value={watchedDefaultDuration}
                            onValueChange={(value) => setValue('defaultDuration', value)}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {DURATIONS.map((duration) => (
                                    <SelectItem key={duration.value} value={duration.value}>
                                        {duration.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium text-gray-700">Активна</Label>
                        <Switch
                            checked={watchedIsActive}
                            onCheckedChange={(checked) => setValue('isActive', checked)}
                        />
                    </div>
                    <div className="flex justify-end gap-3">
                        <Button type="button" variant="outline" onClick={handleClose}>
                            Отмена
                        </Button>
                        <Button type="submit" disabled={createMutation.isPending}>
                            Создать услугу
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default CreateServiceBtn;