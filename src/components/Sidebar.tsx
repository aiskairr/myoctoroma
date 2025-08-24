import { Link, useLocation } from "wouter";
import { useSimpleAuth } from "../contexts/SimpleAuthContext";
import { 
  LayoutDashboard, 
  Users, 
  Settings as SettingsIcon, 
  LogOut, 
  Bot,
  Calendar,
  Clock,
  FileClock,
  UserRound,
  Calculator,
  DollarSign,
  Gift,
  FileBarChart,
  Sparkles,
  HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useIsAdmin } from "@/hooks/use-admin-role";
import { BranchSelectorDialog, BranchIndicator } from "./BranchSelector";

// Master-only Sidebar Component
function MasterSidebar() {
  const [location, setLocation] = useLocation();
  const { logout } = useSimpleAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const handleLogout = async () => {
    await logout();
    toast({
      title: "Выход из системы",
      description: "Вы успешно вышли из системы.",
      variant: "default",
    });
  };

  return (
    <aside className="shadow-md w-16 lg:w-56 flex flex-col transition-all duration-300" style={{ backgroundColor: '#013220' }}>
      <div className="p-4 flex items-center justify-center lg:justify-start space-x-3 border-b border-white/20">
        <Bot className="text-white h-6 w-6" />
        <h1 className="hidden lg:block font-medium text-lg text-white">Octo CRM</h1>
      </div>
      
      <nav className="flex-grow py-6">
        <ul className="space-y-2">
          <li>
            <Button
              variant="ghost"
              className={cn(
                "flex items-center px-4 py-3 rounded-md mx-2 transition-colors w-full justify-start",
                location === "/master/calendar"
                  ? "text-white bg-white/20"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              )}
              onClick={() => setLocation("/master/calendar")}
            >
              <Calendar className="h-5 w-5" />
              <span className="ml-3 hidden lg:block">Календарь</span>
            </Button>
          </li>
        </ul>
      </nav>
      
      <div className="p-4 border-t border-white/20">
        <Button
          variant="ghost"
          className="flex items-center w-full justify-center lg:justify-start text-white/70 hover:text-white hover:bg-white/10"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5" />
          <span className="ml-3 hidden lg:block">Выйти</span>
        </Button>
      </div>
    </aside>
  );
}

export default function Sidebar() {
  const { user } = useSimpleAuth();
  
  // Show master sidebar for master users
  if (user?.role === 'master') {
    return <MasterSidebar />;
  }
  
  // Show limited sidebar for admin users
  if (user?.role === 'admin') {
    return <AdminOnlySidebar />;
  }
  
  // Show full sidebar for superadmin users
  return <AdminSidebar />;
}

