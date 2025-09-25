import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";

// Типы для формы
interface ServiceFormData {
    name: string;
    description: string;
    branch: string;
    duration: string;
    isActive: boolean;
}

// Данные для селекта филиалов
const branches = [
    { value: "all", label: "Все филиалы" },
    { value: "branch1", label: "Филиал 1" },
    { value: "branch2", label: "Филиал 2" },
    { value: "branch3", label: "Филиал 3" },
];

// Данные для селекта длительности
const durations = [
    { value: "30", label: "30 минут" },
    { value: "60", label: "60 минут" },
    { value: "90", label: "90 минут" },
    { value: "120", label: "120 минут" },
];

const CreateServiceBtn = () => {
    const [isOpen, setIsOpen] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
        setValue,
        watch
    } = useForm<ServiceFormData>({
        defaultValues: {
            name: '',
            description: '',
            branch: 'all',
            duration: '60',
            isActive: true
        }
    });

    const watchedBranch = watch('branch');
    const watchedDuration = watch('duration');
    const watchedIsActive = watch('isActive');

    const onSubmit = (data: ServiceFormData) => {
        console.log('Данные формы:', data);
        // Здесь будет логика отправки данных
        alert('Услуга создана успешно!');
        handleClose();
    };

    const handleClose = () => {
        setIsOpen(false);
        reset(); // Сбрасываем форму при закрытии
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <Plus className="w-4 h-4" />
                    Создать новую услугу
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[500px] p-0">
                {/* Заголовок с кнопкой закрытия */}
                <div className="flex items-center justify-between p-6 pb-4 rounded-t-lg">
                    <DialogTitle className="text-lg font-medium">
                        Создать новую услугу
                    </DialogTitle>
                </div>

                {/* Форма */}
                <div className="p-6 pt-4 space-y-6">
                    {/* Поле "Название" */}
                    <div className="space-y-2">
                        <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                            Название
                        </Label>
                        <Input
                            id="name"
                            placeholder="Введите название услуги"
                            className={`w-full ${errors.name ? 'border-red-500' : ''}`}
                            {...register('name', {
                                required: 'Название услуги обязательно',
                                minLength: {
                                    value: 2,
                                    message: 'Название должно содержать минимум 2 символа'
                                },
                                maxLength: {
                                    value: 100,
                                    message: 'Название не должно превышать 100 символов'
                                }
                            })}
                        />
                        {errors.name && (
                            <p className="text-sm text-red-500">{errors.name.message}</p>
                        )}
                    </div>

                    {/* Поле "Описание" */}
                    <div className="space-y-2">
                        <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                            Описание
                        </Label>
                        <Textarea
                            id="description"
                            placeholder="Введите описание услуги"
                            rows={4}
                            className={`w-full resize-none ${errors.description ? 'border-red-500' : ''}`}
                            {...register('description', {
                                required: 'Описание услуги обязательно',
                                minLength: {
                                    value: 10,
                                    message: 'Описание должно содержать минимум 10 символов'
                                },
                                maxLength: {
                                    value: 500,
                                    message: 'Описание не должно превышать 500 символов'
                                }
                            })}
                        />
                        {errors.description && (
                            <p className="text-sm text-red-500">{errors.description.message}</p>
                        )}
                    </div>

                    {/* Поле "Филиал" */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">
                            Филиал
                        </Label>
                        <Select
                            value={watchedBranch}
                            onValueChange={(value) => setValue('branch', value)}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {branches.map((branch) => (
                                    <SelectItem key={branch.value} value={branch.value}>
                                        {branch.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Поле "Стандартная длительность" */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">
                            Стандартная длительность
                        </Label>
                        <Select
                            value={watchedDuration}
                            onValueChange={(value) => setValue('duration', value)}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {durations.map((duration) => (
                                    <SelectItem key={duration.value} value={duration.value}>
                                        {duration.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Переключатель "Активна" */}
                    <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium text-gray-700">
                            Активна
                        </Label>
                        <Switch
                            checked={watchedIsActive}
                            onCheckedChange={(checked) => setValue('isActive', checked)}
                        />
                    </div>

                    {/* Кнопки действий */}
                    <div className="flex justify-end gap-3 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                        >
                            Отмена
                        </Button>
                        <Button
                            onClick={handleSubmit(onSubmit)}
                            className=""
                            variant={"outline"}
                        >
                            Создать услугу
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default CreateServiceBtn;