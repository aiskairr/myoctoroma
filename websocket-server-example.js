/**
 * WebSocket Server Example для уведомлений
 * 
 * Установка зависимостей:
 * npm install express ws
 * 
 * Запуск:
 * node websocket-server-example.js
 */

const express = require('express');
const WebSocket = require('ws');
const http = require('http');

const app = express();
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ 
  server, 
  path: '/ws/notifications'
});

// Храним активные подключения пользователей
// userId -> [WebSocket, WebSocket, ...]
const userConnections = new Map();

// Статистика
let stats = {
  totalConnections: 0,
  activeConnections: 0,
  messagesSent: 0
};

console.log('🚀 Starting WebSocket Notification Server...');

// WebSocket соединение
wss.on('connection', (ws, req) => {
  stats.totalConnections++;
  stats.activeConnections++;
  
  console.log('\n🔌 New WebSocket connection');
  console.log(`   Total: ${stats.totalConnections}, Active: ${stats.activeConnections}`);
  
  // Парсим параметры из URL
  const urlParams = new URLSearchParams(req.url.split('?')[1]);
  let userId = urlParams.get('userId');
  let userRole = urlParams.get('role');
  let masterId = null;
  let branchId = null;
  
  console.log(`   Initial params: userId=${userId}, role=${userRole}`);

  // Обработка сообщений от клиента
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('\n📨 Message from client:', data.type);
      
      // Аутентификация
      if (data.type === 'auth') {
        userId = data.userId;
        userRole = data.role;
        masterId = data.masterId;
        branchId = data.branchId;
        
        console.log(`✅ User authenticated:`);
        console.log(`   userId: ${userId}`);
        console.log(`   role: ${userRole}`);
        console.log(`   masterId: ${masterId}`);
        console.log(`   branchId: ${branchId}`);
        
        // Сохраняем подключение
        if (!userConnections.has(userId)) {
          userConnections.set(userId, []);
        }
        userConnections.get(userId).push(ws);
        
        // Сохраняем данные в ws
        ws.userId = userId;
        ws.userRole = userRole;
        ws.masterId = masterId;
        ws.branchId = branchId;
        ws.isAuthenticated = true;
        
        // Отправляем подтверждение
        ws.send(JSON.stringify({
          type: 'auth_success',
          message: 'Successfully authenticated',
          timestamp: new Date().toISOString()
        }));
        
        console.log(`   Active users: ${userConnections.size}`);
      }
    } catch (error) {
      console.error('❌ Error parsing message:', error);
    }
  });

  ws.on('close', () => {
    stats.activeConnections--;
    
    console.log(`\n🔌 Connection closed for user: ${userId}`);
    console.log(`   Active connections: ${stats.activeConnections}`);
    
    // Удаляем подключение
    if (userId && userConnections.has(userId)) {
      const connections = userConnections.get(userId);
      const index = connections.indexOf(ws);
      if (index > -1) {
        connections.splice(index, 1);
      }
      
      if (connections.length === 0) {
        userConnections.delete(userId);
        console.log(`   Removed user ${userId} from active users`);
      }
    }
  });

  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Отправить уведомление конкретному пользователю
 */
function sendNotificationToUser(userId, notification) {
  if (userConnections.has(userId)) {
    const connections = userConnections.get(userId);
    let sentCount = 0;
    
    connections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(notification));
        sentCount++;
        stats.messagesSent++;
      }
    });
    
    console.log(`📤 Sent notification to user ${userId} (${sentCount} connections)`);
    return true;
  } else {
    console.log(`⚠️  User ${userId} not connected`);
    return false;
  }
}

/**
 * Отправить уведомление всем мастерам с определенным masterId
 */
function sendNotificationToMaster(masterId, notification) {
  let sentCount = 0;
  
  userConnections.forEach((connections, userId) => {
    connections.forEach(ws => {
      if (ws.masterId == masterId && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(notification));
        sentCount++;
        stats.messagesSent++;
      }
    });
  });
  
  console.log(`📤 Sent notification to master ${masterId} (${sentCount} connections)`);
  return sentCount > 0;
}

/**
 * Отправить уведомление всем пользователям филиала
 */
function sendNotificationToBranch(branchId, notification) {
  let sentCount = 0;
  
  userConnections.forEach((connections, userId) => {
    connections.forEach(ws => {
      if (ws.branchId == branchId && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(notification));
        sentCount++;
        stats.messagesSent++;
      }
    });
  });
  
  console.log(`📤 Sent notification to branch ${branchId} (${sentCount} connections)`);
  return sentCount > 0;
}

/**
 * Broadcast - отправить всем подключенным пользователям
 */
function broadcastNotification(notification) {
  let sentCount = 0;
  
  userConnections.forEach((connections, userId) => {
    connections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(notification));
        sentCount++;
        stats.messagesSent++;
      }
    });
  });
  
  console.log(`📢 Broadcast notification (${sentCount} connections)`);
  return sentCount;
}

// ============================================
// REST API ENDPOINTS
// ============================================

