import { useLocation } from "wouter";
import { useAuth } from "../contexts/SimpleAuthContext";
import {
  LayoutDashboard,
  Users,
  Settings as SettingsIcon,
  LogOut,
  Bot,
  FileClock,
  UserRound,
  Calculator,
  DollarSign,
  Gift,
  FileBarChart,
  Sparkles,
  HelpCircle,
  ChevronDown,
  Calendar as CalendarIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { BranchSelectorDialog, BranchIndicator } from "./BranchSelector";
import { useState, useEffect } from "react";
import LOGO from "./assets/PROM_logo_big_white.svg"

// Интерфейс для типов navItems
interface NavItem {
  path?: string;
  label: string;
  icon: React.ReactNode;
  children?: NavItem[];
}

// Интерфейс для типов useAuth
interface AuthContext {
  user: { role: 'master' | 'admin' | 'reception' | 'superadmin' } | null;
  logout: () => Promise<void>;
}

// Интерфейс для типов useToast
interface ToastContext {
  toast: (props: { title: string; description: string; variant?: string }) => void;
}

// Интерфейс для типов classNames в Calendar
interface CalendarClassNames {
  months?: string;
  month?: string;
  caption?: string;
  caption_label?: string;
  nav?: string;
  nav_button?: string;
  nav_button_previous?: string;
  nav_button_next?: string;
  table?: string;
  head_row?: string;
  head_cell?: string;
  row?: string;
  cell?: string;
  day?: string;
  day_selected?: string;
  day_today?: string;
  day_outside?: string;
  day_disabled?: string;
  day_hidden?: string;
}

// Helper function to set query parameter
function setQueryParam(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.set(key, value);
  window.history.replaceState({}, '', url.toString());
}

// Helper function to get local date in YYYY-MM-DD format
function getLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Master-only Sidebar Component
function MasterSidebar() {
  const [location, setLocation] = useLocation() as [string, (path: string, options?: { replace?: boolean }) => void];
  const { logout } = useAuth() as AuthContext;
  const { toast } = useToast() as ToastContext;

  // Initialize with today's date or query param
  const [date, setDate] = useState<Date | any>(() => {
    const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    const dateParam = urlParams.get('date');
    if (dateParam) {
      const parsedDate = new Date(dateParam);
      return isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
    }
    return new Date();
  });

  const handleDateChange = (selectedDate: Date | undefined) => {
    setDate(selectedDate);
    if (selectedDate) {
      const dateString = getLocalDateString(selectedDate);
      setQueryParam('date', dateString);
    }
  };

  // Set today's date when navigating to calendar page
  useEffect(() => {
    if (location === '/master/calendar' || location === '/crm/calendar') {
      const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
      const dateParam = urlParams.get('date');
      if (!dateParam) {
        const today = new Date();
        const todayString = getLocalDateString(today);
        setQueryParam('date', todayString);
        setDate(today);
      } else {
        const parsedDate = new Date(dateParam);
        if (!isNaN(parsedDate.getTime()) && (!date || getLocalDateString(parsedDate) !== getLocalDateString(date))) {
          setDate(parsedDate);
        }
      }
    }
  }, [location, date]);

  const handleLogout = async () => {
    await logout();
    toast({
      title: "Выход из системы",
      description: "Вы успешно вышли из системы.",
      variant: "default",
    });
  };

  const isCalendarPage = location === "/master/calendar" || location === "/crm/calendar";

  return (
    <TooltipProvider>
      <aside className="bg-gradient-to-b from-slate-900 to-slate-800 border-r border-slate-700/50 shadow-2xl w-80 flex flex-col transition-all duration-300 backdrop-blur-sm">
        {/* Header */}
        <div className="p-6">
          <div className="flex items-center justify-start space-x-3">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-2 rounded-xl shadow-lg">
              <img width={20} height={10} src={LOGO} alt="logo" />
            </div>
            <div>
              <h1 className="font-bold text-xl bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                Octō CRM
              </h1>
              <p className="text-slate-400 text-xs mt-0.5">Мастер панель</p>
            </div>
          </div>
        </div>

        <Separator className="bg-slate-700/50" />

        {/* Calendar Widget - показываем только на странице календаря */}
        {isCalendarPage && (
          <>
            <div className="px-4 py-4">
              <div className="bg-slate-800/50 rounded-lg p-3">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={handleDateChange}
                  className="rounded-md border-none"
                  classNames={{
                    months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                    month: "space-y-4",
                    caption: "flex justify-center pt-1 relative items-center text-slate-200",
                    caption_label: "text-sm font-medium",
                    nav: "space-x-1 flex items-center",
                    nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 text-slate-300 hover:text-white",
                    nav_button_previous: "absolute left-1",
                    nav_button_next: "absolute right-1",
                    table: "w-full border-collapse space-y-1",
                    head_row: "flex",
                    head_cell: "text-slate-400 rounded-md w-8 font-normal text-[0.8rem]",
                    row: "flex w-full mt-2",
                    cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-slate-700 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                    day: "h-8 w-8 p-0 font-normal aria-selected:opacity-100 text-slate-300 hover:bg-slate-700 hover:text-white rounded-md",
                    day_selected: "bg-emerald-500 text-white hover:bg-emerald-600 hover:text-white focus:bg-emerald-500 focus:text-white",
                    day_today: "bg-slate-700 text-white",
                    day_outside: "text-slate-500 opacity-50",
                    day_disabled: "text-slate-500 opacity-50",
                    day_hidden: "invisible",
                  } as CalendarClassNames}
                />
              </div>
            </div>
            <Separator className="bg-slate-700/50" />
          </>
        )}

        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="space-y-2">
            <Button
              variant={location === "/master/calendar" || location === "/crm/calendar" ? "secondary" : "ghost"}
              size="sm"
              className={cn(
                "w-full justify-start h-11 transition-all duration-200",
                location === "/master/calendar" || location === "/crm/calendar"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10"
                  : "text-slate-300 hover:text-white hover:bg-slate-700/50"
              )}
              onClick={() => setLocation("/master/calendar")}
            >
              <CalendarIcon className="h-5 w-5 shrink-0" />
              <span className="ml-3 font-medium">Календарь</span>
            </Button>
          </nav>
        </ScrollArea>

        <Separator className="bg-slate-700/50" />

        {/* Footer */}
        <div className="p-3">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start h-11 text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span className="ml-3 font-medium">Выйти</span>
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  );
}

export default function Sidebar() {
  const { user } = useAuth() as AuthContext;

  // Show master sidebar for master users
  if (user?.role === 'master') {
    return <MasterSidebar />;
  }

  // Show limited sidebar for admin users
  if (user?.role === 'reception') {
    return <AdminOnlySidebar />;
  }

  // Show limited sidebar for admin users
  if (user?.role === 'admin') {
    return <AdminSidebar />;
  }

  // Show full sidebar for superadmin users
  return <AdminSidebar />;
}

// Admin-only Sidebar Component
function AdminOnlySidebar() {
  const [location, setLocation] = useLocation() as [string, (path: string, options?: { replace?: boolean }) => void];
  const { logout } = useAuth() as AuthContext;
  const { toast } = useToast() as ToastContext;
  const [openGroups, setOpenGroups] = useState<string[]>(['CRM']);

  // Initialize with today's date or query param
  const [date, setDate] = useState<Date | any>(() => {
    const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    const dateParam = urlParams.get('date');
    if (dateParam) {
      const parsedDate = new Date(dateParam);
      return isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
    }
    return new Date();
  });

  const handleDateChange = (selectedDate: Date | any) => {
    setDate(selectedDate);
    if (selectedDate) {
      const dateString = getLocalDateString(selectedDate);
      setQueryParam('date', dateString);
    }
  };

  // Set today's date when navigating to calendar page
  useEffect(() => {
    if (location === '/crm/calendar') {
      const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
      const dateParam = urlParams.get('date');
      if (!dateParam) {
        const today = new Date();
        const todayString = getLocalDateString(today);
        setQueryParam('date', todayString);
        setDate(today);
      } else {
        const parsedDate = new Date(dateParam);
        if (!isNaN(parsedDate.getTime()) && (!date || getLocalDateString(parsedDate) !== getLocalDateString(date))) {
          setDate(parsedDate);
        }
      }
    }
  }, [location, date]);

  const handleLogout = async () => {
    await logout();
    toast({
      title: "Выход из системы",
      description: "Вы успешно вышли из системы.",
      variant: "default",
    });
  };

  const toggleGroup = (groupName: string) => {
    setOpenGroups(prev =>
      prev.includes(groupName)
        ? prev.filter(g => g !== groupName)
        : [...prev, groupName]
    );
  };

  const isCalendarPage = location === "/crm/calendar";

  const navItems: NavItem[] = [
    { path: "/clients", label: "Клиенты", icon: <Users className="h-5 w-5" /> },
    {
      label: "CRM",
      icon: <FileClock className="h-5 w-5" />,
      children: [
        { path: "/crm/calendar", label: "Календарь", icon: <CalendarIcon className="h-5 w-5" /> },
        { path: "/crm/masters", label: "Расписание сотрудников", icon: <CalendarIcon className="h-5 w-5" /> },
        { path: "/services", label: "Услуги", icon: <Sparkles className="h-5 w-5" /> }
      ]
    },
    { path: "/accounting", label: "Бухгалтерия", icon: <Calculator className="h-5 w-5" /> },
    { path: "/salary", label: "Зарплаты", icon: <DollarSign className="h-5 w-5" /> },
    { path: "/gift-certificates", label: "Сертификаты", icon: <Gift className="h-5 w-5" /> },
    { path: "/how-to-use", label: "Как пользоваться?", icon: <HelpCircle className="h-5 w-5" /> },
    { path: "/settings", label: "Настройки", icon: <SettingsIcon className="h-5 w-5" /> },
  ];

  return (
    <TooltipProvider>
      <aside className="bg-gradient-to-b from-slate-900 to-slate-800 border-r border-slate-700/50 shadow-2xl w-80 flex flex-col transition-all duration-300 backdrop-blur-sm">
        {/* Header */}
        <div className="p-6">
          <div className="flex items-center justify-start space-x-3">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-2 rounded-xl shadow-lg">
              <img width={20} height={10} src={LOGO} alt="logo" />
            </div>
            <div>
              <h1 className="font-bold text-xl bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                Octō CRM
              </h1>
              <p className="text-slate-400 text-xs mt-0.5">Админ панель</p>
            </div>
          </div>
        </div>
        <Separator className="bg-slate-700/50" />

        {/* Branch Indicator */}
        <div className="px-3 py-2">
          <BranchIndicator />
        </div>

        {/* Branch Selector */}
        <div className="px-3 pb-2">
          <BranchSelectorDialog />
        </div>

        <Separator className="bg-slate-700/50" />

        {/* Calendar Widget - показываем только на странице календаря */}
        {isCalendarPage && (
          <>
            <div className="px-4 py-4">
              <div className="bg-slate-800/50 rounded-lg p-3">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={handleDateChange}
                  className="rounded-md border-none"
                  classNames={{
                    months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                    month: "space-y-4",
                    caption: "flex justify-center pt-1 relative items-center text-slate-200",
                    caption_label: "text-sm font-medium",
                    nav: "space-x-1 flex items-center",
                    nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 text-slate-300 hover:text-white",
                    nav_button_previous: "absolute left-1",
                    nav_button_next: "absolute right-1",
                    table: "w-full border-collapse space-y-1",
                    head_row: "flex",
                    head_cell: "text-slate-400 rounded-md w-8 font-normal text-[0.8rem]",
                    row: "flex w-full mt-2",
                    cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-slate-700 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                    day: "h-8 w-8 p-0 font-normal aria-selected:opacity-100 text-slate-300 hover:bg-slate-700 hover:text-white rounded-md",
                    day_selected: "bg-emerald-500 text-white hover:bg-emerald-600 hover:text-white focus:bg-emerald-500 focus:text-white",
                    day_today: "bg-slate-700 text-white",
                    day_outside: "text-slate-500 opacity-50",
                    day_disabled: "text-slate-500 opacity-50",
                    day_hidden: "invisible",
                  } as CalendarClassNames}
                />
              </div>
            </div>
            <Separator className="bg-slate-700/50" />
          </>
        )}

        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="space-y-2">
            {navItems.map((item, index) => (
              <div key={item.path || `group-${index}`}>
                {item.children ? (
                  <Collapsible
                    open={openGroups.includes(item.label)}
                    onOpenChange={() => toggleGroup(item.label)}
                  >
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start h-11 text-slate-300 hover:text-white hover:bg-slate-700/50 transition-all duration-200 group"
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center">
                            {item.icon}
                            <span className="ml-3 font-medium">{item.label}</span>
                          </div>
                          <ChevronDown className={cn(
                            "h-4 w-4 transition-transform duration-200",
                            openGroups.includes(item.label) ? "rotate-180" : "rotate-0"
                          )} />
                        </div>
                      </Button>
                    </CollapsibleTrigger>

                    <CollapsibleContent className="space-y-1 mt-2">
                      {item.children.map((child) => (
                        <Button
                          key={child.path}
                          variant={location === child.path ? "secondary" : "ghost"}
                          size="sm"
                          className={cn(
                            "w-full justify-start h-10 ml-6 transition-all duration-200",
                            location === child.path
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10"
                              : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                          )}
                          onClick={() => setLocation(child.path!)}
                        >
                          {child.icon}
                          <span className="ml-3 text-sm">{child.label}</span>
                        </Button>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                ) : (
                  <Button
                    variant={location === item.path ? "secondary" : "ghost"}
                    size="sm"
                    className={cn(
                      "w-full justify-start h-11 transition-all duration-200",
                      location === item.path
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10"
                        : "text-slate-300 hover:text-white hover:bg-slate-700/50"
                    )}
                    onClick={() => setLocation(item.path!)}
                  >
                    {item.icon}
                    <span className="ml-3 font-medium">{item.label}</span>
                  </Button>
                )}
              </div>
            ))}
          </nav>
        </ScrollArea>

        <Separator className="bg-slate-700/50" />

        {/* Footer */}
        <div className="p-3">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start h-11 text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span className="ml-3 font-medium">Выйти</span>
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  );
}

// Admin/SuperAdmin Sidebar Component
function AdminSidebar() {
  const [location, setLocation] = useLocation() as [string, (path: string, options?: { replace?: boolean }) => void];
  const { logout } = useAuth() as AuthContext;
  const { toast } = useToast() as ToastContext;
  const [openGroups, setOpenGroups] = useState<string[]>(['CRM']);

  // Initialize with today's date or query param
  const [date, setDate] = useState<Date | any>(() => {
    const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    const dateParam = urlParams.get('date');
    if (dateParam) {
      const parsedDate = new Date(dateParam);
      return isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
    }
    return new Date();
  });

  const handleDateChange = (selectedDate: Date | undefined) => {
    setDate(selectedDate);
    if (selectedDate) {
      const dateString = getLocalDateString(selectedDate);
      setQueryParam('date', dateString);
    }
  };

  // Set today's date when navigating to calendar page
  useEffect(() => {
    if (location === '/crm/calendar') {
      const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
      const dateParam = urlParams.get('date');
      if (!dateParam) {
        const today = new Date();
        const todayString = getLocalDateString(today);
        setQueryParam('date', todayString);
        setDate(today);
      } else {
        const parsedDate = new Date(dateParam);
        if (!isNaN(parsedDate.getTime()) && (!date || getLocalDateString(parsedDate) !== getLocalDateString(date))) {
          setDate(parsedDate);
        }
      }
    }
  }, [location, date]);

  const handleLogout = async () => {
    await logout();
    toast({
      title: "Выход из системы",
      description: "Вы успешно вышли из системы.",
      variant: "default",
    });
  };

  const toggleGroup = (groupName: string) => {
    setOpenGroups(prev =>
      prev.includes(groupName)
        ? prev.filter(g => g !== groupName)
        : [...prev, groupName]
    );
  };

  const isCalendarPage = location === "/crm/calendar";

  const navItems: NavItem[] = [
    { path: "/", label: "Дашборд", icon: <LayoutDashboard className="h-5 w-5" /> },
    { path: "/clients", label: "Клиенты", icon: <Users className="h-5 w-5" /> },
    {
      label: "CRM",
      icon: <FileClock className="h-5 w-5" />,
      children: [
        { path: "/crm/calendar", label: "Календарь", icon: <CalendarIcon className="h-5 w-5" /> },
        { path: "/crm/masters", label: "Мастера", icon: <UserRound className="h-5 w-5" /> },
        { path: "/services", label: "Услуги", icon: <Sparkles className="h-5 w-5" /> }
      ]
    },
    { path: "/accounting", label: "Бухгалтерия", icon: <Calculator className="h-5 w-5" /> },
    { path: "/salary", label: "Зарплаты", icon: <DollarSign className="h-5 w-5" /> },
    { path: "/gift-certificates", label: "Сертификаты", icon: <Gift className="h-5 w-5" /> },
    { path: "/reports", label: "Отчеты", icon: <FileBarChart className="h-5 w-5" /> },
    { path: "/settings", label: "Настройки", icon: <SettingsIcon className="h-5 w-5" /> },
    { path: "/how-to-use", label: "Как пользоваться?", icon: <HelpCircle className="h-5 w-5" /> },
  ];

  return (
    <TooltipProvider>
      <aside className="bg-gradient-to-b from-slate-900 to-slate-800 border-r border-slate-700/50 shadow-2xl w-80 flex flex-col transition-all duration-300 backdrop-blur-sm">
        {/* Header */}
        <div className="p-6">
          <div className="flex items-center justify-start space-x-3">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-2 rounded-xl shadow-lg">
              <div>
                <img width={20} height={10} src={LOGO} alt="logo" />
              </div>
            </div>
            <div>
              <h1 className="font-bold text-xl bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                Octō CRM
              </h1>
            </div>
          </div>
        </div>

        <Separator className="bg-slate-700/50" />

        {/* Branch Indicator */}
        <div className="px-3 py-2">
          <BranchIndicator />
        </div>

        {/* Branch Selector */}
        <div className="px-3 pb-2">
          <BranchSelectorDialog />
        </div>

        <Separator className="bg-slate-700/50" />

        {/* Calendar Widget - показываем только на странице календаря */}
        {isCalendarPage && (
          <>
            <div className="px-4 py-4">
              <div className="bg-slate-800/50 rounded-lg p-3">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={handleDateChange}
                  className="rounded-md border-none"
                  classNames={{
                    months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                    month: "space-y-4",
                    caption: "flex justify-center pt-1 relative items-center text-slate-200",
                    caption_label: "text-sm font-medium",
                    nav: "space-x-1 flex items-center",
                    nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 text-slate-300 hover:text-white",
                    nav_button_previous: "absolute left-1",
                    nav_button_next: "absolute right-1",
                    table: "w-full border-collapse space-y-1",
                    head_row: "flex",
                    head_cell: "text-slate-400 rounded-md w-8 font-normal text-[0.8rem]",
                    row: "flex w-full mt-2",
                    cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-slate-700 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                    day: "h-8 w-8 p-0 font-normal aria-selected:opacity-100 text-slate-300 hover:bg-slate-700 hover:text-white rounded-md",
                    day_selected: "bg-emerald-500 text-white hover:bg-emerald-600 hover:text-white focus:bg-emerald-500 focus:text-white",
                    day_today: "bg-slate-700 text-white",
                    day_outside: "text-slate-500 opacity-50",
                    day_disabled: "text-slate-500 opacity-50",
                    day_hidden: "invisible",
                  } as CalendarClassNames}
                />
              </div>
            </div>
            <Separator className="bg-slate-700/50" />
          </>
        )}

        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="space-y-2">
            {navItems.map((item, index) => (
              <div key={item.path || `group-${index}`}>
                {item.children ? (
                  <Collapsible
                    open={openGroups.includes(item.label)}
                    onOpenChange={() => toggleGroup(item.label)}
                  >
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start h-11 text-slate-300 transition-all hover:bg-slate-800 duration-200 group"
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center">
                            {item.icon}
                            <span className="ml-3 font-medium">{item.label}</span>
                          </div>
                          <ChevronDown className={cn(
                            "h-4 w-4 transition-transform duration-200",
                            openGroups.includes(item.label) ? "rotate-180" : "rotate-0"
                          )} />
                        </div>
                      </Button>
                    </CollapsibleTrigger>

                    <CollapsibleContent className="space-y-1 mt-2">
                      <Separator className="bg-slate-700/50" />
                      {item.children.map((child) => (
                        <Button
                          key={child.path}
                          variant={location === child.path ? "secondary" : "ghost"}
                          size="sm"
                          className={cn(
                            "w-full justify-start h-10 ml-2 transition-all duration-200",
                            location === child.path
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10"
                              : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                          )}
                          onClick={() => setLocation(child.path!)}
                        >
                          {child.icon}
                          <span className="ml-3 text-sm">{child.label}</span>
                        </Button>
                      ))}
                      <Separator className="bg-slate-700/50" />
                    </CollapsibleContent>
                  </Collapsible>
                ) : (
                  <Button
                    variant={location === item.path ? "secondary" : "ghost"}
                    size="sm"
                    className={cn(
                      "w-full justify-start h-11 transition-all duration-200",
                      location === item.path
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10"
                        : "text-slate-300 hover:text-white hover:bg-slate-700/50"
                    )}
                    onClick={() => setLocation(item.path!)}
                  >
                    {item.icon}
                    <span className="ml-3 font-medium">{item.label}</span>
                  </Button>
                )}
              </div>
            ))}
          </nav>
        </ScrollArea>

        <Separator className="bg-slate-700/50" />

        {/* Footer */}
        <div className="p-3">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start h-11 text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span className="ml-3 font-medium">Выйти</span>
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  );
}