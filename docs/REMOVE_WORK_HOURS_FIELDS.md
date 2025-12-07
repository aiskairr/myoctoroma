# Удаление полей startWorkHour/endWorkHour

## Дата: 5 декабря 2025

---

## Обзор изменений

Удалены устаревшие поля `startWorkHour` и `endWorkHour` из таблицы мастеров. Теперь рабочее время мастера определяется **только** через таблицу `master_working_dates` для каждой конкретной даты.

---

## Причина изменений

### Ранее (старая система)

В таблице `masters`/`crm_masters` были поля:

| Поле | Описание | По умолчанию |
|------|----------|--------------|
| `start_work_hour` | Фиксированное время начала работы | "09:00" |
| `end_work_hour` | Фиксированное время окончания работы | "20:00" |

### Проблема

Эти поля предполагали **одинаковое рабочее время каждый день**, что не соответствует реальности — мастера работают по индивидуальному расписанию на каждый день.

### Решение

Используем таблицу `master_working_dates`, где для каждой даты указывается:

| Поле | Описание |
|------|----------|
| `work_date` | Дата работы |
| `start_time` | Время начала |
| `end_time` | Время окончания |
| `branch_id` | Филиал |

---

## Изменения в API

### 1. GET `/api/masters?branchID=...`

**Было:**
```json
{
  "id": 1,
  "name": "Мастер",
  "startWorkHour": "09:00",
  "endWorkHour": "20:00"
}
```

**Стало:**
```json
{
  "id": 1,
  "name": "Мастер"
}
```

> ⚠️ Поля `startWorkHour` и `endWorkHour` больше НЕ возвращаются.

### 2. GET `/api/calendar/masters/:date?branchId=...`

Возвращает мастеров, работающих в указанную дату.

**Было:** `startWorkHour`, `endWorkHour`

**Стало:** `startTime`, `endTime`

```json
{
  "id": 1,
  "name": "Мастер",
  "startTime": "10:00",
  "endTime": "19:00"
}
```

> ⚠️ Если мастер **не имеет** записи в `master_working_dates` на запрошенную дату — он **НЕ будет возвращён** в ответе.

---

## Изменения в базе данных

Выполнена миграция `remove-work-hours-columns.sql`:

```sql
-- Удаление устаревших полей из таблицы masters
ALTER TABLE masters 
  DROP COLUMN IF EXISTS start_work_hour,
  DROP COLUMN IF EXISTS end_work_hour;

ALTER TABLE crm_masters 
  DROP COLUMN IF EXISTS start_work_hour,
  DROP COLUMN IF EXISTS end_work_hour;
```

---

## Изменения в бэкенд коде

| Файл | Изменения |
|------|-----------|
| `schema.ts` | Удалены поля `startWorkHour`, `endWorkHour` из схем `masters` и `crmMasters` |
| `schema.ts` | Удалены поля из миграционных схем |
| `routes.ts` | Убраны поля из SELECT запросов, переименованы в `startTime`/`endTime` для calendar API |
| `crm-api.ts` | Убраны поля из SELECT запросов |
| `llmResponseProcessor.ts` | Рабочее время берётся из `master_working_dates` через JOIN |

---

## Изменения во фронтенд коде

### Файлы обновлённые 5 декабря 2025:

| Файл | Статус | Изменения |
|------|--------|-----------|
| `src/hooks/use-masters.ts` | ✅ Выполнено | Удалены `startWorkHour`, `endWorkHour` из интерфейса `Master` |
| `src/pages/Masters.tsx` | ✅ Выполнено | Удалены поля из интерфейса и форм редактирования/создания мастера |
| `src/pages/CRMTasks.tsx` | ✅ Выполнено | Удалены устаревшие поля из обоих интерфейсов `Master` |
| `src/pages/Calendar/components/time-schedule.tsx` | ✅ Выполнено | Fallback значения '07:00'-'23:59' вместо master.startWorkHour/endWorkHour |
| `src/pages/Calendar/components/advanced-schedule-migrated.tsx` | ✅ Выполнено | Удалены поля, установлены fallback значения |
| `src/components/EditAppointmentDialog.tsx` | ✅ Выполнено | Удалены устаревшие поля из интерфейса `Master` |

---

## Важно для фронтенда

1. **Не использовать** `startWorkHour`/`endWorkHour` в ответах API мастеров
2. Для получения рабочего времени мастера на конкретную дату — использовать `/api/calendar/masters/:date`
3. Поля теперь называются `startTime` и `endTime`
4. Если мастер не работает в определённый день — он просто **отсутствует** в ответе calendar API
5. Для управления рабочим расписанием используется компонент `MasterWorkingDatesManager`

---

## Миграция UI

### Старая логика (удалить):
```tsx
// ❌ НЕ ИСПОЛЬЗОВАТЬ
interface Master {
  startWorkHour: string;
  endWorkHour: string;
}

// В форме:
<Input name="startWorkHour" value={formData.startWorkHour} />
<Input name="endWorkHour" value={formData.endWorkHour} />

// В карточке:
<span>{master.startWorkHour} - {master.endWorkHour}</span>
```

### Новая логика:
```tsx
// ✅ ИСПОЛЬЗОВАТЬ
// Рабочее время управляется через MasterWorkingDatesManager
import MasterWorkingDatesManager from "@/components/MasterWorkingDatesManager";
import MasterWorkingDatesDisplay from "@/components/MasterWorkingDatesDisplay";

// В форме используем автономный компонент:
<MasterWorkingDatesManager masterId={master.id} />

// Для отображения:
<MasterWorkingDatesDisplay masterId={master.id} masterName={master.name} />
```

### Для календаря используем новые поля:
```tsx
// ✅ Calendar API возвращает startTime/endTime
interface CalendarMaster {
  id: number;
  name: string;
  startTime: string;  // Рабочее время на конкретную дату
  endTime: string;
}

// Использование:
const workingHours = {
  start: master.startTime || '09:00',
  end: master.endTime || '20:00'
};
```

---

## Hook для рабочих дат

Используйте `use-master-working-dates.ts` для получения рабочего времени:

```tsx
import { useMasterWorkingDates } from '@/hooks/use-master-working-dates';

const { data: workingDates, isLoading } = useMasterWorkingDates(masterId);

// Получение рабочего времени на конкретную дату
const getWorkingHoursForDate = (date: string) => {
  const workingDate = workingDates?.find(wd => wd.work_date === date);
  return {
    startTime: workingDate?.start_time || '09:00',
    endTime: workingDate?.end_time || '20:00',
  };
};
```

---

## Чеклист миграции

- [x] Обновить `src/hooks/use-masters.ts` — удалить поля из интерфейса
- [x] Обновить `src/pages/Masters.tsx` — удалить поля из формы, оставить `MasterWorkingDatesManager`
- [x] Обновить `src/pages/CRMTasks.tsx` — удалить устаревшие поля
- [x] Обновить `src/pages/Calendar/components/time-schedule.tsx` — использовать fallback значения
- [x] Обновить `src/pages/Calendar/components/advanced-schedule-migrated.tsx`
- [x] Обновить `src/components/EditAppointmentDialog.tsx`
- [ ] Удалить устаревшую документацию в `docs/MEMBERS_PAGE.md`
- [ ] Обновить `docs/MASTER_PHONE_NUMBER_FIELD.md`
- [x] Протестировать сборку (npm run build)
- [ ] Протестировать страницу мастеров
- [ ] Протестировать календарь
- [ ] Деплой на production
