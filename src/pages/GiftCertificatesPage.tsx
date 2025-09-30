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
  massage_type?: string;
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
    certificate_number: '',
    amount: 0,
    payment_method: '',
    expiry_date: ''
  });
  const [usageData, setUsageData] = useState({
    client_name: '',
    phone_number: '',
    massage_type: '',
    duration: '',
    master_name: '',
    admin_name: ''
  });
  const [searchNumber, setSearchNumber] = useState('');
  const [selectedCertificate, setSelectedCertificate] = useState<GiftCertificate | null>(null);
  const [isUsageDialogOpen, setIsUsageDialogOpen] = useState(false);
  const [masters, setMasters] = useState<string[]>([]);
  const [administrators, setAdministrators] = useState<string[]>([]);
  const [massageTypes, setMassageTypes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Загружаем сертификаты
        const certificatesResponse = await fetch(`/api/gift-certificates?branchId=${currentBranch?.id}`);
        if (certificatesResponse.ok) {
          const allCertificates = await certificatesResponse.json();

          const active = allCertificates.filter((cert: GiftCertificate) =>
            !cert.is_used && !cert.is_expired && new Date(cert.expiry_date) >= new Date()
          );
          const used = allCertificates.filter((cert: GiftCertificate) =>
            cert.is_used || cert.is_expired || new Date(cert.expiry_date) < new Date()
          );

          setActiveCertificates(active);
          setUsedCertificates(used);
        }

        // Загружаем мастеров из таблицы salaries
        const mastersResponse = await fetch(`/api/employees?role=мастер`);
        if (mastersResponse.ok) {
          const mastersData = await mastersResponse.json();
          const masterNames = mastersData.map((m: any) => m.name).filter((name: string) => Boolean(name));
          setMasters(Array.from(new Set(masterNames)));
        }

        // Загружаем администраторов из таблицы salaries
        const administratorsResponse = await fetch(`/api/employees?role=администратор`);
        if (administratorsResponse.ok) {
          const administratorsData = await administratorsResponse.json();
          const adminNames = administratorsData.map((a: any) => a.name).filter((name: string) => Boolean(name));
          setAdministrators(Array.from(new Set(adminNames)));
        }

        // Загружаем типы массажа из таблицы client_tasks
        const massageTypesResponse = await fetch(`/api/massage-types?branchId=${currentBranch?.id}`);
        if (massageTypesResponse.ok) {
          const massageTypesData = await massageTypesResponse.json();
          const typeNames = massageTypesData.map((t: any) => t.massage_type).filter((type: string) => Boolean(type));
          setMassageTypes(Array.from(new Set(typeNames)));
        }
      } catch (error) {
        toast({
          title: "Ошибка загрузки",
          description: "Не удалось загрузить данные",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [currentBranch, toast]);

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
        title: "Ошибка валидации",
        description: "Заполните все обязательные поля: номер сертификата, сумма, способ оплаты, срок действия",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch('/api/gift-certificates', {
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
          title: "Успех",
          description: "Сертификат успешно добавлен"
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
    if (!usageData.client_name || !usageData.massage_type || !usageData.duration || !usageData.master_name || !usageData.admin_name) {
      toast({
        title: "Ошибка",
        description: "Заполните все поля для использования сертификата",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch(`/api/gift-certificates/${certificate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...certificate,
          client_name: usageData.client_name,
          phone_number: usageData.phone_number,
          massage_type: usageData.massage_type,
          duration: usageData.duration,
          master_name: usageData.master_name,
          admin_name: usageData.admin_name,
          is_used: true
        })
      });

      if (response.ok) {
        const updatedCert = await response.json();

        // Создаем запись в бухгалтерии для использованного сертификата
        const accountingResponse = await fetch('/api/accounting', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            master: usageData.master_name,
            client: usageData.client_name,
            massage_type: usageData.massage_type,
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
          massage_type: '',
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
      const response = await fetch(`/api/gift-certificates/search/${searchNumber}`);
      if (response.ok) {
        const certificate = await response.json();
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

  const durationOptions = ['30 мин', '45 мин', '60 мин', '90 мин', '120 мин'];

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
                <Input
                  name="certificate_number"
                  value={newCertificate.certificate_number}
                  onChange={handleInputChange}
                  placeholder="Номер сертификата*"
                  className="rounded-lg"
                />
                <Input
                  type="number"
                  name="amount"
                  value={newCertificate.amount}
                  onChange={handleInputChange}
                  placeholder="Сумма*"
                  className="rounded-lg"
                />

                <Select
                  value={newCertificate.payment_method}
                  onValueChange={(value) => setNewCertificate({ ...newCertificate, payment_method: value })}
                >
                  <SelectTrigger className="rounded-lg">
                    <SelectValue placeholder="Способ оплаты*" />
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
                        <span>{cert.payment_method}</span>
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
                            value={usageData.massage_type}
                            onValueChange={(value) => setUsageData({ ...usageData, massage_type: value })}
                          >
                            <SelectTrigger className="rounded-lg">
                              <SelectValue placeholder="Выберите тип массажа*" />
                            </SelectTrigger>
                            <SelectContent>
                              {massageTypes.map(type => (
                                <SelectItem key={type} value={type}>{type}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select
                            value={usageData.duration}
                            onValueChange={(value) => setUsageData({ ...usageData, duration: value })}
                          >
                            <SelectTrigger className="rounded-lg">
                              <SelectValue placeholder="Выберите длительность*" />
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
                        <span>{cert.massage_type || 'Не указан'}</span>
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