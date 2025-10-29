# Developer Quick Reference - 30-Day Charts Implementation

## TL;DR
✅ All 30-day charts corrected with actual API field names  
✅ New interactive Payment Methods/Banks selector added  
✅ Build passed - ready for production

---

## Chart Field Reference

| Chart | Field Name | API Source | Type | Color |
|-------|-----------|-----------|------|-------|
| **Income** | `totalRevenue` | `report.total_revenue` | Line | 🔵 Blue |
| **Expenses** | `pettyExpenses` | `report.petty_expenses` | Area | 🔴 Red |
| **Profit** | `totalIncome` | `report.total_income` | Area | 🟣 Purple |

---

## Payment Methods / Banks Chart

### State Control
```typescript
selectedPaymentChart: 'payments' | 'banks'  // Defaults to 'payments'
```

### Payment Methods View (4 Areas)
| Field | API Source | Color | Label |
|-------|-----------|-------|-------|
| `cashPayments` | `report.cash_payments` | 🔵 Blue | Наличные |
| `cardPayments` | `report.card_payments` | 🔴 Red | Карта |
| `transferPayments` | `report.transfer_payments` | 🟣 Purple | Перевод |
| `giftCertificatePayments` | `report.gift_certificate_payments` | 🟠 Amber | Подарок |

### Banks View (6 Areas)
| Field | API Source | Color | Label |
|-------|-----------|-------|-------|
| `optimaPayments` | `report.optima_payments` | 🔵 Blue | Optima |
| `mbankPayments` | `report.mbank_payments` | 🔴 Red | M-Bank |
| `mbusinessPayments` | `report.mbusiness_payments` | 🟣 Purple | M-Business |
| `demirPayments` | `report.demir_payments` | 🟠 Amber | Demir |
| `bakaiPayments` | `report.bakai_payments` | 🔷 Cyan | Bakai |
| `obankPayments` | `report.obank_payments` | 🟢 Green | O!Bank |

---

## Code Locations

### Dashboard Charts Section
**File**: `src/pages/Dashboard.tsx`

```
Lines 884-1421    → 30-Day Analytics Charts Section
Lines 905-945     → Income Chart (Line) ✅ Uses totalRevenue
Lines 952-1020    → Expenses Chart (Area) ✅ Uses pettyExpenses
Lines 1025-1210   → Payment/Banks Chart (Selector + Stacked Areas) ✅
Lines 1233-1290   → Profit Chart (Area) ✅ Uses totalIncome
```

### State Management
**File**: `src/pages/Dashboard.tsx`

```
Lines 115-125     → State variables
Line 121          → selectedPaymentChart state
```

### Data Service
**File**: `src/services/daily-analytics.ts`

```
DailyMetric interface    → All field definitions ✅
fetch30DayAnalytics()    → API fetching + mapping ✅
convertToChartData()     → Data transformation ✅
calculateAggregateStats()→ Aggregation logic ✅
fillMissingDays()        → Data filling ✅
```

---

## How It Works

### 1. Data Flow
```
API (/api/daily-cash-reports)
  ↓
fetch30DayAnalytics()
  ↓
convertToChartData()
  ↓
chartData state (Dashboard)
  ↓
{selectedPaymentChart ? "Render Payments" : "Render Banks"}
  ↓
User sees chart
```

### 2. User Interaction
```
User clicks dropdown
  ↓
setSelectedPaymentChart('banks' or 'payments')
  ↓
Component re-renders
  ↓
AreaChart shows different data fields
  ↓
Chart animation updates
```

### 3. State Dependency
```
chartData (from API)
  ↓ 
used by 4 chart components:
├─ Income chart (uses totalRevenue)
├─ Expenses chart (uses pettyExpenses)
├─ Payment/Banks chart (uses payment or bank fields)
└─ Profit chart (uses totalIncome)
```

---

## Common Tasks

### Add a New Payment Method
1. Ensure API includes new field: `report.new_payment_field`
2. Update `DailyMetric` interface in `daily-analytics.ts`
3. Add mapping in `fetch30DayAnalytics()`: `newPaymentField: Number(report.new_payment_field)`
4. Add `<Area>` component in payments section (Dashboard.tsx, lines ~1115)
5. Test build: `npm run build`

