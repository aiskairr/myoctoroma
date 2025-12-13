import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, Gift, CreditCard, User, Calendar, CheckCircle, Search, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useBranch } from '@/contexts/BranchContext';

interface GiftCertificate {
  id: number;
  certificate_number: string;
  amount: number;
  admin_name?: string;
  payment_method: any;
  discount: string;
  expiry_date: string;
  client_name?: string;
  phone_number?: string;
  service_type?: string;
  duration?: string;
  master_name?: string;
  is_used: boolean;
  is_expired: boolean;
  branch_id: string;
}

const GiftCertificatesPage = () => {
  const { currentBranch } = useBranch();
  const { toast } = useToast();
  const [activeCertificates, setActiveCertificates] = useState<GiftCertificate[]>([]);
  const [usedCertificates, setUsedCertificates] = useState<GiftCertificate[]>([]);
  const [newCertificate, setNewCertificate] = useState({
    amount: 0,
    discount: 0,
    expiryDate: '',
    paymentMethod: [] as Array<{ type: string; name?: string; amount: number }>,
    createdBy: { id: 0, firstname: '', role: 'manager' as 'manager' }
  });
  const [usageData, setUsageData] = useState({
    client_name: '',
    phone_number: '',
    service_type: '',
    duration: '',
    master_name: '',
    admin_name: ''
  });
  const [searchNumber, setSearchNumber] = useState('');
  const [selectedCertificate, setSelectedCertificate] = useState<GiftCertificate | null>(null);
  const [isUsageDialogOpen, setIsUsageDialogOpen] = useState(false);
  const [masters, setMasters] = useState<string[]>([]);
  const [administrators, setAdministrators] = useState<string[]>([]);
  const [serviceTypes, setserviceTypes] = useState<string[]>([]);
  const [servicesData, setServicesData] = useState<any[]>([]); // Полные данные услуг
  const [durationOptions, setDurationOptions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fromTyiyn = (value: number | string | null | undefined) => {
    if (value === null || value === undefined) return 0;
    const numeric = typeof value === 'string' ? parseFloat(value) : Number(value);
    if (!Number.isFinite(numeric)) return 0;
    return numeric / 100;
  };

  // Функция для получения доступных длительностей для конкретной услуги
  const getDurationsForService = (serviceName: string): string[] => {
    const service = servicesData.find(s => s.name === serviceName);
    if (!service) return [];

    const durations = new Set<number>();
    
    // Проверяем все поля длительностей
    const durationFields = [
      'duration10_price', 'duration15_price', 'duration20_price', 'duration30_price',
      'duration40_price', 'duration50_price', 'duration60_price', 'duration75_price',
      'duration80_price', 'duration90_price', 'duration110_price', 'duration120_price',
      'duration150_price', 'duration220_price'
    ];

    durationFields.forEach(field => {
      if (service[field] && service[field] > 0) {
        const duration = parseInt(field.replace('duration', '').replace('_price', ''));
        durations.add(duration);
      }
    });

    // Добавляем defaultDuration, если есть
    if (service.defaultDuration) {
      durations.add(service.defaultDuration);
    }

    // Конвертируем в отсортированный массив строк
    return Array.from(durations)
      .sort((a, b) => a - b)
      .map(duration => `${duration} мин`);
  };

  // Обработчик изменения типа услуги
  const handleServiceTypeChange = (serviceType: string) => {
    setUsageData({ ...usageData, service_type: serviceType, duration: '' }); // Сбрасываем длительность
    const availableDurations = getDurationsForService(serviceType);
    setDurationOptions(availableDurations);
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!currentBranch?.id) return;
      
      setIsLoading(true);
      try {
        const token = localStorage.getItem('auth_token');
        const authHeaders: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};
        
        // Загружаем все данные параллельно для лучшей производительности
        const [certificatesResponse, mastersResponse, administratorsResponse, serviceTypesResponse] = await Promise.all([
          fetch(`${import.meta.env.VITE_BACKEND_URL}/gift-certificates?branchId=${currentBranch.id}`, { headers: authHeaders }),
          fetch(`${import.meta.env.VITE_BACKEND_URL}/staff/${currentBranch.id}`, { headers: authHeaders }), // Используем dedicated endpoint для мастеров
          fetch(`${import.meta.env.VITE_BACKEND_URL}/api/administrators?branchID=${currentBranch.id}`, { headers: authHeaders }), // Добавляем фильтр по филиалу
          fetch(`${import.meta.env.VITE_BACKEND_URL}/services?branchId=${currentBranch.id}&page=1&limit=1000`, { headers: authHeaders }) // Используем services endpoint вместо service-types
        ]);

        // Обрабатываем сертификаты
        if (certificatesResponse.ok) {
          const allCertificates = await certificatesResponse.json();
          const now = new Date();
          const list: GiftCertificate[] = (allCertificates || []).map((c: any) => ({
            id: c.id,
            certificate_number: c.certificate_number,
            amount: fromTyiyn(c.amount),
            discount: c.discount,
            expiry_date: c.expiry_date,
            payment_method: Array.isArray(c.payment_method)
              ? c.payment_method.map((pm: any) => ({ ...pm, amount: fromTyiyn(pm.amount) }))
              : c.payment_method,
            branch_id: String(c.branch_id),
            is_used: c.status === 'used',
            is_expired: c.status === 'expired' || new Date(c.expiry_date) < now,
          }));
          const active = list.filter((cert: GiftCertificate) =>
            !cert.is_used && !cert.is_expired
          );
          const used = list.filter((cert: GiftCertificate) =>
            cert.is_used || cert.is_expired
          );
          setActiveCertificates(active);
          setUsedCertificates(used);
        } else {
          console.error('Failed to load certificates:', certificatesResponse.status);
        }

        // Обрабатываем мастеров
        if (mastersResponse.ok) {
          const mastersData = await mastersResponse.json();
          const masterNames = mastersData
            .filter((m: any) => m.isActive && m.name) // Только активные мастера с именами
            .map((m: any) => m.name as string);
          setMasters(Array.from(new Set(masterNames)));
        } else {
          console.error('Failed to load masters:', mastersResponse.status);
          // Fallback: пробуем альтернативный endpoint
          try {
            const fallbackResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/employees?role=мастер&branchId=${currentBranch.id}`);
            if (fallbackResponse.ok) {
              const mastersData = await fallbackResponse.json();
              const masterNames = mastersData
                .filter((m: any) => m.name)
                .map((m: any) => m.name as string);
              setMasters(Array.from(new Set(masterNames)));
            }
          } catch (fallbackError) {
            console.error('Fallback masters loading failed:', fallbackError);
          }
        }

        // Обрабатываем администраторов
        if (administratorsResponse.ok) {
          const administratorsData = await administratorsResponse.json();
          const adminNames = administratorsData
            .filter((a: any) => a.name) // Только записи с именами
            .map((a: any) => a.name as string);
          setAdministrators(Array.from(new Set(adminNames)));
        } else {
          console.error('Failed to load administrators:', administratorsResponse.status);
        }

        // Обрабатываем типы услуг
        if (serviceTypesResponse.ok) {
          const serviceTypesResult = await serviceTypesResponse.json();
          // API возвращает пагинированный ответ { data: [...] }
          const serviceTypesData = serviceTypesResult.data || [];
          
          // Сохраняем полные данные услуг
          setServicesData(serviceTypesData);
          
          // Извлекаем только названия активных услуг
          const typeNames = serviceTypesData
            .filter((s: any) => s.name && s.isActive !== false) // Только активные услуги
            .map((s: any) => s.name as string);
          setserviceTypes(Array.from(new Set(typeNames)));

          // Пока не выбрана услуга, показываем пустой список длительностей
          setDurationOptions([]);
        } else {
          console.error('Failed to load service types:', serviceTypesResponse.status);
          // Fallback: пробуем альтернативный endpoint
          try {
            const fallbackResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/service-types?branchId=${currentBranch.id}`);
            if (fallbackResponse.ok) {
              const serviceTypesData = await fallbackResponse.json();
              const typeNames = serviceTypesData
                .filter((t: any) => t.service_type)
                .map((t: any) => t.service_type as string);
              setserviceTypes(Array.from(new Set(typeNames)));
              
              // Устанавливаем длительности по умолчанию в случае fallback
              setDurationOptions([]);
            }
          } catch (fallbackError) {
            console.error('Fallback service types loading failed:', fallbackError);
            // Устанавливаем длительности по умолчанию при ошибке
            setDurationOptions([]);
          }
        }

      } catch (error) {
        console.error('Error loading data:', error);
        toast({
          title: "Ошибка загрузки",
          description: "Не удалось загрузить данные. Проверьте подключение к интернету.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [currentBranch?.id, toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewCertificate({ ...newCertificate, [name]: name === 'amount' || name === 'discount' ? Number(value) : value });
  };

  const handleUsageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUsageData({ ...usageData, [name]: value });
  };

  const addCertificate = async () => {
    if (!currentBranch?.id) {
      toast({ title: "Ошибка", description: "Выберите филиал", variant: "destructive" });
      return;
    }
    if (!newCertificate.amount || !newCertificate.expiryDate) {
      toast({
        title: "Ошибка валидации",
        description: "Заполните обязательные поля: сумма, срок действия",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/gift-certificates?branchId=${currentBranch.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
        },
        body: JSON.stringify({
          amount: Number(newCertificate.amount),
          discount: Number(newCertificate.discount) || 0,
          expiryDate: newCertificate.expiryDate,
          paymentMethod: newCertificate.paymentMethod.length > 0 ? newCertificate.paymentMethod : undefined,
          createdBy: newCertificate.createdBy.id ? newCertificate.createdBy : undefined
        }),
      });

      if (response.ok) {
        const saved = await response.json();
        const savedCertRaw = saved?.certificate || saved;
        const savedCertificate: GiftCertificate = {
          id: savedCertRaw.id,
          certificate_number: savedCertRaw.certificate_number,
          amount: savedCertRaw.amount,
          discount: savedCertRaw.discount,
          expiry_date: savedCertRaw.expiry_date,
          payment_method: savedCertRaw.payment_method,
          branch_id: String(savedCertRaw.branch_id),
          is_used: savedCertRaw.status === 'used',
          is_expired: savedCertRaw.status === 'expired',
        };
        setActiveCertificates([...activeCertificates, savedCertificate]);
        toast({
          title: "Успех",
          description: "Сертификат успешно добавлен"
        });

        setNewCertificate({
          amount: 0,
          discount: 0,
          expiryDate: '',
          paymentMethod: [],
          createdBy: { id: 0, firstname: '', role: 'manager' }
        });
      } else {
        const errorData = await response.json();
        toast({
          title: "Ошибка",
          description: errorData.message || "Не удалось добавить сертификат",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось добавить сертификат",
        variant: "destructive"
      });
    }
  };

  const markAsUsed = async (certificate: GiftCertificate) => {
    if (!usageData.client_name || !usageData.service_type || !usageData.duration || !usageData.master_name || !usageData.admin_name) {
      toast({
        title: "Ошибка",
        description: "Заполните все поля для использования сертификата",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/gift-certificates/${certificate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...certificate,
          client_name: usageData.client_name,
          phone_number: usageData.phone_number,
          service_type: usageData.service_type,
          duration: usageData.duration,
          master_name: usageData.master_name,
          admin_name: usageData.admin_name,
          is_used: true
        })
      });

      if (response.ok) {
        const updatedCert = await response.json();

        // Создаем запись в бухгалтерии для использованного сертификата
        const accountingResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/accounting`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            master: usageData.master_name,
            client: usageData.client_name,
            service_type: usageData.service_type,
            phone_number: usageData.phone_number || '',
            amount: certificate.amount,
            discount: certificate.discount || '0%',
            duration: usageData.duration,
            comment: `Использован подарочный сертификат №${certificate.certificate_number}`,
            payment_method: 'Подарочный сертификат',
            admin_name: usageData.admin_name,
            is_gift_certificate_used: true,
            branch_id: currentBranch?.id
          })
        });

        if (!accountingResponse.ok) {
          console.error('Failed to create accounting record for gift certificate');
        }

        setActiveCertificates(activeCertificates.filter(c => c.id !== certificate.id));
        setUsedCertificates([...usedCertificates, updatedCert]);
        setSelectedCertificate(null);
        setIsUsageDialogOpen(false);
        setUsageData({
          client_name: '',
          phone_number: '',
          service_type: '',
          duration: '',
          master_name: '',
          admin_name: ''
        });
        toast({
          title: "Успешно",
          description: "Сертификат отмечен как использованный и добавлен в бухгалтерию"
        });
      } else {
        const errorData = await response.json();
        toast({
          title: "Ошибка",
          description: errorData.message || "Не удалось отметить сертификат как использованный",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось отметить сертификат как использованный",
        variant: "destructive"
      });
    }
  };

  const searchCertificate = async () => {
    if (!searchNumber.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите номер сертификата для поиска",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_SECONDARY_BACKEND_URL}/gift-certificates?branchId=${currentBranch?.id || ''}&certificateNumber=${encodeURIComponent(searchNumber)}`);
      if (response.ok) {
        const list = await response.json();
        const certificate = Array.isArray(list) ? list.find((c: any) => c.certificate_number === searchNumber) : list;
        toast({
          title: "Сертификат найден",
          description: `Сертификат ${certificate.certificate_number} на сумму ${certificate.amount} сом`
        });
      } else {
        toast({
          title: "Сертификат не найден",
          description: "Проверьте правильность введенного номера",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Ошибка поиска",
        description: "Не удалось найти сертификат",
        variant: "destructive"
      });
    }
  };

  const paymentTypes = ['cash', 'transfer', 'pos'];

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="text-center">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Подарочные сертификаты</h1>
          <p className="text-gray-600 mt-2">Управление подарочными сертификатами</p>
        </div>
      </div>

      {/* Поиск сертификата */}
      <Card className="rounded-xl">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Input
              value={searchNumber}
              onChange={(e) => setSearchNumber(e.target.value)}
              placeholder="Введите номер сертификата для поиска"
              className="rounded-lg"
            />
            <Button onClick={searchCertificate} className="rounded-lg">
              <Search className="h-4 w-4 mr-2" />
              Найти
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2 rounded-lg">
          <TabsTrigger value="active">Активные сертификаты ({activeCertificates.length})</TabsTrigger>
          <TabsTrigger value="used">Использованные сертификаты ({usedCertificates.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-6">
          {/* Форма добавления нового сертификата */}
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Добавить новый сертификат
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="space-y-2">
                  <Label htmlFor="gc-amount">Сумма*</Label>
                  <Input
                    id="gc-amount"
                    type="number"
                    name="amount"
                    value={newCertificate.amount}
                    onChange={handleInputChange}
                    placeholder="Например 5 000"
                    className="rounded-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gc-discount">Скидка</Label>
                  <Input
                    id="gc-discount"
                    type="number"
                    name="discount"
                    value={Number(newCertificate.discount)}
                    onChange={handleInputChange}
                    placeholder="Например 10.5"
                    className="rounded-lg"
                  />
                </div>

                <div className="col-span-1 md:col-span-2 space-y-3">
                  <div className="text-sm font-medium">Оплата (опционально)</div>
                  {(newCertificate.paymentMethod.length === 0 ? [0] : newCertificate.paymentMethod).map((pm, idx) => {
                    const val = newCertificate.paymentMethod[idx] || { type: '', name: '', amount: 0 };
                    return (
                      <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor={`gc-payment-type-${idx}`}>Тип оплаты</Label>
                          <Select
                            value={val.type}
                            onValueChange={(value) => {
                              const next = [...newCertificate.paymentMethod];
                              next[idx] = { ...val, type: value as any };
                              setNewCertificate({ ...newCertificate, paymentMethod: next });
                            }}
                          >
                            <SelectTrigger id={`gc-payment-type-${idx}`} className="rounded-lg">
                              <SelectValue placeholder="Выберите тип" />
                            </SelectTrigger>
                            <SelectContent>
                              {paymentTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`gc-payment-name-${idx}`}>Название банка / комментарий</Label>
                          <Input
                            id={`gc-payment-name-${idx}`}
                            placeholder="Например Demir Bank"
                            value={val.name || ''}
                            onChange={(e) => {
                              const next = [...newCertificate.paymentMethod];
                              next[idx] = { ...val, name: e.target.value };
                              setNewCertificate({ ...newCertificate, paymentMethod: next });
                            }}
                            className="rounded-lg"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`gc-payment-amount-${idx}`}>Сумма оплаты</Label>
                          <Input
                            id={`gc-payment-amount-${idx}`}
                            type="number"
                            placeholder="0"
                            value={val.amount || 0}
                            onChange={(e) => {
                              const next = [...newCertificate.paymentMethod];
                              next[idx] = { ...val, amount: Number(e.target.value) };
                              setNewCertificate({ ...newCertificate, paymentMethod: next });
                            }}
                            className="rounded-lg"
                          />
                        </div>
                      </div>
                    );
                  })}
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-lg"
                    onClick={() => setNewCertificate({ ...newCertificate, paymentMethod: [...newCertificate.paymentMethod, { type: '', name: '', amount: 0 }] })}
                  >
                    Добавить способ оплаты
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gc-expiry">Срок действия</Label>
                  <Input
                    id="gc-expiry"
                    type="date"
                    name="expiryDate"
                    value={newCertificate.expiryDate}
                    onChange={handleInputChange}
                    className="rounded-lg"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 col-span-1 md:col-span-2">
                  <div className="space-y-2">
                    <Label htmlFor="gc-creator-id">ID создателя</Label>
                    <Input
                      id="gc-creator-id"
                      type="number"
                      placeholder="Опционально"
                      value={newCertificate.createdBy.id || 0}
                      onChange={(e) => setNewCertificate({ ...newCertificate, createdBy: { ...newCertificate.createdBy, id: Number(e.target.value) } })}
                      className="rounded-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gc-creator-name">Имя создателя</Label>
                    <Input
                      id="gc-creator-name"
                      placeholder="Опционально"
                      value={newCertificate.createdBy.firstname}
                      onChange={(e) => setNewCertificate({ ...newCertificate, createdBy: { ...newCertificate.createdBy, firstname: e.target.value } })}
                      className="rounded-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gc-creator-role">Роль</Label>
                    <Input
                      id="gc-creator-role"
                      placeholder="manager / admin"
                      value={newCertificate.createdBy.role}
                      onChange={(e) => setNewCertificate({ ...newCertificate, createdBy: { ...newCertificate.createdBy, role: e.target.value as any } })}
                      className="rounded-lg"
                    />
                  </div>
                </div>
              </div>
              <Button onClick={addCertificate} className="w-full rounded-lg">
                <Plus className="h-4 w-4 mr-2" />
                Добавить сертификат
              </Button>
            </CardContent>
          </Card>

          {/* Список активных сертификатов */}
          <div className="grid gap-4">
            {activeCertificates.length === 0 ? (
              <Card className="rounded-xl">
                <CardContent className="pt-6">
                  <div className="text-center text-gray-500">
                    Нет активных сертификатов
                  </div>
                </CardContent>
              </Card>
            ) : (
              activeCertificates.map((cert) => (
                <Card key={cert.id} className="rounded-xl">
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <Gift className="h-4 w-4 text-pink-600" />
                        <span className="font-medium">Номер:</span>
                        <span>{cert.certificate_number}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-green-600" />
                        <span className="font-medium">Сумма:</span>
                        <span>{cert.amount.toLocaleString()} сом</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-purple-600" />
                        <span className="font-medium">Оплата:</span>
                        <span>
                          {Array.isArray(cert.payment_method)
                            ? cert.payment_method.map((pm: any) => `${pm.type}${pm.name ? ` ${pm.name}` : ''}: ${pm.amount}`).join(', ')
                            : (typeof cert.payment_method === 'string' ? cert.payment_method : '—')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Скидка:</span>
                        <Badge variant="secondary" className="rounded-full">
                          {cert.discount || '0%'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-orange-600" />
                        <span className="font-medium">Срок действия:</span>
                        <span>{new Date(cert.expiry_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <Dialog open={isUsageDialogOpen} onOpenChange={setIsUsageDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          className="rounded-lg"
                          onClick={() => {
                            setSelectedCertificate(cert);
                            setIsUsageDialogOpen(true);
                          }}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Отметить как использованный
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="rounded-xl max-w-md">
                        <DialogHeader>
                          <DialogTitle>Использование сертификата</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <Select
                            value={usageData.admin_name}
                            onValueChange={(value) => setUsageData({ ...usageData, admin_name: value })}
                          >
                            <SelectTrigger className="rounded-lg">
                              <SelectValue placeholder="Выберите администратора*" />
                            </SelectTrigger>
                            <SelectContent>
                              {administrators.map(admin => (
                                <SelectItem key={admin} value={admin}>{admin}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            name="client_name"
                            value={usageData.client_name}
                            onChange={handleUsageInputChange}
                            placeholder="Имя клиента*"
                            className="rounded-lg"
                          />
                          <Input
                            name="phone_number"
                            value={usageData.phone_number}
                            onChange={handleUsageInputChange}
                            placeholder="Номер телефона"
                            className="rounded-lg"
                          />
                          <Select
                            value={usageData.service_type}
                            onValueChange={handleServiceTypeChange}
                          >
                            <SelectTrigger className="rounded-lg">
                              <SelectValue placeholder="Выберите тип массажа*" />
                            </SelectTrigger>
                            <SelectContent>
                              {serviceTypes.map(type => (
                                <SelectItem key={type} value={type}>{type}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select
                            value={usageData.duration}
                            onValueChange={(value) => setUsageData({ ...usageData, duration: value })}
                            disabled={!usageData.service_type || durationOptions.length === 0}
                          >
                            <SelectTrigger className="rounded-lg">
                              <SelectValue placeholder={
                                !usageData.service_type 
                                  ? "Сначала выберите услугу" 
                                  : durationOptions.length === 0 
                                    ? "Нет доступных длительностей" 
                                    : "Выберите длительность*"
                              } />
                            </SelectTrigger>
                            <SelectContent>
                              {durationOptions.map(duration => (
                                <SelectItem key={duration} value={duration}>{duration}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select
                            value={usageData.master_name}
                            onValueChange={(value) => setUsageData({ ...usageData, master_name: value })}
                          >
                            <SelectTrigger className="rounded-lg">
                              <SelectValue placeholder="Выберите мастера*" />
                            </SelectTrigger>
                            <SelectContent>
                              {masters.map(master => (
                                <SelectItem key={master} value={master}>{master}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            onClick={() => selectedCertificate && markAsUsed(selectedCertificate)}
                            className="w-full rounded-lg"
                            disabled={!selectedCertificate}
                          >
                            Отметить как использованный
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="used" className="space-y-6">
          <div className="grid gap-4">
            {usedCertificates.length === 0 ? (
              <Card className="rounded-xl">
                <CardContent className="pt-6">
                  <div className="text-center text-gray-500">
                    Нет использованных сертификатов
                  </div>
                </CardContent>
              </Card>
            ) : (
              usedCertificates.map((cert) => (
                <Card key={cert.id} className="rounded-xl">
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="flex items-center gap-2">
                        <Gift className="h-4 w-4 text-pink-600" />
                        <span className="font-medium">Номер:</span>
                        <span>{cert.certificate_number}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-green-600" />
                        <span className="font-medium">Сумма:</span>
                        <span>{cert.amount.toLocaleString()} сом</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-blue-600" />
                        <span className="font-medium">Клиент:</span>
                        <span>{cert.client_name || 'Не указан'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-purple-600" />
                        <span className="font-medium">Телефон:</span>
                        <span>{cert.phone_number || 'Не указан'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Тип массажа:</span>
                        <span>{cert.service_type || 'Не указан'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Длительность:</span>
                        <span>{cert.duration || 'Не указана'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Мастер:</span>
                        <span>{cert.master_name || 'Не указан'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-orange-600" />
                        <span className="font-medium">Администратор:</span>
                        <span>{cert.admin_name || 'Не указан'}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GiftCertificatesPage;
