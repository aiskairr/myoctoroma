import { pgTable, text, serial, integer, boolean, timestamp, jsonb, pgEnum, time, date, varchar, decimal, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export interface Schema {
  id: number;
  name: string;
}

// Enum для ролей пользователей
export const userRoleEnum = pgEnum('user_role', [
  'admin',      // Администратор филиала
  'superadmin', // Глобальный администратор
  'master'      // Мастер массажа
]);

// Admin users for the dashboard
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  role: userRoleEnum("role").notNull().default('admin'),
  instanceId: text("instance_id"), // Привязка к филиалу (null для superadmin)
  masterId: integer("master_id"), // Связь с таблицей мастеров для пользователей-мастеров
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  role: true,
  instanceId: true,
  masterId: true,
});

// Telegram clients who interact with the bot
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  telegramId: text("telegram_id").notNull().unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  username: text("username"),
  customName: text("custom_name"),  // Добавляем поле для хранения назначенного имени клиента
  phoneNumber: text("phone_number"), // Добавляем поле для удобного поиска по номеру телефона
  instanceId: text("instance_id"),  // Привязка к филиалу (wa1, wa2, wa3, wa4)
  firstSeenAt: timestamp("first_seen_at").notNull().defaultNow(),
  lastActiveAt: timestamp("last_active_at").notNull().defaultNow(),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertClientSchema = createInsertSchema(clients).pick({
  telegramId: true,
  firstName: true,
  lastName: true,
  username: true,
  customName: true,
  phoneNumber: true,
  instanceId: true,
  isActive: true,
  firstSeenAt: true,
  lastActiveAt: true,
});

// Messages exchanged between clients and the bot
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  content: text("content").notNull(),
  isFromClient: boolean("is_from_client").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  clientId: true,
  content: true,
  isFromClient: true,
  timestamp: true,
});

// Settings for the application
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value"),
});

export const insertSettingSchema = createInsertSchema(settings).pick({
  key: true,
  value: true,
});

// Stats for analytics
export const stats = pgTable("stats", {
  id: serial("id").primaryKey(),
  activeUsers: integer("active_users").notNull().default(0),
  messagesToday: integer("messages_today").notNull().default(0),
  apiUsage: integer("api_usage").notNull().default(0),
  date: timestamp("date").notNull().defaultNow(),
});

// Activity logs for the dashboard
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  telegramId: text("telegram_id"),
  event: text("event").notNull(),
  status: text("status").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const insertActivitySchema = createInsertSchema(activities).pick({
  telegramId: true,
  event: true,
  status: true,
  timestamp: true,
});

// Определяем enum для статусов задач
export const taskStatusEnum = pgEnum('task_status', [
  'new',         // Неразобранные (по умолчанию)
  'scheduled',   // Записан
  'in_progress', // В процессе
  'completed',   // Обслуженные 
  'cancelled',   // Отмененные
  'regular'      // Постоянные
]);

// Определяем enum для статусов оплаты
export const paymentStatusEnum = pgEnum('payment_status', [
  'unpaid',      // Неоплачено (по умолчанию)
  'paid'         // Оплачено
]);

// Таблица для клиентских задач (карточек)
export const clientTasks = pgTable("client_tasks", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  status: taskStatusEnum("status").notNull().default('new'),
  serviceType: text("service_type"), // Вид массажа (для обратной совместимости)
  serviceServiceId: integer("service_service_id"), // Прямая связь с service_services
  scheduleDate: timestamp("schedule_date"), // Желаемая дата
  scheduleTime: text("schedule_time"), // Желаемое время (в текстовом формате для гибкости)
  endTime: text("end_time"), // Время окончания (в формате ISO)
  masterName: text("master_name"), // Имя мастера
  notes: text("notes"), // Дополнительные заметки
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  branchId: text("branch_id"), // Филиал (wa1, wa3, wa4)
  source: text("source"), // Источник задачи (whatsapp, telegram, instagram, manual)
  chatId: text("chat_id"), // ID чата (null для вручную созданных задач)
  serviceDuration: integer("service_duration"), // Длительность массажа в минутах
  servicePrice: integer("service_price"), // Стоимость массажа в сомах
  discount: integer("discount").default(0), // Скидка в процентах
  finalPrice: integer("final_price"), // Итоговая цена после скидки
  mother: integer("mother"), // ID материнской записи для дополнительных услуг
  paymentMethod: text("payment_method"), // Способ оплаты
  adminName: text("admin_name"), // Имя администратора
  paid: paymentStatusEnum("paid").notNull().default('unpaid'), // Статус оплаты
});

