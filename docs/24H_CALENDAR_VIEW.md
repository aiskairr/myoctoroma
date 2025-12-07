# 24-часовой режим отображения календаря

## Дата: 2025-12-05

## Описание функции

Добавлена поддержка 24-часового режима отображения календаря для филиалов. Режим переключается кнопкой в интерфейсе и сохраняется на бэкенд в поле `view24h`.

## Как это работает

### 1. UI Переключатель

Кнопка переключения режима доступна в **обоих** версиях:

**Десктоп:**
- Расположена рядом с кнопкой "Отменённые" в шапке календаря
- Показывает "24 часа" (фиолетовая) или "7:00-24:00" (серая)

**Мобильная версия:**
- Расположена рядом с кнопкой "Сегодня"
- Компактный вид: "24ч" или "7-24"

### 2. Сохранение на бэкенд

При нажатии кнопки отправляется запрос:

```http
PUT /api/branches/{branchId}
Content-Type: application/json

{
    "view24h": true
}
```

Настройка сохраняется и будет восстановлена при перезагрузке страницы или повторном входе.

### 3. Настройки филиала

В интерфейсе `Branch` поле `view24h`:

```typescript
// src/contexts/BranchContext.tsx
interface Branch {
    id: number;
    name: string;
    accountId?: string;
    view24h?: boolean;  // Режим 24-часового отображения
    // ... другие поля
}
```

### 4. Генерация временных слотов

Два режима генерации слотов:

**Стандартный режим (view24h: false)**
- 07:00 - 24:00 (68 слотов по 15 минут)

**24-часовой режим (view24h: true)**
- 00:00 - 23:59 (96 слотов по 15 минут)

## Код реализации

### Мутация для сохранения

```typescript
const updateView24hMutation = useMutation({
    mutationFn: async (view24h: boolean) => {
        if (!currentBranch?.id) throw new Error('Филиал не выбран');
        
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/branches/${currentBranch.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ view24h })
        });

        if (!response.ok) {
            throw new Error('Ошибка при сохранении настройки');
        }
        
        return response.json();
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/crm/branches'] });
        toast({
            title: 'Успешно',
            description: is24hMode ? 'Включен 24-часовой режим' : 'Включен дневной режим',
        });
    },
    onError: () => {
        setIs24hMode(!is24hMode); // Откат при ошибке
        toast({
            title: 'Ошибка',
            description: 'Не удалось сохранить настройку',
            variant: 'destructive',
        });
    }
});
```

### Функция переключения

```typescript
const handleToggle24hMode = useCallback(() => {
    const newValue = !is24hMode;
    setIs24hMode(newValue);
    updateView24hMutation.mutate(newValue);
}, [is24hMode, updateView24hMutation]);
```

## Изменённые файлы

| Файл | Изменения |
|------|-----------|
| `src/contexts/BranchContext.tsx` | Добавлено поле `view24h?: boolean` в интерфейс Branch |
| `src/pages/Calendar/components/time-schedule.tsx` | Добавлены: функция `generateTimeSlots24h()`, состояние `is24hMode`, мутация `updateView24hMutation`, кнопки для десктоп и мобайл |
| `src/pages/Calendar/components/task-dialog-btn.tsx` | Обновлена генерация временных слотов |

## API требования

Бэкенд должен:
1. Поддерживать поле `view24h` в модели филиала
2. Принимать PUT запрос на `/api/branches/{branchId}` с `{ view24h: boolean }`
3. Возвращать `view24h` в ответе GET `/api/crm/branches`

## Пример визуального отличия

### Стандартный режим (7:00-24:00)
```
07:00
07:15
07:30
...
23:45
```

### 24-часовой режим (00:00-23:59)
```
00:00
00:15
00:30
...
23:45
```

## Деплой

```bash
npm run build
scp -r dist/* root@31.3.216.148:/var/www/promconsult.pro/
```

## Очистка кэша

```javascript
caches.keys().then(keys => Promise.all(keys.map(key => caches.delete(key)))).then(() => navigator.serviceWorker.getRegistrations()).then(regs => Promise.all(regs.map(reg => reg.unregister()))).then(() => location.reload(true));
```
