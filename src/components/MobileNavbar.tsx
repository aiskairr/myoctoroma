import React, { useState } from 'react';
import { Link, useLocation } from "wouter";
import { useAuth } from "../contexts/SimpleAuthContext";
import { 
  LayoutDashboard, 
  Users, 
  Settings as SettingsIcon, 
  LogOut, 
  Bot,
  Menu,
  X,
  Clock,
  FileClock,
  CalendarDays,
  UserRound,
  Calculator,
  DollarSign,
  Gift
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { BranchSelectorDialog, BranchIndicator } from "./BranchSelector";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function MobileNavbar() {
  const [location] = useLocation();
  const { logout } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    toast({
      title: "Выход из системы",
      description: "Вы успешно вышли из системы.",
      variant: "default",
    });
    setOpen(false);
  };

  const navItems = [
    { path: "/", label: "Дашборд", icon: <LayoutDashboard className="h-5 w-5" /> },
    { path: "/clients", label: "Клиенты", icon: <Users className="h-5 w-5" /> },
    { 
      label: "CRM",
      icon: <FileClock className="h-5 w-5" />,
      children: [
        { path: "/crm/tasks", label: "Задачи", icon: <Clock className="h-5 w-5" /> },
        { path: "/crm/calendar", label: "Календарь", icon: <CalendarDays className="h-5 w-5" /> },
        { path: "/crm/masters", label: "Мастера", icon: <UserRound className="h-5 w-5" /> }
      ]
    },
    { path: "/accounting", label: "Бухгалтерия", icon: <Calculator className="h-5 w-5" /> },
    { path: "/salary", label: "Зарплаты", icon: <DollarSign className="h-5 w-5" /> },
    { path: "/gift-certificates", label: "Сертификаты", icon: <Gift className="h-5 w-5" /> },
    { path: "/settings", label: "Настройки", icon: <SettingsIcon className="h-5 w-5" /> },
  ];

  return (
    <div className="bg-background border-b shadow-sm px-4 py-3 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center">
        <Bot className="text-primary h-6 w-6 mr-2" />
        <h1 className="font-medium text-lg">Octo CRM</h1>
      </div>
      
      <div className="flex items-center gap-2">
        <BranchIndicator compact />
        
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[85vw] sm:w-[350px] p-0">
            <div className="flex flex-col h-full">
              <div className="p-4 flex items-center justify-between border-b">
                <div className="flex items-center">
                  <Bot className="text-primary h-6 w-6 mr-2" />
                  <h1 className="font-medium text-lg">Octo CRM</h1>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              
              <div className="mt-4 mb-2 px-4">
                <BranchSelectorDialog />
              </div>
              
              <nav className="flex-grow py-2 overflow-y-auto">
                <ul className="space-y-1">
                  {navItems.map((item, index) => (
                    <li key={item.path || `group-${index}`}>
                      {item.children ? (
                        <div className="mb-2">
                          <div className="flex items-center px-4 py-2 text-muted-foreground">
                            {item.icon}
                            <span className="ml-3 font-medium">{item.label}</span>
                          </div>
                          <ul className="mt-1 ml-8 space-y-1">
                            {item.children.map((child) => (
                              <li key={child.path}>
                                <Link href={child.path || ""}>
                                  <a
                                    className={cn(
                                      "flex items-center px-4 py-2 rounded-md transition-colors",
                                      location === child.path
                                        ? "text-primary bg-primary/10"
                                        : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                                    )}
                                    onClick={() => setOpen(false)}
                                  >
                                    {child.icon}
                                    <span className="ml-3">{child.label}</span>
                                  </a>
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <Link href={item.path || ""}>
                          <a
                            className={cn(
                              "flex items-center px-4 py-3 rounded-md mx-2 transition-colors",
                              location === item.path
                                ? "text-primary bg-primary/10"
                                : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                            )}
                            onClick={() => setOpen(false)}
                          >
                            {item.icon}
                            <span className="ml-3">{item.label}</span>
                          </a>
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </nav>
              
              <div className="p-4 border-t mt-auto">
                <Button
                  variant="ghost"
                  className="flex items-center w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={handleLogout}
                >
                  <LogOut className="h-5 w-5" />
                  <span className="ml-3">Выйти</span>
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}