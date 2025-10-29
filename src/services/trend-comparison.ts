/**
 * Сервис для сравнения метрик между днями и расчета трендов
 */

export interface DayMetrics {
  dailyIncome: number;
  dailyExpenses: number;
  recordsCount: number;
  netProfit: number;
}

export interface MetricWithTrend {
  current: number;
  previous: number;
  change: number;
  percentChange: number;
  trend: 'up' | 'down' | 'neutral';
}

export interface DashboardMetricsWithTrends {
  dailyIncome: MetricWithTrend;
  dailyExpenses: MetricWithTrend;
  recordsCount: MetricWithTrend;
  netProfit: MetricWithTrend;
}

/**
 * Calculates the trend for a single metric
 */
export function calculateTrend(current: number, previous: number): MetricWithTrend {
  const change = current - previous;
  const percentChange = previous !== 0 ? (change / previous) * 100 : 0;
  
  let trend: 'up' | 'down' | 'neutral';
  if (change > 0) {
    trend = 'up';
  } else if (change < 0) {
    trend = 'down';
  } else {
    trend = 'neutral';
  }

  return {
    current,
    previous,
    change: Math.abs(change),
    percentChange: Math.abs(percentChange),
    trend,
  };
}

/**
 * Compares current day metrics with previous day
 */
export function compareDayMetrics(
  currentMetrics: DayMetrics,
  previousMetrics: DayMetrics
): DashboardMetricsWithTrends {
  return {
    dailyIncome: calculateTrend(currentMetrics.dailyIncome, previousMetrics.dailyIncome),
    dailyExpenses: calculateTrend(currentMetrics.dailyExpenses, previousMetrics.dailyExpenses),
    recordsCount: calculateTrend(currentMetrics.recordsCount, previousMetrics.recordsCount),
    netProfit: calculateTrend(currentMetrics.netProfit, previousMetrics.netProfit),
  };
}

/**
 * Gets the trend description in Russian
 */
export function getTrendDescription(metric: MetricWithTrend, metricName: string): string {
  if (metric.trend === 'neutral') {
    return `${metricName} без изменений`;
  }

  const direction = metric.trend === 'up' ? 'больше' : 'меньше';
  return `${metricName} ${direction} на ${metric.percentChange.toFixed(1)}%`;
}

/**
 * Gets the color for trend indicator
 */
export function getTrendColor(trend: 'up' | 'down' | 'neutral', isPositiveGood: boolean = true): string {
  if (trend === 'neutral') return 'text-gray-500';
  if (isPositiveGood) {
    return trend === 'up' ? 'text-green-600' : 'text-red-600';
  } else {
    return trend === 'up' ? 'text-red-600' : 'text-green-600';
  }
}

/**
 * Gets the background color for trend indicator
 */
export function getTrendBgColor(trend: 'up' | 'down' | 'neutral', isPositiveGood: boolean = true): string {
  if (trend === 'neutral') return 'bg-gray-50';
  if (isPositiveGood) {
    return trend === 'up' ? 'bg-green-50' : 'bg-red-50';
  } else {
    return trend === 'up' ? 'bg-red-50' : 'bg-green-50';
  }
}
