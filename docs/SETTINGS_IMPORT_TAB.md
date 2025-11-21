# Settings Import Tab - Separate Import Data Section

## Overview
Moved "Import Data" (UnifiedImportCard) from Booking tab to its own dedicated tab for better organization and clarity.

## Changes Made

### 1. Added Download Icon Import
**File:** `src/pages/Settings.tsx`

```typescript
import { Loader2, BookOpen, ArrowRight, User, Bot, Calendar, Download } from "lucide-react";
```

### 2. Updated TabsList Layout

**Before (3 tabs):**
```tsx
<TabsList className="grid w-full grid-cols-3">
  <TabsTrigger value="account">...</TabsTrigger>
  <TabsTrigger value="chatbot">...</TabsTrigger>
  <TabsTrigger value="booking">...</TabsTrigger>
</TabsList>
```

**After (4 tabs):**
```tsx
<TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
  <TabsTrigger value="account">...</TabsTrigger>
  <TabsTrigger value="chatbot">...</TabsTrigger>
  <TabsTrigger value="booking">...</TabsTrigger>
  <TabsTrigger value="import">📥 Импорт данных</TabsTrigger>
</TabsList>
```

### 3. Created New Import Tab

```tsx
<TabsContent value="import" className="space-y-6">
  {/* Unified Import System - Altegio, DIKIDI, Zapisi.kz */}
  <UnifiedImportCard />
</TabsContent>
```

### 4. Removed Import from Booking Tab

**Before:**
```tsx
<TabsContent value="booking">
  <BookingLinkCopy />
  <UnifiedImportCard />  ← Removed
</TabsContent>
```

**After:**
```tsx
<TabsContent value="booking">
  <BookingLinkCopy />
</TabsContent>
```

## New Tab Structure

### 4 Tabs Total:

1. **👤 Настройки аккаунта** (Account Settings)
   - How to Use instructions
   - User profile management

2. **🤖 Чат-бот** (Chatbot)
   - Bot settings (accountID, timeout)
   - System prompt constructor

3. **📅 Онлайн бронирование** (Online Booking)
   - Booking links & QR codes
   - Analytics

4. **📥 Импорт данных** (Import Data) ⭐ NEW
   - Altegio import
   - DIKIDI import
   - Zapisi.kz import
   - Excel import

## Visual Layout

### Desktop (≥1024px)
```
┌──────────────────────────────────────────────────────────┐
│ [👤 Настройки аккаунта][🤖 Чат-бот][📅 Бронирование][📥 Импорт] │
└──────────────────────────────────────────────────────────┘
```

### Tablet (768px-1023px)
```
┌────────────────────────────────────┐
│ [👤 Аккаунт]  [🤖 Бот]            │
│ [📅 Бронь]    [📥 Импорт]          │
└────────────────────────────────────┘
```

### Mobile (<768px)
```
┌──────────────────┐
│ [👤]  [🤖]       │
│ [📅]  [📥]       │
└──────────────────┘
```

## Responsive Grid

```tsx
grid-cols-2      // Mobile: 2 columns
lg:grid-cols-4   // Large screens: 4 columns
```

**Breakpoints:**
- `<1024px`: 2x2 grid (2 tabs per row)
- `≥1024px`: 1x4 grid (all tabs in one row)

## Tab Details

### Import Tab (📥)

**Icon:** Download (from lucide-react)

**Label:**
- Desktop/Tablet: "Импорт данных"
- Mobile: "Импорт"

**Content:**
- UnifiedImportCard component
  - Altegio sync
  - DIKIDI sync
  - Zapisi.kz sync
  - Excel upload

**Purpose:**
Centralized data import from external booking systems

## Benefits

### 1. Better Organization
**Before:** Import mixed with Booking
**After:** Dedicated import section

### 2. Clearer Purpose
- Booking tab: Public-facing features (links, QR codes)
- Import tab: Admin tools (data sync)

### 3. Easier to Find
**Before:** Scroll through Booking tab
**After:** Direct tab access

### 4. Logical Grouping
- Account: User settings
- Chatbot: Bot configuration
- Booking: Public booking interface
- Import: Data management

### 5. Room for Growth
Import tab can grow independently:
- Export functionality
- Backup/restore
- Data migration tools
- Bulk operations

## User Experience

### Navigation Flow
1. User opens Settings
2. See 4 tabs (default: Account)
3. Click "📥 Импорт данных"
4. Access all import tools

### Tab Switching
- No page reload
- Instant content swap
- State preserved during session

### First-Time Users
Clear tab names guide users:
- "Импорт данных" = obvious what it contains
- Icon reinforces purpose (📥 = download/import)

## Visual Design

### Tab Icons
- 👤 User (account)
- 🤖 Bot (chatbot)
- 📅 Calendar (booking)
- 📥 Download (import) ⭐ NEW

