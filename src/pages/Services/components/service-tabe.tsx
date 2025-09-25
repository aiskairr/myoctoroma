import { Eye, Trash2, Check } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
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
        <Card className="w-full">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="min-w-[150px]">Название услуги</TableHead>
                            <TableHead className="min-w-[120px]">Описание</TableHead>
                            <TableHead className="min-w-[100px]">Филиал</TableHead>
                            <TableHead className="min-w-[120px]">Стандартная длительность</TableHead>
                            <TableHead className="min-w-[80px] text-center">Активна</TableHead>
                            {timeColumns.map(time => (
                                <TableHead key={time} className="min-w-[80px] text-center">
                                    {time} мин
                                </TableHead>
                            ))}
                            <TableHead className="min-w-[120px] text-center">Действия</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {services.map((service) => (
                            <TableRow key={service.id}>
                                <TableCell>
                                    <Input
                                        value={service.name}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                            updateService(service.id, 'name', e.target.value)
                                        }
                                        className="border-0 shadow-none p-2 h-auto focus-visible:ring-0 min-w-[250px]"
                                    />
                                </TableCell>
                                <TableCell>
                                    <Input
                                        value={service.description}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                            updateService(service.id, 'description', e.target.value)
                                        }
                                        placeholder="Описание"
                                        className="border-0 shadow-none p-2 min-w-[150px] h-auto focus-visible:ring-0"
                                    />
                                </TableCell>
                                <TableCell>
                                    <Select
                                        value={service.branch}
                                        onValueChange={(value: string) => updateService(service.id, 'branch', value)}
                                    >
                                        <SelectTrigger className="border-0 shadow-none p-2 h-auto focus:ring-0 min-w-[150px]">
                                            <SelectValue placeholder="Выберите филиал" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Все</SelectItem>
                                            <SelectItem value="branch1">Филиал 1</SelectItem>
                                            <SelectItem value="branch2">Филиал 2</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </TableCell>
                                <TableCell>
                                    <Select
                                        value={service.standardDuration.toString()}
                                        onValueChange={(value: string) =>
                                            updateService(service.id, 'standardDuration', parseInt(value) as TimeColumn)
                                        }
                                    >
                                        <SelectTrigger className="border-0 shadow-none p-2 h-auto focus:ring-0">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {timeColumns.map(time => (
                                                <SelectItem key={time} value={time.toString()}>
                                                    {time}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </TableCell>
                                <TableCell className="text-center">
                                    <Switch
                                        checked={service.isActive}
                                        onCheckedChange={(checked: boolean) =>
                                            updateService(service.id, 'isActive', checked)
                                        }
                                    />
                                </TableCell>
                                {timeColumns.map(time => {
                                    const cellKey = `${service.id}-${time}`;
                                    const isEditing = editingCell === cellKey;
                                    const price = service.prices[time] || 0;

                                    return (
                                        <TableCell key={time} className="text-center transition-all">
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
                                                    className="w-full text-center h-8 min-w-[80px] transition-all"
                                                    autoFocus
                                                />
                                            ) : (
                                                <div
                                                    onClick={() => handleCellClick(service.id, time)}
                                                    className="cursor-pointer hover:bg-muted rounded p-2 min-h-[32px] flex items-center justify-center transition-colors"
                                                >
                                                    {price}
                                                </div>
                                            )}
                                        </TableCell>
                                    );
                                })}
                                <TableCell>
                                    <div className="flex gap-1 justify-center">
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                            <Check className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                            onClick={() => deleteService(service.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </Card>
    );
};


export default ServicesTable;