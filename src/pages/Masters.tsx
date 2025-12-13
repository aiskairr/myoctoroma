import React, { useState, useEffect } from 'react';
import { useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiGetJson } from '@/lib/api';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, User, Clock, EditIcon, X, Plus, CalendarDays, Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import MasterWorkingDatesManager from "@/components/MasterWorkingDatesManager";
import MasterWorkingDatesDisplay from "@/components/MasterWorkingDatesDisplay";
import MasterWorkingDatesCalendar from "@/components/MasterWorkingDatesCalendar";
import { useBranch } from "@/contexts/BranchContext";
import { useLocale } from "@/contexts/LocaleContext";
import { getBranchIdWithFallback } from "@/utils/branch-utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useAuth } from '@/contexts/SimpleAuthContext';
import { salaryService } from '@/services/salary-service';

// Интерфейс для рабочей даты
interface WorkingDate {
  date: string;
  startTime: string;
  endTime: string;
  branchId: string;
}

// Интерфейс для пользователя из эндпоинта reception-master
interface BranchUser {
  id: number;
  username: string;
  email: string;
  role: 'master' | 'reception';
  branchId: string;
  organisationId: string;
  createdAt: string; // Формат: YYYY-MM-DD (дата создания записи)
}

// Интерфейс для мастера
interface Master {
  id: number;
  name: string;
  first_name?: string;
  last_name?: string;
  specialty?: string;
  description?: string;
  isActive: boolean;
  startWorkHour: string;
  endWorkHour: string;
  createdAt: string; // Формат: YYYY-MM-DD (дата создания записи)
  photoUrl?: string;
  workingDates?: WorkingDate[];
  // Поля для создания аккаунта
  createAccount?: boolean;
  accountEmail?: string;
  accountPassword?: string;
  // Поля для зарплаты
  baseSalary?: number;
  commissionRate?: number;
}

// Интерфейс для администратора
interface Administrator {
  id: number;
  name: string;
  role: string;
  branchId?: string;
  phoneNumber?: string;
  email?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string; // Format: YYYY-MM-DD HH:mm:ss
  // Поля для создания аккаунта
  createAccount?: boolean;
  accountEmail?: string;
  accountPassword?: string;
  // Поля для зарплаты
  baseSalary?: number;
  commissionRate?: number;
}

