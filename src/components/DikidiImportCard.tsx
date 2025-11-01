import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useBranch } from '@/contexts/BranchContext';
import { useLocale } from '@/contexts/LocaleContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  Upload, 
  FileText, 
  TrendingUp, 
  Trash2, 
  AlertCircle,
  Loader2,
  Download,
  Users,
  Calendar
} from 'lucide-react';
import { DikidiImportService } from '@/services/dikidi-import.service';
import type { ImportedBooking } from '@/types/dikidi-import.types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export function DikidiImportCard() {
  const { t } = useLocale();
  const { toast } = useToast();
  const { currentBranch } = useBranch();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showStatsDialog, setShowStatsDialog] = useState(false);
  const [showListDialog, setShowListDialog] = useState(false);

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
        // Invalidate stats query to refresh data
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

  // Fetch bookings list
  const listQuery = useQuery({
    queryKey: ['dikidi-list', currentBranch?.id],
    queryFn: async () => {
      if (!currentBranch?.id) return null;
      return DikidiImportService.getBookingsList(String(currentBranch.id), { page: 1, limit: 50 });
    },
    enabled: !!currentBranch?.id && showListDialog,
  });

  // Clear data mutation
  const clearMutation = useMutation({
    mutationFn: async () => {
      if (!currentBranch?.id) {
        throw new Error('Branch ID is required');
      }
      return DikidiImportService.clearData(String(currentBranch.id), { confirm: true });
    },
    onSuccess: (response) => {
      if (response.success && response.data) {
        toast({
          title: t('dikidi.clear_success') || 'Данные удалены',
          description: `${t('dikidi.records_deleted') || 'Удалено записей'}: ${response.data.recordsDeleted}`,
        });
        setShowClearDialog(false);
        statsQuery.refetch();
      } else {
        toast({
          title: t('dikidi.clear_error') || 'Ошибка удаления',
          description: response.error || 'Unknown error',
          variant: 'destructive',
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: t('dikidi.clear_error') || 'Ошибка удаления',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  };

  const handleClearData = () => {
    clearMutation.mutate();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const stats = statsQuery.data?.success ? statsQuery.data.data : null;
  const bookings = listQuery.data?.success ? listQuery.data.data : [];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t('dikidi.title') || 'Импорт из DIKIDI'}
          </CardTitle>
          <CardDescription>
            {t('dikidi.description') || 'Импорт данных о записях, мастерах и услугах из системы DIKIDI'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Upload Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <p className="text-sm text-blue-800 dark:text-blue-200">
                {t('dikidi.upload_info') || 'Загрузите Excel файл с данными DIKIDI для импорта записей в систему'}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dikidi-file">
                {t('dikidi.select_file') || 'Выберите Excel файл'}
              </Label>
              <Input
                id="dikidi-file"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                disabled={uploadMutation.isPending}
              />
              <p className="text-xs text-muted-foreground">
                {t('dikidi.file_formats') || 'Поддерживаемые форматы: .xlsx, .xls'}
              </p>
            </div>

            {selectedFile && (
              <div className="p-3 bg-muted rounded-lg space-y-1">
                <p className="text-sm font-medium">
                  {t('dikidi.selected_file') || 'Выбранный файл'}:
                </p>
                <p className="text-sm text-muted-foreground">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {t('dikidi.file_size') || 'Размер'}: {formatFileSize(selectedFile.size)}
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

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowStatsDialog(true)}
                  className="flex-1"
                >
                  <TrendingUp className="mr-2 h-4 w-4" />
                  {t('dikidi.view_stats') || 'Подробная статистика'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowListDialog(true)}
                  className="flex-1"
                >
                  <Download className="mr-2 h-4 w-4" />
                  {t('dikidi.view_list') || 'Просмотр записей'}
                </Button>
              </div>
            </div>
          )}

          {/* Clear Data Section */}
          {stats && stats.totalBookings > 0 && (
            <div className="pt-4 border-t">
              <Button
                variant="destructive"
                onClick={() => setShowClearDialog(true)}
                className="w-full"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t('dikidi.clear_data') || 'Очистить все импортированные данные'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics Dialog */}
      <Dialog open={showStatsDialog} onOpenChange={setShowStatsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {t('dikidi.stats_title') || 'Статистика импорта DIKIDI'}
            </DialogTitle>
            <DialogDescription>
              {t('dikidi.stats_description') || 'Детальная информация об импортированных данных'}
            </DialogDescription>
          </DialogHeader>
          {stats && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">
                    {t('dikidi.total_bookings') || 'Всего записей'}
                  </p>
                  <p className="text-2xl font-bold">{stats.totalBookings}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">
                    {t('dikidi.total_masters') || 'Мастеров'}
                  </p>
                  <p className="text-2xl font-bold">{stats.totalMasters}</p>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">
                  {t('dikidi.bookings_by_master') || 'Записи по мастерам'}
                </h4>
                <div className="space-y-2">
                  {stats.bookingsByMaster && Object.entries(stats.bookingsByMaster).length > 0 ? (
                    Object.entries(stats.bookingsByMaster).map(([master, count]) => (
                      <div key={master} className="flex justify-between items-center p-2 bg-muted rounded">
                        <span className="text-sm">{master}</span>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {t('dikidi.no_data') || 'Нет данных'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bookings List Dialog */}
      <Dialog open={showListDialog} onOpenChange={setShowListDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>
              {t('dikidi.list_title') || 'Импортированные записи'}
            </DialogTitle>
            <DialogDescription>
              {t('dikidi.list_description') || 'Список всех импортированных записей из DIKIDI'}
            </DialogDescription>
          </DialogHeader>
          {listQuery.isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : bookings && bookings.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('dikidi.date') || 'Дата'}</TableHead>
                  <TableHead>{t('dikidi.time') || 'Время'}</TableHead>
                  <TableHead>{t('dikidi.master') || 'Мастер'}</TableHead>
                  <TableHead>{t('dikidi.service') || 'Услуга'}</TableHead>
                  <TableHead>{t('dikidi.client') || 'Клиент'}</TableHead>
                  <TableHead>{t('dikidi.phone') || 'Телефон'}</TableHead>
                  <TableHead>{t('dikidi.status') || 'Статус'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((booking: ImportedBooking) => (
                  <TableRow key={booking.id}>
                    <TableCell>{booking.date}</TableCell>
                    <TableCell>{booking.time}</TableCell>
                    <TableCell>{booking.master}</TableCell>
                    <TableCell>{booking.service}</TableCell>
                    <TableCell>{booking.client_name}</TableCell>
                    <TableCell>{booking.client_phone}</TableCell>
                    <TableCell>
                      <Badge variant={booking.status === 'CONFIRMED' ? 'default' : 'secondary'}>
                        {booking.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              {t('dikidi.no_bookings') || 'Нет импортированных записей'}
            </p>
          )}
        </DialogContent>
      </Dialog>

      {/* Clear Confirmation Dialog */}
      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              {t('dikidi.clear_confirm_title') || 'Подтвердите удаление'}
            </DialogTitle>
            <DialogDescription>
              {t('dikidi.clear_confirm_message') || 
                'Вы уверены, что хотите удалить все импортированные данные DIKIDI? Это действие нельзя отменить.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowClearDialog(false)}
              disabled={clearMutation.isPending}
            >
              {t('dikidi.cancel') || 'Отмена'}
            </Button>
            <Button
              variant="destructive"
              onClick={handleClearData}
              disabled={clearMutation.isPending}
            >
              {clearMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('dikidi.deleting') || 'Удаление...'}
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t('dikidi.confirm_delete') || 'Да, удалить'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
