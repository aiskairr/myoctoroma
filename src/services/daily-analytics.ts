import { subDays, format } from 'date-fns';

export interface DailyMetric {
  date: string; // YYYY-MM-DD
  totalRevenue: number;
  pettyExpenses: number;
  totalIncome: number;
  // Payment methods
  cashPayments: number;
  cardPayments: number;
  transferPayments: number;
  giftCertificatePayments: number;
  // Banks
  optimaPayments: number;
  mbankPayments: number;
  mbusinessPayments: number;
  demirPayments: number;
  bakaiPayments: number;
  obankPayments: number;
}

export interface DailyAnalyticsData {
  metrics: DailyMetric[];
  totalDays: number;
  dateRange: {
    start: string;
    end: string;
  };
}

export interface ChartDataPoint {
  date: string;
  totalRevenue?: number;
  pettyExpenses?: number;
  totalIncome?: number;
  cashPayments?: number;
  cardPayments?: number;
  transferPayments?: number;
  giftCertificatePayments?: number;
  optimaPayments?: number;
  mbankPayments?: number;
  mbusinessPayments?: number;
  demirPayments?: number;
  bakaiPayments?: number;
  obankPayments?: number;
}

/**
 * Fetches daily accounting statistics for the last 30 days
 * Uses the same endpoint as the Отчеты page
 */
export async function fetch30DayAnalytics(
  branchId: string,
  backendUrl: string,
  endDate?: Date
): Promise<DailyAnalyticsData> {
  try {
    const today = endDate || new Date();
    const thirtyDaysAgo = subDays(today, 29); // 30 days including today

    const startDateStr = format(thirtyDaysAgo, 'yyyy-MM-dd');
    const endDateStr = format(today, 'yyyy-MM-dd');

    console.log(`Fetching 30-day analytics from ${startDateStr} to ${endDateStr}`);

    // This is the same endpoint used in the Отчеты page
    const url = `${backendUrl}/api/daily-cash-reports?startDate=${startDateStr}&endDate=${endDateStr}&branchId=${branchId}`;
    
    const response = await fetch(url, {
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch daily analytics: ${response.status}`);
    }

    const reports = await response.json();
    console.log('Daily analytics response:', reports);

    // Transform API response to our format
    const metrics: DailyMetric[] = (reports || []).map((report: any) => {
      const dateStr = report.date ? new Date(report.date).toISOString().split('T')[0] : 'Unknown';
      return {
        date: dateStr,
        totalRevenue: Number(report.total_revenue) || 0,
        pettyExpenses: Number(report.petty_expenses) || 0,
        totalIncome: Number(report.total_income) || 0,
        // Payment methods
        cashPayments: Number(report.cash_payments) || 0,
        cardPayments: Number(report.card_payments) || 0,
        transferPayments: Number(report.transfer_payments) || 0,
        giftCertificatePayments: Number(report.gift_certificate_payments) || 0,
        // Banks
        optimaPayments: Number(report.optima_payments) || 0,
        mbankPayments: Number(report.mbank_payments) || 0,
        mbusinessPayments: Number(report.mbusiness_payments) || 0,
        demirPayments: Number(report.demir_payments) || 0,
        bakaiPayments: Number(report.bakai_payments) || 0,
        obankPayments: Number(report.obank_payments) || 0,
      };
    });

    // Sort by date ascending
    metrics.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
      metrics,
      totalDays: metrics.length,
      dateRange: {
        start: startDateStr,
        end: endDateStr,
      }
    };
  } catch (error) {
    console.error('Error fetching 30-day analytics:', error);
    throw error;
  }
}

/**
 * Converts daily metrics to chart data format
 * Creates separate arrays for each metric type or combined data
 */
export function convertToChartData(metrics: DailyMetric[]): ChartDataPoint[] {
  return metrics.map(metric => ({
    date: metric.date,
    totalRevenue: metric.totalRevenue,
    pettyExpenses: metric.pettyExpenses,
    totalIncome: metric.totalIncome,
    cashPayments: metric.cashPayments,
    cardPayments: metric.cardPayments,
    transferPayments: metric.transferPayments,
    giftCertificatePayments: metric.giftCertificatePayments,
    optimaPayments: metric.optimaPayments,
    mbankPayments: metric.mbankPayments,
    mbusinessPayments: metric.mbusinessPayments,
    demirPayments: metric.demirPayments,
    bakaiPayments: metric.bakaiPayments,
    obankPayments: metric.obankPayments,
  }));
}

/**
 * Calculates aggregated statistics for 30 days
 */
export function calculateAggregateStats(metrics: DailyMetric[]) {
  if (metrics.length === 0) {
    return {
      totalRevenue: 0,
      totalExpenses: 0,
      totalIncome: 0,
      averageDailyRevenue: 0,
      averageDailyExpenses: 0,
      averageDailyIncome: 0,
      maxRevenue: 0,
      minRevenue: 0,
      maxExpenses: 0,
      minExpenses: 0,
    };
  }

  const totalRevenue = metrics.reduce((sum, m) => sum + m.totalRevenue, 0);
  const totalExpenses = metrics.reduce((sum, m) => sum + m.pettyExpenses, 0);
  const totalIncome = metrics.reduce((sum, m) => sum + m.totalIncome, 0);

  const revenues = metrics.map(m => m.totalRevenue);
  const expenses = metrics.map(m => m.pettyExpenses);

  return {
    totalRevenue,
    totalExpenses,
    totalIncome,
    averageDailyRevenue: Math.round(totalRevenue / metrics.length),
    averageDailyExpenses: Math.round(totalExpenses / metrics.length),
    averageDailyIncome: Math.round(totalIncome / metrics.length),
    maxRevenue: Math.max(...revenues),
    minRevenue: Math.min(...revenues),
    maxExpenses: Math.max(...expenses),
    minExpenses: Math.min(...expenses),
  };
}

/**
 * Fills gaps in data for missing days (if any)
 * Returns data for exactly 30 days
 */
export function fillMissingDays(metrics: DailyMetric[], days: number = 30): DailyMetric[] {
  if (metrics.length === 0) return [];

  const filled: DailyMetric[] = [];
  const today = new Date();
  const startDate = subDays(today, days - 1);

  for (let i = 0; i < days; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + i);
    const dateStr = format(currentDate, 'yyyy-MM-dd');

    const existing = metrics.find(m => m.date === dateStr);
    if (existing) {
      filled.push(existing);
    } else {
      // Add zero data for missing days
      filled.push({
        date: dateStr,
        totalRevenue: 0,
        pettyExpenses: 0,
        totalIncome: 0,
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
    }
  }

  return filled;
}
