import { useState } from 'react';
import { Link, useLocation } from "wouter";
import { useAuth } from "../contexts/SimpleAuthContext";
import { useLocale } from '@/contexts/LocaleContext';
import {
  LayoutDashboard,
  Users,
  Settings as SettingsIcon,
  LogOut,
  Menu,
  X,
  FileClock,
  CalendarDays,
  UserRound,
  Calculator,
  DollarSign,
  Gift,
  MessageCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LocaleToggle } from '@/components/ui/locale-toggle';
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { BranchSelectorDialog, BranchIndicator } from "./BranchSelector";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import LOGO from "./assets/PROM_logo_big_white.svg"

export function MobileNavbar() {
  const [location] = useLocation();
  const { logout } = useAuth();
  const { toast } = useToast();
  const { t } = useLocale();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    toast({
      title: t('sidebar.logout_success'),
      description: t('sidebar.logout_success_desc'),
      variant: "default",
    });
    setOpen(false);
  };

  const navItems = [
    { path: "/", label: t('sidebar.dashboard'), icon: <LayoutDashboard className="h-5 w-5" /> },
    { path: "/clients", label: t('sidebar.clients'), icon: <Users className="h-5 w-5" /> },
    { path: "/chats", label: t('sidebar.chats'), icon: <MessageCircle className="h-5 w-5" /> },
    {
      label: t('sidebar.crm'),
      icon: <FileClock className="h-5 w-5" />,
      children: [
        { path: "/crm/calendar", label: t('sidebar.calendar'), icon: <CalendarDays className="h-5 w-5" /> },
        { path: "/crm/masters", label: t('sidebar.masters'), icon: <UserRound className="h-5 w-5" /> }
      ]
    },
    { path: "/accounting", label: t('sidebar.accounting'), icon: <Calculator className="h-5 w-5" /> },
    { path: "/salary", label: t('sidebar.salary'), icon: <DollarSign className="h-5 w-5" /> },
    { path: "/gift-certificates", label: t('sidebar.certificates'), icon: <Gift className="h-5 w-5" /> },
    { path: "/settings", label: t('sidebar.settings'), icon: <SettingsIcon className="h-5 w-5" /> },
  ];

  return (
    <div className="bg-background border-b shadow-sm px-4 py-3 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-2">
        <img width={20} height={10} src={LOGO} alt="logo" />
        <h1 className="font-medium text-lg">Octō CRM</h1>
        <LocaleToggle />
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
              <div className="p-4 flex items-center justify-between border-b bg-gradient-to-r from-primary/5 to-primary/10">
                <div className="flex items-center gap-2">
                  <img width={32} height={32} src={LOGO} alt="Octō CRM Logo" className="h-8 w-auto" />
                  <h1 className="font-semibold text-lg">Octō CRM</h1>
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
                          <div className="flex items-center px-4 py-2 text-sm font-medium text-muted-foreground">
                            <span className="mr-3">{item.icon}</span>
                            <span>{item.label}</span>
                          </div>
                          <ul className="mt-1 space-y-1">
                            {item.children.map((child) => (
                              <li key={child.path}>
                                <Link href={child.path || ""}>
                                  <a
                                    className={cn(
                                      "flex items-center px-4 py-2.5 mx-2 rounded-lg text-sm transition-all duration-200",
                                      location === child.path
                                        ? "text-primary bg-primary/10 font-medium shadow-sm"
                                        : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                                    )}
                                    onClick={() => setOpen(false)}
                                  >
                                    <span className="mr-3">{child.icon}</span>
                                    <span>{child.label}</span>
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
                              "flex items-center px-4 py-3 mx-2 rounded-lg text-sm transition-all duration-200",
                              location === item.path
                                ? "text-primary bg-primary/10 font-medium shadow-sm"
                                : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                            )}
                            onClick={() => setOpen(false)}
                          >
                            <span className="mr-3">{item.icon}</span>
                            <span>{item.label}</span>
                          </a>
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </nav>

              <div className="p-4 border-t mt-auto bg-muted/30">
                <Button
                  variant="ghost"
                  className="flex items-center w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200"
                  onClick={handleLogout}
                >
                  <LogOut className="h-5 w-5 mr-3" />
                  <span>{t('sidebar.logout')}</span>
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}