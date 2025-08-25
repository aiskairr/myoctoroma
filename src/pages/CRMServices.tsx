import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Sparkles, Search, Edit, Trash2, Eye, Clock, DollarSign } from "lucide-react";

interface MassageService {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  instanceId?: string;
  createdAt: string;
  massageGroup?: string;
  availableDurations: Array<{
    duration: number;
    price: number;
  }>;
}

interface ServiceFormData {
  name: string;
  description?: string;
  isActive: boolean;
  massageGroup: string;
  durationPrices: { [duration: string]: number };
}

export default function CRMServices() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<MassageService | null>(null);
  const [formData, setFormData] = useState<ServiceFormData>({
    name: "",
    description: "",
    isActive: true,
    massageGroup: "Массаж всего тела",
    durationPrices: {}
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Available duration options - расширенный список длительностей
  const durationOptions = [10, 15, 20, 30, 40, 50, 60, 75, 80, 90, 110, 120, 150, 220];

  // Get services data
  const { data: services = [], isLoading } = useQuery<MassageService[]>({
    queryKey: ['${import.meta.env.VITE_BACKEND_URL}/api/crm/services'],
  });

  // Create service mutation
  const createMutation = useMutation({
    mutationFn: async (newService: ServiceFormData) => {
      const response = await fetch('${import.meta.env.VITE_BACKEND_URL}/api/crm/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newService),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create service');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['${import.meta.env.VITE_BACKEND_URL}/api/crm/services'] });
      setIsAddDialogOpen(false);
      resetForm();
      toast({
        title: "Успех",
        description: "Услуга успешно создана",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update service mutation
  const updateMutation = useMutation({
    mutationFn: async (updatedService: ServiceFormData & { id: number }) => {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/crm/services/${updatedService.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: updatedService.name,
          description: updatedService.description,
          isActive: updatedService.isActive,
          massageGroup: updatedService.massageGroup,
          durationPrices: updatedService.durationPrices
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update service');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['${import.meta.env.VITE_BACKEND_URL}/api/crm/services'] });
      setIsEditDialogOpen(false);
      setSelectedService(null);
      resetForm();
      toast({
        title: "Успех",
        description: "Услуга успешно обновлена",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete service mutation
  const deleteMutation = useMutation({
    mutationFn: async (serviceId: number) => {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/crm/services/${serviceId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete service');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['${import.meta.env.VITE_BACKEND_URL}/api/crm/services'] });
      setSelectedService(null);
      toast({
        title: "Успех",
        description: "Услуга успешно удалена",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Massage group options
  const massageGroups = ["Массаж всего тела", "Массаж отдельных зон", "Эксклюзивные ритуалы"];

  // Filter services
  const filteredServices = services.filter((service: MassageService) => {
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (service.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "active" && service.isActive) ||
                         (statusFilter === "inactive" && !service.isActive);
    const matchesGroup = groupFilter === "all" || service.massageGroup === groupFilter;
    return matchesSearch && matchesStatus && matchesGroup;
  });

  // Sort services by status and name
  const sortedServices = filteredServices.sort((a: MassageService, b: MassageService) => {
    if (a.isActive !== b.isActive) {
      return a.isActive ? -1 : 1; // Active services first
    }
    return a.name.localeCompare(b.name);
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      isActive: true,
      massageGroup: "Массаж всего тела",
      durationPrices: {}
    });
  };

  const handleAddService = () => {
    resetForm();
    setIsAddDialogOpen(true);
  };

  const handleEditService = (service: MassageService) => {
    setSelectedService(service);
    // Convert availableDurations back to durationPrices format
    const durationPrices: { [duration: string]: number } = {};
    service.availableDurations.forEach(({ duration, price }) => {
      durationPrices[duration.toString()] = price;
    });
    
    setFormData({
      name: service.name,
      description: service.description || "",
      isActive: service.isActive,
      massageGroup: service.massageGroup || "Массаж всего тела",
      durationPrices
    });
    setIsEditDialogOpen(true);
  };

  const handleViewService = (service: MassageService) => {
    setSelectedService(service);
    setIsViewDialogOpen(true);
  };

  const handleDeleteService = async (service: MassageService) => {
    if (window.confirm(`Вы уверены, что хотите удалить услугу "${service.name}"?`)) {
      deleteMutation.mutate(service.id);
    }
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast({
        title: "Ошибка",
        description: "Название услуги обязательно",
        variant: "destructive",
      });
      return;
    }

    const hasValidPrices = Object.values(formData.durationPrices).some(price => price > 0);
    if (!hasValidPrices) {
      toast({
        title: "Ошибка",
        description: "Необходимо указать хотя бы одну длительность с ценой",
        variant: "destructive",
      });
      return;
    }

    if (selectedService) {
      updateMutation.mutate({ ...formData, id: selectedService.id });
    } else {
      createMutation.mutate(formData);
    }
  };

  const updateDurationPrice = (duration: number, price: string) => {
    const numPrice = parseFloat(price) || 0;
    setFormData(prev => ({
      ...prev,
      durationPrices: {
        ...prev.durationPrices,
        [duration.toString()]: numPrice > 0 ? numPrice : 0
      }
    }));
  };

  const getServicePriceRange = (service: MassageService) => {
    if (service.availableDurations.length === 0) return "Цена не указана";
    if (service.availableDurations.length === 1) {
      return `${service.availableDurations[0].price} сом`;
    }
    const prices = service.availableDurations.map(d => d.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    return `${minPrice} - ${maxPrice} сом`;
  };

  const getServiceDurationRange = (service: MassageService) => {
    if (service.availableDurations.length === 0) return "Длительность не указана";
    if (service.availableDurations.length === 1) {
      return `${service.availableDurations[0].duration} мин`;
    }
    const durations = service.availableDurations.map(d => d.duration);
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);
    return `${minDuration} - ${maxDuration} мин`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Загрузка услуг...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Sparkles className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Управление услугами</h1>
        </div>
        <Button onClick={handleAddService} className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Добавить услугу</span>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Поиск услуг..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все услуги</SelectItem>
            <SelectItem value="active">Активные</SelectItem>
            <SelectItem value="inactive">Неактивные</SelectItem>
          </SelectContent>
        </Select>
        <Select value={groupFilter} onValueChange={setGroupFilter}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue placeholder="Фильтр по группе" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все группы</SelectItem>
            {massageGroups.map(group => (
              <SelectItem key={group} value={group}>{group}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedServices.map((service) => (
          <Card key={service.id} className={`transition-all hover:shadow-lg ${!service.isActive ? 'opacity-60' : ''}`}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg font-semibold">{service.name}</CardTitle>
                <Badge variant={service.isActive ? "default" : "secondary"}>
                  {service.isActive ? "Активна" : "Неактивна"}
                </Badge>
              </div>
              {service.description && (
                <p className="text-sm text-muted-foreground mt-2">{service.description}</p>
              )}
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{getServiceDurationRange(service)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{getServicePriceRange(service)}</span>
                </div>
                
                {/* Available Durations */}
                {service.availableDurations.length > 0 && (
                  <div className="pt-2">
                    <div className="text-xs text-muted-foreground mb-2">Доступные варианты:</div>
                    <div className="flex flex-wrap gap-1">
                      {service.availableDurations.map(({ duration, price }) => (
                        <Badge key={duration} variant="outline" className="text-xs">
                          {duration}мин - {price}сом
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-between pt-3 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewService(service)}
                    className="flex items-center space-x-1"
                  >
                    <Eye className="h-4 w-4" />
                    <span>Просмотр</span>
                  </Button>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditService(service)}
                      className="flex items-center space-x-1"
                    >
                      <Edit className="h-4 w-4" />
                      <span>Изменить</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteService(service)}
                      className="flex items-center space-x-1 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Удалить</span>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {sortedServices.length === 0 && (
        <div className="text-center py-12">
          <Sparkles className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">Услуги не найдены</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || statusFilter !== "all" 
              ? "Попробуйте изменить критерии поиска" 
              : "Начните с добавления первой услуги"}
          </p>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isAddDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsAddDialogOpen(false);
          setIsEditDialogOpen(false);
          setSelectedService(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedService ? "Редактировать услугу" : "Добавить новую услугу"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Название услуги *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Например: Классический массаж"
              />
            </div>
            
            <div>
              <Label htmlFor="massageGroup">Группа массажа *</Label>
              <Select value={formData.massageGroup} onValueChange={(value) => setFormData(prev => ({ ...prev, massageGroup: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите группу массажа" />
                </SelectTrigger>
                <SelectContent>
                  {massageGroups.map(group => (
                    <SelectItem key={group} value={group}>{group}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="description">Описание</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Краткое описание услуги..."
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
              />
              <Label htmlFor="isActive">Активная услуга</Label>
            </div>

            <div>
              <Label className="text-base font-medium">Длительность и цены *</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Укажите цены для доступных длительностей массажа (в сомах)
              </p>
              <div className="grid grid-cols-2 gap-3">
                {durationOptions.map((duration) => (
                  <div key={duration} className="flex items-center space-x-2">
                    <Label className="min-w-[60px] text-sm">{duration} мин:</Label>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={formData.durationPrices[duration.toString()] || ""}
                      onChange={(e) => updateDurationPrice(duration, e.target.value)}
                      placeholder="0"
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground">сом</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                * Оставьте поле пустым или укажите 0, если данная длительность недоступна
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsAddDialogOpen(false);
              setIsEditDialogOpen(false);
              setSelectedService(null);
              resetForm();
            }}>
              Отмена
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? "Сохранение..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsViewDialogOpen(false);
          setSelectedService(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Просмотр услуги</DialogTitle>
          </DialogHeader>
          {selectedService && (
            <div className="space-y-4">
              <div>
                <Label className="font-medium">Название</Label>
                <p className="text-sm">{selectedService.name}</p>
              </div>

              <div>
                <Label className="font-medium">Группа массажа</Label>
                <p className="text-sm">
                  <Badge variant="outline">{selectedService.massageGroup}</Badge>
                </p>
              </div>
              
              {selectedService.description && (
                <div>
                  <Label className="font-medium">Описание</Label>
                  <p className="text-sm">{selectedService.description}</p>
                </div>
              )}

              <div>
                <Label className="font-medium">Статус</Label>
                <p className="text-sm">
                  <Badge variant={selectedService.isActive ? "default" : "secondary"}>
                    {selectedService.isActive ? "Активна" : "Неактивна"}
                  </Badge>
                </p>
              </div>

              <div>
                <Label className="font-medium">Доступные варианты</Label>
                {selectedService.availableDurations.length > 0 ? (
                  <div className="space-y-2 mt-2">
                    {selectedService.availableDurations.map(({ duration, price }) => (
                      <div key={duration} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span className="text-sm">{duration} минут</span>
                        <span className="text-sm font-medium">{price} сом</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Варианты не указаны</p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsViewDialogOpen(false);
              setSelectedService(null);
            }}>
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}