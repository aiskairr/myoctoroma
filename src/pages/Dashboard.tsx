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
  FileX2,
  TrendingUp,
  Activity
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PieChart, Pie, Cell, Legend, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line, AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  RadialBarChart, RadialBar
} from 'recharts';
import { useBranch } from "@/contexts/BranchContext";
import { useIsMaster } from "@/hooks/use-master-role";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];

interface MassageTypeStats {
  name: string;
  count: number;
  revenue: number;
}

interface MasterStats {
  name: string;
  count: number;
}

type ChartType = 'pie' | 'bar' | 'line' | 'area' | 'radar' | 'radialBar';

export default function Dashboard() {
  const { currentBranch } = useBranch();
  const { isMaster, isLoading: masterRoleLoading } = useIsMaster();

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

  // Состояния для выбора типов графиков
  const [servicesChartType, setServicesChartType] = useState<ChartType>('pie');
  const [mastersChartType, setMastersChartType] = useState<ChartType>('bar');

  const { data, isLoading, error } = useQuery({
    queryKey: [`/api/stats`, currentBranch.waInstance],
    refetchInterval: 10000,
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

  const activitiesQuery = useQuery({
    queryKey: [`/api/activities`, currentBranch.waInstance],
    refetchInterval: 10000,
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

  const massageStatsQuery = useQuery({
    queryKey: [`/api/stats/massage-types?branchId=${currentBranch.waInstance}`, currentBranch.waInstance],
    refetchInterval: 60000,
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

  const masterStatsQuery = useQuery({
    queryKey: [`/api/stats/masters?branchId=${currentBranch.waInstance}`, currentBranch.waInstance],
    refetchInterval: 60000,
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

  const formatActivityTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return format(date, "h:mm a");
  };

  // Рендер графика услуг в зависимости от выбранного типа
  const renderServicesChart = () => {
    if (massageStatsQuery.isLoading) {
      return (
        <div className="h-80 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-gray-500">Загрузка данных...</p>
          </div>
        </div>
      );
    }

    if (massageStatsQuery.error) {
      return (
        <div className="h-80 flex items-center justify-center">
          <div className="text-center text-red-600">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>Ошибка загрузки данных</p>
          </div>
        </div>
      );
    }

    if (massageTypes.length === 0) {
      return (
        <div className="h-80 flex items-center justify-center">
          <p className="text-gray-500 text-center">
            <FileX2 width={50} height={50} className="mx-auto mb-2" />
            Нет данных для отображения
          </p>
        </div>
      );
    }

    switch (servicesChartType) {
      case 'pie':
        return (
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
                formatter={(value) => [`${value.toLocaleString()} KGS`, "Выручка"]}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={massageTypes} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(value) => [`${value.toLocaleString()} KGS`, "Выручка"]}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
              />
              <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                {massageTypes.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={massageTypes} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(value) => [`${value.toLocaleString()} KGS`, "Выручка"]}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
              />
              <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={massageTypes} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(value) => [`${value.toLocaleString()} ₽`, "Выручка"]}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
              />
              <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRevenue)" />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'radar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={massageTypes}>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} />
              <PolarRadiusAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
              <Tooltip
                formatter={(value) => [`${value.toLocaleString()} ₽`, "Выручка"]}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
              />
              <Radar name="Выручка" dataKey="revenue" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
            </RadarChart>
          </ResponsiveContainer>
        );

      case 'radialBar':
        const maxRevenue = Math.max(...massageTypes.map(m => m.revenue));
        const normalizedData = massageTypes.map(item => ({
          ...item,
          percentage: (item.revenue / maxRevenue) * 100
        }));

        return (
          <ResponsiveContainer width="100%" height={300}>
            <RadialBarChart
              innerRadius="10%"
              outerRadius="80%"
              data={normalizedData}
              startAngle={180}
              endAngle={0}
            >
              <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
              <RadialBar
                background
                dataKey="percentage"
              >
                {normalizedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </RadialBar>
              <Tooltip
                formatter={(value, name, props) => [`${props.payload.revenue.toLocaleString()} KGS`, "Выручка"]}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
              />
              <Legend iconSize={10} layout="horizontal" verticalAlign="bottom" wrapperStyle={{ paddingTop: '20px' }} />
            </RadialBarChart>
          </ResponsiveContainer>
        );
    }
  };

  // Рендер графика мастеров в зависимости от выбранного типа
  const renderMastersChart = () => {
    if (masterStatsQuery.isLoading) {
      return (
        <div className="h-80 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-gray-500">Загрузка данных...</p>
          </div>
        </div>
      );
    }

    if (masterStatsQuery.error) {
      return (
        <div className="h-80 flex items-center justify-center">
          <div className="text-center text-red-600">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>Ошибка загрузки данных</p>
          </div>
        </div>
      );
    }

    if (masterStats.length === 0) {
      return (
        <div className="h-80 flex items-center justify-center">
          <p className="text-gray-500 text-center">
            <FileX2 width={50} height={50} className="mx-auto mb-2" />
            Нет данных для отображения
          </p>
        </div>
      );
    }

    switch (mastersChartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={masterStats} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(value) => [`${value}`, "Количество записей"]}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
              />
              <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]}>
                {masterStats.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={masterStats} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(value) => [`${value}`, "Количество записей"]}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
              />
              <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={masterStats} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(value) => [`${value}`, "Количество записей"]}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
              />
              <Area type="monotone" dataKey="count" stroke="#10b981" fillOpacity={1} fill="url(#colorCount)" />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={masterStats}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={2}
                dataKey="count"
              >
                {masterStats.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [`${value}`, "Количество записей"]}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'radar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={masterStats}>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} />
              <PolarRadiusAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
              <Tooltip
                formatter={(value) => [`${value}`, "Количество записей"]}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
              />
              <Radar name="Записей" dataKey="count" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
            </RadarChart>
          </ResponsiveContainer>
        );

      case 'radialBar':
        const maxCount = Math.max(...masterStats.map(m => m.count));
        const normalizedData = masterStats.map(item => ({
          ...item,
          percentage: (item.count / maxCount) * 100
        }));

        return (
          <ResponsiveContainer width="100%" height={300}>
            <RadialBarChart
              innerRadius="10%"
              outerRadius="80%"
              data={normalizedData}
              startAngle={180}
              endAngle={0}
            >
              <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
              <RadialBar
                background
                dataKey="percentage"
              >
                {normalizedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </RadialBar>
              <Tooltip
                formatter={(value, name, props) => [`${props.payload.count}`, "Количество записей"]}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
              />
              <Legend iconSize={10} layout="horizontal" verticalAlign="bottom" wrapperStyle={{ paddingTop: '20px' }} />
            </RadialBarChart>
          </ResponsiveContainer>
        );
    }
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
        <div className="grid grid-cols-1 gap-3">
          {/* Services Distribution */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center text-gray-900">
                    <PieChartIcon className="h-5 w-5 mr-2 text-blue-600" />
                    Типы услуг (текущий месяц)
                  </CardTitle>
                  <p className="text-sm text-gray-500">Распределение по выручке</p>
                </div>
                <Select value={servicesChartType} onValueChange={(value) => setServicesChartType(value as ChartType)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Тип графика" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pie">🥧 Круговая</SelectItem>
                    <SelectItem value="bar">📊 Столбчатая</SelectItem>
                    <SelectItem value="line">📈 Линейная</SelectItem>
                    <SelectItem value="area">📉 Площадная</SelectItem>
                    <SelectItem value="radialBar">⭕ Радиальная</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {renderServicesChart()}
            </CardContent>
          </Card>
        </div>

        {/* Master Statistics */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center text-gray-900">
                  <BarChartIcon className="h-5 w-5 mr-2 text-green-600" />
                  Загруженность мастеров (текущий месяц)
                </CardTitle>
                <p className="text-sm text-gray-500">Количество записей по мастерам</p>
              </div>
              <Select value={mastersChartType} onValueChange={(value) => setMastersChartType(value as ChartType)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Тип графика" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bar">📊 Столбчатая</SelectItem>
                  <SelectItem value="line">📈 Линейная</SelectItem>
                  <SelectItem value="area">📉 Площадная</SelectItem>
                  <SelectItem value="pie">🥧 Круговая</SelectItem>
                  <SelectItem value="radar">🎯 Радарная</SelectItem>
                  <SelectItem value="radialBar">⭕ Радиальная</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {renderMastersChart()}
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