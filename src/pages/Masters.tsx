import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiGetJson } from '@/lib/api';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, User, Clock, EditIcon, X, Plus, Camera, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import MasterWorkingDatesManager from "@/components/MasterWorkingDatesManager";
import MasterWorkingDatesDisplay from "@/components/MasterWorkingDatesDisplay";
import MasterWorkingDatesCalendar from "@/components/MasterWorkingDatesCalendar";
import MasterStoriesDialog from "@/components/MasterStoriesDialog";
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
  phoneNumber?: string; // Номер телефона для WhatsApp уведомлений
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
  onDelete?: (masterId: number) => void;
  isDeleting?: boolean;
}> = ({ master, onSubmit, isPending, branchUsers, onDelete, isDeleting }) => {
  const { t } = useLocale();
  const { currentBranch } = useBranch();
  const [formData, setFormData] = useState({
    name: master?.name || '',
    specialty: master?.specialty || '',
    description: master?.description || '',
    phoneNumber: master?.phoneNumber || '',
    isActive: master?.isActive ?? true,
    startWorkHour: master?.startWorkHour || '09:00',
    endWorkHour: master?.endWorkHour || '20:00',
  });

  const [accountData, setAccountData] = useState({
    email: '',
    password: '',
    createAccount: false
  });

  // workingDates больше НЕ нужны - компонент MasterWorkingDatesManager автономен
  
  // Прогресс заполнения формы
  const [formProgress, setFormProgress] = useState(0);

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
    // При редактировании мастера НЕ отправляем рабочие даты - они управляются отдельно через MasterWorkingDatesManager
    // При создании нового мастера рабочие даты будут пустыми - они управляются через отдельный компонент
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

  // handleWorkingDatesChange больше не нужен - компонент MasterWorkingDatesManager автономен

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
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 mb-4">
          <div className="text-sm font-medium text-blue-900">
            Филиал: <strong>{currentBranch?.branches || 'Не выбран'}</strong>
          </div>
        </div>
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
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="phoneNumber" className="col-span-1 text-sm font-medium text-gray-700">
              📲 {t('masters.phone_number')}
            </Label>
            <div className="col-span-3 space-y-2">
              <Input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                value={formData.phoneNumber}
                onChange={handleChange}
                className="rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                placeholder="+996701234567 или 0701234567"
              />
              <p className="text-xs text-gray-500">
                💬 Для WhatsApp уведомлений о новых записях (опционально)
              </p>
            </div>
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
                {accountData.email && (
                  <p className="text-xs text-blue-600">
                    Заполнено: <strong>{accountData.email}</strong>
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
        {/* Компонент теперь АВТОНОМЕН - управляет своими данными независимо от родителя */}
        <MasterWorkingDatesManager
          masterId={master?.id!}
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
            disabled={isPending || isDeleting || !formData.name.trim()}
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
    name: '',
    specialty: '',
    description: '',
    phoneNumber: '',
    isActive: true,
    startWorkHour: '09:00',
    endWorkHour: '20:00',
  });

  const [formProgress, setFormProgress] = useState(0);

  // Обновление прогресса заполнения формы
  useEffect(() => {
    const fields = [
      formData.name,
      formData.specialty,
      formData.description,
      formData.startWorkHour,
      formData.endWorkHour,
    ];
    const filledFields = fields.filter(field => field && typeof field === 'string' ? field.trim() !== '' : true).length;
    const progress = Math.round((filledFields / fields.length) * 100);
    setFormProgress(progress);
  }, [formData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, isActive: checked }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
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
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="phoneNumber-simple" className="col-span-1 text-sm font-medium text-gray-700">
              📲 {t('masters.phone_number')}
            </Label>
            <div className="col-span-3 space-y-2">
              <Input
                id="phoneNumber-simple"
                name="phoneNumber"
                type="tel"
                value={formData.phoneNumber}
                onChange={handleChange}
                className="rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                placeholder="+996701234567 или 0701234567"
              />
              <p className="text-xs text-gray-500">
                💬 Для WhatsApp уведомлений о новых записях (опционально)
              </p>
            </div>
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
          {master.phoneNumber && (
            <div className="flex items-center text-sm text-gray-600">
              <span className="mr-2">📲</span>
              <span className="font-medium">{master.phoneNumber}</span>
              <span className="ml-2 text-xs text-green-600">WhatsApp</span>
            </div>
          )}
          <MasterWorkingDatesDisplay masterId={master.id} masterName={master.name} />
          {master.description && (
            <p className="text-sm text-gray-500 line-clamp-3">
              {master.description}
            </p>
          )}
        </div>
      </CardContent>
      <CardFooter className="pt-4 border-t border-gray-100 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2 sm:gap-3 w-full">
          <Button
            variant="outline"
            size="sm"
            onClick={onEditClick}
            className="bg-green-600 hover:bg-green-700 text-white border-none flex-1 sm:flex-initial sm:min-w-[100px] text-sm"
          >
            <EditIcon className="h-4 w-4 mr-2" />
            {t('masters.configure')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onScheduleClick}
            className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-none hover:from-indigo-600 hover:to-purple-700 flex-1 sm:flex-initial sm:min-w-[100px] text-sm"
          >
            <Eye className="h-4 w-4 mr-2" />
            Stories
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDeleteClick}
            className="bg-white text-gray-700 border-gray-300 hover:bg-gray-50 flex-1 sm:flex-initial sm:min-w-[100px] text-sm"
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
    isActive: administrator?.isActive ?? true
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
    name: '',
    role: 'администратор',
    branchId: currentBranch?.id?.toString() || '',
    phoneNumber: '',
    email: '',
    notes: '',
    isActive: true
  });

  const [formProgress, setFormProgress] = useState(0);

  // Обновление прогресса заполнения формы
  useEffect(() => {
    const fields = [
      formData.name,
      formData.role,
      formData.phoneNumber,
      formData.email,
      formData.notes,
    ];
    const filledFields = fields.filter(field => field && typeof field === 'string' ? field.trim() !== '' : true).length;
    const progress = Math.round((filledFields / fields.length) * 100);
    setFormProgress(progress);
  }, [formData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, isActive: checked }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
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
      <CardFooter className="pt-3 border-t border-gray-100 flex flex-wrap gap-2 sm:gap-3 w-full">
        <Button
          variant="outline"
          size="sm"
          onClick={onEditClick}
          className="text-gray-600 border-gray-200 hover:bg-gray-50 flex-1 sm:flex-initial"
        >
          <EditIcon className="h-4 w-4 mr-2" />
          {t('masters.change')}
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={onDeleteClick}
          className="bg-red-600 hover:bg-red-700 flex-1 sm:flex-initial"
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
  const { currentBranch } = useBranch();

  const [editMaster, setEditMaster] = useState<Master | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedMasterForSchedule, setSelectedMasterForSchedule] = useState<Master | null>(null);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [selectedMasterForStories, setSelectedMasterForStories] = useState<Master | null>(null);
  const [isStoriesDialogOpen, setIsStoriesDialogOpen] = useState(false);
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
      if (!currentBranch?.id) {
        throw new Error('Branch not selected');
      }

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

      // ВАЖНО: рабочие даты больше НЕ обновляются здесь - они управляются отдельно через MasterWorkingDatesManager компонент
      // Пользователь может удалять/добавлять рабочие даты через интерфейс компонента MasterWorkingDatesManager
      
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
      // Сначала удаляем мастера из основной таблицы
      const deleteRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/crm/masters/${id}`, {
        method: 'DELETE'
      });
      if (!deleteRes.ok) {
        throw new Error('Failed to delete master');
      }
      const deletedMaster = await deleteRes.json();

      // Затем удаляем пользователя из таблицы users (если существует)
      if (deletedMaster?.id) {
        try {
          const userDeleteRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/masters/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
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
      // Сначала удаляем администратора из основной таблицы
      const deleteRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/administrators/${id}`, {
        method: 'DELETE',
      });
      if (!deleteRes.ok) {
        throw new Error('Failed to delete administrator');
      }
      const deletedAdmin = await deleteRes.json();

      // Затем удаляем пользователя из таблицы users (если существует)
      if (deletedAdmin?.id) {
        try {
          const userDeleteRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/reception/${id}`, {
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
      formData.append('photo', file);
      
      console.log('📤 Uploading photo for master:', masterId);
      console.log('📦 File size:', file.size, 'bytes');
      console.log('📄 File type:', file.type);
      
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/masters/${masterId}/photo`, {
        method: 'POST', // POST согласно финальной реализации API
        credentials: 'include',
        body: formData
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to upload photo');
      }
      
      const result = await res.json();
      console.log('✅ Upload response:', result);
      return result;
    },
    onSuccess: (data, variables) => {
      setUploadingImages(prev => ({ ...prev, [variables.masterId]: false }));
      
      // Показываем информацию о статусе обработки
      const description = data.status === 'processing' 
        ? `${data.message || t('masters.photo_processing')} (fileGuid: ${data.fileGuid})`
        : data.message || t('masters.photo_uploaded');
      
      toast({
        title: t('masters.photo_uploaded'),
        description: description,
        variant: 'default',
      });
      
      // Если статус processing, можно показать дополнительное уведомление
      if (data.status === 'processing') {
        toast({
          title: t('masters.photo_processing_title'),
          description: t('masters.photo_processing_desc'),
          variant: 'default',
        });
      }
      
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

  const handleStoriesClick = (master: Master) => {
    setSelectedMasterForStories(master);
    setIsStoriesDialogOpen(true);
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
    
    // Проверка типа файла
    if (!file.type.startsWith('image/')) {
      toast({
        title: t('masters.error'),
        description: t('masters.please_select_image'),
        variant: 'destructive',
      });
      return;
    }
    
    // Проверка размера файла (максимум 100MB согласно API)
    if (file.size > 100 * 1024 * 1024) {
      toast({
        title: t('masters.error'),
        description: t('masters.file_size_limit_100mb'),
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
    <div className="container mx-auto py-4 px-2 sm:py-8 sm:px-3 lg:px-6">
      {/* Header */}
      <Card className="rounded-xl shadow-lg mb-4 sm:mb-6">
        <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-t-xl p-2 sm:p-4">
          <div className="flex flex-col gap-2 sm:gap-3">
            <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-base sm:text-lg lg:text-xl">
              <User className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
              {t('masters.page_title')}
            </CardTitle>
            <div className="flex flex-col gap-1.5 w-full">
              <Button
                onClick={() => setIsAddDialogOpen(true)}
                className="bg-white/20 hover:bg-white/30 text-white border-white/20 w-full justify-center text-xs"
                variant="outline"
                size="sm"
              >
                <Plus className="h-3 w-3 mr-1.5" />
                <span>{t('masters.add_master')}</span>
              </Button>
              <Button
                onClick={() => setIsAddAdministratorDialogOpen(true)}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10 bg-white/5 w-full justify-center text-xs"
                size="sm"
              >
                <User className="h-3 w-3 mr-1.5" />
                <span>{t('masters.add_administrator')}</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-2 sm:p-3 lg:p-4">
          <div className="text-xs text-gray-600">
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
        <div className="bg-gray-50 p-4 sm:p-6 rounded-lg text-center my-6 border border-gray-200">
          <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-1.5">{t('masters.no_masters_title')}</h3>
          <p className="text-xs sm:text-sm text-gray-500 mb-3">
            {t('masters.no_masters_description')}
          </p>
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            <span className="text-sm">{t('masters.add_master')}</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
          {masters.map((master: Master) => (
            <MasterCard
              key={master.id}
              master={master}
              onEditClick={() => handleEditClick(master)}
              onDeleteClick={() => handleDeleteClick(master.id)}
              onScheduleClick={() => handleStoriesClick(master)}
              onImageUpload={handleImageUpload}
              isUploading={uploadingImages[master.id] || false}
            />
          ))}
        </div>
      )}

      <div className="mt-8 sm:mt-12">
        <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-3 sm:mb-4 lg:mb-6">{t('masters.administrators')}</h2>
        {administrators && administrators.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
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
          <div className="bg-indigo-50 p-6 sm:p-8 rounded-lg text-center my-8 border border-indigo-200">
            <h3 className="text-base sm:text-lg font-semibold text-indigo-900 mb-2">{t('masters.no_administrators_title')}</h3>
            <p className="text-sm sm:text-base text-indigo-700 mb-4">
              {t('masters.no_administrators_description')}
            </p>
            <Button
              onClick={() => setIsAddAdministratorDialogOpen(true)}
              variant="outline"
              className="border-indigo-200 text-indigo-600 hover:bg-indigo-50"
              size="sm"
            >
              <User className="h-4 w-4 mr-2" />
              <span className="text-sm">{t('masters.add_administrator')}</span>
            </Button>
          </div>
        )}
      </div>

      {/* Add Administrator Dialog */}
      <Dialog open={isAddAdministratorDialogOpen} onOpenChange={setIsAddAdministratorDialogOpen}>
        <DialogContent className="w-[95vw] max-w-[650px] max-h-[90vh] overflow-y-auto bg-white rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-semibold text-gray-900">{t('masters.add_administrator')}</DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              {t('masters.fill_admin_data')}
            </DialogDescription>
          </DialogHeader>
          <AdministratorFormSimple
            onSubmit={handleAddAdministrator}
            isPending={createAdministratorMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="w-[95vw] max-w-[650px] max-h-[90vh] overflow-y-auto bg-white rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-semibold text-gray-900">{t('masters.add_new_master')}</DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
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
        <DialogContent className="w-[95vw] max-w-[750px] max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-2xl">
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

      {/* Stories Dialog - Просмотр доступных временных слотов */}
      {selectedMasterForStories && (
        <MasterStoriesDialog
          isOpen={isStoriesDialogOpen}
          onClose={() => setIsStoriesDialogOpen(false)}
          masterId={selectedMasterForStories.id}
          masterName={selectedMasterForStories.name}
          branchId={currentBranch?.id?.toString()}
        />
      )}

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