import { useState, useEffect } from 'react';
import { MobileMasterLogin } from './MobileMasterLogin';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/SimpleAuthContext';

export function MobileApp() {
  const isMobile = useIsMobile();
  const { isAuthenticated, user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  // Если пользователь уже авторизован через основную систему и является мастером,
  // перенаправляем на календарь мастера
  useEffect(() => {
    if (isAuthenticated && user?.role === 'master') {
      window.location.href = '/master/calendar';
      return;
    }
    setIsLoading(false);
  }, [isAuthenticated, user]);

  // Функция для входа мастера - после успешного логина перенаправляем на календарь мастера
  const handleMasterLogin = () => {
    window.location.href = '/master/calendar';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    );
  }

  // Отображаем форму входа
  return (
    <MobileMasterLogin 
      onLogin={handleMasterLogin}
      isMobile={isMobile}
    />
  );
}