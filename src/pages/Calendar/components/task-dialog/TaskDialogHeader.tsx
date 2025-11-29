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
        {/* Темно-серая шапка с градиентом (как в sidebar) */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white -mx-6 -mt-6 px-6 py-4 rounded-t-lg">
          <MobileDialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {taskData?.paid === 'paid' ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-white font-semibold">
                    {taskId ? t('calendar.paid') : t('calendar.create_task')}
                  </span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-red-400" />
                  <span className="text-white font-semibold">
                    {taskId ? t('calendar.not_paid') : t('calendar.create_task')}
                  </span>
                </>
              )}
            </div>
            
            {/* Кнопка оплаты в шапке для мобильной версии */}
            {taskId && taskData && (
              <Button
                type="button"
                onClick={onPaymentClick}
                className="bg-white/20 hover:bg-white/30 text-white border border-white/30 h-9 px-4 text-sm font-semibold backdrop-blur-sm"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                {t('task_dialog.pay_button')}
              </Button>
            )}
          </MobileDialogTitle>
        </div>
      </>
    );
  }

  // Десктопная версия - темно-серая шапка с градиентом (как в sidebar)
  return (
    <>
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white -mx-6 -mt-6 px-6 py-5 rounded-t-lg">
        <DialogHeader className="mb-0">
          <DialogTitle className="sr-only">
            {t('task_dialog.edit_title')}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between">
          {/* Статус оплаты */}
          <div className="flex items-center gap-3">
            {taskData?.paid === 'paid' ? (
              <>
                <div className="bg-green-500/20 p-2 rounded-full backdrop-blur-sm border border-green-400/30">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <div className="text-sm text-slate-300">Статус</div>
                  <div className="text-lg font-bold text-white">
                    {t('calendar.paid')}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="bg-red-500/20 p-2 rounded-full backdrop-blur-sm border border-red-400/30">
                  <XCircle className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <div className="text-sm text-slate-300">Статус</div>
                  <div className="text-lg font-bold text-white">
                    {t('calendar.not_paid')}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Кнопка оплаты */}
          {taskId && taskData && (
            <Button
              type="button"
              onClick={onPaymentClick}
              className="bg-white/20 hover:bg-white/30 text-white border border-white/30 h-11 px-6 text-base font-semibold backdrop-blur-sm transition-all duration-200"
            >
              <CreditCard className="h-5 w-5 mr-2" />
              {t('task_dialog.pay_button')}
            </Button>
          )}
        </div>
      </div>
    </>
  );
};