// Admin-only Sidebar Component (без Отчетов, Задач, Дашборда, Мастеров)
function AdminOnlySidebar() {
  const [location, setLocation] = useLocation();
  const { logout } = useSimpleAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const handleLogout = async () => {
    await logout();
    toast({
      title: "Выход из системы",
      description: "Вы успешно вышли из системы.",
      variant: "default",
    });
  };

  const navItems = [
    { path: "/clients", label: "Клиенты", icon: <Users className="h-5 w-5" /> },
    { 
      label: "CRM",
      icon: <FileClock className="h-5 w-5" />,
      children: [
        { path: "/crm/calendar", label: "Календарь", icon: <Calendar className="h-5 w-5" /> },
        { path: "/crm/masters", label: "Расписание сотрудников", icon: <Calendar className="h-5 w-5" /> },
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
    <aside className="shadow-md w-16 lg:w-56 flex flex-col transition-all duration-300" style={{ backgroundColor: '#013220' }}>
      <div className="p-4 flex items-center justify-center lg:justify-start space-x-3 border-b border-white/20">
        <Bot className="text-white h-6 w-6" />
        <h1 className="hidden lg:block font-medium text-lg text-white">Octo CRM</h1>
      </div>
      
      {/* Индикатор текущего филиала */}
      <div className="mt-2 mb-2 px-2">
        <BranchIndicator />
      </div>
      
      <nav className="flex-grow py-2">
        {/* Кнопка выбора филиала - первый пункт */}
        <div className="mb-2 px-2">
          <BranchSelectorDialog />
        </div>
        <div className="border-t border-white/20 my-2"></div>
        
        <ul className="space-y-1">
          {navItems.map((item, index) => (
            <li key={item.path || `group-${index}`}>
              {item.children ? (
                <div className="mb-2">
                  <div className="flex items-center px-4 py-2 text-white/80">
                    {item.icon}
                    <span className="ml-3 hidden lg:block font-medium">{item.label}</span>
                  </div>
                  <ul className="mt-1 ml-4 lg:ml-8 space-y-1">
                    {item.children.map((child) => (
                      <li key={child.path}>
                        <Button
                          variant="ghost"
                          className={cn(
                            "flex items-center px-4 py-2 rounded-md mx-2 transition-colors w-full justify-start",
                            location === child.path
                              ? "text-white bg-white/20"
                              : "text-white/70 hover:text-white hover:bg-white/10"
                          )}
                          onClick={() => setLocation(child.path)}
                        >
                          {child.icon}
                          <span className="ml-3 hidden lg:block">{child.label}</span>
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  className={cn(
                    "flex items-center px-4 py-3 rounded-md mx-2 transition-colors w-full justify-start",
                    location === item.path
                      ? "text-white bg-white/20"
                      : "text-white/70 hover:text-white hover:bg-white/10"
                  )}
                  onClick={() => setLocation(item.path)}
                >
                  {item.icon}
                  <span className="ml-3 hidden lg:block">{item.label}</span>
                </Button>
              )}
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="p-4 border-t border-white/20">
        <Button
          variant="ghost"
          className="flex items-center w-full justify-center lg:justify-start text-white/70 hover:text-white hover:bg-white/10"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5" />
          <span className="ml-3 hidden lg:block">Выйти</span>
        </Button>
      </div>
    </aside>
  );
}

// Admin/SuperAdmin Sidebar Component
function AdminSidebar() {
  const [location, setLocation] = useLocation();
  const { logout } = useSimpleAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const handleLogout = async () => {
    await logout();
    toast({
      title: "Выход из системы",
      description: "Вы успешно вышли из системы.",
      variant: "default",
    });
  };

  const navItems = [
    { path: "/", label: "Дашборд", icon: <LayoutDashboard className="h-5 w-5" /> },
    { path: "/clients", label: "Клиенты", icon: <Users className="h-5 w-5" /> },
    { 
      label: "CRM",
      icon: <FileClock className="h-5 w-5" />,
      children: [
        { path: "/crm/tasks", label: "Задачи", icon: <Clock className="h-5 w-5" /> },
        { path: "/crm/calendar", label: "Календарь", icon: <Calendar className="h-5 w-5" /> },
        { path: "/crm/masters", label: "Мастера", icon: <UserRound className="h-5 w-5" /> },
        { path: "/services", label: "Услуги", icon: <Sparkles className="h-5 w-5" /> }
      ]
    },
    { path: "/accounting", label: "Бухгалтерия", icon: <Calculator className="h-5 w-5" /> },
    { path: "/salary", label: "Зарплаты", icon: <DollarSign className="h-5 w-5" /> },
    { path: "/gift-certificates", label: "Сертификаты", icon: <Gift className="h-5 w-5" /> },
    { path: "/reports", label: "Отчеты", icon: <FileBarChart className="h-5 w-5" /> },
    { path: "/how-to-use", label: "Как пользоваться?", icon: <HelpCircle className="h-5 w-5" /> },
    { path: "/settings", label: "Настройки", icon: <SettingsIcon className="h-5 w-5" /> },
  ];

  return (
    <aside className="shadow-md w-16 lg:w-56 flex flex-col transition-all duration-300" style={{ backgroundColor: '#013220' }}>
      <div className="p-4 flex items-center justify-center lg:justify-start space-x-3 border-b border-white/20">
        <Bot className="text-white h-6 w-6" />
        <h1 className="hidden lg:block font-medium text-lg text-white">Octo CRM</h1>
      </div>
      
      {/* Индикатор текущего филиала */}
      <div className="mt-2 mb-2 px-2">
        <BranchIndicator />
      </div>
      
      <nav className="flex-grow py-2">
        {/* Кнопка выбора филиала - первый пункт */}
        <div className="mb-2 px-2">
          <BranchSelectorDialog />
        </div>
        <div className="border-t border-white/20 my-2"></div>
        
        <ul className="space-y-1">
          {navItems.map((item, index) => (
            <li key={item.path || `group-${index}`}>
              {item.children ? (
                <div className="mb-2">
                  <div className="flex items-center px-4 py-2 text-white/80">
                    {item.icon}
                    <span className="ml-3 hidden lg:block font-medium">{item.label}</span>
                  </div>
                  <ul className="mt-1 ml-4 lg:ml-8 space-y-1">
                    {item.children.map((child) => (
                      <li key={child.path}>
                        <Button
                          variant="ghost"
                          className={cn(
                            "flex items-center px-4 py-2 rounded-md mx-2 transition-colors w-full justify-start",
                            location === child.path
                              ? "text-white bg-white/20"
                              : "text-white/70 hover:text-white hover:bg-white/10"
                          )}
                          onClick={() => setLocation(child.path)}
                        >
                          {child.icon}
                          <span className="ml-3 hidden lg:block">{child.label}</span>
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  className={cn(
                    "flex items-center px-4 py-3 rounded-md mx-2 transition-colors w-full justify-start",
                    location === item.path
                      ? "text-white bg-white/20"
                      : "text-white/70 hover:text-white hover:bg-white/10"
                  )}
                  onClick={() => setLocation(item.path)}
                >
                  {item.icon}
                  <span className="ml-3 hidden lg:block">{item.label}</span>
                </Button>
              )}
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="p-4 border-t border-white/20">
        <Button
          variant="ghost"
          className="flex items-center w-full justify-center lg:justify-start text-white/70 hover:text-white hover:bg-white/10"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5" />
          <span className="ml-3 hidden lg:block">Выйти</span>
        </Button>
      </div>
    </aside>
  );
}
