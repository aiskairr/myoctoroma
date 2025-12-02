import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useBranch } from '@/contexts/BranchContext';
import { useLocale } from '@/contexts/LocaleContext';
import { useAuth } from '@/contexts/SimpleAuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { BookingLinkCopy } from "@/components/BookingLinkCopy";

export default function Settings() {
  const { t } = useLocale();
  const { toast } = useToast();
  const { currentBranch } = useBranch();
  const { user } = useAuth();
  const [settings, setSettings] = useState<Record<string, string>>({
    systemPrompt: "",
  });
  
  const [userProfile, setUserProfile] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  
  const [whatsappConfig, setWhatsappConfig] = useState({
    apiUrl: "",
    mediaUrl: "",
    branchId: "",
    apiToken: "",
  });

  // Excel Import states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importJobId, setImportJobId] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<any>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: [import.meta.env.VITE_BACKEND_URL + "/api/settings/" + (currentBranch?.id || "")],
    queryFn: async ({ queryKey }) => {
      try {
        const token = document.cookie.split('token=')[1]?.split(';')[0] || '';
        const response = await fetch(queryKey[0], {
          headers: {
            'Authorization': 'Bearer ' + token,
          },
        });
        
        if (response.status === 404 || response.status === 400) {
          return null;
        }
        
        if (response.status === 401) {
          throw new Error('Unauthorized');
        }
        
        if (!response.ok) {
          throw new Error('HTTP error! status: ' + response.status);
        }
        
        return response.json();
      } catch (err) {
        if (err instanceof TypeError && err.message === 'Failed to fetch') {
          console.warn('Network error when fetching settings, treating as empty:', err);
          return null;
        }
        throw err;
      }
    },
    retry: false,
    enabled: !!currentBranch?.id,
  });

  const { data: whatsappData, isLoading: isLoadingWhatsapp } = useQuery({
    queryKey: [import.meta.env.VITE_BACKEND_URL + "/api/organisation/" + (currentBranch?.id || "") + "/whatsapp/config"],
    queryFn: getQueryFn({ on401: "throw" }),
    retry: false,
    enabled: !!currentBranch?.id,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { firstName?: string; lastName?: string; email?: string; password?: string }) => {
      if (!user?.id) {
        throw new Error('User ID not found');
      }
      
      // Используем branch_id из user, если есть, иначе из currentBranch
      const branchId = (user as any).branches || currentBranch?.id;
      
      if (!branchId) {
        throw new Error('Branch ID is required');
      }
      
      const token = document.cookie.split('token=')[1]?.split(';')[0] || '';
      
      // Подготавливаем данные запроса со всеми полями пользователя
      const requestData: any = {
        first_name: data.firstName || (user as any).first_name || (user as any).firstName || 'User',
        last_name: data.lastName || (user as any).last_name || (user as any).lastName || 'User',
        email: data.email || (user as any).email,
        branches: branchId,
        isActive: (user as any).isActive !== undefined ? (user as any).isActive : true,
      };
      
      // Добавляем password только если он был изменен
      if (data.password) {
        requestData.password = data.password;
      }
      
      // Добавляем paidDate если есть
      if ((user as any).paidDate) {
        requestData.paidDate = (user as any).paidDate;
      }
      
      const url = import.meta.env.VITE_SECONDARY_BACKEND_URL + "/user/changeUserData/" + user.id;
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token,
        },
        body: JSON.stringify(requestData),
      });
      
      if (!response.ok) {
        if (response.status === 409) {
          throw new Error(t('settings.email_already_exists'));
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'HTTP error! status: ' + response.status);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t('settings.profile_updated'),
        description: t('settings.profile_updated_description'),
      });
      setUserProfile({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        confirmPassword: "",
      });
    },
    onError: (error) => {
      toast({
        title: t('settings.profile_update_error'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleProfileInputChange = (key: keyof typeof userProfile, value: string) => {
    setUserProfile((prev) => ({ ...prev, [key]: value }));
  };

  const handleUpdateProfile = async () => {
    if (!userProfile.firstName && !userProfile.lastName && !userProfile.email && !userProfile.password) {
      toast({
        title: t('error'),
        description: t('settings.at_least_one_field'),
        variant: "destructive",
      });
      return;
    }

    if (userProfile.password && userProfile.password !== userProfile.confirmPassword) {
      toast({
        title: t('error'),
        description: t('settings.passwords_not_match'),
        variant: "destructive",
      });
      return;
    }

    const updateData: { firstName?: string; lastName?: string; email?: string; password?: string } = {};
    if (userProfile.firstName) updateData.firstName = userProfile.firstName;
    if (userProfile.lastName) updateData.lastName = userProfile.lastName;
    if (userProfile.email) updateData.email = userProfile.email;
    if (userProfile.password) updateData.password = userProfile.password;

    try {
      await updateProfileMutation.mutateAsync(updateData);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  // Excel Import mutations and handlers
  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('branchId', String(currentBranch?.id || ''));
      
      const token = document.cookie.split('token=')[1]?.split(';')[0] || '';
      
      const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/api/import/excel', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
        },
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to import file');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: t('settings.import_started'),
        description: t('settings.import_started_description'),
      });
      
      if (data.jobId) {
        setImportJobId(data.jobId);
        pollImportStatus(data.jobId);
      }
    },
    onError: (error) => {
      toast({
        title: t('settings.import_error'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const pollImportStatus = async (jobId: string) => {
    const maxAttempts = 60;
    let attempts = 0;
    
    const poll = async () => {
      if (attempts >= maxAttempts) {
        return;
      }
      
      try {
        const token = document.cookie.split('token=')[1]?.split(';')[0] || '';
        const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/api/import/status/' + jobId, {
          headers: {
            'Authorization': 'Bearer ' + token,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setImportStatus(data);
          
          if (data.job?.status !== 'COMPLETED' && data.job?.status !== 'FAILED') {
            attempts++;
            setTimeout(poll, 2000);
          }
        }
      } catch (error) {
        console.error('Error polling import status:', error);
      }
    };
    
    poll();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      toast({
        title: t('error'),
        description: 'Пожалуйста, выберите файл',
        variant: "destructive",
      });
      return;
    }
    
    try {
      await importMutation.mutateAsync(selectedFile);
    } catch (error) {
      console.error('Error importing file:', error);
    }
  };

  const handleManualProcess = async (jobId: string) => {
    try {
      const token = document.cookie.split('token=')[1]?.split(';')[0] || '';
      const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/api/import/process/' + jobId, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
        },
      });
      
      if (response.ok) {
        toast({
          title: 'Обработка запущена',
          description: 'Файл начал обрабатываться',
        });
        pollImportStatus(jobId);
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось запустить обработку',
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  useEffect(() => {
    if (data && typeof data === 'object') {
      const apiData = data;
      if (apiData.key && apiData.value) {
        setSettings((prev) => ({ 
          ...prev, 
          [apiData.key]: apiData.value 
        }));
      }
    } else if (data === null) {
      setSettings((prev) => ({ 
        ...prev, 
        systemPrompt: '' 
      }));
    }
  }, [data]);

  useEffect(() => {
    if (whatsappData && typeof whatsappData === 'object') {
      const configData = (whatsappData as any).config;
      if (configData) {
        setWhatsappConfig({
          apiUrl: configData.apiUrl || "",
          mediaUrl: configData.mediaUrl || "",
          branchId: configData.branchId || "",
          apiToken: configData.apiToken || "",
        });
      }
    }
  }, [whatsappData]);
  
  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentBranch?.id) {
    return (
      <div className="p-6">
        <div className="text-muted-foreground">
          <h2 className="text-lg font-semibold mb-2">Филиал не выбран</h2>
          <p className="text-sm">Пожалуйста, выберите филиал для работы с настройками</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    const errorMessage = error instanceof Error ? error.message : '';
    return (
      <div className="p-6">
        <div className="text-destructive">
          <h2 className="text-lg font-semibold mb-2">Ошибка загрузки настроек</h2>
          <p className="text-sm">{errorMessage || 'Произошла ошибка при загрузке настроек'}</p>
        </div>
      </div>
    );
  }

  if (user?.role === 'master') {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700">Доступ ограничен</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">
              Эта страница недоступна для мастеров. Используйте раздел "Настройки" в главном меню.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-medium mb-1">Настройки</h1>
        <p className="text-muted-foreground">Управление профилем и настройки системы</p>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle>{t('settings.profile_title')}</CardTitle>
          <CardDescription>
            {t('settings.profile_description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleUpdateProfile(); }}>
            {((user as any)?.first_name || (user as any)?.firstName || user?.email) && (
              <div className="bg-muted/50 p-3 rounded-lg space-y-1">
                {((user as any)?.first_name || (user as any)?.firstName) && (
                  <p className="text-sm text-muted-foreground">
                    Текущее имя: <span className="font-medium text-foreground">{(user as any)?.first_name || (user as any)?.firstName}</span>
                  </p>
                )}
                {((user as any)?.last_name || (user as any)?.lastName) && (
                  <p className="text-sm text-muted-foreground">
                    Текущая фамилия: <span className="font-medium text-foreground">{(user as any)?.last_name || (user as any)?.lastName}</span>
                  </p>
                )}
                {user?.email && (
                  <p className="text-sm text-muted-foreground">
                    {t('settings.current_email')} <span className="font-medium text-foreground">{user.email}</span>
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="first-name">Имя</Label>
              <Input
                id="first-name"
                type="text"
                value={userProfile.firstName}
                onChange={(e) => handleProfileInputChange("firstName", e.target.value)}
                placeholder="Введите новое имя"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="last-name">Фамилия</Label>
              <Input
                id="last-name"
                type="text"
                value={userProfile.lastName}
                onChange={(e) => handleProfileInputChange("lastName", e.target.value)}
                placeholder="Введите новую фамилию"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-email">{t('settings.new_email_label')}</Label>
              <Input
                id="new-email"
                type="email"
                value={userProfile.email}
                onChange={(e) => handleProfileInputChange("email", e.target.value)}
                placeholder={t('settings.new_email_placeholder')}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="new-password">{t('settings.new_password_label')}</Label>
              <Input
                id="new-password"
                type="password"
                value={userProfile.password}
                onChange={(e) => handleProfileInputChange("password", e.target.value)}
                placeholder={t('settings.new_password_placeholder')}
              />
            </div>

            {userProfile.password && (
              <div className="space-y-2">
                <Label htmlFor="confirm-password">{t('settings.confirm_password_label')}</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={userProfile.confirmPassword}
                  onChange={(e) => handleProfileInputChange("confirmPassword", e.target.value)}
                  placeholder={t('settings.confirm_password_placeholder')}
                />
              </div>
            )}
            
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('settings.updating_button')}
                  </>
                ) : (
                  t('settings.update_profile_button')
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      
      <div className="mb-6">
        <BookingLinkCopy />
      </div>
      
      <Card className="mb-6 bg-gray-100 dark:bg-gray-900 border-gray-300 dark:border-gray-700 opacity-60 relative">
        <div className="absolute top-4 right-4 bg-gray-500 text-white text-xs px-2 py-1 rounded-md font-semibold z-10">
          Демо
        </div>
        <CardHeader className="pb-3">
          <CardTitle className="text-gray-600 dark:text-gray-400">{t('settings.system_prompt_title')}</CardTitle>
          {data === null && (
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
              {t('settings.system_prompt_not_found')}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="system-prompt" className="text-gray-600 dark:text-gray-400">{t('settings.system_prompt_label')}</Label>
              <Textarea
                id="system-prompt"
                rows={8}
                disabled
                value={settings.systemPrompt}
                className="bg-gray-200 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                placeholder={
                  data === null
                    ? t('settings.system_prompt_placeholder_not_found')
                    : t('settings.system_prompt_placeholder')
                }
              />
              <p className="text-xs text-gray-500 dark:text-gray-500">{t('settings.system_prompt_description')}</p>
            </div>
            
            <div className="flex justify-end">
              <Button
                type="button"
                variant="secondary"
                disabled
                className="mr-2 bg-gray-400 dark:bg-gray-600 text-white cursor-not-allowed opacity-50"
              >
                {t('settings.reset_to_default')}
              </Button>
              <Button
                type="button"
                disabled
                className="bg-gray-400 dark:bg-gray-600 text-white cursor-not-allowed opacity-50"
              >
                {t('settings.save_prompt')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="mb-6 bg-gray-100 dark:bg-gray-900 border-gray-300 dark:border-gray-700 opacity-60 relative">
        <div className="absolute top-4 right-4 bg-gray-500 text-white text-xs px-2 py-1 rounded-md font-semibold z-10">
          Демо
        </div>
        <CardHeader>
          <CardTitle className="text-gray-600 dark:text-gray-400">{t('settings.whatsapp_api')}</CardTitle>
          <CardDescription className="text-gray-500 dark:text-gray-500">
            Конфигурация подключения к WhatsApp API
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingWhatsapp ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-500 dark:text-gray-400">Загрузка конфигурации...</span>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="whatsapp-api-url" className="text-gray-600 dark:text-gray-400">API URL</Label>
                  <Input
                    id="whatsapp-api-url"
                    type="url"
                    disabled
                    placeholder="https://xxxx.api.greenapi.com"
                    value={whatsappConfig.apiUrl}
                    className="bg-gray-200 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="whatsapp-media-url" className="text-gray-600 dark:text-gray-400">Media URL</Label>
                  <Input
                    id="whatsapp-media-url"
                    type="url"
                    disabled
                    placeholder="https://xxxx.media.greenapi.com"
                    value={whatsappConfig.mediaUrl}
                    className="bg-gray-200 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="whatsapp-branch-id" className="text-gray-600 dark:text-gray-400">Branch ID</Label>
                  <Input
                    id="whatsapp-branch-id"
                    type="text"
                    disabled
                    placeholder="7105292833"
                    value={whatsappConfig.branchId}
                    className="bg-gray-200 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="whatsapp-api-token" className="text-gray-600 dark:text-gray-400">API Token</Label>
                  <Input
                    id="whatsapp-api-token"
                    type="password"
                    disabled
                    placeholder="Введите API токен"
                    value={whatsappConfig.apiToken}
                    className="bg-gray-200 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  disabled
                  className="flex-1 bg-gray-400 dark:bg-gray-600 text-white cursor-not-allowed opacity-50"
                >
                  Сохранить конфигурацию
                </Button>
                
                <Button
                  variant="outline"
                  disabled
                  className="border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed opacity-50"
                >
                  Тест соединения
                </Button>
              </div>

              <div className="bg-gray-200 dark:bg-gray-800 p-4 rounded-md">
                <h3 className="text-sm font-medium mb-2 text-gray-600 dark:text-gray-400">Информация о настройке</h3>
                <ul className="text-xs text-gray-500 dark:text-gray-500 space-y-1">
                  <li>• API URL и Media URL получаются от провайдера WhatsApp API</li>
                  <li>• Branch ID - идентификатор вашего инстанса</li>
                  <li>• API Token - секретный ключ для авторизации</li>
                  <li>• Все данные шифруются перед сохранением в базе данных</li>
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Excel Import Section */}
      <Card>
        <CardHeader>
          <CardTitle>Импорт данных</CardTitle>
          <CardDescription>
            Импорт клиентов и задач из Excel файла
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Important notice about administrator-only import */}
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <div className="flex gap-2">
                <span className="text-amber-600 dark:text-amber-400 text-xl">⚠️</span>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                    Важно: Импорт только для администраторов
                  </p>
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    Импортировать данные может только администратор со своего аккаунта. 
                    Хозяин (owner) не должен импортировать данные, так как это может привести 
                    к сохранению записей и мастеров в неправильном филиале.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="excel-file">Выберите Excel файл</Label>
              <Input
                id="excel-file"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                disabled={importMutation.isPending}
              />
              <p className="text-xs text-muted-foreground">
                Поддерживаются форматы: .xlsx, .xls
              </p>
            </div>
            
            {selectedFile && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Выбранный файл:</p>
                <p className="text-sm text-muted-foreground">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">Размер: {formatFileSize(selectedFile.size)}</p>
              </div>
            )}
            
            <Button
              onClick={handleImport}
              disabled={!selectedFile || importMutation.isPending}
              className="w-full"
            >
              {importMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {t('settings.loading_text')}
                </>
              ) : (
                t('settings.import_data_button')
              )}
            </Button>

            {/* Ручной запуск обработки для отладки */}
            {importJobId && (!importStatus || !((importStatus as any)?.job?.status) || ((importStatus as any)?.job?.status === 'PENDING')) && (
              <Button
                onClick={() => handleManualProcess(importJobId)}
                variant="outline"
                className="w-full mt-2"
              >
                {t('settings.manual_process')}
              </Button>
            )}

            {/* Статус импорта */}
            {importJobId && importStatus && typeof importStatus === 'object' && importStatus !== null && (
              <div className="mt-4 p-4 bg-muted rounded-lg border">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{t('settings.import_status')}:</span>
                    <span className={`px-2 py-1 rounded text-sm ${
                      (importStatus as any).job?.status === 'COMPLETED' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                      (importStatus as any).job?.status === 'FAILED' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                      'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    }`}>
                      {(importStatus as any).job?.status === 'COMPLETED' ? t('settings.completed') :
                       (importStatus as any).job?.status === 'FAILED' ? t('settings.failed') :
                       (importStatus as any).job?.status === 'PROCESSING' ? t('settings.processing') : t('settings.pending')}
                    </span>
                  </div>

                  {/* Прогресс бар */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{t('settings.progress')}:</span>
                      <span>{Math.round((importStatus as any).job?.completionPercentage || 0)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${(importStatus as any).job?.completionPercentage || 0}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Детали импорта */}
                  {(importStatus as any).job && (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">{t('settings.processed_rows')}:</span>
                        <div className="font-medium">
                          {(importStatus as any).job.processedRows || 0} / {(importStatus as any).job.totalRows || 0}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('settings.file')}</span>
                        <div className="font-medium truncate">
                          {(importStatus as any).job.fileName || t('settings.unknown')}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('settings.clients')}</span>
                        <div className="font-medium">
                          {(importStatus as any).job.clientsImported || 0}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('settings.tasks')}</span>
                        <div className="font-medium">
                          {(importStatus as any).job.tasksImported || 0}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Ошибка если есть */}
                  {(importStatus as any).job?.status === 'FAILED' && (importStatus as any).job?.errorMessage && (
                    <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                      <div className="text-sm text-red-800 dark:text-red-200">
                        <strong>Ошибка:</strong> {(importStatus as any).job.errorMessage}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="bg-muted p-4 rounded-md">
              <h3 className="text-sm font-medium mb-2">Процесс импорта</h3>
              <p className="text-xs text-muted-foreground">
                Импорт происходит в три этапа:
              </p>
              <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                <li>• Этап 1: Загрузка файла и сохранение в облачное хранилище</li>
                <li>• Этап 2: Запуск фоновой обработки через очередь задач</li>
                <li>• Этап 3: Импорт клиентов и задач с отслеживанием прогресса</li>
              </ul>
              <p className="text-xs text-muted-foreground mt-2">
                <strong>Преимущества:</strong> Фоновая обработка позволяет импортировать большие файлы без блокировки интерфейса
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
