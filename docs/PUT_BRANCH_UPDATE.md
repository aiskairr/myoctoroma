# PUT /api/branches/:id — Обновить филиал

Описание
---
Обновляет данные филиала по его ID. Этот endpoint принимает объект с полями, которые нужно обновить. Поля, не включённые в тело запроса, остаются без изменений.

URL
---
PUT /api/branches/:id

Пример тела запроса
---
```json
{
  "branches": "Обновленное название",
  "address": "Новый адрес",
  "phoneNumber": "+996700999888",
  "isActive": true,
  "accountID": "ACC-NEW-123"
}
```

Curl пример
---
```bash
curl -X PUT "https://your-backend.example.com/api/branches/123" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "branches": "Обновленное название",
    "address": "Новый адрес",
    "phoneNumber": "+996700999888",
    "isActive": true,
    "accountID": "ACC-NEW-123"
  }'
```

Типичный успешный ответ (200)
---
```json
{
  "success": true,
  "data": {
    "id": "123",
    "branches": "Обновленное название",
    "address": "Новый адрес",
    "phoneNumber": "+996700999888",
    "isActive": true,
    "accountID": "ACC-NEW-123",
    "updatedAt": "2025-11-13T10:15:30.000Z"
  }
}
```

Ошибки
---
- 400 Bad Request — неверный формат данных или обязательные поля не прошли валидацию.
- 401 Unauthorized — отсутствует или недействителен токен авторизации.
- 403 Forbidden — у пользователя нет прав для редактирования филиала.
- 404 Not Found — филиал с указанным ID не найден.
- 500 Internal Server Error — внутренняя ошибка на сервере.

Frontend пример (TypeScript)
---
```ts
async function updateBranch(branchId: string, payload: any, token: string) {
  const res = await fetch(`/api/branches/${branchId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.message || 'Failed to update branch');
  }

  return res.json();
}

// Usage
updateBranch('123', {
  branches: 'Обновленное название',
  address: 'Новый адрес',
  phoneNumber: '+996700999888',
  isActive: true,
  accountID: 'ACC-NEW-123'
}, '<TOKEN>')
  .then(r => console.log('Updated', r.data))
  .catch(e => console.error(e));
```

Замечания
---
- Поле `accountID` важно для интеграций с внешними сервисами (например, WhatsApp). После обновления `accountID` убедитесь, что связанные внешние системы настроены для работы с новым идентификатором.
- Если ваш frontend использует локальный кэш (React Query, SWR), инвалидация кэша после успешного обновления обязательна.
- Если необходимо частичное обновление (PATCH semantics), обсудите с backend командой возможность реализации `PATCH /api/branches/:id`.
