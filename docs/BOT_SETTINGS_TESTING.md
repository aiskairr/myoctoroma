# Bot Settings Testing Guide

## Quick Start
Development server running at: http://localhost:5174/

## Test Checklist

### 1. Visual Verification ✓
- [ ] Open http://localhost:5174/settings
- [ ] See "🤖 Настройки бота" section (blue card)
- [ ] Section appears BEFORE "Настройка системного промпта"
- [ ] Two input fields visible:
  - [ ] 🆔 Account ID (text input)
  - [ ] ⏱️ Таймаут передачи менеджеру (number input)
- [ ] Current status box shows branch name
- [ ] "Сохранить настройки бота" button (blue)

### 2. Data Loading ✓
- [ ] If branch has accountID → pre-filled in input
- [ ] If branch has managerTimeoutMinutes → pre-filled in input
- [ ] Status box shows configured values with ✓ checkmarks

### 3. Account ID Update
- [ ] Enter test value: "test-account-12345"
- [ ] Click "Сохранить настройки бота"
- [ ] Success toast appears
- [ ] Refresh page
- [ ] Value persists in input field
- [ ] Status box shows: "✓ Account ID настроен: test-account-12345"

### 4. Manager Timeout Update
- [ ] Enter value: 30
- [ ] Click "Сохранить настройки бота"
- [ ] Success toast appears
- [ ] Refresh page
- [ ] Value persists (shows "30")
- [ ] Status box shows: "✓ Таймаут: 30 минут"

### 5. Timeout Reset to Default
- [ ] Clear timeout field (leave empty)
- [ ] Click "Сохранить настройки бота"
- [ ] Success toast appears
- [ ] Status box no longer shows timeout checkmark
- [ ] Backend uses 15 min default

### 6. Validation Tests
- [ ] Enter negative timeout: -5
- [ ] Click save
- [ ] Error toast: "Таймаут должен быть положительным числом"
- [ ] Form not submitted

- [ ] Enter text in timeout: "abc"
- [ ] Click save
- [ ] Error toast: "Таймаут должен быть положительным числом"
- [ ] Form not submitted

### 7. Loading State
- [ ] Click save button
- [ ] Button shows spinner + "Сохранение..."
- [ ] Button disabled during save
- [ ] After success → button returns to normal

### 8. Multi-Branch Test
- [ ] Switch to different branch
- [ ] See bot settings update to new branch values
- [ ] Update settings
- [ ] Switch back to first branch
- [ ] Verify settings are branch-specific

## API Verification

### Check Network Tab
```
Request: PUT /api/branches/{id}
Body: {
  "accountID": "test-account-12345",
  "managerTimeoutMinutes": 30
}

Response: {
  "message": "Branch updated successfully",
  "branch": { ... }
}
```

### Database Check
```sql
SELECT id, branches, account_id, manager_timeout_minutes 
FROM branches 
WHERE id = 1;
```

Expected:
```
| id | branches     | account_id          | manager_timeout_minutes |
|----|--------------|---------------------|-------------------------|
| 1  | Main Branch  | test-account-12345  | 30                      |
```

## Edge Cases to Test

### 1. Empty Account ID
- Action: Leave accountID empty, set timeout to 20
- Expected: Only timeout saved, accountID stays null/empty

### 2. Empty Both Fields
- Action: Clear both fields, save
- Expected: Both reset to default (empty/null)

### 3. Very Large Timeout
- Action: Enter 999999
- Expected: Saved successfully (no max limit)

### 4. Zero Timeout
- Action: Enter 0
- Expected: Validation error (must be positive)

### 5. Decimal Timeout
- Action: Enter 15.5
- Expected: Parsed as 15 (parseInt truncates)

## Known Behavior

✅ **Account ID:**
- Can be any string
- Optional field
- No validation (accepts any format)

✅ **Manager Timeout:**
- Must be positive integer
- Empty = NULL = 15 min default (backend)
- Minimum: 1 minute
- No maximum limit

✅ **Persistence:**
- Settings saved per branch
- Switching branches loads correct values
- Changes immediate (no page reload needed)

✅ **Error Handling:**
- Network errors → error toast
- Validation errors → error toast
- Success → success toast + refresh data

## Integration Points

### 1. WhatsApp Message Handler
```typescript
// Backend uses COALESCE for default
COALESCE(manager_timeout_minutes, 15) as effective_timeout
```

### 2. Chats Page
```typescript
// Uses accountID from currentBranch
const accountID = currentBranch?.accountID;
```

### 3. Branch Context
```typescript
// Frontend reads from branch object
currentBranch.accountID
currentBranch.managerTimeoutMinutes
```

## Success Criteria

✅ Settings section visible and styled correctly
✅ Data loads from current branch
✅ Can update both fields independently
✅ Can clear timeout to reset to default
✅ Validation prevents invalid timeout values
✅ Changes persist after page refresh
✅ Settings are branch-specific
✅ API calls succeed with correct payload
✅ Success/error feedback clear to user
✅ Loading state shows during save

## Issues to Watch For

⚠️ **Potential Issues:**
1. TypeScript errors in console
2. API CORS errors (backend not deployed yet)
3. Toast notifications not appearing
4. Values not pre-filling on mount
5. Status indicators not updating
6. Branch switching not updating form

## Next Steps After Testing

1. ✅ Visual review → adjust styling if needed
2. ✅ Functionality test → fix any bugs
3. ✅ Edge cases → handle gracefully
4. 🚀 Deploy to production
5. 📊 Monitor usage
6. 📝 Update user documentation

## Related Files
- `src/pages/Settings.tsx` - UI implementation
- `src/contexts/BranchContext.tsx` - Type definitions
- `docs/BOT_SETTINGS_UI.md` - Full documentation
- `docs/MANAGER_TIMEOUT_FEATURE.md` - Backend feature
