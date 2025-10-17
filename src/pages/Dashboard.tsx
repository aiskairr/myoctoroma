import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Redirect } from "wouter";
import { useAuth } from "@/contexts/SimpleAuthContext";
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
  Activity,
  DollarSign
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
import { useLocale } from "@/contexts/LocaleContext";
import { useIsMaster } from "@/hooks/use-master-role";
import { BookingLinksStats } from "@/components/BookingLinksStats";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];

interface serviceTypeStats {
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
  const { t } = useLocale();
  const { currentBranch } = useBranch();
  const { isMaster, isLoading: masterRoleLoading } = useIsMaster();
  const { user } = useAuth();

  if (!masterRoleLoading && isMaster) {
    return <Redirect to="/master/calendar" />;
  }

  // Проверка доступа: разрешено для admin и superadmin, запрещено для reception
  if (user && user.role !== 'admin' && user.role !== 'superadmin') {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-red-600 font-semibold">
            {t('dashboard.access_denied')}
          </div>
        </div>
      </div>
    );
  }

  const [botStatus, setBotStatus] = useState(false);
  const [stats, setStats] = useState({
    activeUsers: 0,
    messagesToday: 0,
    apiUsage: 0,
  });
  const [activities, setActivities] = useState<any[]>([]);
  const [serviceTypes, setserviceTypes] = useState<serviceTypeStats[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [masterStats, setMasterStats] = useState<MasterStats[]>([]);
  const [dailyAccountingStats, setDailyAccountingStats] = useState({
    recordsCount: 0
  });
  const [dailyCashData, setDailyCashData] = useState({
    dailyIncome: 0,
    dailyExpenses: 0,
    netProfit: 0
  });

  // Состояния для выбора типов графиков
  const [servicesChartType, setServicesChartType] = useState<ChartType>('pie');
  const [mastersChartType, setMastersChartType] = useState<ChartType>('bar');

  const { data, isLoading, error } = useQuery({
    queryKey: [`${import.meta.env.VITE_BACKEND_URL}/api/stats?branchID=branch${currentBranch?.id}`, currentBranch?.id],
    refetchInterval: 10000,
    enabled: !!currentBranch?.id,
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/stats?branchID=branch${currentBranch?.id}`, {
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
    queryKey: [`${import.meta.env.VITE_BACKEND_URL}/api/activities?branchID=branch${currentBranch?.id}`, currentBranch?.id],
    refetchInterval: 10000,
    enabled: !!currentBranch?.id,
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/activities?branchID=branch${currentBranch?.id}`, {
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

  const serviceStatsQuery = useQuery({
    queryKey: [`${import.meta.env.VITE_BACKEND_URL}/api/stats/service-types?branchId=${currentBranch?.id}`, currentBranch?.id],
    refetchInterval: 60000,
    enabled: !!currentBranch?.id,
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/stats/service-types?branchId=${currentBranch?.id}`, {
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
    queryKey: [`${import.meta.env.VITE_BACKEND_URL}/api/stats/masters?branchId=${currentBranch?.id}`, currentBranch?.id],
    refetchInterval: 60000,
    enabled: !!currentBranch?.id,
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/stats/masters?branchId=${currentBranch?.id}`, {
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

  const accountingStatsQuery = useQuery({
    queryKey: [`${import.meta.env.VITE_BACKEND_URL}/api/statistics/accounting`, currentBranch?.id],
    refetchInterval: 60000,
    enabled: !!currentBranch?.id,
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/statistics/accounting/${today}/${today}?branchId=${currentBranch?.id}`, {
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
    if (serviceStatsQuery.data && typeof serviceStatsQuery.data === 'object') {
      const apiData = serviceStatsQuery.data as any;
      setserviceTypes(apiData.serviceTypes || []);
      setTotalRevenue(apiData.totalRevenue || 0);
    }
  }, [serviceStatsQuery.data]);

  useEffect(() => {
    if (masterStatsQuery.data && typeof masterStatsQuery.data === 'object') {
      const apiData = masterStatsQuery.data as any;
      if (apiData.masters && Array.isArray(apiData.masters)) {
        setMasterStats(apiData.masters);
      }
    }
  }, [masterStatsQuery.data]);

  useEffect(() => {
    if (accountingStatsQuery.data && typeof accountingStatsQuery.data === 'object') {
      const apiData = accountingStatsQuery.data as any;
      
      // Новый формат данных: data = [доходы, расходы, записей, прибыль]
      if (apiData.success && Array.isArray(apiData.data) && apiData.data.length >= 4) {
        const [dailyIncome, dailyExpenses, recordsCount, netProfit] = apiData.data;
        
        setDailyAccountingStats({
          recordsCount: recordsCount || 0
        });
        
        setDailyCashData({
          dailyIncome: dailyIncome || 0,
          dailyExpenses: dailyExpenses || 0,
          netProfit: netProfit || 0
        });
      } else {
        // Fallback для старого формата
        setDailyAccountingStats({
          recordsCount: apiData.recordsCount || 0
        });
      }
    }
  }, [accountingStatsQuery.data]);

  const formatActivityTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return format(date, "h:mm a");
  };

  // Рендер графика услуг в зависимости от выбранного типа
  const renderServicesChart = () => {
    if (serviceStatsQuery.isLoading) {
      return (
        <div className="h-80 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-gray-500">Загрузка данных...</p>
          </div>
        </div>
      );
    }

    if (serviceStatsQuery.error) {
      return (
        <div className="h-80 flex items-center justify-center">
          <div className="text-center text-red-600">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>Ошибка загрузки данных</p>
          </div>
        </div>
      );
    }

    if (serviceTypes.length === 0) {
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
                data={serviceTypes}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={2}
                dataKey="revenue"
              >
                {serviceTypes.map((entry, index) => (
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
            <BarChart data={serviceTypes} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
                {serviceTypes.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={serviceTypes} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
            <AreaChart data={serviceTypes} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
                formatter={(value) => [`${value.toLocaleString()} с`, "Выручка"]}
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
            <RadarChart data={serviceTypes}>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} />
              <PolarRadiusAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
              <Tooltip
                formatter={(value) => [`${value.toLocaleString()} с`, "Выручка"]}
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
        const maxRevenue = Math.max(...serviceTypes.map(m => m.revenue));
        const normalizedData = serviceTypes.map(item => ({
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
        <Card className="rounded-xl shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-t-xl">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <Activity className="h-8 w-8" />
                  {t('dashboard.title')}
                </CardTitle>
                <p className="text-blue-100 mt-1">
                  {t('dashboard.overview_title')}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${botStatus ? 'bg-green-400' : 'bg-red-400'}`} />
                  <span className="text-sm font-medium text-blue-100">Статус:</span>
                </div>
                <StatusBadge status={botStatus ? "Online" : "Offline"} />
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
         

          {/* Accounting Stats Cards */}
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{t('dashboard.daily_income')}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{(dailyCashData?.dailyIncome || 0).toLocaleString()}</p>
                </div>
                <div className="p-2 bg-blue-50 rounded-lg">
                  <DollarSign className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{t('dashboard.daily_expenses')}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{(dailyCashData?.dailyExpenses || 0).toLocaleString()}</p>
                </div>
                <div className="p-2 bg-red-50 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{t('dashboard.daily_records')}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{dailyAccountingStats.recordsCount}</p>
                </div>
                <div className="p-2 bg-green-50 rounded-lg">
                  <Activity className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{t('dashboard.daily_profit')}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{(dailyCashData?.netProfit || 0).toLocaleString()}</p>
                </div>
                <div className="p-2 bg-purple-50 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
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
                    {t('dashboard.service_types_month')}
                  </CardTitle>
                  <p className="text-sm text-gray-500">{t('dashboard.revenue_distribution')}</p>
                </div>
                <Select value={servicesChartType} onValueChange={(value) => setServicesChartType(value as ChartType)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Тип графика" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pie">{t('dashboard.pie_chart')}</SelectItem>
                    <SelectItem value="bar">{t('dashboard.bar_chart')}</SelectItem>
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
                  {t('dashboard.masters_workload_month')}
                </CardTitle>
                <p className="text-sm text-gray-500">{t('dashboard.appointments_by_masters')}</p>
              </div>
              <Select value={mastersChartType} onValueChange={(value) => setMastersChartType(value as ChartType)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Тип графика" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bar">{t('dashboard.bar_chart')}</SelectItem>
                  <SelectItem value="line">📈 Линейная</SelectItem>
                  <SelectItem value="area">📉 Площадная</SelectItem>
                  <SelectItem value="pie">{t('dashboard.pie_chart')}</SelectItem>
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

        {/* Booking Links Statistics */}
        <BookingLinksStats />

        {/* Recent Activity */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center text-gray-900">
              <Users className="h-5 w-5 mr-2 text-gray-600" />
              {t('dashboard.recent_actions')}
            </CardTitle>
            <p className="text-sm text-gray-500">{t('dashboard.user_activity_realtime')}</p>
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
                      <TableHead className="text-gray-500 font-medium">{t('dashboard.time')}</TableHead>
                      <TableHead className="text-gray-500 font-medium">{t('dashboard.user')}</TableHead>
                      <TableHead className="text-gray-500 font-medium">{t('dashboard.event')}</TableHead>
                      <TableHead className="text-gray-500 font-medium">{t('dashboard.status')}</TableHead>
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