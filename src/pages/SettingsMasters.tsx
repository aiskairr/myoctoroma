import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/SimpleAuthContext";
import { useLocale } from "@/contexts/LocaleContext";
import { createApiUrl } from "@/utils/api-url";

interface UserProfileUpdate {
  email: string;
  password: string;
  confirmPassword: string;
}

const SettingsMasters: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useLocale();
  
  const [userProfile, setUserProfile] = useState<UserProfileUpdate>({
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleProfileInputChange = (field: keyof UserProfileUpdate, value: string) => {
    setUserProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { email?: string; password?: string }) => {
      const response = await fetch(createApiUrl('/api/users/profile'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update profile');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t('settings.success_title'),
        description: t('settings.profile_updated_successfully'),
      });
      
      // Очистка полей после успешного обновления
      setUserProfile({
        email: '',
        password: '',
        confirmPassword: ''
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('settings.error_title'),
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleUpdateProfile = () => {
    // Валидация
    if (userProfile.password && userProfile.password !== userProfile.confirmPassword) {
      toast({
        title: t('settings.error_title'),
        description: t('settings.password_mismatch'),
        variant: "destructive",
      });
      return;
    }

    if (!userProfile.email && !userProfile.password) {
      toast({
        title: t('settings.error_title'),
        description: t('settings.no_changes'),
        variant: "destructive",
      });
      return;
    }

    const updateData: { email?: string; password?: string } = {};
    
    if (userProfile.email) {
      updateData.email = userProfile.email;
    }
    
    if (userProfile.password) {
      updateData.password = userProfile.password;
    }

    updateProfileMutation.mutate(updateData);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-medium mb-1">{t('settings.title')}</h1>
        <p className="text-muted-foreground">{t('settings.master_description')}</p>
      </div>

      {/* User Profile Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>{t('settings.profile_title')}</CardTitle>
          <CardDescription>
            {t('settings.profile_description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleUpdateProfile(); }}>
            {/* Current Email Display */}
            {user?.email && (
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  {t('settings.current_email')} <span className="font-medium text-foreground">{user.email}</span>
                </p>
              </div>
            )}

            {/* New Email */}
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
            
            {/* New Password */}
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

            {/* Confirm Password */}
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
    </div>
  );
};

export default SettingsMasters;