// Компонент формы мастера
const MasterForm: React.FC<{
  master?: Master;
  onSubmit: (data: Partial<Master>) => void;
  isPending: boolean;
  branchUsers?: BranchUser[];
  onDelete?: (masterId: number) => void;
  isDeleting?: boolean;
}> = ({ master, onSubmit, isPending, branchUsers, onDelete, isDeleting }) => {
  const { t } = useLocale();
  const { currentBranch, branches } = useBranch();
  const [formData, setFormData] = useState({
    name: master?.first_name || '',
    specialty: master?.specialty || '',
    description: master?.description || '',
    isActive: master?.isActive ?? true,
    startWorkHour: master?.startWorkHour || '09:00',
    endWorkHour: master?.endWorkHour || '20:00',
    baseSalary: master?.baseSalary || 10000,
    commissionRate: master?.commissionRate || 0.1,
  });

  const [accountData, setAccountData] = useState({
    email: '',
    password: '',
    createAccount: !master // Автоматически включаем для новых сотрудников
  });

  const [workingDates, setWorkingDates] = useState<WorkingDate[]>(master?.workingDates || []);

  // Прогресс заполнения формы
  const [formProgress, setFormProgress] = useState(0);

  // Загрузка рабочих дат при редактировании, если они не предоставлены
  const { data: fetchedWorkingDates, isLoading: isLoadingDates } = useQuery({
    queryKey: ['working-dates', master?.id, getBranchIdWithFallback(currentBranch, branches)],
    queryFn: async () => {
      if (!master) return [];
      const branchId = getBranchIdWithFallback(currentBranch, branches);
      if (!branchId) return [];
      return await apiGetJson(`/working-dates?staffId=${master.id}&branchId=${branchId}`);
    },
    enabled: !!master && (!master.workingDates || master.workingDates.length === 0),
  });

  useEffect(() => {
    if (fetchedWorkingDates !== undefined) {
      const normalizeWorkingDates = (data: any): WorkingDate[] => {
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.data)) return data.data;
        return [];
      };
      setWorkingDates(normalizeWorkingDates(fetchedWorkingDates));
    }
  }, [fetchedWorkingDates]);

  // Обновление прогресса заполнения формы
  useEffect(() => {
    const fields = [
      formData.name,
      formData.specialty,
      formData.description,
      formData.startWorkHour,
      formData.endWorkHour,
      accountData.createAccount ? accountData.email : true,
      accountData.createAccount ? accountData.password : true,
    ];
    const filledFields = fields.filter(field => field && typeof field === 'string' ? field.trim() !== '' : true).length;
    const progress = Math.round((filledFields / fields.length) * 100);
    setFormProgress(progress);
  }, [formData, accountData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, isActive: checked }));
  };

  const handleAccountDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAccountData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateAccountToggle = async (checked: boolean) => {
    if (checked) {
      // При включении toggle: отправляем запрос на получение данных пользователя
      if (currentBranch?.id) {
        try {
          const result = await apiGetJson(`/api/crm/reception-master/user/${currentBranch.id}`);
          if (result && result.data && Array.isArray(result.data)) {
            // Ищем пользователя по имени мастера
            const foundUser = result.data.find((user: BranchUser) => 
              user.username.toLowerCase().trim() === formData.name.toLowerCase().trim()
            );
            
            if (foundUser) {
              // Если найден пользователь, заполняем поля
              setAccountData({
                createAccount: true,
                email: foundUser.email || '',
                password: ''
              });
              return;
            }
          }
        } catch (error) {
          console.error('Ошибка при загрузке данных пользователя:', error);
        }
      }
      
      // Если пользователь не найден или запрос не выполнен, просто включаем toggle
      setAccountData((prev) => ({
        ...prev,
        createAccount: true
      }));
    } else {
      // При отключении toggle: очищаем поля
      setAccountData((prev) => ({
        ...prev,
        createAccount: false
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const combinedData = {
      ...formData,
      workingDates: workingDates,
      ...(accountData.createAccount && {
        createAccount: true,
        accountEmail: accountData.email,
        accountPassword: accountData.password
      })
    };
    onSubmit(combinedData);
  };

  const handleWorkingDatesChange = (newWorkingDates: WorkingDate[]) => {
    setWorkingDates(newWorkingDates);
  };

  if (isLoadingDates) {
    return <div className="flex justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Прогресс заполнения формы */}
      <div className="relative">
        <Progress value={formProgress} className="h-2 bg-gray-100" />
      </div>

      {/* Основная информация */}
      <div className="space-y-6 bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">{t('masters.main_information')}</h3>
          <Badge variant="outline" className="text-indigo-600 border-indigo-200">
            {master ? t('masters.editing') : t('masters.creation')}
          </Badge>
        </div>
        <Separator />
        <div className="space-y-5">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="col-span-1 text-sm font-medium text-gray-700">
              {t('masters.name')} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="col-span-3 rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="specialty" className="col-span-1 text-sm font-medium text-gray-700">
              {t('masters.specialty')}
            </Label>
            <Input
              id="specialty"
              name="specialty"
              value={formData.specialty}
              onChange={handleChange}
              className="col-span-3 rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
              placeholder={t('masters.specialty_placeholder')}
            />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="description" className="col-span-1 pt-2 text-sm font-medium text-gray-700">
              {t('masters.description')}
            </Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="col-span-3 min-h-[120px] rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
              placeholder={t('masters.additional_info_placeholder')}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="isActive" className="col-span-1 text-sm font-medium text-gray-700">
              {t('masters.active')}
            </Label>
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={handleSwitchChange}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="workHours" className="col-span-1 text-sm font-medium text-gray-700">
              {t('masters.work_time')}
            </Label>
            <div className="col-span-3 flex items-center space-x-3">
              <Input
                id="startWorkHour"
                name="startWorkHour"
                type="time"
                value={formData.startWorkHour}
                onChange={handleChange}
                className="w-28 rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
              />
              <span className="text-gray-500">{t('masters.until')}</span>
              <Input
                id="endWorkHour"
                name="endWorkHour"
                type="time"
                value={formData.endWorkHour}
                onChange={handleChange}
                className="w-28 rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
              />
              <span className="text-xs text-gray-500 ml-2">
                {t('masters.by_default')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Настройки зарплаты */}
      <div className="space-y-6 bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">💰 Настройки зарплаты</h3>
          <Badge variant="outline" className="text-green-600 border-green-200">
            По умолчанию
          </Badge>
        </div>
        <Separator />
        <div className="space-y-5">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="baseSalary" className="col-span-1 text-sm font-medium text-gray-700">
              Базовая зарплата (сом)
            </Label>
            <Input
              id="baseSalary"
              name="baseSalary"
              type="number"
              value={formData.baseSalary}
              onChange={handleChange}
              className="col-span-3 rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
              min="0"
              step="1000"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="commissionRate" className="col-span-1 text-sm font-medium text-gray-700">
              Процент комиссии (0.1 = 10%)
            </Label>
            <Input
              id="commissionRate"
              name="commissionRate"
              type="number"
              value={formData.commissionRate}
              onChange={handleChange}
              className="col-span-3 rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
              min="0"
              max="1"
              step="0.01"
            />
          </div>
          <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded-lg">
            <strong>Подсказка:</strong> Базовая зарплата - фиксированная часть. Процент комиссии применяется к сумме выполненных услуг. Например: 0.1 означает 10% комиссии.
          </div>
        </div>
      </div>

      {/* Область создания аккаунта */}
      <div className="space-y-6 bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">
            {t('masters.create_account')}
            {!master && <span className="text-red-500 ml-2">*</span>}
          </h3>
          {master && (
            <Switch
              checked={accountData.createAccount}
              onCheckedChange={handleCreateAccountToggle}
              className="data-[state=checked]:bg-indigo-600"
            />
          )}
        </div>
        <Separator />
        {!master && !accountData.createAccount && (
          <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
            Email и пароль обязательны для создания нового сотрудника
          </p>
        )}

        {accountData.createAccount && (
          <div className="space-y-5 p-4 bg-blue-50 rounded-lg border border-blue-200 transition-all duration-200">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="accountEmail" className="col-span-1 text-sm font-medium text-gray-700">
                {t('masters.email')} {!master && <span className="text-red-500">*</span>}
              </Label>
              <div className="col-span-3 space-y-2">
                <Input
                  id="accountEmail"
                  name="email"
                  type="email"
                  value={accountData.email}
                  onChange={handleAccountDataChange}
                  className="rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                  placeholder="email@example.com"
                  required={accountData.createAccount}
                />
                {accountData.email && (
                  <p className="text-xs text-blue-600">
                    Заполнено: <strong>{accountData.email}</strong>
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="accountPassword" className="col-span-1 text-sm font-medium text-gray-700">
                {t('masters.password')} {!master && <span className="text-red-500">*</span>}
              </Label>
              <div className="col-span-3 space-y-2">
                <Input
                  id="accountPassword"
                  name="password"
                  type="password"
                  value={accountData.password}
                  onChange={handleAccountDataChange}
                  className="rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                  placeholder="Введите пароль"
                  required={accountData.createAccount}
                />
                <p className="text-xs text-blue-600">
                  Пароль из системы не отображается в целях безопасности. Введите пароль для аккаунта.
                </p>
              </div>
            </div>
            <div className="p-3 bg-white rounded-lg border border-blue-200">
              <div className="space-y-1 text-sm text-gray-600">
                <p><strong>Логин:</strong> {formData.name || 'Заполните имя мастера выше'}</p>
                <p><strong>Роль:</strong> master</p>
                <p><strong>Филиал:</strong> {currentBranch?.id ? `ID: ${currentBranch.id}` : 'Филиал не выбран'}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Рабочие даты */}
      <div className="space-y-6 bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <h3 className="text-xl font-semibold text-gray-900">{t('masters.working_days_hours')}</h3>
        <Separator />
        <MasterWorkingDatesManager
          workingDates={workingDates}
          onWorkingDatesChange={handleWorkingDatesChange}
          masterId={master?.id}
        />
      </div>

      <DialogFooter className="mt-8 flex justify-between items-center">
        <div>
          {master && onDelete && (
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (window.confirm(`Вы уверены, что хотите удалить мастера "${master.name}"? Это действие удалит также его аккаунт в системе.`)) {
                  onDelete(master.id);
                }
              }}
              disabled={isDeleting || isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <X className="h-4 w-4 mr-2" />}
              {t('masters.delete_action')}
            </Button>
          )}
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => window.dispatchEvent(new Event('close-dialog'))}
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            {t('masters.cancel')}
          </Button>
          <Button
            type="submit"
            disabled={
              isPending || 
              isDeleting || 
              !formData.name.trim() ||
              (!master && (!accountData.email.trim() || !accountData.password.trim()))
            }
            className="bg-indigo-600 hover:bg-indigo-700 text-white transition-all duration-200"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {master ? t('masters.save') : t('masters.add_master')}
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
};

// Упрощённая форма мастера для добавления (без аккаунта и рабочих дат)
const MasterFormSimple: React.FC<{
  onSubmit: (data: Partial<Master>) => void;
  isPending: boolean;
}> = ({ onSubmit, isPending }) => {
  const { t } = useLocale();
  const [formData, setFormData] = useState({
    username: '',
    firstname: '',
    lastname: '',
    name: '',
    specialty: '',
    description: '',
    isActive: true,
    startWorkHour: '09:00',
    endWorkHour: '20:00',
    baseSalary: 10000,
    commissionRate: 0.1,
  });

  const [accountData, setAccountData] = useState({
    email: '',
    password: '',
  });

  const [formProgress, setFormProgress] = useState(0);

  // Обновление прогресса заполнения формы
  useEffect(() => {
    const fields = [
      formData.username,
      formData.firstname,
      formData.lastname,
      formData.name,
      formData.specialty,
      formData.description,
      formData.startWorkHour,
      formData.endWorkHour,
      accountData.email,
      accountData.password,
    ];
    const filledFields = fields.filter(field => field && typeof field === 'string' ? field.trim() !== '' : true).length;
    const progress = Math.round((filledFields / fields.length) * 100);
    setFormProgress(progress);
  }, [formData, accountData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAccountDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAccountData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, isActive: checked }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      createAccount: true,
      accountEmail: accountData.email,
      accountPassword: accountData.password
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Прогресс заполнения формы */}
      <div className="relative">
        <Progress value={formProgress} className="h-2 bg-gray-100" />
      </div>

      {/* Основная информация */}
      <div className="space-y-6 bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">{t('masters.main_information')}</h3>
          <Badge variant="outline" className="text-indigo-600 border-indigo-200">
            {t('masters.creation')}
          </Badge>
        </div>
        <Separator />
        <div className="space-y-5">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="username-simple" className="col-span-1 text-sm font-medium text-gray-700">
              username <span className="text-red-500">*</span>
            </Label>
            <Input
              id="username-simple"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="col-span-3 rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="firstname-simple" className="col-span-1 text-sm font-medium text-gray-700">
              firstname <span className="text-red-500">*</span>
            </Label>
            <Input
              id="firstname-simple"
              name="firstname"
              value={formData.firstname}
              onChange={handleChange}
              className="col-span-3 rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="lastname-simple" className="col-span-1 text-sm font-medium text-gray-700">
              lastname <span className="text-red-500">*</span>
            </Label>
            <Input
              id="lastname-simple"
              name="lastname"
              value={formData.lastname}
              onChange={handleChange}
              className="col-span-3 rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name-simple" className="col-span-1 text-sm font-medium text-gray-700">
              {t('masters.name')} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name-simple"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="col-span-3 rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="specialty-simple" className="col-span-1 text-sm font-medium text-gray-700">
              {t('masters.specialty')}
            </Label>
            <Input
              id="specialty-simple"
              name="specialty"
              value={formData.specialty}
              onChange={handleChange}
              className="col-span-3 rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
              placeholder={t('masters.specialty_placeholder')}
            />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="description-simple" className="col-span-1 pt-2 text-sm font-medium text-gray-700">
              {t('masters.description')}
            </Label>
            <Textarea
              id="description-simple"
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="col-span-3 min-h-[120px] rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
              placeholder={t('masters.additional_info_placeholder')}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="isActive-simple" className="col-span-1 text-sm font-medium text-gray-700">
              {t('masters.active')}
            </Label>
            <Switch
              id="isActive-simple"
              checked={formData.isActive}
              onCheckedChange={handleSwitchChange}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="workHours-simple" className="col-span-1 text-sm font-medium text-gray-700">
              {t('masters.work_time')}
            </Label>
            <div className="col-span-3 flex items-center space-x-3">
              <Input
                id="startWorkHour-simple"
                name="startWorkHour"
                type="time"
                value={formData.startWorkHour}
                onChange={handleChange}
                className="w-28 rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
              />
              <span className="text-gray-500">{t('masters.until')}</span>
              <Input
                id="endWorkHour-simple"
                name="endWorkHour"
                type="time"
                value={formData.endWorkHour}
                onChange={handleChange}
                className="w-28 rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
              />
              <span className="text-xs text-gray-500 ml-2">
                {t('masters.by_default')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Настройки зарплаты */}
      <div className="space-y-6 bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">💰 Настройки зарплаты</h3>
          <Badge variant="outline" className="text-green-600 border-green-200">
            По умолчанию
          </Badge>
        </div>
        <Separator />
        <div className="space-y-5">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="baseSalary-simple" className="col-span-1 text-sm font-medium text-gray-700">
              Базовая зарплата (сом)
            </Label>
            <Input
              id="baseSalary-simple"
              name="baseSalary"
              type="number"
              value={formData.baseSalary}
              onChange={handleChange}
              className="col-span-3 rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
              min="0"
              step="1000"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="commissionRate-simple" className="col-span-1 text-sm font-medium text-gray-700">
              Процент комиссии (0.1 = 10%)
            </Label>
            <Input
              id="commissionRate-simple"
              name="commissionRate"
              type="number"
              value={formData.commissionRate}
              onChange={handleChange}
              className="col-span-3 rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
              min="0"
              max="1"
              step="0.01"
            />
          </div>
          <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded-lg">
            <strong>Подсказка:</strong> Базовая зарплата - фиксированная часть. Процент комиссии применяется к сумме выполненных услуг. Например: 0.1 означает 10% комиссии.
          </div>
        </div>
      </div>

      {/* Данные для создания аккаунта */}
      <div className="space-y-6 bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">{t('masters.create_account')}</h3>
        </div>
        <Separator />
        <div className="space-y-5 p-4 bg-blue-50 rounded-lg border border-blue-200 transition-all duration-200">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="accountEmail-simple" className="col-span-1 text-sm font-medium text-gray-700">
              {t('masters.email')} <span className="text-red-500">*</span>
            </Label>
            <div className="col-span-3 space-y-2">
              <Input
                id="accountEmail-simple"
                name="email"
                type="email"
                value={accountData.email}
                onChange={handleAccountDataChange}
                className="rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                placeholder="email@example.com"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="accountPassword-simple" className="col-span-1 text-sm font-medium text-gray-700">
              {t('masters.password')} <span className="text-red-500">*</span>
            </Label>
            <div className="col-span-3 space-y-2">
              <Input
                id="accountPassword-simple"
                name="password"
                type="password"
                value={accountData.password}
                onChange={handleAccountDataChange}
                className="rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                placeholder="Введите пароль"
                required
              />
            </div>
          </div>
        </div>
      </div>

      <DialogFooter className="mt-8 flex justify-between">
        <Button
          variant="outline"
          onClick={() => window.dispatchEvent(new Event('close-dialog'))}
          className="border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          {t('masters.cancel')}
        </Button>
        <Button
          type="submit"
          disabled={
            isPending ||
            !formData.username.trim() ||
            !formData.firstname.trim() ||
            !formData.lastname.trim() ||
            !formData.name.trim() ||
            !accountData.email.trim() ||
            !accountData.password.trim()
          }
          className="bg-indigo-600 hover:bg-indigo-700 text-white transition-all duration-200"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {t('masters.add_master')}
        </Button>
      </DialogFooter>
    </form>
  );
};

// Компонент карточки мастера
const MasterCard: React.FC<{
  master: Master;
  onEditClick: () => void;
  onDeleteClick: () => void;
  onScheduleClick: () => void;
  onImageUpload: (masterId: number, event: React.ChangeEvent<HTMLInputElement>) => void;
  isUploading: boolean;
}> = ({ master, onEditClick, onDeleteClick, onScheduleClick, onImageUpload, isUploading }) => {
  const { t } = useLocale();
  return (
    <Card
      className={`relative overflow-hidden transition-all duration-300 ${!(master as any).isActive && (master as any).is_active === false ? 'opacity-80 bg-gray-50' : 'bg-white'
        } hover:shadow-lg border-none shadow-sm min-w-[300px] max-w-full`}
    >
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-4">
            <div className="relative group">
              <Avatar className="h-12 w-12">
                {master.photoUrl ? (
                  <AvatarImage src={master.photoUrl} alt={master.name} />
                ) : (
                  <AvatarFallback className="bg-indigo-100 text-indigo-600">
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-50 rounded-full">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => onImageUpload(master.id, e)}
                    className="hidden"
                    disabled={isUploading}
                  />
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 text-white animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4 text-white" />
                  )}
                </label>
              </div>
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
                {master.name}
                {(((master as any).isActive === false) || ((master as any).is_active === false)) && (
                  <Badge
                    variant="secondary"
                    className="ml-2 bg-gray-200 text-gray-700 hover:bg-gray-300"
                  >
                    {t('masters.inactive')}
                  </Badge>
                )}
              </CardTitle>
              {master.specialty && (
                <CardDescription className="text-sm text-gray-500 mt-1">
                  {master.specialty}
                </CardDescription>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div className="flex items-center text-sm text-gray-600">
            <Clock className="h-4 w-4 mr-2 text-indigo-500" />
            <span>
              {master.startWorkHour} - {master.endWorkHour}
            </span>
          </div>
          <MasterWorkingDatesDisplay masterId={master.id} masterName={master.name} />
          {master.description && (
            <p className="text-sm text-gray-500 line-clamp-3">
              {master.description}
            </p>
          )}
        </div>
      </CardContent>
      <CardFooter className="pt-4 border-t border-gray-100 flex flex-wrap items-center gap-3">
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onEditClick}
            className="text-gray-600 border-gray-200 hover:bg-gray-50 min-w-[100px] text-sm"
          >
            <EditIcon className="h-4 w-4 mr-2" />
            {t('masters.configure')}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={onDeleteClick}
            className="bg-red-600 hover:bg-red-700 min-w-[100px] text-sm"
          >
            <X className="h-4 w-4 mr-2" />
            {t('masters.delete_action')}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

// Компонент формы администратора
const AdministratorForm: React.FC<{
  administrator?: Administrator;
  onSubmit: (data: Partial<Administrator>) => void;
  isPending: boolean;
  branchUsers?: BranchUser[];
  onDelete?: (administratorId: number) => void;
  isDeleting?: boolean;
}> = ({ administrator, onSubmit, isPending, branchUsers, onDelete, isDeleting }) => {
  const { t } = useLocale();
  const { currentBranch } = useBranch();
  const [formData, setFormData] = useState({
    name: administrator?.name || '',
    role: administrator?.role || 'администратор',
    branchId: administrator?.branchId || currentBranch?.id?.toString(),
    phoneNumber: administrator?.phoneNumber || '',
    email: administrator?.email || '',
    notes: administrator?.notes || '',
    isActive: administrator?.isActive ?? true,
    baseSalary: administrator?.baseSalary || 15000,
    commissionRate: administrator?.commissionRate || 0.05,
  });

  const [accountData, setAccountData] = useState({
    email: '',
    password: '',
    createAccount: false
  });

  // Прогресс заполнения формы
  const [formProgress, setFormProgress] = useState(0);

  // Обновление прогресса заполнения формы
  useEffect(() => {
    const fields = [
      formData.name,
      formData.role,
      formData.phoneNumber,
      formData.email,
      formData.notes,
      accountData.createAccount ? accountData.email : true,
      accountData.createAccount ? accountData.password : true,
    ];
    const filledFields = fields.filter(field => field && typeof field === 'string' ? field.trim() !== '' : true).length;
    const progress = Math.round((filledFields / fields.length) * 100);
    setFormProgress(progress);
  }, [formData, accountData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, isActive: checked }));
  };

  const handleAccountDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAccountData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateAccountToggle = async (checked: boolean) => {
    if (checked) {
      // При включении toggle: отправляем запрос на получение данных пользователя
      if (currentBranch?.id) {
        try {
          const result = await apiGetJson(`/api/crm/reception-master/user/${currentBranch.id}`);
          if (result && result.data && Array.isArray(result.data)) {
            // Ищем пользователя по имени администратора
            const foundUser = result.data.find((user: BranchUser) => 
              user.username.toLowerCase().trim() === formData.name.toLowerCase().trim()
            );
            
            if (foundUser) {
              // Если найден пользователь, заполняем поля
              setAccountData({
                createAccount: true,
                email: foundUser.email || '',
                password: ''
              });
              return;
            }
          }
        } catch (error) {
          console.error('Ошибка при загрузке данных пользователя:', error);
        }
      }
      // Если пользователь не найден или произошла ошибка, просто включаем toggle
      setAccountData((prev) => ({...prev, createAccount: true}));
    } else {
      setAccountData((prev) => ({...prev, createAccount: false}));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const combinedData = {
      ...formData,
      ...(accountData.createAccount && {
        createAccount: true,
        accountEmail: accountData.email,
        accountPassword: accountData.password
      })
    };
    onSubmit(combinedData);
  };

  console.log('AdministratorForm render with formData:', formData);
  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Прогресс заполнения формы */}
      <div className="relative">
        <Progress value={formProgress} className="h-2 bg-gray-100" />
      </div>

      {/* Основная информация */}
      <div className="space-y-6 bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">{t('masters.basic_info')}</h3>
          <Badge variant="outline" className="text-indigo-600 border-indigo-200">
            {administrator ? t('masters.editing') : t('masters.creating')}
          </Badge>
        </div>
        <Separator />
        <div className="space-y-5">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="admin-name" className="col-span-1 text-sm font-medium text-gray-700">
              {t('masters.name')} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="admin-name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="col-span-3 rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="admin-role" className="col-span-1 text-sm font-medium text-gray-700">
              {t('masters.role')}
            </Label>
            <Input
              id="admin-role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="col-span-3 rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
              placeholder={t('masters.role_placeholder')}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="admin-phone" className="col-span-1 text-sm font-medium text-gray-700">
              {t('masters.phone')}
            </Label>
            <Input
              id="admin-phone"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              className="col-span-3 rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
              placeholder={t('masters.phone_placeholder')}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="admin-email" className="col-span-1 text-sm font-medium text-gray-700">
              {t('masters.email')}
            </Label>
            <Input
              id="admin-email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              className="col-span-3 rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
              placeholder={t('masters.email_placeholder')}
            />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="admin-notes" className="col-span-1 pt-2 text-sm font-medium text-gray-700">
              {t('masters.notes')}
            </Label>
            <Textarea
              id="admin-notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              className="col-span-3 min-h-[120px] rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
              placeholder={t('masters.notes_placeholder')}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="admin-isActive" className="col-span-1 text-sm font-medium text-gray-700">
              {t('masters.is_active')}
            </Label>
            <Switch
              id="admin-isActive"
              checked={formData.isActive}
              onCheckedChange={handleSwitchChange}
              className="col-span-3"
            />
          </div>
        </div>
      </div>

      {/* Настройки зарплаты */}
      <div className="space-y-6 bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">💰 Настройки зарплаты</h3>
          <Badge variant="outline" className="text-green-600 border-green-200">
            По умолчанию
          </Badge>
        </div>
        <Separator />
        <div className="space-y-5">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="admin-baseSalary" className="col-span-1 text-sm font-medium text-gray-700">
              Базовая зарплата (сом)
            </Label>
            <Input
              id="admin-baseSalary"
              name="baseSalary"
              type="number"
              value={formData.baseSalary}
              onChange={handleChange}
              className="col-span-3 rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
              min="0"
              step="1000"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="admin-commissionRate" className="col-span-1 text-sm font-medium text-gray-700">
              Процент комиссии (0.1 = 10%)
            </Label>
            <Input
              id="admin-commissionRate"
              name="commissionRate"
              type="number"
              value={formData.commissionRate}
              onChange={handleChange}
              className="col-span-3 rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
              min="0"
              max="1"
              step="0.01"
            />
          </div>
          <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded-lg">
            <strong>Подсказка:</strong> Базовая зарплата - фиксированная часть. Процент комиссии применяется к сумме выполненных услуг. Например: 0.05 означает 5% комиссии.
          </div>
        </div>
      </div>

      {/* Область создания аккаунта */}
      <div className="space-y-6 bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">
            {t('masters.create_account')}
          </h3>
          <Switch
            checked={accountData.createAccount}
            onCheckedChange={handleCreateAccountToggle}
            className="data-[state=checked]:bg-indigo-600"
          />
        </div>
        <Separator />

        {accountData.createAccount && (
          <div className="space-y-5 p-4 bg-blue-50 rounded-lg border border-blue-200 transition-all duration-200">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="admin-accountEmail" className="col-span-1 text-sm font-medium text-gray-700">
                {t('masters.email')}
              </Label>
              <div className="col-span-3 space-y-2">
                <Input
                  id="admin-accountEmail"
                  name="email"
                  type="email"
                  value={accountData.email}
                  onChange={handleAccountDataChange}
                  className="rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                  placeholder="email@example.com"
                  required={accountData.createAccount}
                />
                {accountData.email && (
                  <p className="text-xs text-blue-600">
                    Заполнено: <strong>{accountData.email}</strong>
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="admin-accountPassword" className="col-span-1 text-sm font-medium text-gray-700">
                {t('masters.password')}
              </Label>
              <div className="col-span-3 space-y-2">
                <Input
                  id="admin-accountPassword"
                  name="password"
                  type="password"
                  value={accountData.password}
                  onChange={handleAccountDataChange}
                  className="rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                  placeholder="Введите пароль"
                  required={accountData.createAccount}
                />
                <p className="text-xs text-blue-600">
                  Пароль из системы не отображается в целях безопасности. Введите пароль для аккаунта.
                </p>
              </div>
            </div>
            <div className="p-3 bg-white rounded-lg border border-blue-200">
              <div className="space-y-1 text-sm text-gray-600">
                <p><strong>Логин:</strong> {formData.name || 'Заполните имя администратора выше'}</p>
                <p><strong>Роль:</strong> reception</p>
                <p><strong>Филиал:</strong> {currentBranch?.id ? `ID: ${currentBranch.id}` : 'Филиал не выбран'}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <DialogFooter className="mt-8 flex justify-between items-center">
        <div>
          {administrator && onDelete && (
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (window.confirm(`Вы уверены, что хотите удалить администратора "${administrator.name}"? Это действие удалит также его аккаунт в системе.`)) {
                  onDelete(administrator.id);
                }
              }}
              disabled={isDeleting || isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <X className="h-4 w-4 mr-2" />}
              {t('masters.delete_action')}
            </Button>
          )}
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => window.dispatchEvent(new Event('close-dialog'))}
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            {t('masters.cancel')}
          </Button>
          <Button
            type="submit"
            disabled={isPending || isDeleting || !formData.name.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white transition-all duration-200"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {administrator ? t('masters.save_changes') : t('masters.add_administrator')}
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
};

// Упрощённая форма администратора для добавления (без аккаунта)
const AdministratorFormSimple: React.FC<{
  onSubmit: (data: Partial<Administrator>) => void;
  isPending: boolean;
}> = ({ onSubmit, isPending }) => {
  const { t } = useLocale();
  const { currentBranch } = useBranch();
  const [formData, setFormData] = useState({
    username: '',
    firstname: '',
    lastname: '',
    name: '',
    role: 'администратор',
    branchId: currentBranch?.id?.toString() || '',
    phoneNumber: '',
    email: '',
    notes: '',
    isActive: true,
    baseSalary: 15000,
    commissionRate: 0.05,
  });

  const [accountData, setAccountData] = useState({
    email: '',
    password: '',
  });

  const [formProgress, setFormProgress] = useState(0);

  // Обновление прогресса заполнения формы
  useEffect(() => {
    const fields = [
      formData.username,
      formData.firstname,
      formData.lastname,
      formData.name,
      formData.role,
      formData.phoneNumber,
      formData.email,
      formData.notes,
      accountData.email,
      accountData.password,
    ];
    const filledFields = fields.filter(field => field && typeof field === 'string' ? field.trim() !== '' : true).length;
    const progress = Math.round((filledFields / fields.length) * 100);
    setFormProgress(progress);
  }, [formData, accountData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAccountDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAccountData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, isActive: checked }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      createAccount: true,
      accountEmail: accountData.email,
      accountPassword: accountData.password
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Прогресс заполнения формы */}
      <div className="relative">
        <Progress value={formProgress} className="h-2 bg-gray-100" />
      </div>

      {/* Основная информация */}
      <div className="space-y-6 bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">{t('masters.basic_info')}</h3>
          <Badge variant="outline" className="text-indigo-600 border-indigo-200">
            {t('masters.creating')}
          </Badge>
        </div>
        <Separator />
        <div className="space-y-5">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="admin-username-simple" className="col-span-1 text-sm font-medium text-gray-700">
              username <span className="text-red-500">*</span>
            </Label>
            <Input
              id="admin-username-simple"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="col-span-3 rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="admin-firstname-simple" className="col-span-1 text-sm font-medium text-gray-700">
              firstname <span className="text-red-500">*</span>
            </Label>
            <Input
              id="admin-firstname-simple"
              name="firstname"
              value={formData.firstname}
              onChange={handleChange}
              className="col-span-3 rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="admin-lastname-simple" className="col-span-1 text-sm font-medium text-gray-700">
              lastname <span className="text-red-500">*</span>
            </Label>
            <Input
              id="admin-lastname-simple"
              name="lastname"
              value={formData.lastname}
              onChange={handleChange}
              className="col-span-3 rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="admin-name-simple" className="col-span-1 text-sm font-medium text-gray-700">
              {t('masters.name')} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="admin-name-simple"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="col-span-3 rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="admin-role-simple" className="col-span-1 text-sm font-medium text-gray-700">
              {t('masters.role')}
            </Label>
            <Input
              id="admin-role-simple"
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="col-span-3 rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
              placeholder={t('masters.role_placeholder')}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="admin-phone-simple" className="col-span-1 text-sm font-medium text-gray-700">
              {t('masters.phone')}
            </Label>
            <Input
              id="admin-phone-simple"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              className="col-span-3 rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
              placeholder={t('masters.phone_placeholder')}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="admin-email-simple" className="col-span-1 text-sm font-medium text-gray-700">
              {t('masters.email')}
            </Label>
            <Input
              id="admin-email-simple"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              className="col-span-3 rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
              placeholder={t('masters.email_placeholder')}
            />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="admin-notes-simple" className="col-span-1 pt-2 text-sm font-medium text-gray-700">
              {t('masters.notes')}
            </Label>
            <Textarea
              id="admin-notes-simple"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              className="col-span-3 min-h-[120px] rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
              placeholder={t('masters.notes_placeholder')}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="admin-isActive-simple" className="col-span-1 text-sm font-medium text-gray-700">
              {t('masters.is_active')}
            </Label>
            <Switch
              id="admin-isActive-simple"
              checked={formData.isActive}
              onCheckedChange={handleSwitchChange}
              className="col-span-3"
            />
          </div>
        </div>
      </div>

      {/* Настройки зарплаты */}
      <div className="space-y-6 bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">💰 Настройки зарплаты</h3>
          <Badge variant="outline" className="text-green-600 border-green-200">
            По умолчанию
          </Badge>
        </div>
        <Separator />
        <div className="space-y-5">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="admin-baseSalary-simple" className="col-span-1 text-sm font-medium text-gray-700">
              Базовая зарплата (сом)
            </Label>
            <Input
              id="admin-baseSalary-simple"
              name="baseSalary"
              type="number"
              value={formData.baseSalary}
              onChange={handleChange}
              className="col-span-3 rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
              min="0"
              step="1000"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="admin-commissionRate-simple" className="col-span-1 text-sm font-medium text-gray-700">
              Процент комиссии (0.1 = 10%)
            </Label>
            <Input
              id="admin-commissionRate-simple"
              name="commissionRate"
              type="number"
              value={formData.commissionRate}
              onChange={handleChange}
              className="col-span-3 rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
              min="0"
              max="1"
              step="0.01"
            />
          </div>
          <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded-lg">
            <strong>Подсказка:</strong> Базовая зарплата - фиксированная часть. Процент комиссии применяется к сумме выполненных услуг. Например: 0.05 означает 5% комиссии.
          </div>
        </div>
      </div>

      {/* Данные для создания аккаунта */}
      <div className="space-y-6 bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">{t('masters.create_account')}</h3>
        </div>
        <Separator />
        <div className="space-y-5 p-4 bg-blue-50 rounded-lg border border-blue-200 transition-all duration-200">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="admin-accountEmail-simple" className="col-span-1 text-sm font-medium text-gray-700">
              {t('masters.email')} <span className="text-red-500">*</span>
            </Label>
            <div className="col-span-3 space-y-2">
              <Input
                id="admin-accountEmail-simple"
                name="email"
                type="email"
                value={accountData.email}
                onChange={handleAccountDataChange}
                className="rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                placeholder="email@example.com"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="admin-accountPassword-simple" className="col-span-1 text-sm font-medium text-gray-700">
              {t('masters.password')} <span className="text-red-500">*</span>
            </Label>
            <div className="col-span-3 space-y-2">
              <Input
                id="admin-accountPassword-simple"
                name="password"
                type="password"
                value={accountData.password}
                onChange={handleAccountDataChange}
                className="rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                placeholder="Введите пароль"
                required
              />
            </div>
          </div>
        </div>
      </div>

      <DialogFooter className="mt-8 flex justify-between">
        <Button
          variant="outline"
          onClick={() => window.dispatchEvent(new Event('close-dialog'))}
          className="border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          {t('masters.cancel')}
        </Button>
        <Button
          type="submit"
          disabled={
            isPending ||
            !formData.username.trim() ||
            !formData.firstname.trim() ||
            !formData.lastname.trim() ||
            !formData.name.trim() ||
            !accountData.email.trim() ||
            !accountData.password.trim()
          }
          className="bg-indigo-600 hover:bg-indigo-700 text-white transition-all duration-200"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {t('masters.add_administrator')}
        </Button>
      </DialogFooter>
    </form>
  );
};

// Компонент карточки администратора
const AdministratorCard: React.FC<{
  administrator: Administrator;
  onEditClick: () => void;
  onDeleteClick: () => void;
}> = ({ administrator, onEditClick, onDeleteClick }) => {
  const { t } = useLocale();
  const isActive = (administrator as any).is_active ?? administrator.isActive ?? true;
  return (
    <Card className={`w-full relative overflow-hidden transition-all duration-300  hover:shadow-lg border-none shadow-sm`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-purple-100 text-purple-600">
                <User className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900">
                {administrator.name}
              </CardTitle>
              <CardDescription className="text-sm text-gray-500">
                {administrator.role}
              </CardDescription>
            </div>
          </div>
          <Badge variant={isActive ? "default" : "destructive"} className={isActive ? "bg-green-100 text-green-800 hover:bg-green-100" : "bg-red-100 text-red-800"}>
            {isActive ? t('masters.active_status') : t('masters.inactive')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2 text-sm">
          <div className="flex items-center space-x-2 text-gray-600">
            <User className="h-4 w-4 text-purple-500" />
            <span>ID: {administrator.id}</span>
          </div>
          {administrator.phoneNumber && (
            <div className="flex items-center space-x-2 text-gray-600">
              <span>📞 {administrator.phoneNumber}</span>
            </div>
          )}
          {administrator.email && (
            <div className="flex items-center space-x-2 text-gray-600">
              <span>✉️ {administrator.email}</span>
            </div>
          )}
          {administrator.notes && (
            <div className="mt-2 p-2 bg-purple-50 rounded text-xs text-gray-600">
              {administrator.notes}
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="pt-3 border-t border-gray-100 flex justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={onEditClick}
          className="text-gray-600 border-gray-200 hover:bg-gray-50"
        >
          <EditIcon className="h-4 w-4 mr-2" />
          {t('masters.change')}
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={onDeleteClick}
          className="bg-red-600 hover:bg-red-700"
        >
          <X className="h-4 w-4 mr-2" />
          {t('masters.delete_action')}
        </Button>
      </CardFooter>
    </Card>
  );
};

// Функция для поиска связанного пользователя по имени
// Основной компонент страницы мастеров
const Masters: React.FC = () => {
  const { t } = useLocale();
  const { toast } = useToast();
  const { currentBranch, orgData } = useBranch();
  const { user } = useAuth();
  console.log('orgData', orgData);
  const [editMaster, setEditMaster] = useState<Master | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedMasterForSchedule, setSelectedMasterForSchedule] = useState<Master | null>(null);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [uploadingImages, setUploadingImages] = useState<{ [key: number]: boolean }>({});
  const [isAddAdministratorDialogOpen, setIsAddAdministratorDialogOpen] = useState(false);
  const [editAdministrator, setEditAdministrator] = useState<Administrator | null>(null);
  const [isEditAdministratorDialogOpen, setIsEditAdministratorDialogOpen] = useState(false);
  const creatingAdminRef = useRef(false);

  // Запрос для получения пользователей филиала с ролями master и reception
  const { data: branchUsers } = useQuery({
    queryKey: ['/staff?organizationId', currentBranch?.id],
    queryFn: async () => {
      if (!currentBranch?.id) {
        return [];
      }
      const url = `/staff?organizationId=${currentBranch.id}`;
      const result = await apiGetJson(url);
      return Array.isArray(result) ? result : [];
    },
    enabled: !!currentBranch?.id,
  });

  const { data: administrators, refetch: refetchAdministrators } = useQuery({
    queryKey: ['/staff?organizationId=', orgData + "&role=manager"],
    queryFn: async () => {
      if (!orgData) {
        return [];
      }
      const url = `/staff?organizationId=${orgData}&role=manager`;
      return await apiGetJson(url);
    },
    enabled: !!orgData,
  });

  const { data: masters, isLoading, isError, refetch } = useQuery({
    queryKey: ['/staff?organizationId=', orgData + "&role=employee"],
    queryFn: async () => {
      if (!orgData) {
        return [];
      }
      const url = `/staff?organizationId=${orgData}`;
      return await apiGetJson(url);
    },
    enabled: !!orgData,
  });
  console.log(masters + " sdoksodkoskodk")
  const createMasterMutation = useMutation({
    mutationFn: async (data: Partial<Master>) => {
      if (!currentBranch?.id) {
        throw new Error('Branch not selected');
      }

      const { workingDates, createAccount, accountEmail, accountPassword, baseSalary, commissionRate, ...masterData } = data;

      // Подготовка данных для создания сотрудника согласно API
      const staffPayload = {
        username: (masterData as any).username || masterData.name,
        firstname: (masterData as any).firstname || masterData.name?.split(' ')[0] || masterData.name || '',
        lastname: (masterData as any).lastname || masterData.name?.split(' ').slice(1).join(' ') || '',
        email: accountEmail,
        password: accountPassword,
        role: 'employee', // По умолчанию роль manager для мастеров
        specialty: masterData.specialty || '',
        description: masterData.description || '',
        is_active: masterData.isActive ?? true,
        organizationId: orgData,
        branches: [
          {
            id: currentBranch.id,
            name: (currentBranch as any).name,
            address: (currentBranch as any).address,
            
          }
        ]
      };
      
      console.log('Creating staff with payload:', staffPayload);
      
      // Создаем сотрудника через /staff endpoint
      const res = await fetch(`${import.meta.env.VITE_SECONDARY_BACKEND_URL}/staff?organizationId=${orgData}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Accept': 'application/json', 
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}` 
        },
        body: JSON.stringify(staffPayload)
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create staff member');
      }
      
      const response = await res.json();

      // API возвращает объект с success, message и data
      if (response.success && response.data) {
        return { staffData: response.data, baseSalary, commissionRate };
      }

      // Если формат ответа другой, возвращаем как есть
      return { staffData: response, baseSalary, commissionRate };
    },
    onSuccess: async (result) => {
      const { staffData, baseSalary, commissionRate } = result;

      setIsAddDialogOpen(false);
      toast({
        title: t('masters.master_created'),
        description: t('masters.master_created'),
        variant: 'default',
      });
      refetch();

      // Автоматически создаем рабочий день 09:00-18:00 на сегодня для нового сотрудника
      if (staffData?.id && currentBranch?.id) {
        try {
          const today = new Date();
          const workDate = today.toISOString().split('T')[0];

          await fetch(`${import.meta.env.VITE_SECONDARY_BACKEND_URL}/working-dates/${staffData.id}?branchId=${currentBranch.id}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
            },
            body: JSON.stringify({
              workDate,
              startTime: '09:00',
              endTime: '18:00'
            })
          }).then(async res => {
            if (!res.ok) {
              const errorText = await res.text();
              console.warn('⚠️ Failed to auto-create working day:', res.status, errorText);
            } else {
              console.log('✅ Auto-created working day for staff', staffData.id, 'date', workDate);
            }
          });
        } catch (err) {
          console.warn('⚠️ Error while auto-creating working day:', err);
        }
      }

      // Создаем salary record
      if (staffData && staffData.id && user && currentBranch?.id) {
        try {
          console.log('📊 Staff data for salary:', staffData);

          const salaryResult = await salaryService.createSalaryRecord({
            staff: {
              id: staffData.id,
              firstname: staffData.firstname || (staffData as any).first_name || staffData.username,
              lastname: staffData.lastname || (staffData as any).last_name || '',
              role: staffData.role || 'employee',
            },
            baseSalary: baseSalary || 10000,
            commissionRate: commissionRate || 0.1,
            createdBy: {
              id: user.id,
              firstname: user.firstname || (user as any).first_name || user.username,
              lastname: user.lastname || (user as any).last_name || '',
              role: user.role,
            },
          }, currentBranch.id);

          if (salaryResult) {
            console.log('✅ Salary record created successfully:', salaryResult);
          }
        } catch (error) {
          console.error('❌ Failed to create salary record:', error);
          // Не показываем ошибку пользователю, т.к. мастер уже создан
        }
      }
    },
    onError: (error) => {
      toast({
        title: 'Ошибка',
        description: `${error}`,
        variant: 'destructive',
      });
    }
  });

  const updateMasterMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Partial<Master> }) => {
      const { workingDates, createAccount, accountEmail, accountPassword, baseSalary, commissionRate, ...masterData } = data;
      console.log(workingDates + " workingDates")
      const authToken = localStorage.getItem('auth_token');

      // Подготовка данных для обновления согласно новому API
      const staffUpdatePayload: any = {};
      const organizationId = currentBranch?.organisationId || orgData?.id || user?.organization_id || user?.organisationId || user?.orgId || user?.organization?.id;
      if (organizationId) {
        staffUpdatePayload.organizationId = Number(organizationId);
      }
      if (currentBranch?.id) {
        staffUpdatePayload.branches = [{
          id: currentBranch.id,
          name: (currentBranch as any).branches || (currentBranch as any).name || '',
          address: (currentBranch as any).address || ''
        }];
      }

      // Маппинг полей: name -> firstname/lastname
      if (masterData.name) {
        const nameParts = masterData.name.split(' ');
        staffUpdatePayload.firstname = nameParts[0] || '';
        staffUpdatePayload.lastname = nameParts.slice(1).join(' ') || '';
        staffUpdatePayload.username = masterData.name;
      }

      // Остальные поля
      if (masterData.specialty !== undefined) staffUpdatePayload.specialty = masterData.specialty;
      if (masterData.description !== undefined) staffUpdatePayload.description = masterData.description;
      if (masterData.isActive !== undefined) staffUpdatePayload.is_active = masterData.isActive;
      if (accountEmail) staffUpdatePayload.email = accountEmail;

      // Обновляем сотрудника через PATCH /staff/{id}
      console.log('🔄 Updating master via PATCH /staff/' + id);
      console.log('📦 Payload:', staffUpdatePayload);
      console.log('🔗 URL:', `${import.meta.env.VITE_SECONDARY_BACKEND_URL}/staff/${id}`);

      const res = await fetch(`${import.meta.env.VITE_SECONDARY_BACKEND_URL}/staff/${id}?organizationId=${orgData}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify(staffUpdatePayload)
      });

      console.log('📡 Response status:', res.status);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('❌ Update failed:', errorData);
        throw new Error(errorData.message || `Failed to update staff member (${res.status})`);
      }

      const response = await res.json();
      console.log('✅ Update response:', response);
      const updatedStaff = response.success ? response.data : response;

      // Обновляем рабочие даты: удаляем все существующие и добавляем новые
      console.log('🔍 Checking working dates update:', {
        hasWorkingDates: !!workingDates,
        workingDatesLength: workingDates?.length,
        hasBranchId: !!currentBranch?.id,
        branchId: currentBranch?.id
      });

      if (workingDates && currentBranch?.id) {
        console.log('🗓️ Updating working dates for branch:', currentBranch.id);

        try {
          // Получаем все рабочие даты для этого мастера в этом филиале
          const workingDatesUrl = `${import.meta.env.VITE_SECONDARY_BACKEND_URL}/working-dates?staffId=${id}&branchId=${currentBranch.id}`;
          console.log('📡 Fetching working dates from URL:', workingDatesUrl);

          const allWorkingDatesRes = await fetch(workingDatesUrl, {
            headers: {
              'Accept': 'application/json',
              ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
            },
            credentials: 'include'
          });
          console.log('📡 Working dates response status:', allWorkingDatesRes.status);

          if (allWorkingDatesRes.ok) {
            const allWorkingDates = await allWorkingDatesRes.json();
            console.log('📅 Found working dates to delete:', allWorkingDates.length);

            // Удаляем все существующие рабочие даты для этого мастера в этом филиале
            await Promise.all(allWorkingDates.map(async (cwd: any) => {
              await fetch(`${import.meta.env.VITE_SECONDARY_BACKEND_URL}/working-dates/${cwd.id}?branchId=${cwd.branch_id || currentBranch.id}`, {
                method: 'DELETE',
                headers: {
                  ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
                },
                credentials: 'include'
              });
            }));
          } else {
            const errorData = await allWorkingDatesRes.json().catch(() => ({}));
            console.error('❌ Failed to fetch working dates:', {
              status: allWorkingDatesRes.status,
              error: errorData,
              url: workingDatesUrl
            });
          }

          // Добавляем новые рабочие даты
          console.log('➕ Adding new working dates:', workingDates.length);
          await Promise.all(workingDates.map(async (wd) => {
            await fetch(`${import.meta.env.VITE_SECONDARY_BACKEND_URL}/working-dates/${id}?branchId=${wd.branchId || currentBranch.id}`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
              },
              credentials: 'include',
              body: JSON.stringify({
                workDate: wd.date,
                startTime: wd.startTime,
                endTime: wd.endTime
              })
            });
          }));

          console.log('✅ Working dates updated successfully');
        } catch (error) {
          console.error('❌ Failed to update working dates:', error);
          // Не выбрасываем ошибку, чтобы не прервать обновление сотрудника
        }
      } else {
        console.log('⏭️ Skipping working dates update:', {
          reason: !workingDates ? 'No working dates provided' : 'No branch ID available'
        });
      }

      return { updatedStaff, baseSalary, commissionRate };
    },
    onSuccess: async (result) => {
      const { updatedStaff, baseSalary, commissionRate } = result;

      setIsEditDialogOpen(false);
      setEditMaster(null);
      toast({
        title: t('masters.master_updated'),
        description: t('masters.master_updated'),
        variant: 'default',
      });
      refetch();

      // Создаем или обновляем salary record
      if ((baseSalary !== undefined || commissionRate !== undefined) && updatedStaff?.id && user && currentBranch?.id) {
        try {
          console.log('💰 Creating/updating salary record for master...');
          console.log('📊 Updated staff data:', updatedStaff);

          const salaryResult = await salaryService.createSalaryRecord({
            staff: {
              id: updatedStaff.id,
              firstname: updatedStaff.firstname || (updatedStaff as any).first_name || updatedStaff.username,
              lastname: updatedStaff.lastname || (updatedStaff as any).last_name || '',
              role: updatedStaff.role || 'employee',
            },
            baseSalary: baseSalary || 10000,
            commissionRate: commissionRate || 0.1,
            createdBy: {
              id: user.id,
              firstname: user.firstname || (user as any).first_name || user.username,
              lastname: user.lastname || (user as any).last_name || '',
              role: user.role,
            },
          }, currentBranch.id);

          if (salaryResult) {
            console.log('✅ Salary record created/updated successfully:', salaryResult);
            toast({
              title: 'Зарплата обновлена',
              description: 'Настройки зарплаты успешно сохранены',
            });
          }
        } catch (error) {
          console.error('❌ Failed to create/update salary record:', error);
          toast({
            title: 'Предупреждение',
            description: 'Мастер обновлен, но не удалось сохранить настройки зарплаты',
            variant: 'destructive',
          });
        }
      }
    },
    onError: (error) => {
      toast({
        title: 'Ошибка',
        description: `${error}`,
        variant: 'destructive',
      });
    }
  });

  const deleteMasterMutation = useMutation({
    mutationFn: async (id: number) => {
      const organizationId = orgData;
      const orgParam = organizationId ? `?organizationId=${organizationId}` : '';

      // Сначала удаляем мастера из основной таблицы
      const deleteRes = await fetch(`${import.meta.env.VITE_SECONDARY_BACKEND_URL}/staff/${id}${orgParam}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (!deleteRes.ok) {
        throw new Error('Failed to delete master');
      }
      const deletedMaster = await deleteRes.json();

      // Затем удаляем пользователя из таблицы users (если существует)
      if (deletedMaster?.id) {
        try {
          const userDeleteRes = await fetch(`${import.meta.env.VITE_SECONDARY_BACKEND_URL}/staff/${id}${orgParam}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
          });
          // Не выбрасываем ошибку, если удаление пользователя не удалось
          if (!userDeleteRes.ok) {
            console.warn('Warning: Could not delete master user account');
          }
        } catch (err) {
          console.warn('Warning: Failed to delete master user account', err);
        }
      }

      return deletedMaster;
    },
    onSuccess: (deletedMaster) => {
      toast({
        title: t('masters.master_deleted'),
        description: `Мастер "${deletedMaster?.name || ''}" и его аккаунт успешно удалены`,
        variant: 'default',
      });
      refetch();
      setIsEditDialogOpen(false);
      setEditMaster(null);
    },
    onError: (error) => {
      toast({
        title: 'Ошибка',
        description: `Не удалось удалить мастера: ${error}`,
        variant: 'destructive',
      });
    }
  });

  const createAdministratorMutation = useMutation({
    mutationFn: async (data: Partial<Administrator>) => {
      if (!currentBranch?.id) {
        throw new Error('Branch not selected');
      }
      const { createAccount, accountEmail, accountPassword, baseSalary, commissionRate, ...adminData } = data;
      const staffPayload = {
        username: (adminData as any).username || adminData.name,
        firstname: (adminData as any).firstname || adminData.name?.split(' ')[0] || adminData.name || '',
        lastname: (adminData as any).lastname || adminData.name?.split(' ').slice(1).join(' ') || '',
        email: accountEmail,
        password: accountPassword,
        role: 'manager',
        description: adminData.notes || '',
        is_active: adminData.isActive ?? true,
        organizationId: orgData,
        branches: [
          {
            id: currentBranch.id,
            name: (currentBranch as any).name,
            address: (currentBranch as any).address,
          }
        ]
      };
      const res = await fetch(`${import.meta.env.VITE_SECONDARY_BACKEND_URL}/staff?organisationId=${orgData}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(staffPayload)
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create administrator');
      }
      const response = await res.json();
      if (response.success && response.data) {
        return { staffData: response.data, baseSalary, commissionRate };
      }
      return { staffData: response, baseSalary, commissionRate };
    },
    onSuccess: async (result) => {
      const { staffData, baseSalary, commissionRate } = result;

      setIsAddAdministratorDialogOpen(false);
      toast({
        title: 'Администратор добавлен',
        description: 'Новый администратор успешно добавлен в систему',
        variant: 'default',
      });
      refetchAdministrators();

      // Создаем salary record
      if (staffData && staffData.id && user && currentBranch?.id) {
        try {
          console.log('📊 Staff data for salary (Administrator):', staffData);

          const salaryResult = await salaryService.createSalaryRecord({
            staff: {
              id: staffData.id,
              firstname: staffData.firstname || (staffData as any).first_name || staffData.username,
              lastname: staffData.lastname || (staffData as any).last_name || '',
              role: staffData.role || 'manager',
            },
            baseSalary: baseSalary || 15000,
            commissionRate: commissionRate || 0.05,
            createdBy: {
              id: user.id,
              firstname: user.firstname || (user as any).first_name || user.username,
              lastname: user.lastname || (user as any).last_name || '',
              role: user.role,
            },
          }, currentBranch.id);

          if (salaryResult) {
            console.log('✅ Salary record created successfully for administrator:', salaryResult);
          }
        } catch (error) {
          console.error('❌ Failed to create salary record for administrator:', error);
          // Не показываем ошибку пользователю, т.к. администратор уже создан
        }
      }
    },
    onError: (error) => {
      toast({
        title: 'Ошибка',
        description: `Не удалось добавить администратора: ${error}`,
        variant: 'destructive',
      });
    }
  });

  const updateAdministratorMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Partial<Administrator> }) => {
      const { createAccount, accountEmail, accountPassword, baseSalary, commissionRate, ...adminData } = data;

      // Подготовка данных для обновления согласно новому API
      const staffUpdatePayload: any = {};

      // Маппинг полей: name -> firstname/lastname
      if (adminData.name) {
        const nameParts = adminData.name.split(' ');
        staffUpdatePayload.firstname = nameParts[0] || '';
        staffUpdatePayload.lastname = nameParts.slice(1).join(' ') || '';
        staffUpdatePayload.username = adminData.name;
      }

      // Остальные поля
      if (adminData.notes !== undefined) staffUpdatePayload.description = adminData.notes;
      if (adminData.isActive !== undefined) staffUpdatePayload.is_active = adminData.isActive;
      if (accountEmail) staffUpdatePayload.email = accountEmail;
      if (adminData.role !== undefined) staffUpdatePayload.customRole = adminData.role;

      // Обновляем сотрудника через PATCH /staff/{id}
      console.log('🔄 Updating administrator via PATCH /staff/' + id);
      console.log('📦 Payload:', staffUpdatePayload);
      console.log('🔗 URL:', `${import.meta.env.VITE_SECONDARY_BACKEND_URL}/staff/${id}`);

      const res = await fetch(`${import.meta.env.VITE_SECONDARY_BACKEND_URL}/staff/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(staffUpdatePayload)
      });

      console.log('📡 Response status:', res.status);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('❌ Update failed:', errorData);
        throw new Error(errorData.message || `Failed to update administrator (${res.status})`);
      }

      const response = await res.json();
      console.log('✅ Update response:', response);
      const updatedStaff = response.success ? response.data : response;

      return { updatedStaff, baseSalary, commissionRate };
    },
    onSuccess: async (result) => {
      const { updatedStaff, baseSalary, commissionRate } = result;

      setIsEditAdministratorDialogOpen(false);
      setEditAdministrator(null);
      toast({
        title: 'Администратор обновлен',
        description: 'Данные администратора успешно обновлены',
        variant: 'default',
      });
      refetchAdministrators();

      // Создаем или обновляем salary record
      if ((baseSalary !== undefined || commissionRate !== undefined) && updatedStaff?.id && user && currentBranch?.id) {
        try {
          console.log('💰 Creating/updating salary record for administrator...');
          console.log('📊 Updated staff data (Administrator):', updatedStaff);

          const salaryResult = await salaryService.createSalaryRecord({
            staff: {
              id: updatedStaff.id,
              firstname: updatedStaff.firstname || (updatedStaff as any).first_name || updatedStaff.username,
              lastname: updatedStaff.lastname || (updatedStaff as any).last_name || '',
              role: updatedStaff.role || 'manager',
            },
            baseSalary: baseSalary || 15000,
            commissionRate: commissionRate || 0.05,
            createdBy: {
              id: user.id,
              firstname: user.firstname || (user as any).first_name || user.username,
              lastname: user.lastname || (user as any).last_name || '',
              role: user.role,
            },
          }, currentBranch.id);

          if (salaryResult) {
            console.log('✅ Salary record created/updated successfully:', salaryResult);
            toast({
              title: 'Зарплата обновлена',
              description: 'Настройки зарплаты успешно сохранены',
            });
          }
        } catch (error) {
          console.error('❌ Failed to create/update salary record:', error);
          toast({
            title: 'Предупреждение',
            description: 'Администратор обновлен, но не удалось сохранить настройки зарплаты',
            variant: 'destructive',
          });
        }
      }
    },
    onError: (error) => {
      toast({
        title: 'Ошибка',
        description: `Не удалось обновить администратора: ${error}`,
        variant: 'destructive',
      });
    }
  });

  const deleteAdministratorMutation = useMutation({
    mutationFn: async (id: number) => {
      // Сначала удаляем администратора из основной таблицы
      const deleteRes = await fetch(`${import.meta.env.VITE_SECONDARY_BACKEND_URL}/api/administrators/${id}`, {
        method: 'DELETE',
      });
      if (!deleteRes.ok) {
        throw new Error('Failed to delete administrator');
      }
      const deletedAdmin = await deleteRes.json();

      // Затем удаляем пользователя из таблицы users (если существует)
      if (deletedAdmin?.id) {
        try {
          const userDeleteRes = await fetch(`${import.meta.env.VITE_SECONDARY_BACKEND_URL}/api/reception/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
          });
          // Не выбрасываем ошибку, если удаление пользователя не удалось
          if (!userDeleteRes.ok) {
            console.warn('Warning: Could not delete administrator user account');
          }
        } catch (err) {
          console.warn('Warning: Failed to delete administrator user account', err);
        }
      }

      return deletedAdmin;
    },
    onSuccess: (deletedAdmin) => {
      toast({
        title: 'Администратор удален',
        description: `Администратор "${deletedAdmin?.name || ''}" и его аккаунт успешно удалены из системы`,
        variant: 'default',
      });
      refetchAdministrators();
      setIsEditAdministratorDialogOpen(false);
      setEditAdministrator(null);
    },
    onError: (error) => {
      toast({
        title: 'Ошибка',
        description: `Не удалось удалить администратора: ${error}`,
        variant: 'destructive',
      });
    }
  });

  const handleAddAdministrator = (data: Partial<Administrator>) => {
    if (creatingAdminRef.current || createAdministratorMutation.isPending) return;
    creatingAdminRef.current = true;
    createAdministratorMutation.mutate(data, {
      onSettled: () => {
        creatingAdminRef.current = false;
      }
    });
  };

  const handleEditAdministrator = (administrator: Administrator) => {
    setEditAdministrator(administrator);
    setIsEditAdministratorDialogOpen(true);
  };

  const handleUpdateAdministrator = (data: Partial<Administrator>) => {
    if (editAdministrator) {
      const adminData = {
        ...data,
        branchId: currentBranch?.id?.toString(),
      };
      updateAdministratorMutation.mutate({ id: editAdministrator.id, data: adminData });
    }
  };

  const handleDeleteAdministrator = (id: number) => {
    if (window.confirm('Вы уверены, что хотите удалить этого администратора?')) {
      deleteAdministratorMutation.mutate(id);
    }
  };

  const uploadImageMutation = useMutation({
    mutationFn: async ({ masterId, file }: { masterId: number, file: File }) => {
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch(`${import.meta.env.VITE_SECONDARY_BACKEND_URL}/staff/${masterId}/upload-image`, {
        method: 'POST',
        body: formData
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to upload image');
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      setUploadingImages(prev => ({ ...prev, [variables.masterId]: false }));
      toast({
        title: t('masters.photo_uploaded'),
        description: t('masters.photo_uploaded'),
        variant: 'default',
      });
      refetch();
    },
    onError: (error, variables) => {
      setUploadingImages(prev => ({ ...prev, [variables.masterId]: false }));
      toast({
        title: t('masters.error_uploading_photo'),
        description: `${error}`,
        variant: 'destructive',
      });
    }
  });

  const handleEditClick = (master: Master) => {
    setEditMaster(master);
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (id: number) => {
    if (window.confirm('Вы уверены, что хотите удалить этого мастера?')) {
      deleteMasterMutation.mutate(id);
    }
  };

  const handleScheduleClick = (master: Master) => {
    setSelectedMasterForSchedule(master);
    setIsScheduleDialogOpen(true);
  };

  const creatingMasterRef = useRef(false);
  const handleAddMaster = (data: Partial<Master>) => {
    if (creatingMasterRef.current || createMasterMutation.isPending) return;
    creatingMasterRef.current = true;
    const masterData = {
      ...data,
      branchId: currentBranch?.id?.toString(),
    };
    createMasterMutation.mutate(masterData, {
      onSettled: () => {
        creatingMasterRef.current = false;
      }
    });
  };

  const handleImageUpload = (masterId: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Ошибка',
        description: 'Пожалуйста, выберите файл изображения',
        variant: 'destructive',
      });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Ошибка',
        description: 'Размер файла не должен превышать 5MB',
        variant: 'destructive',
      });
      return;
    }
    setUploadingImages(prev => ({ ...prev, [masterId]: true }));
    uploadImageMutation.mutate({ masterId, file });
  };

  const handleUpdateMaster = (data: Partial<Master>) => {
    if (editMaster) {
      const masterData = {
        ...data,
        branchId: currentBranch?.id?.toString(),
      };
      updateMasterMutation.mutate({ id: editMaster.id, data: masterData });
    }
  };
  console.log(masters)
  return (
    <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <Card className="rounded-xl shadow-lg mb-8">
        <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-t-xl">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-3 text-2xl">
              <User className="h-8 w-8" />
              {t('masters.page_title')}
            </CardTitle>
            <div className="flex gap-3">
              <Dialog open={isAddAdministratorDialogOpen} onOpenChange={setIsAddAdministratorDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/10 bg-white/5"
                  >
                    <User className="h-4 w-4 mr-2" />
                    {t('masters.add_administrator')}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto bg-white rounded-xl">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-semibold text-gray-900">{t('masters.add_administrator')}</DialogTitle>
                    <DialogDescription className="text-gray-500">
                      {t('masters.fill_admin_data')}
                    </DialogDescription>
                  </DialogHeader>
                  <AdministratorFormSimple
                    onSubmit={handleAddAdministrator}
                    isPending={createAdministratorMutation.isPending}
                  />
                </DialogContent>
              </Dialog>
              <Button
                onClick={() => setIsAddDialogOpen(true)}
                className="bg-white/20 hover:bg-white/30 text-white border-white/20"
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('masters.add_master')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-sm text-gray-600">
            {t('masters.management_description')}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : isError ? (
        <div className="bg-red-50 p-6 rounded-lg text-red-800 my-8 border border-red-200">
          {t('masters.loading_error')}
        </div>
      ) : !masters || masters.length === 0 ? (
        <div className="bg-gray-50 p-8 rounded-lg text-center my-8 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('masters.no_masters_title')}</h3>
          <p className="text-gray-500 mb-4">
            {t('masters.no_masters_description')}
          </p>
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('masters.add_master')}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {masters.data.map((master: Master) => (
            <MasterCard
              key={master.id}
              master={master}
              onEditClick={() => handleEditClick(master)}
              onDeleteClick={() => handleDeleteClick(master.id)}
              onScheduleClick={() => handleScheduleClick(master)}
              onImageUpload={handleImageUpload}
              isUploading={uploadingImages[master.id] || false}
            />
          ))}
        </div>
      )}

      <div className="mt-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('masters.administrators')}</h2>
        {administrators && administrators.data && administrators.data.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {administrators.data.map((administrator: Administrator) => (
              <AdministratorCard
                key={administrator.id}
                administrator={administrator}
                onEditClick={() => handleEditAdministrator(administrator)}
                onDeleteClick={() => handleDeleteAdministrator(administrator.id)}
              />
            ))}
          </div>
        ) : (
          <div className="bg-indigo-50 p-8 rounded-lg text-center my-8 border border-indigo-200">
            <h3 className="text-lg font-semibold text-indigo-900 mb-2">{t('masters.no_administrators_title')}</h3>
            <p className="text-indigo-700 mb-4">
              {t('masters.no_administrators_description')}
            </p>
            <Button
              onClick={() => setIsAddAdministratorDialogOpen(true)}
              variant="outline"
              className="border-indigo-200 text-indigo-600 hover:bg-indigo-50"
            >
              <User className="h-4 w-4 mr-2" />
              {t('masters.add_administrator')}
            </Button>
          </div>
        )}
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto bg-white rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900">{t('masters.add_new_master')}</DialogTitle>
            <DialogDescription className="text-gray-500">
              {t('masters.add_master_description')}
            </DialogDescription>
          </DialogHeader>
          <MasterFormSimple
            onSubmit={handleAddMaster}
            isPending={createMasterMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900">{t('masters.edit_master')}</DialogTitle>
            <DialogDescription className="text-gray-500">
              {t('masters.edit_master_description')}
            </DialogDescription>
          </DialogHeader>
          {editMaster && (
            <MasterForm
              master={editMaster}
              onSubmit={handleUpdateMaster}
              isPending={updateMasterMutation.isPending}
              branchUsers={branchUsers}
              onDelete={handleDeleteClick}
              isDeleting={deleteMasterMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-white rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900">{t('masters.working_dates')}</DialogTitle>
            <DialogDescription className="text-gray-500">
              {selectedMasterForSchedule && `Управление рабочими днями для ${selectedMasterForSchedule.name}`}
            </DialogDescription>
          </DialogHeader>
          {selectedMasterForSchedule && (
            <MasterWorkingDatesCalendar
              masterId={selectedMasterForSchedule.id}
              masterName={selectedMasterForSchedule.name}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isEditAdministratorDialogOpen} onOpenChange={setIsEditAdministratorDialogOpen}>
        <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-y-auto bg-white rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900">Редактировать администратора</DialogTitle>
            <DialogDescription className="text-gray-500">
              Измените данные администратора. Поля, отмеченные звездочкой (*), обязательны.
            </DialogDescription>
          </DialogHeader>
          {editAdministrator && (
            <AdministratorForm
              administrator={editAdministrator}
              onSubmit={handleUpdateAdministrator}
              isPending={updateAdministratorMutation.isPending}
              branchUsers={branchUsers}
              onDelete={handleDeleteAdministrator}
              isDeleting={deleteAdministratorMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Masters;
