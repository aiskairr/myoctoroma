import React, { useState, useEffect } from 'react';
import { useBranch } from '@/contexts/BranchContext';
import { useLocale } from '@/contexts/LocaleContext';
import { getBranchIdWithFallback } from '@/utils/branch-utils';
import { accountingService } from '@/services/accounting-service';
import { expenseService, type ExpenseRecord } from '@/services/expense-service';
import { apiGetJson } from '@/lib/api';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import {
  Calendar,
  Check,
  Trash2,
  Plus,
  Eye,
  Save,
  Receipt,
  DollarSign,
  TrendingUp,
  Building2,
  Users,
  Clock,
  Phone,
  CreditCard,
  User,
  CalendarDays,
  Filter,
  Search,
  Download,
  FileText,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import DailyCashReport from '@/components/DailyCashReport';
import { compareDayMetrics } from '@/services/trend-comparison';
import MetricCardWithTrend from '@/components/MetricCardWithTrend';
import type { DashboardMetricsWithTrends } from '@/services/trend-comparison';

interface AccountingRecord {
  id?: number;
  master: string;
  client: string;
  serviceType: string;
  phoneNumber: string;
  amount: number;
  discount: string;
  duration: string;
  comment: string;
  paymentMethod: string;
  dailyReport: string;
  adminName: string;
  isGiftCertificateUsed: boolean;
  date: string;
  branchId: string;
}

interface Master {
  id: number;
  name: string;
  specialty?: string;
  description?: string;
  isActive: boolean;
}

interface Administrator {
  id: number;
  name: string;
  role: string;
  branchId: string;
  isActive: boolean;
  phoneNumber?: string;
  email?: string;
  notes?: string;
}

const AccountingPage = () => {
  const { t } = useLocale();
  const { currentBranch, branches } = useBranch();
  const [records, setRecords] = useState<AccountingRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [masters, setMasters] = useState<Master[]>([]);
  const [administrators, setAdministrators] = useState<Administrator[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [branchesData, setBranchesData] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [dailyStats, setDailyStats] = useState({
    dailyIncome: 0,
    dailyExpenses: 0,
    recordsCount: 0,
    netProfit: 0
  });
  const [dailyCashData, setDailyCashData] = useState({
    dailyIncome: 0,
    dailyExpenses: 0,
    netProfit: 0
  });
  const [previousDailyStats, setPreviousDailyStats] = useState({
    dailyIncome: 0,
    dailyExpenses: 0,
    recordsCount: 0,
    netProfit: 0
  });
  const [previousDailyCashData, setPreviousDailyCashData] = useState({
    dailyIncome: 0,
    dailyExpenses: 0,
    netProfit: 0
  });
  const [metricsWithTrends, setMetricsWithTrends] = useState<DashboardMetricsWithTrends | null>(null);
  const [newRecord, setNewRecord] = useState<AccountingRecord>({
    master: '',
    client: '',
    serviceType: '',
    phoneNumber: '',
    amount: 0,
    discount: '0%',
    duration: '60',
    comment: '',
    paymentMethod: t('accounting.payment_cash'),
    dailyReport: '',
    adminName: '',
    isGiftCertificateUsed: false,
    date: '',
    branchId: '',
  });
  const [newRecordBranch, setNewRecordBranch] = useState<string>('');
  const [newRecordDate, setNewRecordDate] = useState<Date>(new Date());
  const [newExpense, setNewExpense] = useState<Omit<ExpenseRecord, 'id'>>({
    name: '',
    amount: 0,
    branchId: '',
    date: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [savingStates, setSavingStates] = useState<{ [key: number]: boolean }>({});
  const [isAddRecordOpen, setIsAddRecordOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchMasters = async () => {
    try {
      const branchId = getBranchIdWithFallback(currentBranch, branches);
      const url = `/api/masters?branchID=${branchId}`;
      console.log('Fetching masters with URL:', url);
      const response = await apiGetJson(url);
      console.log('Masters response:', response);
      return response;
    } catch (error) {
      console.error('Error fetching masters:', error);
      throw error;
    }
  };

  const fetchAdministrators = async () => {
    try {
      const branchId = getBranchIdWithFallback(currentBranch, branches);
      const url = `/api/administrators?branchID=${branchId}`;
      console.log('Fetching administrators with URL:', url);
      const response = await apiGetJson(url);
      console.log('Administrators response:', response);
      return response;
    } catch (error) {
      console.error('Error fetching administrators:', error);
      throw error;
    }
  };

  const fetchServices = async () => {
    try {
      const branchId = getBranchIdWithFallback(currentBranch, branches);
      const response = await apiGetJson(`/api/crm/services/${branchId}`);
      console.log('Services response:', response);
      return response;
    } catch (error) {
      console.error('Error fetching services:', error);
      throw error;
    }
  };

  const fetchBranches = async () => {
    try {
      if (!currentBranch?.organisationId) {
        console.warn('No organisation ID available for branches fetch');
        return [];
      }
      const response = await apiGetJson(`/api/organisations/${currentBranch.organisationId}/branches`);
      console.log('Branches response:', response);
      return response;
    } catch (error) {
      console.error('Error fetching branches:', error);
      throw error;
    }
  };

  const fetchAccountingStatistics = async (date?: Date) => {
    try {
      const targetDate = date || selectedDate;
      const dateString = new Date(targetDate.getTime() - (targetDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
      
      const branchId = getBranchIdWithFallback(currentBranch, branches);
      const url = `${import.meta.env.VITE_BACKEND_URL}/api/statistics/accounting/${dateString}/${dateString}?branchId=${branchId}`;
      console.log('Fetching accounting statistics with URL:', url);
      
      const response = await fetch(url);
      if (response.ok) {
        const apiData = await response.json();
        console.log('Accounting statistics response:', apiData);
        
        // Новый формат данных: data = [доходы, расходы, записей, прибыль]
        if (apiData.success && Array.isArray(apiData.data) && apiData.data.length >= 4) {
          const [dailyIncome, dailyExpenses, recordsCount, netProfit] = apiData.data;
          
          setDailyStats({
            dailyIncome,
            dailyExpenses, 
            recordsCount,
            netProfit
          });
          
          setDailyCashData({
            dailyIncome,
            dailyExpenses,
            netProfit
          });
        } else {
          console.error('Invalid data format from accounting statistics API');
        }
      } else {
        console.error('Failed to fetch accounting statistics:', response.status);
      }
    } catch (error) {
      console.error('Error fetching accounting statistics:', error);
    }
  };

  const fetchPreviousDayAccountingStatistics = async (date?: Date) => {
    try {
      const targetDate = date || selectedDate;
      const yesterday = new Date(targetDate);
      yesterday.setDate(yesterday.getDate() - 1);
      const dateString = new Date(yesterday.getTime() - (yesterday.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
      
      const branchId = getBranchIdWithFallback(currentBranch, branches);
      const url = `${import.meta.env.VITE_BACKEND_URL}/api/statistics/accounting/${dateString}/${dateString}?branchId=${branchId}`;
      console.log('Fetching previous day accounting statistics with URL:', url);
      
      const response = await fetch(url);
      if (response.ok) {
        const apiData = await response.json();
        console.log('Previous day accounting statistics response:', apiData);
        
        // Новый формат данных: data = [доходы, расходы, записей, прибыль]
        if (apiData.success && Array.isArray(apiData.data) && apiData.data.length >= 4) {
          const [dailyIncome, dailyExpenses, recordsCount, netProfit] = apiData.data;
          
          setPreviousDailyStats({
            dailyIncome,
            dailyExpenses, 
            recordsCount,
            netProfit
          });
          
          setPreviousDailyCashData({
            dailyIncome,
            dailyExpenses,
            netProfit
          });
        } else {
          console.error('Invalid data format from previous day accounting statistics API');
        }
      } else {
        console.error('Failed to fetch previous day accounting statistics:', response.status);
      }
    } catch (error) {
      console.error('Error fetching previous day accounting statistics:', error);
    }
  };

  const fetchData = async (date?: Date) => {
    setIsLoading(true);
    const targetDate = date || selectedDate;
    const dateString = new Date(targetDate.getTime() - (targetDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

    try {
      const branchId = getBranchIdWithFallback(currentBranch, branches);
      // Загружаем данные параллельно
      await Promise.all([
        (async () => {
          const accountingRecords = await accountingService.getRecordsForDate(dateString, branchId);
          setRecords(accountingRecords as AccountingRecord[]);
        })(),
        (async () => {
          const expenseRecords = await expenseService.getExpensesForDate(dateString, branchId);
          setExpenses(expenseRecords as ExpenseRecord[]);
        })(),
        fetchAccountingStatistics(targetDate),
        fetchPreviousDayAccountingStatistics(targetDate)
      ]);
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    loadMastersAndAdministrators();
    loadServicesAndBranches();
  }, [currentBranch, branches, selectedDate]);

  useEffect(() => {
    // Calculate trends when both current and previous day data are available
    if (dailyCashData && previousDailyCashData) {
      const trends = compareDayMetrics(
        {
          dailyIncome: dailyCashData.dailyIncome,
          dailyExpenses: dailyCashData.dailyExpenses,
          recordsCount: dailyStats.recordsCount,
          netProfit: dailyCashData.netProfit
        },
        {
          dailyIncome: previousDailyCashData.dailyIncome,
          dailyExpenses: previousDailyCashData.dailyExpenses,
          recordsCount: previousDailyStats.recordsCount,
          netProfit: previousDailyCashData.netProfit
        }
      );
      setMetricsWithTrends(trends);
    }
  }, [dailyCashData, previousDailyCashData, dailyStats.recordsCount, previousDailyStats.recordsCount]);

  const loadMastersAndAdministrators = async () => {
    try {
      const [mastersData, adminsData] = await Promise.all([
        fetchMasters(),
        fetchAdministrators()
      ]);
      setMasters(mastersData);
      setAdministrators(adminsData);
    } catch (error) {
      console.error('Error loading masters and administrators:', error);
    }
  };

  const loadServicesAndBranches = async () => {
    try {
      const [servicesData, branchesData] = await Promise.all([
        fetchServices(),
        fetchBranches()
      ]);
      setServices(servicesData);
      // Если ответ содержит поле branches, используем его, иначе используем весь ответ
      setBranchesData(branchesData.branches || branchesData);
    } catch (error) {
      console.error('Error loading services and branches:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>, index: number) => {
    const { name, value } = e.target;
    const updatedRecords = [...records];
    (updatedRecords[index] as any)[name] = name === 'amount' ? Number(value) || 0 : value;
    setRecords(updatedRecords);
  };

  const handleNewRecordChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewRecord({
      ...newRecord,
      [name]: name === 'amount' ? Number(value) || 0 : value
    });
  };

  const handleNewExpenseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewExpense({
      ...newExpense,
      [name]: name === 'amount' ? Number(value) || 0 : value
    });
  };

  const handleDateChange = (date: Date | null) => {
    if (date) {
      setSelectedDate(date);
      setIsDatePickerOpen(false);
      fetchData(date);
    }
  };

  const addRecord = async () => {
    if (!newRecord.master || !newRecord.client || !newRecord.serviceType || !newRecord.amount || !newRecord.adminName) {
      alert('Пожалуйста, заполните все обязательные поля: Мастер, Клиент, Вид массажа, Сумма, Имя администратора');
      return;
    }

    if (!newRecordBranch) {
      alert(t('accounting.please_select_branch'));
      return;
    }

    if (!newRecordDate) {
      alert(t('accounting.please_select_date'));
      return;
    }

    // Конвертируем дату в формат YYYY-MM-DD для API
    const scheduleDate = new Date(newRecordDate.getTime() - (newRecordDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

    const recordToAdd = {
      ...newRecord,
      isGiftCertificateUsed: newRecord.paymentMethod === t('accounting.payment_gift_certificate'),
      date: scheduleDate,
      schedule_date: scheduleDate, // Формат: YYYY-MM-DD (для совместимости с API)
      branchId: newRecordBranch,
    };

    try {
      const savedRecord = await accountingService.saveRecord(recordToAdd);
      if (savedRecord) {
        setRecords([...records, savedRecord]);
        setNewRecord({
          master: '',
          client: '',
          serviceType: '',
          phoneNumber: '',
          amount: 0,
          discount: '0%',
          duration: '60',
          comment: '',
          paymentMethod: t('accounting.payment_cash'),
          dailyReport: '',
          adminName: '',
          isGiftCertificateUsed: false,
          date: '',
          branchId: '',
        });
        setNewRecordBranch('');
        setNewRecordDate(new Date());
        setIsAddRecordOpen(false);
        alert(t('accounting.record_added'));
      } else {
        alert(t('accounting.record_add_failed'));
      }
    } catch (error: any) {
      console.error('Error saving accounting record:', error);
      let errorMessage = t('accounting.record_add_error');
      
      if (error instanceof Error) {
        if (error.message.includes('HTML instead of JSON')) {
          errorMessage = t('accounting.server_error_html');
        } else if (error.message.includes('Server returned')) {
          errorMessage = t('accounting.server_error', { error: error.message });
        } else {
          errorMessage = t('accounting.error_message', { error: error.message });
        }
      }
      
      alert(errorMessage);
    }
  };

  const addExpense = async () => {
    if (!newExpense.name || !newExpense.amount) {
      alert(t('accounting.expense_fill_fields'));
      return;
    }

    const expenseToAdd = {
      ...newExpense,
      branchId: getBranchIdWithFallback(currentBranch, branches),
      date: new Date(selectedDate.getTime() - (selectedDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0],
    };

    try {
      const savedExpense = await expenseService.createExpense(expenseToAdd);
      if (savedExpense) {
        setExpenses([...expenses, savedExpense]);
        setNewExpense({
          name: '',
          amount: 0,
          branchId: '',
          date: '',
        });
        setIsAddExpenseOpen(false);
        alert(t('accounting.expense_added'));
      } else {
        alert(t('accounting.expense_add_error'));
      }
    } catch (error) {
      console.error('Ошибка при добавлении расхода:', error);
      alert(t('accounting.expense_add_error'));
    }
  };

  const saveRecord = async (index: number) => {
    const recordToSave = records[index];
    setSavingStates((prev) => ({ ...prev, [index]: true }));

    try {
      const success = await accountingService.updateRecord(recordToSave);
      if (success) {
        alert(t('accounting.record_saved'));
      } else {
        alert(t('accounting.record_save_error'));
      }
    } catch (error) {
      console.error('Ошибка при сохранении записи:', error);
      alert(t('accounting.record_save_error'));
    } finally {
      setSavingStates((prev) => ({ ...prev, [index]: false }));
    }
  };

  const deleteRecord = async (index: number) => {
    const recordToDelete = records[index];
    if (!recordToDelete.id) return;

    try {
      const success = await accountingService.deleteRecord(recordToDelete.id);
      if (success) {
        const updatedRecords = records.filter((_, i) => i !== index);
        setRecords(updatedRecords);
        alert(t('accounting.record_deleted'));
      } else {
        alert(t('accounting.record_delete_error'));
      }
    } catch (error) {
      console.error('Ошибка при удалении записи:', error);
      alert(t('accounting.record_delete_error'));
    }
  };

  const deleteExpense = async (id: number) => {
    try {
      const success = await expenseService.deleteExpense(id);
      if (success) {
        setExpenses(expenses.filter(expense => expense.id !== id));
        alert(t('accounting.expense_deleted'));
      } else {
        alert(t('accounting.expense_delete_error'));
      }
    } catch (error) {
      console.error('Ошибка при удалении расхода:', error);
      alert(t('accounting.expense_delete_error'));
    }
  };

  const paymentOptions = [
    t('accounting.payment_cash'),
    'МБанк - Перевод', 'МБанк - POS',
    'МБизнес - Перевод', 'МБизнес - POS',
    'О!Банк - Перевод', 'О!Банк - POS',
    'Демир - Перевод', 'Демир - POS',
    'Bakai - Перевод', 'Bakai - POS',
    'Оптима - Перевод', 'Оптима - POS',
    t('accounting.payment_gift_certificate'),
  ];

  const calculateDailyTotal = () => {
    return records
      .filter((r) => !r.isGiftCertificateUsed)
      .reduce((sum, r) => sum + Number(r.dailyReport || 0), 0)
      .toFixed(2);
  };

  const calculateTotalExpenses = () => {
    return expenses.reduce((sum, expense) => sum + expense.amount, 0);
  };

  const filteredRecords = records.filter(record =>
    record.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.master.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.serviceType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.phoneNumber.includes(searchTerm)
  );

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-lg font-medium text-gray-600">{t('accounting.loading_data')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
            <Receipt className="h-8 w-8 text-blue-600" />
            {t('accounting.page_title')}
          </h1>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Building2 className="h-4 w-4" />
            {currentBranch?.branches}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="outline" className="px-3 py-1">
            <CalendarDays className="h-4 w-4 mr-2" />
            {selectedDate.toLocaleDateString('ru-RU', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </Badge>

          <Dialog open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Calendar className="h-4 w-4" />
                {t('accounting.select_date_button')}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px]" aria-describedby="date-picker-description">
              <DialogHeader>
                <DialogTitle>{t('accounting.select_date_title')}</DialogTitle>
                <DialogDescription id="date-picker-description">
                  {t('accounting.select_date_description')}
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-center p-4">
                <DatePicker
                  selected={selectedDate}
                  onChange={handleDateChange}
                  inline
                  dateFormat="dd.MM.yyyy"
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricsWithTrends && (
          <>
            <MetricCardWithTrend
              title={t('dashboard.daily_income')}
              value={dailyCashData?.dailyIncome || 0}
              metric={metricsWithTrends.dailyIncome}
              icon={<DollarSign className="h-6 w-6 text-blue-600" />}
              bgGradient="bg-gradient-to-br from-blue-50 to-blue-100"
              borderColor="border-blue-200"
              isPositiveGood={true}
              format="currency"
            />

            <MetricCardWithTrend
              title={t('dashboard.daily_expenses')}
              value={dailyCashData?.dailyExpenses || 0}
              metric={metricsWithTrends.dailyExpenses}
              icon={<TrendingUp className="h-6 w-6 text-red-600" />}
              bgGradient="bg-gradient-to-br from-red-50 to-red-100"
              borderColor="border-red-200"
              isPositiveGood={false}
              format="currency"
            />

            <MetricCardWithTrend
              title={t('dashboard.daily_records')}
              value={dailyStats.recordsCount}
              metric={metricsWithTrends.recordsCount}
              icon={<Users className="h-6 w-6 text-green-600" />}
              bgGradient="bg-gradient-to-br from-green-50 to-green-100"
              borderColor="border-green-200"
              isPositiveGood={true}
              format="count"
            />

            <MetricCardWithTrend
              title={t('accounting.net_profit')}
              value={dailyCashData?.netProfit || 0}
              metric={metricsWithTrends.netProfit}
              icon={<FileText className="h-6 w-6 text-purple-600" />}
              bgGradient="bg-gradient-to-br from-purple-50 to-purple-100"
              borderColor="border-purple-200"
              isPositiveGood={true}
              format="currency"
            />
          </>
        )}
      </div>

      {/* Main Content */}
      <Tabs defaultValue="records" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="records" className="gap-2">
            <Receipt className="h-4 w-4" />
            {t('accounting.records')}
          </TabsTrigger>
          <TabsTrigger value="expenses" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            {t('accounting.expenses')}
          </TabsTrigger>
          <TabsTrigger value="report" className="gap-2">
            <FileText className="h-4 w-4" />
            {t('accounting.reports')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="records" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <CardTitle className="text-xl">{t('accounting.records')}</CardTitle>
                <div className="flex gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder={t('accounting.search_records')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  <Dialog open={isAddRecordOpen} onOpenChange={setIsAddRecordOpen}>
                    <DialogTrigger asChild>
                      <Button className="gap-2">
                        <Plus className="h-4 w-4" />
                        {t('accounting.add_record')}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto" aria-describedby="add-record-description">
                      <DialogHeader>
                        <DialogTitle>{t('accounting.add_new_record')}</DialogTitle>
                        <DialogDescription id="add-record-description">
                          {t('accounting.fill_record_data')}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid grid-cols-2 gap-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="master">{t('accounting.master')} *</Label>
                          <Select
                            value={newRecord.master}
                            onValueChange={(value) => setNewRecord({ ...newRecord, master: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={t('accounting.select_master')} />
                            </SelectTrigger>
                            <SelectContent>
                              {masters.map((master) => (
                                <SelectItem key={master.id} value={master.name}>
                                  {master.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="client">{t('accounting.client')} *</Label>
                          <Input
                            id="client"
                            name="client"
                            value={newRecord.client}
                            onChange={handleNewRecordChange}
                            placeholder={t('accounting.client_name')}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="serviceType">{t('accounting.service')} *</Label>
                          <Select
                            value={newRecord.serviceType}
                            onValueChange={(value) => setNewRecord({ ...newRecord, serviceType: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={t('accounting.select_service')} />
                            </SelectTrigger>
                            <SelectContent>
                              {services.map((service) => (
                                <SelectItem key={service.id} value={service.name}>
                                  {service.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phoneNumber">{t('accounting.phone')}</Label>
                          <Input
                            id="phoneNumber"
                            name="phoneNumber"
                            value={newRecord.phoneNumber}
                            onChange={handleNewRecordChange}
                            placeholder={t('accounting.phone_placeholder')}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="amount">{t('accounting.amount')} *</Label>
                          <Input
                            id="amount"
                            name="amount"
                            type="number"
                            value={newRecord.amount}
                            onChange={handleNewRecordChange}
                            placeholder="0"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="discount">{t('accounting.discount')}</Label>
                          <Input
                            id="discount"
                            name="discount"
                            value={newRecord.discount}
                            onChange={handleNewRecordChange}
                            placeholder="0%"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="duration">{t('accounting.duration_minutes')}</Label>
                          <Input
                            id="duration"
                            name="duration"
                            value={newRecord.duration}
                            onChange={handleNewRecordChange}
                            placeholder="60"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="paymentMethod">{t('accounting.payment_method')}</Label>
                          <Select
                            value={newRecord.paymentMethod}
                            onValueChange={(value) => setNewRecord({ ...newRecord, paymentMethod: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {paymentOptions.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="dailyReport">{t('accounting.daily_report')}</Label>
                          <Input
                            id="dailyReport"
                            name="dailyReport"
                            type="number"
                            value={newRecord.dailyReport}
                            onChange={handleNewRecordChange}
                            placeholder="0"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="adminName">{t('accounting.administrator')} *</Label>
                          <Select
                            value={newRecord.adminName}
                            onValueChange={(value) => setNewRecord({ ...newRecord, adminName: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={t('accounting.select_administrator')} />
                            </SelectTrigger>
                            <SelectContent>
                              {administrators.map((admin) => (
                                <SelectItem key={admin.id} value={admin.name}>
                                  {admin.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="branch">{t('accounting.branch')} *</Label>
                          <Select
                            value={newRecordBranch}
                            onValueChange={setNewRecordBranch}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={t('accounting.select_branch')} />
                            </SelectTrigger>
                            <SelectContent>
                              {branchesData.map((branch) => (
                                <SelectItem key={branch.id} value={branch.id.toString()}>
                                  {branch.branches} - {branch.address}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="date">{t('accounting.date')} *</Label>
                          <DatePicker
                            selected={newRecordDate}
                            onChange={(date: Date | null) => date && setNewRecordDate(date)}
                            dateFormat="dd.MM.yyyy"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            placeholderText={t('dashboard.select_date')}
                          />
                        </div>
                        <div className="col-span-2 space-y-2">
                          <Label htmlFor="comment">{t('accounting.comment')}</Label>
                          <Textarea
                            id="comment"
                            name="comment"
                            value={newRecord.comment}
                            onChange={(e) => setNewRecord({ ...newRecord, comment: e.target.value })}
                            placeholder={t('accounting.additional_info')}
                            rows={3}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setIsAddRecordOpen(false)}>
                          {t('accounting.cancel')}
                        </Button>
                        <Button onClick={addRecord} className="gap-2">
                          <Plus className="h-4 w-4" />
                          {t('accounting.add_record')}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredRecords.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{t('accounting.no_records')}</h3>
                  <p className="text-gray-500 mb-4">
                    {searchTerm ? t('accounting.no_results_found') : t('accounting.no_records_for_date')}
                  </p>
                  {!searchTerm && (
                    <Button onClick={() => setIsAddRecordOpen(true)} className="gap-2">
                      <Plus className="h-4 w-4" />
                      {t('accounting.add_first_record')}
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredRecords.map((record, index) => (
                    <Card key={record.id || index} className={`transition-all hover:shadow-md ${record.isGiftCertificateUsed ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200' : 'bg-white'}`}>
                      <CardContent className="p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                          {/* Основная информация */}
                          <div className="lg:col-span-4 space-y-3">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-500" />
                              <span className="font-medium text-gray-900">{record.client}</span>
                              {record.isGiftCertificateUsed && (
                                <Badge variant="secondary" className="text-xs">
                                  Подарочный сертификат
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Users className="h-4 w-4" />
                              <span>Мастер: {record.master}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Receipt className="h-4 w-4" />
                              <span>{record.serviceType}</span>
                            </div>
                            {record.phoneNumber && (
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Phone className="h-4 w-4" />
                                <span>{record.phoneNumber}</span>
                              </div>
                            )}
                          </div>

                          {/* Финансовая информация */}
                          <div className="lg:col-span-3 space-y-3">
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-green-600" />
                              <span className="text-xl font-bold text-green-700">{record.amount} с</span>
                            </div>
                            {record.discount !== '0%' && (
                              <div className="flex items-center gap-2 text-sm">
                                <Badge variant="outline" className="text-orange-600 border-orange-200">
                                  {t('accounting.discount')}: {record.discount}
                                </Badge>
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <CreditCard className="h-4 w-4" />
                              <span>{record.paymentMethod}</span>
                            </div>
                          </div>

                          {/* Дополнительная информация */}
                          <div className="lg:col-span-3 space-y-3">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Clock className="h-4 w-4" />
                              <span>{record.duration} мин</span>
                            </div>
                            <div className="text-sm text-gray-600">
                              <span>{t('accounting.administrator')}: {record.adminName}</span>
                            </div>
                            <div className="text-sm text-gray-600">
                              <span>{t('accounting.daily_report')}: {record.dailyReport || 0} с</span>
                            </div>
                            {record.comment && (
                              <div className="text-sm text-gray-500 italic">
                                "{record.comment}"
                              </div>
                            )}
                          </div>

                          {/* Действия */}
                          <div className="lg:col-span-2 flex flex-row lg:flex-col gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => saveRecord(index)}
                              disabled={savingStates[index]}
                              className="gap-2"
                            >
                              {savingStates[index] ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                              ) : (
                                <Save className="h-4 w-4" />
                              )}
                              {savingStates[index] ? 'Сохранение...' : t('accounting.save')}
                            </Button>

                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="outline" className="gap-2">
                                  <Eye className="h-4 w-4" />
                                  {t('accounting.more_details')}
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-[500px]">
                                <DialogHeader>
                                  <DialogTitle>{t('accounting.record_details')}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 max-h-[400px] overflow-y-auto" style={{ 
                                  scrollbarWidth: 'auto',
                                  scrollbarGutter: 'stable'
                                }}>
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="space-y-2">
                                      <p><strong>ID:</strong> {record.id || t('accounting.not_specified')}</p>
                                      <p><strong>{t('accounting.master')}:</strong> {record.master}</p>
                                      <p><strong>{t('accounting.client')}:</strong> {record.client}</p>
                                      <p><strong>{t('accounting.service')}:</strong> {record.serviceType}</p>
                                      <p><strong>{t('accounting.phone')}:</strong> {record.phoneNumber || t('accounting.not_specified')}</p>
                                      <p><strong>{t('accounting.amount')}:</strong> {record.amount} с</p>
                                    </div>
                                    <div className="space-y-2">
                                      <p><strong>{t('accounting.discount')}:</strong> {record.discount}</p>
                                      <p><strong>{t('accounting.duration')}:</strong> {record.duration} мин</p>
                                      <p><strong>{t('accounting.payment')}:</strong> {record.paymentMethod}</p>
                                      <p><strong>{t('accounting.daily_report')}:</strong> {record.dailyReport || 0} с</p>
                                      <p><strong>{t('accounting.administrator')}:</strong> {record.adminName}</p>
                                      <p><strong>{t('accounting.date')}:</strong> {record.date}</p>
                                    </div>
                                  </div>
                                  {record.comment && (
                                    <div className="pt-4 border-t">
                                      <p><strong>{t('accounting.comment')}:</strong></p>
                                      <p className="text-gray-600 mt-1">{record.comment}</p>
                                    </div>
                                  )}
                                </div>
                              </DialogContent>
                            </Dialog>

                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteRecord(index)}
                              className="gap-2"
                            >
                              <Trash2 className="h-4 w-4" />
                              {t('accounting.delete')}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Итоговая сумма */}
              {filteredRecords.length > 0 && (
                <div className="mt-6">
                  <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-600 rounded-lg">
                            <DollarSign className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-green-600">{t('accounting.daily_total')}</p>
                            <p className="text-xs text-green-500">{t('accounting.without_gift_certs')}</p>
                          </div>
                        </div>
                        <p className="text-2xl font-bold text-green-800">{calculateDailyTotal()} с</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl">{t('accounting.expenses_for_day')}</CardTitle>
                <Dialog open={isAddExpenseOpen} onOpenChange={setIsAddExpenseOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      {t('accounting.add_expense')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[400px]" aria-describedby="add-expense-description">
                    <DialogHeader>
                      <DialogTitle>{t('accounting.add_expense')}</DialogTitle>
                      <DialogDescription id="add-expense-description">
                        {t('accounting.fill_expense_data')}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="expense-name">{t('accounting.expense_name')} *</Label>
                        <Input
                          id="expense-name"
                          name="name"
                          value={newExpense.name}
                          onChange={handleNewExpenseChange}
                          placeholder={t('accounting.expense_name_placeholder')}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="expense-amount">{t('accounting.amount')} *</Label>
                        <Input
                          id="expense-amount"
                          name="amount"
                          type="number"
                          value={newExpense.amount}
                          onChange={handleNewExpenseChange}
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-3">
                      <Button variant="outline" onClick={() => setIsAddExpenseOpen(false)}>
                        {t('accounting.cancel')}
                      </Button>
                      <Button onClick={addExpense} className="gap-2">
                        <Plus className="h-4 w-4" />
                        {t('accounting.add_expense')}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {expenses.length === 0 ? (
                <div className="text-center py-12">
                  <TrendingUp className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{t('accounting.no_expenses')}</h3>
                  <p className="text-gray-500 mb-4">{t('accounting.no_expenses_date')}</p>
                  <Button onClick={() => setIsAddExpenseOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    {t('accounting.add_first_expense')}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {expenses.map((expense, index) => (
                    <Card key={expense.id} className="transition-all hover:shadow-md bg-gradient-to-r from-red-50 to-rose-50 border-red-100">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-100 rounded-lg">
                              <Receipt className="h-4 w-4 text-red-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{expense.name}</p>
                              <p className="text-sm text-gray-500">{t('accounting.expense_number', { number: index + 1 })}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xl font-bold text-red-700">{expense.amount} с</span>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => expense.id && deleteExpense(expense.id)}
                              className="gap-2"
                            >
                              <Trash2 className="h-4 w-4" />
                              {t('accounting.delete')}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Итоговая сумма расходов */}
              {expenses.length > 0 && (
                <div className="mt-6">
                  <Card className="bg-gradient-to-r from-red-50 to-rose-50 border-red-200">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-red-600 rounded-lg">
                            <TrendingUp className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-red-600">{t('accounting.total_expenses_for_day')}</p>
                            <p className="text-xs text-red-500">{t('accounting.total_items')}: {expenses.length}</p>
                          </div>
                        </div>
                        <p className="text-2xl font-bold text-red-800">{(dailyCashData?.dailyExpenses || 0).toLocaleString()}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="report" className="space-y-6">
          <DailyCashReport
            selectedDate={selectedDate}
            branchId={getBranchIdWithFallback(currentBranch, branches)}
            records={records}
            expenses={expenses}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AccountingPage;