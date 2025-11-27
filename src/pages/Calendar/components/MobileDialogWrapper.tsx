import React from 'react';
import {
  MobileDialogHeader,
  MobileDialogScrollContent,
  MobileDialogFooter
} from '@/components/ui/mobile-dialog';

interface MobileDialogWrapperProps {
  header: React.ReactNode;
  content: React.ReactNode;
  footer: React.ReactNode;
  isMobile: boolean;
}

/**
 * Вспомогательный компонент-обёртка для мобильных шторок.
 * Автоматически оборачивает контент в правильную структуру:
 * - Header (фиксированный сверху)
 * - ScrollContent (прокручиваемый контент)
 * - Footer (фиксированный снизу)
 * 
 * Для десктопа просто возвращает все части без обёрток.
 */
export const MobileDialogWrapper: React.FC<MobileDialogWrapperProps> = ({
  header,
  content,
  footer,
  isMobile
}) => {
  if (isMobile) {
    return (
      <>
        {/* Фиксированный заголовок */}
        <MobileDialogHeader>
          {header}
        </MobileDialogHeader>

        {/* Прокручиваемый контент */}
        <MobileDialogScrollContent>
          {content}
        </MobileDialogScrollContent>

        {/* Фиксированный футер */}
        <MobileDialogFooter>
          {footer}
        </MobileDialogFooter>
      </>
    );
  }

  // Десктопная версия - просто рендерим всё подряд без обёрток
  return (
    <>
      {header}
      {content}
      {footer}
    </>
  );
};
