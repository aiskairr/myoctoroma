import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, User, Clock, EditIcon, X, Plus, CalendarDays, Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "../lib/queryClient";
import MasterWorkingDatesManager from "@/components/MasterWorkingDatesManager";
import MasterWorkingDatesDisplay from "@/components/MasterWorkingDatesDisplay";
import MasterWorkingDatesCalendar from "@/components/MasterWorkingDatesCalendar";
import { useBranch } from "@/contexts/BranchContext";
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

// Интерфейс для мастера
interface Master {
  id: number;
  name: string;
  specialty?: string;
  description?: string;
  isActive: boolean;
  startWorkHour: string;
  endWorkHour: string;
  createdAt: string;
  photoUrl?: string;
  workingDates?: WorkingDate[];
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
  createdAt: string;
}

// Компонент формы мастера
const MasterForm: React.FC<{
  master?: Master;
  onSubmit: (data: Partial<Master>) => void;
  isPending: boolean;
}> = ({ master, onSubmit, isPending }) => {
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

  const { data: userAccountData } = useQuery({
    queryKey: ['/api/crm/masters', master?.id, 'user-account'],
    queryFn: async () => {
      if (!master?.id) return null;
      const response = await fetch(`/api/crm/masters/${master.id}/user-account`);
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Failed to fetch user account');
      }
      return response.json();
    },
    enabled: !!master?.id,
  });

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
    if (checked && userAccountData) {
      setAccountData({
        createAccount: true,
        email: userAccountData.email || '',
        password: userAccountData.password || ''
      });
    } else {
      setAccountData((prev) => ({
        ...prev,
        createAccount: checked,
        email: checked ? prev.email : '',
        password: checked ? prev.password : ''
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

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Прогресс заполнения формы */}
      <div className="relative">
        <Progress value={formProgress} className="h-2 bg-gray-100" />
        <span className="absolute -top-6 right-0 text-sm text-gray-500">
          Заполнено: {formProgress}%
        </span>
      </div>

      {/* Основная информация */}
      <div className="space-y-6 bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">Основная информация</h3>
          <Badge variant="outline" className="text-indigo-600 border-indigo-200">
            {master ? 'Редактирование' : 'Создание'}
          </Badge>
        </div>
        <Separator />
        <div className="space-y-5">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="col-span-1 text-sm font-medium text-gray-700">
              Имя <span className="text-red-500">*</span>
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
              Специализация
            </Label>
            <Input
              id="specialty"
              name="specialty"
              value={formData.specialty}
              onChange={handleChange}
              className="col-span-3 rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
              placeholder="Массажист, тренер и т.д."
            />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="description" className="col-span-1 pt-2 text-sm font-medium text-gray-700">
              Описание
            </Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="col-span-3 min-h-[120px] rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
              placeholder="Дополнительная информация о мастере"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="isActive" className="col-span-1 text-sm font-medium text-gray-700">
              Активный
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
              Время работы
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
              <span className="text-gray-500">до</span>
              <Input
                id="endWorkHour"
                name="endWorkHour"
                type="time"
                value={formData.endWorkHour}
                onChange={handleChange}
                className="w-28 rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
              />
              <span className="text-xs text-gray-500 ml-2">
                (по умолчанию)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Область создания аккаунта */}
      {master && (
        <div className="space-y-6 bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-gray-900">
              {userAccountData ? 'Редактировать аккаунт' : 'Создать аккаунт'}
            </h3>
            <Switch
              checked={accountData.createAccount}
              onCheckedChange={handleCreateAccountToggle}
              className="data-[state=checked]:bg-indigo-600"
            />
          </div>
          <Separator />
          {userAccountData && !accountData.createAccount && (
            <div className="p-4 bg-green-50 rounded-lg border border-green-200 transition-all duration-200">
              <p className="text-sm font-medium text-green-800 mb-2">Аккаунт существует:</p>
              <div className="space-y-1 text-sm text-gray-600">
                <p><strong>Логин:</strong> {userAccountData.username}</p>
                <p><strong>Email:</strong> {userAccountData.email}</p>
                <p><strong>Роль:</strong> {userAccountData.role}</p>
              </div>
            </div>
          )}
          {accountData.createAccount && (
            <div className="space-y-5 p-4 bg-blue-50 rounded-lg border border-blue-200 transition-all duration-200">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="accountEmail" className="col-span-1 text-sm font-medium text-gray-700">
                  Email
                </Label>
                <Input
                  id="accountEmail"
                  name="email"
                  type="email"
                  value={accountData.email}
                  onChange={handleAccountDataChange}
                  className="col-span-3 rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                  placeholder="email@example.com"
                  required={accountData.createAccount}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="accountPassword" className="col-span-1 text-sm font-medium text-gray-700">
                  Пароль
                </Label>
                <Input
                  id="accountPassword"
                  name="password"
                  type="password"
                  value={accountData.password}
                  onChange={handleAccountDataChange}
                  className="col-span-3 rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                  placeholder={userAccountData ? "Введите новый пароль" : "Введите пароль"}
                  required={accountData.createAccount}
                />
              </div>
              <div className="p-3 bg-white rounded-lg border border-blue-200">
                <div className="space-y-1 text-sm text-gray-600">
                  <p><strong>Логин:</strong> {userAccountData ? userAccountData.username : formData.name}</p>
                  <p><strong>Роль:</strong> master</p>
                  <p><strong>Филиал:</strong> {master?.id ? `ID: ${master.id}` : 'Будет установлен после создания'}</p>
                  {userAccountData && (
                    <p className="text-green-600 mt-2">✓ Аккаунт уже существует, редактируете данные</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Рабочие даты */}
      <div className="space-y-6 bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <h3 className="text-xl font-semibold text-gray-900">Рабочие дни и часы</h3>
        <Separator />
        <MasterWorkingDatesManager
          masterId={master?.id}
          workingDates={workingDates}
          onWorkingDatesChange={handleWorkingDatesChange}
        />
      </div>

      <DialogFooter className="mt-8 flex justify-between">
        <Button
          variant="outline"
          onClick={() => window.dispatchEvent(new Event('close-dialog'))}
          className="border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          Отмена
        </Button>
        <Button
          type="submit"
          disabled={isPending || !formData.name.trim()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white transition-all duration-200"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {master ? 'Сохранить изменения' : 'Добавить мастера'}
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
  return (
    <Card className={`relative overflow-hidden transition-all duration-300 ${!master.isActive ? 'opacity-80 bg-gray-50' : 'bg-white'} hover:shadow-lg border-none shadow-sm`}>
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
                  <Badge variant="secondary" className="ml-2 bg-gray-200 text-gray-700">
                    Неактивен
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
          <MasterWorkingDatesDisplay workingDates={master.workingDates || []} />
          {master.description && (
            <p className="text-sm text-gray-500 line-clamp-3">
              {master.description}
            </p>
          )}
        </div>
      </CardContent>
      <CardFooter className="pt-4 border-t border-gray-100 flex justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={onScheduleClick}
          className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
        >
          <CalendarDays className="h-4 w-4 mr-2" />
          Рабочие дни
        </Button>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onEditClick}
            className="text-gray-600 border-gray-200 hover:bg-gray-50"
          >
            <EditIcon className="h-4 w-4 mr-2" />
            Изменить
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={onDeleteClick}
            className="bg-red-600 hover:bg-red-700"
          >
            <X className="h-4 w-4 mr-2" />
            Удалить
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
}> = ({ administrator, onSubmit, isPending }) => {
  const { currentBranch } = useBranch();
  const [formData, setFormData] = useState({
    name: administrator?.name || '',
    role: administrator?.role || 'администратор',
    branchId: administrator?.branchId || currentBranch.waInstance,
    phoneNumber: administrator?.phoneNumber || '',
    email: administrator?.email || '',
    notes: administrator?.notes || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="admin-name" className="text-sm font-medium text-gray-700">
          Имя *
        </Label>
        <Input
          id="admin-name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Введите имя администратора"
          className="rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="admin-role" className="text-sm font-medium text-gray-700">
          Роль
        </Label>
        <Input
          id="admin-role"
          value={formData.role}
          onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
          placeholder="администратор"
          className="rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="admin-phone" className="text-sm font-medium text-gray-700">
          Телефон
        </Label>
        <Input
          id="admin-phone"
          value={formData.phoneNumber}
          onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
          placeholder="+7-777-123-4567"
          className="rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="admin-email" className="text-sm font-medium text-gray-700">
          Email
        </Label>
        <Input
          id="admin-email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          placeholder="admin@tamgaspa.com"
          className="rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="admin-notes" className="text-sm font-medium text-gray-700">
          Заметки
        </Label>
        <Textarea
          id="admin-notes"
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Дополнительная информация"
          rows={3}
          className="rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>
      <DialogFooter>
        <Button
          type="submit"
          disabled={isPending || !formData.name.trim()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {administrator ? 'Обновить' : 'Добавить'} администратора
        </Button>
      </DialogFooter>
    </form>
  );
};

// Компонент карточки администратора
const AdministratorCard: React.FC<{
  administrator: Administrator;
  onDeleteClick: () => void;
}> = ({ administrator, onDeleteClick }) => {
  return (
    <Card className="w-full max-w-sm mx-auto bg-white border-none shadow-sm hover:shadow-lg transition-all duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">
            {administrator.name}
          </CardTitle>
          <Badge variant={administrator.isActive ? "default" : "destructive"} className={administrator.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
            {administrator.isActive ? 'Активен' : 'Неактивен'}
          </Badge>
        </div>
        <CardDescription className="text-sm text-gray-500">
          {administrator.role}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2 text-sm">
          <div className="flex items-center space-x-2 text-gray-600">
            <User className="h-4 w-4 text-indigo-500" />
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
            <div className="mt-2 p-2 bg-indigo-50 rounded text-xs text-gray-600">
              {administrator.notes}
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="pt-3 border-t border-gray-100">
        <Button
          variant="destructive"
          size="sm"
          onClick={onDeleteClick}
          className="w-full bg-red-600 hover:bg-red-700"
        >
          <X className="h-4 w-4 mr-2" />
          Удалить
        </Button>
      </CardFooter>
    </Card>
  );
};

// Основной компонент страницы мастеров
const Masters: React.FC = () => {
  const { toast } = useToast();
  const { currentBranch } = useBranch();
  const [editMaster, setEditMaster] = useState<Master | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedMasterForSchedule, setSelectedMasterForSchedule] = useState<Master | null>(null);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [uploadingImages, setUploadingImages] = useState<{ [key: number]: boolean }>({});
  const [isAddAdministratorDialogOpen, setIsAddAdministratorDialogOpen] = useState(false);

  const { data: administrators, refetch: refetchAdministrators } = useQuery({
    queryKey: ['/api/administrators', currentBranch.waInstance],
    queryFn: async () => {
      const res = await fetch(`/api/administrators?branchId=${currentBranch.waInstance}`);
      if (!res.ok) {
        throw new Error('Failed to fetch administrators');
      }
      return res.json();
    }
  });

  const { data: masters, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['/api/crm/masters', currentBranch.waInstance],
    queryFn: async () => {
      console.log('Fetching masters data for branch:', currentBranch.waInstance);
      try {
        const url = `/api/crm/masters?branchId=${currentBranch.waInstance}`;
        console.log('Masters API URL:', url);
        const res = await fetch(url);
        console.log('Masters API response status:', res.status);
        if (!res.ok) {
          const errorText = await res.text();
          console.error('API Error Response:', errorText);
          throw new Error(`Failed to fetch masters: ${res.status} ${errorText}`);
        }
        const data = await res.json();
        console.log('Successfully loaded masters data:', data.length, 'items found');
        const mastersWithWorkingDates = await Promise.all(
          data.map(async (master: Master) => {
            try {
              const currentDate = new Date();
              const workingDatesRes = await fetch(
                `/api/masters/${master.id}/working-dates?month=${currentDate.getMonth() + 1}&year=${currentDate.getFullYear()}`
              );
              if (workingDatesRes.ok) {
                const workingDates = await workingDatesRes.json();
                return {
                  ...master,
                  workingDates: workingDates.map((wd: any) => ({
                    date: wd.work_date,
                    startTime: wd.start_time,
                    endTime: wd.end_time,
                    branchId: wd.branch_id
                  }))
                };
              }
              return { ...master, workingDates: [] };
            } catch (err) {
              console.error(`Failed to load working dates for master ${master.id}:`, err);
              return { ...master, workingDates: [] };
            }
          })
        );
        return mastersWithWorkingDates;
      } catch (err) {
        console.error('Error in masters fetch:', err);
        throw err;
      }
    }
  });

  React.useEffect(() => {
    if (isError) {
      console.error('Masters query error:', error);
    }
  }, [isError, error]);

  const createMasterMutation = useMutation({
    mutationFn: async (data: Partial<Master>) => {
      const { workingDates, ...masterData } = data;
      const res = await fetch('/api/crm/masters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(masterData)
      });
      if (!res.ok) {
        throw new Error('Failed to create master');
      }
      const newMaster = await res.json();
      if (workingDates && workingDates.length > 0) {
        await Promise.all(workingDates.map(async (wd) => {
          await fetch(`/api/masters/${newMaster.id}/working-dates`, {
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
        title: 'Мастер добавлен',
        description: 'Новый мастер успешно добавлен',
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
      const { workingDates, ...masterData } = data;
      const res = await fetch(`/api/crm/masters/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(masterData)
      });
      if (!res.ok) {
        throw new Error('Failed to update master');
      }
      const updatedMaster = await res.json();
      if (workingDates) {
        const currentDate = new Date();
        const currentWorkingDatesRes = await fetch(
          `/api/masters/${id}/working-dates?month=${currentDate.getMonth() + 1}&year=${currentDate.getFullYear()}`
        );
        if (currentWorkingDatesRes.ok) {
          const currentWorkingDates = await currentWorkingDatesRes.json();
          await Promise.all(currentWorkingDates.map(async (cwd: any) => {
            await fetch(`/api/masters/${id}/working-dates/${cwd.work_date}?branchId=${cwd.branch_id}`, {
              method: 'DELETE'
            });
          }));
        }
        await Promise.all(workingDates.map(async (wd) => {
          await fetch(`/api/masters/${id}/working-dates`, {
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
        title: 'Мастер обновлен',
        description: 'Данные мастера успешно обновлены',
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
      const res = await fetch(`/api/crm/masters/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        throw new Error('Failed to delete master');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Мастер удален',
        description: 'Мастер успешно удален из системы',
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
      const res = await fetch('/api/administrators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        throw new Error('Failed to create administrator');
      }
      return res.json();
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

  const deleteAdministratorMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/administrators/${id}`, {
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

  const handleDeleteAdministrator = (id: number) => {
    if (window.confirm('Вы уверены, что хотите удалить этого администратора?')) {
      deleteAdministratorMutation.mutate(id);
    }
  };

  const uploadImageMutation = useMutation({
    mutationFn: async ({ masterId, file }: { masterId: number, file: File }) => {
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch(`/api/crm/masters/${masterId}/upload-image`, {
        method: 'POST',
        body: formData
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to upload image');
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      setUploadingImages(prev => ({ ...prev, [variables.masterId]: false }));
      toast({
        title: 'Изображение загружено',
        description: 'Фотография мастера успешно загружена',
        variant: 'default',
      });
      refetch();
    },
    onError: (error, variables) => {
      setUploadingImages(prev => ({ ...prev, [variables.masterId]: false }));
      toast({
        title: 'Ошибка загрузки',
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
      branchId: currentBranch.waInstance,
    };
    console.log('Creating master with data:', masterData);
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
        branchId: currentBranch.waInstance,
      };
      console.log('Updating master with data:', masterData);
      updateMasterMutation.mutate({ id: editMaster.id, data: masterData });
    }
  };

  return (
    <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Мастера</h1>
        <div className="flex gap-3">
          <Dialog open={isAddAdministratorDialogOpen} onOpenChange={setIsAddAdministratorDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="border-indigo-200 text-indigo-600 hover:bg-indigo-50"
              >
                <User className="h-4 w-4 mr-2" />
                Добавить администратора
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-white rounded-xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold text-gray-900">Добавить администратора</DialogTitle>
                <DialogDescription className="text-gray-500">
                  Заполните данные нового администратора.
                </DialogDescription>
              </DialogHeader>
              <AdministratorForm
                onSubmit={handleAddAdministrator}
                isPending={createAdministratorMutation.isPending}
              />
            </DialogContent>
          </Dialog>
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Добавить мастера
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : isError ? (
        <div className="bg-red-50 p-6 rounded-lg text-red-800 my-8 border border-red-200">
          Ошибка при загрузке мастеров. Пожалуйста, попробуйте обновить страницу.
        </div>
      ) : !masters || masters.length === 0 ? (
        <div className="bg-gray-50 p-8 rounded-lg text-center my-8 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Пока нет добавленных мастеров</h3>
          <p className="text-gray-500 mb-4">
            Добавьте первого мастера, чтобы начать работу с календарем.
          </p>
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Добавить мастера
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
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Администраторы</h2>
        {administrators && administrators.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {administrators.map((administrator: Administrator) => (
              <AdministratorCard
                key={administrator.id}
                administrator={administrator}
                onDeleteClick={() => handleDeleteAdministrator(administrator.id)}
              />
            ))}
          </div>
        ) : (
          <div className="bg-indigo-50 p-8 rounded-lg text-center my-8 border border-indigo-200">
            <h3 className="text-lg font-semibold text-indigo-900 mb-2">Пока нет добавленных администраторов</h3>
            <p className="text-indigo-700 mb-4">
              Добавьте первого администратора для управления филиалом.
            </p>
            <Button
              onClick={() => setIsAddAdministratorDialogOpen(true)}
              variant="outline"
              className="border-indigo-200 text-indigo-600 hover:bg-indigo-50"
            >
              <User className="h-4 w-4 mr-2" />
              Добавить администратора
            </Button>
          </div>
        )}
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto bg-white rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900">Добавить нового мастера</DialogTitle>
            <DialogDescription className="text-gray-500">
              Заполните данные нового мастера. Поля, отмеченные звездочкой (*), обязательны.
            </DialogDescription>
          </DialogHeader>
          <MasterForm
            onSubmit={handleAddMaster}
            isPending={createMasterMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900">Редактировать мастера</DialogTitle>
            <DialogDescription className="text-gray-500">
              Измените данные мастера. Поля, отмеченные звездочкой (*), обязательны для заполнения.
            </DialogDescription>
          </DialogHeader>
          {editMaster && (
            <MasterForm
              master={editMaster}
              onSubmit={handleUpdateMaster}
              isPending={updateMasterMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-white rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900">Рабочие дни мастера</DialogTitle>
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
    </div>
  );
};

export default Masters;