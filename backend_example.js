// Пример реализации API endpoint GET /api/tasks для Node.js + Express
// Этот файл демонстрирует, как должен быть реализован backend для работы с фронтендом

const express = require('express');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const { body, query, validationResult } = require('express-validator');

const router = express.Router();

// Middleware для проверки аутентификации
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            error: 'Authentication token required',
            code: 'UNAUTHORIZED'
        });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({
                error: 'Invalid or expired token',
                code: 'FORBIDDEN'
            });
        }
        req.user = user;
        next();
    });
};

// Middleware для проверки доступа к филиалу
const checkBranchAccess = async (req, res, next) => {
    const { branchId } = req.query;
    const user = req.user;

    try {
        // Проверяем, имеет ли пользователь доступ к этому филиалу
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        const [branches] = await connection.execute(
            'SELECT id FROM branches WHERE id = ? AND organisationId = ?',
            [branchId, user.organisationId]
        );

        await connection.end();

        if (branches.length === 0) {
            return res.status(403).json({
                error: 'Access denied to this branch',
                code: 'ACCESS_DENIED'
            });
        }

        next();
    } catch (error) {
        console.error('Error checking branch access:', error);
        res.status(500).json({
            error: 'Internal server error',
            code: 'INTERNAL_ERROR'
        });
    }
};

// Валидация параметров запроса
const validateTasksQuery = [
    query('branchId')
        .notEmpty()
        .withMessage('branchId is required')
        .isString()
        .withMessage('branchId must be a string'),
    
    query('scheduledAfter')
        .notEmpty()
        .withMessage('scheduledAfter is required')
        .isISO8601()
        .withMessage('scheduledAfter must be a valid ISO date'),
    
    query('scheduledBefore')
        .notEmpty()
        .withMessage('scheduledBefore is required')
        .isISO8601()
        .withMessage('scheduledBefore must be a valid ISO date'),
    
    query('sortBy')
        .optional()
        .isIn(['scheduleDate', 'scheduleTime', 'clientName', 'serviceType', 'masterName'])
        .withMessage('sortBy must be one of: scheduleDate, scheduleTime, clientName, serviceType, masterName'),
    
    query('sortOrder')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('sortOrder must be either asc or desc'),
    
    query('userMasterId')
        .optional()
        .isInt({ min: 1 })
        .withMessage('userMasterId must be a positive integer'),
    
    query('userRole')
        .optional()
        .isString()
        .withMessage('userRole must be a string')
];

/**
 * GET /api/tasks
 * Получение записей клиентов из таблицы client_tasks с фильтрацией
 */
