-- Миграция для создания таблицы client_tasks
-- Это пример SQL скрипта для создания таблицы, которая будет использоваться API endpoint GET /api/tasks

-- 1. Создание таблицы client_tasks
CREATE TABLE IF NOT EXISTS client_tasks (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    
    -- Клиентская информация
    clientId INTEGER NOT NULL,
    clientName VARCHAR(255) NOT NULL,
    
    -- Статус записи
    status ENUM('scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show') DEFAULT 'scheduled',
    
    -- Информация об услуге
    serviceType VARCHAR(255),
    serviceDuration INTEGER DEFAULT 60, -- продолжительность в минутах
    servicePrice DECIMAL(10,2) DEFAULT 0.00,
    
    -- Расписание
    scheduleDate DATE NOT NULL,
    scheduleTime TIME NOT NULL,
    endTime TIME, -- вычисляется автоматически или задается вручную
    
    -- Мастер
    masterId INTEGER,
    
    -- Дополнительная информация
    notes TEXT,
    instanceId INTEGER, -- для связи с внешними системами (например, WhatsApp)
    
    -- Филиал
    branchId VARCHAR(50) NOT NULL,
    
    -- Финансовая информация
    finalPrice DECIMAL(10,2), -- итоговая цена (может отличаться от servicePrice)
    paidAmount DECIMAL(10,2) DEFAULT 0.00,
    paymentStatus ENUM('unpaid', 'partial', 'paid', 'refunded') DEFAULT 'unpaid',
    paymentMethod VARCHAR(50),
    
    -- Временные метки
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Индексы для оптимизации запросов
    INDEX idx_branch_date (branchId, scheduleDate),
    INDEX idx_master_date (masterId, scheduleDate),
    INDEX idx_client_id (clientId),
    INDEX idx_status (status),
    INDEX idx_schedule_datetime (scheduleDate, scheduleTime),
    
    -- Внешние ключи (раскомментируйте если таблицы существуют)
    -- FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE,
    -- FOREIGN KEY (masterId) REFERENCES masters(id) ON DELETE SET NULL,
    
    -- Ограничения
    CONSTRAINT chk_schedule_time CHECK (scheduleTime >= '07:00:00' AND scheduleTime <= '23:59:59'),
    CONSTRAINT chk_service_duration CHECK (serviceDuration > 0 AND serviceDuration <= 480), -- макс 8 часов
    CONSTRAINT chk_price CHECK (servicePrice >= 0),
    CONSTRAINT chk_final_price CHECK (finalPrice IS NULL OR finalPrice >= 0),
    CONSTRAINT chk_paid_amount CHECK (paidAmount >= 0)
);

-- 2. Создание таблицы clients (если не существует)
CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    telegramId VARCHAR(255) UNIQUE,
    firstName VARCHAR(255),
    lastName VARCHAR(255),
    customName VARCHAR(255), -- отображаемое имя
    phoneNumber VARCHAR(20),
    email VARCHAR(255),
    birthDate DATE,
    gender ENUM('male', 'female', 'other'),
    notes TEXT,
    isActive BOOLEAN DEFAULT TRUE,
    organisationId INTEGER,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_telegram_id (telegramId),
    INDEX idx_phone (phoneNumber),
    INDEX idx_organisation (organisationId)
);

-- 3. Создание таблицы masters (если не существует)
CREATE TABLE IF NOT EXISTS masters (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    specialization VARCHAR(255),
    phoneNumber VARCHAR(20),
    email VARCHAR(255),
    
    -- Рабочие часы
    startWorkHour TIME DEFAULT '09:00:00',
    endWorkHour TIME DEFAULT '20:00:00',
    
    -- Рабочие дни (битовая маска: 1=Пн, 2=Вт, 4=Ср, 8=Чт, 16=Пт, 32=Сб, 64=Вс)
    workDays INTEGER DEFAULT 63, -- Пн-Сб по умолчанию
    
    isActive BOOLEAN DEFAULT TRUE,
    organisationId INTEGER,
    branchId VARCHAR(50),
    
    -- Процент комиссии
    commissionPercent DECIMAL(5,2) DEFAULT 50.00,
    
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_branch (branchId),
    INDEX idx_organisation (organisationId),
    INDEX idx_active (isActive)
);

-- 4. Создание таблицы services (справочник услуг)
CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    duration INTEGER NOT NULL, -- в минутах
    price DECIMAL(10,2) NOT NULL,
    category VARCHAR(255),
    isActive BOOLEAN DEFAULT TRUE,
    organisationId INTEGER,
    branchId VARCHAR(50),
    
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_branch (branchId),
    INDEX idx_category (category),
    INDEX idx_active (isActive)
);

-- 5. Триггер для автоматического вычисления endTime
DELIMITER $$

CREATE TRIGGER tr_client_tasks_calculate_end_time
    BEFORE INSERT ON client_tasks
    FOR EACH ROW
BEGIN
    IF NEW.endTime IS NULL AND NEW.scheduleTime IS NOT NULL AND NEW.serviceDuration IS NOT NULL THEN
        SET NEW.endTime = ADDTIME(NEW.scheduleTime, SEC_TO_TIME(NEW.serviceDuration * 60));
    END IF;
