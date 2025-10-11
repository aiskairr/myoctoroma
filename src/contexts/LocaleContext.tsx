import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Locale = 'ru' | 'ky' | 'en';

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

// Словари переводов
const translations = {
  ru: {
    // Общие
    'common.back': 'Назад',
    'common.next': 'Далее',
    'common.confirm': 'Подтвердить',
    'common.cancel': 'Отменить',
    'common.close': 'Закрыть',
    'common.save': 'Сохранить',
    'common.edit': 'Редактировать',
    'common.delete': 'Удалить',
    'common.loading': 'Загрузка...',
    'common.error': 'Ошибка',
    'common.success': 'Успешно',

    // Шаги бронирования
    'booking.title': 'Онлайн запись',
    'booking.subtitle': 'Выберите удобное время для визита',
    'booking.step.branch': 'Выбор филиала',
    'booking.step.service': 'Выбор услуги',
    'booking.step.date': 'Выбор даты',
    'booking.step.master': 'Выбор мастера',
    'booking.step.time': 'Выбор времени',
    'booking.step.contacts': 'Ваши контакты',
    'booking.step.confirmation': 'Подтверждение',

    // Филиалы
    'booking.branch.title': 'Выберите филиал',
    'booking.branch.subtitle': 'Где вам удобнее?',
    'booking.branch.address': 'Адрес',

    // Услуги
    'booking.service.title': 'Выберите услугу',
    'booking.service.subtitle': 'Что будем делать?',
    'booking.service.price': 'от',
    'booking.service.duration': 'мин',

    // Мастера
    'booking.master.title': 'Выберите мастера',
    'booking.master.subtitle': 'Кто будет вас обслуживать?',
    'booking.master.any': 'Любой доступный мастер',
    'booking.master.experience': 'Опыт работы',
    'booking.master.years': 'лет',

    // Время
    'booking.time.title': 'Выберите время',
    'booking.time.subtitle': 'Когда вам удобно?',
    'booking.time.available': 'Свободное время',
    'booking.time.select_date': 'Выберите дату',
    'booking.time.no_slots': 'На выбранную дату нет свободного времени',
    'booking.time.try_another': 'Попробуйте выбрать другую дату',

    // Контакты
    'booking.contacts.title': 'Ваши контакты',
    'booking.contacts.subtitle': 'Почти готово!',
    'booking.contacts.name': 'Ваше имя',
    'booking.contacts.name_placeholder': 'Иван Иванов',
    'booking.contacts.phone': 'Номер телефона',
    'booking.contacts.phone_placeholder': '+996 XXX XXX XXX',
    'booking.contacts.phone_error': 'Введите корректный номер',
    'booking.contacts.submit': 'Подтвердить запись',
    'booking.contacts.creating': 'Создание записи...',

    // Подтверждение
    'booking.confirmation.title': 'Готово!',
    'booking.confirmation.subtitle': 'Ваша запись успешно создана',
    'booking.confirmation.master': 'Мастер',
    'booking.confirmation.branch': 'Филиал',
    'booking.confirmation.date': 'Дата и время',
    'booking.confirmation.new_booking': 'Создать новую запись',

    // Дни недели
    'days.monday': 'Понедельник',
    'days.tuesday': 'Вторник', 
    'days.wednesday': 'Среда',
    'days.thursday': 'Четверг',
    'days.friday': 'Пятница',
    'days.saturday': 'Суббота',
    'days.sunday': 'Воскресенье',

    // Месяца
    'months.january': 'Январь',
    'months.february': 'Февраль',
    'months.march': 'Март',
    'months.april': 'Апрель',
    'months.may': 'Май',
    'months.june': 'Июнь',
    'months.july': 'Июль',
    'months.august': 'Август',
    'months.september': 'Сентябрь',
    'months.october': 'Октябрь',
    'months.november': 'Ноябрь',
    'months.december': 'Декабрь',

    // Интерфейс времени
    'booking.time.appointment_date': 'Дата записи',
    'booking.time.selected': 'Выбрано',
    'booking.time.working_hours': 'Рабочие часы',
    'booking.time.slots_found': 'Найдено {count} доступных вариантов для записи',
    'booking.time.scroll_hint': 'Листайте для просмотра всех слотов',
    'booking.time.today': 'Сегодня',
    'booking.time.tomorrow': 'Завтра',
    'booking.time.select_date_title': 'Выберите дату',
    'booking.time.select_date_subtitle': 'Когда вам удобно записаться?',

    // Мессенджер
    'messenger.title': 'AI Консультант ElitAroma',
    'messenger.subtitle': 'Задайте вопрос о наших услугах или запишитесь на процедуру',
    'messenger.welcome.title': 'Добро пожаловать в ElitAroma!',
    'messenger.welcome.description': 'Я ваш AI-консультант. Задайте любой вопрос о наших услугах массажа, ценах или запишитесь на процедуру. Также можете отправить фото или файл.',
    'messenger.input.placeholder': 'Введите ваше сообщение...',
    'messenger.send': 'Отправить',
    'messenger.attach': 'Прикрепить файл',
    'messenger.file_selected': 'Выбран файл: {filename}',
    'messenger.formats_hint': 'Поддерживаемые форматы: JPG, PNG, GIF, MP3, WAV, PDF, TXT (до 10MB)',
    'messenger.config_error': 'Ошибка конфигурации',
    'messenger.org_required': 'organisationId обязателен для работы мессенджера',
    'messenger.loading': 'Отправка...',
  },

  ky: {
    // Общие
    'common.back': 'Артка',
    'common.next': 'Кийинки',
    'common.confirm': 'Ырастоо',
    'common.cancel': 'Жокко чыгаруу',
    'common.close': 'Жабуу',
    'common.save': 'Сактоо',
    'common.edit': 'Түзөтүү',
    'common.delete': 'Өчүрүү',
    'common.loading': 'Жүктөлүүдө...',
    'common.error': 'Ката',
    'common.success': 'Ийгиликтүү',

    // Шаги бронирования
    'booking.title': 'Онлайн жазылуу',
    'booking.subtitle': 'Баруу үчүн ыңгайлуу убакытты тандаңыз',
    'booking.step.branch': 'Филиал тандоо',
    'booking.step.service': 'Кызмат тандоо',
    'booking.step.date': 'Күн тандоо',
    'booking.step.master': 'Мастер тандоо',
    'booking.step.time': 'Убакыт тандоо',
    'booking.step.contacts': 'Сиздин байланыштар',
    'booking.step.confirmation': 'Ырастоо',

    // Филиалы
    'booking.branch.title': 'Филиал тандаңыз',
    'booking.branch.subtitle': 'Кайда ыңгайлуу?',
    'booking.branch.address': 'Дарек',

    // Услуги
    'booking.service.title': 'Кызмат тандаңыз',
    'booking.service.subtitle': 'Эмне кылабыз?',
    'booking.service.price': 'башталган',
    'booking.service.duration': 'мүн',

    // Мастера
    'booking.master.title': 'Мастер тандаңыз',
    'booking.master.subtitle': 'Ким сизди тейлейт?',
    'booking.master.any': 'Каалаган мастер',
    'booking.master.experience': 'Иштөө тажрыйбасы',
    'booking.master.years': 'жыл',

    // Время
    'booking.time.title': 'Убакытты тандаңыз',
    'booking.time.subtitle': 'Качан ыңгайлуу?',
    'booking.time.available': 'Бош убакыт',
    'booking.time.select_date': 'Күндү тандаңыз',
    'booking.time.no_slots': 'Тандалган күнгө бош убакыт жок',
    'booking.time.try_another': 'Башка күндү тандап көрүңүз',

    // Контакты
    'booking.contacts.title': 'Сиздин байланыштар',
    'booking.contacts.subtitle': 'Дээрлик даяр!',
    'booking.contacts.name': 'Сиздин атыңыз',
    'booking.contacts.name_placeholder': 'Иван Иванов',
    'booking.contacts.phone': 'Телефон номери',
    'booking.contacts.phone_placeholder': '+996 XXX XXX XXX',
    'booking.contacts.phone_error': 'Туура номер киргизиңиз',
    'booking.contacts.submit': 'Жазылууну ырастоо',
    'booking.contacts.creating': 'Жазылуу түзүлүүдө...',

    // Подтверждение
    'booking.confirmation.title': 'Даяр!',
    'booking.confirmation.subtitle': 'Сиздин жазылуу ийгиликтүү түзүлдү',
    'booking.confirmation.master': 'Мастер',
    'booking.confirmation.branch': 'Филиал',
    'booking.confirmation.date': 'Күнү жана убакыт',
    'booking.confirmation.new_booking': 'Жаңы жазылуу түзүү',

    // Дни недели
    'days.monday': 'Дүйшөмбү',
    'days.tuesday': 'Шейшемби',
    'days.wednesday': 'Шаршемби',
    'days.thursday': 'Бейшемби',
    'days.friday': 'Жума',
    'days.saturday': 'Ишемби',
    'days.sunday': 'Жекшемби',

    // Месяца
    'months.january': 'Январь',
    'months.february': 'Февраль',
    'months.march': 'Март',
    'months.april': 'Апрель',
    'months.may': 'Май',
    'months.june': 'Июнь',
    'months.july': 'Июль',
    'months.august': 'Август',
    'months.september': 'Сентябрь',
    'months.october': 'Октябрь',
    'months.november': 'Ноябрь',
    'months.december': 'Декабрь',

    // Интерфейс времени
    'booking.time.appointment_date': 'Жазылуу күнү',
    'booking.time.selected': 'Тандалган',
    'booking.time.working_hours': 'Иштөө сааттары',
    'booking.time.slots_found': '{count} жеткиликтүү вариант табылды',
    'booking.time.scroll_hint': 'Бардык убакыттарды көрүү үчүн сүйрөңүз',
    'booking.time.today': 'Бүгүн',
    'booking.time.tomorrow': 'Эртең',
    'booking.time.select_date_title': 'Күндү тандаңыз',
    'booking.time.select_date_subtitle': 'Качан жазылууну каалайсыз?',

    // Мессенджер
    'messenger.title': 'AI Консультант ElitAroma',
    'messenger.subtitle': 'Биздин кызматтар жөнүндө суроо бериңиз же процедурага жазылыңыз',
    'messenger.welcome.title': 'ElitAroma\'га кош келиңиз!',
    'messenger.welcome.description': 'Мен сиздин AI-консультантыңызмын. Массаж кызматтарыбыз, баалар же процедурага жазылуу жөнүндө каалаган суроону бериңиз. Ошондой эле сүрөт же файл жөнөтө аласыз.',
    'messenger.input.placeholder': 'Билдирүүңүздү киргизиңиз...',
    'messenger.send': 'Жөнөтүү',
    'messenger.attach': 'Файл тиркөө',
    'messenger.file_selected': 'Файл тандалды: {filename}',
    'messenger.formats_hint': 'Колдоого алынган форматтар: JPG, PNG, GIF, MP3, WAV, PDF, TXT (10MB чейин)',
    'messenger.config_error': 'Конфигурация катасы',
    'messenger.org_required': 'Мессенджердин иштеши үчүн organisationId милдеттүү',
    'messenger.loading': 'Жөнөтүлүүдө...',
  },

  en: {
    // Общие
    'common.back': 'Back',
    'common.next': 'Next',
    'common.confirm': 'Confirm',
    'common.cancel': 'Cancel',
    'common.close': 'Close',
    'common.save': 'Save',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',

    // Шаги бронирования
    'booking.title': 'Online Booking',
    'booking.subtitle': 'Choose a convenient time to visit',
    'booking.step.branch': 'Choose Branch',
    'booking.step.service': 'Choose Service',
    'booking.step.date': 'Choose Date',
    'booking.step.master': 'Choose Master',
    'booking.step.time': 'Choose Time',
    'booking.step.contacts': 'Your Contacts',
    'booking.step.confirmation': 'Confirmation',

    // Филиалы
    'booking.branch.title': 'Choose a branch',
    'booking.branch.subtitle': 'Where is convenient for you?',
    'booking.branch.address': 'Address',

    // Услуги
    'booking.service.title': 'Choose a service',
    'booking.service.subtitle': 'What would you like to do?',
    'booking.service.price': 'from',
    'booking.service.duration': 'min',

    // Мастера
    'booking.master.title': 'Choose a master',
    'booking.master.subtitle': 'Who will serve you?',
    'booking.master.any': 'Any available master',
    'booking.master.experience': 'Work experience',
    'booking.master.years': 'years',

    // Время
    'booking.time.title': 'Choose time',
    'booking.time.subtitle': 'When is convenient for you?',
    'booking.time.available': 'Available time',
    'booking.time.select_date': 'Select date',
    'booking.time.no_slots': 'No available time slots for the selected date',
    'booking.time.try_another': 'Try selecting another date',

    // Контакты
    'booking.contacts.title': 'Your contacts',
    'booking.contacts.subtitle': 'Almost done!',
    'booking.contacts.name': 'Your name',
    'booking.contacts.name_placeholder': 'John Doe',
    'booking.contacts.phone': 'Phone number',
    'booking.contacts.phone_placeholder': '+996 XXX XXX XXX',
    'booking.contacts.phone_error': 'Enter a valid number',
    'booking.contacts.submit': 'Confirm booking',
    'booking.contacts.creating': 'Creating booking...',

    // Подтверждение
    'booking.confirmation.title': 'Done!',
    'booking.confirmation.subtitle': 'Your booking has been successfully created',
    'booking.confirmation.master': 'Master',
    'booking.confirmation.branch': 'Branch',
    'booking.confirmation.date': 'Date and time',
    'booking.confirmation.new_booking': 'Create new booking',

    // Дни недели
    'days.monday': 'Monday',
    'days.tuesday': 'Tuesday',
    'days.wednesday': 'Wednesday',
    'days.thursday': 'Thursday',
    'days.friday': 'Friday',
    'days.saturday': 'Saturday',
    'days.sunday': 'Sunday',

    // Месяца
    'months.january': 'January',
    'months.february': 'February',
    'months.march': 'March',
    'months.april': 'April',
    'months.may': 'May',
    'months.june': 'June',
    'months.july': 'July',
    'months.august': 'August',
    'months.september': 'September',
    'months.october': 'October',
    'months.november': 'November',
    'months.december': 'December',

    // Интерфейс времени
    'booking.time.appointment_date': 'Appointment Date',
    'booking.time.selected': 'Selected',
    'booking.time.working_hours': 'Working Hours',
    'booking.time.slots_found': 'Found {count} available booking options',
    'booking.time.scroll_hint': 'Scroll to view all time slots',
    'booking.time.today': 'Today',
    'booking.time.tomorrow': 'Tomorrow',
    'booking.time.select_date_title': 'Select Date',
    'booking.time.select_date_subtitle': 'When would you like to book?',

    // Мессенджер
    'messenger.title': 'AI Consultant ElitAroma',
    'messenger.subtitle': 'Ask about our services or book a procedure',
    'messenger.welcome.title': 'Welcome to ElitAroma!',
    'messenger.welcome.description': 'I am your AI consultant. Ask any question about our massage services, prices or book a procedure. You can also send photos or files.',
    'messenger.input.placeholder': 'Enter your message...',
    'messenger.send': 'Send',
    'messenger.attach': 'Attach file',
    'messenger.file_selected': 'File selected: {filename}',
    'messenger.formats_hint': 'Supported formats: JPG, PNG, GIF, MP3, WAV, PDF, TXT (up to 10MB)',
    'messenger.config_error': 'Configuration error',
    'messenger.org_required': 'organisationId is required for messenger to work',
    'messenger.loading': 'Sending...',
  },
};

interface LocaleProviderProps {
  children: ReactNode;
}

export const LocaleProvider: React.FC<LocaleProviderProps> = ({ children }) => {
  const [locale, setLocale] = useState<Locale>(() => {
    const saved = localStorage.getItem('booking-locale');
    return (saved as Locale) || 'ru';
  });

  useEffect(() => {
    localStorage.setItem('booking-locale', locale);
  }, [locale]);

  const t = (key: string): string => {
    return (translations[locale] as any)[key] || key;
  };

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
};

export const useLocale = (): LocaleContextType => {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
};
