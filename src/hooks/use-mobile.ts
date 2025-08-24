import { useState, useEffect } from 'react';

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    // Функция для проверки размера экрана
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // 768px - стандартный breakpoint для мобильных устройств
    };

    // Инициализируем при монтировании
    checkMobile();

    // Добавляем слушатель изменения размера окна
    window.addEventListener('resize', checkMobile);

    // Удаляем слушатель при размонтировании
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

// Хук для определения текущего размера экрана
export function useScreenSize() {
  // Определяем начальные значения для размеров экрана
  const [screenSize, setScreenSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
    isMobile: typeof window !== 'undefined' ? window.innerWidth < 768 : false,
    isTablet: typeof window !== 'undefined' ? window.innerWidth >= 768 && window.innerWidth < 1024 : false,
    isDesktop: typeof window !== 'undefined' ? window.innerWidth >= 1024 : true,
  });

  useEffect(() => {
    // Функция для обновления состояния
    const updateScreenSize = () => {
      setScreenSize({
        width: window.innerWidth,
        height: window.innerHeight,
        isMobile: window.innerWidth < 768,
        isTablet: window.innerWidth >= 768 && window.innerWidth < 1024,
        isDesktop: window.innerWidth >= 1024,
      });
    };

    // Добавляем event listener для отслеживания изменения размера окна
    window.addEventListener('resize', updateScreenSize);

    // Очищаем event listener при размонтировании компонента
    return () => window.removeEventListener('resize', updateScreenSize);
  }, []);

  return screenSize;
}