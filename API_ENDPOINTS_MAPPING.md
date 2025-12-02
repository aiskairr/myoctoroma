# Маппинг API эндпоинтов

## Текущее состояние

После миграции все эндпоинты по умолчанию используют **Primary Backend**:
`https://lesser-felicdad-promconsulting-79f07228.koyeb.app`

## Список всех эндпоинтов в проекте

### Задачи (Tasks)
- `GET /api/tasks` - Получение списка задач
- `GET /api/tasks/:id` - Получение задачи по ID
- `POST /api/tasks` - Создание новой задачи
- `PATCH /api/tasks/:id` - Обновление задачи
- `DELETE /api/tasks/:id` - Удаление задачи
- `GET /api/tasks/children/:id` - Получение дочерних задач
- `GET /api/crm/tasks` - CRM задачи
- `GET /api/crm/tasks/:id` - CRM задача по ID
- `POST /api/crm/tasks/:id` - Обновление CRM задачи
- `GET /api/crm/tasks-calendar` - Календарь задач

**Backend:** Primary ✅

### Мастера (Masters)
- `GET /api/masters` - Список мастеров
- `GET /api/masters/availability` - Доступность мастера
- `GET /api/masters/working-dates` - Рабочие даты
- `GET /api/crm/masters` - CRM мастера
- `GET /api/crm/masters/:id` - CRM мастер по ID
- `POST /api/crm/masters/:id` - Создание/обновление мастера
- `DELETE /api/crm/masters/:id` - Удаление мастера
- `POST /api/crm/masters/:id/upload-image` - Загрузка изображения
- `GET /api/masters/:id/working-dates` - Рабочие даты мастера
- `POST /api/masters/:id/working-dates` - Добавление рабочих дат
- `DELETE /api/masters/:id/working-dates/:date` - Удаление рабочей даты
- `GET /api/crm/reception-master/user` - Мастер-приемщик
- `GET /api/calendar/masters` - Мастера для календаря

**Backend:** Primary ✅

### Услуги (Services)
- `GET /api/crm/services` - Список услуг
- `POST /api/crm/services` - Создание услуги
- `GET /api/service-services/durations` - Длительность услуг
- `GET /api/public/service-services` - Публичные услуги

**Backend:** Primary ✅

### Администраторы
- `GET /api/administrators` - Список администраторов
- `POST /api/administrators` - Создание администратора
- `PATCH /api/administrators/:id` - Обновление администратора
- `DELETE /api/administrators/:id` - Удаление администратора

**Backend:** Primary ✅

### Пользователи
- `GET /api/user` - Текущий пользователь
- `POST /api/register-user` - Регистрация пользователя

**Backend:** Primary ✅

### Встречи (Appointments)
- `GET /api/crm/appointments` - Список встреч
- `GET /api/crm/appointments/:id` - Встреча по ID
- `POST /api/crm/appointments` - Создание встречи
- `POST /api/crm/appointments/:id` - Обновление встречи
- `DELETE /api/crm/appointments/:id` - Удаление встречи

**Backend:** Primary ✅

### Расходы (Expenses)
- `GET /api/expenses` - Список расходов (с фильтрами по дате и филиалу)
- `POST /api/expenses` - Создание расхода
- `DELETE /api/expenses/:id` - Удаление расхода

**Backend:** Primary ✅

### Подарочные сертификаты
- `GET /api/gift-certificates` - Список сертификатов
- `POST /api/gift-certificates` - Создание сертификата
- `PATCH /api/gift-certificates/:id` - Обновление сертификата
- `GET /api/gift-certificates/search/:number` - Поиск по номеру
- `DELETE /api/gift-certificates/:id` - Удаление сертификата

**Backend:** Primary ✅

### Бухгалтерия (Accounting)
- `GET /api/accounting` - Записи бухгалтерии
- `POST /api/accounting` - Создание записи
- `PATCH /api/accounting/:id` - Обновление записи
- `POST /api/accounting/bulk-update` - Массовое обновление
- `DELETE /api/accounting/:id` - Удаление записи

**Backend:** Primary ✅

### Мессенджер
- `GET /api/messenger/history` - История сообщений
- `POST /api/messenger/send` - Отправка сообщения

**Backend:** Primary ✅

### Букинг
- `POST /api/create-booking-params-link` - Создание ссылки на букинг

**Backend:** Primary ✅

## Secondary Backend

Вторичный бэкенд (`https://scattered-ermentrude-promconsulting-23cbccde.koyeb.app`) готов к использованию.

### Когда использовать Secondary Backend?

1. **Новые функции**, которые требуют отдельной обработки
2. **Микросервисы**, которые логически отделены от основного CRM
3. **Тестирование** новых версий API без влияния на продакшн

### Как добавить эндпоинт на Secondary Backend?

```typescript
// Пример 1: Axios
import { $apiSecondary } from '@/API/http';
const response = await $apiSecondary.get('/api/new-endpoint');

// Пример 2: Fetch с helper
import { apiGetJson } from '@/API/http';
const data = await apiGetJson('/api/new-endpoint', true); // true = use secondary

// Пример 3: Service
import { taskParserService } from '@/services/task-parser';
taskParserService.start({}, true); // true = use secondary backend
```

## Проверка текущей конфигурации

Выполните в консоли браузера:
```javascript
console.log('VITE_BACKEND_URL:', import.meta.env.VITE_BACKEND_URL);
console.log('VITE_SECONDARY_BACKEND_URL:', import.meta.env.VITE_SECONDARY_BACKEND_URL);
```

## Примечания

- ✅ Все существующие эндпоинты работают через Primary Backend
- ✅ Secondary Backend готов к использованию при необходимости
- ✅ Обратная совместимость сохранена на 100%
- ✅ Легко переключаться между бэкендами через параметр функций