export const insertClientTaskSchema = createInsertSchema(clientTasks).pick({
  clientId: true,
  status: true,
  serviceType: true,
  serviceServiceId: true,
  scheduleDate: true,
  scheduleTime: true,
  endTime: true,
  masterName: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  branchId: true,
  source: true,
  chatId: true,
  serviceDuration: true,
  servicePrice: true,
  discount: true,
  finalPrice: true,
  mother: true,
  paymentMethod: true,
  adminName: true,
  paid: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type Setting = typeof settings.$inferSelect;
export type InsertSetting = z.infer<typeof insertSettingSchema>;

export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;

export type Stats = typeof stats.$inferSelect;

export type ClientTask = typeof clientTasks.$inferSelect;
export type InsertClientTask = z.infer<typeof insertClientTaskSchema>;

// Enum для дней недели
export const weekdayEnum = pgEnum('weekday', [
  'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'
]);

// Таблица мастеров для календаря
export const masters = pgTable("masters", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(), // Имя мастера
  specialty: text("specialty"), // Специализация (необязательно)
  description: text("description"), // Описание или краткая биография
  isActive: boolean("is_active").notNull().default(true), // Статус активности
  startWorkHour: text("start_work_hour").default("09:00"), // Начало рабочего дня (по умолчанию 9:00) - DEPRECATED
  endWorkHour: text("end_work_hour").default("20:00"), // Конец рабочего дня (по умолчанию 20:00) - DEPRECATED
  instanceId: text("instance_id"), // Привязка к филиалу (wa1, wa2, wa3, wa4) - DEPRECATED
  schedules: jsonb("schedules").default('[]'), // Расписание работы в формате JSON: [{branch: "wa4", days: ["Mon", "Wed", "Fri"], from: "10:00", to: "14:00"}, ...]
  photoUrl: varchar("photo_url", { length: 255 }), // URL фотографии мастера
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMasterSchema = createInsertSchema(masters).pick({
  name: true,
  specialty: true,
  description: true,
  isActive: true,
  startWorkHour: true,
  endWorkHour: true,
  instanceId: true,
  schedules: true,
});

// Типы для мастеров
export type Master = typeof masters.$inferSelect;
export type InsertMaster = z.infer<typeof insertMasterSchema>;

// Таблица рабочих дней мастеров (по конкретным датам)
export const masterWorkingDates = pgTable("master_working_dates", {
  id: serial("id").primaryKey(),
  masterId: integer("master_id").notNull(), // Связь с мастером
  workDate: date("work_date").notNull(), // Дата работы
  startTime: text("start_time").notNull(), // Время начала работы (HH:MM)
  endTime: text("end_time").notNull(), // Время окончания работы (HH:MM)
  branchId: text("branch_id").notNull(), // Филиал (wa1, wa3, wa4)
  isActive: boolean("is_active").notNull().default(true), // Активна ли дата
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertMasterWorkingDateSchema = createInsertSchema(masterWorkingDates).pick({
  masterId: true,
  workDate: true,
  startTime: true,
  endTime: true,
  branchId: true,
  isActive: true,
});

// Типы для рабочих дат мастеров
export type MasterWorkingDate = typeof masterWorkingDates.$inferSelect;
export type InsertMasterWorkingDate = z.infer<typeof insertMasterWorkingDateSchema>;

// Таблица записей клиентов в календаре (назначенные встречи)
export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull(), // Связь с задачей клиента
  masterId: integer("master_id").notNull(), // Связь с мастером
  date: timestamp("date").notNull(), // Дата встречи
  startTime: text("start_time").notNull(), // Время начала (формат HH:MM)
  endTime: text("end_time").notNull(), // Время окончания (формат HH:MM)
  duration: integer("duration").notNull(), // Длительность в минутах
  status: text("status").notNull().default('confirmed'), // Статус: confirmed, cancelled, completed
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAppointmentSchema = createInsertSchema(appointments).pick({
  taskId: true,
  masterId: true,
  date: true,
  startTime: true,
  endTime: true,
  duration: true,
  status: true,
});

// Типы для записей в календаре
export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;

// Расширенный тип с информацией о клиенте и задаче
export interface AppointmentWithDetails extends Appointment {
  task: {
    id: number;
    client: {
      telegramId: string;
      firstName?: string;
      lastName?: string;
      customName?: string;
      phoneNumber?: string;
    };
    serviceType?: string;
    notes?: string;
  };
}

// Таблица услуг массажа
export const serviceServices = pgTable("service_services", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(), // Название услуги
  duration10Price: integer("duration10_price"), // Цена за 10 минут  
  duration15Price: integer("duration15_price"), // Цена за 15 минут
  duration20Price: integer("duration20_price"), // Цена за 20 минут
  duration30Price: integer("duration30_price"), // Цена за 30 минут
  duration40Price: integer("duration40_price"), // Цена за 40 минут
  duration50Price: integer("duration50_price"), // Цена за 50 минут
  duration60Price: integer("duration60_price"), // Цена за 60 минут
  duration75Price: integer("duration75_price"), // Цена за 75 минут
  duration80Price: integer("duration80_price"), // Цена за 80 минут
  duration90Price: integer("duration90_price"), // Цена за 90 минут
  duration110Price: integer("duration110_price"), // Цена за 110 минут
  duration120Price: integer("duration120_price"), // Цена за 120 минут
  duration150Price: integer("duration150_price"), // Цена за 150 минут
  duration220Price: integer("duration220_price"), // Цена за 220 минут
  description: text("description"), // Описание услуги или особенности
  defaultDuration: integer("default_duration").notNull(), // Стандартная продолжительность в минутах
  category: text("category"), // Категория: body, face, zone, child, ritual
  ageRestriction: text("age_restriction"), // Возрастные ограничения
  recommendations: text("recommendations"), // Рекомендации для использования
  serviceGroup: text("service_group").notNull().default('Массаж всего тела'), // Группа массажа: "Массаж всего тела", "Массаж отдельных зон", "Эксклюзивные ритуалы"
});

export const insertserviceServiceSchema = createInsertSchema(serviceServices).omit({
  id: true
});

// Типы для услуг массажа
export type serviceService = typeof serviceServices.$inferSelect;
export type InsertserviceService = z.infer<typeof insertserviceServiceSchema>;

// Таблица для хранения статуса пауз чатов с ботом
export const chatStatus = pgTable("chat_status", {
  id: serial("id").primaryKey(),
  chat_id: text("chat_id").notNull().unique(), // ID чата (например, wa1_123456)
  bot_paused_until: timestamp("bot_paused_until"), // Дата и время до которого бот на паузе
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

export const insertChatStatusSchema = createInsertSchema(chatStatus).omit({
  id: true
});

// Типы для статуса чата
export type ChatStatus = typeof chatStatus.$inferSelect;
export type InsertChatStatus = z.infer<typeof insertChatStatusSchema>;

// Таблица для отслеживания сообщений, отправленных ботом
export const sentBotMessages = pgTable("sent_bot_messages", {
  id: serial("id").primaryKey(),
  chat_id: text("chat_id").notNull(), // ID чата (например, wa1_123456)
  message_id: text("message_id").notNull(), // ID сообщения, полученного от GreenAPI
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const insertSentBotMessageSchema = createInsertSchema(sentBotMessages).omit({
  id: true
});

// Типы для сообщений, отправленных ботом
export type SentBotMessage = typeof sentBotMessages.$inferSelect;
export type InsertSentBotMessage = z.infer<typeof insertSentBotMessageSchema>;

// Интерфейс для расписания работы мастера
export interface MasterSchedule {
  branch: string;  // Филиал (wa1, wa3, wa4)
  days: string[];  // Дни недели ["Mon", "Wed", "Fri"]
  from: string;    // Время начала "10:00"
  to: string;      // Время окончания "14:00"
}

// Таблица для временного хранения данных задач до их полного формирования
export const tempClientTasks = pgTable("crm_temp_tasks", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  status: taskStatusEnum("status").notNull().default('new'),
  serviceType: text("service_type"), // Вид массажа (для обратной совместимости)
  serviceServiceId: integer("service_service_id"), // Прямая связь с service_services
  scheduleDate: timestamp("schedule_date"), // Желаемая дата
  scheduleTime: text("schedule_time"), // Желаемое время (в текстовом формате для гибкости)
  endTime: text("end_time"), // Время окончания (в формате ISO)
  masterName: text("master_name"), // Имя мастера
  notes: text("notes"), // Дополнительные заметки
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  branchId: text("branch_id"), // Филиал (wa1, wa3, wa4)
  source: text("source"), // Источник задачи (whatsapp, telegram, instagram, manual)
  chatId: text("chat_id"), // ID чата (null для вручную созданных задач)
  serviceDuration: integer("service_duration"), // Длительность массажа в минутах
  servicePrice: integer("service_price"), // Стоимость массажа в сомах
  discount: integer("discount").default(0), // Скидка в процентах
  finalPrice: integer("final_price"), // Итоговая цена после скидки
  masterGender: text("master_gender"), // Предпочтительный пол мастера
  clientName: text("client_name"), // Имя клиента
  clientPhone: text("client_phone"), // Телефон клиента
  jsonData: text("json_data"), // Полный JSON с собранными данными
});

export const insertTempClientTaskSchema = createInsertSchema(tempClientTasks).pick({
  clientId: true,
  status: true,
  serviceType: true,
  serviceServiceId: true,
  scheduleDate: true,
  scheduleTime: true,
  endTime: true,
  masterName: true,
  notes: true,
  branchId: true,
  source: true,
  chatId: true,
  serviceDuration: true,
  servicePrice: true,
  discount: true,
  finalPrice: true,
  masterGender: true,
  clientName: true,
  clientPhone: true,
  jsonData: true,
});

// Типы для временных задач
export type TempClientTask = typeof tempClientTasks.$inferSelect;
export type InsertTempClientTask = z.infer<typeof insertTempClientTaskSchema>;

// Таблица для логирования ответов LLM и разделения их на клиентскую и служебную части
export const llmBotResponseLog = pgTable("llm_bot_response_log", {
  id: serial("id").primaryKey(),
  chatId: text("chat_id").notNull(),
  clientId: integer("client_id"), // ID клиента для связывания с другими таблицами
  clientMessageId: text("client_message_id"),
  llmFullResponse: text("llm_full_response").notNull(),
  textForClient: text("text_for_client"),
  jsonBlock: jsonb("json_block"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const insertLlmBotResponseSchema = createInsertSchema(llmBotResponseLog).pick({
  chatId: true,
  clientId: true,
  clientMessageId: true,
  llmFullResponse: true,
  textForClient: true,
  jsonBlock: true,
});

// Типы для логов ответов LLM
export type LlmBotResponse = typeof llmBotResponseLog.$inferSelect;
export type InsertLlmBotResponse = z.infer<typeof insertLlmBotResponseSchema>;

// Таблица для хранения динамических промптов
export const dynamicPrompts = pgTable("dynamic_prompts", {
  id: serial("id").primaryKey(),
  chatId: text("chat_id").notNull(),
  clientId: text("client_id"),  // ID клиента для связи с таблицей clients
  promptContent: text("prompt_content"),  // Старое поле для обратной совместимости
  systemAndDynamicPrompt: text("system_and_dynamic_prompt"),  // Объединенный текст systemPrompt + dynamicPrompt
  used: boolean("used").default(false),  // Был ли промпт уже использован
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertDynamicPromptSchema = createInsertSchema(dynamicPrompts).pick({
  chatId: true,
  clientId: true,
  promptContent: true,
  systemAndDynamicPrompt: true,
  used: true,
});

// Типы для динамических промптов
export type DynamicPrompt = typeof dynamicPrompts.$inferSelect;
export type InsertDynamicPrompt = z.infer<typeof insertDynamicPromptSchema>;

// Таблица подарочных сертификатов
export const giftCertificates = pgTable("gift_certificates", {
  id: serial("id").primaryKey(),
  certificateNumber: text("certificate_number").notNull().unique(),
  amount: integer("amount").notNull(), // Сумма в сомах (хранится как integer)
  adminName: text("admin_name").notNull(),
  paymentMethod: text("payment_method").notNull(),
  discount: text("discount").default('0%'),
  expiryDate: timestamp("expiry_date").notNull(),
  clientName: text("client_name"),
  phoneNumber: text("phone_number"),
  serviceType: text("service_type"),
  duration: text("duration"),
  masterName: text("master_name"),
  isUsed: boolean("is_used").notNull().default(false),
  isExpired: boolean("is_expired").notNull().default(false),
  branchId: text("branch_id").notNull(), // wa1 как в других таблицах
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertGiftCertificateSchema = createInsertSchema(giftCertificates).pick({
  certificateNumber: true,
  amount: true,
  adminName: true,
  paymentMethod: true,
  discount: true,
  expiryDate: true,
  clientName: true,
  phoneNumber: true,
  serviceType: true,
  duration: true,
  masterName: true,
  isUsed: true,
  isExpired: true,
  branchId: true,
});

// Типы для подарочных сертификатов
export type GiftCertificate = typeof giftCertificates.$inferSelect;
export type InsertGiftCertificate = z.infer<typeof insertGiftCertificateSchema>;

// Таблица бухгалтерии
export const accounting = pgTable("accounting", {
  id: serial("id").primaryKey(),
  master: text("master").notNull(),
  client: text("client").notNull(),
  serviceType: text("service_type").notNull(),
  phoneNumber: text("phone_number"),
  amount: integer("amount").notNull(), // Сумма в сомах
  discount: text("discount").default('0%'),
  duration: text("duration"),
  comment: text("comment"),
  paymentMethod: text("payment_method"),
  dailyReport: text("daily_report"),
  adminName: text("admin_name").notNull(), // Новое поле для имени администратора
  isGiftCertificateUsed: boolean("is_gift_certificate_used").notNull().default(false),
  branchId: text("branch_id").notNull(), // wa1, wa3, wa4
  date: timestamp("date").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAccountingSchema = createInsertSchema(accounting).pick({
  master: true,
  client: true,
  serviceType: true,
  phoneNumber: true,
  amount: true,
  discount: true,
  duration: true,
  comment: true,
  paymentMethod: true,
  dailyReport: true,
  adminName: true,
  isGiftCertificateUsed: true,
  branchId: true,
  date: true,
});

// Типы для бухгалтерии
export type AccountingRecord = typeof accounting.$inferSelect;
export type InsertAccountingRecord = z.infer<typeof insertAccountingSchema>;

// Таблица расходов
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // Наименование расхода
  amount: integer("amount").notNull(), // Сумма в сомах
  branchId: text("branch_id").notNull(), // wa1, wa3, wa4
  date: timestamp("date").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertExpenseSchema = createInsertSchema(expenses).pick({
  name: true,
  amount: true,
  branchId: true,
  date: true,
});

// Типы для расходов
export type ExpenseRecord = typeof expenses.$inferSelect;
export type InsertExpenseRecord = z.infer<typeof insertExpenseSchema>;

// Таблица ежедневных отчетов кассы
export const dailyCashReports = pgTable("daily_cash_reports", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  branchId: varchar("branch_id", { length: 50 }).notNull(),
  adminName: varchar("admin_name", { length: 255 }).notNull(),
  startBalance: decimal("start_balance", { precision: 10, scale: 2 }).default('0').notNull(),
  totalRevenue: decimal("total_revenue", { precision: 10, scale: 2 }).notNull(),
  pettyExpenses: decimal("petty_expenses", { precision: 10, scale: 2 }).notNull(),
  totalIncome: decimal("total_income", { precision: 10, scale: 2 }).notNull(),
  endBalance: decimal("end_balance", { precision: 10, scale: 2 }).notNull(),
  cashCollection: decimal("cash_collection", { precision: 10, scale: 2 }).default('0').notNull(),
  // Способы оплаты
  cashPayments: decimal("cash_payments", { precision: 10, scale: 2 }).default('0').notNull(),
  cardPayments: decimal("card_payments", { precision: 10, scale: 2 }).default('0').notNull(),
  transferPayments: decimal("transfer_payments", { precision: 10, scale: 2 }).default('0').notNull(),
  giftCertificatePayments: decimal("gift_certificate_payments", { precision: 10, scale: 2 }).default('0').notNull(),
  // Разбивка по банкам
  optimaPayments: decimal("optima_payments", { precision: 10, scale: 2 }).default('0').notNull(),
  mbankPayments: decimal("mbank_payments", { precision: 10, scale: 2 }).default('0').notNull(),
  mbusinessPayments: decimal("mbusiness_payments", { precision: 10, scale: 2 }).default('0').notNull(),
  demirPayments: decimal("demir_payments", { precision: 10, scale: 2 }).default('0').notNull(),
  bakaiPayments: decimal("bakai_payments", { precision: 10, scale: 2 }).default('0').notNull(),
  obankPayments: decimal("obank_payments", { precision: 10, scale: 2 }).default('0').notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  uniqueDateBranch: unique().on(table.date, table.branchId),
}));

export const insertDailyCashReportSchema = createInsertSchema(dailyCashReports).pick({
  date: true,
  branchId: true,
  adminName: true,
  startBalance: true,
  totalRevenue: true,
  pettyExpenses: true,
  totalIncome: true,
  endBalance: true,
  cashCollection: true,
  cashPayments: true,
  cardPayments: true,
  transferPayments: true,
  giftCertificatePayments: true,
  optimaPayments: true,
  mbankPayments: true,
  mbusinessPayments: true,
  demirPayments: true,
  bakaiPayments: true,
  obankPayments: true,
});

// Типы для ежедневных отчетов кассы
export type DailyCashReport = typeof dailyCashReports.$inferSelect;
export type InsertDailyCashReport = z.infer<typeof insertDailyCashReportSchema>;

// Таблица мастеров для CRM системы
export const crmMasters = pgTable("crm_masters", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  specialization: varchar("specialization", { length: 255 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  description: varchar("description", { length: 500 }),
  startWorkHour: varchar("start_work_hour", { length: 10 }).default('09:00'),
  endWorkHour: varchar("end_work_hour", { length: 10 }).default('20:00'),
  schedules: jsonb("schedules"), // JSON для расписания
  branchId: varchar("branch_id", { length: 10 }), // wa1, wa2, wa3, wa4, wa5
  photoUrl: varchar("photo_url", { length: 255 }), // URL фотографии мастера
  gender: text("gender"), // пол мастера
});

export const insertCrmMasterSchema = createInsertSchema(crmMasters).pick({
  name: true,
  specialization: true,
  isActive: true,
  description: true,
  startWorkHour: true,
  endWorkHour: true,
  schedules: true,
  branchId: true,
  photoUrl: true,
  gender: true,
});

// Типы для CRM мастеров
export type CrmMaster = typeof crmMasters.$inferSelect;
export type InsertCrmMaster = z.infer<typeof insertCrmMasterSchema>;

// Таблица администраторов для CRM системы
export const crmAdministrators = pgTable("crm_administrators", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 100 }).default('администратор'),
  branchId: varchar("branch_id", { length: 10 }), // wa1, wa2, wa3, wa4, wa5
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  phoneNumber: varchar("phone_number", { length: 20 }),
  email: varchar("email", { length: 255 }),
  notes: text("notes"), // Дополнительные заметки
});

export const insertCrmAdministratorSchema = createInsertSchema(crmAdministrators).pick({
  name: true,
  role: true,
  branchId: true,
  isActive: true,
  phoneNumber: true,
  email: true,
  notes: true,
});

// Типы для CRM администраторов
export type CrmAdministrator = typeof crmAdministrators.$inferSelect;
export type InsertCrmAdministrator = z.infer<typeof insertCrmAdministratorSchema>;

// Таблица зарплат для мастеров и администраторов
export const salaries = pgTable("salaries", {
  id: serial("id").primaryKey(),
  employee: varchar("employee", { length: 255 }).notNull(),
  baseSlary: decimal("base_salary", { precision: 10, scale: 2 }).notNull().default('0'),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).notNull().default('0'),
  totalEarnings: decimal("total_earnings", { precision: 10, scale: 2 }).default('0'), // Добавляем недостающую колонку
  paidAmount: decimal("paid_amount", { precision: 10, scale: 2 }).default('0'), // Выплаченная сумма
  employeeRole: varchar("employee_role", { length: 50 }),
  masterId: integer("master_id"), // Связь с таблицей masters
  administratorId: integer("administrator_id"), // Связь с таблицей crm_administrators
  branchId: varchar("branch_id", { length: 10 }), // wa1, wa2, wa3, wa4, wa5
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSalarySchema = createInsertSchema(salaries).pick({
  employee: true,
  baseSlary: true,
  commissionRate: true,
  totalEarnings: true,
  paidAmount: true,
  employeeRole: true,
  masterId: true,
  administratorId: true,
  branchId: true,
});

// Типы для зарплат
export type Salary = typeof salaries.$inferSelect;
export type InsertSalary = z.infer<typeof insertSalarySchema>;