// Пример использования Task Parser

import { taskParserService, getDateRange, formatDateForAPI } from '@/services/task-parser';
import { useTaskParser, useTaskParserForDate, useAutoTaskParser } from '@/hooks/use-task-parser';

// ======================================
// 1. ПРЯМОЕ ИСПОЛЬЗОВАНИЕ СЕРВИСА
// ======================================

console.log('[Example] Direct service usage');

// Запуск парсера с автоматическими параметрами (текущая дата)
taskParserService.start();

// Подписка на данные
const unsubscribe = taskParserService.subscribe((data) => {
  console.log('[Example] Received data:', data);
  if (data.success) {
    console.log(`[Example] Found ${data.count} tasks`);
    data.data.forEach(task => {
      console.log(`- Task #${task.id}: ${task.client?.customName || task.client?.firstName} - ${task.serviceType} (${task.masterName})`);
    });
  }
});

// Запрос с конкретными датами (как в примере пользователя)
const exampleDateRange = {
  scheduledAfter: '2025-10-02T18:00:00.000Z',
  scheduledBefore: '2025-10-03T17:59:59.999Z'
};

taskParserService.fetchTasksForDateRange(
  exampleDateRange.scheduledAfter,
  exampleDateRange.scheduledBefore
).then(result => {
  console.log('[Example] Custom date range result:', result);
});

// Остановка парсера через 5 минут (300000 мс)
setTimeout(() => {
  console.log('[Example] Stopping parser');
  taskParserService.stop();
  unsubscribe();
}, 300000);

// ======================================
// 2. ИСПОЛЬЗОВАНИЕ ХУКОВ В КОМПОНЕНТАХ
// ======================================

// Пример компонента с ручным управлением
const ExampleManualComponent = () => {
  const parser = useTaskParser({
    onDataReceived: (data) => {
      console.log('[ExampleManual] Data received:', data);
    },
    onError: (error) => {
      console.error('[ExampleManual] Error:', error);
    }
  });

  return (
    <div>
      <h3>Manual Parser Control</h3>
      <p>Status: {parser.isRunning ? 'Running' : 'Stopped'}</p>
      <p>Tasks: {parser.tasksCount}</p>
      <p>Last Update: {parser.lastUpdate}</p>
      
      <button onClick={() => parser.start()}>Start</button>
      <button onClick={() => parser.stop()}>Stop</button>
      <button onClick={() => parser.fetchManually()}>Fetch Now</button>
      <button onClick={() => parser.restart()}>Restart</button>
      
      {parser.error && (
        <div style={{ color: 'red' }}>Error: {parser.error}</div>
      )}
    </div>
  );
};

// Пример компонента с автоматическим запуском для конкретной даты
const ExampleDateComponent = () => {
  const targetDate = new Date('2025-10-03');
  
  const parser = useTaskParserForDate(targetDate, {
    autoStart: true,
    onDataReceived: (data) => {
      console.log('[ExampleDate] Data for', targetDate, ':', data);
    }
  });

  return (
    <div>
      <h3>Date-specific Parser</h3>
      <p>Date: {targetDate.toDateString()}</p>
      <p>Tasks: {parser.tasksCount}</p>
      <p>Active: {parser.isActive ? 'Yes' : 'No'}</p>
    </div>
  );
};

// Пример компонента с автоматическим парсингом
const ExampleAutoComponent = () => {
  const parser = useAutoTaskParser((data) => {
    console.log('[ExampleAuto] Auto-received data:', data);
    
    // Обработка данных
    if (data.success && data.count > 0) {
      // Например, обновление состояния компонента
      // setTasks(data.data);
      
      // Или отправка уведомлений
      if (data.count > 10) {
        console.log('[ExampleAuto] Warning: High task count!');
      }
    }
  });

  return (
    <div>
      <h3>Auto Parser</h3>
      <p>Running: {parser.isRunning ? 'Yes' : 'No'}</p>
      <p>Total Tasks: {parser.tasksCount}</p>
      
      {parser.hasData && (
        <div>
          <h4>Recent Tasks:</h4>
          {parser.data?.data.slice(0, 5).map(task => (
            <div key={task.id}>
              {task.client?.customName || task.client?.firstName} - {task.serviceType}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ======================================
// 3. УТИЛИТЫ ДЛЯ РАБОТЫ С ДАТАМИ
// ======================================

// Получение диапазона для текущей даты
const today = new Date();
const todayRange = getDateRange(today);
console.log('[Example] Today range:', todayRange);

// Получение диапазона для завтрашнего дня
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const tomorrowRange = getDateRange(tomorrow);
console.log('[Example] Tomorrow range:', tomorrowRange);

// Форматирование произвольной даты
const customDate = new Date('2025-10-03T15:30:00');
const formattedDate = formatDateForAPI(customDate);
console.log('[Example] Formatted date:', formattedDate);

// ======================================
// 4. ИНТЕГРАЦИЯ С КАЛЕНДАРЕМ
// ======================================

// Пример интеграции с календарем (как в DailyCalendar)
const CalendarIntegrationExample = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const parser = useTaskParser({
    date: selectedDate,
    onDataReceived: (data) => {
      // Обновляем данные календаря
      console.log('[Calendar] Tasks for', selectedDate, ':', data);
      
      // Можно обновить React Query кэш
      // queryClient.setQueryData(['tasks', selectedDate], data.data);
    }
  });

  const handleDateChange = (newDate: Date) => {
    setSelectedDate(newDate);
    // Парсер автоматически перезапустится с новой датой
  };

  return (
    <div>
      <input 
        type="date" 
        onChange={(e) => handleDateChange(new Date(e.target.value))}
      />
      
      <div>
        <button onClick={() => parser.start()}>Start Parsing</button>
        <button onClick={() => parser.stop()}>Stop Parsing</button>
      </div>
      
      <div>
        Tasks for {selectedDate.toDateString()}: {parser.tasksCount}
      </div>
    </div>
  );
};

// ======================================
// 5. СТАТУС И МОНИТОРИНГ
// ======================================

// Получение статуса парсера
setInterval(() => {
  const status = taskParserService.getStatus();
  console.log('[Monitor] Parser status:', {
    isRunning: status.isRunning,
    subscribers: status.subscribersCount,
    timestamp: new Date().toISOString()
  });
}, 30000); // Каждые 30 секунд

export {
  ExampleManualComponent,
  ExampleDateComponent,
  ExampleAutoComponent,
  CalendarIntegrationExample
};
