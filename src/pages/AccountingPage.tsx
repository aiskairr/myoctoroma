import React, { useState, useEffect } from 'react';
import { useBranch } from '@/contexts/BranchContext';
import { accountingService } from '@/services/accounting-service';
import type { expenseService, ExpenseRecord } from '@/services/expense-service';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Calendar, Check, Trash2, Plus, ChevronDown, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

  const fetchMasters = async () => {
    try {
      const response = await fetch('/api/masters');
      if (response.ok) {
        const mastersData = await response.json();
        // Показываем всех мастеров, а не только активных
        setMasters(mastersData);
      }
    } catch (error) {
      console.error('Ошибка загрузки мастеров:', error);
    }
  };

  const fetchAdministrators = async () => {
    try {
      const response = await fetch('/api/administrators');
      if (response.ok) {
        const administratorsData = await response.json();
        // Показываем всех активных администраторов независимо от филиала
        const activeAdmins = administratorsData.filter((admin: Administrator) => 
          admin.isActive
        );
        setAdministrators(activeAdmins);
      }
    } catch (error) {
      console.error('Ошибка загрузки администраторов:', error);
    }
  };

  const fetchData = async (date?: Date) => {
    setIsLoading(true);
    const targetDate = date || selectedDate;
    // Использовать UTC для корректной работы с датами
    const dateString = new Date(targetDate.getTime() - (targetDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

    try {
      // Загружаем записи бухгалтерии только из БД
      const accountingRecords = await accountingService.getRecordsForDate(dateString, currentBranch.waInstance);
      setRecords(accountingRecords as AccountingRecord[]);
      
      // Загружаем расходы только из БД
      const expenseRecords = await expenseService.getExpensesForDate(dateString, currentBranch.waInstance);
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

    // Проверяем, что выбраны филиал и дата
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
        alert('Запись успешно добавлена');
        // Очищаем форму после успешного добавления
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
      } else {
        alert('Ошибка при добавлении записи');
      }
    } catch (error: any) {
      console.error('Ошибка при добавлении записи:', error);
      
      // Проверяем, если это ошибка от сервера с нашим сообщением "Попробуйте снова"
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
      branchId: currentBranch.waInstance,
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

  // Получаем список администраторов для текущего филиала из загруженных данных
  const adminOptions = administrators.map(admin => admin.name);

  const calculateDailyTotal = () => {
    return records
      .filter((r) => !r.isGiftCertificateUsed)
      .reduce((sum, r) => sum + Number(r.dailyReport || 0), 0)
      .toFixed(2);
  };

  const calculateTotalExpenses = () => {
    return expenses.reduce((sum, expense) => sum + expense.amount, 0);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Загрузка данных...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Бухгалтерия - {currentBranch.name}</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            Выбранная дата: {selectedDate.toLocaleDateString('ru-RU')}
          </span>
          <Dialog open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2 rounded-lg">
                <Calendar className="h-4 w-4" />
                Выбрать дату
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px] rounded-lg">
              <DialogHeader>
                <DialogTitle>Выберите дату</DialogTitle>
              </DialogHeader>
              <div className="flex justify-center p-4">
                <DatePicker
                  selected={selectedDate}
                  onChange={handleDateChange}
                  inline
                  dateFormat="dd.MM.yyyy"
                  className="border rounded-lg"
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Основная таблица бухгалтерии */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">Записи бухгалтерии</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-200 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 p-3 text-left font-medium text-gray-700">№</th>
                  <th className="border border-gray-200 p-3 text-left font-medium text-gray-700">Мастер</th>
                  <th className="border border-gray-200 p-3 text-left font-medium text-gray-700">Клиент</th>
                  <th className="border border-gray-200 p-3 text-left font-medium text-gray-700">Услуга</th>
                  <th className="border border-gray-200 p-3 text-left font-medium text-gray-700">Номер телефона</th>
                  <th className="border border-gray-200 p-3 text-left font-medium text-gray-700">Сумма</th>
                  <th className="border border-gray-200 p-3 text-left font-medium text-gray-700">Скидка</th>
                  <th className="border border-gray-200 p-3 text-left font-medium text-gray-700">Длительность</th>
                  <th className="border border-gray-200 p-3 text-left font-medium text-gray-700">Комментарий</th>
                  <th className="border border-gray-200 p-3 text-left font-medium text-gray-700">Способ оплаты</th>
                  <th className="border border-gray-200 p-3 text-left font-medium text-gray-700">Дневной отчет</th>
                  <th className="border border-gray-200 p-3 text-left font-medium text-gray-700">Администратор</th>
                  <th className="border border-gray-200 p-3 text-left font-medium text-gray-700">Филиал</th>
                  <th className="border border-gray-200 p-3 text-left font-medium text-gray-700">Дата</th>
                  <th className="border border-gray-200 p-3 text-left font-medium text-gray-700">Действия</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record, index) => (
                  <tr key={record.id || index} className={`${record.isGiftCertificateUsed ? 'bg-yellow-50' : 'bg-white'} hover:bg-gray-50`}>
                    <td className="border border-gray-200 p-3">{index + 1}</td>
                    <td className="border border-gray-200 p-3">
                      <input
                        type="text"
                        name="master"
                        value={record.master}
                        onChange={(e) => handleInputChange(e, index)}
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </td>
                    <td className="border border-gray-200 p-3">
                      <input
                        type="text"
                        name="client"
                        value={record.client}
                        onChange={(e) => handleInputChange(e, index)}
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </td>
                    <td className="border border-gray-200 p-3">
                      <input
                        type="text"
                        name="massageType"
                        value={record.massageType || ''}
                        onChange={(e) => handleInputChange(e, index)}
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Тип массажа"
                      />
                    </td>
                    <td className="border border-gray-200 p-3">
                      <input
                        type="text"
                        name="phoneNumber"
                        value={record.phoneNumber || ''}
                        onChange={(e) => handleInputChange(e, index)}
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Номер телефона"
                      />
                    </td>
                    <td className="border border-gray-200 p-3">
                      <input
                        type="number"
                        name="amount"
                        value={record.amount}
                        onChange={(e) => handleInputChange(e, index)}
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </td>
                    <td className="border border-gray-200 p-3">
                      <input
                        type="text"
                        name="discount"
                        value={record.discount}
                        onChange={(e) => handleInputChange(e, index)}
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </td>
                    <td className="border border-gray-200 p-3">
                      <input
                        type="text"
                        name="duration"
                        value={record.duration}
                        onChange={(e) => handleInputChange(e, index)}
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </td>
                    <td className="border border-gray-200 p-3">
                      <input
                        type="text"
                        name="comment"
                        value={record.comment}
                        onChange={(e) => handleInputChange(e, index)}
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </td>
                    <td className="border border-gray-200 p-3">
                      <select
                        name="paymentMethod"
                        value={record.paymentMethod}
                        onChange={(e) => handleInputChange(e, index)}
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {paymentOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="border border-gray-200 p-3">
                      <input
                        type="number"
                        name="dailyReport"
                        value={record.dailyReport}
                        onChange={(e) => handleInputChange(e, index)}
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </td>
                    <td className="border border-gray-200 p-3">
                      <select
                        name="adminName"
                        value={record.adminName}
                        onChange={(e) => handleInputChange(e, index)}
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Выберите администратора</option>
                        {administrators.map((admin) => (
                          <option key={admin.id} value={admin.name}>
                            {admin.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="border border-gray-200 p-3">
                      <span className="text-sm text-gray-600">
                        {record.branchId === 'wa1' ? 'Токтогула 93' :
                         record.branchId || 'Не указан'}
                      </span>
                    </td>
                    <td className="border border-gray-200 p-3">
                      <span className="text-sm text-gray-600">
                        {record.date || 'Не указана'}
                      </span>
                    </td>
                    <td className="border border-gray-200 p-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveRecord(index)}
                          disabled={savingStates[index]}
                          className="text-green-600 hover:text-green-800 disabled:opacity-50 p-1 rounded-lg hover:bg-green-50"
                          title="Сохранить"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <button
                              className="text-blue-600 hover:text-blue-800 p-1 rounded-lg hover:bg-blue-50"
                              title="Подробнее"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[500px] rounded-lg">
                            <DialogHeader>
                              <DialogTitle>Детали записи</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-3 max-h-[400px] overflow-y-auto">
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <p><strong>ID:</strong> {record.id || 'Не указан'}</p>
                                <p><strong>Мастер:</strong> {record.master}</p>
                                <p><strong>Клиент:</strong> {record.client}</p>
                                <p><strong>Услуга:</strong> {record.massageType || 'Не указан'}</p>
                                <p><strong>Номер телефона:</strong> {record.phoneNumber || 'Не указан'}</p>
                                <p><strong>Сумма:</strong> {record.amount} сом</p>
                                <p><strong>Скидка:</strong> {record.discount}</p>
                                <p><strong>Длительность:</strong> {record.duration} мин</p>
                                <p className="col-span-2"><strong>Комментарий:</strong> {record.comment || 'Нет'}</p>
                                <p><strong>Способ оплаты:</strong> {record.paymentMethod}</p>
                                <p><strong>Дневной отчет:</strong> {record.dailyReport || '0'} сом</p>
                                <p><strong>Администратор:</strong> {record.adminName || 'Не указан'}</p>
                                <p><strong>Филиал:</strong> {
                                  record.branchId === 'wa1' ? 'Токтогула 93' :
                                  'Не указан'
                                }</p>
                                <p><strong>Дата:</strong> {record.date || 'Не указана'}</p>
                                <p><strong>Использован подарочный сертификат:</strong> {record.isGiftCertificateUsed ? 'Да' : 'Нет'}</p>
                              </div>
                            </div>
                            <div className="flex justify-end mt-4">
                              <DialogTrigger asChild>
                                <Button variant="outline">Закрыть</Button>
                              </DialogTrigger>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <button
                          onClick={() => deleteRecord(index)}
                          className="text-red-600 hover:text-red-800 p-1 rounded-lg hover:bg-red-50"
                          title="Удалить"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {/* Форма добавления новой записи */}
                <tr className="bg-blue-50">
                  <td className="border border-gray-200 p-3 font-medium">Новая</td>
                  <td className="border border-gray-200 p-3">
                    <select
                      name="master"
                      value={newRecord.master}
                      onChange={handleNewRecordChange}
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Выберите мастера</option>
                      {masters.map((master) => (
                        <option key={master.id} value={master.name}>
                          {master.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="border border-gray-200 p-3">
                    <input
                      type="text"
                      name="client"
                      value={newRecord.client}
                      onChange={handleNewRecordChange}
                      placeholder="Клиент"
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </td>
                  <td className="border border-gray-200 p-3">
                    <input
                      type="text"
                      name="massageType"
                      value={newRecord.massageType}
                      onChange={handleNewRecordChange}
                      placeholder="Услуга"
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </td>
                  <td className="border border-gray-200 p-3">
                    <input
                      type="text"
                      name="phoneNumber"
                      value={newRecord.phoneNumber}
                      onChange={handleNewRecordChange}
                      placeholder="Номер телефона"
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </td>
                  <td className="border border-gray-200 p-3">
                    <input
                      type="number"
                      name="amount"
                      value={newRecord.amount}
                      onChange={handleNewRecordChange}
                      placeholder="Сумма"
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </td>
                  <td className="border border-gray-200 p-3">
                    <input
                      type="text"
                      name="discount"
                      value={newRecord.discount}
                      onChange={handleNewRecordChange}
                      placeholder="Скидка"
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </td>
                  <td className="border border-gray-200 p-3">
                    <input
                      type="text"
                      name="duration"
                      value={newRecord.duration}
                      onChange={handleNewRecordChange}
                      placeholder="Длительность"
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </td>
                  <td className="border border-gray-200 p-3">
                    <input
                      type="text"
                      name="comment"
                      value={newRecord.comment}
                      onChange={handleNewRecordChange}
                      placeholder="Комментарий"
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </td>
                  <td className="border border-gray-200 p-3">
                    <select
                      name="paymentMethod"
                      value={newRecord.paymentMethod}
                      onChange={handleNewRecordChange}
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {paymentOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="border border-gray-200 p-3">
                    <input
                      type="number"
                      name="dailyReport"
                      value={newRecord.dailyReport}
                      onChange={handleNewRecordChange}
                      placeholder="Дневной отчет"
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </td>
                  <td className="border border-gray-200 p-3">
                    <select
                      name="adminName"
                      value={newRecord.adminName}
                      onChange={handleNewRecordChange}
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Выберите администратора</option>
                      {administrators.map((admin) => (
                        <option key={admin.id} value={admin.name}>
                          {admin.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="border border-gray-200 p-3">
                    <select
                      value={newRecordBranch}
                      onChange={(e) => setNewRecordBranch(e.target.value)}
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Выберите филиал</option>
                      <option value="wa1">Токтогула 93</option>
                    </select>
                  </td>
                  <td className="border border-gray-200 p-3">
                    <DatePicker
                      selected={newRecordDate}
                      onChange={(date: Date | null) => date && setNewRecordDate(date)}
                      dateFormat="dd.MM.yyyy"
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholderText="Выберите дату"
                    />
                  </td>
                  <td className="border border-gray-200 p-3">
                    <Button onClick={addRecord} size="sm" className="w-full rounded-lg">
                      <Plus className="h-4 w-4 mr-1" />
                      Добавить
                    </Button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
            <strong className="text-green-800">Итого за день (без подарочных сертификатов): {calculateDailyTotal()} сом</strong>
          </div>
        </CardContent>
      </Card>

      {/* Таблица расходов */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">Расходы</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-200 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 p-3 text-left font-medium text-gray-700">№</th>
                  <th className="border border-gray-200 p-3 text-left font-medium text-gray-700">Наименование</th>
                  <th className="border border-gray-200 p-3 text-left font-medium text-gray-700">Сумма</th>
                  <th className="border border-gray-200 p-3 text-left font-medium text-gray-700">Действия</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense, index) => (
                  <tr key={expense.id} className="bg-white hover:bg-gray-50">
                    <td className="border border-gray-200 p-3">{index + 1}</td>
                    <td className="border border-gray-200 p-3">{expense.name}</td>
                    <td className="border border-gray-200 p-3">{expense.amount} сом</td>
                    <td className="border border-gray-200 p-3">
                      <button
                        onClick={() => expense.id && deleteExpense(expense.id)}
                        className="text-red-600 hover:text-red-800 p-1 rounded-lg hover:bg-red-50"
                        title="Удалить"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {/* Форма добавления нового расхода */}
                <tr className="bg-red-50">
                  <td className="border border-gray-200 p-3 font-medium">Новый</td>
                  <td className="border border-gray-200 p-3">
                    <Input
                      type="text"
                      name="name"
                      value={newExpense.name}
                      onChange={handleNewExpenseChange}
                      placeholder="Наименование расхода"
                      className="w-full rounded-lg"
                    />
                  </td>
                  <td className="border border-gray-200 p-3">
                    <Input
                      type="number"
                      name="amount"
                      value={newExpense.amount}
                      onChange={handleNewExpenseChange}
                      placeholder="Сумма"
                      className="w-full rounded-lg"
                    />
                  </td>
                  <td className="border border-gray-200 p-3">
                    <Button onClick={addExpense} size="sm" className="w-full rounded-lg">
                      <Plus className="h-4 w-4 mr-1" />
                      Добавить
                    </Button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div className="mt-6 p-4 bg-red-50 rounded-lg border border-red-200">
            <strong className="text-red-800">Общие расходы за день: {calculateTotalExpenses()} сом</strong>
          </div>
        </CardContent>
      </Card>

      {/* Компонент кассы за день */}
      <DailyCashReport 
        selectedDate={selectedDate} 
        branchId={currentBranch.waInstance}
        records={records}
        expenses={expenses}
      />
    </div>
  );
};

export default AccountingPage;