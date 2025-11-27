import { useState } from 'react';
import { Link, useLocation } from "wouter";
import { useLocale } from '@/contexts/LocaleContext';
import {
  Users,
  Settings as SettingsIcon,
  CalendarDays,
  LayoutGrid,
  Calculator,
  UserRound,
  Sparkles,
  HelpCircle,
  DollarSign,
  Gift,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export function MobileBottomTabBar() {
  const [location, navigate] = useLocation();
  const { t } = useLocale();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [accountingOpen, setAccountingOpen] = useState(false);

  const handleNavigation = (path: string, closeSheet: () => void) => {
    navigate(path);
    closeSheet();
  };

  const settingsItems = [
    { path: "/settings", label: t('nav.settings'), icon: <SettingsIcon className="h-5 w-5" /> },
    { path: "/crm/masters", label: t('nav.masters'), icon: <UserRound className="h-5 w-5" /> },
    { path: "/services", label: t('nav.services'), icon: <Sparkles className="h-5 w-5" /> },
    { path: "/how-to-use", label: t('nav.how_to_use'), icon: <HelpCircle className="h-5 w-5" /> },
  ];

  const accountingItems = [
    { path: "/accounting", label: t('nav.accounting'), icon: <Calculator className="h-5 w-5" /> },
    { path: "/salary", label: t('nav.salary'), icon: <DollarSign className="h-5 w-5" /> },
    { path: "/gift-certificates", label: t('nav.gift_certificates'), icon: <Gift className="h-5 w-5" /> },
    { path: "/reports", label: t('nav.reports'), icon: <FileText className="h-5 w-5" /> },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900 to-slate-800 border-t border-slate-700/50 shadow-2xl z-50">
      <div className="grid grid-cols-5 items-end px-2 py-3">
        {/* Dashboard */}
        <Link href="/dashboard">
          <a
            className={cn(
              "flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-all duration-200",
              location === "/dashboard"
                ? "text-emerald-400"
                : "text-slate-400 hover:text-white"
            )}
          >
            <LayoutGrid className="h-6 w-6" />
            <span className="text-[10px] font-medium">{t('nav.dashboard')}</span>
          </a>
        </Link>

        {/* Clients */}
        <Link href="/clients">
          <a
            className={cn(
              "flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-all duration-200",
              location === "/clients"
                ? "text-emerald-400"
                : "text-slate-400 hover:text-white"
            )}
          >
            <Users className="h-6 w-6" />
            <span className="text-[10px] font-medium">{t('nav.clients')}</span>
          </a>
        </Link>

        {/* Calendar - Center & Larger */}
        <Link href="/crm/calendar">
          <a
            className={cn(
              "flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200 -mt-4 mx-auto",
              location === "/crm/calendar" || location.startsWith("/crm/calendar")
                ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30 scale-110"
                : "bg-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-white"
            )}
          >
            <CalendarDays className="h-7 w-7" />
            <span className="text-[10px] font-medium">{t('nav.calendar')}</span>
          </a>
        </Link>

        {/* Accounting - Opens Modal (MOVED BEFORE SETTINGS) */}
        <Sheet open={accountingOpen} onOpenChange={setAccountingOpen}>
          <SheetTrigger asChild>
            <button
              className={cn(
                "flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-all duration-200 w-full",
                ["/accounting", "/salary", "/gift-certificates", "/reports"].includes(location)
                  ? "text-emerald-400"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <Calculator className="h-6 w-6" />
              <span className="text-[10px] font-medium">{t('nav.finance')}</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="bg-gradient-to-b from-slate-900 to-slate-800 border-slate-700/50 rounded-t-2xl">
            <SheetHeader>
              <SheetTitle className="text-slate-100">{t('nav.accounting')}</SheetTitle>
            </SheetHeader>
            <div className="grid gap-2 py-4">
              {accountingItems.map((item) => (
                <Button
                  key={item.path}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start text-left h-14",
                    location === item.path
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "text-slate-300 hover:text-white hover:bg-slate-700/50"
                  )}
                  onClick={() => handleNavigation(item.path, () => setAccountingOpen(false))}
                >
                  <span className="mr-3">{item.icon}</span>
                  <span>{item.label}</span>
                </Button>
              ))}
            </div>
          </SheetContent>
        </Sheet>

        {/* Settings - Opens Modal (MOVED AFTER ACCOUNTING) */}
        <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
          <SheetTrigger asChild>
            <button
              className={cn(
                "flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-all duration-200 w-full",
                ["/settings", "/crm/masters", "/services", "/how-to-use"].includes(location)
                  ? "text-emerald-400"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <SettingsIcon className="h-6 w-6" />
              <span className="text-[10px] font-medium">{t('nav.settings')}</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="bg-gradient-to-b from-slate-900 to-slate-800 border-slate-700/50 rounded-t-2xl">
            <SheetHeader>
              <SheetTitle className="text-slate-100">{t('nav.settings')}</SheetTitle>
            </SheetHeader>
            <div className="grid gap-2 py-4">
              {settingsItems.map((item) => (
                <Button
                  key={item.path}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start text-left h-14",
                    location === item.path
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "text-slate-300 hover:text-white hover:bg-slate-700/50"
                  )}
                  onClick={() => handleNavigation(item.path, () => setSettingsOpen(false))}
                >
                  <span className="mr-3">{item.icon}</span>
                  <span>{item.label}</span>
                </Button>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
