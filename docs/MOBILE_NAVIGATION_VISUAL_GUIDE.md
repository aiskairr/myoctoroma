# Mobile Navigation Visual Guide

## New Mobile Layout Structure

```
┌─────────────────────────────────────────┐
│  📱 MOBILE HEADER (Sticky Top)          │
│  ┌────────┐                             │
│  │ [LOGO] │  Octō CRM    [🌐] [🏢]     │
│  └────────┘                             │
└─────────────────────────────────────────┘
│                                         │
│                                         │
│           PAGE CONTENT                  │
│          (Dashboard, Calendar,          │
│          Clients, Services, etc.)       │
│                                         │
│                                         │
│                                         │
┌─────────────────────────────────────────┐
│  📱 BOTTOM TAB BAR (Fixed Bottom)       │
│  ┌────┐  ┌────┐  ┌────┐  ┌────┐ ┌────┐│
│  │📊│  │👥│  │📅│  │⚙️│ │💰││
│  │Даш│  │Кли│  │КА │  │Нас│ │Бух││
│  └────┘  └────┘  └────┘  └────┘ └────┘│
│                  └─▲─┘                  │
│                    └─ Elevated          │
└─────────────────────────────────────────┘
```

## Bottom Tab Bar Items (Left to Right)

### 1️⃣ Dashboard (Дашборд)
```
┌────────────┐
│     📊     │
│  Dashboard │
└────────────┘
     ↓
/dashboard
```
- Shows overview, statistics
- Quick access to daily data

### 2️⃣ Clients (Клиенты)
```
┌────────────┐
│     👥     │
│  Clients   │
└────────────┘
     ↓
/clients
```
- Client list
- Search & manage clients

### 3️⃣ Calendar (Календарь) ⭐ CENTER
```
┌────────────┐
│     📅     │ ← Larger & Elevated
│  Calendar  │    with gradient
└────────────┘
     ↓
/crm/calendar
```
- Main workspace
- Schedule management
- Most used feature

### 4️⃣ Settings (Настройки)
```
┌────────────┐
│     ⚙️     │
│  Settings  │
└────────────┘
     ↓
┌─────────────────┐
│  MODAL OPENS:   │
├─────────────────┤
│ ⚙️  Settings    │
│ 👤 Masters      │
│ ✨ Services     │
│ ❓ How to Use   │
└─────────────────┘
```
- Slides up from bottom
- 4 navigation options
- Auto-closes on selection

### 5️⃣ Accounting (Бухгалтерия)
```
┌────────────┐
│     💰     │
│ Accounting │
└────────────┘
     ↓
┌─────────────────┐
│  MODAL OPENS:   │
├─────────────────┤
│ 💰 Accounting   │
│ 💵 Salaries     │
│ 🎁 Certificates │
│ 📊 Reports      │
└─────────────────┘
```
- Financial navigation
- Slides up from bottom
- 4 financial sections

## Color Scheme

### Active State
- **Color**: Emerald 400 (`#34d399`)
- **Background**: Emerald 500/20 with border
- **Effect**: Glow shadow

### Inactive State
- **Color**: Slate 400 (`#94a3b8`)
- **Hover**: White with slate 700/50 bg

### Calendar (Center)
- **Active**: Gradient emerald-500 to teal-600
- **Shadow**: Emerald glow
- **Scale**: 110% (larger than others)
- **Position**: -4px margin-top (elevated)

## User Flow Examples

### Opening Settings Modal
```
User taps Settings icon
      ↓
Modal slides up from bottom
      ↓
User sees 4 options:
  - Settings
  - Masters
  - Services  
  - How to Use
      ↓
User taps "Masters"
      ↓
Modal closes
      ↓
Navigates to /crm/masters
```

### Opening Accounting Modal
```
User taps Accounting icon
      ↓
Modal slides up from bottom
      ↓
User sees 4 options:
  - Accounting
  - Salaries
  - Certificates
  - Reports
      ↓
User taps "Salaries"
      ↓
Modal closes
      ↓
Navigates to /salary
```

## Branch Selector (Header)

```
┌──────────────────────────────────┐
│ 🏢 Филиал: Центральный  [▼]    │ ← Click to open
└──────────────────────────────────┘
         ↓
┌──────────────────────────────────┐
│  Select Branch                   │
├──────────────────────────────────┤
│  ○ Центральный (Current)         │
│  ○ Восточный                     │
│  ○ Западный                      │
└──────────────────────────────────┘
```

## Comparison: Before vs After

### BEFORE (Old Mobile Navbar)
```
┌─────────────────────────────────┐
│ [☰] Octō CRM    [🌐] [🏢]      │ ← Top navbar
└─────────────────────────────────┘
│                                 │
│        PAGE CONTENT             │
│                                 │
│  Sidebar Menu (when opened):    │
│  - Dashboard                    │
│  - Clients                      │
│  - Chats ❌                     │
│  - CRM (expanded)               │
│    - Calendar                   │
│    - Masters                    │
│    - Services                   │
│  - Accounting                   │
│  - Salary                       │
│  - Certificates                 │
│  - Settings                     │
```

### AFTER (New Bottom Tab Bar)
```
┌─────────────────────────────────┐
│ [LOGO] Octō CRM  [🌐] [🏢]     │ ← Simple header
└─────────────────────────────────┘
│                                 │
│        PAGE CONTENT             │
│                                 │
┌─────────────────────────────────┐
│ [📊] [👥] [📅] [⚙️] [💰]      │ ← Bottom bar
│ Dash Clie CALE Sett Acco       │
└─────────────────────────────────┘
  Direct access  ↑      Modal menus
```

## Key Improvements

✅ **Thumb-Friendly**: Bottom navigation easier to reach  
✅ **Always Visible**: No need to open menu  
✅ **Clear Priority**: Calendar emphasized in center  
✅ **Organized**: Related items grouped in modals  
✅ **Clean**: Removed chat clutter  
✅ **Fast**: 1-tap access to main features  
✅ **Branch Access**: Always visible in header
