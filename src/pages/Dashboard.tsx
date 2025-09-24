import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Redirect } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatusBadge from "@/components/StatusBadge";
import {
  Users,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
  Cpu,
  AlertCircle,
  MessageSquare,
  FileX2
} from "lucide-react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PieChart, Pie, Cell, Legend, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { useBranch } from "@/contexts/BranchContext";
import { useIsMaster } from "@/hooks/use-master-role";

// Современные цвета для диаграмм в стиле shadcn
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];

// Интерфейсы для типов данных
interface MassageTypeStats {
  name: string;
  count: number;
  revenue: number;
}

interface MasterStats {
  name: string;
  count: number;
}

export default function Dashboard() {
  const { currentBranch } = useBranch();
  const { isMaster, isLoading: masterRoleLoading } = useIsMaster();

  // Если пользователь - мастер, перенаправляем на календарь мастеров
  if (!masterRoleLoading && isMaster) {
    return <Redirect to="/master/calendar" />;
  }

  const [botStatus, setBotStatus] = useState(false);
  const [stats, setStats] = useState({
    activeUsers: 0,
    messagesToday: 0,
    apiUsage: 0,
  });
  const [activities, setActivities] = useState<any[]>([]);
  const [massageTypes, setMassageTypes] = useState<MassageTypeStats[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [masterStats, setMasterStats] = useState<MasterStats[]>([]);

  // Fetch dashboard data - добавляем параметр филиала
  const { data, isLoading, error } = useQuery({
    queryKey: [`/api/stats`, currentBranch.waInstance],
    refetchInterval: 10000, // Refresh every 10 seconds
    queryFn: async () => {
      const response = await fetch(`/api/stats`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    }
  });

  // Fetch recent activities - добавляем параметр филиала
  const activitiesQuery = useQuery({
    queryKey: [`/api/activities`, currentBranch.waInstance],
    refetchInterval: 10000, // Refresh every 10 seconds
    queryFn: async () => {
      const response = await fetch(`/api/activities`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    }
  });

  // Fetch massage type statistics - добавляем параметр филиала
  const massageStatsQuery = useQuery({
    queryKey: [`/api/stats/massage-types?branchId=${currentBranch.waInstance}`, currentBranch.waInstance],
    refetchInterval: 60000, // Refresh every minute
    queryFn: async () => {
      const response = await fetch(`/api/stats/massage-types?branchId=${currentBranch.waInstance}`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    }
  });

  // Fetch master statistics - добавляем параметр филиала
  const masterStatsQuery = useQuery({
    queryKey: [`/api/stats/masters?branchId=${currentBranch.waInstance}`, currentBranch.waInstance],
    refetchInterval: 60000, // Refresh every minute
    queryFn: async () => {
      const response = await fetch(`/api/stats/masters?branchId=${currentBranch.waInstance}`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    }
  });

  useEffect(() => {
    if (data && typeof data === 'object') {
      const apiData = data as any;
      setBotStatus(apiData.botStatus || false);
      setStats({
        activeUsers: apiData.stats?.activeUsers || 0,
        messagesToday: apiData.stats?.messagesToday || 0,
        apiUsage: apiData.stats?.apiUsage || 0
      });
    }
  }, [data]);

  useEffect(() => {
    if (activitiesQuery.data && typeof activitiesQuery.data === 'object') {
      const apiData = activitiesQuery.data as any;
      if (apiData.activities && Array.isArray(apiData.activities)) {
        setActivities(apiData.activities);
      }
    }
  }, [activitiesQuery.data]);

  useEffect(() => {
    if (massageStatsQuery.data && typeof massageStatsQuery.data === 'object') {
      const apiData = massageStatsQuery.data as any;
      setMassageTypes(apiData.massageTypes || []);
      setTotalRevenue(apiData.totalRevenue || 0);
    }
  }, [massageStatsQuery.data]);

  useEffect(() => {
    if (masterStatsQuery.data && typeof masterStatsQuery.data === 'object') {
      const apiData = masterStatsQuery.data as any;
      if (apiData.masters && Array.isArray(apiData.masters)) {
        setMasterStats(apiData.masters);
      }
    }
  }, [masterStatsQuery.data]);

  // Format timestamp for display
  const formatActivityTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return format(date, "h:mm a");
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="space-y-4 p-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Панель управления
            </h1>
            <p className="text-sm text-gray-500">
              Обзор активности и аналитики системы
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${botStatus ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm font-medium text-gray-700">Статус:</span>
            </div>
            <StatusBadge status={botStatus ? "Online" : "Offline"} />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {/* Active Users Card */}
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Активных пользователей</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.activeUsers.toLocaleString()}</p>
                </div>
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Messages Today Card */}
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Сообщений сегодня</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.messagesToday.toLocaleString()}</p>
                </div>
                <div className="p-2 bg-green-50 rounded-lg">
                  <MessageSquare className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* API Usage Card */}
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Использование API</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.apiUsage}%</p>

                </div>
                <div className="p-2 bg-yellow-50 rounded-lg">
                  <Cpu className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Services Distribution */}
          <Card className="lg:col-span-2 border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-gray-900">
                <PieChartIcon className="h-5 w-5 mr-2 text-blue-600" />
                Типы услуг (текущий месяц)
              </CardTitle>
              <p className="text-sm text-gray-500">Распределение по выручке</p>
            </CardHeader>
            <CardContent className="pt-0">
              {massageStatsQuery.isLoading ? (
                <div className="h-80 flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                    <p className="text-gray-500">Загрузка данных...</p>
                  </div>
                </div>
              ) : massageStatsQuery.error ? (
                <div className="h-80 flex items-center justify-center">
                  <div className="text-center text-red-600">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                    <p>Ошибка загрузки данных</p>
                  </div>
                </div>
              ) : massageTypes.length === 0 ? (
                <div className="h-80 flex items-center justify-center">
                  <p className="text-gray-500 text-center">
                    <FileX2 width={50} height={50} className="mx-auto mb-2" />
                    Нет данных для отображения
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={massageTypes}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
                      paddingAngle={2}
                      dataKey="revenue"
                    >
                      {massageTypes.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [`${value.toLocaleString()} ₽`, "Выручка"]}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                      }}
                    />
                    <Legend
                      wrapperStyle={{ paddingTop: '20px' }}
                      iconType="circle"
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Masters Workload - Empty placeholder */}
          <div className="lg:col-span-1"></div>
        </div>

        {/* Master Statistics */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center text-gray-900">
              <BarChartIcon className="h-5 w-5 mr-2 text-green-600" />
              Загруженность мастеров (текущий месяц)
            </CardTitle>
            <p className="text-sm text-gray-500">Количество записей по мастерам</p>
          </CardHeader>
          <CardContent className="pt-0">
            {masterStatsQuery.isLoading ? (
              <div className="h-80 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                  <p className="text-gray-500">Загрузка данных...</p>
                </div>
              </div>
            ) : masterStatsQuery.error ? (
              <div className="h-80 flex items-center justify-center">
                <div className="text-center text-red-600">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                  <p>Ошибка загрузки данных</p>
                </div>
              </div>
            ) : masterStats.length === 0 ? (
              <div className="h-80 flex items-center justify-center">
                <p className="text-gray-500 text-center">
                  <FileX2 width={50} height={50} className="mx-auto mb-2" />
                  Нет данных для отображения
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={masterStats}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value) => [`${value}`, "Количество записей"]}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                  />
                  <Bar dataKey="count" name="Записей" fill="#10b981" radius={[4, 4, 0, 0]}>
                    {masterStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center text-gray-900">
              <Users className="h-5 w-5 mr-2 text-gray-600" />
              Последние действия
            </CardTitle>
            <p className="text-sm text-gray-500">Активность пользователей в реальном времени</p>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              {isLoading || activitiesQuery.isLoading ? (
                <div className="py-8 text-center">
                  <div className="animate-spin w-6 h-6 border-4 border-gray-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                  <p className="text-gray-500">Загрузка...</p>
                </div>
              ) : error || activitiesQuery.error ? (
                <div className="py-8 text-center text-red-600 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  <span>Ошибка загрузки данных</span>
                </div>
              ) : activities.length === 0 ? (
                <div className="py-8 text-center text-gray-500">Нет недавней активности</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-200 hover:bg-transparent">
                      <TableHead className="text-gray-500 font-medium">Время</TableHead>
                      <TableHead className="text-gray-500 font-medium">Пользователь</TableHead>
                      <TableHead className="text-gray-500 font-medium">Событие</TableHead>
                      <TableHead className="text-gray-500 font-medium">Статус</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activities.map((activity) => (
                      <TableRow key={activity.id} className="border-gray-100 hover:bg-gray-50/50">
                        <TableCell className="font-mono text-sm text-gray-500">
                          {formatActivityTime(activity.timestamp.toString())}
                        </TableCell>
                        <TableCell className="font-medium text-gray-900">
                          {activity.telegramId === "System" ? (
                            <div className="flex items-center">
                              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2" />
                              Система
                            </div>
                          ) : (
                            <div className="flex items-center">
                              {/* <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mr-2 text-xs font-medium text-gray-700">
                                {(activity.telegramId || "??").slice(-2).toUpperCase()}
                              </div> */}
                              {activity.telegramId || "Неизвестно"}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-gray-900">{activity.event}</TableCell>
                        <TableCell>
                          <StatusBadge status={activity.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}