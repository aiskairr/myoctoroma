import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useBranch } from '@/contexts/BranchContext';

interface DailyCashReport {
  id: number;
  date: string;
  admin_name: string;
  total_revenue: number;
  petty_expenses: number;
  total_income: number;
  end_balance: number;
  optima_payments: number;
  mbank_payments: number;
  mbusiness_payments: number;
  demir_payments: number;
  bakai_payments: number;
  obank_payments: number;
  cash_collection: number;
  salary_payments: number;
  branch_id: string;
  notes?: string;
}

interface User {
  role: string;
}

export default function ReportPage() {
  const [user, setUser] = useState<User | null>(null);
  const [reports, setReports] = useState<DailyCashReport[]>([]);
  const [startDate, setStartDate] = useState<string>(() => {
    return localStorage.getItem('reportPage_startDate') || '2025-07-01';
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return localStorage.getItem('reportPage_endDate') || '2025-07-31';
  });
  const [selectedBranch, setSelectedBranch] = useState<string>(() => {
    return localStorage.getItem('reportPage_selectedBranch') || '';
  });
  const { branches } = useBranch(); // Используем branches из контекста
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Загрузка данных пользователя
  const fetchUserData = async () => {
    try {
      const response = await fetch('${import.meta.env.VITE_BACKEND_URL}/api/user');
      if (response.ok) {
        const data = await response.json();
        if (data) {
          setUser({ role: data.role });
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки данных пользователя:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить данные пользователя",
        variant: "destructive",
      });
    }
  };

    // Загрузка данных пользователя (removed fetchBranches function since we use context)

  // Загрузка данных отчетов
  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const branchParam = selectedBranch ? `&branchId=${selectedBranch}` : '';
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/daily-cash-reports?startDate=${startDate}&endDate=${endDate}${branchParam}`);
      if (response.ok) {
        const data = await response.json();
        setReports(data);
      } else {
        throw new Error('Failed to fetch reports');
      }
    } catch (error) {
      console.error('Ошибка загрузки отчетов:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить данные отчетов",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
    fetchReports();
  }, [startDate, endDate, selectedBranch]);

  // Сохранение фильтров в localStorage
  useEffect(() => {
    localStorage.setItem('reportPage_startDate', startDate);
  }, [startDate]);

  useEffect(() => {
    localStorage.setItem('reportPage_endDate', endDate);
  }, [endDate]);

  useEffect(() => {
    localStorage.setItem('reportPage_selectedBranch', selectedBranch);
  }, [selectedBranch]);

  // Функция для установки дат текущего месяца
  const setCurrentMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const startDateStr = firstDay.toISOString().split('T')[0];
    
    const lastDay = new Date(year, month + 1, 0);
    const endDateStr = lastDay.toISOString().split('T')[0];
    
    setStartDate(startDateStr);
    setEndDate(endDateStr);
  };

  // Подсчет итогов
  const calculateTotals = () => {
    let totalRevenue = 0;
    let totalExpenses = 0; 
    let totalIncome = 0;
    let totalCash = 0;
    let totalOptima = 0;
    let totalMBank = 0;
    let totalMBusiness = 0;
    let totalDemir = 0;
    let totalBakai = 0;
    let totalOBank = 0;
    let totalCollection = 0;
    let totalSalaryPayments = 0;

    reports.forEach(report => {
      totalRevenue += Number(report.total_revenue) || 0;
      totalExpenses += Number(report.petty_expenses) || 0;
      totalIncome += Number(report.total_income) || 0;
      totalCash += Number(report.end_balance) || 0;
      totalOptima += Number(report.optima_payments) || 0;
      totalMBank += Number(report.mbank_payments) || 0;
      totalMBusiness += Number(report.mbusiness_payments) || 0;
      totalDemir += Number(report.demir_payments) || 0;
      totalBakai += Number(report.bakai_payments) || 0;
      totalOBank += Number(report.obank_payments) || 0;
      totalCollection += Number(report.cash_collection) || 0;
      totalSalaryPayments += Number(report.salary_payments) || 0;
    });

    return {
      totalRevenue,
      totalExpenses,
      totalIncome,
      totalCash,
      totalOptima,
      totalMBank,
      totalMBusiness,
      totalDemir,
      totalBakai,
      totalOBank,
      totalCollection,
      totalSalaryPayments
    };
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Загрузка...</div>
        </div>
      </div>
    );
  }

  if (user?.role !== 'superadmin') {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-red-600 font-semibold">
            Только для учредителей!
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
            Ежедневные отчеты по доходам и расходам
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center gap-4 flex-wrap">
            <label className="text-sm font-medium">Филиал:</label>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Все филиалы</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id.toString()}>
                  {branch.branches}
                </option>
              ))}
            </select>
            <label className="text-sm font-medium">Период с:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <label className="text-sm font-medium">по:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <Button 
              onClick={setCurrentMonth}
              variant="outline"
              size="sm"
              className="ml-2"
            >
              Текущий месяц
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reports Table */}
      <Card className="rounded-xl shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg">
            Отчеты за период с {startDate} по {endDate}
            <span className="text-sm font-normal text-gray-600 ml-2">
              {selectedBranch ? 
                `• ${branches.find(b => b.id.toString() === selectedBranch)?.branches || selectedBranch}` : 
                '• Все филиалы'
              }
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[600px] relative">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-700 border-b">Дата</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700 border-b">Администратор</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-700 border-b">Доходы</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-700 border-b">Расходы</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-700 border-b">Итого</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-700 border-b">Остаток</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-700 border-b">Оптима</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-700 border-b">М-Банк</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-700 border-b">М-Бизнес</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-700 border-b">Демир</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-700 border-b">Бакай</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-700 border-b">O!Банк</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-700 border-b">Инкассация</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-700 border-b">ЗП выплачено</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700 border-b">Заметки</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report, index) => (
                  <tr key={report.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3 border-b">
                      {new Date(report.date).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-4 py-3 border-b">{report.admin_name}</td>
                    <td className="px-4 py-3 text-right border-b text-green-600 font-medium">
                      {(report.total_revenue || 0).toLocaleString()} сом
                    </td>
                    <td className="px-4 py-3 text-right border-b text-red-600 font-medium">
                      {(report.petty_expenses || 0).toLocaleString()} сом
                    </td>
                    <td className="px-4 py-3 text-right border-b font-bold">
                      {(report.total_income || 0).toLocaleString()} сом
                    </td>
                    <td className="px-4 py-3 text-right border-b">
                      {(report.end_balance || 0).toLocaleString()} сом
                    </td>
                    <td className="px-4 py-3 text-right border-b">
                      {(report.optima_payments || 0).toLocaleString()} сом
                    </td>
                    <td className="px-4 py-3 text-right border-b">
                      {(report.mbank_payments || 0).toLocaleString()} сом
                    </td>
                    <td className="px-4 py-3 text-right border-b">
                      {(report.mbusiness_payments || 0).toLocaleString()} сом
                    </td>
                    <td className="px-4 py-3 text-right border-b">
                      {(report.demir_payments || 0).toLocaleString()} сом
                    </td>
                    <td className="px-4 py-3 text-right border-b">
                      {(report.bakai_payments || 0).toLocaleString()} сом
                    </td>
                    <td className="px-4 py-3 text-right border-b">
                      {(report.obank_payments || 0).toLocaleString()} сом
                    </td>
                    <td className="px-4 py-3 text-right border-b">
                      {(report.cash_collection || 0).toLocaleString()} сом
                    </td>
                    <td className="px-4 py-3 text-right border-b text-purple-600 font-medium">
                      {(report.salary_payments || 0).toLocaleString()} сом
                    </td>
                    <td className="px-4 py-3 border-b text-xs text-gray-600">
                      {report.notes || '-'}
                    </td>
                  </tr>
                ))}
                
                {/* Totals Row */}
                <tr className="bg-blue-50 font-bold">
                  <td className="px-4 py-3 border-b font-bold">ИТОГО</td>
                  <td className="px-4 py-3 border-b"></td>
                  <td className="px-4 py-3 text-right border-b text-green-600">
                    {totals.totalRevenue.toLocaleString()} сом
                  </td>
                  <td className="px-4 py-3 text-right border-b text-red-600">
                    {totals.totalExpenses.toLocaleString()} сом
                  </td>
                  <td className="px-4 py-3 text-right border-b">
                    {totals.totalIncome.toLocaleString()} сом
                  </td>
                  <td className="px-4 py-3 text-right border-b">
                    {totals.totalCash.toLocaleString()} сом
                  </td>
                  <td className="px-4 py-3 text-right border-b">
                    {totals.totalOptima.toLocaleString()} сом
                  </td>
                  <td className="px-4 py-3 text-right border-b">
                    {totals.totalMBank.toLocaleString()} сом
                  </td>
                  <td className="px-4 py-3 text-right border-b">
                    {totals.totalMBusiness.toLocaleString()} сом
                  </td>
                  <td className="px-4 py-3 text-right border-b">
                    {totals.totalDemir.toLocaleString()} сом
                  </td>
                  <td className="px-4 py-3 text-right border-b">
                    {totals.totalBakai.toLocaleString()} сом
                  </td>
                  <td className="px-4 py-3 text-right border-b">
                    {totals.totalOBank.toLocaleString()} сом
                  </td>
                  <td className="px-4 py-3 text-right border-b">
                    {totals.totalCollection.toLocaleString()} сом
                  </td>
                  <td className="px-4 py-3 text-right border-b text-purple-600">
                    {totals.totalSalaryPayments.toLocaleString()} сом
                  </td>
                  <td className="px-4 py-3 border-b"></td>
                </tr>
              </tbody>
            </table>
            
            {reports.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg">Нет данных за выбранный период</p>
                <p className="text-sm">Попробуйте изменить период или проверьте наличие отчетов</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}