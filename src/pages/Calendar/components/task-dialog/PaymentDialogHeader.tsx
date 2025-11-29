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
 * Темно-синяя шапка с градиентом
 */
export const PaymentDialogHeader: React.FC<PaymentDialogHeaderProps> = ({
  isMobile,
  t
}) => {
  if (isMobile) {
    // Мобильная версия - темно-синяя шапка
    return (
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 text-white -mx-6 -mt-6 px-6 py-4 rounded-t-[24px]">
        <MobileDialogTitle className="flex items-center gap-3 text-white">
          <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm border border-white/30">
            <CreditCard className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold">{t('calendar.payment_services_title')}</span>
        </MobileDialogTitle>
      </div>
    );
  }

  // Десктопная версия - темно-синяя шапка с градиентом
  return (
    <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 text-white -mx-6 -mt-6 px-6 py-5 rounded-t-[24px]">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3 text-white text-xl">
          <div className="bg-white/20 p-2.5 rounded-full backdrop-blur-sm border border-white/30">
            <CreditCard className="h-6 w-6 text-white" />
          </div>
          <span className="font-bold">{t('calendar.payment_services_title')}</span>
        </DialogTitle>
      </DialogHeader>
    </div>
  );
};
