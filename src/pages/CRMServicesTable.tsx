import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Check, Trash2, Eye, Plus } from "lucide-react";
import { useBranch } from "@/contexts/BranchContext";

interface MassageService {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  instanceId: string | null;
  createdAt: string;
  defaultDuration: number;
  duration10_price: number | null;
  duration15_price: number | null;
  duration20_price: number | null;
  duration30_price: number | null;
  duration40_price: number | null;
  duration50_price: number | null;
  duration60_price: number | null;
  duration75_price: number | null;
  duration80_price: number | null;
  duration90_price: number | null;
  duration110_price: number | null;
  duration120_price: number | null;
  duration150_price: number | null;
  duration220_price: number | null;
}

export default function CRMServices() {
  const { branches } = useBranch();
  const [editingServices, setEditingServices] = useState<Record<number, MassageService>>({});
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newServiceData, setNewServiceData] = useState({
    name: '',
    description: '',
    instanceId: null as string | null,
    defaultDuration: 60,
    isActive: true
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Создаем список филиалов с опцией "Все филиалы"
  const branchOptions = [
    { id: null, name: "Все филиалы" },
    ...branches.map(branch => ({ id: branch.id.toString(), name: branch.branches }))
  ];

  // Функция для получения названия филиала
  const getBranchName = (instanceId: string | null) => {
    const branch = branchOptions.find(b => b.id === instanceId);
    return branch ? branch.name : "Все филиалы";
  };

  const { data: services = [], isLoading, error } = useQuery<MassageService[]>({
    queryKey: ['crm-services'],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/crm/services`);
      if (!response.ok) throw new Error('Ошибка загрузки услуг');
      return response.json();
    },
  });

  // Инициализация состояния редактирования при загрузке данных
  useEffect(() => {
    if (services.length > 0) {
      const initialState: Record<number, MassageService> = {};
      services.forEach(service => {
        initialState[service.id] = { ...service };
      });
      setEditingServices(initialState);
    }
  }, [services]);

  const updateMutation = useMutation({
    mutationFn: async (service: MassageService) => {
      // Отправляем все поля напрямую без преобразования в durationPrices
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/crm/services/${service.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: service.name,
          description: service.description,
          isActive: service.isActive,
          instanceId: service.instanceId,
          defaultDuration: service.defaultDuration,
          duration10_price: service.duration10_price,
          duration15_price: service.duration15_price,
          duration20_price: service.duration20_price,
          duration30_price: service.duration30_price,
          duration40_price: service.duration40_price,
          duration50_price: service.duration50_price,
          duration60_price: service.duration60_price,
          duration75_price: service.duration75_price,
          duration80_price: service.duration80_price,
          duration90_price: service.duration90_price,
          duration110_price: service.duration110_price,
          duration120_price: service.duration120_price,
          duration150_price: service.duration150_price,
          duration220_price: service.duration220_price,
        }),
      });
      if (!response.ok) throw new Error('Ошибка обновления услуги');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-services'] });
      toast({ title: "Услуга обновлена успешно" });
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (service: Omit<MassageService, 'id' | 'createdAt'>) => {
      // Отправляем все поля напрямую без преобразования в durationPrices
      const response = await fetch('${import.meta.env.VITE_BACKEND_URL}/api/crm/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: service.name,
          description: service.description,
          isActive: service.isActive,
          instanceId: service.instanceId,
          defaultDuration: service.defaultDuration,
          duration10_price: service.duration10_price,
          duration15_price: service.duration15_price,
          duration20_price: service.duration20_price,
          duration30_price: service.duration30_price,
          duration40_price: service.duration40_price,
          duration50_price: service.duration50_price,
          duration60_price: service.duration60_price,
          duration75_price: service.duration75_price,
          duration80_price: service.duration80_price,
          duration90_price: service.duration90_price,
          duration110_price: service.duration110_price,
          duration120_price: service.duration120_price,
          duration150_price: service.duration150_price,
          duration220_price: service.duration220_price,
        }),
      });
      if (!response.ok) throw new Error('Ошибка создания услуги');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-services'] });
      toast({ title: "Услуга создана успешно" });
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const handleInputChange = (serviceId: number, field: keyof MassageService, value: string | number | boolean | null) => {
    setEditingServices(prev => ({
      ...prev,
      [serviceId]: {
        ...prev[serviceId],
        [field]: field.includes('price') ? (value === '' ? null : Number(value)) : value
      }
    }));
  };



  const deleteMutation = useMutation({
    mutationFn: async (serviceId: number) => {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/crm/services/${serviceId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Ошибка удаления услуги');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-services'] });
      toast({ title: "Услуга удалена успешно" });
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const handleAddNewService = () => {
    setIsCreateDialogOpen(true);
  };

  const handleCreateService = () => {
    if (!newServiceData.name.trim()) {
      toast({
        title: "Ошибка",
        description: "Название услуги обязательно для заполнения",
        variant: "destructive"
      });
      return;
    }

    createMutation.mutate({
      ...newServiceData,
      duration30_price: null,
      duration40_price: null,
      duration50_price: null,
      duration60_price: null,
      duration80_price: null,
      duration90_price: null,
      duration110_price: null,
      duration120_price: null,
      duration150_price: null,
      duration220_price: null,
    } as any);

    setIsCreateDialogOpen(false);
    setNewServiceData({
      name: '',
      description: '',
      instanceId: null,
      defaultDuration: 60,
      isActive: true
    });
  };

  const handleSaveService = (serviceId: number) => {
    const service = editingServices[serviceId];
    if (service) {
      if (services.find(s => s.id === serviceId)) {
        // Обновляем существующую услугу
        updateMutation.mutate(service);
      } else {
        // Создаем новую услугу
        createMutation.mutate(service);
      }
    }
  };

  const handleDeleteService = (serviceId: number) => {
    if (window.confirm('Вы уверены, что хотите удалить эту услугу?')) {
      deleteMutation.mutate(serviceId);
    }
  };

  const handleViewService = (service: MassageService) => {
    toast({ 
      title: "Информация об услуге", 
      description: `${service.name}: ${service.description || 'Описание отсутствует'}` 
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Загрузка услуг...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Ошибка загрузки: {(error as Error).message}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Управление услугами</h1>
        <p className="text-gray-600 mb-4">
          В названиях столбцов вы можете увидеть длительность услуги в минутах, а в значениях - стоимость в сомах. 
          Заполните все необходимые поля и просто сохраните.
        </p>
        <Button onClick={handleAddNewService} className="mb-4">
          <Plus className="mr-2 h-4 w-4" />
          Добавить новую услугу
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Название услуги</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Описание</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Филиал</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-900">Стандартная длительность</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-900">Активна</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-900">10 мин</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-900">15 мин</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-900">20 мин</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-900">30 мин</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-900">40 мин</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-900">50 мин</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-900">60 мин</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-900">75 мин</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-900">80 мин</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-900">90 мин</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-900">110 мин</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-900">120 мин</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-900">150 мин</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-900">220 мин</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-900">Действия</th>
              </tr>
            </thead>
            <tbody>
              {services.map((service) => {
                const editingService = editingServices[service.id] || service;
                return (
                  <tr key={service.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Input
                        value={editingService.name}
                        onChange={(e) => handleInputChange(service.id, 'name', e.target.value)}
                        className="w-full min-w-[200px]"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Textarea
                        value={editingService.description || ''}
                        onChange={(e) => handleInputChange(service.id, 'description', e.target.value)}
                        className="w-full min-w-[200px] min-h-[60px]"
                        rows={2}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        value={editingService.instanceId || "null"}
                        onValueChange={(value) => {
                          const newValue = value === "null" ? null : value;
                          handleInputChange(service.id, 'instanceId', newValue);
                        }}
                      >
                        <SelectTrigger className="w-full min-w-[120px]">
                          <SelectValue placeholder="Выберите филиал" />
                        </SelectTrigger>
                        <SelectContent>
                          {branchOptions.map((branch) => (
                            <SelectItem key={branch.id || "null"} value={branch.id || "null"}>
                              {branch.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        value={editingService.defaultDuration?.toString() || "60"}
                        onValueChange={(value) => handleInputChange(service.id, 'defaultDuration', parseInt(value))}
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="15">15</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                          <SelectItem value="30">30</SelectItem>
                          <SelectItem value="40">40</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="60">60</SelectItem>
                          <SelectItem value="75">75</SelectItem>
                          <SelectItem value="80">80</SelectItem>
                          <SelectItem value="90">90</SelectItem>
                          <SelectItem value="110">110</SelectItem>
                          <SelectItem value="120">120</SelectItem>
                          <SelectItem value="150">150</SelectItem>
                          <SelectItem value="220">220</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Switch
                        checked={editingService.isActive}
                        onCheckedChange={(checked) => handleInputChange(service.id, 'isActive', checked)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        value={editingService.duration10_price || ''}
                        onChange={(e) => handleInputChange(service.id, 'duration10_price', e.target.value)}
                        className="w-20 text-center"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        value={editingService.duration15_price || ''}
                        onChange={(e) => handleInputChange(service.id, 'duration15_price', e.target.value)}
                        className="w-20 text-center"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        value={editingService.duration20_price || ''}
                        onChange={(e) => handleInputChange(service.id, 'duration20_price', e.target.value)}
                        className="w-20 text-center"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        value={editingService.duration30_price || ''}
                        onChange={(e) => handleInputChange(service.id, 'duration30_price', e.target.value)}
                        className="w-20 text-center"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        value={editingService.duration40_price || ''}
                        onChange={(e) => handleInputChange(service.id, 'duration40_price', e.target.value)}
                        className="w-20 text-center"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        value={editingService.duration50_price || ''}
                        onChange={(e) => handleInputChange(service.id, 'duration50_price', e.target.value)}
                        className="w-20 text-center"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        value={editingService.duration60_price || ''}
                        onChange={(e) => handleInputChange(service.id, 'duration60_price', e.target.value)}
                        className="w-20 text-center"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        value={editingService.duration75_price || ''}
                        onChange={(e) => handleInputChange(service.id, 'duration75_price', e.target.value)}
                        className="w-20 text-center"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        value={editingService.duration80_price || ''}
                        onChange={(e) => handleInputChange(service.id, 'duration80_price', e.target.value)}
                        className="w-20 text-center"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        value={editingService.duration90_price || ''}
                        onChange={(e) => handleInputChange(service.id, 'duration90_price', e.target.value)}
                        className="w-20 text-center"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        value={editingService.duration110_price || ''}
                        onChange={(e) => handleInputChange(service.id, 'duration110_price', e.target.value)}
                        className="w-20 text-center"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        value={editingService.duration120_price || ''}
                        onChange={(e) => handleInputChange(service.id, 'duration120_price', e.target.value)}
                        className="w-20 text-center"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        value={editingService.duration150_price || ''}
                        onChange={(e) => handleInputChange(service.id, 'duration150_price', e.target.value)}
                        className="w-20 text-center"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        value={editingService.duration220_price || ''}
                        onChange={(e) => handleInputChange(service.id, 'duration220_price', e.target.value)}
                        className="w-20 text-center"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        <Button
                          onClick={() => handleSaveService(service.id)}
                          disabled={updateMutation.isPending || createMutation.isPending}
                          size="sm"
                          variant="default"
                          className="h-8 w-8 p-0"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => handleDeleteService(service.id)}
                          disabled={deleteMutation.isPending}
                          size="sm"
                          variant="destructive"
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => handleViewService(editingService)}
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {/* Отображаем новые услуги, которые еще не сохранены */}
              {Object.values(editingServices)
                .filter(service => !services.find(s => s.id === service.id))
                .map((service) => (
                  <tr key={`new-${service.id}`} className="border-b hover:bg-gray-50 bg-yellow-50">
                    <td className="px-4 py-3">
                      <Input
                        value={service.name}
                        onChange={(e) => handleInputChange(service.id, 'name', e.target.value)}
                        className="w-full min-w-[200px]"
                        placeholder="Название услуги"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Textarea
                        value={service.description || ''}
                        onChange={(e) => handleInputChange(service.id, 'description', e.target.value)}
                        className="w-full min-w-[200px] min-h-[60px]"
                        rows={2}
                        placeholder="Описание услуги"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        value={service.instanceId || "null"}
                        onValueChange={(value) => {
                          const newValue = value === "null" ? null : value;
                          handleInputChange(service.id, 'instanceId', newValue);
                        }}
                      >
                        <SelectTrigger className="w-full min-w-[120px]">
                          <SelectValue placeholder="Выберите филиал" />
                        </SelectTrigger>
                        <SelectContent>
                          {branchOptions.map((branch) => (
                            <SelectItem key={branch.id || "null"} value={branch.id || "null"}>
                              {branch.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        value={service.defaultDuration?.toString() || "60"}
                        onValueChange={(value) => handleInputChange(service.id, 'defaultDuration', parseInt(value))}
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="15">15</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                          <SelectItem value="30">30</SelectItem>
                          <SelectItem value="40">40</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="60">60</SelectItem>
                          <SelectItem value="75">75</SelectItem>
                          <SelectItem value="80">80</SelectItem>
                          <SelectItem value="90">90</SelectItem>
                          <SelectItem value="110">110</SelectItem>
                          <SelectItem value="120">120</SelectItem>
                          <SelectItem value="150">150</SelectItem>
                          <SelectItem value="220">220</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Switch
                        checked={service.isActive}
                        onCheckedChange={(checked) => handleInputChange(service.id, 'isActive', checked)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        value={service.duration10_price || ''}
                        onChange={(e) => handleInputChange(service.id, 'duration10_price', e.target.value)}
                        className="w-20 text-center"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        value={service.duration15_price || ''}
                        onChange={(e) => handleInputChange(service.id, 'duration15_price', e.target.value)}
                        className="w-20 text-center"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        value={service.duration20_price || ''}
                        onChange={(e) => handleInputChange(service.id, 'duration20_price', e.target.value)}
                        className="w-20 text-center"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        value={service.duration30_price || ''}
                        onChange={(e) => handleInputChange(service.id, 'duration30_price', e.target.value)}
                        className="w-20 text-center"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        value={service.duration40_price || ''}
                        onChange={(e) => handleInputChange(service.id, 'duration40_price', e.target.value)}
                        className="w-20 text-center"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        value={service.duration50_price || ''}
                        onChange={(e) => handleInputChange(service.id, 'duration50_price', e.target.value)}
                        className="w-20 text-center"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        value={service.duration60_price || ''}
                        onChange={(e) => handleInputChange(service.id, 'duration60_price', e.target.value)}
                        className="w-20 text-center"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        value={service.duration75_price || ''}
                        onChange={(e) => handleInputChange(service.id, 'duration75_price', e.target.value)}
                        className="w-20 text-center"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        value={service.duration80_price || ''}
                        onChange={(e) => handleInputChange(service.id, 'duration80_price', e.target.value)}
                        className="w-20 text-center"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        value={service.duration90_price || ''}
                        onChange={(e) => handleInputChange(service.id, 'duration90_price', e.target.value)}
                        className="w-20 text-center"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        value={service.duration110_price || ''}
                        onChange={(e) => handleInputChange(service.id, 'duration110_price', e.target.value)}
                        className="w-20 text-center"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        value={service.duration120_price || ''}
                        onChange={(e) => handleInputChange(service.id, 'duration120_price', e.target.value)}
                        className="w-20 text-center"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        value={service.duration150_price || ''}
                        onChange={(e) => handleInputChange(service.id, 'duration150_price', e.target.value)}
                        className="w-20 text-center"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        value={service.duration220_price || ''}
                        onChange={(e) => handleInputChange(service.id, 'duration220_price', e.target.value)}
                        className="w-20 text-center"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        <Button
                          onClick={() => handleSaveService(service.id)}
                          disabled={updateMutation.isPending || createMutation.isPending}
                          size="sm"
                          variant="default"
                          className="h-8 w-8 p-0"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => {
                            setEditingServices(prev => {
                              const newState = { ...prev };
                              delete newState[service.id];
                              return newState;
                            });
                          }}
                          size="sm"
                          variant="destructive"
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => handleViewService(service)}
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {services.length === 0 && Object.keys(editingServices).length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">Услуги не найдены. Добавьте новую услугу.</p>
        </div>
      )}

      {/* Диалог создания новой услуги */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Создать новую услугу</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="serviceName" className="text-right">
                Название
              </Label>
              <Input
                id="serviceName"
                value={newServiceData.name}
                onChange={(e) => setNewServiceData({...newServiceData, name: e.target.value})}
                className="col-span-3"
                placeholder="Введите название услуги"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="serviceDescription" className="text-right">
                Описание
              </Label>
              <Textarea
                id="serviceDescription"
                value={newServiceData.description}
                onChange={(e) => setNewServiceData({...newServiceData, description: e.target.value})}
                className="col-span-3"
                placeholder="Введите описание услуги"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="serviceBranch" className="text-right">
                Филиал
              </Label>
              <Select
                value={newServiceData.instanceId || "null"}
                onValueChange={(value) => setNewServiceData({...newServiceData, instanceId: value === "null" ? null : value})}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Выберите филиал" />
                </SelectTrigger>
                <SelectContent>
                  {branchOptions.map((branch) => (
                    <SelectItem key={branch.id || "null"} value={branch.id || "null"}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="defaultDuration" className="text-right">
                Стандартная длительность
              </Label>
              <Select
                value={newServiceData.defaultDuration.toString()}
                onValueChange={(value) => setNewServiceData({...newServiceData, defaultDuration: parseInt(value)})}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 минут</SelectItem>
                  <SelectItem value="40">40 минут</SelectItem>
                  <SelectItem value="50">50 минут</SelectItem>
                  <SelectItem value="60">60 минут</SelectItem>
                  <SelectItem value="80">80 минут</SelectItem>
                  <SelectItem value="90">90 минут</SelectItem>
                  <SelectItem value="110">110 минут</SelectItem>
                  <SelectItem value="120">120 минут</SelectItem>
                  <SelectItem value="150">150 минут</SelectItem>
                  <SelectItem value="220">220 минут</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="serviceActive" className="text-right">
                Активна
              </Label>
              <Switch
                id="serviceActive"
                checked={newServiceData.isActive}
                onCheckedChange={(checked) => setNewServiceData({...newServiceData, isActive: checked})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleCreateService}>
              Создать услугу
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}