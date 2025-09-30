import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Clock, DollarSign, ChevronRight, Star } from "lucide-react";
import { useBranch } from "@/contexts/BranchContext";

interface MassageService {
  id: number;
  name: string;
  description?: string;
  defaultDuration: number;
  massageGroup: string;
  availableDurations: Array<{
    duration: number;
    price: number;
  }>;
}

interface MassageGroup {
  name: string;
  description: string;
  icon: React.ReactNode;
}

const BookingPage = () => {
  const { currentBranch } = useBranch();
  const [services, setServices] = useState<MassageService[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const massageGroups: MassageGroup[] = [
    {
      name: "Массаж всего тела",
      description: "Комплексные процедуры для полного расслабления и восстановления организма",
      icon: <Star className="h-8 w-8" />
    },
    {
      name: "Массаж отдельных зон",
      description: "Целенаправленная работа с конкретными зонами тела для решения локальных проблем",
      icon: <Sparkles className="h-8 w-8" />
    },
    {
      name: "Эксклюзивные ритуалы",
      description: "Премиальные авторские процедуры для особенных моментов и глубокого релакса",
      icon: <Clock className="h-8 w-8" />
    }
  ];

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/public/massage-services?branchId=${currentBranch?.id}`);
        if (response.ok) {
          const data = await response.json();
          setServices(data);
        }
      } catch (error) {
        console.error('Error fetching services:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  const getServicesByGroup = (groupName: string) => {
    return services.filter(service => service.massageGroup === groupName);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center">
        <div className="text-amber-400 text-xl font-light">Загрузка услуг...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-800 to-blue-800 py-16">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative container mx-auto px-6 text-center">
          <div className="flex items-center justify-center mb-6">
            <Sparkles className="h-12 w-12 text-amber-400 mr-4" />
            <h1 className="text-5xl font-light text-white tracking-wide">Octo CRM</h1>
          </div>
          <p className="text-xl text-amber-200 font-light max-w-2xl mx-auto">
            Выберите идеальную процедуру для вашего расслабления и восстановления
          </p>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12">
        {!selectedGroup ? (
          <>
            {/* Massage Type Selection */}
            <div className="mb-12">
              <h2 className="text-3xl font-light text-white text-center mb-8">
                Выберите тип массажа
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {massageGroups.map((group) => (
                  <Card 
                    key={group.name}
                    className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-all duration-300 cursor-pointer hover:scale-105 hover:shadow-xl hover:shadow-amber-500/20"
                    onClick={() => setSelectedGroup(group.name)}
                  >
                    <CardHeader className="text-center pb-4">
                      <div className="flex justify-center mb-4 text-amber-400">
                        {group.icon}
                      </div>
                      <CardTitle className="text-2xl font-light text-white mb-2">
                        {group.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                      <p className="text-slate-300 font-light mb-6 leading-relaxed">
                        {group.description}
                      </p>
                      <div className="flex items-center justify-center text-amber-400 hover:text-amber-300 transition-colors">
                        <span className="font-light">Выбрать</span>
                        <ChevronRight className="h-5 w-5 ml-2" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Selected Group Services */}
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-light text-white mb-2">
                  {selectedGroup}
                </h2>
                <p className="text-slate-300">
                  {massageGroups.find(g => g.name === selectedGroup)?.description}
                </p>
              </div>
              <Button 
                variant="outline" 
                onClick={() => setSelectedGroup(null)}
                className="bg-slate-800/50 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
              >
                Назад к выбору типа
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {getServicesByGroup(selectedGroup).map((service) => (
                <Card 
                  key={service.id} 
                  className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/10"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-xl font-light text-white leading-tight">
                        {service.name}
                      </CardTitle>
                      <Badge 
                        variant="outline" 
                        className="bg-amber-500/10 border-amber-500/30 text-amber-400 font-light"
                      >
                        Премиум
                      </Badge>
                    </div>
                    {service.description && (
                      <p className="text-sm text-slate-400 font-light mt-2 leading-relaxed">
                        {service.description}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-amber-400" />
                        <span className="text-sm text-slate-300 font-light">
                          {getServiceDurationRange(service)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <DollarSign className="h-4 w-4 text-amber-400" />
                        <span className="text-sm font-medium text-amber-400">
                          {getServicePriceRange(service)}
                        </span>
                      </div>
                      
                      {/* Available Durations */}
                      {service.availableDurations.length > 0 && (
                        <div className="pt-2">
                          <div className="text-xs text-slate-400 mb-2 font-light">
                            Доступные варианты:
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {service.availableDurations.map(({ duration, price }) => (
                              <Badge 
                                key={duration} 
                                variant="outline" 
                                className="text-xs bg-slate-700/50 border-slate-600 text-slate-300 font-light"
                              >
                                {duration}мин - {price}сом
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="pt-4 border-t border-slate-700">
                        <Button 
                          className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-slate-900 font-medium transition-all duration-300"
                        >
                          Записаться на процедуру
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {getServicesByGroup(selectedGroup).length === 0 && (
              <div className="text-center py-12">
                <Sparkles className="mx-auto h-12 w-12 text-slate-600" />
                <h3 className="mt-4 text-lg font-light text-slate-400">
                  Услуги временно недоступны
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  В данной категории пока нет доступных процедур
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-slate-900/80 border-t border-slate-700 py-8 mt-16">
        <div className="container mx-auto px-6 text-center">
          <div className="flex items-center justify-center mb-4">
            <Sparkles className="h-6 w-6 text-amber-400 mr-2" />
            <span className="text-white font-light">Octo CRM</span>
          </div>
          <p className="text-slate-400 text-sm font-light">
            ул. Токтогула, 93 • Бишкек • Кыргызстан
          </p>
        </div>
      </footer>
    </div>
  );
};

export default BookingPage;