/**
 * GET / - Главная страница с информацией
 */
app.get('/', (req, res) => {
  res.json({
    service: 'WebSocket Notification Server',
    version: '1.0.0',
    status: 'running',
    stats: {
      ...stats,
      activeUsers: userConnections.size
    },
    endpoints: {
      websocket: 'ws://localhost:3000/ws/notifications',
      webhooks: {
        user: 'POST /api/webhooks/user',
        master: 'POST /api/webhooks/master',
        branch: 'POST /api/webhooks/branch',
        broadcast: 'POST /api/webhooks/broadcast'
      }
    }
  });
});

/**
 * GET /api/stats - Статистика сервера
 */
app.get('/api/stats', (req, res) => {
  const activeUsers = [];
  userConnections.forEach((connections, userId) => {
    const user = connections[0]; // берем первое подключение для инфо
    activeUsers.push({
      userId,
      role: user?.userRole,
      masterId: user?.masterId,
      branchId: user?.branchId,
      connections: connections.length
    });
  });
  
  res.json({
    stats,
    activeUsers: userConnections.size,
    users: activeUsers
  });
});

/**
 * POST /api/webhooks/user - Отправить уведомление пользователю
 */
app.post('/api/webhooks/user', (req, res) => {
  const { userId, notification } = req.body;
  
  if (!userId || !notification) {
    return res.status(400).json({ 
      error: 'Missing userId or notification' 
    });
  }
  
  const sent = sendNotificationToUser(userId, notification);
  
  res.json({ 
    success: sent,
    message: sent ? 'Notification sent' : 'User not connected'
  });
});

/**
 * POST /api/webhooks/master - Отправить уведомление мастеру
 */
app.post('/api/webhooks/master', (req, res) => {
  const { masterId, notification } = req.body;
  
  if (!masterId || !notification) {
    return res.status(400).json({ 
      error: 'Missing masterId or notification' 
    });
  }
  
  const sent = sendNotificationToMaster(masterId, notification);
  
  res.json({ 
    success: sent,
    message: sent ? 'Notification sent' : 'Master not connected'
  });
});

/**
 * POST /api/webhooks/branch - Отправить уведомление филиалу
 */
app.post('/api/webhooks/branch', (req, res) => {
  const { branchId, notification } = req.body;
  
  if (!branchId || !notification) {
    return res.status(400).json({ 
      error: 'Missing branchId or notification' 
    });
  }
  
  const sent = sendNotificationToBranch(branchId, notification);
  
  res.json({ 
    success: sent > 0,
    count: sent,
    message: `Notification sent to ${sent} connections`
  });
});

/**
 * POST /api/webhooks/broadcast - Отправить всем
 */
app.post('/api/webhooks/broadcast', (req, res) => {
  const { notification } = req.body;
  
  if (!notification) {
    return res.status(400).json({ 
      error: 'Missing notification' 
    });
  }
  
  const sent = broadcastNotification(notification);
  
  res.json({ 
    success: sent > 0,
    count: sent,
    message: `Notification broadcast to ${sent} connections`
  });
});

/**
 * POST /api/test/notification - Тестовое уведомление (для быстрого теста)
 */
app.post('/api/test/notification', (req, res) => {
  const { masterId = '6', type = 'new_booking' } = req.body;
  
  const testNotification = {
    type: type,
    title: 'Тестовое уведомление',
    message: 'Это тестовое уведомление из WebSocket сервера',
    data: {
      clientName: 'Тестовый клиент',
      serviceType: 'Тестовая услуга',
      scheduleTime: '14:00',
      scheduleDate: new Date().toISOString().split('T')[0]
    },
    timestamp: new Date().toISOString(),
    priority: 'normal'
  };
  
  const sent = sendNotificationToMaster(masterId, testNotification);
  
  res.json({ 
    success: sent,
    notification: testNotification,
    message: sent ? `Test notification sent to master ${masterId}` : 'Master not connected'
  });
});

// ============================================
// SERVER START
// ============================================

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log('\n✅ Server started successfully!');
  console.log(`\n📡 HTTP Server: http://localhost:${PORT}`);
  console.log(`🔌 WebSocket Server: ws://localhost:${PORT}/ws/notifications`);
  console.log('\n📚 API Endpoints:');
  console.log(`   GET  /              - Server info`);
  console.log(`   GET  /api/stats     - Statistics`);
  console.log(`   POST /api/webhooks/user      - Send to user`);
  console.log(`   POST /api/webhooks/master    - Send to master`);
  console.log(`   POST /api/webhooks/branch    - Send to branch`);
  console.log(`   POST /api/webhooks/broadcast - Send to all`);
  console.log(`   POST /api/test/notification  - Quick test`);
  console.log('\n🧪 Quick test:');
  console.log(`   curl -X POST http://localhost:${PORT}/api/test/notification -H "Content-Type: application/json" -d '{"masterId":"6"}'`);
  console.log('\n👀 Waiting for connections...\n');
});
