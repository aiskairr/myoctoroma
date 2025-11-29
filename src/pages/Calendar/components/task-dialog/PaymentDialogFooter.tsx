import React from 'react';
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle } from "lucide-react";

interface PaymentDialogFooterProps {
  isPending: boolean;
  isDisabled: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  t: (key: string) => string;
}

/**
 * Футер диалога оплаты с кнопками Отмена и Подтвердить оплату
 * Светло-голубой фон с темно-синей кнопкой подтверждения
 */
export const PaymentDialogFooter: React.FC<PaymentDialogFooterProps> = ({
  isPending,
  isDisabled,
  onCancel,
  onConfirm,
  t
}) => {
  return (
    <div className="bg-slate-50 -mx-6 -mb-6 px-6 py-4 rounded-b-lg border-t border-slate-100">
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onCancel}
          className="flex-1 border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-800 h-11 font-semibold"
        >
          {t('task_dialog.cancel_button')}
        </Button>
        <Button
          onClick={onConfirm}
          disabled={isDisabled || isPending}
          className="flex-1 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 hover:from-slate-800 hover:via-slate-700 hover:to-slate-800 text-white h-11 font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Обработка...
            </>
          ) : (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              {t('task_dialog.confirm_payment_button')}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
