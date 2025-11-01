import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useLocale } from '@/contexts/LocaleContext';
import { useBranch } from '@/contexts/BranchContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, Upload, Loader2, FileSpreadsheet } from 'lucide-react';

export function AltegioImportTab() {
  const { t } = useLocale();
  const { toast } = useToast();
  const { currentBranch } = useBranch();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importJobId, setImportJobId] = useState<string | null>(null);

  // Форматирование размера файла
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('branchId', String(currentBranch?.id || ''));

      const response = await fetch('/api/import/excel', {
        method: 'POST',
        body: formData,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to upload file');
      }

      return await response.json();
    },
    onSuccess: (data) => {
      if (data.jobId) {
        setImportJobId(data.jobId);
        toast({
          title: t('import.altegio.upload_success') || 'Файл загружен',
          description: t('import.altegio.upload_success_desc') || 'Импорт начался',
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: t('import.altegio.upload_error') || 'Ошибка загрузки',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Status query
  const statusQuery = useQuery({
    queryKey: ['import-status', importJobId],
    queryFn: async () => {
      if (!importJobId) return null;
      const response = await fetch(`/api/import/status/${importJobId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });
      return await response.json();
    },
    enabled: !!importJobId,
    refetchInterval: (data) => {
      const status = (data as any)?.job?.status;
      if (status === 'COMPLETED' || status === 'FAILED') {
        return false;
      }
      return 3000;
    },
  });

  const handleImport = () => {
    if (selectedFile) {
      importMutation.mutate(selectedFile);
    }
  };

  const importStatus = statusQuery.data;
  const jobStatus = (importStatus as any)?.job?.status;
  const completionPercentage = (importStatus as any)?.job?.completionPercentage || 0;

  return (
    <div className="space-y-6">
      {/* Warning for administrators only */}
      <Alert className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
        <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <AlertDescription className="text-amber-900 dark:text-amber-100">
          <p className="font-semibold">
            {t('import.altegio.admin_only_title') || 'Важно: Импорт только для администраторов'}
          </p>
          <p className="text-xs mt-1 text-amber-800 dark:text-amber-200">
            {t('import.altegio.admin_only_desc') || 'Импортировать данные может только администратор со своего аккаунта'}
          </p>
        </AlertDescription>
      </Alert>

      {/* File upload section */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="altegio-file" className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            {t('import.altegio.select_file') || 'Выберите Excel файл'}
          </Label>
          <Input
            id="altegio-file"
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileSelect}
            disabled={importMutation.isPending}
          />
          <p className="text-xs text-muted-foreground">
            {t('import.altegio.file_formats') || 'Поддерживаются форматы: .xlsx, .xls'}
          </p>
        </div>

        {selectedFile && (
          <div className="p-4 bg-muted rounded-lg border space-y-1">
            <p className="text-sm font-medium">{t('import.altegio.selected_file') || 'Выбранный файл'}:</p>
            <p className="text-sm text-muted-foreground">{selectedFile.name}</p>
            <p className="text-xs text-muted-foreground">
              {t('import.altegio.file_size') || 'Размер'}: {formatFileSize(selectedFile.size)}
            </p>
          </div>
        )}

        <Button
          onClick={handleImport}
          disabled={!selectedFile || importMutation.isPending}
          className="w-full"
        >
          {importMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('import.altegio.uploading') || 'Загрузка...'}
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              {t('import.altegio.import_button') || 'Импортировать данные'}
            </>
          )}
        </Button>
      </div>

      {/* Import status */}
      {importJobId && importStatus && (
        <div className="p-4 bg-muted rounded-lg border space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-medium">{t('import.altegio.status') || 'Статус'}:</span>
            <span
              className={`px-2 py-1 rounded text-sm ${
                jobStatus === 'COMPLETED'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : jobStatus === 'FAILED'
                  ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
              }`}
            >
              {jobStatus === 'COMPLETED'
                ? t('import.altegio.completed') || 'Завершено'
                : jobStatus === 'FAILED'
                ? t('import.altegio.failed') || 'Ошибка'
                : jobStatus === 'PROCESSING'
                ? t('import.altegio.processing') || 'Обработка'
                : t('import.altegio.pending') || 'В очереди'}
            </span>
          </div>

          {/* Progress bar */}
          {jobStatus !== 'COMPLETED' && jobStatus !== 'FAILED' && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{t('import.altegio.progress') || 'Прогресс'}:</span>
                <span>{Math.round(completionPercentage)}%</span>
              </div>
              <Progress value={completionPercentage} className="w-full" />
            </div>
          )}

          {/* Results */}
          {jobStatus === 'COMPLETED' && (importStatus as any)?.job?.result && (
            <div className="space-y-2 text-sm">
              <p className="font-medium">{t('import.altegio.results') || 'Результаты'}:</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between p-2 bg-background rounded">
                  <span>{t('import.altegio.clients_created') || 'Клиентов создано'}:</span>
                  <span className="font-semibold">{(importStatus as any).job.result.clientsCreated}</span>
                </div>
                <div className="flex justify-between p-2 bg-background rounded">
                  <span>{t('import.altegio.tasks_created') || 'Задач создано'}:</span>
                  <span className="font-semibold">{(importStatus as any).job.result.tasksCreated}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
