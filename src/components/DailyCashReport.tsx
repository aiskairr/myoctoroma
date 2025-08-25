import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertTriangle, Send } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

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

interface ExpenseRecord {
  id: number;
  name: string;
  amount: number;
  branchId: string;
  date: string;
  createdAt: string;
}

interface DailyCashReportData {
  startBalance: number;
  totalRevenue: number;
  pettyExpenses: number;
  totalIncome: number;
  endBalance: number;
  cashCollection: number;
  // Способы оплаты
  cashPayments: number;
  cardPayments: number;
  transferPayments: number;
  giftCertificatePayments: number;
  // Разбивка по банкам
  optimaPayments: number;
  mbankPayments: number;
  mbusinessPayments: number;
  demirPayments: number;
  bakaiPayments: number;
  obankPayments: number;
}

interface DailyCashReportProps {
  selectedDate: Date;
  branchId: string;
  records: AccountingRecord[];
  expenses: ExpenseRecord[];
}

const DailyCashReport: React.FC<DailyCashReportProps> = ({ 
  selectedDate, 
  branchId, 
  records, 
  expenses 
}) => {
  const [reportData, setReportData] = useState<DailyCashReportData>({
    startBalance: 0,
    totalRevenue: 0,
    pettyExpenses: 0,
    totalIncome: 0,
    endBalance: 0,
    cashCollection: 0,
    cashPayments: 0,
    cardPayments: 0,
    transferPayments: 0,
    giftCertificatePayments: 0,
    optimaPayments: 0,
    mbankPayments: 0,
    mbusinessPayments: 0,
    demirPayments: 0,
    bakaiPayments: 0,
    obankPayments: 0,
  });
  
  const [cashCollection, setCashCollection] = useState<number>(0);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const { toast } = useToast();

  // Функция для получения остатка на начало смены (из вчерашнего отчета)
  useEffect(() => {
    const getYesterdayEndBalance = async () => {
      const yesterday = new Date(selectedDate);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = new Date(yesterday.getTime() - (yesterday.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
      
      try {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/daily-cash-reports?startDate=${yesterdayStr}&endDate=${yesterdayStr}&branchId=${branchId}`);
        if (response.ok) {
          const reports = await response.json();
          if (reports.length > 0) {
            setReportData(prev => ({
              ...prev,
              startBalance: reports[0].end_balance || 0
            }));
          }
        }
      } catch (error) {
        console.error('Ошибка получения вчерашнего остатка:', error);
      }
    };

    getYesterdayEndBalance();
  }, [selectedDate, branchId]);

  // Функция для расчета данных на основе записей и расходов
  useEffect(() => {
    const calculateReportData = async () => {
      const selectedDateStr = new Date(selectedDate.getTime() - (selectedDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
      
      // Используем записи с числовыми значениями daily_report для выбранного филиала
      const dayRecords = records.filter(record => 
        record.date.startsWith(selectedDateStr) && 
        record.branchId === branchId &&
        record.dailyReport && 
        !isNaN(Number(record.dailyReport)) &&
        record.paymentMethod !== 'Расход'
      );
      

      
      // Фильтруем расходы за выбранный день
      const dayExpenses = expenses.filter(expense => 
        expense.date.startsWith(selectedDateStr)
      );

      // Получаем данные о подарочных сертификатах за день
      let giftCertificatesRevenue = 0;
      let giftCertificatesByPaymentMethod = {
        cash: 0,
        card: 0,
        transfers: 0,
        optima: 0,
        mbank: 0,
        mbusiness: 0,
        demir: 0,
        bakai: 0,
        obank: 0
      };

      try {
        const giftCertResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/gift-certificates?date=${selectedDateStr}&branchId=${branchId}&isUsed=false&isExpired=false`);
        if (giftCertResponse.ok) {
          const giftCerts = await giftCertResponse.json();
          const todayGiftCerts = giftCerts; // Сервер уже отфильтровал по дате и филиалу
          
          giftCertificatesRevenue = todayGiftCerts.reduce((sum: number, cert: any) => 
            sum + Number(cert.amount), 0
          );

          console.log('Gift Certificates Debug:', {
            selectedDateStr,
            branchId,
            totalCerts: giftCerts.length,
            todayGiftCerts: todayGiftCerts.length,
            giftCertificatesRevenue,
            sampleCert: todayGiftCerts[0],
            allCerts: giftCerts.map(c => ({ id: c.id, amount: c.amount, payment_method: c.payment_method, branch_id: c.branch_id, createdAt: c.createdAt })),
            filteredTodayCerts: todayGiftCerts.map(c => ({ id: c.id, amount: c.amount, payment_method: c.payment_method })),
            paymentMethodBreakdown: {
              cash: giftCertificatesByPaymentMethod.cash,
              mbank: giftCertificatesByPaymentMethod.mbank,
              transfers: giftCertificatesByPaymentMethod.transfers
            }
          });

          // Разбиваем по способам оплаты сертификатов
          giftCertificatesByPaymentMethod.cash = todayGiftCerts
            .filter((cert: any) => cert.payment_method === 'Наличные')
            .reduce((sum: number, cert: any) => sum + Number(cert.amount), 0);

          giftCertificatesByPaymentMethod.card = todayGiftCerts
            .filter((cert: any) => cert.payment_method?.includes('POS') || cert.payment_method === 'Карта')
            .reduce((sum: number, cert: any) => sum + Number(cert.amount), 0);

          giftCertificatesByPaymentMethod.transfers = todayGiftCerts
            .filter((cert: any) => cert.payment_method?.includes('Перевод'))
            .reduce((sum: number, cert: any) => sum + Number(cert.amount), 0);

          // Разбиваем по банкам
          giftCertificatesByPaymentMethod.optima = todayGiftCerts
            .filter((cert: any) => cert.payment_method?.includes('Оптима'))
            .reduce((sum: number, cert: any) => sum + Number(cert.amount), 0);

          giftCertificatesByPaymentMethod.mbank = todayGiftCerts
            .filter((cert: any) => cert.payment_method?.includes('М-Банк') || cert.payment_method?.includes('МБанк') || cert.payment_method?.includes('МБизнес'))
            .reduce((sum: number, cert: any) => sum + Number(cert.amount), 0);

          giftCertificatesByPaymentMethod.mbusiness = todayGiftCerts
            .filter((cert: any) => cert.payment_method?.includes('М-Бизнес'))
            .reduce((sum: number, cert: any) => sum + Number(cert.amount), 0);

          giftCertificatesByPaymentMethod.demir = todayGiftCerts
            .filter((cert: any) => cert.payment_method?.includes('Демир'))
            .reduce((sum: number, cert: any) => sum + Number(cert.amount), 0);

          giftCertificatesByPaymentMethod.bakai = todayGiftCerts
            .filter((cert: any) => cert.payment_method?.includes('Бакай'))
            .reduce((sum: number, cert: any) => sum + Number(cert.amount), 0);

          giftCertificatesByPaymentMethod.obank = todayGiftCerts
            .filter((cert: any) => cert.payment_method?.includes('O!Банк'))
            .reduce((sum: number, cert: any) => sum + Number(cert.amount), 0);
        }
      } catch (error) {
        console.error('Ошибка загрузки данных сертификатов:', error);
      }

      // Сертификаты = сумма (daily_report) где payment_method содержит "Подарочный Сертификат"
      const giftCertificateUsage = dayRecords
        .filter(record => record.paymentMethod?.includes('Подарочный Сертификат'))
        .reduce((sum, record) => sum + Number(record.dailyReport), 0);

      // Общая выручка = сумма всех daily_report - сертификаты + созданные сертификаты
      const totalFromDailyReport = dayRecords.reduce((sum, record) => sum + Number(record.dailyReport), 0);
      const totalRevenue = totalFromDailyReport - giftCertificateUsage + giftCertificatesRevenue;
      
      console.log('Revenue Calculation Debug:', {
        totalFromDailyReport,
        giftCertificateUsage,
        giftCertificatesRevenue,
        totalRevenue,
        formula: `${totalFromDailyReport} - ${giftCertificateUsage} + ${giftCertificatesRevenue} = ${totalRevenue}`
      });

      // Мелкие расходы = сумма (amount) за выбранный день
      const pettyExpenses = dayExpenses.reduce((sum, expense) => sum + expense.amount, 0);
      
      // Наличные = сумма (daily_report) где payment_method = "Наличные" + созданные сертификаты за наличные
      const cashFromAccounting = dayRecords
        .filter(record => record.paymentMethod === 'Наличные')
        .reduce((sum, record) => sum + Number(record.dailyReport), 0);
      const cashPayments = cashFromAccounting + giftCertificatesByPaymentMethod.cash;
        
      // Карта = сумма (daily_report) где payment_method содержит "POS" + созданные сертификаты картой
      const cardFromAccounting = dayRecords
        .filter(record => record.paymentMethod?.includes('POS'))
        .reduce((sum, record) => sum + Number(record.dailyReport), 0);
      const cardPayments = cardFromAccounting + giftCertificatesByPaymentMethod.card;
        
      // Переводы = сумма (daily_report) где payment_method содержит "Перевод" + созданные сертификаты переводом
      const transferFromAccounting = dayRecords
        .filter(record => record.paymentMethod?.includes('Перевод'))
        .reduce((sum, record) => sum + Number(record.dailyReport), 0);
      const transferPayments = transferFromAccounting + giftCertificatesByPaymentMethod.transfers;

      // Подсчет по банкам: сумма (daily_report) по payment_method + созданные сертификаты
      const optimaPayments = dayRecords
        .filter(record => record.paymentMethod?.includes('Оптима') && !record.paymentMethod?.includes('Подарочный Сертификат'))
        .reduce((sum, record) => sum + Number(record.dailyReport), 0) + giftCertificatesByPaymentMethod.optima;
        
      const mbankPayments = dayRecords
        .filter(record => record.paymentMethod?.includes('МБанк') && !record.paymentMethod?.includes('МБизнес') && !record.paymentMethod?.includes('Подарочный Сертификат'))
        .reduce((sum, record) => sum + Number(record.dailyReport), 0) + giftCertificatesByPaymentMethod.mbank;
        
      const mbusinessPayments = dayRecords
        .filter(record => record.paymentMethod?.includes('МБизнес') && !record.paymentMethod?.includes('Подарочный Сертификат'))
        .reduce((sum, record) => sum + Number(record.dailyReport), 0) + giftCertificatesByPaymentMethod.mbusiness;
        
      const demirPayments = dayRecords
        .filter(record => record.paymentMethod?.includes('Демир') && !record.paymentMethod?.includes('Подарочный Сертификат'))
        .reduce((sum, record) => sum + Number(record.dailyReport), 0) + giftCertificatesByPaymentMethod.demir;
        
      const bakaiPayments = dayRecords
        .filter(record => record.paymentMethod?.includes('Bakai') && !record.paymentMethod?.includes('Подарочный Сертификат'))
        .reduce((sum, record) => sum + Number(record.dailyReport), 0) + giftCertificatesByPaymentMethod.bakai;
        
      const obankPayments = dayRecords
        .filter(record => record.paymentMethod?.includes('О!Банк') && !record.paymentMethod?.includes('Подарочный Сертификат'))
        .reduce((sum, record) => sum + Number(record.dailyReport), 0) + giftCertificatesByPaymentMethod.obank;

      // Общий доход = выручка - расходы
      const totalIncome = totalRevenue - pettyExpenses;
      
      // Остаток на конец смены = остаток на начало смены + наличные - расходы - инкассация
      const endBalance = Math.round((Number(reportData.startBalance) + Number(cashPayments) - Number(pettyExpenses) - Number(cashCollection)) * 100) / 100;

      console.log('Balance Calculation Debug:', {
        startBalance: reportData.startBalance,
        cashPayments,
        pettyExpenses,
        cashCollection,
        calculation: `${reportData.startBalance} + ${cashPayments} - ${pettyExpenses} - ${cashCollection}`,
        result: endBalance,
        rawResult: Number(reportData.startBalance) + Number(cashPayments) - Number(pettyExpenses) - Number(cashCollection)
      });

      setReportData(prev => ({
        ...prev,
        totalRevenue,
        pettyExpenses,
        totalIncome,
        endBalance,
        cashPayments,
        cardPayments,
        transferPayments,
        giftCertificatePayments: giftCertificateUsage,
        optimaPayments,
        mbankPayments,
        mbusinessPayments,
        demirPayments,
        bakaiPayments,
        obankPayments,
      }));
    };

    calculateReportData();
  }, [records, expenses, selectedDate, reportData.startBalance, cashCollection]);

  const handleSubmitReport = async () => {
    try {
      const reportPayload = {
        date: new Date(selectedDate.getTime() - (selectedDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0],
        branchId,
        adminName: 'Текущий администратор', // Можно получить из контекста пользователя
        ...reportData,
        cashCollection
      };

      const response = await fetch('${import.meta.env.VITE_BACKEND_URL}/api/daily-cash-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reportPayload),
      });

      if (response.ok) {
        toast({
          title: "Успешно",
          description: "Отчет кассы отправлен в бухгалтерию",
        });
        setIsConfirmDialogOpen(false);
      } else {
        const errorData = await response.json();
        toast({
          title: "Ошибка",
          description: errorData.message || "Не удалось отправить отчет",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Произошла ошибка при отправке отчета",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Касса за день - {selectedDate.toLocaleDateString('ru-RU')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 p-3 text-left">Остаток на начало смены</th>
                <th className="border border-gray-300 p-3 text-left">Общая выручка</th>
                <th className="border border-gray-300 p-3 text-left">Мелкие расходы</th>
                <th className="border border-gray-300 p-3 text-left">Общий доход</th>
                <th className="border border-gray-300 p-3 text-left">Остаток на конец смены</th>
                <th className="border border-gray-300 p-3 text-left">Инкассация</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 p-3">
                  <Input
                    type="number"
                    value={reportData.startBalance}
                    onChange={(e) => setReportData(prev => ({
                      ...prev,
                      startBalance: Number(e.target.value)
                    }))}
                    className="w-full"
                  />
                </td>
                <td className="border border-gray-300 p-3 bg-blue-50">
                  <span className="font-semibold">{reportData.totalRevenue.toLocaleString()} сом</span>
                </td>
                <td className="border border-gray-300 p-3 bg-red-50">
                  <span className="font-semibold">{reportData.pettyExpenses.toLocaleString()} сом</span>
                </td>
                <td className="border border-gray-300 p-3 bg-green-50">
                  <span className="font-semibold">{reportData.totalIncome.toLocaleString()} сом</span>
                </td>
                <td className="border border-gray-300 p-3 bg-yellow-50">
                  <span className="font-semibold">{reportData.endBalance.toLocaleString()} сом</span>
                </td>
                <td className="border border-gray-300 p-3">
                  <Input
                    type="number"
                    value={cashCollection}
                    onChange={(e) => setCashCollection(Number(e.target.value))}
                    className="w-full"
                    placeholder="Введите сумму инкассации"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Таблица способов оплаты */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3">Разбивка по способам оплаты</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-sm text-gray-600">Наличные</div>
              <div className="text-lg font-semibold">{reportData.cashPayments.toLocaleString()} сом</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="text-sm text-gray-600">Карта</div>
              <div className="text-lg font-semibold">{reportData.cardPayments.toLocaleString()} сом</div>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <div className="text-sm text-gray-600">Переводы</div>
              <div className="text-lg font-semibold">{reportData.transferPayments.toLocaleString()} сом</div>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg">
              <div className="text-sm text-gray-600">Сертификаты</div>
              <div className="text-lg font-semibold">{reportData.giftCertificatePayments.toLocaleString()} сом</div>
            </div>
          </div>
        </div>

        {/* Разбивка по банкам */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3">Разбивка по банкам</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {reportData.optimaPayments > 0 && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600">Оптима</div>
                <div className="text-lg font-semibold">{reportData.optimaPayments.toLocaleString()} сом</div>
              </div>
            )}
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm text-gray-600">М-Банк</div>
              <div className="text-lg font-semibold">{reportData.mbankPayments.toLocaleString()} сом</div>
            </div>
            {reportData.mbusinessPayments > 0 && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600">М-Бизнес</div>
                <div className="text-lg font-semibold">{reportData.mbusinessPayments.toLocaleString()} сом</div>
              </div>
            )}
            {reportData.demirPayments > 0 && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600">Демир</div>
                <div className="text-lg font-semibold">{reportData.demirPayments.toLocaleString()} сом</div>
              </div>
            )}
            {reportData.bakaiPayments > 0 && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600">Бакай</div>
                <div className="text-lg font-semibold">{reportData.bakaiPayments.toLocaleString()} сом</div>
              </div>
            )}
            {reportData.obankPayments > 0 && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600">О!Банк</div>
                <div className="text-lg font-semibold">{reportData.obankPayments.toLocaleString()} сом</div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <Button
            onClick={() => setIsConfirmDialogOpen(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2"
          >
            <Send className="h-4 w-4 mr-2" />
            Отправить в бухгалтерию
          </Button>
        </div>

        {/* Диалог подтверждения */}
        <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Подтверждение отправки</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-gray-600">
                Вы точно хотите отправить отчет в бухгалтерию?
              </p>
              <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm text-yellow-800">
                  После отправки отчет будет сохранен в системе и использован для генерации отчетов.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsConfirmDialogOpen(false)}
              >
                Нет
              </Button>
              <Button
                onClick={handleSubmitReport}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Да
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default DailyCashReport;