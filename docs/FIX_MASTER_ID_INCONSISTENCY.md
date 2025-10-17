# Fix: Inconsistent masterId in PATCH /api/tasks

## Problem Description

**Issue:** При обновлении записи (appointment) через PATCH запрос к `/api/tasks/:id`, иногда отправлялся неправильный `masterId` и `masterName`, не соответствующий тому мастеру, который был получен в последнем GET запросе.

**Example:**
- GET ответ показывает: `masterId: 18, masterName: "Адиль"`
- PATCH отправляет: `masterId: 20, masterName: "Абдулла юниор"`

**Root Cause:** В функции `updateAppointment` в файле `time-schedule.tsx` была неполная логика определения мастера:
1. Если `updates.employeeId` передан - искался новый мастер ✅
2. Если НЕ передан - брался из `currentTask` ⚠️
3. **НО:** Если `currentTask` не загружен или отсутствует, мастер вообще не добавлялся в payload ❌

Это приводило к тому, что при определенных операциях (resize, изменение времени без смены мастера) `masterId` терялся или брался из неправильного источника.

## Solution

Добавлена трехуровневая логика определения мастера с fallback:

### Приоритеты:
1. **Highest Priority:** Если `updates.employeeId` передан - используем нового мастера из `mastersData`
2. **Medium Priority:** Если мастер не изменяется - берем из `currentTask` (данные с сервера)
3. **Fallback Priority:** Если `currentTask` не загружен - берем из `currentAppointment.employeeId` через `mastersData`

## Files Modified

### `/src/pages/Calendar/components/time-schedule.tsx`

**Location:** Lines ~666-714 (функция `updateAppointment`)

**Before:**
```typescript
if (updates.employeeId) {
    // ... логика поиска нового мастера
} else if (currentTask) {
    // Сохраняем текущего мастера если он не изменяется
    payload.masterId = currentTask.masterId;
    payload.masterName = currentTask.masterName || currentTask.master?.name;
}
```

**After:**
```typescript
if (updates.employeeId) {
    // ... логика поиска нового мастера
} else {
    // Сохраняем текущего мастера если он не изменяется
    // Приоритет: currentTask > currentAppointment
    if (currentTask) {
        payload.masterId = currentTask.masterId;
        payload.masterName = currentTask.masterName || currentTask.master?.name;
        console.log('📋 Using master from currentTask:', { masterId: payload.masterId, masterName: payload.masterName });
    } else if (currentAppointment) {
        // Fallback на данные из appointment, если currentTask не загружен
        const appointmentMaster = mastersData.find(m => m.id.toString() === currentAppointment.employeeId);
        if (appointmentMaster) {
            payload.masterId = appointmentMaster.id;
            payload.masterName = appointmentMaster.name;
            console.log('📋 Using master from currentAppointment:', { masterId: payload.masterId, masterName: payload.masterName });
        } else {
            console.warn('⚠️ Could not find master for currentAppointment.employeeId:', currentAppointment.employeeId);
        }
    }
}
```

**Changes:**
- ✅ Изменен `else if (currentTask)` на `else` для всегда выполнения блока
- ✅ Добавлена вложенная проверка с приоритетами: `currentTask` → `currentAppointment`
- ✅ Добавлен fallback на `currentAppointment.employeeId` через поиск в `mastersData`
- ✅ Добавлено подробное логирование для отладки источника данных мастера
- ✅ Добавлено предупреждение если мастер не найден ни в одном источнике
- ✅ Обновлены зависимости useCallback: добавлены `appointments`, `currentBranch`, `branches`

## Flow Chart

```
updateAppointment вызывается
    ↓
Проверяем updates.employeeId?
    ↓
    YES → Ищем нового мастера в mastersData
    |     ↓
    |     Найден? → payload.masterId = masterData.id ✅
    |     ↓
    |     Не найден? → Warning в консоль ⚠️
    ↓
    NO → Сохраняем текущего мастера
          ↓
          currentTask загружен?
          ↓
          YES → payload.masterId = currentTask.masterId ✅
          ↓
          NO → currentAppointment существует?
               ↓
               YES → Ищем мастера в mastersData по currentAppointment.employeeId
               |     ↓
               |     Найден? → payload.masterId = appointmentMaster.id ✅
               |     ↓
               |     Не найден? → Warning в консоль ⚠️
               ↓
               NO → Мастер не добавлен в payload ❌
```

## Testing Scenarios

### Test Case 1: Drag & Drop (изменение мастера)
1. Перетащить запись с одного мастера на другого
2. **Expected:** 
   - `updates.employeeId` содержит ID нового мастера
   - Payload содержит `masterId` и `masterName` нового мастера
3. **Console log:** `✅ Master mapping successful: { employeeId: "20", masterId: 20, masterName: "Абдулла юниор" }`

### Test Case 2: Resize (изменение длительности, мастер не меняется)
1. Изменить длительность записи (resize сверху/снизу)
2. **Expected:**
   - `updates.employeeId` отсутствует
   - `currentTask` загружен → используется `currentTask.masterId`
   - Payload содержит оригинального мастера
3. **Console log:** `📋 Using master from currentTask: { masterId: 18, masterName: "Адиль" }`

### Test Case 3: Time change (изменение времени, мастер не меняется)
1. Изменить время начала записи (без смены мастера)
2. **Expected:**
   - `updates.employeeId` отсутствует
   - Если `currentTask` не загружен → используется `currentAppointment.employeeId`
   - Payload содержит оригинального мастера
3. **Console log:** `📋 Using master from currentAppointment: { masterId: 18, masterName: "Адиль" }`

### Test Case 4: Rapid updates (быстрые изменения)
1. Быстро выполнить несколько операций подряд
2. **Expected:**
   - Каждый PATCH запрос содержит правильного мастера
   - Нет случаев где masterId отличается от оригинального (если мастер не менялся)

## Debugging

Для отладки проблем с masterId добавлено подробное логирование:

```typescript
// При поиске нового мастера:
console.log('🔍 Looking for employeeId:', updates.employeeId);
console.log('👤 Found employee:', employee);
console.log('🎯 Found masterData:', masterData);
console.log('✅ Master mapping successful:', { employeeId, masterId, masterName });

// При сохранении текущего мастера:
console.log('📋 Using master from currentTask:', { masterId, masterName });
console.log('📋 Using master from currentAppointment:', { masterId, masterName });

// При проблемах:
console.warn('⚠️ Master not found in mastersData for employeeId:', updates.employeeId);
console.warn('⚠️ Could not find master for currentAppointment.employeeId:', currentAppointment.employeeId);
```

## Build Status

✅ **Build Successful**
- Build time: 9.27s
- Bundle size: 2,656.15 KB
- No TypeScript errors
- No runtime errors

## Prevention Strategy

1. **Always maintain data hierarchy:**
   - Server data (`currentTask`) > Local state (`currentAppointment`)
   
2. **Add fallbacks for critical data:**
   - Never leave critical fields (masterId, masterName) unset
   - Always have 2-3 levels of fallback
   
3. **Log data sources:**
   - Log which source was used for each field
   - Makes debugging much easier
   
4. **Test edge cases:**
   - Test scenarios where data loads asynchronously
   - Test rapid successive updates
   - Test operations without full data loaded

## Related Issues

- Similar to the branchId fix where we also implemented hierarchical fallback logic
- See also: `FIX_ACCOUNTING_BRANCH_ID.md`
