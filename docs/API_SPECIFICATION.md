# API Спецификация для endpoint GET /api/tasks

## Описание
Endpoint для получения записей клиентов из таблицы `client_tasks` с фильтрацией по филиалу и дате.

## HTTP метод
```
GET /api/tasks
```

## Параметры запроса (Query Parameters)

### Обязательные параметры:
- `branchId` (string) - ID филиала для фильтрации
- `scheduledAfter` (string) - ISO дата начала периода (например: "2025-10-03T00:00:00.000Z")
- `scheduledBefore` (string) - ISO дата окончания периода (например: "2025-10-04T00:00:00.000Z")
- `sortBy` (string) - поле для сортировки (например: "scheduleDate")
- `sortOrder` (string) - порядок сортировки: "asc" или "desc"

### Опциональные параметры:
- `userRole` (string) - роль пользователя для дополнительной фильтрации
- `userMasterId` (string) - ID мастера, если пользователь является мастером

## Пример запроса
```
GET /api/tasks?branchId=1&scheduledAfter=2025-10-03T00:00:00.000Z&scheduledBefore=2025-10-04T00:00:00.000Z&sortBy=scheduleDate&sortOrder=asc
```

## SQL запрос (пример для backend)
```sql
SELECT 
    ct.*,
    c.telegramId,
    c.firstName,
    c.lastName,
    c.customName,
    c.phoneNumber,
    m.name as masterName
FROM client_tasks ct
LEFT JOIN clients c ON ct.clientId = c.id
LEFT JOIN masters m ON ct.masterId = m.id
WHERE 
    ct.branchId = :branchId
    AND ct.scheduleDate >= :scheduledAfter
    AND ct.scheduleDate <= :scheduledBefore
    AND (:userMasterId IS NULL OR ct.masterId = :userMasterId)
ORDER BY 
    CASE WHEN :sortBy = 'scheduleDate' THEN ct.scheduleDate END ASC/DESC,
    CASE WHEN :sortBy = 'scheduleTime' THEN ct.scheduleTime END ASC/DESC
```

## Формат ответа

### Успешный ответ (200 OK)
```json
[
    {
        "id": "111759501386762580",
        "clientId": 12,
        "status": "scheduled",
        "serviceType": "VIP пакет",
        "serviceServiceId": 59,
        "serviceDuration": 90,
        "servicePrice": null,
        "discount": 0,
        "finalPrice": null,
        "scheduleDate": "2025-10-03T00:00:00.000Z",
        "scheduleTime": "09:45",
        "endTime": null,
        "masterId": 4,
        "masterName": "Федор",
        "notes": "Задача создана вручную через интерфейс",
        "branchId": "1",
        "source": null,
        "chatId": null,
        "mother": null,
        "paymentMethod": null,
        "adminName": null,
        "paid": "unpaid",
        "createdAt": "2025-10-03T14:23:07.072Z",
        "updatedAt": "2025-10-03T14:23:07.072Z",
        "client": {
            "id": 12,
            "telegramId": "wa1_1234567890",
            "firstName": "jhbjhbjhb",
            "lastName": "Клиент",
            "username": "",
            "customName": null,
            "phoneNumber": "+1234567890",
            "branchId": "wa1",
            "organisationId": null,
            "firstSeenAt": "2025-10-03T14:23:07.056Z",
            "lastActiveAt": "2025-10-03T14:23:07.038Z",
            "isActive": true
        }
    },
    {
        "id": "111759501484315410",
        "clientId": 13,
        "status": "scheduled",
        "serviceType": "Арома релакс",
        "serviceServiceId": 63,
        "serviceDuration": 120,
        "servicePrice": 900,
        "discount": 0,
        "finalPrice": 900,
        "scheduleDate": "2025-10-03T00:00:00.000Z",
        "scheduleTime": "10:00",
        "endTime": null,
        "masterId": 3,
        "masterName": "Не назначен",
        "notes": "Задача создана вручную через интерфейс",
        "branchId": "1",
        "source": null,
        "chatId": null,
        "mother": null,
        "paymentMethod": null,
        "adminName": null,
        "paid": "unpaid",
        "createdAt": "2025-10-03T14:24:45.148Z",
        "updatedAt": "2025-10-03T14:24:45.148Z",
        "client": {
            "id": 13,
            "telegramId": "wa1_123456789099",
            "firstName": "kjnkjnjkn",
            "lastName": "Клиент",
            "username": "",
            "customName": null,
            "phoneNumber": "+123456789099",
            "branchId": "wa1",
            "organisationId": null,
            "firstSeenAt": "2025-10-03T14:24:45.119Z",
            "lastActiveAt": "2025-10-03T14:24:45.102Z",
            "isActive": true
        }
    }
]
```

