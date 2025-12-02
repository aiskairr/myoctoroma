import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Calendar,
  User,
  DollarSign,
  Calculator,
  Plus,
  TrendingUp,
  Wallet,
  AlertCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useBranch } from '@/contexts/BranchContext';
import { useAuth } from '@/contexts/SimpleAuthContext';
import { getBranchIdWithFallback } from '@/utils/branch-utils';
import { useLocale } from '@/contexts/LocaleContext';
import { salaryService } from '@/services/salary-service';
import type {
  SalaryResponse,
  CreateSalaryRequest,
} from '@/services/salary-service';

export default function SalaryPageNew() {
  const { currentBranch, branches } = useBranch();
  const { user } = useAuth();
  const { t } = useLocale();
  const { toast } = useToast();

  // Состояния
  const [salaryData, setSalaryData] = useState<SalaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  });

  // Состояния для создания новой записи
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newSalaryForm, setNewSalaryForm] = useState({
    staffId: '',
    firstname: '',
    lastname: '',
    role: '',
    baseSalary: '',
    commissionRate: '',
  });

  // Загрузка данных о зарплатах
  const fetchSalaryData = async () => {
    setIsLoading(true);
    try {
      const branchId = getBranchIdWithFallback(currentBranch, branches);

      if (!branchId) {
        console.warn('Branch ID не определен');
        setIsLoading(false);
        return;
      }

      const data = await salaryService.getSalaryData(
        Number(branchId),
        startDate,
        endDate
      );

      if (data) {
        setSalaryData(data);
      } else {
        toast({
          title: t('salary.error'),
          description: t('salary.failed_to_load'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Ошибка загрузки данных зарплат:', error);
      toast({
        title: t('salary.error'),
        description: error instanceof Error ? error.message : t('salary.failed_to_load'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSalaryData();
  }, [startDate, endDate, currentBranch, branches]);

  // Создание новой записи о зарплате
  const handleCreateSalary = async () => {
    if (!user) {
      toast({
        title: 'Ошибка',
        description: 'Пользователь не авторизован',
        variant: 'destructive',
      });
      return;
    }

    // Получаем branchId
    const branchId = getBranchIdWithFallback(currentBranch, branches);
    if (!branchId) {
      toast({
        title: 'Ошибка',
        description: 'Филиал не выбран',
        variant: 'destructive',
      });
      return;
    }

    // Валидация
    if (
      !newSalaryForm.staffId ||
      !newSalaryForm.firstname ||
      !newSalaryForm.lastname ||
      !newSalaryForm.role ||
      !newSalaryForm.baseSalary ||
      !newSalaryForm.commissionRate
    ) {
      toast({
        title: 'Ошибка',
        description: 'Заполните все обязательные поля',
        variant: 'destructive',
      });
      return;
    }

    const requestData: CreateSalaryRequest = {
      staff: {
        id: Number(newSalaryForm.staffId),
        firstname: newSalaryForm.firstname,
        lastname: newSalaryForm.lastname,
        role: newSalaryForm.role,
      },
      baseSalary: Number(newSalaryForm.baseSalary),
      commissionRate: Number(newSalaryForm.commissionRate),
      createdBy: {
        id: user.id,
        firstname: user.firstname || (user as any).first_name || user.username,
        lastname: user.lastname || (user as any).last_name || '',
        role: user.role,
      },
    };

    console.log('💰 Creating salary record with data:', requestData);

    const result = await salaryService.createSalaryRecord(requestData, Number(branchId));

    if (result) {
      toast({
        title: 'Успешно',
        description: 'Запись о зарплате создана',
      });
      setIsCreateDialogOpen(false);
      setNewSalaryForm({
        staffId: '',
        firstname: '',
        lastname: '',
        role: '',
        baseSalary: '',
        commissionRate: '',
      });
      fetchSalaryData();
    } else {
      toast({
        title: 'Ошибка',
        description: 'Не удалось создать запись о зарплате',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">{t('salary.loading')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <Card className="rounded-xl shadow-lg">
        <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-t-xl">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-2xl">
              <DollarSign className="h-8 w-8" />
              {t('salary.page_title')} (Новый API)
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary" size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Добавить сотрудника
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Создать запись о зарплате</DialogTitle>
                  <DialogDescription>
                    Добавьте нового сотрудника в систему расчета зарплат
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="staffId">ID сотрудника *</Label>
                    <Input
                      id="staffId"
                      type="number"
                      value={newSalaryForm.staffId}
                      onChange={(e) =>
                        setNewSalaryForm({ ...newSalaryForm, staffId: e.target.value })
                      }
                      placeholder="4"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="firstname">Имя *</Label>
                      <Input
                        id="firstname"
                        value={newSalaryForm.firstname}
                        onChange={(e) =>
                          setNewSalaryForm({ ...newSalaryForm, firstname: e.target.value })
                        }
                        placeholder="Камила"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="lastname">Фамилия *</Label>
                      <Input
                        id="lastname"
                        value={newSalaryForm.lastname}
                        onChange={(e) =>
                          setNewSalaryForm({ ...newSalaryForm, lastname: e.target.value })
                        }
                        placeholder="Умарова"
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="role">Роль *</Label>
                    <Input
                      id="role"
                      value={newSalaryForm.role}
                      onChange={(e) =>
                        setNewSalaryForm({ ...newSalaryForm, role: e.target.value })
                      }
                      placeholder="manager / master / admin"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="baseSalary">Базовая зарплата (сом) *</Label>
                    <Input
                      id="baseSalary"
                      type="number"
                      value={newSalaryForm.baseSalary}
                      onChange={(e) =>
                        setNewSalaryForm({ ...newSalaryForm, baseSalary: e.target.value })
                      }
                      placeholder="1000"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="commissionRate">
                      Процент комиссии (0.1 = 10%) *
                    </Label>
                    <Input
                      id="commissionRate"
                      type="number"
                      step="0.01"
                      value={newSalaryForm.commissionRate}
                      onChange={(e) =>
                        setNewSalaryForm({
                          ...newSalaryForm,
                          commissionRate: e.target.value,
                        })
                      }
                      placeholder="0.1"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Отмена
                  </Button>
                  <Button type="button" onClick={handleCreateSalary}>
                    Создать
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center gap-4 flex-wrap">
            <Calendar className="h-5 w-5 text-gray-600" />
            <label className="text-sm font-medium">{t('salary.period')}:</label>
            <div className="flex items-center gap-2">
              <label className="text-sm">С:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm">По:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Calculator className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Всего к выплате</p>
                <p className="text-2xl font-bold text-blue-600">
                  {salaryData
                    ? salaryService.calculateTotalSalary(salaryData).toLocaleString('ru-RU')
                    : 0}{' '}
                  сом
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Wallet className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Выплачено</p>
                <p className="text-2xl font-bold text-green-600">
                  {salaryData
                    ? salaryService.calculateTotalPaid(salaryData).toLocaleString('ru-RU')
                    : 0}{' '}
                  сом
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Осталось выплатить</p>
                <p className="text-2xl font-bold text-red-600">
                  {salaryData
                    ? salaryService.calculateTotalRemaining(salaryData).toLocaleString('ru-RU')
                    : 0}{' '}
                  сом
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <User className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Сотрудников</p>
                <p className="text-2xl font-bold text-purple-600">
                  {salaryData?.data?.length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Таблица с данными */}
      <Card className="rounded-xl shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5" />
            Расчет зарплат с {startDate} по {endDate}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 p-3 text-left font-semibold">
                    Сотрудник
                  </th>
                  <th className="border border-gray-200 p-3 text-left font-semibold">Роль</th>
                  <th className="border border-gray-200 p-3 text-left font-semibold">
                    Базовая ЗП
                  </th>
                  <th className="border border-gray-200 p-3 text-left font-semibold">
                    Комиссия %
                  </th>
                  <th className="border border-gray-200 p-3 text-left font-semibold">
                    Сумма услуг
                  </th>
                  <th className="border border-gray-200 p-3 text-left font-semibold">
                    Итого ЗП
                  </th>
                  <th className="border border-gray-200 p-3 text-left font-semibold">
                    Выплачено
                  </th>
                  <th className="border border-gray-200 p-3 text-left font-semibold">
                    Осталось
                  </th>
                  <th className="border border-gray-200 p-3 text-left font-semibold">
                    Выплат
                  </th>
                </tr>
              </thead>
              <tbody>
                {salaryData?.data?.map((employee, index) => {
                  const formattedData = salaryService.formatSalaryDataForTable(employee);
                  return (
                    <tr
                      key={employee.staff_id}
                      className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                    >
                      <td className="border border-gray-200 p-3">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-600" />
                          {formattedData.name}
                        </div>
                      </td>
                      <td className="border border-gray-200 p-3">
                        <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          {formattedData.role}
                        </span>
                      </td>
                      <td className="border border-gray-200 p-3">
                        {formattedData.baseSalary.toLocaleString('ru-RU')} сом
                      </td>
                      <td className="border border-gray-200 p-3">
                        {formattedData.commissionRate}
                      </td>
                      <td className="border border-gray-200 p-3">
                        {formattedData.serviceSum.toLocaleString('ru-RU')} сом
                      </td>
                      <td className="border border-gray-200 p-3 font-semibold text-green-600">
                        {formattedData.totalSalary.toLocaleString('ru-RU')} сом
                      </td>
                      <td className="border border-gray-200 p-3 text-blue-600">
                        {formattedData.alreadyPaid.toLocaleString('ru-RU')} сом
                      </td>
                      <td className="border border-gray-200 p-3">
                        <span
                          className={
                            formattedData.remaining > 0
                              ? 'text-red-600 font-semibold'
                              : 'text-gray-600'
                          }
                        >
                          {formattedData.remaining.toLocaleString('ru-RU')} сом
                        </span>
                      </td>
                      <td className="border border-gray-200 p-3 text-center">
                        <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                          {formattedData.paymentsCount}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {!salaryData?.data || salaryData.data.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Нет данных о зарплатах за выбранный период
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Информация о метаданных */}
      {salaryData?.meta && (
        <Card className="rounded-xl shadow-sm bg-gray-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div>
                <strong>Филиал ID:</strong> {salaryData.meta.branch_id}
              </div>
              <div>
                <strong>Часовой пояс:</strong> {salaryData.meta.timezone}
              </div>
              <div>
                <strong>Период:</strong> {salaryData.meta.startDate} — {salaryData.meta.endDate}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
