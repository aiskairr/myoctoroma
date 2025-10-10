# Обработка 504 ошибки для импорта Excel

## Описание изменения

Добавлена специальная обработка HTTP 504 (Gateway Timeout) ошибки для эндпоинта `/api/import/excel`.

## Логика

Когда эндпоинт `https://partial-elfrida-promconsulting-9e3c84f1.koyeb.app/api/import/excel` возвращает статус код 504:

1. **Вместо отображения ошибки** показывается информационное сообщение
2. **Сообщение пользователю**: "Импорт начался, ожидайте 60 мин пока все данные не импортируются."
3. **Тип сообщения**: Информационный toast (не ошибка)

## Изменения в коде

### Файл: `src/pages/Settings.tsx`

**Функция `mutationFn`:**
```typescript
if (!response.ok) {
  if (response.status === 504) {
    // 504 Gateway Timeout означает, что импорт начался
    return { status: 'timeout', message: 'Import started' };
  }
  throw new Error('Ошибка при загрузке файла');
}
```

**Функция `onSuccess`:**
```typescript
// Проверяем, если это timeout (504 ошибка)
if (data && data.status === 'timeout') {
  toast({
    title: "Импорт начался",
    description: "Импорт начался, ожидайте 60 мин пока все данные не импортируются.",
    variant: "default",
  });
  setSelectedFile(null);
  // Reset file input
  const fileInput = document.getElementById('excel-file') as HTMLInputElement;
  if (fileInput) fileInput.value = '';
  return;
}
```

## Результат

- ✅ 504 ошибка не отображается как ошибка
- ✅ Пользователь получает информационное сообщение о начале импорта
- ✅ UI сбрасывается (очищается выбранный файл)
- ✅ Не блокируется последующее использование функции импорта

## Дата изменения
10 октября 2025 г.
