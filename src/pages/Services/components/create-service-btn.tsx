import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useBranch } from '@/contexts/BranchContext';
import { getBranchIdWithFallback } from '@/utils/branch-utils';
import { useLocale } from '@/contexts/LocaleContext';

interface ServiceFormData {
    name: string;
    description: string;
    instanceId: string;
    defaultDuration: string;
    isActive: boolean;
}

const CreateServiceBtn = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { branches, currentBranch } = useBranch();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { t } = useLocale();

    const DURATIONS = [
        { value: '10', label: `10 ${t('common.minutes')}` },
        { value: '15', label: `15 ${t('common.minutes')}` },
        { value: '20', label: `20 ${t('common.minutes')}` },
        { value: '30', label: `30 ${t('common.minutes')}` },
        { value: '40', label: `40 ${t('common.minutes')}` },
        { value: '50', label: `50 ${t('common.minutes')}` },
        { value: '60', label: `60 ${t('common.minutes')}` },
        { value: '75', label: `75 ${t('common.minutes')}` },
        { value: '80', label: `80 ${t('common.minutes')}` },
        { value: '90', label: `90 ${t('common.minutes')}` },
        { value: '110', label: `110 ${t('common.minutes')}` },
        { value: '120', label: `120 ${t('common.minutes')}` },
        { value: '150', label: `150 ${t('common.minutes')}` },
        { value: '220', label: `220 ${t('common.minutes')}` },
    ];

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
            instanceId: '',
            defaultDuration: '60',
            isActive: true,
        },
    });

    const watchedInstanceId = watch('instanceId');
    const watchedDefaultDuration = watch('defaultDuration');
    const watchedIsActive = watch('isActive');

    useEffect(() => {
        if (isOpen && branches.length > 0) {
            const branchId = getBranchIdWithFallback(currentBranch, branches);
            setValue('instanceId', branchId);
        }
    }, [isOpen, branches, currentBranch, setValue]);

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
            toast({ title: t('services.service_created') });
            setIsOpen(false);
            reset();
        },
        onError: (error: Error) => {
            toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
        },
    });

    const onSubmit = (data: ServiceFormData) => {
        if (!data.name.trim()) {
            toast({
                title: t('common.error'),
                description: t('services.name_required'),
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
                    {t('services.add_new_service')}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] p-6" aria-describedby="create-service-description">
                <DialogHeader>
                    <DialogTitle>{t('services.add_new_service')}</DialogTitle>
                    <DialogDescription id="create-service-description">
                        {t('services.fill_form_to_create')}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                            {t('services.name')}
                        </Label>
                        <Input
                            id="name"
                            placeholder={t('services.enter_service_name')}
                            className={errors.name ? 'border-red-500' : ''}
                            {...register('name', {
                                required: t('services.name_required'),
                                minLength: { value: 2, message: t('services.name_min_length') },
                                maxLength: { value: 100, message: t('services.name_max_length') },
                            })}
                        />
                        {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                            {t('services.description')}
                        </Label>
                        <Textarea
                            id="description"
                            placeholder={t('services.enter_service_description')}
                            rows={4}
                            className="resize-none"
                            {...register('description')}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">{t('services.branch')}</Label>
                        <Select
                            value={watchedInstanceId}
                            onValueChange={(value) => setValue('instanceId', value)}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder={t('services.select_branch')} />
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
                        <Label className="text-sm font-medium text-gray-700">{t('services.default_duration')}</Label>
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
                        <Label className="text-sm font-medium text-gray-700">{t('services.active')}</Label>
                        <Switch
                            checked={watchedIsActive}
                            onCheckedChange={(checked) => setValue('isActive', checked)}
                        />
                    </div>
                    <div className="flex justify-end gap-3">
                        <Button type="button" variant="outline" onClick={handleClose}>
                            {t('common.cancel')}
                        </Button>
                        <Button type="submit" disabled={createMutation.isPending}>
                            {t('services.create_service')}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default CreateServiceBtn;