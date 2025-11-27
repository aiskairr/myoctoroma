import React from 'react';
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface PaymentDialogFooterProps {
  isPending: boolean;
  isDisabled: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  t: (key: string) => string;
}

/**
 * Футер диалога оплаты с кнопками Отмена и Подтвердить оплату
 */
export const PaymentDialogFooter: React.FC<PaymentDialogFooterProps> = ({
  isPending,
  isDisabled,
  onCancel,
  onConfirm,
  t
}) => {
  return (
    <div className="flex justify-between gap-2">
      <Button
        variant="outline"
        onClick={onCancel}
      >
        {t('task_dialog.cancel_button')}
      </Button>
      <Button
        onClick={onConfirm}
        disabled={isDisabled || isPending}
        className="bg-amber-500 hover:bg-amber-600 text-white"
      >
        {isPending && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        )}
        {t('task_dialog.confirm_payment_button')}
      </Button>
    </div>
  );
};
