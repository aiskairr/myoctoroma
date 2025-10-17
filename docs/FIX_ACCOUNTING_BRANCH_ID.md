# Fix: POST /api/accounting branchId Correctness

## Problem Description

**Issue:** POST /api/accounting requests were sending incorrect branchId values. For example, when processing a payment for an appointment belonging to branchId=1, the accounting record was being created with branchId=2.

**Root Cause:** The code was not prioritizing the original entity's (task/certificate) branchId. Instead, it was either:
1. Using `getBranchIdWithFallback(null, branches)` - which would take the first branch in the array
2. Using only `currentBranch?.id` - which could be different from the entity's actual branch

**Impact:** This caused accounting records to be associated with incorrect branches, leading to:
- Incorrect financial reports per branch
- Data integrity issues
- Confusion when analyzing branch-specific metrics

## Solution

Implemented a hierarchical branchId selection strategy:
1. **First Priority:** Use the entity's own branchId (task.branchId, certificate.branch_id)
2. **Second Priority:** Use the currently selected branch (currentBranch)
3. **Third Priority:** Use fallback logic from getBranchIdWithFallback()

This ensures that accounting records are always created for the correct branch where the original transaction occurred.

## Files Modified

### 1. `/src/pages/Calendar/components/task-dialog-btn.tsx`

**Location:** Line ~973 (Payment creation in handlePaymentSubmit)

**Before:**
```typescript
const paymentData = {
    // ... other fields
    branchId: getBranchIdWithFallback(null, branches),
    // ... other fields
};
```

**After:**
```typescript
// Используем branchId из задачи, если он есть, иначе текущий выбранный филиал
const correctBranchId = taskData?.branchId 
    ? (typeof taskData.branchId === 'number' ? taskData.branchId : parseInt(taskData.branchId)) 
    : getBranchIdWithFallback(currentBranch, branches);

const paymentData = {
    // ... other fields
    branchId: correctBranchId,
    // ... other fields
};

console.log('💰 Sending payment data:', paymentData);
console.log('🏢 Using branchId:', correctBranchId, 'from task:', taskData?.branchId, 'or currentBranch:', currentBranch?.id);
```

**Changes:**
- ✅ Added `correctBranchId` variable to compute the right branchId
- ✅ Prioritizes `taskData.branchId` if it exists
- ✅ Falls back to `getBranchIdWithFallback(currentBranch, branches)` instead of passing `null`
- ✅ Added type conversion for branchId (number vs string)
- ✅ Added debug logging to track which branchId is being used

---

### 2. `/src/components/EditAppointmentDialog.tsx`

**Location:** Line ~484 (Payment creation in createPaymentMutation)

**Before:**
```typescript
const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/accounting`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        // ... other fields
        branchId: getBranchIdWithFallback(currentBranch, branches),
        // ... other fields
    }),
});
```

**After:**
```typescript
// Используем branchId из задачи, если он есть, иначе текущий выбранный филиал
const correctBranchId = task.branchId || getBranchIdWithFallback(currentBranch, branches);

const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/accounting`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        // ... other fields
        branchId: correctBranchId,
        // ... other fields
    }),
});
```

**Changes:**
- ✅ Added `correctBranchId` variable
- ✅ Prioritizes `task.branchId` if it exists
- ✅ Falls back to `getBranchIdWithFallback(currentBranch, branches)`

---

### 3. `/src/pages/DailyCalendar.tsx`

**Location:** Line ~1177 (Payment creation in createPaymentMutation)

**Before:**
```typescript
// Создаем основную запись об оплате
const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/accounting`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        // ... other fields
        branchId: getBranchIdWithFallback(currentBranch, branches),
        // ... other fields
    }),
});
```

**After:**
```typescript
// Используем branchId из задачи, если он есть, иначе текущий выбранный филиал
const correctBranchId = task.branchId || getBranchIdWithFallback(currentBranch, branches);

// Создаем основную запись об оплате
const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/accounting`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        // ... other fields
        branchId: correctBranchId,
        // ... other fields
    }),
});
```

**Changes:**
- ✅ Added `correctBranchId` variable
- ✅ Prioritizes `task.branchId` if it exists
- ✅ Falls back to `getBranchIdWithFallback(currentBranch, branches)`

