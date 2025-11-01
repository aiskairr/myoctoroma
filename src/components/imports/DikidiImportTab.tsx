import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useBranch } from '@/contexts/BranchContext';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  FileText, 
  TrendingUp, 
  AlertCircle,
  Loader2,
  Users,
  Calendar
} from 'lucide-react';
import { DikidiImportService } from '@/services/dikidi-import.service';

export function DikidiImportTab() {
  const { t } = useLocale();
  const { toast } = useToast();
  const { currentBranch } = useBranch();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Upload file mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!currentBranch?.id) {
        throw new Error('Branch ID is required');
      }
      return DikidiImportService.uploadFile(String(currentBranch.id), file);
    },
    onSuccess: (response) => {
      if (response.success && response.data) {
        toast({
          title: t('dikidi.upload_success') || 'Импорт завершён',
          description: `${t('dikidi.bookings_imported') || 'Записей импортировано'}: ${response.data.bookingsImported}`,
        });
        setSelectedFile(null);
        statsQuery.refetch();
      } else {
        toast({
          title: t('dikidi.upload_error') || 'Ошибка импорта',
          description: response.error || 'Unknown error',
          variant: 'destructive',
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: t('dikidi.upload_error') || 'Ошибка импорта',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Fetch statistics
  const statsQuery = useQuery({
    queryKey: ['dikidi-stats', currentBranch?.id],
    queryFn: async () => {
      if (!currentBranch?.id) return null;
      return DikidiImportService.getStats(String(currentBranch.id));
    },
    enabled: !!currentBranch?.id,
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

  const stats = statsQuery.data?.success ? statsQuery.data.data : null;

  return (
    <div className="space-y-6">
      {/* Info alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {t('dikidi.description') || 'Импорт данных о записях, мастерах и услугах из Excel файла DIKIDI'}
        </AlertDescription>
      </Alert>

      {/* File upload section */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="dikidi-file" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {t('dikidi.select_file') || 'Выберите Excel файл DIKIDI'}
          </Label>
          <Input
            id="dikidi-file"
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileSelect}
            disabled={uploadMutation.isPending}
          />
          <p className="text-xs text-muted-foreground">
            {t('dikidi.file_formats') || 'Поддерживаются форматы: .xlsx, .xls'}
          </p>
        </div>

        {selectedFile && (
          <div className="p-4 bg-muted rounded-lg border space-y-1">
            <p className="text-sm font-medium">{t('dikidi.selected_file') || 'Выбранный файл'}:</p>
            <p className="text-sm text-muted-foreground">{selectedFile.name}</p>
            <p className="text-xs text-muted-foreground">
              {t('dikidi.file_size') || 'Размер'}: {(selectedFile.size / 1024).toFixed(2)} KB
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
              {t('dikidi.uploading') || 'Загрузка...'}
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              {t('dikidi.upload_button') || 'Загрузить и импортировать'}
            </>
          )}
        </Button>
      </div>

      {/* Statistics Section */}
      {stats && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">{t('dikidi.stats_title') || 'Статистика импорта'}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-4 w-4 text-blue-600" />
                <p className="text-xs font-medium text-blue-600">
                  {t('dikidi.total_bookings') || 'Всего записей'}
                </p>
              </div>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {stats.totalBookings ?? 0}
              </p>
            </div>

            <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-purple-600" />
                <p className="text-xs font-medium text-purple-600">
                  {t('dikidi.total_masters') || 'Мастеров'}
                </p>
              </div>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                {stats.totalMasters ?? 0}
              </p>
            </div>

            <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-4 w-4 text-green-600" />
                <p className="text-xs font-medium text-green-600">
                  {t('dikidi.total_services') || 'Услуг'}
                </p>
              </div>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                {stats.totalServices ?? 0}
              </p>
            </div>

            <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-orange-600" />
                <p className="text-xs font-medium text-orange-600">
                  {t('dikidi.date_range') || 'Период'}
                </p>
              </div>
              <p className="text-xs font-medium text-orange-900 dark:text-orange-100">
                {stats.dateRange?.from && stats.dateRange?.to 
                  ? `${stats.dateRange.from} - ${stats.dateRange.to}`
                  : t('dikidi.no_data') || 'Нет данных'}
              </p>
            </div>
          </div>

          {/* Bookings by master */}
          {stats.bookingsByMaster && Object.entries(stats.bookingsByMaster).length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">{t('dikidi.bookings_by_master') || 'Записи по мастерам'}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {Object.entries(stats.bookingsByMaster).slice(0, 6).map(([master, count]) => (
                  <div key={master} className="flex justify-between items-center p-2 bg-muted rounded text-sm">
                    <span className="truncate">{master}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
