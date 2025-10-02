import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Gift, Search, Plus, CheckCircle, Calendar, User, CreditCard } from 'lucide-react';
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
    certificate_number: '',
    amount: 0,
    admin_name: '',
    payment_method: '',
    discount: '',
    expiry_date: '',
    client_name: '',
    phone_number: '',
    service_type: '',
    duration: '',
    master_name: '',
  });
  const [searchNumber, setSearchNumber] = useState('');
  const [selectedCertificate, setSelectedCertificate] = useState<GiftCertificate | null>(null);
  const [masters, setMasters] = useState<string[]>([]);
  const [serviceTypes, setserviceTypes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const fetchResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/gift-certificates?branchId=${currentBranch?.id}`);
        if (fetchResponse.ok) {
          const allCertificates = await fetchResponse.json();
          
          const active = allCertificates.filter((cert: GiftCertificate) => 
            !cert.is_used && !cert.is_expired && new Date(cert.expiry_date) >= new Date()
          );
          const used = allCertificates.filter((cert: GiftCertificate) => 
            cert.is_used || cert.is_expired || new Date(cert.expiry_date) < new Date()
          );
          
          setActiveCertificates(active);
          setUsedCertificates(used);
          
          // Извлекаем мастеров и типы массажа для выпадающих списков
          const allMasters = allCertificates
            .map((c: GiftCertificate) => c.master_name)
            .filter((name: string | undefined): name is string => Boolean(name));
          const allserviceTypes = allCertificates
            .map((c: GiftCertificate) => c.service_type)
            .filter((type: string | undefined): type is string => Boolean(type));
          
          setMasters(Array.from(new Set(allMasters)));
          setserviceTypes(Array.from(new Set(allserviceTypes)));
        }
      } catch (error) {
        toast({
          title: "Ошибка загрузки",
          description: "Не удалось загрузить данные сертификатов",
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

  const addCertificate = async () => {
    if (!newCertificate.certificate_number || !newCertificate.amount || !newCertificate.admin_name || !newCertificate.payment_method || !newCertificate.expiry_date) {
      toast({
        title: "Ошибка валидации",
        description: "Заполните все обязательные поля: номер сертификата, сумма, администратор, способ оплаты, срок действия",
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
          admin_name: newCertificate.admin_name,
          payment_method: newCertificate.payment_method,
          discount: newCertificate.discount || '0%',
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
          admin_name: '',
          payment_method: '',
          discount: '',
          expiry_date: '',
          client_name: '',
          phone_number: '',
          service_type: '',
          duration: '',
          master_name: '',
        });
      }
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить сертификат",
        variant: "destructive"
      });
    }
  };

  const markAsUsed = async (certificate: GiftCertificate) => {
    if (!newCertificate.client_name || !newCertificate.service_type || !newCertificate.duration || !newCertificate.master_name) {
      toast({
        title: "Ошибка валидации",
        description: "Заполните все поля для использования сертификата",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/gift-certificates/${certificate.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_name: newCertificate.client_name,
          phone_number: newCertificate.phone_number,
          service_type: newCertificate.service_type,
          duration: newCertificate.duration,
          master_name: newCertificate.master_name,
          is_used: true
        }),
      });
      
      if (response.ok) {
        const updatedCertificate = await response.json();
        setActiveCertificates(activeCertificates.filter(c => c.id !== certificate.id));
        setUsedCertificates([...usedCertificates, updatedCertificate]);
        setSelectedCertificate(null);
        toast({
          title: "Успех",
          description: "Сертификат успешно использован"
        });
        
        // Очистить поля использования
        setNewCertificate({
          ...newCertificate,
          client_name: '',
          phone_number: '',
          service_type: '',
          duration: '',
          master_name: '',
        });
      }
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось использовать сертификат",
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
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/gift-certificates/search/${searchNumber}?branchId=${currentBranch?.id}`);
      if (response.ok) {
        const found = await response.json();
        setSelectedCertificate(found);
        if (!found) {
          toast({
            title: "Сертификат не найден",
            description: "Сертификат с указанным номером не существует",
            variant: "destructive"
          });
        }
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
    'МБанк - Перевод', 'МБанк - POS',
    'МБизнес - Перевод', 'МБизнес - POS',
    'О!Банк - Перевод', 'О!Банк - POS',
    'Демир - Перевод', 'Демир - POS',
    'Bakai - Перевод', 'Bakai - POS',
    'Оптима - Перевод', 'Оптима - POS',
  ];

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Загрузка данных...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Gift className="h-8 w-8 text-pink-600" />
        <h1 className="text-3xl font-bold text-gray-900">Подарочные сертификаты</h1>
      </div>

      {/* Поиск сертификата */}
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Поиск сертификата
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              value={searchNumber}
              onChange={(e) => setSearchNumber(e.target.value)}
              placeholder="Введите номер сертификата"
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
                <Input
                  name="admin_name"
                  value={newCertificate.admin_name}
                  onChange={handleInputChange}
                  placeholder="Имя администратора*"
                  className="rounded-lg"
                />
                <Select
                  value={newCertificate.payment_method}
                  onValueChange={(value) => setNewCertificate({...newCertificate, payment_method: value})}
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
                  name="discount"
                  value={newCertificate.discount}
                  onChange={handleInputChange}
                  placeholder="Скидка (например, 10%)"
                  className="rounded-lg"
                />
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
                        <User className="h-4 w-4 text-blue-600" />
                        <span className="font-medium">Администратор:</span>
                        <span>{cert.admin_name}</span>
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
                    <Button 
                      onClick={() => setSelectedCertificate(cert)} 
                      variant="outline" 
                      className="rounded-lg"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Отметить как использованный
                    </Button>
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
                <Card key={cert.id} className={`rounded-xl ${cert.is_expired ? 'border-red-200 bg-red-50' : ''}`}>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="flex items-center gap-2">
                        <Gift className="h-4 w-4 text-pink-600" />
                        <span className="font-medium">Номер:</span>
                        <span>{cert.certificate_number}</span>
                        {cert.is_expired && (
                          <Badge variant="destructive" className="rounded-full ml-2">
                            Истек
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-green-600" />
                        <span className="font-medium">Сумма:</span>
                        <span>{cert.amount.toLocaleString()} сом</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-blue-600" />
                        <span className="font-medium">Администратор:</span>
                        <span>{cert.admin_name}</span>
                      </div>
                      {cert.client_name && (
                        <>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-indigo-600" />
                            <span className="font-medium">Клиент:</span>
                            <span>{cert.client_name}</span>
                          </div>
                          {cert.phone_number && (
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Телефон:</span>
                              <span>{cert.phone_number}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Услуга:</span>
                            <Badge variant="outline" className="rounded-full">
                              {cert.service_type}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Длительность:</span>
                            <span>{cert.duration}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Мастер:</span>
                            <span>{cert.master_name}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Форма использования найденного сертификата */}
      {selectedCertificate && (
        <Card className="rounded-xl border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <CheckCircle className="h-5 w-5" />
              Использование сертификата № {selectedCertificate.certificate_number}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <Input
                name="client_name"
                value={newCertificate.client_name}
                onChange={handleInputChange}
                placeholder="Имя клиента*"
                className="rounded-lg"
              />
              <Input
                name="phone_number"
                value={newCertificate.phone_number}
                onChange={handleInputChange}
                placeholder="Номер телефона"
                className="rounded-lg"
              />
              <Select
                value={newCertificate.service_type}
                onValueChange={(value) => setNewCertificate({...newCertificate, service_type: value})}
              >
                <SelectTrigger className="rounded-lg">
                  <SelectValue placeholder="Вид массажа*" />
                </SelectTrigger>
                <SelectContent>
                  {serviceTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                name="duration"
                value={newCertificate.duration}
                onChange={handleInputChange}
                placeholder="Длительность*"
                className="rounded-lg"
              />
              <Select
                value={newCertificate.master_name}
                onValueChange={(value) => setNewCertificate({...newCertificate, master_name: value})}
              >
                <SelectTrigger className="rounded-lg">
                  <SelectValue placeholder="Мастер*" />
                </SelectTrigger>
                <SelectContent>
                  {masters.map(master => (
                    <SelectItem key={master} value={master}>{master}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => markAsUsed(selectedCertificate)} className="rounded-lg">
                <CheckCircle className="h-4 w-4 mr-2" />
                Использовать сертификат
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setSelectedCertificate(null)}
                className="rounded-lg"
              >
                Отмена
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default GiftCertificatesPage;