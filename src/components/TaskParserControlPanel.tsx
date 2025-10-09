import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTaskParser } from '@/hooks/use-task-parser';
import { getDateRange } from '@/services/task-parser';
import type { TaskParserResponse } from '@/services/task-parser';
import { Play, Square, RefreshCw, Download, Clock, Users, AlertCircle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

interface TaskParserControlPanelProps {
  selectedDate?: Date;
  onDataReceived?: (data: TaskParserResponse) => void;
}

export const TaskParserControlPanel: React.FC<TaskParserControlPanelProps> = ({
  selectedDate = new Date(),
  onDataReceived
}) => {
  const [customDate, setCustomDate] = useState<string>(
    format(selectedDate, 'yyyy-MM-dd')
  );

  // Используем хук парсера
  const {
    data,
    isRunning,
    subscribersCount,
    error,
    lastUpdate,
    tasksCount,
    start,
    stop,
    fetchManually,
    restart
  } = useTaskParser({
    date: new Date(customDate),
    onDataReceived: (data) => {
      console.log('[TaskParserPanel] Data received:', data);
      if (onDataReceived) {
        onDataReceived(data);
      }
    },
    onError: (error) => {
      console.error('[TaskParserPanel] Error:', error);
    }
  });

  // Обработчики
  const handleStart = () => {
    const targetDate = new Date(customDate);
    start(targetDate);
  };

  const handleStop = () => {
    stop();
  };

  const handleManualFetch = async () => {
    try {
      const targetDate = new Date(customDate);
      await fetchManually(targetDate);
    } catch (error) {
      console.error('Manual fetch error:', error);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomDate(e.target.value);
  };

  // Получаем диапазон дат для отображения
  const { scheduledAfter, scheduledBefore } = getDateRange(new Date(customDate));

  return (
    <Card className="w-full mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className={`h-5 w-5 ${isRunning ? 'animate-spin text-green-600' : 'text-gray-600'}`} />
          Task Parser API
          <Badge variant={isRunning ? 'default' : 'secondary'}>
            {isRunning ? 'Активен' : 'Остановлен'}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Информационная панель */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
            <Clock className="h-4 w-4 text-blue-600" />
            <div>
              <div className="text-xs text-blue-600 font-medium">Статус</div>
              <div className="text-sm font-semibold">
                {isRunning ? 'Запущен' : 'Остановлен'}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
            <Users className="h-4 w-4 text-green-600" />
            <div>
              <div className="text-xs text-green-600 font-medium">Записей</div>
              <div className="text-sm font-semibold">{tasksCount}</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg">
            <RefreshCw className="h-4 w-4 text-purple-600" />
            <div>
              <div className="text-xs text-purple-600 font-medium">Подписчиков</div>
              <div className="text-sm font-semibold">{subscribersCount}</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg">
            {error ? (
              <AlertCircle className="h-4 w-4 text-red-600" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-600" />
            )}
            <div>
              <div className="text-xs text-amber-600 font-medium">Статус API</div>
              <div className="text-sm font-semibold">
                {error ? 'Ошибка' : 'OK'}
              </div>
            </div>
          </div>
        </div>

        {/* Настройки даты */}
        <div className="space-y-2">
          <Label htmlFor="date-picker" className="text-sm font-medium">
            Дата для парсинга
          </Label>
          <Input
            id="date-picker"
            type="date"
            value={customDate}
            onChange={handleDateChange}
            className="w-48"
          />
          <div className="text-xs text-gray-500">
            Диапазон: {format(new Date(scheduledAfter), 'dd.MM.yyyy HH:mm')} - {format(new Date(scheduledBefore), 'dd.MM.yyyy HH:mm')}
          </div>
        </div>

        {/* Управляющие кнопки */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleStart}
            disabled={isRunning}
            className="flex items-center gap-2"
            variant="default"
          >
            <Play className="h-4 w-4" />
            Запустить парсер
          </Button>
          
          <Button
            onClick={handleStop}
            disabled={!isRunning}
            variant="destructive"
            className="flex items-center gap-2"
          >
            <Square className="h-4 w-4" />
            Остановить
          </Button>
          
          <Button
            onClick={handleManualFetch}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Запросить сейчас
          </Button>
          
          <Button
            onClick={restart}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Перезапустить
          </Button>
        </div>

        {/* Информация о последнем обновлении */}
        {lastUpdate && (
          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
            <div className="font-medium mb-1">Последнее обновление:</div>
            <div>{format(new Date(lastUpdate), 'dd.MM.yyyy HH:mm:ss')}</div>
            {data?.success && (
              <div className="mt-1 text-green-600">
                ✅ Получено записей: {data.count}
              </div>
            )}
          </div>
        )}

        {/* Отображение ошибок */}
        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
            <div className="font-medium mb-1 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Ошибка парсера:
            </div>
            <div>{error}</div>
          </div>
        )}

        {/* Текущий API URL */}
        <details className="text-xs bg-gray-50 p-3 rounded-lg">
          <summary className="cursor-pointer font-medium text-gray-700">
            API Endpoint (нажмите для подробностей)
          </summary>
          <div className="mt-2 font-mono text-gray-600 break-all">
            <div className="mb-1">
              <strong>URL:</strong> https://partial-elfrida-promconsulting-9e3c84f1.koyeb.app/api/tasks
            </div>
            <div className="mb-1">
              <strong>Параметры:</strong>
            </div>
            <ul className="ml-4 space-y-1">
              <li>• branchId=1</li>
              <li>• scheduledAfter={scheduledAfter}</li>
              <li>• scheduledBefore={scheduledBefore}</li>
              <li>• sortBy=scheduleDate</li>
              <li>• sortOrder=asc</li>
              <li>• userRole=superadmin</li>
            </ul>
            <div className="mt-2">
              <strong>Интервал:</strong> 1 минута
            </div>
          </div>
        </details>

        {/* Предварительный просмотр данных */}
        {data && data.success && data.data.length > 0 && (
          <details className="text-xs bg-blue-50 p-3 rounded-lg border border-blue-200">
            <summary className="cursor-pointer font-medium text-blue-700">
              Предварительный просмотр данных ({data.count} записей)
            </summary>
            <div className="mt-2 max-h-40 overflow-y-auto">
              {data.data.slice(0, 3).map((task) => (
                <div key={task.id} className="mb-2 p-2 bg-white rounded border">
                  <div><strong>ID:</strong> {task.id}</div>
                  <div><strong>Клиент:</strong> {task.client?.customName || task.client?.firstName || 'Не указан'}</div>
                  <div><strong>Услуга:</strong> {task.serviceType || 'Не указана'}</div>
                  <div><strong>Мастер:</strong> {task.masterName || 'Не указан'}</div>
                  <div><strong>Время:</strong> {task.scheduleTime || 'Не указано'}</div>
                  <div><strong>Статус:</strong> {task.status}</div>
                </div>
              ))}
              {data.count > 3 && (
                <div className="text-gray-500 text-center">
                  ... и еще {data.count - 3} записей
                </div>
              )}
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  );
};