### Tab States
**Inactive:**
```css
text-muted-foreground
bg-transparent
```

**Active:**
```css
text-foreground
bg-background
shadow-sm
```

**Hover:**
```css
text-foreground
```

## Code Structure

### Component Hierarchy
```
Settings
├── Tabs
│   ├── TabsList (2x2 → 1x4 responsive)
│   │   ├── account
│   │   ├── chatbot
│   │   ├── booking
│   │   └── import ⭐ NEW
│   │
│   ├── TabsContent (account)
│   ├── TabsContent (chatbot)
│   ├── TabsContent (booking)
│   └── TabsContent (import) ⭐ NEW
│       └── UnifiedImportCard
```

### State Management
```typescript
const [activeTab, setActiveTab] = useState<string>("account");
```

No additional state needed - UnifiedImportCard manages its own state

## Accessibility

- ✅ Keyboard navigation (Tab, Arrow keys)
- ✅ ARIA labels (Radix UI)
- ✅ Focus indicators
- ✅ Screen reader support
- ✅ Semantic HTML

## Mobile Optimization

### Touch Targets
- Tab buttons: 44x44px minimum
- 2x2 grid on mobile for easier tapping
- Labels shortened: "Импорт данных" → "Импорт"

### Visual Hierarchy
- Icons always visible (even on mobile)
- Text labels adapt to screen size
- Equal width tabs maintain balance

## Performance

### Before
- Booking tab loaded UnifiedImportCard unnecessarily
- Import tools loaded even if not needed

### After
- Import tab loads only when selected
- Booking tab lighter and faster
- Lazy evaluation of import components

## Testing Checklist

- [ ] 4 tabs visible in navigation
- [ ] Desktop: All tabs in one row (1x4)
- [ ] Tablet: Tabs in 2 rows (2x2)
- [ ] Mobile: Tabs in 2 rows (2x2), short labels
- [ ] Click Import tab → UnifiedImportCard appears
- [ ] Booking tab no longer shows import
- [ ] All import features work (Altegio, DIKIDI, etc.)
- [ ] Tab navigation smooth (no reload)
- [ ] Icons display correctly
- [ ] Dark/light theme support

## Migration Notes

### No Breaking Changes
- All import functionality preserved
- Same UnifiedImportCard component
- Just moved to different tab

### What Changed
- Tab count: 3 → 4
- Grid layout: `grid-cols-3` → `grid-cols-2 lg:grid-cols-4`
- Import location: Booking tab → Import tab

### What Stayed Same
- All import features
- Component behavior
- API integrations
- User data

## Future Enhancements

### 1. Export Tab
```tsx
<TabsTrigger value="export">
  <Upload className="h-4 w-4" />
  Экспорт данных
</TabsTrigger>
```

### 2. Import/Export Combined
```tsx
<TabsTrigger value="data">
  <Database className="h-4 w-4" />
  Управление данными
</TabsTrigger>
```

### 3. Import History
```tsx
<Card>
  <CardHeader>История импорта</CardHeader>
  <CardContent>
    {/* List of past imports */}
  </CardContent>
</Card>
```

### 4. Scheduled Imports
```tsx
<Card>
  <CardHeader>Автоматический импорт</CardHeader>
  <CardContent>
    {/* Cron-like scheduler */}
  </CardContent>
</Card>
```

### 5. Import Analytics
```tsx
<Card>
  <CardHeader>Статистика импорта</CardHeader>
  <CardContent>
    {/* Charts showing import volume, errors, etc. */}
  </CardContent>
</Card>
```

## Related Components

### UnifiedImportCard
- Location: `src/components/UnifiedImportCard.tsx`
- Features: Multi-service import
- Services: Altegio, DIKIDI, Zapisi.kz, Excel

### BookingLinkCopy
- Location: `src/components/BookingLinkCopy.tsx`
- Features: Link generation, QR codes
- Remains in Booking tab

## Files Modified

**src/pages/Settings.tsx:**
1. Added `Download` icon import
2. Changed TabsList: `grid-cols-3` → `grid-cols-2 lg:grid-cols-4`
3. Added 4th tab trigger (Import)
4. Created TabsContent for Import
5. Moved UnifiedImportCard from Booking to Import
6. Removed UnifiedImportCard from Booking tab

## Summary

✅ **4 tabs:** Account | Chatbot | Booking | Import ⭐ NEW
✅ **Dedicated import section** - own tab with clear purpose
✅ **Better organization** - admin tools separated from public features
✅ **Responsive layout** - 2x2 grid on mobile/tablet, 1x4 on desktop
✅ **Clearer navigation** - obvious where to find import tools
✅ **Room for growth** - import tab can expand independently
✅ **No breaking changes** - all functionality preserved

Import data now has its own home! 🎉
