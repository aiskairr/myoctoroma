import React from 'react';
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, CreditCard } from "lucide-react";
import { MobileDialogTitle } from "@/components/ui/mobile-dialog";
import { DialogTitle, DialogHeader } from "@/components/ui/dialog";

interface TaskDialogHeaderProps {
  taskId: number | null;
  taskData?: {
    paid?: string;
  };
  isMobile: boolean;
  onPaymentClick: () => void;
  t: (key: string) => string;
}

/**
 * Заголовок диалога создания/редактирования задачи
 * Показывает статус оплаты и кнопку оплаты (для существующих задач)
 */
export const TaskDialogHeader: React.FC<TaskDialogHeaderProps> = ({
  taskId,
  taskData,
  isMobile,
  onPaymentClick,
  t
}) => {
  if (isMobile) {
    // Мобильная версия - компактный заголовок для шторки
    return (
      <>
        <MobileDialogTitle className="flex items-center justify-center gap-2">
          {taskData?.paid === 'paid' ? (
            <>
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-green-700">
                {taskId ? t('calendar.paid') : t('calendar.create_task')}
              </span>
            </>
          ) : (
            <>
              <XCircle className="w-5 h-5 text-red-600" />
              <span className="text-red-700">
                {taskId ? t('calendar.not_paid') : t('calendar.create_task')}
              </span>
            </>
          )}
        </MobileDialogTitle>

        {/* Кнопка оплаты в хедере для мобильной версии */}
        {taskId && taskData && (
          <div className="pt-2">
            <Button
              type="button"
              onClick={onPaymentClick}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white h-10 text-sm font-semibold"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              {t('task_dialog.pay_button')}
            </Button>
          </div>
        )}
      </>
    );
  }

  // Десктопная версия - полноразмерный заголовок
  return (
    <>
      {/* Динамическая плашка статуса оплаты */}
      <div className="flex justify-center pt-4 pb-2">
        {taskData?.paid === 'paid' ? (
          <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-full">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm font-semibold text-green-700">
              {t('calendar.paid').toUpperCase()}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-full">
            <XCircle className="w-5 h-5 text-red-600" />
            <span className="text-sm font-semibold text-red-700">
              {t('calendar.not_paid')}
            </span>
          </div>
        )}
      </div>

      <DialogHeader className="pb-2">
        <DialogTitle className="sr-only">
          {t('task_dialog.edit_title')}
        </DialogTitle>
      </DialogHeader>

      {/* Кнопка оплаты для десктопа */}
      {taskId && taskData && (
        <div className="px-2 pb-4">
          <Button
            type="button"
            onClick={onPaymentClick}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white h-12 text-base font-semibold"
          >
            <CreditCard className="h-5 w-5 mr-2" />
            {t('task_dialog.pay_button')}
          </Button>
        </div>
      )}
    </>
  );
};