## Поля ответа

### Обязательные поля:
- `id` (string) - уникальный идентификатор задачи
- `clientId` (number) - ID клиента
- `status` (string) - статус задачи: "scheduled", "in-progress", "completed", "cancelled"
- `serviceType` (string) - тип услуги
- `masterId` (number) - ID мастера
- `branchId` (string) - ID филиала
- `scheduleDate` (string) - дата в формате ISO
- `scheduleTime` (string) - время в формате "HH:MM"

### Опциональные поля:
- `serviceServiceId` (number) - ID услуги в справочнике
- `serviceDuration` (number) - продолжительность в минутах
- `servicePrice` (number|null) - базовая стоимость услуги
- `discount` (number) - размер скидки
- `finalPrice` (number|null) - итоговая стоимость
- `endTime` (string|null) - время окончания "HH:MM"
- `masterName` (string) - имя мастера (перезаписывается фронтендом)
- `notes` (string|null) - примечания
- `paid` (string) - статус оплаты: "paid", "unpaid", "partial"
- `source` (string|null) - источник создания задачи
- `createdAt` (string) - время создания в ISO формате
- `updatedAt` (string) - время обновления в ISO формате

### Вложенный объект client:
- `id` (number) - ID клиента
- `telegramId` (string) - Telegram ID или WhatsApp ID
- `firstName` (string) - имя
- `lastName` (string) - фамилия
- `customName` (string|null) - кастомное имя для отображения
- `phoneNumber` (string) - номер телефона
- `isActive` (boolean) - активен ли клиент

## Обработка данных на фронтенде

Фронтенд приложение выполняет следующие шаги для получения полной информации о задачах:

1. **Запрос задач**: `GET /api/tasks` - получение списка задач с `masterId`
2. **Запрос мастеров**: `GET /staff/{branchId}` - получение списка мастеров с именами
3. **Объединение данных**: На фронтенде создается карта мастеров по ID и присваивается `masterName` к каждой задаче

### Пример обработки на фронтенде:

```typescript
// 1. Получаем задачи и мастеров параллельно
const tasksData = await fetch('/api/tasks?branchId=1&...');
const mastersData = await fetch('/staff/1');

// 2. Создаем карту мастеров для быстрого поиска
const mastersMap = new Map(masters.map(master => [master.id, master.name]));

// 3. Присваиваем masterName к каждой задаче
const tasksWithMasterNames = tasks.map(task => ({
    ...task,
    masterName: task.masterId ? mastersMap.get(task.masterId) : null
}));
```

Этот подход позволяет:
- Избежать дублирования данных о мастерах в каждой задаче
- Централизованно управлять информацией о мастерах
- Кэшировать данные мастеров отдельно от задач
- Легко обновлять информацию о мастерах без пересоздания всех задач

### Ошибка (400 Bad Request)
```json
{
    "error": "Missing required parameter: branchId",
    "code": "MISSING_PARAMETER"
}
```

### Ошибка (401 Unauthorized)
```json
{
    "error": "Authentication required",
    "code": "UNAUTHORIZED"
}
```

### Ошибка (403 Forbidden)
```json
{
    "error": "Access denied to this branch",
    "code": "ACCESS_DENIED"
}
```

## Структура таблицы client_tasks (ожидаемая)

```sql
CREATE TABLE client_tasks (
    id INTEGER PRIMARY KEY,
    clientId INTEGER NOT NULL,
    clientName VARCHAR(255),
    status VARCHAR(50) DEFAULT 'scheduled',
    serviceType VARCHAR(255),
    scheduleDate DATE,
    scheduleTime TIME,
    endTime TIME,
    masterId INTEGER,
    serviceDuration INTEGER, -- в минутах
    servicePrice DECIMAL(10,2),
    notes TEXT,
    instanceId INTEGER,
    branchId VARCHAR(50) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (clientId) REFERENCES clients(id),
    FOREIGN KEY (masterId) REFERENCES masters(id),
    INDEX idx_branch_date (branchId, scheduleDate),
    INDEX idx_master_date (masterId, scheduleDate)
);
```

## Примеры реализации (Backend)

