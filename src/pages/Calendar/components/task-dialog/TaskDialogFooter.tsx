import React from 'react';
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";

interface TaskDialogFooterProps {
  taskId: number | null;
  isValid: boolean;
  isPending: boolean;
  onCancel: () => void;
  onSubmit: () => void;
  t: (key: string) => string;
}

/**
 * Футер диалога с кнопками Cancel и Save/Create
 * Светло-голубой фон с темно-синей кнопкой сохранения
 */
export const TaskDialogFooter: React.FC<TaskDialogFooterProps> = ({
  taskId,
  isValid,
  isPending,
  onCancel,
  onSubmit,
  t
}) => {
  return (
    <div className="bg-slate-50 -mx-6 -mb-6 px-6 py-4 rounded-b-lg border-t border-slate-100">
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1 border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-800 h-11 font-semibold"
        >
          {t('task_dialog.cancel_button')}
        </Button>
        
        <Button
          type="button"
          disabled={!taskId ? (!isValid || isPending) : false}
          className={`flex-1 bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 hover:from-blue-700 hover:via-blue-600 hover:to-blue-700 text-white h-11 font-semibold shadow-lg hover:shadow-xl transition-all duration-200 ${(!taskId ? (!isValid || isPending) : false) ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={onSubmit}
        >
          {!taskId && isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t('task_dialog.creating')}
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              {taskId ? t('calendar.save') : t('calendar.create_task')}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
