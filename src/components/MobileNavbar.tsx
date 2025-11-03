import { useState } from 'react';
import { Link, useLocation } from "wouter";
import { useAuth } from "../contexts/SimpleAuthContext";
import { useLocale } from '@/contexts/LocaleContext';
import {
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
  MessageCircle,
  HelpCircle,
  Sparkles
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
    { path: "/", label: t('sidebar.how_to_use'), icon: <HelpCircle className="h-5 w-5" /> },
    { path: "/clients", label: t('sidebar.clients'), icon: <Users className="h-5 w-5" /> },
    { path: "/chats", label: t('sidebar.chats'), icon: <MessageCircle className="h-5 w-5" /> },
    {
      label: t('sidebar.crm'),
      icon: <FileClock className="h-5 w-5" />,
      children: [
        { path: "/crm/calendar", label: t('sidebar.calendar'), icon: <CalendarDays className="h-5 w-5" /> },
        { path: "/crm/masters", label: t('sidebar.masters'), icon: <UserRound className="h-5 w-5" /> },
        { path: "/services", label: t('sidebar.services'), icon: <Sparkles className="h-5 w-5" /> }
      ]
    },
    { path: "/accounting", label: t('sidebar.accounting'), icon: <Calculator className="h-5 w-5" /> },
    { path: "/salary", label: t('sidebar.salary'), icon: <DollarSign className="h-5 w-5" /> },
    { path: "/gift-certificates", label: t('sidebar.certificates'), icon: <Gift className="h-5 w-5" /> },
    { path: "/settings", label: t('sidebar.settings'), icon: <SettingsIcon className="h-5 w-5" /> },
  ];

  return (
    <div className="bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700/50 shadow-lg px-2 py-1.5 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-1.5">
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-1 rounded-md shadow-md">
          <img width={12} height={6} src={LOGO} alt="logo" />
        </div>
        <h1 className="font-bold text-sm bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Octō CRM</h1>
        <LocaleToggle />
      </div>

      <div className="flex items-center gap-1.5">
        <BranchIndicator compact />

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-slate-300 hover:text-white hover:bg-slate-700/50 h-7 w-7">
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[293px] p-0 bg-gradient-to-b from-slate-900 to-slate-800 border-slate-700/50">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="p-3 flex items-center justify-between border-b border-slate-700/50">
                <div className="flex items-center gap-1.5">
                  <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-1.5 rounded-lg shadow-lg">
                    <img width={14} height={7} src={LOGO} alt="Octō CRM Logo" />
                  </div>
                  <div>
                    <h1 className="font-bold text-sm bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Octō CRM</h1>
                    <p className="text-slate-400 text-[9px]">{t('sidebar.admin_panel')}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="text-slate-300 hover:text-white hover:bg-slate-700/50 h-7 w-7" onClick={() => setOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Branch Selector */}
              <div className="px-2 py-1.5 border-b border-slate-700/50">
                <BranchSelectorDialog />
              </div>

              {/* Navigation */}
              <nav className="flex-grow py-2 px-1.5 overflow-y-auto">
                <ul className="space-y-1">
                  {navItems.map((item, index) => (
                    <li key={item.path || `group-${index}`}>
                      {item.children ? (
                        <div className="mb-1.5">
                          <div className="flex items-center px-2 py-1.5 text-xs font-medium text-slate-300">
                            <span className="mr-2 scale-75">{item.icon}</span>
                            <span>{item.label}</span>
                          </div>
                          <ul className="mt-0.5 space-y-0.5">
                            {item.children.map((child) => (
                              <li key={child.path}>
                                <Link href={child.path || ""}>
                                  <a
                                    className={cn(
                                      "flex items-center px-2 py-1.5 ml-3 rounded-md text-xs transition-all duration-200",
                                      location === child.path
                                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10"
                                        : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                                    )}
                                    onClick={() => setOpen(false)}
                                  >
                                    <span className="mr-2 scale-75">{child.icon}</span>
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
                              "flex items-center px-2 py-2 rounded-md text-xs transition-all duration-200",
                              location === item.path
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10"
                                : "text-slate-300 hover:text-white hover:bg-slate-700/50"
                            )}
                            onClick={() => setOpen(false)}
                          >
                            <span className="mr-2 scale-75">{item.icon}</span>
                            <span>{item.label}</span>
                          </a>
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </nav>

              {/* Footer */}
              <div className="p-2 border-t border-slate-700/50">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center w-full justify-start text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 h-8 text-xs"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4 mr-2 scale-75" />
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