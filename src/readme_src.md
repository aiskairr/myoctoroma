Workspace
(rerun without)
Collecting workspace information

Вот краткая документация по структуре вашей папки src:

Основные файлы
App.tsx: Главный компонент приложения, точка входа для роутинга и layout.
main.tsx: Инициализация React-приложения.
index.css, App.css: Глобальные стили.
Каталоги
components
Переиспользуемые UI-компоненты и виджеты:

UI-библиотека: components/ui/ — кнопки, инпуты, диалоги, таблицы и др.
Кастомные компоненты: Sidebar.tsx, BranchSelector.tsx, DailyCashReport.tsx, MasterWorkingDatesManager.tsx и др.
Календарные компоненты: calendar/AppointmentDialog.tsx, calendar/AppointmentItem.tsx.
contexts
Контексты React для глобального состояния:

AuthContext.tsx: Аутентификация.
BranchContext.tsx: Выбранный филиал.
SimpleAuthContext.tsx: Простая авторизация.
hooks
Пользовательские хуки:

use-branch-filter.ts: Фильтрация данных по филиалу.
use-admin-role.tsx: Проверка роли администратора.
use-master-role.tsx: Проверка роли мастера.
use-mobile.tsx: Адаптация под мобильные устройства.
use-toast.ts: Уведомления.
lib
Вспомогательные библиотеки:

queryClient.ts: Настройка react-query.
utils.ts: Утилиты.
pages
Страницы приложения:

Dashboard.tsx: Главная панель.
DailyCalendar.tsx: Календарь записей.
Masters.tsx: Управление мастерами.
Clients.tsx: Список клиентов.
AccountingPage.tsx: Бухгалтерия.
ReportPage.tsx: Отчеты.
CRMTasks.tsx: Задачи CRM.
Booking.tsx: Онлайн-бронирование.
Settings.tsx: Настройки.
Мобильные страницы: MobileApp.tsx, MobileMasterCalendar.tsx.
services
Сервисные модули для работы с API:

calendar-service.ts: Работа с календарем и записями.
accounting-service.ts: Работа с бухгалтерией.
expense-service.ts: Работа с расходами.
gift-certificate-service.ts: Работа с сертификатами.
Рекомендация:
Для подробной информации по каждому компоненту или сервису — откройте соответствующий файл, например DailyCalendar.tsx или calendar-service.ts