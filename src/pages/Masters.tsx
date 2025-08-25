import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, User, Clock, EditIcon, X, Plus, CalendarDays, Upload, Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "../lib/queryClient";
import MasterWorkingDatesManager from "@/components/MasterWorkingDatesManager";
import MasterWorkingDatesDisplay from "@/components/MasterWorkingDatesDisplay";
import MasterWorkingDatesCalendar from "@/components/MasterWorkingDatesCalendar";
import { useBranch } from "@/contexts/BranchContext";

// Интерфейс для рабочей даты
interface WorkingDate {
  date: string; // ISO date string
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
  photoUrl?: string; // URL фотографии мастера
  workingDates?: WorkingDate[]; // Рабочие даты мастера
}

// Компонент формы мастера (используется и для создания, и для редактирования)
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

  // Состояние для создания аккаунта
  const [accountData, setAccountData] = useState({
    email: '',
    password: '',
    createAccount: false
  });

  // Запрос для получения данных пользователя (при редактировании)
  const { data: userAccountData } = useQuery({
    queryKey: ['${import.meta.env.VITE_BACKEND_URL}/api/crm/masters', master?.id, 'user-account'],
    queryFn: async () => {
      if (!master?.id) return null;
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/crm/masters/${master.id}/user-account`);
      if (!response.ok) {
        if (response.status === 404) {
          return null; // Аккаунт не найден
        }
        throw new Error('Failed to fetch user account');
      }
      return response.json();
    },
    enabled: !!master?.id,
  });

  // Состояние для хранения рабочих дат мастера
  const [workingDates, setWorkingDates] = useState<WorkingDate[]>(
    master?.workingDates || []
  );

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
      // Если включаем и есть данные пользователя - заполняем форму
      setAccountData({
        createAccount: true,
        email: userAccountData.email || '',
        password: userAccountData.password || ''
      });
    } else {
      setAccountData((prev) => ({ 
        ...prev, 
        createAccount: checked,
        // Очищаем поля при отключении или если нет данных
        email: checked ? prev.email : '',
        password: checked ? prev.password : ''
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Объединяем данные формы и рабочие даты для отправки
    const combinedData = {
      ...formData,
      workingDates: workingDates,
      // Добавляем данные аккаунта если нужно создать аккаунт
      ...(accountData.createAccount && {
        createAccount: true,
        accountEmail: accountData.email,
        accountPassword: accountData.password
      })
    };
    
    onSubmit(combinedData);
  };

  // Обработчик обновления списка рабочих дат
  const handleWorkingDatesChange = (newWorkingDates: WorkingDate[]) => {
    setWorkingDates(newWorkingDates);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-5 py-4">
        {/* Основная информация */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Основная информация</h3>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="col-span-1">
              Имя <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="col-span-3"
              required
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="specialty" className="col-span-1">
              Специализация
            </Label>
            <Input
              id="specialty"
              name="specialty"
              value={formData.specialty}
              onChange={handleChange}
              className="col-span-3"
              placeholder="Массажист, тренер и т.д."
            />
          </div>
          
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="description" className="col-span-1 pt-2">
              Описание
            </Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="col-span-3 min-h-[100px]"
              placeholder="Дополнительная информация о мастере"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="isActive" className="col-span-1">
              Активный
            </Label>
            <div className="col-span-3">
              <Switch 
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={handleSwitchChange}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="workHours" className="col-span-1">
              Базовое время работы
            </Label>
            <div className="col-span-3 flex items-center space-x-2">
              <Input
                id="startWorkHour"
                name="startWorkHour"
                type="time"
                value={formData.startWorkHour}
                onChange={handleChange}
                className="w-24"
              />
              <span>до</span>
              <Input
                id="endWorkHour"
                name="endWorkHour"
                type="time"
                value={formData.endWorkHour}
                onChange={handleChange}
                className="w-24"
              />
              <span className="text-xs text-gray-500 ml-2">
                (используется по умолчанию)
              </span>
            </div>
          </div>
        </div>

        {/* Область создания аккаунта (только при редактировании) */}
        {master && (
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">
                {userAccountData ? 'Редактировать аккаунт' : 'Создать аккаунт'}
              </h3>
              <Switch 
                checked={accountData.createAccount}
                onCheckedChange={handleCreateAccountToggle}
              />
            </div>
            
            {/* Показываем информацию о существующем аккаунте */}
            {userAccountData && !accountData.createAccount && (
              <div className="text-sm text-gray-600 p-3 bg-green-50 rounded border-l-4 border-green-400">
                <p><strong>Аккаунт существует:</strong></p>
                <p><strong>Логин:</strong> {userAccountData.username}</p>
                <p><strong>Email:</strong> {userAccountData.email}</p>
                <p><strong>Роль:</strong> {userAccountData.role}</p>
              </div>
            )}
            
            {accountData.createAccount && (
              <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="accountEmail" className="col-span-1">
                    Email
                  </Label>
                  <Input
                    id="accountEmail"
                    name="email"
                    type="email"
                    value={accountData.email}
                    onChange={handleAccountDataChange}
                    className="col-span-3"
                    placeholder="email@example.com"
                    required={accountData.createAccount}
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="accountPassword" className="col-span-1">
                    Пароль
                  </Label>
                  <Input
                    id="accountPassword"
                    name="password"
                    type="text"
                    value={accountData.password}
                    onChange={handleAccountDataChange}
                    className="col-span-3"
                    placeholder={userAccountData ? "Текущий пароль" : "Введите пароль"}
                    required={accountData.createAccount}
                  />
                </div>
                
                <div className="text-sm text-gray-600 p-3 bg-white rounded border-l-4 border-blue-400">
                  <p><strong>Логин:</strong> {userAccountData ? userAccountData.username : formData.name}</p>
                  <p><strong>Роль:</strong> master</p>
                  <p><strong>Филиал:</strong> {master?.id ? `ID: ${master.id}` : 'Будет установлен после создания'}</p>
                  {userAccountData && (
                    <p className="text-green-600 mt-2">✓ Аккаунт уже существует, редактируете данные</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Рабочие даты */}
        <div className="border-t pt-4">
          <h3 className="text-lg font-medium mb-4">Рабочие дни и часы</h3>
          <MasterWorkingDatesManager
            masterId={master?.id}
            workingDates={workingDates}
            onWorkingDatesChange={handleWorkingDatesChange}
          />
        </div>
      </div>
      
      <DialogFooter className="mt-6">
        <Button type="submit" disabled={isPending}>
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
    <Card className={!master.isActive ? 'opacity-60' : ''}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-3">
            {/* Master Photo */}
            <div className="relative">
              {master.photoUrl ? (
                <img
                  src={master.photoUrl}
                  alt={master.name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                />
              ) : (
                <div className="p-2 bg-blue-100 rounded-full">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
              )}
              
              {/* Upload overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <label className="cursor-pointer opacity-0 hover:opacity-100 transition-opacity bg-black bg-opacity-50 rounded-full w-full h-full flex items-center justify-center">
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
            
            {/* Master Info */}
            <div>
              <CardTitle className="text-lg flex items-center">
                {master.name}
                {!master.isActive && (
                  <span className="ml-2 text-xs px-1.5 py-0.5 bg-gray-200 text-gray-700 rounded-full">
                    Неактивен
                  </span>
                )}
              </CardTitle>
              {master.specialty && (
                <CardDescription className="mt-1">
                  {master.specialty}
                </CardDescription>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-2" />
            <span>
              Часы работы: {master.startWorkHour} - {master.endWorkHour}
            </span>
          </div>
          
          {/* Отображение рабочих дат мастера */}
          <MasterWorkingDatesDisplay workingDates={master.workingDates || []} />
          
          {master.description && (
            <p className="text-sm text-gray-600 mt-2">
              {master.description.length > 150
                ? `${master.description.substring(0, 150)}...`
                : master.description}
            </p>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button 
          variant="secondary" 
          size="sm" 
          onClick={onScheduleClick}
        >
          <CalendarDays className="h-4 w-4 mr-2" />
          Рабочие дни
        </Button>
        <div className="space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onEditClick}
          >
            <EditIcon className="h-4 w-4 mr-2" />
            Изменить
          </Button>
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={onDeleteClick}
          >
            <X className="h-4 w-4 mr-2" />
            Удалить
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

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
        <Label htmlFor="admin-name">Имя *</Label>
        <Input
          id="admin-name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Введите имя администратора"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="admin-role">Роль</Label>
        <Input
          id="admin-role"
          value={formData.role}
          onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
          placeholder="администратор"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="admin-phone">Телефон</Label>
        <Input
          id="admin-phone"
          value={formData.phoneNumber}
          onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
          placeholder="+7-777-123-4567"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="admin-email">Email</Label>
        <Input
          id="admin-email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          placeholder="admin@tamgaspa.com"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="admin-notes">Заметки</Label>
        <Textarea
          id="admin-notes"
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Дополнительная информация"
          rows={3}
        />
      </div>

      <DialogFooter>
        <Button type="submit" disabled={isPending || !formData.name.trim()}>
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
    <Card className="w-full max-w-sm mx-auto bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-blue-900">
            {administrator.name}
          </CardTitle>
          <div className="flex items-center space-x-1">
            <div className={`w-3 h-3 rounded-full ${administrator.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className={`text-xs font-medium ${administrator.isActive ? 'text-green-700' : 'text-red-700'}`}>
              {administrator.isActive ? 'Активен' : 'Неактивен'}
            </span>
          </div>
        </div>
        <CardDescription className="text-blue-700">
          {administrator.role}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-2 text-sm">
          <div className="flex items-center space-x-2">
            <User className="h-4 w-4 text-blue-600" />
            <span className="text-gray-700">ID: {administrator.id}</span>
          </div>
          
          {administrator.phoneNumber && (
            <div className="flex items-center space-x-2">
              <span className="text-gray-700">📞 {administrator.phoneNumber}</span>
            </div>
          )}
          
          {administrator.email && (
            <div className="flex items-center space-x-2">
              <span className="text-gray-700">✉️ {administrator.email}</span>
            </div>
          )}

          {administrator.notes && (
            <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-gray-600">
              {administrator.notes}
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="pt-3 border-t border-blue-200">
        <div className="flex space-x-2 w-full">
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={onDeleteClick}
            className="w-full"
          >
            <X className="h-4 w-4 mr-2" />
            Удалить
          </Button>
        </div>
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

  // Запрос на получение списка администраторов
  const { data: administrators, refetch: refetchAdministrators } = useQuery({
    queryKey: ['${import.meta.env.VITE_BACKEND_URL}/api/administrators', currentBranch.waInstance],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/administrators?branchId=${currentBranch.waInstance}`);
      if (!res.ok) {
        throw new Error('Failed to fetch administrators');
      }
      return res.json();
    }
  });

  // Запрос на получение списка мастеров с рабочими датами
  const { data: masters, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['${import.meta.env.VITE_BACKEND_URL}/api/crm/masters', currentBranch.waInstance],
    queryFn: async () => {
      console.log('Fetching masters data for branch:', currentBranch.waInstance);
      
      try {
        const url = `${import.meta.env.VITE_BACKEND_URL}/api/crm/masters?branchId=${currentBranch.waInstance}`;
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
        
        // Загружаем рабочие даты для каждого мастера
        const mastersWithWorkingDates = await Promise.all(
          data.map(async (master: Master) => {
            try {
              const currentDate = new Date();
              const workingDatesRes = await fetch(
                `${import.meta.env.VITE_BACKEND_URL}/api/masters/${master.id}/working-dates?month=${currentDate.getMonth() + 1}&year=${currentDate.getFullYear()}`
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
  
  // Логирование ошибки для отладки
  React.useEffect(() => {
    if (isError) {
      console.error('Masters query error:', error);
    }
  }, [isError, error]);

  // Мутация для создания нового мастера
  const createMasterMutation = useMutation({
    mutationFn: async (data: Partial<Master>) => {
      const { workingDates, ...masterData } = data;
      
      // Создаем мастера
      const res = await fetch('${import.meta.env.VITE_BACKEND_URL}/api/crm/masters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(masterData)
      });
      
      if (!res.ok) {
        throw new Error('Failed to create master');
      }
      
      const newMaster = await res.json();
      
      // Сохраняем рабочие даты, если они есть
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

  // Мутация для обновления мастера
  const updateMasterMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Partial<Master> }) => {
      const { workingDates, ...masterData } = data;
      
      // Обновляем мастера
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/crm/masters/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Важно для отправки cookies с сессией
        body: JSON.stringify(masterData)
      });
      
      if (!res.ok) {
        throw new Error('Failed to update master');
      }
      
      const updatedMaster = await res.json();
      
      // Обновляем рабочие даты, если они изменились
      if (workingDates) {
        // Получаем текущие рабочие даты
        const currentDate = new Date();
        const currentWorkingDatesRes = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/api/masters/${id}/working-dates?month=${currentDate.getMonth() + 1}&year=${currentDate.getFullYear()}`
        );
        
        if (currentWorkingDatesRes.ok) {
          const currentWorkingDates = await currentWorkingDatesRes.json();
          
          // Удаляем старые даты (деактивируем)
          await Promise.all(currentWorkingDates.map(async (cwd: any) => {
            await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/masters/${id}/working-dates/${cwd.work_date}?branchId=${cwd.branch_id}`, {
              method: 'DELETE'
            });
          }));
        }
        
        // Добавляем новые даты
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

  // Мутация для удаления мастера
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

  // Мутация для создания администратора
  const createAdministratorMutation = useMutation({
    mutationFn: async (data: Partial<Administrator>) => {
      const res = await fetch('${import.meta.env.VITE_BACKEND_URL}/api/administrators', {
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
      refetchAdministrators(); // Обновляем список администраторов
    },
    onError: (error) => {
      toast({
        title: 'Ошибка',
        description: `Не удалось добавить администратора: ${error}`,
        variant: 'destructive',
      });
    }
  });

  // Мутация для удаления администратора
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

  // Функция для обработки добавления администратора
  const handleAddAdministrator = (data: Partial<Administrator>) => {
    createAdministratorMutation.mutate(data);
  };

  // Функция для обработки удаления администратора
  const handleDeleteAdministrator = (id: number) => {
    if (window.confirm('Вы уверены, что хотите удалить этого администратора?')) {
      deleteAdministratorMutation.mutate(id);
    }
  };

  // Мутация для загрузки изображения мастера
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

  // Функция для обработки редактирования мастера
  const handleEditClick = (master: Master) => {
    setEditMaster(master);
    setIsEditDialogOpen(true);
  };

  // Функция для обработки удаления мастера
  const handleDeleteClick = (id: number) => {
    if (window.confirm('Вы уверены, что хотите удалить этого мастера?')) {
      deleteMasterMutation.mutate(id);
    }
  };

  // Функция для обработки открытия календаря рабочих дат
  const handleScheduleClick = (master: Master) => {
    setSelectedMasterForSchedule(master);
    setIsScheduleDialogOpen(true);
  };

  // Функция для обработки добавления нового мастера
  const handleAddMaster = (data: Partial<Master>) => {
    // Добавляем идентификатор филиала к данным мастера
    const masterData = {
      ...data,
      branchId: currentBranch.waInstance, // Используем branchId вместо branch_id
    };
    console.log('Creating master with data:', masterData);
    createMasterMutation.mutate(masterData);
  };

  // Функция для обработки загрузки изображения
  const handleImageUpload = (masterId: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Проверяем тип файла
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Ошибка',
        description: 'Пожалуйста, выберите файл изображения',
        variant: 'destructive',
      });
      return;
    }

    // Проверяем размер файла (максимум 5MB)
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

  // Функция для обработки обновления мастера
  const handleUpdateMaster = (data: Partial<Master>) => {
    if (editMaster) {
      // Добавляем идентификатор филиала к данным мастера
      const masterData = {
        ...data,
        branchId: currentBranch.waInstance, // Используем branchId вместо branch_id
      };
      console.log('Updating master with data:', masterData);
      updateMasterMutation.mutate({ id: editMaster.id, data: masterData });
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Мастера</h1>
        <div className="flex gap-2">
          <Dialog open={isAddAdministratorDialogOpen} onOpenChange={setIsAddAdministratorDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center">
                <User className="h-4 w-4 mr-2" />
                Добавить администратора
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle>Добавить администратора</DialogTitle>
                <DialogDescription>
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
            className="flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Добавить мастера
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center my-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : isError ? (
        <div className="bg-red-50 p-4 rounded-lg text-red-800 my-4">
          Ошибка при загрузке мастеров. Пожалуйста, попробуйте обновить страницу.
        </div>
      ) : !masters || masters.length === 0 ? (
        <div className="bg-gray-50 p-8 rounded-lg text-center my-8">
          <h3 className="text-lg font-medium mb-2">Пока нет добавленных мастеров</h3>
          <p className="text-gray-600 mb-4">
            Добавьте первого мастера, чтобы начать работу с календарем.
          </p>
          <Button onClick={() => setIsAddDialogOpen(true)}>
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

      {/* Секция администраторов */}
      <div className="mt-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Администраторы</h2>
        </div>

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
          <div className="bg-blue-50 p-8 rounded-lg text-center my-8 border border-blue-200">
            <h3 className="text-lg font-medium mb-2 text-blue-900">Пока нет добавленных администраторов</h3>
            <p className="text-blue-700 mb-4">
              Добавьте первого администратора для управления филиалом.
            </p>
            <Button onClick={() => setIsAddAdministratorDialogOpen(true)} variant="outline">
              <User className="h-4 w-4 mr-2" />
              Добавить администратора
            </Button>
          </div>
        )}
      </div>

      {/* Диалог для добавления нового мастера */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Добавить нового мастера</DialogTitle>
            <DialogDescription>
              Заполните данные нового мастера. Поля, отмеченные звездочкой (*), обязательны для заполнения.
            </DialogDescription>
          </DialogHeader>
          
          <MasterForm
            onSubmit={handleAddMaster}
            isPending={createMasterMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Диалог для редактирования мастера */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Редактировать мастера</DialogTitle>
            <DialogDescription>
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

      {/* Диалог для управления рабочими датами мастера */}
      <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Рабочие дни мастера</DialogTitle>
            <DialogDescription>
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