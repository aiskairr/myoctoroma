import React from 'react';
import { CreditCard } from "lucide-react";
import { MobileDialogTitle } from "@/components/ui/mobile-dialog";
import { DialogTitle, DialogHeader } from "@/components/ui/dialog";

interface PaymentDialogHeaderProps {
  isMobile: boolean;
  t: (key: string) => string;
}

/**
 * Заголовок диалога оплаты
 */
export const PaymentDialogHeader: React.FC<PaymentDialogHeaderProps> = ({
  isMobile,
  t
}) => {
  if (isMobile) {
    // Мобильная версия - компактный заголовок
    return (
      <MobileDialogTitle className="flex items-center gap-2">
        <CreditCard className="h-5 w-5 text-amber-600" />
        {t('calendar.payment_services_title')}
      </MobileDialogTitle>
    );
  }

  // Десктопная версия
  return (
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2">
        <CreditCard className="h-5 w-5 text-amber-600" />
        {t('calendar.payment_services_title')}
      </DialogTitle>
    </DialogHeader>
  );
};
