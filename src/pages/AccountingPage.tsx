import React, { useState, useEffect } from 'react';
import { useBranch } from '@/contexts/BranchContext';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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

interface AccountingRecord {
  id?: number;
  master: string;
  client: string;
  massageType: string;
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
  const { currentBranch } = useBranch();
  const [records, setRecords] = useState<AccountingRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [masters, setMasters] = useState<Master[]>([]);
  const [administrators, setAdministrators] = useState<Administrator[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [newRecord, setNewRecord] = useState<AccountingRecord>({
    master: '',
    client: '',
    massageType: '',
    phoneNumber: '',
    amount: 0,
    discount: '0%',
    duration: '60',
    comment: '',
    paymentMethod: 'Наличные',
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
      const response = await apiGetJson(`${import.meta.env.VITE_BACKEND_URL}/api/masters`);
      console.log('Masters response:', response);
      return response;
    } catch (error) {
      console.error('Error fetching masters:', error);
      throw error;
    }
  };

  const fetchAdministrators = async () => {
    try {
      const response = await apiGetJson(`${import.meta.env.VITE_BACKEND_URL}/api/administrators`, currentBranch?.id);
      console.log('Administrators response:', response);
      return response;
    } catch (error) {
      console.error('Error fetching administrators:', error);
      throw error;
    }
  };  const fetchData = async (date?: Date) => {
    setIsLoading(true);
    const targetDate = date || selectedDate;
    const dateString = new Date(targetDate.getTime() - (targetDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

    try {
      const accountingRecords = await accountingService.getRecordsForDate(dateString, currentBranch?.id?.toString() || '');
      setRecords(accountingRecords as AccountingRecord[]);

      const expenseRecords = await expenseService.getExpensesForDate(dateString, currentBranch?.id?.toString() || '');
      setExpenses(expenseRecords as ExpenseRecord[]);
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchMasters();
    fetchAdministrators();
  }, [currentBranch, selectedDate]);

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
    if (!newRecord.master || !newRecord.client || !newRecord.massageType || !newRecord.amount || !newRecord.adminName) {
      alert('Пожалуйста, заполните все обязательные поля: Мастер, Клиент, Вид массажа, Сумма, Имя администратора');
      return;
    }

    if (!newRecordBranch) {
      alert('Пожалуйста, выберите филиал для записи');
      return;
    }

    if (!newRecordDate) {
      alert('Пожалуйста, выберите дату для записи');
      return;
    }

    const scheduleDate = new Date(newRecordDate.getTime() - (newRecordDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

    const recordToAdd = {
      ...newRecord,
      isGiftCertificateUsed: newRecord.paymentMethod === 'Подарочный Сертификат',
      date: scheduleDate,
      schedule_date: scheduleDate,
      branchId: newRecordBranch,
    };

    try {
      const savedRecord = await accountingService.saveRecord(recordToAdd);
      if (savedRecord) {
        setRecords([...records, savedRecord]);
        setNewRecord({
          master: '',
          client: '',
          massageType: '',
          phoneNumber: '',
          amount: 0,
          discount: '0%',
          duration: '60',
          comment: '',
          paymentMethod: 'Наличные',
          dailyReport: '',
          adminName: '',
          isGiftCertificateUsed: false,
          date: '',
          branchId: '',
        });
        setNewRecordBranch('');
        setNewRecordDate(new Date());
        setIsAddRecordOpen(false);
        alert('Запись успешно добавлена');
      } else {
        alert('Ошибка при добавлении записи');
      }
    } catch (error: any) {
      console.error('Ошибка при добавлении записи:', error);
      if (error.response && error.response.data && error.response.data.message) {
        alert(error.response.data.message);
      } else {
        alert('Ошибка при добавлении записи');
      }
    }
  };

  const addExpense = async () => {
    if (!newExpense.name || !newExpense.amount) {
      alert('Пожалуйста, заполните все поля для расхода');
      return;
    }

    const expenseToAdd = {
      ...newExpense,
      branchId: currentBranch?.id?.toString() || '',
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
        alert('Расход успешно добавлен');
      } else {
        alert('Ошибка при добавлении расхода');
      }
    } catch (error) {
      console.error('Ошибка при добавлении расхода:', error);
      alert('Ошибка при добавлении расхода');
    }
  };

  const saveRecord = async (index: number) => {
    const recordToSave = records[index];
    setSavingStates((prev) => ({ ...prev, [index]: true }));

    try {
      const success = await accountingService.updateRecord(recordToSave);
      if (success) {
        alert('Запись успешно сохранена');
      } else {
        alert('Ошибка при сохранении записи');
      }
    } catch (error) {
      console.error('Ошибка при сохранении записи:', error);
      alert('Ошибка при сохранении записи');
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
        alert('Запись успешно удалена');
      } else {
        alert('Ошибка при удалении записи');
      }
    } catch (error) {
      console.error('Ошибка при удалении записи:', error);
      alert('Ошибка при удалении записи');
    }
  };

  const deleteExpense = async (id: number) => {
    try {
      const success = await expenseService.deleteExpense(id);
      if (success) {
        setExpenses(expenses.filter(expense => expense.id !== id));
        alert('Расход успешно удален');
      } else {
        alert('Ошибка при удалении расхода');
      }
    } catch (error) {
      console.error('Ошибка при удалении расхода:', error);
      alert('Ошибка при удалении расхода');
    }
  };

  const paymentOptions = [
    'Наличные',
    'МБанк - Перевод', 'МБанк - POS',
    'МБизнес - Перевод', 'МБизнес - POS',
    'О!Банк - Перевод', 'О!Банк - POS',
    'Демир - Перевод', 'Демир - POS',
    'Bakai - Перевод', 'Bakai - POS',
    'Оптима - Перевод', 'Оптима - POS',
    'Подарочный Сертификат',
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
    record.massageType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.phoneNumber.includes(searchTerm)
  );

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-lg font-medium text-gray-600">Загрузка данных...</p>
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
            Бухгалтерия
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
                Выбрать дату
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle>Выберите дату</DialogTitle>
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

          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Экспорт
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-600 rounded-lg">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-600">Доходы за день</p>
                <p className="text-2xl font-bold text-blue-800">{calculateDailyTotal()} ₽</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-600 rounded-lg">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-red-600">Расходы за день</p>
                <p className="text-2xl font-bold text-red-800">{calculateTotalExpenses()} ₽</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-600 rounded-lg">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-green-600">Записей за день</p>
                <p className="text-2xl font-bold text-green-800">{records.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-600 rounded-lg">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-purple-600">Чистая прибыль</p>
                <p className="text-2xl font-bold text-purple-800">
                  {(parseFloat(calculateDailyTotal()) - calculateTotalExpenses()).toFixed(2)} ₽
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="records" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="records" className="gap-2">
            <Receipt className="h-4 w-4" />
            Записи бухгалтерии
          </TabsTrigger>
          <TabsTrigger value="expenses" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Расходы
          </TabsTrigger>
          <TabsTrigger value="report" className="gap-2">
            <FileText className="h-4 w-4" />
            Отчет
          </TabsTrigger>
        </TabsList>

        <TabsContent value="records" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <CardTitle className="text-xl">Записи бухгалтерии</CardTitle>
                <div className="flex gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Поиск по записям..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  <Dialog open={isAddRecordOpen} onOpenChange={setIsAddRecordOpen}>
                    <DialogTrigger asChild>
                      <Button className="gap-2">
                        <Plus className="h-4 w-4" />
                        Добавить запись
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Добавить новую запись</DialogTitle>
                      </DialogHeader>
                      <div className="grid grid-cols-2 gap-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="master">Мастер *</Label>
                          <Select
                            value={newRecord.master}
                            onValueChange={(value) => setNewRecord({ ...newRecord, master: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Выберите мастера" />
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
                          <Label htmlFor="client">Клиент *</Label>
                          <Input
                            id="client"
                            name="client"
                            value={newRecord.client}
                            onChange={handleNewRecordChange}
                            placeholder="Имя клиента"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="massageType">Услуга *</Label>
                          <Input
                            id="massageType"
                            name="massageType"
                            value={newRecord.massageType}
                            onChange={handleNewRecordChange}
                            placeholder="Вид услуги"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phoneNumber">Телефон</Label>
                          <Input
                            id="phoneNumber"
                            name="phoneNumber"
                            value={newRecord.phoneNumber}
                            onChange={handleNewRecordChange}
                            placeholder="+996 XXX XXX XXX"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="amount">Сумма *</Label>
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
                          <Label htmlFor="discount">Скидка</Label>
                          <Input
                            id="discount"
                            name="discount"
                            value={newRecord.discount}
                            onChange={handleNewRecordChange}
                            placeholder="0%"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="duration">Длительность (мин)</Label>
                          <Input
                            id="duration"
                            name="duration"
                            value={newRecord.duration}
                            onChange={handleNewRecordChange}
                            placeholder="60"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="paymentMethod">Способ оплаты</Label>
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
                          <Label htmlFor="dailyReport">Дневной отчет</Label>
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
                          <Label htmlFor="adminName">Администратор *</Label>
                          <Select
                            value={newRecord.adminName}
                            onValueChange={(value) => setNewRecord({ ...newRecord, adminName: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Выберите администратора" />
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
                          <Label htmlFor="branch">Филиал *</Label>
                          <Select
                            value={newRecordBranch}
                            onValueChange={setNewRecordBranch}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Выберите филиал" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="wa1">Токтогула 93</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="date">Дата *</Label>
                          <DatePicker
                            selected={newRecordDate}
                            onChange={(date: Date | null) => date && setNewRecordDate(date)}
                            dateFormat="dd.MM.yyyy"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            placeholderText="Выберите дату"
                          />
                        </div>
                        <div className="col-span-2 space-y-2">
                          <Label htmlFor="comment">Комментарий</Label>
                          <Textarea
                            id="comment"
                            name="comment"
                            value={newRecord.comment}
                            onChange={(e) => setNewRecord({ ...newRecord, comment: e.target.value })}
                            placeholder="Дополнительная информация..."
                            rows={3}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setIsAddRecordOpen(false)}>
                          Отмена
                        </Button>
                        <Button onClick={addRecord} className="gap-2">
                          <Plus className="h-4 w-4" />
                          Добавить запись
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
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Нет записей</h3>
                  <p className="text-gray-500 mb-4">
                    {searchTerm ? 'По вашему запросу ничего не найдено' : 'На выбранную дату записи отсутствуют'}
                  </p>
                  {!searchTerm && (
                    <Button onClick={() => setIsAddRecordOpen(true)} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Добавить первую запись
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
                              <span>{record.massageType}</span>
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
                              <span className="text-xl font-bold text-green-700">{record.amount} ₽</span>
                            </div>
                            {record.discount !== '0%' && (
                              <div className="flex items-center gap-2 text-sm">
                                <Badge variant="outline" className="text-orange-600 border-orange-200">
                                  Скидка: {record.discount}
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
                              <span>Администратор: {record.adminName}</span>
                            </div>
                            <div className="text-sm text-gray-600">
                              <span>Дневной отчет: {record.dailyReport || 0} ₽</span>
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
                              {savingStates[index] ? 'Сохранение...' : 'Сохранить'}
                            </Button>

                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="outline" className="gap-2">
                                  <Eye className="h-4 w-4" />
                                  Подробнее
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-[500px]">
                                <DialogHeader>
                                  <DialogTitle>Детали записи</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 max-h-[400px] overflow-y-auto">
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="space-y-2">
                                      <p><strong>ID:</strong> {record.id || 'Не указан'}</p>
                                      <p><strong>Мастер:</strong> {record.master}</p>
                                      <p><strong>Клиент:</strong> {record.client}</p>
                                      <p><strong>Услуга:</strong> {record.massageType}</p>
                                      <p><strong>Телефон:</strong> {record.phoneNumber || 'Не указан'}</p>
                                      <p><strong>Сумма:</strong> {record.amount} ₽</p>
                                    </div>
                                    <div className="space-y-2">
                                      <p><strong>Скидка:</strong> {record.discount}</p>
                                      <p><strong>Длительность:</strong> {record.duration} мин</p>
                                      <p><strong>Оплата:</strong> {record.paymentMethod}</p>
                                      <p><strong>Дневной отчет:</strong> {record.dailyReport || 0} ₽</p>
                                      <p><strong>Администратор:</strong> {record.adminName}</p>
                                      <p><strong>Дата:</strong> {record.date}</p>
                                    </div>
                                  </div>
                                  {record.comment && (
                                    <div className="pt-4 border-t">
                                      <p><strong>Комментарий:</strong></p>
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
                              Удалить
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
                            <p className="text-sm font-medium text-green-600">Итого за день</p>
                            <p className="text-xs text-green-500">Без подарочных сертификатов</p>
                          </div>
                        </div>
                        <p className="text-2xl font-bold text-green-800">{calculateDailyTotal()} ₽</p>
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
                <CardTitle className="text-xl">Расходы за день</CardTitle>
                <Dialog open={isAddExpenseOpen} onOpenChange={setIsAddExpenseOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Добавить расход
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                      <DialogTitle>Добавить расход</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="expense-name">Наименование *</Label>
                        <Input
                          id="expense-name"
                          name="name"
                          value={newExpense.name}
                          onChange={handleNewExpenseChange}
                          placeholder="Название расхода"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="expense-amount">Сумма *</Label>
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
                        Отмена
                      </Button>
                      <Button onClick={addExpense} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Добавить
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
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Нет расходов</h3>
                  <p className="text-gray-500 mb-4">На выбранную дату расходы отсутствуют</p>
                  <Button onClick={() => setIsAddExpenseOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Добавить первый расход
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
                              <p className="text-sm text-gray-500">Расход #{index + 1}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xl font-bold text-red-700">{expense.amount} ₽</span>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => expense.id && deleteExpense(expense.id)}
                              className="gap-2"
                            >
                              <Trash2 className="h-4 w-4" />
                              Удалить
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
                            <p className="text-sm font-medium text-red-600">Общие расходы за день</p>
                            <p className="text-xs text-red-500">Всего позиций: {expenses.length}</p>
                          </div>
                        </div>
                        <p className="text-2xl font-bold text-red-800">{calculateTotalExpenses()} ₽</p>
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
            branchId={currentBranch?.id?.toString() || ''}
            records={records}
            expenses={expenses}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AccountingPage;