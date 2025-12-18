import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useBranch } from '@/contexts/BranchContext';
import { useLocale } from '@/contexts/LocaleContext';
import { reportService } from '@/services/report-service';
import type { DailyCashReport } from '@/services/report-service';

interface User {
  role: string;
}

export default function ReportPage() {
  const { t } = useLocale();
  const [user, setUser] = useState<User | null>(null);
  const [reports, setReports] = useState<DailyCashReport[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const [selectedBranch, setSelectedBranch] = useState<string>(() => {
    return localStorage.getItem('currentBranchId') || '';
  });
  const { branches, currentBranch } = useBranch();
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Загрузка данных пользователя
  const fetchUserData = async () => {
    try {
      console.log('🔍 Loading user data...');
      const data = localStorage.getItem('user_data');
      console.log('✅ User data loaded:', data);
      if (data) {
        setUser({ role: JSON.parse(data).role as string });
      }
    } catch (error) {
      console.error('Ошибка загрузки данных пользователя:', error);
      toast({
        title: t('salary.error'),
        description: t('report.failed_to_load_user_data'),
        variant: "destructive",
      });
    }
  };

  // Загрузка данных отчетов
  const fetchReports = async () => {
    setIsLoading(true);
    try {
      // Используем currentBranch.id или selectedBranch
      const branchId = currentBranch?.id || (selectedBranch ? parseInt(selectedBranch) : 0);

      if (!branchId) {
        console.warn('⚠️ Branch ID not available');
        setIsLoading(false);
        return;
      }

      console.log('📡 Fetching reports for branch:', branchId, 'date:', selectedDate);

      const data = await reportService.getReports(branchId, selectedDate);

      if (data) {
        // Конвертируем тыйыны в сомы
        const formattedReports = data.map(report =>
          reportService.formatReportForDisplay(report)
        );
        setReports(formattedReports);
        console.log('✅ Reports loaded and formatted:', formattedReports);
      } else {
        setReports([]);
      }
    } catch (error) {
      console.error('❌ Error loading reports:', error);
      toast({
        title: t('salary.error'),
        description: t('report.failed_to_load_reports'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    fetchReports();
  }, [selectedDate, selectedBranch]);

  // Функция для установки текущей даты
  const setToday = () => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    setSelectedDate(todayStr);
  };

  // Подсчет итогов
  const calculateTotals = () => {
    if (reports.length === 0) {
      return {
        total_revenue: 0,
        total_income: 0,
        expenses_total: 0,
        end_balance: 0,
        cash_collection: 0,
        salary_payments: 0,
        cash_payments: 0,
        card_payments: 0,
        transfer_payments: 0,
        gift_certificate_payments: 0,
        bank_payments_total: 0,
        bank_payments_by_name: {} as Record<string, number>,
      };
    }

    return reportService.calculateTotals(reports);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">{t('report.loading')}</div>
        </div>
      </div>
    );
  }

  if (user?.role !== 'superadmin' && user?.role !== 'admin' && user?.role !== 'owner') {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-red-600 font-semibold">
            {t('report.access_denied')}
          </div>
        </div>
      </div>
    );
  }

  const totals = calculateTotals();

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <Card className="rounded-xl shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-t-xl">
          <CardTitle className="flex items-center gap-3 text-2xl">
            <Calendar className="h-8 w-8" />
            {t('report.page_title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center gap-4 flex-wrap">
            <label className="text-sm font-medium">{t('report.branch')}:</label>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
            >
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id.toString()} className="bg-white text-gray-900">
                  {branch.name}
                </option>
              ))}
            </select>
            <label className="text-sm font-medium">{t('report.date')}:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
            />
            <Button
              onClick={setToday}
              variant="outline"
              size="sm"
              className="ml-2"
            >
              {t('report.today') || 'Сегодня'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reports Table */}
      <Card className="rounded-xl shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg">
            Отчеты за {new Date(selectedDate).toLocaleDateString('ru-RU')}
            <span className="text-sm font-normal text-gray-600 ml-2">
              {selectedBranch ?
                `• ${branches.find(b => b.id.toString() === selectedBranch)?.branches || selectedBranch}` :
                `• ${currentBranch?.branches || 'Филиал не выбран'}`
              }
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[600px] relative">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-700 border-b">ID</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700 border-b">{t('report.issued_by') || 'Составил'}</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-700 border-b">{t('report.total_revenue')}</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-700 border-b">{t('report.expenses')}</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-700 border-b">{t('report.income')}</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-700 border-b">{t('report.cash_balance')}</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-700 border-b">{t('report.bank_payments') || 'Банки'}</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-700 border-b">{t('report.collection')}</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-700 border-b">{t('report.salary_payments')}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700 border-b">{t('report.status') || 'Статус'}</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report, index) => {
                  // Вычисляем общую сумму банковских платежей
                  const totalBankPayments = reportService.calculateTotalBankPayments(report);

                  return (
                    <tr key={report.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 border-b text-sm text-gray-600">
                        #{report.id}
                      </td>
                      <td className="px-4 py-3 border-b text-sm">
                        {report.issued_by ?
                          `${report.issued_by.fist_name} ${report.issued_by.last_name}` :
                          '-'
                        }
                      </td>
                      <td className="px-4 py-3 text-right border-b text-green-600 font-medium">
                        {(report.total_revenue || 0).toLocaleString()} {t('report.som')}
                      </td>
                      <td className="px-4 py-3 text-right border-b text-red-600 font-medium">
                        {(report.expenses_total || 0).toLocaleString()} {t('report.som')}
                      </td>
                      <td className="px-4 py-3 text-right border-b font-bold">
                        {(report.total_income || 0).toLocaleString()} {t('report.som')}
                      </td>
                      <td className="px-4 py-3 text-right border-b">
                        {(report.end_balance || 0).toLocaleString()} {t('report.som')}
                      </td>
                      <td className="px-4 py-3 text-right border-b">
                        {totalBankPayments.toLocaleString()} {t('report.som')}
                      </td>
                      <td className="px-4 py-3 text-right border-b">
                        {(report.cash_collection || 0).toLocaleString()} {t('report.som')}
                      </td>
                      <td className="px-4 py-3 text-right border-b text-purple-600 font-medium">
                        {(report.salary_payments || 0).toLocaleString()} {t('report.som')}
                      </td>
                      <td className="px-4 py-3 border-b">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          report.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {report.status === 'confirmed' ? 'Подтвержден' : 'Не подтвержден'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                
                {/* Totals Row */}
                <tr className="bg-blue-50 font-bold">
                  <td colSpan={2} className="px-4 py-3 border-b font-bold">{t('report.total')}</td>
                  <td className="px-4 py-3 text-right border-b text-green-600">
                    {totals.total_revenue.toLocaleString()} {t('report.som')}
                  </td>
                  <td className="px-4 py-3 text-right border-b text-red-600">
                    {totals.expenses_total.toLocaleString()} {t('report.som')}
                  </td>
                  <td className="px-4 py-3 text-right border-b">
                    {totals.total_income.toLocaleString()} {t('report.som')}
                  </td>
                  <td className="px-4 py-3 text-right border-b">
                    {totals.end_balance.toLocaleString()} {t('report.som')}
                  </td>
                  <td className="px-4 py-3 text-right border-b">
                    {totals.bank_payments_total.toLocaleString()} {t('report.som')}
                  </td>
                  <td className="px-4 py-3 text-right border-b">
                    {totals.cash_collection.toLocaleString()} {t('report.som')}
                  </td>
                  <td className="px-4 py-3 text-right border-b text-purple-600">
                    {totals.salary_payments.toLocaleString()} {t('report.som')}
                  </td>
                  <td className="px-4 py-3 border-b"></td>
                </tr>
              </tbody>
            </table>
            
            {reports.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg">{t('report.no_data')}</p>
                <p className="text-sm">{t('report.no_data_hint')}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}