# Новая страница SettingsMasters для мастеров

## Описание
Реализована новая страница `SettingsMasters` для мастеров, доступная по маршруту `/master/settings`. Страница содержит только окно обновления профиля пользователя с возможностью изменения email и пароля.

## Что было изменено

### 1. Создание новой страницы `SettingsMasters.tsx`
**Файл:** `src/pages/SettingsMasters.tsx`

Страница содержит:
- Окно "Профиль пользователя"
- Отображение текущего email мастера
- Поле для ввода нового email
- Поле для ввода нового пароля
- Поле подтверждения пароля
- Кнопку "Обновить профиль"

Функциональность:
- Отправляет PUT запрос на `/api/users/profile` с новым email/паролем
- Валидирует совпадение паролей
- Показывает уведомления об успехе/ошибке
- Очищает форму после успешного обновления

### 2. Добавление маршрута в `App.tsx`
**Файл:** `src/App.tsx`

Добавлены:
- Импорт компонента `SettingsMasters`
- Новый маршрут `/master/settings` с использованием защищённого layout

```tsx
<Route path="/master/settings">
  <ProtectedLayout>
    <SettingsMasters />
  </ProtectedLayout>
</Route>
```

### 3. Добавление кнопки в MasterSidebar
**Файл:** `src/components/Sidebar.tsx`

В компоненте `MasterSidebar`:
- Добавлена вторая кнопка "Настройки" в навигационное меню
- Кнопка ведёт на маршрут `/master/settings`
- Кнопка активируется при наличии правильного пути
- Используется тот же стиль как и кнопка "Календарь"

```tsx
<Button
  variant={location === "/master/settings" ? "secondary" : "ghost"}
  className={...}
  onClick={() => setLocation("/master/settings")}
>
  <SettingsIcon className="h-5 w-5 shrink-0" />
  <span className="ml-3 font-medium">{t('sidebar.settings')}</span>
</Button>
```

### 4. Ограничение доступа в классической странице Settings
**Файл:** `src/pages/Settings.tsx`

Добавлена проверка роли пользователя:
- Если пользователь имеет роль `master`, то видит сообщение "Доступ ограничен"
- Сообщение указывает использовать раздел "Настройки" в главном меню
- Администраторы видят обычную страницу со всеми возможностями

```tsx
if (user?.role === 'master') {
  return (
    <div className="p-6">
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-700">Доступ ограничен</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">
            Эта страница недоступна для мастеров. Используйте раздел "Настройки" в главном меню.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

## Локализация
Используются существующие ключи локализации:
- `sidebar.settings` - "Настройки"
- `settings.profile_title` - "Профиль пользователя"
- `settings.profile_description` - "Обновление email и пароля"
- `settings.current_email` - "Текущий email:"
- `settings.new_email_label` - "Новый email"
- `settings.new_email_placeholder` - "newemail@example.com"
- `settings.new_password_label` - "Новый пароль"
- `settings.new_password_placeholder` - "Введите новый пароль"
- `settings.confirm_password_label` - "Подтвердите пароль"
- `settings.update_profile_button` - "Обновить профиль"
- И другие...

## Структура навигации

### Для мастеров:
- Календарь → `/master/calendar`
- **Настройки** → `/master/settings` (НОВОЕ)
- Выход

### Для администраторов:
- Страница остаётся без изменений
- Обычный доступ к классической странице `/settings`

## Важное примечание о порядке маршрутов

⚠️ **Критически важно:** В файле `App.tsx` более специфичные маршруты (например `/master/settings` и `/master/calendar`) должны быть расположены **ПЕРЕД** менее специфичными (`/settings`, `/crm/calendar`).

Это необходимо, потому что роутер `wouter` использует простое сравнение строк и может перехватить неправильный маршрут, если он расположен раньше. 

**Правильный порядок:**
```tsx
<Route path="/master/settings">...</Route>  // специфичный
<Route path="/settings">...</Route>         // общий

<Route path="/master/calendar">...</Route>  // специфичный  
<Route path="/crm/calendar">...</Route>     // менее специфичный
```

## API Интеграция
Компонент `SettingsMasters` использует:
- **Endpoint:** `PUT /api/users/profile`
- **Метод:** PUT
- **Headers:** 
  - `Content-Type: application/json`
  - `Authorization: Bearer {token}`
- **Body:**
  ```json
  {
    "email": "new@example.com",      // опционально
    "password": "newpassword"         // опционально
  }
  ```

## Тестирование

1. Войдите в приложение с аккаунтом мастера
2. В боковой панели нажмите "Настройки"
3. Заполните поля нового email и/или пароля
4. Нажмите "Обновить профиль"
5. Должно появиться уведомление об успехе/ошибке

6. Если администратор попытается посетить `/master/settings` - будет ошибка (т.к. он не может войти как мастер)
7. Если мастер попытается посетить `/settings` - видит сообщение "Доступ ограничен"

## Файлы, затронутые в изменении

1. `/src/pages/SettingsMasters.tsx` - новая страница
2. `/src/App.tsx` - добавление маршрута
3. `/src/components/Sidebar.tsx` - добавление кнопки в MasterSidebar
4. `/src/pages/Settings.tsx` - добавление проверки роли
