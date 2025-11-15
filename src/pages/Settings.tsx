import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, getQueryFn } from "@/lib/queryClient";
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
import { UnifiedImportCard } from "@/components/UnifiedImportCard";

export default function Settings() {
  const { t } = useLocale();
  const { toast } = useToast();
  const { currentBranch } = useBranch();
  const { user } = useAuth();
  const [settings, setSettings] = useState<Record<string, string>>({
    systemPrompt: "",
  });
  
  // User profile state
  const [userProfile, setUserProfile] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });

  // Fetch settings - новый API endpoint
  const { data, isLoading, error } = useQuery({
    queryKey: [`${import.meta.env.VITE_BACKEND_URL}/api/settings/${currentBranch?.id}`],
    queryFn: getQueryFn({ on401: "throw" }),
    retry: false,
    enabled: !!currentBranch?.id, // Запрос выполняется только если есть branchId
  });

  // Mutation for updating settings
  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      if (!currentBranch?.id) {
        throw new Error('Branch ID is required');
      }
      
      // Сначала пробуем PUT для обновления существующего промпта
      let response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/settings/${currentBranch.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${document.cookie.split('token=')[1]?.split(';')[0] || ''}`,
        },
        body: JSON.stringify({ key, value }),
      });
      
      // Если получили 404, значит промпт не существует, создаем новый
      if (response.status === 404) {
        response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/settings/${currentBranch.id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${document.cookie.split('token=')[1]?.split(';')[0] || ''}`,
          },
          body: JSON.stringify({ key, value }),
        });
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`${import.meta.env.VITE_BACKEND_URL}/api/settings/${currentBranch?.id}`] });
      toast({
        title: t('settings.settings_saved'),
        description: t('settings.system_prompt_updated'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('error'),
        description: error.message || t('settings.save_failed'),
        variant: "destructive",
      });
    },
  });

  // Mutation for updating user profile
  const updateProfileMutation = useMutation({
    mutationFn: async (data: { email?: string; password?: string }) => {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/user`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${document.cookie.split('token=')[1]?.split(';')[0] || ''}`,
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        if (response.status === 409) {
          throw new Error(t('settings.email_already_exists'));
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t('settings.profile_updated'),
        description: t('settings.profile_updated_description'),
      });
      // Reset profile form
      setUserProfile({
        email: "",
        password: "",
        confirmPassword: "",
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('settings.profile_update_error'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (data && typeof data === 'object') {
      // Новая структура API - возвращает объект с полями id, key, value, branchId
      const apiData = data as any;
      if (apiData.key && apiData.value) {
        setSettings((prev) => ({ 
          ...prev, 
          [apiData.key]: apiData.value 
        }));
      }
    } else if (error) {
      // Если была ошибка "SystemPrompt not found", устанавливаем пустое значение
      const errorMessage = error instanceof Error ? error.message : '';
      const isSystemPromptNotFound = errorMessage.includes('SystemPrompt not found for branch');
      
      if (isSystemPromptNotFound) {
        setSettings((prev) => ({ 
          ...prev, 
          systemPrompt: '' 
        }));
      }
    }
  }, [data, error]);

  // User profile handlers
  const handleProfileInputChange = (key: keyof typeof userProfile, value: string) => {
    setUserProfile((prev) => ({ ...prev, [key]: value }));
  };

  const handleUpdateProfile = async () => {
    // Validation
    if (!userProfile.email && !userProfile.password) {
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

    // Prepare data
    const updateData: { email?: string; password?: string } = {};
    if (userProfile.email) updateData.email = userProfile.email;
    if (userProfile.password) updateData.password = userProfile.password;

    try {
      await updateProfileMutation.mutateAsync(updateData);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };
  
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
    // Проверяем, является ли это ошибкой "SystemPrompt not found"
    const errorMessage = error instanceof Error ? error.message : '';
    const isSystemPromptNotFound = errorMessage.includes('SystemPrompt not found for branch');
    
    // Если systemPrompt не найден - это нормально, показываем страницу с пустым полем
    if (!isSystemPromptNotFound) {
      return (
        <div className="p-6">
          <div className="text-destructive">
            <h2 className="text-lg font-semibold mb-2">{t('settings.loading_error_title')}</h2>
            <p className="text-sm">{errorMessage || t('settings.loading_error_occurred')}</p>
            <p className="text-xs text-muted-foreground mt-2">
              URL: {import.meta.env.VITE_BACKEND_URL}/api/settings/{currentBranch?.id || '[branchId]'}
            </p>
          </div>
        </div>
      );
    }
    // Если systemPrompt не найден, продолжаем отображение страницы с пустым полем
  }
  
  // Проверка доступа: мастера не должны иметь доступ к классической странице settings
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
        <p className="text-muted-foreground">Импорт данных и настройка промптов</p>
      </div>

      {/* User Profile Settings */}
      <Card className="mb-6 bg-gradient-to-br from-slate-50 to-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-slate-800">{t('settings.profile_title')}</CardTitle>
          <CardDescription className="text-slate-600">
            {t('settings.profile_description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); handleUpdateProfile(); }}>
            {/* Current Email Display */}
            {user?.email && (
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-lg">
                <p className="text-sm text-emerald-700">
                  {t('settings.current_email')} <span className="font-semibold text-emerald-900">{user.email}</span>
                </p>
              </div>
            )}

            {/* New Email */}
            <div className="space-y-2">
              <Label htmlFor="new-email" className="text-slate-700 font-medium">{t('settings.new_email_label')}</Label>
              <Input
                id="new-email"
                type="email"
                value={userProfile.email}
                onChange={(e) => handleProfileInputChange("email", e.target.value)}
                placeholder={t('settings.new_email_placeholder')}
                className="border-slate-300 focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>
            
            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-slate-700 font-medium">{t('settings.new_password_label')}</Label>
              <Input
                id="new-password"
                type="password"
                value={userProfile.password}
                onChange={(e) => handleProfileInputChange("password", e.target.value)}
                placeholder={t('settings.new_password_placeholder')}
                className="border-slate-300 focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>

            {/* Confirm Password */}
            {userProfile.password && (
              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-slate-700 font-medium">{t('settings.confirm_password_label')}</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={userProfile.confirmPassword}
                  onChange={(e) => handleProfileInputChange("confirmPassword", e.target.value)}
                  placeholder={t('settings.confirm_password_placeholder')}
                  className="border-slate-300 focus:border-emerald-500 focus:ring-emerald-500"
                />
              </div>
            )}
            
            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={updateProfileMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-6"
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
      
      {/* System Prompt Settings */}
      <Card className="mb-6 bg-gray-100 border-gray-300 opacity-60 relative">
        <div className="absolute top-4 right-4 bg-gray-500 text-white text-xs px-2 py-1 rounded-md font-semibold z-10">
          Демо
        </div>
        <CardHeader className="pb-3">
          <CardTitle className="text-gray-600">{t('settings.system_prompt_title')}</CardTitle>
          {error && error instanceof Error && error.message.includes('SystemPrompt not found for branch') && (
            <p className="text-sm text-gray-500 mt-2">
              {t('settings.system_prompt_not_found')}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="system-prompt" className="text-gray-600">{t('settings.system_prompt_label')}</Label>
              <Textarea
                id="system-prompt"
                rows={8}
                disabled
                value={settings.systemPrompt}
                className="bg-gray-200 border-gray-300 text-gray-500 cursor-not-allowed"
                placeholder={
                  error && error instanceof Error && error.message.includes('SystemPrompt not found for branch')
                    ? t('settings.system_prompt_placeholder_not_found')
                    : t('settings.system_prompt_placeholder')
                }
              />
              <p className="text-xs text-gray-500">{t('settings.system_prompt_description')}</p>
            </div>
            
            <div className="flex justify-end">
              <Button
                type="button"
                variant="secondary"
                disabled
                className="mr-2 bg-gray-400 text-white cursor-not-allowed opacity-50"
              >
                {t('settings.reset_to_default')}
              </Button>
              <Button
                type="button"
                disabled
                className="bg-gray-400 text-white cursor-not-allowed opacity-50"
              >
                {updateSettingMutation.isPending ? t('settings.saving') : t('settings.save_prompt')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Unified Import System - Altegio, DIKIDI, Zapisi.kz */}
      <UnifiedImportCard />
    </div>
  );
}