### Add a New Bank
1. Ensure API includes new field: `report.new_bank_field`
2. Update `DailyMetric` interface in `daily-analytics.ts`
3. Add mapping in `fetch30DayAnalytics()`: `newBankField: Number(report.new_bank_field)`
4. Add `<Area>` component in banks section (Dashboard.tsx, lines ~1145)
5. Test build: `npm run build`

### Change Chart Type
```tsx
// From Stacked Area to Stacked Bar
- <AreaChart data={chartData}>
+ <BarChart data={chartData}>
  
  // Keep all the Area components, just change to Bar
- <Area dataKey="cashPayments" stackId="1" ... />
+ <Bar dataKey="cashPayments" stackId="1" ... />
```

### Update Colors
```tsx
<Area 
  dataKey="cashPayments"
  stroke="#3b82f6"      // ← Line color
  fill="#3b82f6"        // ← Fill color
  ...
/>
```

---

## Testing Checklist

### Build Test
```bash
npm run build
# Should complete in ~10 seconds with 0 errors
```

### Visual Verification
- [ ] Income chart shows blue line
- [ ] Expenses chart shows red area
- [ ] Profit chart shows purple area
- [ ] Payment/Banks chart shows stacked areas
- [ ] Dropdown selector visible in chart header
- [ ] Clicking dropdown switches between views instantly
- [ ] Legend displays correct payment method/bank names
- [ ] Tooltips show values with "сом" currency
- [ ] Loading spinner appears while loading
- [ ] Error message appears if API fails
- [ ] "No data" message appears if data is empty

### Responsive Test
- [ ] Charts responsive on desktop
- [ ] Charts responsive on tablet
- [ ] Charts responsive on mobile
- [ ] Legend readable on all sizes
- [ ] Dropdown accessible on all sizes

### Data Validation
- [ ] Charts match API data values
- [ ] Trend lines correct
- [ ] Stacked areas sum correctly
- [ ] Missing days handled (filled with 0)
- [ ] Negative values display correctly

---

## Debugging Tips

### Chart Shows No Data
1. Check if `chartData` state is populated
2. Verify API is returning data
3. Check browser console for errors
4. Verify field names match API response

### Chart Shows Wrong Data
1. Check field name in `dataKey`
2. Verify `fetch30DayAnalytics()` mapping is correct
3. Check if data transformation is working (add console.log)
4. Verify DailyMetric interface has the field

### Dropdown Not Working
1. Verify `selectedPaymentChart` state exists
2. Check if `onValueChange` handler is connected
3. Verify conditional rendering logic
4. Check browser console for React errors

### Build Fails
1. Run `npm run build` to see exact error
2. Check file syntax (missing braces, commas)
3. Verify imports are correct
4. Check TypeScript types match field names

---

## Performance Notes

### Current Optimization
- React Query caches data
- Charts only render when data available
- Stacked area charts are GPU-friendly
- 30-day limit prevents excessive data

### Future Optimization Ideas
- Add date range selector to reduce data
- Implement data aggregation
- Use canvas-based rendering for large datasets
- Add virtualization for very long datasets

---

## Type Definitions

### DailyMetric (from daily-analytics.ts)
```typescript
interface DailyMetric {
  // Main metrics
  date: string;
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
```

### ChartDataPoint (from daily-analytics.ts)
```typescript
interface ChartDataPoint extends DailyMetric {
  // Inherits all DailyMetric fields
}
```

---

## API Endpoint

### Request
```
GET /api/daily-cash-reports
  ?startDate=2024-01-01
  &endDate=2024-01-30
  &branchId=1
```

### Response (per item)
```json
{
  "date": "2024-01-15",
  "total_revenue": "50000",
  "petty_expenses": "5000",
  "total_income": "45000",
  "cash_payments": "30000",
  "card_payments": "15000",
  "transfer_payments": "3000",
  "gift_certificate_payments": "2000",
  "optima_payments": "10000",
  "mbank_payments": "8000",
  "mbusiness_payments": "5000",
  "demir_payments": "4000",
  "bakai_payments": "3000",
  "obank_payments": "0"
}
```

---

## Contact & Questions

For issues or questions about the implementation:
1. Check the 30-day chart documentation files
2. Review TypeScript types for field definitions
3. Verify API response matches expected format
4. Check browser console for specific errors
5. Review git history for recent changes

---

## Version Info
- **Implementation Date**: 2024
- **React Version**: 18+
- **TypeScript**: Strict mode
- **React Query**: v5+
- **Recharts**: Latest
- **Build Status**: ✅ Production Ready

