import React, { useState, useEffect } from 'react';
import { MobileMasterLogin } from './MobileMasterLogin';
import { MobileMasterCalendar } from './MobileMasterCalendar';
import { useIsMobile } from '@/hooks/use-mobile';

interface MasterAuth {
  isAuthenticated: boolean;
  masterId: number | null;
  masterName: string | null;
}

export function MobileApp() {
  const isMobile = useIsMobile();
  const [masterAuth, setMasterAuth] = useState<MasterAuth>({
    isAuthenticated: false,
    masterId: null,
    masterName: null
  });
  const [isLoading, setIsLoading] = useState(true);

  // Проверяем сохраненные данные авторизации мастера при загрузке
  useEffect(() => {
    const savedAuth = localStorage.getItem('masterAuth');
    if (savedAuth) {
      try {
        const parsedAuth = JSON.parse(savedAuth);
        setMasterAuth(parsedAuth);
      } catch (error) {
        console.error('Error parsing saved master auth:', error);
        localStorage.removeItem('masterAuth');
      }
    }
    setIsLoading(false);
  }, []);

  // Функция для входа мастера
  const handleMasterLogin = (masterId: number, masterName: string) => {
    const authData = {
      isAuthenticated: true,
      masterId,
      masterName
    };
    setMasterAuth(authData);
    localStorage.setItem('masterAuth', JSON.stringify(authData));
  };

  // Функция для выхода мастера
  const handleMasterLogout = () => {
    const authData = {
      isAuthenticated: false,
      masterId: null,
      masterName: null
    };
    setMasterAuth(authData);
    localStorage.removeItem('masterAuth');
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

  // Отображаем календарь, если мастер авторизован
  if (masterAuth.isAuthenticated && masterAuth.masterId) {
    return (
      <MobileMasterCalendar 
        masterId={masterAuth.masterId}
        masterName={masterAuth.masterName || ""}
        onLogout={handleMasterLogout}
      />
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