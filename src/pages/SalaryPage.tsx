import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, User, DollarSign, Calculator, Trash2, Edit, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useBranch } from '@/contexts/BranchContext';
import { getBranchIdWithFallback } from '@/utils/branch-utils';

interface SalaryRecord {
  id?: number;
  employee: string;
  base_salary: number;
  commission_rate: number;
  employee_role: string;
  master_id?: number;
  branch_id?: string;
  specialization?: string;
  calculated_commission?: number;
  completed_services?: number;
  total_earnings?: number;
  created_at?: string; // Формат: YYYY-MM-DD (дата создания записи)
  updated_at?: string; // Формат: YYYY-MM-DD (дата обновления записи)
  employee_type?: string; // 'master' или 'administrator'
}

interface SalaryPayment {
  id?: number;
  employee_id: number;
  employee_name: string;
  amount: number;
  payment_date: string;
  period_start: string;
  period_end: string;
}

interface AccountingData {
  master: string;
  amount: number;
  daily_report: number;
  date: string;
  admin_name: string;
  payment_method: string;
}

export default function SalaryPage() {
  const { currentBranch, branches } = useBranch();
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([]);
  const [salaryPayments, setSalaryPayments] = useState<SalaryPayment[]>([]);
  const [accountingData, setAccountingData] = useState<AccountingData[]>([]);
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  });
  const [isLoading, setIsLoading] = useState(true);

  const [editedPayments, setEditedPayments] = useState<{ [key: number]: number }>({});
  const [editingRows, setEditingRows] = useState<{ [key: number]: boolean }>({});
  const [editedData, setEditedData] = useState<{ [key: number]: Partial<SalaryRecord> }>({});
  const { toast } = useToast();

  // Загрузка данных зарплат
  const fetchSalaryData = async () => {
    setIsLoading(true);
    try {
      const branchId = getBranchIdWithFallback(currentBranch, branches);
      
      // Проверяем что branchId валиден перед запросом
      if (!branchId) {
        console.warn('Пропускаем загрузку зарплат: branchId не определен');
        setIsLoading(false);
        return;
      }
      
      const url = new URL(`${import.meta.env.VITE_BACKEND_URL}/api/salaries`);
      url.searchParams.append('branchId', branchId);
      
      const response = await fetch(url.toString());
      if (response.ok) {
        const data = await response.json();
        // Новый формат API возвращает объект с полем salaries
        const salariesArray = data.salaries || data;
        // Приводим числовые значения к корректному формату
        const formattedData = salariesArray.map((record: any) => ({
          ...record,
          base_salary: Math.round(parseFloat(record.base_salary) || 0),
          commission_rate: parseFloat(record.commission_rate) || 0,
          calculated_commission: parseFloat(record.calculated_commission) || 0,
          completed_services: parseInt(record.completed_services) || 0,
          total_earnings: parseFloat(record.total_earnings) || 0
        }));
        console.log('Загружены данные зарплат:', formattedData);
        setSalaryRecords(formattedData);
      } else {
        console.error('Ошибка загрузки зарплат:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Ошибка загрузки данных зарплат:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить данные зарплат",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Загрузка данных из accounting для расчетов
  const fetchAccountingData = async () => {
    try {
      const branchId = getBranchIdWithFallback(currentBranch, branches);
      
      // Проверяем что branchId валиден перед запросом
      if (!branchId) {
        console.warn('Пропускаем загрузку accounting данных: branchId не определен');
        return;
      }
      
      const url = new URL(`${import.meta.env.VITE_BACKEND_URL}/api/accounting/period`);
      url.searchParams.append('startDate', startDate);
      url.searchParams.append('endDate', endDate);
      url.searchParams.append('branchId', branchId);
      
      const response = await fetch(url.toString());
      if (response.ok) {
        const data = await response.json();
        setAccountingData(data);
      } else {
        console.error('Ошибка загрузки accounting данных:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Ошибка загрузки данных accounting:', error);
    }
  };

  // Загрузка выплат за период
  const fetchSalaryPayments = async () => {
    try {
      const branchId = getBranchIdWithFallback(currentBranch, branches);
      
      // Проверяем что branchId валиден перед запросом
      if (!branchId) {
        console.warn('Пропускаем загрузку выплат: branchId не определен');
        return;
      }
      
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/salary-payments?branchId=${branchId}&startDate=${startDate}&endDate=${endDate}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Данные выплат:', data);
        // Убеждаемся что данные это массив
        const paymentsArray = Array.isArray(data) ? data : (data.payments || []);
        setSalaryPayments(paymentsArray);
      } else {
        console.error('Ошибка загрузки выплат:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Ошибка загрузки выплат:', error);
    }
  };

  useEffect(() => {
    fetchSalaryData();
    fetchAccountingData();
    fetchSalaryPayments();
  }, [startDate, endDate, currentBranch, branches]);

  // Расчет зарплаты для администраторов
  const calculateAdminSalary = (employee: string, baseSalary: number, commissionRate: number) => {
    // Получаем записи, где администратор указан
    const adminRecords = accountingData.filter(record =>
      record.admin_name && record.admin_name.toLowerCase().trim() === employee.toLowerCase().trim()
    );

    // Сумма чисел по столбцу daily_report с любым payment_method
    const totalDailyReport = adminRecords
      .reduce((sum, record) => sum + parseFloat(record.daily_report?.toString() || '0'), 0);

    // Получаем уникальные даты, когда администратор работал
    const dateSet = new Set(adminRecords.map(record => record.date));
    const workDays = dateSet.size;

    // ЗП = (сумма daily_report * commission_rate) + (количество рабочих дней * base_salary)
    const salary = (totalDailyReport * commissionRate) + (workDays * baseSalary);

    return Math.round(salary);
  };

  // Расчет зарплаты для массажистов
  const calculateMasseurSalary = (employee: string, commissionRate: number) => {
    // Сумма чисел по столбцу daily_report, где master == employee
    const totalDailyReport = accountingData
      .filter(record =>
        record.master && record.master.toLowerCase().trim() === employee.toLowerCase().trim()
      )
      .reduce((sum, record) => sum + parseFloat(record.daily_report?.toString() || '0'), 0);

    // ЗП = сумма daily_report * commission_rate
    return Math.round(commissionRate * totalDailyReport);
  };

  // Определение типа сотрудника и расчет зарплаты
  const calculateSalary = (record: SalaryRecord) => {
    // Используем поле employee_role для определения типа сотрудника
    if (record.employee_role === 'администратор') {
      return calculateAdminSalary(record.employee, record.base_salary, record.commission_rate);
    } else if (record.employee_role === 'мастер') {
      return calculateMasseurSalary(record.employee, record.commission_rate);
    }
    return 0;
  };

  // Получение общей выплаченной суммы для сотрудника за период
  const getTotalPaidAmount = (employeeName: string) => {
    if (!Array.isArray(salaryPayments)) {
      console.warn('salaryPayments is not an array:', salaryPayments);
      return 0;
    }

    return salaryPayments
      .filter(payment => payment.employee_name === employeeName)
      .reduce((sum, payment) => sum + payment.amount, 0);
  };

  // Сохранение выплаты
  const savePayment = async (employeeId: number, employeeName: string, amount: number) => {
    try {
      const branchId = getBranchIdWithFallback(currentBranch, branches);
      
      // Проверяем что branchId валиден перед запросом
      if (!branchId) {
        console.warn('Не удается сохранить выплату: branchId не определен');
        toast({
          title: "Ошибка",
          description: "Не удается определить филиал для сохранения выплаты",
          variant: "destructive",
        });
        return;
      }
      
      const paymentData = {
        // Основные поля согласно API требованиям
        employeeName: employeeName, // "Employee name" в camelCase
        amount: amount, // "amount"
        branchId: branchId, // "branch ID" в camelCase
        
        // Дополнительные поля (на случай если API ожидает другие варианты)
        employee_id: employeeId,
        employee_name: employeeName,
        branch_id: branchId,
        payment_date: new Date().toISOString().split('T')[0],
        period_start: startDate,
        period_end: endDate
      };
      
      console.log('💰 Sending salary payment data:', paymentData);
      
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/salary-payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      });

      if (response.ok) {
        toast({
          title: "Успех",
          description: "Выплата сохранена",
        });
        fetchSalaryPayments();
        setEditedPayments(prev => {
          const updated = { ...prev };
          delete updated[employeeId];
          return updated;
        });
      } else {
        // Получаем детали ошибки от API
        const errorData = await response.json();
        console.error('❌ API Error:', errorData);
        toast({
          title: "Ошибка API",
          description: errorData.message || `Статус: ${response.status}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Ошибка сохранения выплаты:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить выплату",
        variant: "destructive",
      });
    }
  };



  // Удаление сотрудника (всегда используем общий endpoint ${import.meta.env.VITE_BACKEND_URL}/api/salaries)
  const deleteEmployee = async (record: SalaryRecord) => {
    if (!record.id) {
      toast({
        title: "Ошибка",
        description: "Неверный ID сотрудника",
        variant: "destructive",
      });
      return;
    }

    try {
      // Используем общий endpoint для удаления, который обработает и мастеров, и администраторов
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/salaries/${record.id}`, {
        method: 'DELETE',
      });

      if (response?.ok) {
        toast({
          title: "Успех",
          description: `${record.employee_type === 'administrator' ? 'Администратор деактивирован' : 'Сотрудник удален'}`,
        });
        fetchSalaryData();
      } else {
        const errorData = await response?.json();
        toast({
          title: "Ошибка",
          description: errorData?.message || "Не удалось удалить сотрудника",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Ошибка удаления сотрудника:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить сотрудника",
        variant: "destructive",
      });
    }
  };

  // Обновление выплаченной суммы
  const updatePaidAmount = async (id: number, paidAmount: number) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/salaries/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paid_amount: paidAmount }),
      });

      if (response.ok) {
        toast({
          title: "Успех",
          description: "Данные обновлены",
        });
        fetchSalaryData();
      }
    } catch (error) {
      console.error('Ошибка обновления данных:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить данные",
        variant: "destructive",
      });
    }
  };

  // Начать редактирование строки
  const startEditing = (record: SalaryRecord) => {
    if (!record.id) return;
    setEditingRows(prev => ({ ...prev, [record.id!]: true }));
    setEditedData(prev => ({
      ...prev,
      [record.id!]: {
        employee: record.employee,
        base_salary: record.base_salary,
        commission_rate: record.commission_rate,
        employee_role: record.employee_role
      }
    }));
  };

  // Отменить редактирование
  const cancelEditing = (id: number) => {
    setEditingRows(prev => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
    setEditedData(prev => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
  };

  // Сохранить изменения
  const saveEditing = async (id: number) => {
    console.log('saveEditing вызвана с ID:', id);
    const data = editedData[id];
    console.log('Данные для сохранения:', data);

    if (!data) {
      console.log('Нет данных для сохранения');
      toast({
        title: "Ошибка",
        description: "Нет данных для сохранения",
        variant: "destructive",
      });
      return;
    }

    const requestData = {
      employee: data.employee,
      base_salary: Math.round(data.base_salary || 0),
      commission_rate: data.commission_rate,
      employee_role: data.employee_role
    };

    console.log('Отправляю запрос PUT:', requestData);

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/salaries/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      console.log('Ответ сервера:', response.status, response.statusText);

      if (response.ok) {
        const responseData = await response.json();
        console.log('Успешный ответ:', responseData);
        toast({
          title: "Успех",
          description: "Данные сотрудника обновлены",
        });
        cancelEditing(id);
        fetchSalaryData();
      } else {
        const errorData = await response.json();
        console.log('Ошибка сервера:', errorData);
        toast({
          title: "Ошибка",
          description: errorData.message || "Не удалось обновить данные",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Ошибка обновления данных:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить данные",
        variant: "destructive",
      });
    }
  };

  // Обновление поля при редактировании
  const updateEditedField = (id: number, field: keyof SalaryRecord, value: any) => {
    setEditedData(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value
      }
    }));
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <Card className="rounded-xl shadow-lg">
        <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-t-xl">
          <CardTitle className="flex items-center gap-3 text-2xl">
            <DollarSign className="h-8 w-8" />
            Управление зарплатами
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center gap-4 flex-wrap">
            <Calendar className="h-5 w-5 text-gray-600" />
            <label className="text-sm font-medium">Период:</label>
            <div className="flex items-center gap-2">
              <label className="text-sm">С:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm">По:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>
        </CardContent>
      </Card>



      {/* Salary records */}
      <Card className="rounded-xl shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calculator className="h-5 w-5" />
            Расчет зарплат с {startDate} по {endDate}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 p-3 text-left font-semibold rounded-tl-lg">Сотрудник</th>
                  <th className="border border-gray-200 p-3 text-left font-semibold">Роль</th>
                  <th className="border border-gray-200 p-3 text-left font-semibold">Базовая ЗП</th>
                  <th className="border border-gray-200 p-3 text-left font-semibold">Комиссия</th>
                  <th className="border border-gray-200 p-3 text-left font-semibold">Расчетная ЗП</th>
                  <th className="border border-gray-200 p-3 text-left font-semibold">Выплачено</th>
                  <th className="border border-gray-200 p-3 text-left font-semibold">Остаток</th>
                  <th className="border border-gray-200 p-3 text-left font-semibold rounded-tr-lg">Действия</th>
                </tr>
              </thead>
              <tbody>
                {salaryRecords.map((record, index) => {
                  const calculatedSalary = calculateSalary(record);
                  const totalPaid = getTotalPaidAmount(record.employee);
                  const remaining = calculatedSalary - totalPaid;
                  const currentPayment = editedPayments[record.id!] || 0;

                  const isEditing = editingRows[record.id!];
                  const editData = editedData[record.id!] || record;

                  return (
                    <tr key={`${record.id}-${index}`} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border border-gray-200 p-3">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-600" />
                          {isEditing ? (
                            <input
                              type="text"
                              value={editData.employee}
                              onChange={(e) => updateEditedField(record.id!, 'employee', e.target.value)}
                              className="flex-1 px-2 py-1 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          ) : (
                            record.employee
                          )}
                        </div>
                      </td>
                      <td className="border border-gray-200 p-3">
                        {isEditing ? (
                          <Select
                            value={editData.employee_role}
                            onValueChange={(value) => updateEditedField(record.id!, 'employee_role', value)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Выберите роль" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="администратор">Администратор</SelectItem>
                              <SelectItem value="мастер">Мастер</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                            {record.employee_role || 'Не указано'}
                          </span>
                        )}
                      </td>
                      <td className="border border-gray-200 p-3">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editData.base_salary}
                            onChange={(e) => updateEditedField(record.id!, 'base_salary', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            min="0"
                            step="100"
                          />
                        ) : (
                          `${Math.round(record.base_salary).toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} сом`
                        )}
                      </td>
                      <td className="border border-gray-200 p-3">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editData.commission_rate}
                            onChange={(e) => updateEditedField(record.id!, 'commission_rate', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            min="0"
                            max="1"
                            step="0.01"
                          />
                        ) : (
                          `${(record.commission_rate * 100).toFixed(1)}%`
                        )}
                      </td>
                      <td className="border border-gray-200 p-3 font-semibold text-green-600">
                        {Math.round(calculatedSalary).toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} сом
                      </td>

                      <td className="border border-gray-200 p-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={currentPayment || ''}
                            onChange={(e) => setEditedPayments(prev => ({
                              ...prev,
                              [record.id!]: e.target.value ? Math.round(parseFloat(e.target.value)) : 0
                            }))}
                            className="flex-1 px-2 py-1 border rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            placeholder="Сумма выплаты"
                            min="0"
                          />
                          {currentPayment > 0 && (
                            <Button
                              onClick={() => savePayment(record.id!, record.employee, currentPayment)}
                              size="sm"
                              className="rounded-lg bg-green-600 hover:bg-green-700"
                            >
                              ✓
                            </Button>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Всего выплачено: {Math.round(totalPaid).toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} сом
                        </div>
                      </td>
                      <td className="border border-gray-200 p-3">
                        <span className={remaining > 0 ? 'text-red-600 font-semibold' : 'text-gray-600'}>
                          {Math.round(remaining).toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} сом
                        </span>
                      </td>
                      <td className="border border-gray-200 p-3">
                        <div className="flex items-center gap-1">
                          {isEditing ? (
                            <>
                              <Button
                                onClick={() => saveEditing(record.id!)}
                                size="sm"
                                className="rounded-lg bg-green-600 hover:bg-green-700"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                onClick={() => cancelEditing(record.id!)}
                                variant="outline"
                                size="sm"
                                className="rounded-lg"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <Button
                              onClick={() => startEditing(record)}
                              variant="outline"
                              size="sm"
                              className="rounded-lg"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            onClick={() => deleteEmployee(record)}
                            variant="destructive"
                            size="sm"
                            className="rounded-lg"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {salaryRecords.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Нет данных о сотрудниках
            </div>
          )}
        </CardContent>
      </Card>



      {/* Summary */}
      <Card className="rounded-xl shadow-lg">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <h3 className="text-lg font-semibold text-blue-800">Общая сумма ЗП</h3>
              <p className="text-2xl font-bold text-blue-600">
                {(() => {
                  const total = salaryRecords.reduce((sum, record) => sum + calculateSalary(record), 0);
                  console.log('Общая сумма ЗП:', total);
                  return Math.round(total).toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
                })()} сом
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <h3 className="text-lg font-semibold text-green-800">Выплачено</h3>
              <p className="text-2xl font-bold text-green-600">
                {(() => {
                  // Фильтруем только тех сотрудников, которые работали в выбранном периоде
                  const relevantEmployees = salaryRecords.filter(record => {
                    const isAdmin = accountingData.some(data => data.admin_name === record.employee);
                    const isMasseur = accountingData.some(data => data.master === record.employee);
                    return isAdmin || isMasseur;
                  });

                  const totalPaid = relevantEmployees.reduce((sum, record) => {
                    const paidAmount = getTotalPaidAmount(record.employee);
                    console.log(`Выплачено ${record.employee}:`, paidAmount);
                    return sum + paidAmount;
                  }, 0);

                  // Проверяем, есть ли данные accounting для выбранного периода
                  if (accountingData.length === 0 && relevantEmployees.length === 0) {
                    console.warn('Нет данных accounting для выбранного периода');
                  }

                  console.log('Общая сумма выплачено:', totalPaid);
                  return Math.round(totalPaid).toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
                })()} сом
              </p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg text-center">
              <h3 className="text-lg font-semibold text-red-800">К доплате</h3>
              <p className="text-2xl font-bold text-red-600">
                {(() => {
                  const relevantEmployees = salaryRecords.filter(record => {
                    const isAdmin = accountingData.some(data => data.admin_name === record.employee);
                    const isMasseur = accountingData.some(data => data.master === record.employee);
                    return isAdmin || isMasseur;
                  });

                  const totalToPay = relevantEmployees.reduce((sum, record) => {
                    const calculatedSalary = calculateSalary(record);
                    const paidAmount = getTotalPaidAmount(record.employee);
                    return sum + (calculatedSalary - paidAmount);
                  }, 0);

                  console.log('К доплате:', totalToPay);
                  return Math.round(totalToPay).toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
                })()} сом
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}