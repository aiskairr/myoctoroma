import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useBranch } from '@/contexts/BranchContext';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  FileText, 
  AlertCircle,
  Loader2,
  Users,
  Calendar,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { ZapisikzImportService } from '@/services/zapisikz-import.service';

export function ZapisikzImportTab() {
  const { t } = useLocale();
  const { toast } = useToast();
  const { currentBranch } = useBranch();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);

  // Upload file mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      return ZapisikzImportService.uploadFile(file, String(currentBranch?.id || 'wa1'));
    },
    onSuccess: (response) => {
      if (response.success && response.data) {
        const { jobId, status } = response.data;
        setCurrentJobId(jobId);
        
        // Если статус pending или processing - показываем, что загрузка началась
        if (status === 'pending' || status === 'processing') {
          toast({
            title: t('zapisikz.upload_started') || 'Загрузка началась',
            description: t('zapisikz.upload_started_desc') || 'Импорт начался, пожалуйста подождите. Это может занять некоторое время.',
          });
        } else {
          toast({
            title: t('zapisikz.upload_success') || 'Файл загружен',
            description: t('zapisikz.upload_success_desc') || 'Импорт начался',
          });
        }
        setSelectedFile(null);
      } else {
        toast({
          title: t('zapisikz.upload_error') || 'Ошибка загрузки',
          description: response.error || 'Unknown error',
          variant: 'destructive',
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: t('zapisikz.upload_error') || 'Ошибка загрузки',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Job status query
  const statusQuery = useQuery({
    queryKey: ['zapisikz-status', currentJobId],
    queryFn: async () => {
      if (!currentJobId) return null;
      return ZapisikzImportService.getJobStatus(currentJobId);
    },
    enabled: !!currentJobId,
    refetchInterval: (data) => {
      const status = (data as any)?.data?.status;
      if (status === 'completed' || status === 'failed') {
        return false;
      }
      return 3000; // Poll every 3 seconds while processing
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  };

  const jobData = statusQuery.data?.success ? statusQuery.data.data : null;
  const jobStatus = jobData?.status;
  const stats = jobData?.stats;

  return (
    <div className="space-y-6">
      {/* Info alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {t('zapisikz.description') || 'Импорт календаря записей из Excel файла Zapisi.kz с автоматическим созданием мастеров и клиентов'}
        </AlertDescription>
      </Alert>

      {/* File upload section */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="zapisikz-file" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {t('zapisikz.select_file') || 'Выберите Excel файл Zapisi.kz'}
          </Label>
          <Input
            id="zapisikz-file"
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileSelect}
            disabled={uploadMutation.isPending}
          />
          <p className="text-xs text-muted-foreground">
            {t('zapisikz.file_formats') || 'Поддерживаются форматы: .xlsx, .xls, .csv'}
          </p>
        </div>

        {selectedFile && (
          <div className="p-4 bg-muted rounded-lg border space-y-1">
            <p className="text-sm font-medium">{t('zapisikz.selected_file') || 'Выбранный файл'}:</p>
            <p className="text-sm text-muted-foreground">{selectedFile.name}</p>
            <p className="text-xs text-muted-foreground">
              {t('zapisikz.file_size') || 'Размер'}: {(selectedFile.size / 1024).toFixed(2)} KB
            </p>
          </div>
        )}

        <Button
          onClick={handleUpload}
          disabled={!selectedFile || uploadMutation.isPending}
          className="w-full"
        >
          {uploadMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('zapisikz.uploading') || 'Загрузка...'}
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              {t('zapisikz.upload_button') || 'Загрузить и импортировать'}
            </>
          )}
        </Button>
      </div>

      {/* Job status section */}
      {currentJobId && jobData && (
        <div className="p-4 bg-muted rounded-lg border space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-medium">{t('zapisikz.status') || 'Статус'}:</span>
            <span
              className={`px-2 py-1 rounded text-sm flex items-center gap-1 ${
                jobStatus === 'completed'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : jobStatus === 'failed'
                  ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
              }`}
            >
              {jobStatus === 'completed' && <CheckCircle2 className="h-3 w-3" />}
              {jobStatus === 'failed' && <XCircle className="h-3 w-3" />}
              {jobStatus === 'processing' && <Loader2 className="h-3 w-3 animate-spin" />}
              {jobStatus === 'completed'
                ? t('zapisikz.completed') || 'Завершено'
                : jobStatus === 'failed'
                ? t('zapisikz.failed') || 'Ошибка'
                : jobStatus === 'processing'
                ? t('zapisikz.processing') || 'Обработка'
                : t('zapisikz.pending') || 'В очереди'}
            </span>
          </div>

          {/* Progress indicator for processing */}
          {(jobStatus === 'processing' || jobStatus === 'pending') && (
            <div className="space-y-2">
              <Progress value={undefined} className="w-full" />
              <p className="text-xs text-muted-foreground text-center">
                {t('zapisikz.processing_message') || 'Пожалуйста, подождите...'}
              </p>
            </div>
          )}

          {/* Statistics for completed job */}
          {jobStatus === 'completed' && stats && (
            <div className="space-y-4">
              <h4 className="text-sm font-semibold">{t('zapisikz.results') || 'Результаты импорта'}</h4>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {/* Masters */}
                <div className="p-3 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="h-3 w-3 text-purple-600" />
                    <p className="text-xs font-medium text-purple-600">
                      {t('zapisikz.masters_created') || 'Мастеров создано'}
                    </p>
                  </div>
                  <p className="text-lg font-bold text-purple-900 dark:text-purple-100">
                    {stats.mastersCreated}
                  </p>
                  {stats.mastersSkipped > 0 && (
                    <p className="text-xs text-purple-700 dark:text-purple-300">
                      +{stats.mastersSkipped} {t('zapisikz.skipped') || 'пропущено'}
                    </p>
                  )}
                </div>

                {/* Clients */}
                <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="h-3 w-3 text-blue-600" />
                    <p className="text-xs font-medium text-blue-600">
                      {t('zapisikz.clients_created') || 'Клиентов создано'}
                    </p>
                  </div>
                  <p className="text-lg font-bold text-blue-900 dark:text-blue-100">
                    {stats.clientsCreated}
                  </p>
                  {stats.clientsSkipped > 0 && (
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      +{stats.clientsSkipped} {t('zapisikz.skipped') || 'пропущено'}
                    </p>
                  )}
                </div>

                {/* Bookings */}
                <div className="p-3 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="h-3 w-3 text-green-600" />
                    <p className="text-xs font-medium text-green-600">
                      {t('zapisikz.bookings_created') || 'Записей создано'}
                    </p>
                  </div>
                  <p className="text-lg font-bold text-green-900 dark:text-green-100">
                    {stats.bookingsCreated}
                  </p>
                  {stats.bookingsDuplicated > 0 && (
                    <p className="text-xs text-green-700 dark:text-green-300">
                      {stats.bookingsDuplicated} {t('zapisikz.duplicated') || 'дубликаты'}
                    </p>
                  )}
                </div>
              </div>

              {/* Errors */}
              {stats.errors && stats.errors.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-sm font-medium text-red-600 dark:text-red-400">
                    {t('zapisikz.errors') || 'Ошибки'} ({stats.errors.length})
                  </h5>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {stats.errors.slice(0, 10).map((error, index) => (
                      <p key={index} className="text-xs text-red-700 dark:text-red-300 p-2 bg-red-50 dark:bg-red-950/20 rounded">
                        {error}
                      </p>
                    ))}
                    {stats.errors.length > 10 && (
                      <p className="text-xs text-muted-foreground text-center">
                        +{stats.errors.length - 10} {t('zapisikz.more_errors') || 'ещё ошибок'}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error message for failed job */}
          {jobStatus === 'failed' && jobData.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{jobData.error}</AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </div>
  );
}
