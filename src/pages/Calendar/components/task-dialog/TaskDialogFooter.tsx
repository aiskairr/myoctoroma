import React from 'react';
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

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
    <div className="flex gap-2">
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
        className="flex-1"
      >
        {t('task_dialog.cancel_button')}
      </Button>
      
      <Button
        type="button"
        disabled={!taskId ? (!isValid || isPending) : false}
        className={`flex-1 ${(!taskId ? (!isValid || isPending) : false) ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={onSubmit}
      >
        {!taskId && isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {t('task_dialog.creating')}
          </>
        ) : (
          taskId ? t('calendar.save') : t('calendar.create_task')
        )}
      </Button>
    </div>
  );
};
