import React from "react";
import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./contexts/SimpleAuthContext";
import { BranchProvider } from "./contexts/BranchContext";
import { LocaleProvider } from "./contexts/LocaleContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useIsMaster } from "@/hooks/use-master-role";
import SimpleLogin from "@/pages/SimpleLogin";
import { SimpleProtectedRoute } from "@/components/SimpleProtectedRoute";
import Dashboard from "@/pages/Dashboard";
import Clients from "@/pages/Clients";
import Settings from "@/pages/Settings";
import SettingsMasters from "@/pages/SettingsMasters";
import CRMTasks from "./pages/CRMTasks";
import Masters from "./pages/Masters";
import Booking from "./pages/Booking";
import BookingPage from "./pages/BookingPage";
import InternalMessenger from "./pages/InternalMessenger";
import AccountingPage from "./pages/AccountingPage";
import SalaryPage from "./pages/SalaryPage";
import GiftCertificatesPage from "./pages/GiftCertificatesPage";
import ReportPage from "./pages/ReportPage";
import CRMServices from "./pages/CRMServicesTable";
import HowToUsePage from "./pages/HowToUsePage";
import Chats from "./pages/Chats";
import { MobileApp } from "./pages/MobileApp";
import NotFound from "@/pages/not-found";
import Sidebar from "@/components/Sidebar";
import { MobileBottomTabBar } from "@/components/MobileBottomTabBar";
import { MobileHeader } from "@/components/MobileHeader";
import { MobileNavbarMaster } from "@/components/MobileNavbarMaster";
import ErrorBoundary from "@/components/ErrorBoundary";
import CalendarWrapper from "./pages/CalendarWrapper";
import MasterCalendarView from "./pages/Calendar/MasterCalendarView";
import ServicesPage from "./pages/Services";

// Компонент для защищенных маршрутов с layout
function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const { isMaster } = useIsMaster();

  // Для обычных пользователей на мобильных - показываем новый интерфейс
  const showNewMobileUI = isMobile && !isMaster;

  return (
    <SimpleProtectedRoute>
      <BranchProvider>
        <div className="flex flex-col min-h-screen">
          {/* Мобильная навигация для мастеров */}
          {isMobile && isMaster && <MobileNavbarMaster />}
          
          {/* Для обычных пользователей на мобильных - показываем header + bottom bar */}
          {showNewMobileUI && <MobileHeader />}
          
          <div className="flex flex-grow">
            {/* Sidebar только для десктопа */}
            {!isMobile && <Sidebar />}
            
            <main className={`flex-grow overflow-auto bg-gray-50 ${showNewMobileUI ? 'pb-20' : ''}`}>
              <div className="p-3 sm:p-6 lg:p-8">
                <ErrorBoundary>
                  {children}
                </ErrorBoundary>
              </div>
            </main>
          </div>
          
          {/* Bottom Tab Bar для обычных мобильных пользователей */}
          {showNewMobileUI && <MobileBottomTabBar />}
        </div>
      </BranchProvider>
    </SimpleProtectedRoute>
  );
}

function App() {
  return (
    <LocaleProvider>
      <AuthProvider>
        <NotificationProvider>
          <div className="min-h-screen">
          <Switch>
          {/* Публичные маршруты */}
          <Route path="/login" component={SimpleLogin} />
          <Route path="/public/booking" component={BookingPage} />
          <Route path="/booking" component={Booking} />
          
          {/* Публичный Internal Messenger */}
          <Route path="/messenger">
            {() => {
              const urlParams = new URLSearchParams(window.location.search);
              const organisationId = urlParams.get('organisationId') || '1';
              const branchId = urlParams.get('branchId') || undefined;
              
              return (
                <InternalMessenger 
                  organisationId={organisationId} 
                  branchId={branchId}
                />
              );
            }}
          </Route>

          {/* Мобильная версия для мастеров */}
          <Route path="/mobile" component={MobileApp} />

          {/* Защищенные маршруты */}
          <Route path="/">
            <ProtectedLayout>
              <Dashboard />
            </ProtectedLayout>
          </Route>

          <Route path="/dashboard">
            <ProtectedLayout>
              <Dashboard />
            </ProtectedLayout>
          </Route>

          <Route path="/master/settings">
            <ProtectedLayout>
              <SettingsMasters />
            </ProtectedLayout>
          </Route>

          <Route path="/settings">
            <ProtectedLayout>
              <Settings />
            </ProtectedLayout>
          </Route>

          <Route path="/clients">
            <ProtectedLayout>
              <Clients />
            </ProtectedLayout>
          </Route>

          <Route path="/how-to-use">
            <ProtectedLayout>
              <HowToUsePage />
            </ProtectedLayout>
          </Route>

          <Route path="/crm/tasks">
            <ProtectedLayout>
              <CRMTasks />
            </ProtectedLayout>
          </Route>

          {/* Роут для мастеров - использует отдельный компонент */}
          <Route path="/master/calendar">
            <ProtectedLayout>
              <MasterCalendarView />
            </ProtectedLayout>
          </Route>

          <Route path="/crm/calendar">
            <ProtectedLayout>
              <CalendarWrapper />
            </ProtectedLayout>
          </Route>

          <Route path="/crm/masters">
            <ProtectedLayout>
              <Masters />
            </ProtectedLayout>
          </Route>


          <Route path="/accounting">
            <ProtectedLayout>
              <AccountingPage />
            </ProtectedLayout>
          </Route>

          <Route path="/salary">
            <ProtectedLayout>
              <SalaryPage />
            </ProtectedLayout>
          </Route>

          <Route path="/gift-certificates">
            <ProtectedLayout>
              <GiftCertificatesPage />
            </ProtectedLayout>
          </Route>

          <Route path="/report">
            <ProtectedLayout>
              <ReportPage />
            </ProtectedLayout>
          </Route>

          <Route path="/reports">
            <ProtectedLayout>
              <ReportPage />
            </ProtectedLayout>
          </Route>

          <Route path="/services">
            <ProtectedLayout>
              {/* <CRMServices /> */}
              <ServicesPage />
            </ProtectedLayout>
          </Route>

          <Route path="/crm/services">
            <ProtectedLayout>
              <CRMServices />
              <div></div>
            </ProtectedLayout>
          </Route>

          <Route path="/chats">
            <ProtectedLayout>
              <Chats />
            </ProtectedLayout>
          </Route>

          {/* 404 страница */}
          <Route>
            <NotFound />
          </Route>
        </Switch>
      </div>
        <Toaster />
        </NotificationProvider>
      </AuthProvider>
    </LocaleProvider>
  );
}

export default App;