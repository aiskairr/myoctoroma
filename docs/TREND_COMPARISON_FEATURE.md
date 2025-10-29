# Trend Comparison Feature - Dashboard & Accounting Pages

## Overview
Day-over-day trend comparison feature shows financial metric changes with visual indicators (up/down arrows) on Dashboard and Accounting pages.

## Implementation

### New Files Created

#### 1. `src/services/trend-comparison.ts`
Service for calculating and formatting day-over-day metric trends.

**Key Interfaces:**
- `DayMetrics` - Current metrics: dailyIncome, dailyExpenses, recordsCount, netProfit
- `MetricWithTrend` - Metrics with trends: current, previous, change, percentChange, trend
- `DashboardMetricsWithTrends` - All metrics with trends

**Key Functions:**
- `calculateTrend(current, previous)` - Returns MetricWithTrend with percentage change
- `compareDayMetrics(currentMetrics, previousMetrics)` - Compares all 4 metrics at once
- `getTrendColor(trend, isPositiveGood)` - Returns text color (green/red based on direction)
- `getTrendBgColor(trend, isPositiveGood)` - Returns background color for badge
- `getTrendDescription(trend)` - Returns Russian description (вверх/вниз/стабильно)

**Trend Logic:**
- Green for positive trends on income/profit metrics
- Red for positive trends on expense metrics (lower is better)
- Shows percentage change and previous day value

#### 2. `src/components/MetricCardWithTrend.tsx`
React component for displaying metrics with trend indicators.

**Props:**
- `title` - Metric title (string)
- `value` - Current metric value (number)
- `metric` - MetricWithTrend object with trend data
- `icon` - React icon component
- `bgGradient` - Tailwind background gradient class
- `borderColor` - Tailwind border color class
- `isPositiveGood` - Whether trend up is positive (default: true)
- `format` - 'currency' or 'count' formatting

**Features:**
- Displays current value with trend percentage badge
- Shows trend direction (up/down/neutral arrow)
- Shows "↑ вчера было [value]" with comparison text
- Smart coloring based on metric type and trend direction

### Modified Files

#### 1. `src/pages/Dashboard.tsx`
- Added imports for trend comparison service and component
- Added state for previous day data and trends (3 new useState calls)
- Added `previousDayAccountingStatsQuery` to fetch yesterday's metrics
- Added useEffect to parse previous day data
- Added useEffect to calculate trends when both days' data available
- Replaced 4 metric cards with MetricCardWithTrend components

**Key Changes:**
```typescript
// New state
const [previousDailyAccountingStats, setPreviousDailyAccountingStats] = useState({...});
const [previousDailyCashData, setPreviousDailyCashData] = useState({...});
const [metricsWithTrends, setMetricsWithTrends] = useState<DashboardMetricsWithTrends | null>(null);

// New query for previous day
const previousDayAccountingStatsQuery = useQuery({
  queryKey: [`${BACKEND_URL}/api/statistics/accounting-previous`, currentBranch?.id],
  // Fetches yesterday's data same as current day
});

// Calculate trends when data available
const trends = compareDayMetrics(currentMetrics, previousMetrics);
setMetricsWithTrends(trends);

// Use in component
<MetricCardWithTrend
  title={t('dashboard.daily_income')}
  value={dailyCashData?.dailyIncome || 0}
  metric={metricsWithTrends.dailyIncome}
  icon={<DollarSign />}
  isPositiveGood={true}
  format="currency"
/>
```

#### 2. `src/pages/AccountingPage.tsx`
- Added same imports for trend comparison
- Added state for previous day data and trends (4 new useState calls)
- Added `fetchPreviousDayAccountingStatistics()` function
- Updated `fetchData()` to include previous day fetch in Promise.all
- Added useEffect to calculate trends
- Replaced 4 metric cards with MetricCardWithTrend components

**Key Changes:**
- Similar to Dashboard but uses local fetch functions instead of React Query
- Both pages now consistently show day-over-day trends

## Data Flow

### Dashboard Flow
```
1. App Loads
   ↓
2. accountingStatsQuery fetches today's data → setDailyCashData, setDailyAccountingStats
   previousDayAccountingStatsQuery fetches yesterday's data → setPreviousDailyCashData, setPreviousDailyAccountingStats
   ↓
3. useEffect calculates trends → compareDayMetrics() → setMetricsWithTrends
   ↓
4. Component renders MetricCardWithTrend with:
   - Current value
   - Previous day value
   - Trend direction (up/down/neutral)
   - Percentage change (colored badge)
   - Trend description in Russian
```

### Accounting Page Flow
Similar to Dashboard but using `fetchData()` with async/await pattern.

## API Endpoints Used

- `/api/statistics/accounting/{dateString}/{dateString}?branchId={id}` - Current day metrics
- `/api/statistics/accounting/{yesterdayString}/{yesterdayString}?branchId={id}` - Previous day metrics

Both endpoints return: `{ success: true, data: [income, expenses, recordsCount, netProfit] }`

## Metrics Displayed

1. **Daily Income** (Доходы за день)
   - Icon: DollarSign (blue)
   - Format: Currency
   - isPositiveGood: true (higher is better)
   - Comparison: Shows if income increased ↑ or decreased ↓

2. **Daily Expenses** (Расходы за день)
   - Icon: TrendingUp (red)
   - Format: Currency
   - isPositiveGood: false (lower is better)
   - Comparison: Shows if expenses decreased ↓ or increased ↑ (inverted logic)

3. **Daily Records** (Записей за день)
   - Icon: Activity/Users (green)
   - Format: Count
   - isPositiveGood: true (more records is better)
   - Comparison: Shows if records increased ↑ or decreased ↓

4. **Net Profit** (Прибыль)
   - Icon: FileText/TrendingUp (purple)
   - Format: Currency
   - isPositiveGood: true (higher is better)
   - Comparison: Shows if profit increased ↑ or decreased ↓

## Color Scheme

### For Income/Profit Metrics (isPositiveGood: true)
- **Trend Up**: Green text, green background → "Хорошо" (Good)
- **Trend Down**: Red text, red background → "Плохо" (Bad)
- **No Change**: Gray text, gray background → "Стабильно" (Stable)

### For Expense Metrics (isPositiveGood: false)
- **Trend Down**: Green text, green background → "Хорошо" (Good - less spent)
- **Trend Up**: Red text, red background → "Плохо" (Bad - more spent)
- **No Change**: Gray text, gray background → "Стабильно" (Stable)

## Testing Checklist

- [ ] Dashboard loads with previous day data
- [ ] Trends calculate correctly (up/down/neutral)
- [ ] Percentage changes display accurately
- [ ] Colors match metric type (green for income up, red for expenses up)
- [ ] Previous day value shows in comparison text
- [ ] Works with different selected dates on Accounting page
- [ ] Mobile responsive (grid layout adapts)
- [ ] Loading states handled properly (trends shown when data available)
- [ ] Both current and previous day have data before rendering cards

## Performance Considerations

1. **Parallel Queries**: Both Dashboard and Accounting fetch current and previous day metrics in parallel
2. **Trend Calculation**: Only computed when both datasets are ready
3. **Memoization**: MetricCardWithTrend should memoize if used in large lists
4. **Re-renders**: trends calculated once per day change via useEffect dependency

## Future Enhancements

1. Add weekly/monthly trend comparison
2. Add trend sparklines showing last 7 days
3. Add alerts for significant metric changes
4. Export comparison reports
5. Configurable trend thresholds for alerts
