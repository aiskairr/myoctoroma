import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Redirect } from "wouter";
import type { Activity } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatusBadge from "@/components/StatusBadge";
import { 
  LayoutDashboard, 
  Users, 
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
  Cpu,
  Currency,
  AlertCircle,
  MessageSquare
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

// Цвета для диаграмм
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A569BD', '#F4D03F', '#E74C3C', '#2ECC71', '#1ABC9C', '#D35400'];

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
  const [activities, setActivities] = useState<Activity[]>([]);
  const [massageTypes, setMassageTypes] = useState<MassageTypeStats[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [masterStats, setMasterStats] = useState<MasterStats[]>([]);

  // Fetch dashboard data - добавляем параметр филиала
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/stats", currentBranch.waInstance],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Fetch recent activities - добавляем параметр филиала
  const activitiesQuery = useQuery({
    queryKey: ["/api/activities", currentBranch.waInstance],
    refetchInterval: 10000, // Refresh every 10 seconds
  });
  
  // Fetch massage type statistics - добавляем параметр филиала
  const massageStatsQuery = useQuery({
    queryKey: [`/api/stats/massage-types?branchId=${currentBranch.waInstance}`, currentBranch.waInstance],
    refetchInterval: 60000, // Refresh every minute
  });
  
  // Fetch master statistics - добавляем параметр филиала
  const masterStatsQuery = useQuery({
    queryKey: [`/api/stats/masters?branchId=${currentBranch.waInstance}`, currentBranch.waInstance],
    refetchInterval: 60000, // Refresh every minute
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
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-semibold text-gray-900">Dashboard</h1>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Status:</span>
          <StatusBadge status={botStatus ? "Online" : "Offline"} />
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-10">
        {/* Active Users Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium">Active Users</h2>
              <LayoutDashboard className="h-5 w-5 text-primary" />
            </div>
            <div className="flex items-end space-x-2">
              <span className="text-3xl font-medium">{stats.activeUsers}</span>
              <span className="text-muted-foreground text-sm pb-1">users</span>
            </div>
          </CardContent>
        </Card>
        
        {/* Messages Today Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium">Messages Today</h2>
              <MessageSquare className="h-5 w-5 text-accent" />
            </div>
            <div className="flex items-end space-x-2">
              <span className="text-3xl font-medium">{stats.messagesToday}</span>
              <span className="text-muted-foreground text-sm pb-1">messages</span>
            </div>
          </CardContent>
        </Card>
        
        {/* API Usage Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium">API Usage</h2>
              <Cpu className="h-5 w-5 text-secondary" />
            </div>
            <div className="flex items-end space-x-2">
              <span className="text-3xl font-medium">{stats.apiUsage}%</span>
              <span className="text-muted-foreground text-sm pb-1">of limit</span>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Бизнес-аналитика: новые диаграммы */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Круговая диаграмма видов массажа */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChartIcon className="h-5 w-5 mr-2 text-primary" />
              <span>Типы услуг (текущий месяц)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {massageStatsQuery.isLoading ? (
              <div className="h-80 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                  <p className="text-muted-foreground">Загрузка данных...</p>
                </div>
              </div>
            ) : massageStatsQuery.error ? (
              <div className="h-80 flex items-center justify-center">
                <div className="text-center text-destructive">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                  <p>Ошибка загрузки данных</p>
                </div>
              </div>
            ) : massageTypes.length === 0 ? (
              <div className="h-80 flex items-center justify-center">
                <p className="text-muted-foreground">Нет данных для отображения</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={massageTypes}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="revenue"
                  >
                    {massageTypes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [`${value} ₽`, "Выручка"]}
                    labelFormatter={(name) => `${name}`}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>


      </div>
      
      {/* Статистика мастеров */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChartIcon className="h-5 w-5 mr-2 text-accent" />
            <span>Загруженность мастеров (текущий месяц)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {masterStatsQuery.isLoading ? (
            <div className="h-80 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                <p className="text-muted-foreground">Загрузка данных...</p>
              </div>
            </div>
          ) : masterStatsQuery.error ? (
            <div className="h-80 flex items-center justify-center">
              <div className="text-center text-destructive">
                <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                <p>Ошибка загрузки данных</p>
              </div>
            </div>
          ) : masterStats.length === 0 ? (
            <div className="h-80 flex items-center justify-center">
              <p className="text-muted-foreground">Нет данных для отображения</p>
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
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => [`${value}`, "Количество записей"]} />
                <Bar dataKey="count" name="Записей" fill="#8884d8">
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
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2 text-muted-foreground" />
            <span>Последние действия</span>
          </CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          {isLoading || activitiesQuery.isLoading ? (
            <div className="p-6 text-center">Loading...</div>
          ) : error || activitiesQuery.error ? (
            <div className="p-6 text-center text-destructive flex items-center justify-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span>Error loading data</span>
            </div>
          ) : activities.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">No recent activity</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activities.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell className="text-muted-foreground">
                      {formatActivityTime(activity.timestamp.toString())}
                    </TableCell>
                    <TableCell>{activity.telegramId || "System"}</TableCell>
                    <TableCell>{activity.event}</TableCell>
                    <TableCell>
                      <StatusBadge status={activity.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>
    </div>
  );
}
