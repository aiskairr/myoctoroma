import { Eye, Trash2, Check, PencilRuler, Pen } from 'lucide-react';
// Using standard HTML table elements with Tailwind styling
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { useState } from 'react';

interface Service {
    id: number;
    name: string;
    description: string;
    branch: string;
    standardDuration: number;
    isActive: boolean;
    prices: Record<number, number>;
}

type TimeColumn = 10 | 15 | 20 | 30 | 40 | 50 | 60 | 75 | 80 | 90 | 110 | 120 | 150 | 220;

const ServicesTable: React.FC = () => {
    const timeColumns: TimeColumn[] = [
        10, 15, 20, 30, 40, 50, 60, 75, 80, 90, 110, 120, 150, 220
    ];

    const [services, setServices] = useState<Service[]>([
        {
            id: 1,
            name: 'VIP пакет',
            description: '',
            branch: 'all',
            standardDuration: 60,
            isActive: false,
            prices: { 60: 2500 }
        },
        {
            id: 2,
            name: 'Альгинатная маска',
            description: '',
            branch: 'all',
            standardDuration: 10,
            isActive: false,
            prices: { 10: 400 }
        },
        {
            id: 3,
            name: 'Борода под машинку',
            description: '',
            branch: 'all',
            standardDuration: 30,
            isActive: false,
            prices: { 30: 400 }
        },
        {
            id: 4,
            name: 'Бритье головы под машинку',
            description: '',
            branch: 'all',
            standardDuration: 60,
            isActive: false,
            prices: { 60: 500 }
        },
        {
            id: 5,
            name: 'Восковая эпиляция (1 зона)',
            description: '',
            branch: 'all',
            standardDuration: 10,
            isActive: false,
            prices: { 10: 200 }
        },
        {
            id: 6,
            name: 'Восковая эпиляция (3 зоны)',
            description: '',
            branch: 'all',
            standardDuration: 10,
            isActive: false,
            prices: { 10: 600 }
        },
        {
            id: 7,
            name: 'Глина',
            description: '',
            branch: 'all',
            standardDuration: 15,
            isActive: false,
            prices: { 15: 300 }
        }
    ]);

    const [editingCell, setEditingCell] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<string>('');

    const handleCellClick = (serviceId: number, timeColumn: TimeColumn): void => {
        const service = services.find(s => s.id === serviceId);
        if (!service) return;

        const currentPrice = service.prices[timeColumn] || 0;
        setEditingCell(`${serviceId}-${timeColumn}`);
        setEditValue(currentPrice.toString());
    };

    const handleCellSave = (serviceId: number, timeColumn: TimeColumn): void => {
        const newPrice = parseInt(editValue) || 0;
        setServices(prev => prev.map(service =>
            service.id === serviceId
                ? {
                    ...service,
                    prices: {
                        ...service.prices,
                        [timeColumn]: newPrice
                    }
                }
                : service
        ));
        setEditingCell(null);
        setEditValue('');
    };

    const handleKeyPress = (
        e: React.KeyboardEvent<HTMLInputElement>,
        serviceId: number,
        timeColumn: TimeColumn
    ): void => {
        if (e.key === 'Enter') {
            handleCellSave(serviceId, timeColumn);
        } else if (e.key === 'Escape') {
            setEditingCell(null);
            setEditValue('');
        }
    };

    const updateService = <K extends keyof Service>(
        serviceId: number,
        field: K,
        value: Service[K]
    ): void => {
        setServices(prev => prev.map(service =>
            service.id === serviceId
                ? { ...service, [field]: value }
                : service
        ));
    };

    const deleteService = (serviceId: number): void => {
        setServices(prev => prev.filter(service => service.id !== serviceId));
    };

    const handleSave = (): void => {
        // Логика сохранения
        console.log('Saving services:', services);
    };

    const handleBulkDelete = (): void => {
        // Логика массового удаления
        const activeServices = services.filter(service => service.isActive);
        if (activeServices.length > 0) {
            const confirmed = window.confirm(`Удалить ${activeServices.length} активных услуг?`);
            if (confirmed) {
                setServices(prev => prev.filter(service => !service.isActive));
            }
        }
    };

    return (
        <Card className="w-full p-4">
            <div className="overflow-x-auto">
                <table className="w-full border-collapse rounded-xl">
                    <thead>
                        <tr className="">
                            <th className="min-w-[180px] border border-gray-300 px-4 py-3 text-left text-base font-semibold">
                                Название услуги
                            </th>
                            <th className="min-w-[140px] border border-gray-300 px-4 py-3 text-left text-base font-semibold">
                                Описание
                            </th>
                            <th className="min-w-[120px] border border-gray-300 px-4 py-3 text-left text-base font-semibold">
                                Филиал
                            </th>
                            <th className="min-w-[140px] border border-gray-300 px-4 py-3 text-left text-base font-semibold">
                                Длительность
                            </th>
                            <th className="min-w-[100px] text-center border border-gray-300 px-4 py-3 text-base font-semibold">
                                Активна
                            </th>
                            {timeColumns.map(time => (
                                <th key={time} className="min-w-[90px] text-center border border-gray-300 px-4 py-3 text-base font-semibold">
                                    {time} мин
                                </th>
                            ))}
                            <th className="min-w-[140px] text-center border border-gray-300 px-4 py-3 text-base font-semibold">
                                Действия
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {services.map((service, index) => (
                            <tr key={service.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td className="border border-gray-300 px-4 py-3">
                                    <Input
                                        value={service.name}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                            updateService(service.id, 'name', e.target.value)
                                        }
                                        className="border-0 shadow-none p-2 text-base font-medium bg-transparent focus-visible:ring-1 focus-visible:ring-blue-500 min-w-[250px]"
                                    />
                                </td>
                                <td className="border border-gray-300 px-4 py-3">
                                    <Input
                                        value={service.description}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                            updateService(service.id, 'description', e.target.value)
                                        }
                                        placeholder="Описание"
                                        className="border-0 shadow-none p-2 text-base bg-transparent min-w-[150px] focus-visible:ring-1 focus-visible:ring-blue-500"
                                    />
                                </td>
                                <td className="border border-gray-300 px-4 py-3">
                                    <Select
                                        value={service.branch}
                                        onValueChange={(value: string) => updateService(service.id, 'branch', value)}
                                    >
                                        <SelectTrigger className="border-0 shadow-none p-2 text-base bg-transparent focus:ring-1 focus:ring-blue-500 min-w-[150px]">
                                            <SelectValue placeholder="Выберите филиал" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Все</SelectItem>
                                            <SelectItem value="branch1">Филиал 1</SelectItem>
                                            <SelectItem value="branch2">Филиал 2</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </td>
                                <td className="border border-gray-300 px-4 py-3">
                                    <Select
                                        value={service.standardDuration.toString()}
                                        onValueChange={(value: string) =>
                                            updateService(service.id, 'standardDuration', parseInt(value) as TimeColumn)
                                        }
                                    >
                                        <SelectTrigger className="border-0 shadow-none p-2 text-base bg-transparent focus:ring-1 focus:ring-blue-500">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {timeColumns.map(time => (
                                                <SelectItem key={time} value={time.toString()}>
                                                    {time} мин
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </td>
                                <td className="text-center border border-gray-300 px-4 py-3">
                                    <div className="flex justify-center">
                                        <Switch
                                            checked={service.isActive}
                                            onCheckedChange={(checked: boolean) =>
                                                updateService(service.id, 'isActive', checked)
                                            }
                                        />
                                    </div>
                                </td>
                                {timeColumns.map(time => {
                                    const cellKey = `${service.id}-${time}`;
                                    const isEditing = editingCell === cellKey;
                                    const price = service.prices[time] || 0;

                                    return (
                                        <td key={time} className="text-center border border-gray-300 px-4 py-3">
                                            {isEditing ? (
                                                <Input
                                                    value={editValue}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                        setEditValue(e.target.value)
                                                    }
                                                    onBlur={() => handleCellSave(service.id, time)}
                                                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
                                                        handleKeyPress(e, service.id, time)
                                                    }
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
                                        <button className="inline-flex items-center justify-center h-9 w-9 p-0 border border-gray-300 bg-white hover:bg-gray-50 rounded-md transition-colors">
                                            <Check className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => deleteService(service.id)}
                                            className="inline-flex items-center justify-center h-9 w-9 p-0 border border-gray-300 bg-white text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                        <button className="inline-flex items-center justify-center h-9 w-9 p-0 border border-gray-300 bg-white hover:bg-gray-50 rounded-md transition-colors">
                                            <Eye className="h-4 w-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
};

export default ServicesTable;