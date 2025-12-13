# 🚀 НАЧНИТЕ ЗДЕСЬ - Dual Backend Setup

> **Проект успешно настроен для работы с двумя бэкендами одновременно!**

---

## 🎯 Что было сделано?

Ваш проект теперь поддерживает **2 бэкенда одновременно** без конфликтов:

1. **Primary Backend** (основной) - `https://lesser-felicdad-promconsulting-79f07228.koyeb.app`
2. **Secondary Backend** (вторичный) - `https://octobackend.com/api/main/`

---

## ⚡ Быстрый старт (2 минуты)

```bash
# 1. Запустите проект
npm run dev

# 2. Откройте браузер (обычно http://localhost:5173)

# 3. Откройте консоль браузера (F12) и проверьте:
console.log(import.meta.env.VITE_BACKEND_URL);
console.log(import.meta.env.VITE_SECONDARY_BACKEND_URL);
```

**Ожидаемый результат:**
```
https://lesser-felicdad-promconsulting-79f07228.koyeb.app
https://octobackend.com/api/main/
```

---

## 📚 Документация (читайте по порядку)

### Для быстрого старта:
1. **[QUICK_START.md](./QUICK_START.md)** ⚡ - Начните здесь! (5 мин)
2. **[README_DUAL_BACKEND.md](./README_DUAL_BACKEND.md)** 📘 - Главная документация (10 мин)

### Для детального изучения:
3. **[BACKEND_CONFIGURATION.md](./BACKEND_CONFIGURATION.md)** 📖 - Подробная конфигурация
4. **[API_ENDPOINTS_MAPPING.md](./API_ENDPOINTS_MAPPING.md)** 📋 - Список всех API
5. **[MIGRATION_COMPARISON.md](./MIGRATION_COMPARISON.md)** 📊 - До/После сравнение

### Для тестирования:
6. **[TEST_CHECKLIST.md](./TEST_CHECKLIST.md)** ✅ - Полный чеклист тестов
7. **[DUAL_BACKEND_SETUP_SUMMARY.md](./DUAL_BACKEND_SETUP_SUMMARY.md)** 📝 - Краткое резюме

---

## 💡 Примеры использования

### Вариант 1: Helper функции (рекомендуется)

```typescript
import { apiGetJson, apiPostJson } from '@/API/http';

// Primary Backend (по умолчанию)
const tasks = await apiGetJson('/api/tasks');

// Secondary Backend
const tasks = await apiGetJson('/api/tasks', true); // true = secondary

// POST запрос
const result = await apiPostJson('/api/tasks', taskData);
const result2 = await apiPostJson('/api/tasks', taskData, true); // secondary
```

### Вариант 2: Axios instances

```typescript
import $api, { $apiSecondary } from '@/API/http';

// Primary Backend
const response = await $api.get('/api/tasks');

// Secondary Backend
const response = await $apiSecondary.get('/api/tasks');
```

### Вариант 3: Создание URL

```typescript
import { createApiUrl } from '@/API/http';

const primaryUrl = createApiUrl('/api/tasks');        // Primary
const secondaryUrl = createApiUrl('/api/tasks', true); // Secondary

const response = await fetch(primaryUrl, { credentials: 'include' });
```

---

## ✅ Проверка установки

Запустите скрипт проверки:

```bash
./verify-setup.sh
```

Должны увидеть: **✅ ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ!**

---

## 🔧 Измененные файлы

```
✅ .env                        → Добавлены URL обоих бэкендов
✅ src/API/http.ts             → Создано 2 API instance + helper функции
✅ src/services/task-parser.ts → Использует createApiUrl
```

---

## 🎁 Что нового?

### Новые API instances
- `$api` / `$apiPrimary` - для Primary Backend
- `$apiSecondary` - для Secondary Backend

### Helper функции
- `createApiUrl(endpoint, useSecondary?)` - создание URL
- `apiGetJson(endpoint, useSecondary?)` - GET запрос
- `apiPostJson(endpoint, data, useSecondary?)` - POST запрос
- `apiPatchJson(endpoint, data, useSecondary?)` - PATCH запрос
- `apiDelete(endpoint, useSecondary?)` - DELETE запрос

### Константы
- `PRIMARY_BACKEND_URL` - URL Primary Backend
- `SECONDARY_BACKEND_URL` - URL Secondary Backend

---

## 🔄 Обратная совместимость

**100% обратная совместимость!** Весь существующий код работает без изменений:

```typescript
// Старый код продолжит работать
const url = `${import.meta.env.VITE_BACKEND_URL}/api/tasks`;
const response = await fetch(url, { credentials: 'include' });
```

Теперь `VITE_BACKEND_URL` указывает на новый Primary Backend.

---

## 🧪 Быстрый тест

Откройте консоль браузера (F12) и выполните:

```javascript
// Тест Primary Backend
fetch('https://lesser-felicdad-promconsulting-79f07228.koyeb.app/api/tasks?branchId=1', 
  { credentials: 'include' })
  .then(r => r.json())
  .then(d => console.log('✅ Primary:', d))
  .catch(e => console.error('❌ Error:', e));

// Тест Secondary Backend
fetch('https://octobackend.com/api/main//api/tasks?branchId=1', 
  { credentials: 'include' })
  .then(r => r.json())
  .then(d => console.log('✅ Secondary:', d))
  .catch(e => console.error('❌ Error:', e));
```

---

## 📞 Нужна помощь?

1. **Проблемы с запуском?** → Читайте [QUICK_START.md](./QUICK_START.md)
2. **Вопросы по API?** → Читайте [API_ENDPOINTS_MAPPING.md](./API_ENDPOINTS_MAPPING.md)
3. **Как тестировать?** → Читайте [TEST_CHECKLIST.md](./TEST_CHECKLIST.md)
4. **Troubleshooting** → Читайте [BACKEND_CONFIGURATION.md](./BACKEND_CONFIGURATION.md#troubleshooting)

---

## 🎉 Готово!

Ваш проект готов к работе с двумя бэкендами!

**Следующие шаги:**
1. ✅ Запустите `npm run dev`
2. ✅ Протестируйте основной функционал
3. ✅ Прочитайте документацию по ссылкам выше

---

**Версия:** 1.0  
**Дата:** 21 октября 2025  
**Статус:** ✅ Готово к использованию

---

> 💡 **Совет:** Добавьте этот файл в закладки браузера для быстрого доступа к документации!
