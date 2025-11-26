import { useState, useEffect } from 'react';

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Проверяем размер экрана
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768); // 768px - стандартный breakpoint для mobile
    };

    // Проверяем при загрузке
    checkIsMobile();

    // Слушаем изменения размера окна
    window.addEventListener('resize', checkIsMobile);

    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  return isMobile;
}

// Хук для получения настроек обновления в зависимости от устройства
export function useRefetchSettings() {
  const isMobile = useIsMobile();

  return {
    isMobile,
    // Desktop: обновление каждые 30 секунд
    // Mobile: обновление каждые 2 минуты (120 секунд)
    refetchInterval: isMobile ? 1000 * 60 * 2 : 1000 * 30,
    staleTime: isMobile ? 1000 * 60 * 2 : 1000 * 30,
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: false
  };
}
