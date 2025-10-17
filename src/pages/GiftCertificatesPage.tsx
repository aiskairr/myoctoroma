import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Gift, CreditCard, User, Calendar, CheckCircle, Search, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useBranch } from '@/contexts/BranchContext';
import { useLocale } from '@/contexts/LocaleContext';

interface GiftCertificate {
  id: number;
  certificate_number: string;
  amount: number;
  admin_name: string;
  payment_method: string;
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
  const { t } = useLocale();
  const [activeCertificates, setActiveCertificates] = useState<GiftCertificate[]>([]);
  const [usedCertificates, setUsedCertificates] = useState<GiftCertificate[]>([]);
  const [newCertificate, setNewCertificate] = useState({
    certificate_number: '',
    amount: 0,
    payment_method: '',
    expiry_date: ''
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
        // Загружаем все данные параллельно для лучшей производительности
        const [certificatesResponse, mastersResponse, administratorsResponse, serviceTypesResponse] = await Promise.all([
          fetch(`${import.meta.env.VITE_BACKEND_URL}/api/gift-certificates?branchId=${currentBranch.id}`),
          fetch(`${import.meta.env.VITE_BACKEND_URL}/api/crm/masters/${currentBranch.id}`), // Используем dedicated endpoint для мастеров
          fetch(`${import.meta.env.VITE_BACKEND_URL}/api/administrators?branchID=${currentBranch.id}`), // Добавляем фильтр по филиалу
          fetch(`${import.meta.env.VITE_BACKEND_URL}/api/crm/services/${currentBranch.id}`) // Используем services endpoint вместо service-types
        ]);

        // Обрабатываем сертификаты
        if (certificatesResponse.ok) {
          const allCertificates = await certificatesResponse.json();
          const now = new Date();
          
          const active = allCertificates.filter((cert: GiftCertificate) =>
            !cert.is_used && !cert.is_expired && new Date(cert.expiry_date) >= now
          );
          const used = allCertificates.filter((cert: GiftCertificate) =>
            cert.is_used || cert.is_expired || new Date(cert.expiry_date) < now
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
          const serviceTypesData = await serviceTypesResponse.json();
          
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
          title: t('gift_certificates.loading_error'),
          description: t('gift_certificates.loading_failed'),
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
    setNewCertificate({ ...newCertificate, [name]: value });
  };

  const handleUsageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUsageData({ ...usageData, [name]: value });
  };

  const addCertificate = async () => {
    if (!newCertificate.certificate_number || !newCertificate.amount || !newCertificate.payment_method || !newCertificate.expiry_date) {
      toast({
        title: t('gift_certificates.validation_error'),
        description: t('gift_certificates.fill_all_fields'),
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/gift-certificates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          certificate_number: newCertificate.certificate_number,
          amount: Number(newCertificate.amount),
          payment_method: newCertificate.payment_method,
          expiry_date: newCertificate.expiry_date,
          branch_id: currentBranch?.id,
          is_used: false,
          is_expired: false
        }),
      });

      if (response.ok) {
        const savedCertificate = await response.json();
        setActiveCertificates([...activeCertificates, savedCertificate]);
        toast({
          title: t('gift_certificates.success'),
          description: t('gift_certificates.added_success')
        });

        setNewCertificate({
          certificate_number: '',
          amount: 0,
          payment_method: '',
          expiry_date: ''
        });
      } else {
        const errorData = await response.json();
        toast({
          title: t('gift_certificates.error'),
          description: errorData.message || t('gift_certificates.add_failed'),
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: t('gift_certificates.error'),
        description: t('gift_certificates.add_failed'),
        variant: "destructive"
      });
    }
  };

  const markAsUsed = async (certificate: GiftCertificate) => {
    if (!usageData.client_name || !usageData.service_type || !usageData.duration || !usageData.master_name || !usageData.admin_name) {
      toast({
        title: t('gift_certificates.error'),
        description: t('gift_certificates.fill_usage_fields'),
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

        // Используем branch_id из сертификата, если он есть, иначе текущий филиал
        const correctBranchId = certificate.branch_id || currentBranch?.id;

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
            comment: t('gift_certificates.used_certificate_comment', { number: certificate.certificate_number }),
            payment_method: t('gift_certificates.payment_gift_cert'),
            admin_name: usageData.admin_name,
            is_gift_certificate_used: true,
            branch_id: correctBranchId
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
          title: t('gift_certificates.used_success'),
          description: t('gift_certificates.used_and_recorded')
        });
      } else {
        const errorData = await response.json();
        toast({
          title: t('gift_certificates.error'),
          description: errorData.message || t('gift_certificates.mark_failed'),
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: t('gift_certificates.error'),
        description: t('gift_certificates.mark_failed'),
        variant: "destructive"
      });
    }
  };

  const searchCertificate = async () => {
    if (!searchNumber.trim()) {
      toast({
        title: t('gift_certificates.error'),
        description: t('gift_certificates.enter_number'),
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/gift-certificates/search/${searchNumber}`);
      if (response.ok) {
        const certificate = await response.json();
        toast({
          title: t('gift_certificates.found'),
          description: t('gift_certificates.found_details', { number: certificate.certificate_number, amount: certificate.amount })
        });
      } else {
        toast({
          title: t('gift_certificates.not_found_title'),
          description: t('gift_certificates.check_number'),
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: t('gift_certificates.search_error'),
        description: t('gift_certificates.not_found'),
        variant: "destructive"
      });
    }
  };

  const paymentOptions = [
    'Наличные',
    'МБанк - Перевод',
    'МБанк - POS',
    'МБизнес - Перевод',
    'МБизнес - POS',
    'О!Банк - Перевод',
    'О!Банк - POS',
    'Демир - Перевод',
    'Демир - POS',
    'Bakai - Перевод',
    'Bakai - POS',
    'Оптима - Перевод',
    'Оптима - POS',
    'Подарочный Сертификат'
  ];

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="text-center">{t('gift_certificates.loading')}</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t('gift_certificates.page_title')}</h1>
          <p className="text-gray-600 mt-2">{t('gift_certificates.management')}</p>
        </div>
      </div>

      {/* Поиск сертификата */}
      <Card className="rounded-xl">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Input
              value={searchNumber}
              onChange={(e) => setSearchNumber(e.target.value)}
              placeholder={t('gift_certificates.search_placeholder')}
              className="rounded-lg"
            />
            <Button onClick={searchCertificate} className="rounded-lg">
              <Search className="h-4 w-4 mr-2" />
              {t('gift_certificates.search_button')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2 rounded-lg">
          <TabsTrigger value="active">{t('gift_certificates.active_tab')} ({activeCertificates.length})</TabsTrigger>
          <TabsTrigger value="used">{t('gift_certificates.used_tab')} ({usedCertificates.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-6">
          {/* Форма добавления нового сертификата */}
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                {t('gift_certificates.add_new')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <Input
                  name="certificate_number"
                  value={newCertificate.certificate_number}
                  onChange={handleInputChange}
                  placeholder={`${t('gift_certificates.certificate_number')}*`}
                  className="rounded-lg"
                />
                <Input
                  type="number"
                  name="amount"
                  value={newCertificate.amount}
                  onChange={handleInputChange}
                  placeholder={`${t('gift_certificates.amount')}*`}
                  className="rounded-lg"
                />

                <Select
                  value={newCertificate.payment_method}
                  onValueChange={(value) => setNewCertificate({ ...newCertificate, payment_method: value })}
                >
                  <SelectTrigger className="rounded-lg">
                    <SelectValue placeholder={`${t('gift_certificates.payment_method')}*`} />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentOptions.map(option => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  type="date"
                  name="expiry_date"
                  value={newCertificate.expiry_date}
                  onChange={handleInputChange}
                  className="rounded-lg"
                />
              </div>
              <Button onClick={addCertificate} className="w-full rounded-lg">
                <Plus className="h-4 w-4 mr-2" />
                {t('gift_certificates.add_button')}
              </Button>
            </CardContent>
          </Card>

          {/* Список активных сертификатов */}
          <div className="grid gap-4">
            {activeCertificates.length === 0 ? (
              <Card className="rounded-xl">
                <CardContent className="pt-6">
                  <div className="text-center text-gray-500">
                    {t('gift_certificates.no_active')}
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
                        <span className="font-medium">{t('gift_certificates.number_label')}:</span>
                        <span>{cert.certificate_number}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-green-600" />
                        <span className="font-medium">{t('gift_certificates.amount_label')}:</span>
                        <span>{cert.amount.toLocaleString()} сом</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-purple-600" />
                        <span className="font-medium">{t('gift_certificates.payment_label')}:</span>
                        <span>{cert.payment_method}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{t('gift_certificates.discount_label')}:</span>
                        <Badge variant="secondary" className="rounded-full">
                          {cert.discount || '0%'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-orange-600" />
                        <span className="font-medium">{t('gift_certificates.expiry_label')}:</span>
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
                          {t('gift_certificates.mark_as_used')}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="rounded-xl max-w-md">
                        <DialogHeader>
                          <DialogTitle>{t('gift_certificates.usage_title')}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <Select
                            value={usageData.admin_name}
                            onValueChange={(value) => setUsageData({ ...usageData, admin_name: value })}
                          >
                            <SelectTrigger className="rounded-lg">
                              <SelectValue placeholder={`${t('gift_certificates.select_admin')}*`} />
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
                            placeholder={`${t('gift_certificates.client_name')}*`}
                            className="rounded-lg"
                          />
                          <Input
                            name="phone_number"
                            value={usageData.phone_number}
                            onChange={handleUsageInputChange}
                            placeholder={t('gift_certificates.phone_number')}
                            className="rounded-lg"
                          />
                          <Select
                            value={usageData.service_type}
                            onValueChange={handleServiceTypeChange}
                          >
                            <SelectTrigger className="rounded-lg">
                              <SelectValue placeholder={t('gift_certificates.select_service_type')} />
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
                                  ? t('gift_certificates.select_service_first')
                                  : durationOptions.length === 0 
                                    ? t('gift_certificates.no_durations')
                                    : t('gift_certificates.select_duration')
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
                              <SelectValue placeholder={t('gift_certificates.select_master')} />
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
                        <span className="font-medium">{t('gift_certificates.number_label')}:</span>
                        <span>{cert.certificate_number}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-green-600" />
                        <span className="font-medium">{t('gift_certificates.amount_label')}:</span>
                        <span>{cert.amount.toLocaleString()} сом</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-blue-600" />
                        <span className="font-medium">{t('gift_certificates.client_label')}:</span>
                        <span>{cert.client_name || t('gift_certificates.not_specified')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-purple-600" />
                        <span className="font-medium">{t('gift_certificates.phone_label')}:</span>
                        <span>{cert.phone_number || t('gift_certificates.not_specified')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{t('gift_certificates.service_type_label')}:</span>
                        <span>{cert.service_type || t('gift_certificates.not_specified')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{t('gift_certificates.duration_label')}:</span>
                        <span>{cert.duration || t('gift_certificates.not_specified_f')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{t('gift_certificates.master_label')}:</span>
                        <span>{cert.master_name || t('gift_certificates.not_specified')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-orange-600" />
                        <span className="font-medium">{t('gift_certificates.admin_label')}:</span>
                        <span>{cert.admin_name || t('gift_certificates.not_specified')}</span>
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