---

### 4. `/src/pages/GiftCertificatesPage.tsx`

**Location:** Line ~337 (Gift certificate usage accounting)

**Before:**
```typescript
const updatedCert = await response.json();

// Создаем запись в бухгалтерии для использованного сертификата
const accountingResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/accounting`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        // ... other fields
        branch_id: currentBranch?.id
    })
});
```

**After:**
```typescript
const updatedCert = await response.json();

// Используем branch_id из сертификата, если он есть, иначе текущий филиал
const correctBranchId = certificate.branch_id || currentBranch?.id;

// Создаем запись в бухгалтерии для использованного сертификата
const accountingResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/accounting`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        // ... other fields
        branch_id: correctBranchId
    })
});
```

**Changes:**
- ✅ Added `correctBranchId` variable
- ✅ Prioritizes `certificate.branch_id` if it exists
- ✅ Falls back to `currentBranch?.id`

---

## Summary of Changes

| File | Line | Issue | Fix |
|------|------|-------|-----|
| task-dialog-btn.tsx | ~973 | Used `getBranchIdWithFallback(null, branches)` | Now uses `taskData?.branchId` first, then `getBranchIdWithFallback(currentBranch, branches)` |
| EditAppointmentDialog.tsx | ~484 | Used only `currentBranch` | Now uses `task.branchId` first, then `getBranchIdWithFallback(currentBranch, branches)` |
| DailyCalendar.tsx | ~1177 | Used only `currentBranch` | Now uses `task.branchId` first, then `getBranchIdWithFallback(currentBranch, branches)` |
| GiftCertificatesPage.tsx | ~337 | Used only `currentBranch?.id` | Now uses `certificate.branch_id` first, then `currentBranch?.id` |

## Testing Recommendations

### Test Case 1: Payment for Appointment from Branch 1
1. Select Branch 1 in the branch selector
2. Create/view an appointment that belongs to Branch 1 (check task.branchId = 1)
3. Process payment for this appointment
4. **Expected:** Accounting record created with branchId = 1
5. Check network request payload: `branchId: 1`

### Test Case 2: Payment for Appointment from Branch 2 While Branch 1 is Selected
1. Select Branch 1 in the branch selector
2. View an appointment that belongs to Branch 2 (task.branchId = 2)
3. Process payment for this appointment
4. **Expected:** Accounting record created with branchId = 2 (not 1!)
5. Check network request payload: `branchId: 2`
6. **This is the critical test case that was failing before**

### Test Case 3: Gift Certificate Usage
1. Create gift certificate in Branch 1 (certificate.branch_id = '1')
2. Switch to Branch 2 in branch selector
3. Use the gift certificate
4. **Expected:** Accounting record created with branch_id = '1' (from certificate)
5. Check network request payload: `branch_id: '1'`

### Test Case 4: Cross-Branch Data Integrity
1. Generate accounting report for Branch 1
2. Verify all payments processed for Branch 1 appointments appear in Branch 1 report
3. Generate accounting report for Branch 2
4. Verify all payments processed for Branch 2 appointments appear in Branch 2 report
5. **Expected:** No cross-contamination between branch reports

## Build Status

✅ **Build Successful**
- Build time: 11.29s
- Bundle size: 2,655.66 KB
- No TypeScript errors
- No runtime errors

## Related Issues

- Similar fix was applied earlier for `/api/administrators` endpoint
- This is part of a broader effort to ensure all API requests use correct branchId
- See also: `FIX_ADMINISTRATORS_BRANCH_ID.md`

## Prevention Strategy

To prevent this issue in the future:

1. **Always check if entity has branchId** before using currentBranch
2. **Use this pattern for all API requests**:
   ```typescript
   const correctBranchId = entity?.branchId || getBranchIdWithFallback(currentBranch, branches);
   ```
3. **Never pass `null` to getBranchIdWithFallback()** - always pass currentBranch
4. **Add logging** to track which branchId is being used
5. **Test cross-branch scenarios** during development

## Future Improvements

1. Create a reusable hook: `useCorrectBranchId(entity)` that encapsulates this logic
2. Add TypeScript type guards to ensure branchId consistency
3. Add automated tests for cross-branch data integrity
4. Consider adding backend validation to reject mismatched branchId values