router.get('/api/tasks', 
    authenticateToken,
    validateTasksQuery,
    checkBranchAccess,
    async (req, res) => {
        try {
            // Проверка ошибок валидации
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: 'Validation failed',
                    code: 'VALIDATION_ERROR',
                    details: errors.array()
                });
            }

            const {
                branchId,
                scheduledAfter,
                scheduledBefore,
                sortBy = 'scheduleDate',
                sortOrder = 'asc',
                userMasterId,
                userRole
            } = req.query;

            console.log(`📡 API /api/tasks called with params:`, {
                branchId,
                scheduledAfter,
                scheduledBefore,
                sortBy,
                sortOrder,
                userMasterId,
                userRole,
                userId: req.user.id
            });

            // Подключение к базе данных
            const connection = await mysql.createConnection({
                host: process.env.DB_HOST,
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
                database: process.env.DB_NAME
            });

            // Базовый SQL запрос
            let query = `
                SELECT 
                    ct.id,
                    ct.clientId,
                    ct.clientName,
                    ct.status,
                    ct.serviceType,
                    ct.scheduleDate,
                    ct.scheduleTime,
                    ct.endTime,
                    ct.masterId,
                    ct.serviceDuration,
                    ct.servicePrice,
                    ct.finalPrice,
                    ct.notes,
                    ct.instanceId,
                    ct.branchId,
                    ct.paymentStatus,
                    ct.paidAmount,
                    ct.createdAt,
                    ct.updatedAt,
                    c.telegramId,
                    c.firstName,
                    c.lastName,
                    c.customName,
                    c.phoneNumber,
                    c.email,
                    m.name as masterName,
                    m.specialization as masterSpecialization
                FROM client_tasks ct
                LEFT JOIN clients c ON ct.clientId = c.id
                LEFT JOIN masters m ON ct.masterId = m.id
                WHERE ct.branchId = ?
                    AND DATE(ct.scheduleDate) >= DATE(?)
                    AND DATE(ct.scheduleDate) <= DATE(?)
            `;

            const params = [branchId, scheduledAfter, scheduledBefore];

            // Дополнительная фильтрация по мастеру
            if (userMasterId) {
                query += ' AND ct.masterId = ?';
                params.push(userMasterId);
            }

            // Фильтрация по роли пользователя
            if (userRole === 'master' && req.user.master_id) {
                query += ' AND ct.masterId = ?';
                params.push(req.user.master_id);
            }

            // Добавление сортировки
            const allowedSortFields = {
                'scheduleDate': 'ct.scheduleDate',
                'scheduleTime': 'ct.scheduleTime',
                'clientName': 'ct.clientName',
                'serviceType': 'ct.serviceType',
                'masterName': 'm.name'
            };

            const sortField = allowedSortFields[sortBy] || 'ct.scheduleDate';
            const order = sortOrder.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

            query += ` ORDER BY ${sortField} ${order}, ct.scheduleTime ASC`;

            console.log(`🔍 Executing SQL query:`, query);
            console.log(`📋 Query params:`, params);

            // Выполнение запроса
            const [rows] = await connection.execute(query, params);

            // Закрытие соединения
            await connection.end();

            // Форматирование ответа
            const tasks = rows.map(task => {
                const formattedTask = {
                    id: task.id,
                    clientId: task.clientId,
                    clientName: task.clientName,
                    status: task.status,
                    serviceType: task.serviceType,
                    scheduleDate: task.scheduleDate,
                    scheduleTime: task.scheduleTime,
                    endTime: task.endTime,
                    masterName: task.masterName,
                    masterId: task.masterId,
                    serviceDuration: task.serviceDuration,
                    servicePrice: parseFloat(task.servicePrice) || 0,
                    finalPrice: task.finalPrice ? parseFloat(task.finalPrice) : null,
                    notes: task.notes,
                    instanceId: task.instanceId,
                    branchId: task.branchId,
                    paymentStatus: task.paymentStatus,
                    paidAmount: parseFloat(task.paidAmount) || 0,
                    createdAt: task.createdAt,
                    updatedAt: task.updatedAt
                };

                // Добавление информации о клиенте, если она есть
                if (task.telegramId || task.firstName || task.phoneNumber) {
                    formattedTask.client = {
                        telegramId: task.telegramId,
                        firstName: task.firstName,
                        lastName: task.lastName,
                        customName: task.customName,
                        phoneNumber: task.phoneNumber,
                        email: task.email
                    };
                }

                return formattedTask;
            });

            console.log(`✅ Successfully fetched ${tasks.length} tasks`);

            // Логирование для мониторинга
            console.log(`📊 Tasks summary:`, {
                total: tasks.length,
                byStatus: tasks.reduce((acc, task) => {
                    acc[task.status] = (acc[task.status] || 0) + 1;
                    return acc;
                }, {}),
                dateRange: `${scheduledAfter} to ${scheduledBefore}`,
                branchId: branchId
            });

            res.json(tasks);

        } catch (error) {
            console.error('❌ Error fetching tasks:', error);
            
            // Логирование подробной информации об ошибке
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                query: req.query,
                user: req.user?.id
            });

            res.status(500).json({
                error: 'Internal server error while fetching tasks',
                code: 'INTERNAL_ERROR',
                ...(process.env.NODE_ENV === 'development' && { details: error.message })
            });
        }
    }
);

/**
 * Дополнительный endpoint для получения статистики задач
 * GET /api/tasks/stats
 */
router.get('/api/tasks/stats',
    authenticateToken,
    query('branchId').notEmpty(),
    query('scheduledAfter').isISO8601(),
    query('scheduledBefore').isISO8601(),
    checkBranchAccess,
    async (req, res) => {
        try {
            const { branchId, scheduledAfter, scheduledBefore } = req.query;

            const connection = await mysql.createConnection({
                host: process.env.DB_HOST,
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
                database: process.env.DB_NAME
            });

            const [stats] = await connection.execute(`
                SELECT 
                    COUNT(*) as totalTasks,
                    COUNT(DISTINCT clientId) as uniqueClients,
                    COUNT(DISTINCT masterId) as mastersInvolved,
                    SUM(CASE WHEN status = 'completed' THEN servicePrice ELSE 0 END) as totalRevenue,
                    AVG(serviceDuration) as avgDuration,
                    status,
                    COUNT(*) as statusCount
                FROM client_tasks 
                WHERE branchId = ? 
                    AND DATE(scheduleDate) >= DATE(?) 
                    AND DATE(scheduleDate) <= DATE(?)
                GROUP BY status
            `, [branchId, scheduledAfter, scheduledBefore]);

            await connection.end();

            res.json({
                statistics: stats,
                period: { from: scheduledAfter, to: scheduledBefore },
                branchId: branchId
            });

        } catch (error) {
            console.error('Error fetching task statistics:', error);
            res.status(500).json({
                error: 'Internal server error',
                code: 'INTERNAL_ERROR'
            });
        }
    }
);

module.exports = router;

// Пример использования в основном app.js:
/*
const express = require('express');
const tasksRouter = require('./routes/tasks');

const app = express();

app.use(express.json());
app.use(tasksRouter);

app.listen(process.env.PORT || 3000, () => {
    console.log('Server is running on port', process.env.PORT || 3000);
});
*/
