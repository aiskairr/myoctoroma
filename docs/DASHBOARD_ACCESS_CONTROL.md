# Dashboard Access Control Update

## Overview
Updated Dashboard page access control to allow both admin and superadmin roles while blocking reception role.

## Changes Made

### File: `src/pages/Dashboard.tsx`

**Before:**
```tsx
// Проверка доступа только для суперадминов
if (user && user.role !== 'superadmin') {
  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-600 font-semibold">
          {t('dashboard.access_denied')}
        </div>
      </div>
    </div>
  );
}
```

**After:**
```tsx
// Проверка доступа: разрешено для admin и superadmin, запрещено для reception
if (user && user.role !== 'admin' && user.role !== 'superadmin') {
  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-600 font-semibold">
          {t('dashboard.access_denied')}
        </div>
      </div>
    </div>
  );
}
```

## Access Control Logic

### Allowed Roles:
- ✅ `admin` - Full access to Dashboard for selected branch
- ✅ `superadmin` - Full access to Dashboard for selected branch

### Blocked Roles:
- ❌ `reception` - Access denied, shows error message
- ❌ Any other roles - Access denied, shows error message

### Special Cases:
- **Master role**: Automatically redirected to `/master/calendar` (existing behavior)
- **No branch selected**: Dashboard will show data for all branches (existing behavior)
- **Branch selected**: Dashboard shows data for selected branch only (existing behavior)

## Implementation Details

1. **Role Check**: Uses `user.role` from `SimpleAuthContext`
2. **Access Control**: Checks if role is NOT admin AND NOT superadmin
3. **Error Display**: Shows localized error message using `t('dashboard.access_denied')`
4. **Branch Context**: Works with `useBranch()` hook for multi-branch support

## Testing Recommendations

1. Test with `admin` role - should see Dashboard with branch data
2. Test with `superadmin` role - should see Dashboard with branch data  
3. Test with `reception` role - should see "Access Denied" message
4. Test branch switching - Dashboard should update with new branch data
5. Test master role - should redirect to master calendar

## Build Status

✅ Build successful: 14.00s, 2,655.41 KB bundle

## Related Files
- `src/contexts/SimpleAuthContext.tsx` - User authentication and role management
- `src/contexts/BranchContext.tsx` - Branch selection context
- `src/pages/Dashboard.tsx` - Main dashboard component with access control
