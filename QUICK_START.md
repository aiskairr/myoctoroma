# 🚀 Quick Start - Dual Backend Setup

## Проверка установки

### 1. Проверьте файлы конфигурации

```bash
# Проверьте .env файл
cat .env
```

Должны видеть:
```
VITE_BACKEND_URL=https://lesser-felicdad-promconsulting-79f07228.koyeb.app
VITE_SECONDARY_BACKEND_URL=https://scattered-ermentrude-promconsulting-23cbccde.koyeb.app
```

### 2. Запустите dev сервер

```bash
npm run dev
```

### 3. Проверьте в браузере

Откройте консоль браузера (F12) и выполните:

```javascript
// Проверка URL бэкендов
console.log('Primary Backend:', import.meta.env.VITE_BACKEND_URL);
console.log('Secondary Backend:', import.meta.env.VITE_SECONDARY_BACKEND_URL);
```

### 4. Тест API вызовов

#### Тест 1: Primary Backend (по умолчанию)
```javascript
// В консоли браузера
import { apiGetJson } from './src/API/http.ts';

// Запрос к primary backend
apiGetJson('/api/tasks')
  .then(data => console.log('✅ Primary Backend работает:', data))
  .catch(err => console.error('❌ Ошибка:', err));
```

#### Тест 2: Secondary Backend
```javascript
// В консоли браузера
import { apiGetJson } from './src/API/http.ts';

// Запрос к secondary backend (второй параметр = true)
apiGetJson('/api/tasks', true)
  .then(data => console.log('✅ Secondary Backend работает:', data))
  .catch(err => console.error('❌ Ошибка:', err));
```

## Примеры использования

### Пример 1: Получение задач с Primary Backend

```typescript
import { apiGetJson } from '@/API/http';

async function getTasks() {
  try {
    const tasks = await apiGetJson('/api/tasks');
    console.log('Задачи:', tasks);
  } catch (error) {
    console.error('Ошибка получения задач:', error);
  }
}

getTasks();
```

### Пример 2: Получение задач с Secondary Backend

```typescript
import { apiGetJson } from '@/API/http';

async function getTasksFromSecondary() {
  try {
    const tasks = await apiGetJson('/api/tasks', true); // true = secondary
    console.log('Задачи со второго бэкенда:', tasks);
  } catch (error) {
    console.error('Ошибка:', error);
  }
}

getTasksFromSecondary();
```

### Пример 3: Использование Task Parser

```typescript
import { taskParserService } from '@/services/task-parser';

// С Primary Backend (по умолчанию)
taskParserService.start();

// С Secondary Backend
taskParserService.stop(); // остановить текущий
taskParserService.start({}, true); // запустить с secondary backend
```

### Пример 4: Создание новой задачи

```typescript
import { apiPostJson } from '@/API/http';

async function createTask() {
  const newTask = {
    clientId: 123,
    status: 'pending',
    serviceType: 'haircut',
    scheduleDate: '2025-10-22',
    scheduleTime: '14:00',
    branchId: '1'
  };

  try {
    // Отправка на Primary Backend
    const result = await apiPostJson('/api/tasks', newTask);
    console.log('✅ Задача создана:', result);
    
    // Или на Secondary Backend
    // const result = await apiPostJson('/api/tasks', newTask, true);
  } catch (error) {
    console.error('❌ Ошибка создания задачи:', error);
  }
}
```

## Проверка Network запросов

1. Откройте DevTools (F12)
2. Перейдите на вкладку **Network**
3. Выполните любой API запрос в приложении
4. Проверьте URL запроса:
   - Должен начинаться с `https://lesser-felicdad-promconsulting-79f07228.koyeb.app` (Primary)
   - Или с `https://scattered-ermentrude-promconsulting-23cbccde.koyeb.app` (Secondary)

## Troubleshooting

### Проблема: "import.meta.env.VITE_BACKEND_URL is undefined"

**Решение:**
```bash
# Остановите dev сервер (Ctrl+C)
# Перезапустите
npm run dev
```

### Проблема: "CORS error"

**Решение:** Убедитесь, что бэкенды настроены на прием запросов с вашего фронтенд домена.

### Проблема: "404 Not Found"

**Решение:** 
1. Проверьте, что эндпоинт существует на бэкенде
2. Проверьте правильность URL в `.env`
3. Убедитесь, что используете правильный бэкенд (primary или secondary)

### Проблема: Запросы идут на старый бэкенд

**Решение:**
```bash
# Очистите кэш и перезапустите
rm -rf node_modules/.vite
npm run dev
```

## Миграция существующих компонентов (опционально)

Если хотите обновить существующий компонент для использования helper функций:

### Было:
```typescript
const url = `${import.meta.env.VITE_BACKEND_URL}/api/tasks`;
const response = await fetch(url, { credentials: 'include' });
const data = await response.json();
```

### Стало:
```typescript
import { apiGetJson } from '@/API/http';
const data = await apiGetJson('/api/tasks');
```

Это короче и проще! Но миграция **не обязательна** - старый код продолжит работать.

## Полезные команды

```bash
# Запуск dev сервера
npm run dev

# Сборка для продакшена
npm run build

# Проверка TypeScript ошибок
npx tsc --noEmit

# Проверка линтера
npm run lint
```

## Следующие шаги

1. ✅ Запустите проект: `npm run dev`
2. ✅ Откройте в браузере
3. ✅ Проверьте консоль на ошибки
4. ✅ Проверьте Network tab
5. ✅ Протестируйте основные функции приложения

## Дополнительная документация

- 📖 `BACKEND_CONFIGURATION.md` - Полная документация по конфигурации
- 📖 `API_ENDPOINTS_MAPPING.md` - Список всех API эндпоинтов
- 📖 `DUAL_BACKEND_SETUP_SUMMARY.md` - Краткое резюме изменений

---

**Готово!** 🎉 Проект настроен для работы с двумя бэкендами одновременно.
