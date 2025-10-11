import React, { useState } from 'react';
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  PieChart, Pie, Cell, Legend, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line, AreaChart, Area
} from 'recharts';
import { 
  Link, 
  BarChart3, 
  TrendingUp, 
  Eye, 
  EyeOff, 
  FileX2, 
  AlertCircle,
  ExternalLink,
  Calendar,
  Users
} from "lucide-react";
import { useBranch } from "@/contexts/BranchContext";
import { createApiUrl } from "@/utils/api-url";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];

interface BookingLinkStat {
  linkKey: string;
  content: string;
  generatedLink: string;
  bookingCount: number;
  lastUsed: string | null;
}

type ChartType = 'pie' | 'bar' | 'line' | 'area';

export const BookingLinksStats: React.FC = () => {
  const { currentBranch } = useBranch();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [chartType, setChartType] = useState<ChartType>('bar');

  // Запрос статистики использования ссылок
  const { data: linkStats, isLoading, error } = useQuery<{ success: boolean; stats: BookingLinkStat[] }>({
    queryKey: [createApiUrl(`/api/booking-links-stats/${currentBranch?.id}`)],
    enabled: !!currentBranch?.id,
    refetchInterval: 30000,
  });

  const stats = linkStats?.stats || [];
  const totalBookings = stats.reduce((sum, stat) => sum + stat.bookingCount, 0);
  const activeLinks = stats.filter(s => s.bookingCount > 0).length;
  const totalLinks = stats.length;
  const averageBookings = totalLinks > 0 ? Math.round(totalBookings / totalLinks) : 0;

  // Подготавливаем данные для графиков
  const chartData = stats
    .filter(stat => stat.bookingCount > 0)
    .map(stat => ({
      name: stat.content.length > 20 ? stat.content.substring(0, 20) + '...' : stat.content,
      fullName: stat.content,
      bookings: stat.bookingCount,
      lastUsed: stat.lastUsed
    }))
    .sort((a, b) => b.bookings - a.bookings);

  const renderChart = () => {
    if (isLoading) {
      return (
        <div className="h-64 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-gray-500">Загрузка данных...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="h-64 flex items-center justify-center">
          <div className="text-center text-red-600">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>Ошибка загрузки данных</p>
          </div>
        </div>
      );
    }

    if (chartData.length === 0) {
      return (
        <div className="h-64 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <FileX2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium mb-1">Нет данных для отображения</p>
            <p className="text-sm">Создайте отслеживаемые ссылки для просмотра статистики</p>
          </div>
        </div>
      );
    }

    const commonTooltipProps = {
      contentStyle: {
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
      },
      formatter: (value: any, name: any, props: any) => [
        `${value} записей`,
        props.payload?.fullName || name
      ]
    };

    switch (chartType) {
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="bookings"
              >
                {chartData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip {...commonTooltipProps} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12, fill: '#6b7280' }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
              <Tooltip {...commonTooltipProps} />
              <Bar dataKey="bookings" radius={[4, 4, 0, 0]}>
                {chartData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12, fill: '#6b7280' }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
              <Tooltip {...commonTooltipProps} />
              <Line 
                type="monotone" 
                dataKey="bookings" 
                stroke="#3b82f6" 
                strokeWidth={3}
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2, fill: 'white' }}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12, fill: '#6b7280' }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
              <Tooltip {...commonTooltipProps} />
              <Area 
                type="monotone" 
                dataKey="bookings" 
                stroke="#3b82f6" 
                fillOpacity={0.6}
                fill="url(#colorBookings)"
              />
              <defs>
                <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
            </AreaChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  if (!currentBranch?.id) {
    return null;
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <Collapsible open={!isCollapsed} onOpenChange={(open) => setIsCollapsed(!open)}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Link className="h-5 w-5 text-purple-600" />
                  <div className="text-left">
                    <CardTitle className="text-gray-900 text-base">
                      Статистика ссылок бронирования
                    </CardTitle>
                    <p className="text-sm text-gray-500 font-normal">
                      Отслеживание источников трафика
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  {totalBookings > 0 && (
                    <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                      {totalBookings} записей
                    </Badge>
                  )}
                  {isCollapsed ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </div>
              </div>
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="mt-4">
            {/* Статистические карточки */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                </div>
                <div className="text-2xl font-bold text-purple-700">{totalLinks}</div>
                <div className="text-xs text-purple-600">Всего ссылок</div>
              </div>
              
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-blue-700">{totalBookings}</div>
                <div className="text-xs text-blue-600">Записей</div>
              </div>
              
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div className="text-2xl font-bold text-green-700">{activeLinks}</div>
                <div className="text-xs text-green-600">Активных</div>
              </div>
              
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <Calendar className="h-5 w-5 text-orange-600" />
                </div>
                <div className="text-2xl font-bold text-orange-700">{averageBookings}</div>
                <div className="text-xs text-orange-600">Среднее/ссылку</div>
              </div>
            </div>

            {/* График и селектор */}
            {chartData.length > 0 && (
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-700">Распределение записей по ссылкам</h4>
                <Select value={chartType} onValueChange={(value) => setChartType(value as ChartType)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Тип графика" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bar">📊 Столбчатая</SelectItem>
                    <SelectItem value="pie">🥧 Круговая</SelectItem>
                    <SelectItem value="line">📈 Линейная</SelectItem>
                    <SelectItem value="area">📉 Площадная</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* График */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              {renderChart()}
            </div>

            {/* Детальная таблица */}
            {chartData.length > 0 && (
              <div className="mt-6 bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-700 mb-3">Детальная статистика</h4>
                <div className="space-y-2">
                  {stats
                    .sort((a, b) => b.bookingCount - a.bookingCount)
                    .map((stat, index) => (
                    <div key={stat.linkKey} className="flex items-center justify-between bg-white rounded p-3 border border-gray-200">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-700">#{index + 1}</span>
                          <span className="text-sm text-gray-900 truncate">
                            {stat.content}
                          </span>
                        </div>
                        {stat.lastUsed && (
                          <div className="text-xs text-gray-500 mt-1">
                            Последнее использование: {format(new Date(stat.lastUsed), 'dd.MM.yyyy HH:mm')}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge 
                          variant={stat.bookingCount > 0 ? "default" : "secondary"}
                          className="text-sm"
                        >
                          {stat.bookingCount} записей
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.open(stat.generatedLink, '_blank')}
                          className="h-8 w-8 p-0"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardHeader>
    </Card>
  );
};