END$$

CREATE TRIGGER tr_client_tasks_update_end_time
    BEFORE UPDATE ON client_tasks
    FOR EACH ROW
BEGIN
    IF (NEW.scheduleTime != OLD.scheduleTime OR NEW.serviceDuration != OLD.serviceDuration) 
       AND NEW.serviceDuration IS NOT NULL THEN
        SET NEW.endTime = ADDTIME(NEW.scheduleTime, SEC_TO_TIME(NEW.serviceDuration * 60));
    END IF;
END$$

DELIMITER ;

-- 6. Пример данных для тестирования
INSERT INTO clients (telegramId, firstName, lastName, customName, phoneNumber, organisationId) VALUES
('123456789', 'Иван', 'Иванов', 'Иван И.', '+996500123456', 1),
('987654321', 'Мария', 'Сидорова', NULL, '+996700987654', 1),
('555666777', 'Анна', 'Петрова', 'Анна П.', '+996555666777', 1);

INSERT INTO masters (name, specialization, phoneNumber, branchId, organisationId) VALUES
('Анна Петрова', 'Парикмахер-стилист', '+996501234567', '1', 1),
('Елена Козлова', 'Колорист', '+996507654321', '1', 1),
('Ольга Смирнова', 'Мастер маникюра', '+996509876543', '1', 1);

INSERT INTO services (name, duration, price, category, branchId, organisationId) VALUES
('Стрижка мужская', 45, 1500.00, 'Парикмахерские услуги', '1', 1),
('Стрижка женская', 60, 2000.00, 'Парикмахерские услуги', '1', 1),
('Окрашивание', 120, 3500.00, 'Парикмахерские услуги', '1', 1),
('Маникюр классический', 60, 1200.00, 'Ногтевой сервис', '1', 1),
('Маникюр с покрытием', 90, 1800.00, 'Ногтевой сервис', '1', 1);

-- Пример записей в client_tasks
INSERT INTO client_tasks (
    clientId, clientName, status, serviceType, serviceDuration, servicePrice,
    scheduleDate, scheduleTime, masterId, branchId, notes
) VALUES
(1, 'Иван Иванов', 'scheduled', 'Стрижка мужская', 45, 1500.00, '2025-10-03', '10:00:00', 1, '1', 'Клиент просит короткую стрижку'),
(2, 'Мария Сидорова', 'in-progress', 'Окрашивание', 120, 3500.00, '2025-10-03', '11:00:00', 2, '1', 'Окрашивание в блонд'),
(3, 'Анна Петрова', 'scheduled', 'Маникюр с покрытием', 90, 1800.00, '2025-10-03', '14:00:00', 3, '1', 'Хочет красный цвет'),
(1, 'Иван Иванов', 'scheduled', 'Стрижка мужская', 45, 1500.00, '2025-10-04', '09:30:00', 1, '1', NULL);

-- 7. Представление для удобного получения данных (VIEW)
CREATE VIEW v_client_tasks_with_details AS
SELECT 
    ct.*,
    c.telegramId,
    c.firstName,
    c.lastName,
    c.customName,
    c.phoneNumber,
    c.email,
    m.name as masterName,
    m.specialization as masterSpecialization,
    s.category as serviceCategory
FROM client_tasks ct
LEFT JOIN clients c ON ct.clientId = c.id
LEFT JOIN masters m ON ct.masterId = m.id
LEFT JOIN services s ON ct.serviceType = s.name AND ct.branchId = s.branchId;

-- 8. Хранимая процедура для получения задач (альтернатива к API)
DELIMITER $$

CREATE PROCEDURE GetTasksForCalendar(
    IN p_branchId VARCHAR(50),
    IN p_scheduledAfter DATE,
    IN p_scheduledBefore DATE,
    IN p_sortBy VARCHAR(50),
    IN p_sortOrder VARCHAR(10),
    IN p_userMasterId INTEGER
)
BEGIN
    SET @sql = 'SELECT * FROM v_client_tasks_with_details WHERE branchId = ? AND scheduleDate >= ? AND scheduleDate <= ?';
    
    IF p_userMasterId IS NOT NULL THEN
        SET @sql = CONCAT(@sql, ' AND masterId = ', p_userMasterId);
    END IF;
    
    IF p_sortBy IS NOT NULL AND p_sortOrder IS NOT NULL THEN
        SET @sql = CONCAT(@sql, ' ORDER BY ', p_sortBy, ' ', p_sortOrder);
    ELSE
        SET @sql = CONCAT(@sql, ' ORDER BY scheduleDate ASC, scheduleTime ASC');
    END IF;
    
    PREPARE stmt FROM @sql;
    EXECUTE stmt USING p_branchId, p_scheduledAfter, p_scheduledBefore;
    DEALLOCATE PREPARE stmt;
END$$

DELIMITER ;

-- Пример использования процедуры:
-- CALL GetTasksForCalendar('1', '2025-10-03', '2025-10-03', 'scheduleDate', 'asc', NULL);