### Node.js + Express
```javascript
app.get('/api/tasks', authenticateUser, async (req, res) => {
    try {
        const { 
            branchId, 
            scheduledAfter, 
            scheduledBefore, 
            sortBy = 'scheduleDate', 
            sortOrder = 'asc',
            userMasterId 
        } = req.query;

        // Валидация обязательных параметров
        if (!branchId || !scheduledAfter || !scheduledBefore) {
            return res.status(400).json({
                error: 'Missing required parameters: branchId, scheduledAfter, scheduledBefore',
                code: 'MISSING_PARAMETER'
            });
        }

        // Проверка доступа к филиалу
        if (!hasAccessToBranch(req.user, branchId)) {
            return res.status(403).json({
                error: 'Access denied to this branch',
                code: 'ACCESS_DENIED'
            });
        }

        // Построение SQL запроса
        let query = `
            SELECT 
                ct.*,
                c.telegramId,
                c.firstName,
                c.lastName,
                c.customName,
                c.phoneNumber,
                m.name as masterName
            FROM client_tasks ct
            LEFT JOIN clients c ON ct.clientId = c.id
            LEFT JOIN masters m ON ct.masterId = m.id
            WHERE 
                ct.branchId = ?
                AND ct.scheduleDate >= ?
                AND ct.scheduleDate <= ?
        `;

        const params = [branchId, scheduledAfter, scheduledBefore];

        // Дополнительная фильтрация по мастеру
        if (userMasterId) {
            query += ' AND ct.masterId = ?';
            params.push(userMasterId);
        }

        // Сортировка
        const validSortFields = ['scheduleDate', 'scheduleTime', 'clientName', 'serviceType'];
        const validSortOrders = ['asc', 'desc'];
        
        if (validSortFields.includes(sortBy) && validSortOrders.includes(sortOrder.toLowerCase())) {
            query += ` ORDER BY ct.${sortBy} ${sortOrder.toUpperCase()}`;
        }

        const tasks = await db.query(query, params);

        // Форматирование ответа
        const formattedTasks = tasks.map(task => ({
            ...task,
            client: task.telegramId ? {
                telegramId: task.telegramId,
                firstName: task.firstName,
                lastName: task.lastName,
                customName: task.customName,
                phoneNumber: task.phoneNumber
            } : null
        }));

        res.json(formattedTasks);
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({
            error: 'Internal server error',
            code: 'INTERNAL_ERROR'
        });
    }
});
```

### Python + FastAPI
```python
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime

router = APIRouter()

@router.get("/api/tasks", response_model=List[TaskResponse])
async def get_tasks(
    branchId: str = Query(..., description="ID филиала"),
    scheduledAfter: datetime = Query(..., description="Начало периода"),
    scheduledBefore: datetime = Query(..., description="Конец периода"),
    sortBy: str = Query("scheduleDate", description="Поле для сортировки"),
    sortOrder: str = Query("asc", description="Порядок сортировки"),
    userMasterId: Optional[int] = Query(None, description="ID мастера"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Проверка доступа к филиалу
    if not has_access_to_branch(current_user, branchId):
        raise HTTPException(
            status_code=403,
            detail={"error": "Access denied to this branch", "code": "ACCESS_DENIED"}
        )
    
    # Построение запроса
    query = db.query(ClientTask).join(Client, ClientTask.clientId == Client.id, isouter=True)\
                               .join(Master, ClientTask.masterId == Master.id, isouter=True)\
                               .filter(ClientTask.branchId == branchId)\
                               .filter(ClientTask.scheduleDate >= scheduledAfter)\
                               .filter(ClientTask.scheduleDate <= scheduledBefore)
    
    # Дополнительная фильтрация по мастеру
    if userMasterId:
        query = query.filter(ClientTask.masterId == userMasterId)
    
    # Сортировка
    if sortBy == "scheduleDate" and sortOrder.lower() == "asc":
        query = query.order_by(ClientTask.scheduleDate.asc())
    elif sortBy == "scheduleDate" and sortOrder.lower() == "desc":
        query = query.order_by(ClientTask.scheduleDate.desc())
    
    tasks = query.all()
    
    return tasks
```

## Заголовки для авторизации
Все запросы должны включать:
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

## Логирование
Рекомендуется логировать:
- Параметры запроса
- Количество возвращенных записей
- Время выполнения запроса
- Ошибки и исключения

Этот endpoint должен обеспечить полную совместимость с фронтенд компонентом календаря, который уже настроен для работы с данной спецификацией.
