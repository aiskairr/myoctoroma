import React, { useState, useEffect, useMemo } from 'react';
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

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
}

// Компонент формы мастера
const MasterForm: React.FC<{
  master?: Master;
  onSubmit: (data: Partial<Master>) => void;
  isPending: boolean;
  branchUsers?: BranchUser[];
}> = ({ master, onSubmit, isPending, branchUsers }) => {
  const { t } = useLocale();
  const [formData, setFormData] = useState({
    name: master?.name || '',
    specialty: master?.specialty || '',
    description: master?.description || '',
    isActive: master?.isActive ?? true,
    startWorkHour: master?.startWorkHour || '09:00',
    endWorkHour: master?.endWorkHour || '20:00',
  });

  const [accountData, setAccountData] = useState({
    email: '',
    password: '',
    createAccount: false
  });

  const [workingDates, setWorkingDates] = useState<WorkingDate[]>(master?.workingDates || []);

  // Прогресс заполнения формы
  const [formProgress, setFormProgress] = useState(0);

  // Поиск пользователя в данных из нового эндпоинта
  const userAccountData = useMemo(() => {
    if (!master?.name || !branchUsers) return null;
    return findUserByName(branchUsers, master.name);
  }, [master?.name, branchUsers]);

  // Загрузка рабочих дат при редактировании, если они не предоставлены
  const { data: fetchedWorkingDates, isLoading: isLoadingDates } = useQuery({
    queryKey: ['working-dates', master?.id],
    queryFn: async () => {
      if (!master) return [];
      return await apiGetJson(`/api/masters/${master.id}/working-dates`);
    },
    enabled: !!master && (!master.workingDates || master.workingDates.length === 0),
  });

  useEffect(() => {
    if (fetchedWorkingDates) {
      setWorkingDates(fetchedWorkingDates);
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

  const handleCreateAccountToggle = (checked: boolean) => {
    if (checked) {
      if (userAccountData) {
        // При редактировании: если пользователь существует в БД, заполняем email
        setAccountData({
          createAccount: true,
          email: userAccountData.email || '',
          password: '' // Пароль не приходит из API для безопасности
        });
      } else {
        // При создании нового мастера: оставляем текущие значения
        setAccountData((prev) => ({
          ...prev,
          createAccount: true
        }));
      }
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

      {/* Область создания аккаунта */}
      <div className="space-y-6 bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">
            {master && userAccountData ? t('masters.edit_account') : t('masters.create_account')}
          </h3>
          <Switch
            checked={accountData.createAccount}
            onCheckedChange={handleCreateAccountToggle}
            className="data-[state=checked]:bg-indigo-600"
          />
        </div>
        <Separator />

        {master && userAccountData && !accountData.createAccount && (
          <div className="p-4 bg-green-50 rounded-lg border border-green-200 transition-all duration-200">
            <p className="text-sm font-medium text-green-800 mb-2">✓ Аккаунт существует в системе:</p>
            <div className="space-y-1 text-sm text-gray-600">
              <p><strong>Логин:</strong> {userAccountData.username}</p>
              <p><strong>Email:</strong> {userAccountData.email}</p>
              <p><strong>Роль:</strong> {userAccountData.role}</p>
              <p><strong>ID:</strong> {userAccountData.id}</p>
              <p><strong>Филиал:</strong> {userAccountData.branchId}</p>
            </div>
            <p className="text-xs text-green-700 mt-3">Включите переключатель выше, чтобы отредактировать данные аккаунта</p>
          </div>
        )}
        {accountData.createAccount && (
          <div className="space-y-5 p-4 bg-blue-50 rounded-lg border border-blue-200 transition-all duration-200">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="accountEmail" className="col-span-1 text-sm font-medium text-gray-700">
                {t('masters.email')}
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
                {userAccountData && (
                  <p className="text-xs text-blue-600">
                    Текущее значение из системы: <strong>{userAccountData.email}</strong>
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="accountPassword" className="col-span-1 text-sm font-medium text-gray-700">
                {t('masters.password')}
              </Label>
              <div className="col-span-3 space-y-2">
                <Input
                  id="accountPassword"
                  name="password"
                  type="password"
                  value={accountData.password}
                  onChange={handleAccountDataChange}
                  className="rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                  placeholder={userAccountData ? "Оставить пустым для сохранения текущего пароля, или введите новый" : "Введите пароль"}
                  required={accountData.createAccount && !userAccountData}
                />
                {userAccountData && (
                  <p className="text-xs text-blue-600">
                    Пароль из системы не отображается в целях безопасности. Оставьте это поле пустым, чтобы сохранить текущий пароль.
                  </p>
                )}
              </div>
            </div>
            <div className="p-3 bg-white rounded-lg border border-blue-200">
              <div className="space-y-1 text-sm text-gray-600">
                <p><strong>Логин:</strong> {userAccountData ? userAccountData.username : formData.name || 'Заполните имя мастера выше'}</p>
                <p><strong>Роль:</strong> master</p>
                <p><strong>Филиал:</strong> {master?.id ? `ID: ${master.id}` : 'Будет установлен после создания'}</p>
                {userAccountData && (
                  <p className="text-green-600 mt-2">✓ Вы редактируете существующий аккаунт</p>
                )}
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
          disabled={isPending || !formData.name.trim()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white transition-all duration-200"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {master ? t('masters.save') : t('masters.add_master')}
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
      className={`relative overflow-hidden transition-all duration-300 ${!master.isActive ? 'opacity-80 bg-gray-50' : 'bg-white'
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
                {!master.isActive && (
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
}> = ({ administrator, onSubmit, isPending, branchUsers }) => {
  const { t } = useLocale();
  const { currentBranch } = useBranch();
  const [formData, setFormData] = useState({
    name: administrator?.name || '',
    role: administrator?.role || 'администратор',
    branchId: administrator?.branchId || currentBranch?.id?.toString(),
    phoneNumber: administrator?.phoneNumber || '',
    email: administrator?.email || '',
    notes: administrator?.notes || '',
    isActive: administrator?.isActive ?? true
  });

  const [accountData, setAccountData] = useState({
    email: '',
    password: '',
    createAccount: false
  });

  // Прогресс заполнения формы
  const [formProgress, setFormProgress] = useState(0);

  // Поиск пользователя в данных из нового эндпоинта
  const userAccountData = useMemo(() => {
    if (!administrator?.name || !branchUsers) return null;
    return findUserByName(branchUsers, administrator.name);
  }, [administrator?.name, branchUsers]);

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

  const handleCreateAccountToggle = (checked: boolean) => {
    if (checked) {
      if (userAccountData) {
        // При редактировании: если пользователь существует в БД, заполняем email
        setAccountData({
          createAccount: true,
          email: userAccountData.email || '',
          password: '' // Пароль не приходит из API для безопасности
        });
      } else {
        // При создании нового администратора: оставляем текущие значения
        setAccountData((prev) => ({
          ...prev,
          createAccount: true
        }));
      }
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
      ...(accountData.createAccount && {
        createAccount: true,
        accountEmail: accountData.email,
        accountPassword: accountData.password
      })
    };
    onSubmit(combinedData);
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

      {/* Область создания аккаунта */}
      <div className="space-y-6 bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">
            {administrator && userAccountData ? t('masters.edit_account') : t('masters.create_account')}
          </h3>
          <Switch
            checked={accountData.createAccount}
            onCheckedChange={handleCreateAccountToggle}
            className="data-[state=checked]:bg-indigo-600"
          />
        </div>
        <Separator />

        {administrator && userAccountData && !accountData.createAccount && (
          <div className="p-4 bg-green-50 rounded-lg border border-green-200 transition-all duration-200">
            <p className="text-sm font-medium text-green-800 mb-2">✓ Аккаунт существует в системе:</p>
            <div className="space-y-1 text-sm text-gray-600">
              <p><strong>Логин:</strong> {userAccountData.username}</p>
              <p><strong>Email:</strong> {userAccountData.email}</p>
              <p><strong>Роль:</strong> {userAccountData.role}</p>
              <p><strong>ID:</strong> {userAccountData.id}</p>
              <p><strong>Филиал:</strong> {userAccountData.branchId}</p>
            </div>
            <p className="text-xs text-green-700 mt-3">Включите переключатель выше, чтобы отредактировать данные аккаунта</p>
          </div>
        )}
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
                {userAccountData && (
                  <p className="text-xs text-blue-600">
                    Текущее значение из системы: <strong>{userAccountData.email}</strong>
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
                  placeholder={userAccountData ? "Оставить пустым для сохранения текущего пароля, или введите новый" : "Введите пароль"}
                  required={accountData.createAccount && !userAccountData}
                />
                {userAccountData && (
                  <p className="text-xs text-blue-600">
                    Пароль из системы не отображается в целях безопасности. Оставьте это поле пустым, чтобы сохранить текущий пароль.
                  </p>
                )}
              </div>
            </div>
            <div className="p-3 bg-white rounded-lg border border-blue-200">
              <div className="space-y-1 text-sm text-gray-600">
                <p><strong>Логин:</strong> {userAccountData ? userAccountData.username : formData.name || 'Заполните имя администратора выше'}</p>
                <p><strong>Роль:</strong> reception</p>
                <p><strong>Филиал:</strong> {administrator?.id ? `ID: ${administrator.id}` : 'Будет установлен после создания'}</p>
                {userAccountData && (
                  <p className="text-green-600 mt-2">✓ Вы редактируете существующий аккаунт</p>
                )}
              </div>
            </div>
          </div>
        )}
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
          disabled={isPending || !formData.name.trim()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white transition-all duration-200"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {administrator ? t('masters.save_changes') : t('masters.add_administrator')}
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
          <Badge variant={administrator.isActive ? "default" : "destructive"} className={administrator.isActive ? "bg-green-100 text-green-800 hover:bg-green-100" : "bg-red-100 text-red-800"}>
            {administrator.isActive ? t('masters.active_status') : t('masters.inactive')}
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
const findUserByName = (users: BranchUser[] | undefined, name: string): BranchUser | undefined => {
  if (!users || !Array.isArray(users) || !name) return undefined;
  return users.find(user => user.username.toLowerCase().trim() === name.toLowerCase().trim());
};

// Основной компонент страницы мастеров
const Masters: React.FC = () => {
  const { t } = useLocale();
  const { toast } = useToast();
  const { currentBranch } = useBranch();

  const [editMaster, setEditMaster] = useState<Master | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedMasterForSchedule, setSelectedMasterForSchedule] = useState<Master | null>(null);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [uploadingImages, setUploadingImages] = useState<{ [key: number]: boolean }>({});
  const [isAddAdministratorDialogOpen, setIsAddAdministratorDialogOpen] = useState(false);
  const [editAdministrator, setEditAdministrator] = useState<Administrator | null>(null);
  const [isEditAdministratorDialogOpen, setIsEditAdministratorDialogOpen] = useState(false);

  // Запрос для получения пользователей филиала с ролями master и reception
  const { data: branchUsers } = useQuery({
    queryKey: ['/api/crm/reception-master/user', currentBranch?.id],
    queryFn: async () => {
      if (!currentBranch?.id) {
        return [];
      }
      const url = `/api/crm/reception-master/user/${currentBranch.id}`;
      const result = await apiGetJson(url);
      return Array.isArray(result) ? result : [];
    },
    enabled: !!currentBranch?.id,
  });

  const { data: administrators, refetch: refetchAdministrators } = useQuery({
    queryKey: ['/api/administrators', currentBranch?.id],
    queryFn: async () => {
      if (!currentBranch?.id) {
        return [];
      }
      const url = `/api/administrators?branchID=${currentBranch.id}`;
      return await apiGetJson(url);
    },
    enabled: !!currentBranch?.id,
  });

  const { data: masters, isLoading, isError, refetch } = useQuery({
    queryKey: ['/api/crm/masters', currentBranch?.id],
    queryFn: async () => {
      if (!currentBranch?.id) {
        return [];
      }
      const url = `/api/crm/masters/${currentBranch.id}`;
      return await apiGetJson(url);
    },
    enabled: !!currentBranch?.id,
  });

  const createMasterMutation = useMutation({
    mutationFn: async (data: Partial<Master>) => {
      const { workingDates, createAccount, accountEmail, accountPassword, ...masterData } = data;

      // Создаем мастера
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/crm/masters/${currentBranch.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(masterData)
      });
      if (!res.ok) {
        throw new Error('Failed to create master');
      }
      const newMaster = await res.json();

      // Создаем аккаунт пользователя, если требуется
      if (createAccount && accountEmail && accountPassword) {
        const userRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/register-user`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            username: newMaster.name,
            email: accountEmail,
            password: accountPassword,
            role: 'master',
            master_id: newMaster.id,
            branchId: currentBranch?.id?.toString(),
            organisationId: currentBranch?.organisationId?.toString()
          })
        });
        if (!userRes.ok) {
          const errorData = await userRes.json();
          throw new Error(errorData.message || 'Failed to create user account');
        }
      }

      // Добавляем рабочие даты
      if (workingDates && workingDates.length > 0) {
        await Promise.all(workingDates.map(async (wd) => {
          await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/masters/${newMaster.id}/working-dates`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              workDate: wd.date,
              startTime: wd.startTime,
              endTime: wd.endTime,
              branchId: wd.branchId
            })
          });
        }));
      }
      return newMaster;
    },
    onSuccess: () => {
      setIsAddDialogOpen(false);
      toast({
        title: t('masters.master_created'),
        description: t('masters.master_created'),
        variant: 'default',
      });
      refetch();
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
      const { workingDates, createAccount, accountEmail, accountPassword, ...masterData } = data;

      // Обновляем мастера
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/crm/masters/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(masterData)
      });
      if (!res.ok) {
        throw new Error('Failed to update master');
      }
      const updatedMaster = await res.json();

      // Создаем или обновляем аккаунт пользователя, если требуется
      if (createAccount && accountEmail && accountPassword) {
        const userRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/register-user`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            username: updatedMaster.name,
            email: accountEmail,
            password: accountPassword,
            role: 'master',
            master_id: id,
            branchId: currentBranch?.id?.toString(),
            organisationId: currentBranch?.organisationId?.toString()
          })
        });
        if (!userRes.ok) {
          const errorData = await userRes.json();
          if (!errorData.message?.includes('already exists')) {
            throw new Error(errorData.message || 'Failed to create/update user account');
          }
        }
      }

      // Обновляем рабочие даты: удаляем все существующие и добавляем новые
      if (workingDates) {
        const allWorkingDatesRes = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/api/masters/${id}/working-dates`
        );
        if (allWorkingDatesRes.ok) {
          const allWorkingDates = await allWorkingDatesRes.json();
          await Promise.all(allWorkingDates.map(async (cwd: any) => {
            await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/masters/${id}/working-dates/${cwd.work_date}?branchId=${cwd.branch_id}`, {
              method: 'DELETE'
            });
          }));
        }
        await Promise.all(workingDates.map(async (wd) => {
          await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/masters/${id}/working-dates`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              workDate: wd.date,
              startTime: wd.startTime,
              endTime: wd.endTime,
              branchId: wd.branchId
            })
          });
        }));
      }
      return updatedMaster;
    },
    onSuccess: () => {
      setIsEditDialogOpen(false);
      setEditMaster(null);
      toast({
        title: t('masters.master_updated'),
        description: t('masters.master_updated'),
        variant: 'default',
      });
      refetch();
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
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/crm/masters/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        throw new Error('Failed to delete master');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: t('masters.master_deleted'),
        description: t('masters.master_deleted'),
        variant: 'default',
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: 'Ошибка',
        description: `${error}`,
        variant: 'destructive',
      });
    }
  });

  const createAdministratorMutation = useMutation({
    mutationFn: async (data: Partial<Administrator>) => {
      const { createAccount, accountEmail, accountPassword, ...adminData } = data;

      // Создаем администратора
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/administrators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adminData)
      });
      if (!res.ok) {
        throw new Error('Failed to create administrator');
      }
      const newAdmin = await res.json();

      // Создаем аккаунт пользователя, если требуется
      if (createAccount && accountEmail && accountPassword) {
        const userRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/register-user`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            username: newAdmin.name,
            email: accountEmail,
            password: accountPassword,
            role: 'reception',
            administrator_id: newAdmin.id,
            branchId: currentBranch?.id?.toString(),
            organisationId: currentBranch?.organisationId?.toString()
          })
        });
        if (!userRes.ok) {
          const errorData = await userRes.json();
          throw new Error(errorData.message || 'Failed to create user account');
        }
      }

      return newAdmin;
    },
    onSuccess: () => {
      setIsAddAdministratorDialogOpen(false);
      toast({
        title: 'Администратор добавлен',
        description: 'Новый администратор успешно добавлен в систему',
        variant: 'default',
      });
      refetchAdministrators();
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
      const { createAccount, accountEmail, accountPassword, ...adminData } = data;

      // Обновляем администратора
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/administrators/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(adminData)
      });
      if (!res.ok) {
        throw new Error('Failed to update administrator');
      }
      const updatedAdmin = await res.json();

      // Создаем или обновляем аккаунт пользователя, если требуется
      if (createAccount && accountEmail && accountPassword) {
        const userRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/register-user`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            username: updatedAdmin.name,
            email: accountEmail,
            password: accountPassword,
            role: 'reception',
            administrator_id: id,
            branchId: currentBranch?.id?.toString(),
            organisationId: currentBranch?.organisationId?.toString()
          })
        });
        if (!userRes.ok) {
          const errorData = await userRes.json();
          if (!errorData.message?.includes('already exists')) {
            throw new Error(errorData.message || 'Failed to create/update user account');
          }
        }
      }

      return updatedAdmin;
    },
    onSuccess: () => {
      setIsEditAdministratorDialogOpen(false);
      setEditAdministrator(null);
      toast({
        title: 'Администратор обновлен',
        description: 'Данные администратора успешно обновлены',
        variant: 'default',
      });
      refetchAdministrators();
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
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/administrators/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        throw new Error('Failed to delete administrator');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Администратор удален',
        description: 'Администратор успешно удален из системы',
        variant: 'default',
      });
      refetchAdministrators();
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
    createAdministratorMutation.mutate(data);
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
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/crm/masters/${masterId}/upload-image`, {
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

  const handleAddMaster = (data: Partial<Master>) => {
    const masterData = {
      ...data,
      branchId: currentBranch?.id?.toString(),
    };
    createMasterMutation.mutate(masterData);
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
                <DialogContent className="sm:max-w-[425px] bg-white rounded-xl">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-semibold text-gray-900">{t('masters.add_administrator')}</DialogTitle>
                    <DialogDescription className="text-gray-500">
                      {t('masters.fill_admin_data')}
                    </DialogDescription>
                  </DialogHeader>
                  <AdministratorForm
                    onSubmit={handleAddAdministrator}
                    isPending={createAdministratorMutation.isPending}
                    branchUsers={branchUsers}
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
          {masters.map((master: Master) => (
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
        {administrators && administrators.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {administrators.map((administrator: Administrator) => (
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
        <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-y-auto bg-white rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900">{t('masters.add_new_master')}</DialogTitle>
            <DialogDescription className="text-gray-500">
              {t('masters.add_master_description')}
            </DialogDescription>
          </DialogHeader>
          <MasterForm
            onSubmit={handleAddMaster}
            isPending={createMasterMutation.isPending}
            branchUsers={branchUsers}
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
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto bg-white rounded-xl">
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
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Masters;