# 30-Day Analytics Charts Feature

## Overview
Added comprehensive 30-day analytics charts to the Dashboard showing income, expenses, records count, and profit trends over the last 30 days.

## Changes Made

### 1. New Service: `src/services/daily-analytics.ts`
Fetches and processes daily report data for 30-day analysis.

**Key Functions:**
- `fetch30DayAnalytics(branchId, backendUrl, endDate?)` - Fetches 30 days of data from `/api/daily-cash-reports`
- `convertToChartData(metrics)` - Transforms data to Recharts format
- `calculateAggregateStats(metrics)` - Calculates summary statistics
- `fillMissingDays(metrics, days)` - Fills gaps with zero data for missing days

**Interfaces:**
- `DailyMetric` - Single day's metrics
- `DailyAnalyticsData` - Complete 30-day data with date range
- `ChartDataPoint` - Chart-ready data format

### 2. Updated Dashboard: `src/pages/Dashboard.tsx`
**Changes:**
- Expanded metric cards to full width (changed grid from `lg:grid-cols-4` to single column)
- Added state for 30-day analytics data:
  - `analyticsData` - Raw analytics data
  - `chartData` - Chart-formatted data
  - `is30DayLoading` - Loading state
  - `is30DayError` - Error state

- Added `useEffect` to fetch 30-day data on component mount
- Added 4 new chart cards (2x2 grid on larger screens):
  - Income Chart (Line chart, blue)
  - Expenses Chart (Area chart, red)
  - Records Chart (Bar chart, green)
  - Profit Chart (Area chart, purple)

### 3. Chart Specifications

#### Income Chart (Доходы за 30 дней)
- Type: Line Chart
- Color: Blue (#3b82f6)
- Data: Total daily revenue
- Shows trend of income over 30 days

#### Expenses Chart (Расходы за 30 дней)
- Type: Area Chart (with gradient)
- Color: Red (#ef4444)
- Data: Petty expenses daily
- Shows trend of expenses over 30 days

#### Records Chart (Записи за 30 дней)
- Type: Bar Chart
- Color: Green (#10b981)
- Data: Daily service records count
- Shows number of procedures per day

#### Profit Chart (Прибыль за 30 дней)
- Type: Area Chart (with gradient)
- Color: Purple (#8b5cf6)
- Data: Daily net profit (income - expenses)
- Shows profitability trend

### 4. API Integration
Uses the same endpoint as the Отчеты (Reports) page:
```
GET /api/daily-cash-reports?startDate={YYYY-MM-DD}&endDate={YYYY-MM-DD}&branchId={branchId}
```

Expected response format:
```json
[
  {
    "date": "2025-10-29",
    "total_revenue": 6200,
    "petty_expenses": 800,
    "total_income": 5400,
    "records_count": 2,
    ...
  }
]
```

## Layout Changes

### Before
```
Metric Cards (4 columns):
- Income
- Expenses
- Records
- Profit

Charts Section:
- Services Distribution
- Masters Stats
```

### After
```
Metric Cards (full width):
- Income
- Expenses
- Records  
- Profit

30-Day Analytics Charts (2x2 grid):
- Income Trend (Line)
- Expenses Trend (Area)
- Records Trend (Bar)
- Profit Trend (Area)

Charts Section:
- Services Distribution
- Masters Stats
```

## Data Processing

1. **Fetching**: Fetches last 30 days from API when branch ID is available
2. **Filling**: Fills missing days with zero values for continuous timeline
3. **Converting**: Transforms to Recharts format
4. **Displaying**: Shows in responsive grid (1 column mobile, 2 columns tablet+)

## Error Handling

Each chart has built-in error handling:
- Loading spinner while fetching
- Error message if fetch fails
- "No data" message if response is empty

## Performance

- Queries use parallel fetch with same endpoint as Reports page
- Data processed once on load via useEffect
- Charts memoized by Recharts for optimal rendering
- Responsive grid adapts to screen size

## Mobile Responsiveness

- **Mobile**: Single column layout (1 chart per row)
- **Tablet**: 2 columns (2x2 grid)
- **Desktop**: 2 columns (2x2 grid)

## Future Enhancements

1. Add date range selector (not just last 30 days)
2. Add comparison mode (month-over-month, year-over-year)
3. Add data export functionality
4. Add chart customization options
5. Add drill-down to daily details
6. Add trend indicators (up/down from previous period)
7. Add moving average lines
8. Add anomaly detection highlighting

## Testing Checklist

- [x] Build passes without errors
- [ ] Charts render on Dashboard load
- [ ] Charts update when branch changes
- [ ] Responsive layout works on mobile
- [ ] Error handling works when API fails
- [ ] Loading states display correctly
- [ ] Tooltip shows correct values
- [ ] Animations are smooth
- [ ] Missing days filled with zeros
- [ ] Data matches Reports page calculations

## Build Status
✅ Successfully compiled - No new errors introduced
