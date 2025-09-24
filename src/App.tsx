import React from "react";
import { Switch, Route, Redirect } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./contexts/SimpleAuthContext";
import { BranchProvider } from "./contexts/BranchContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useIsMaster } from "@/hooks/use-master-role";
import { useIsAdmin } from "@/hooks/use-admin-role";
import SimpleLogin from "@/pages/SimpleLogin";
import { SimpleProtectedRoute } from "@/components/SimpleProtectedRoute";
import Dashboard from "@/pages/Dashboard";
import Clients from "@/pages/Clients";
import Settings from "@/pages/Settings";
import CRMTasks from "./pages/CRMTasks";
import DailyCalendar from "./pages/DailyCalendar";
import MasterCalendar from "./pages/MasterCalendar";
import Masters from "./pages/Masters";
import Booking from "./pages/Booking";
import BookingPage from "./pages/BookingPage";
import AccountingPage from "./pages/AccountingPage";
import SalaryPage from "./pages/SalaryPage";
import GiftCertificatesPage from "./pages/GiftCertificatesPage";
import ReportPage from "./pages/ReportPage";
import CRMServices from "./pages/CRMServicesTable";
import HowToUsePage from "./pages/HowToUsePage";
import { MobileApp } from "./pages/MobileApp";
import NotFound from "@/pages/not-found";
import Sidebar from "@/components/Sidebar";
import { MobileNavbar } from "@/components/MobileNavbar";
import { MobileNavbarMaster } from "@/components/MobileNavbarMaster";
import { MobileNavbarAdmin } from "@/components/MobileNavbarAdmin";
import ErrorBoundary from "@/components/ErrorBoundary";
import CalendarScreen from "./pages/Calendar";

// Компонент для защищенных маршрутов с layout
function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const { isMaster } = useIsMaster();
  const { isAdmin } = useIsAdmin();

  // Определяем какой мобильный navbar показать
  const getMobileNavbar = () => {
    if (isMaster) return <MobileNavbarMaster />;
    if (isAdmin) return <MobileNavbarAdmin />;
    return <MobileNavbar />;
  };

  return (
    <SimpleProtectedRoute>
      <div className="flex flex-col min-h-screen">
        {isMobile && getMobileNavbar()}
        <div className="flex flex-grow">
          {!isMobile && <Sidebar />}
          <main className="flex-grow overflow-auto bg-gray-50">
            <div className="p-6 lg:p-8">
              <ErrorBoundary>
                {children}
              </ErrorBoundary>
            </div>
          </main>
        </div>
      </div>
    </SimpleProtectedRoute>
  );
}

function App() {
  return (
    <AuthProvider>
      <BranchProvider>
        <div className="min-h-screen">
          <Switch>
            {/* Публичные маршруты */}
            <Route path="/login" component={SimpleLogin} />
            <Route path="/public/booking" component={BookingPage} />
            <Route path="/booking" component={Booking} />

            {/* Мобильная версия для мастеров */}
            <Route path="/mobile" component={MobileApp} />

            {/* Защищенные маршруты */}
            <Route path="/">
              <ProtectedLayout>
                <Dashboard />
              </ProtectedLayout>
            </Route>

            <Route path="/clients">
              <ProtectedLayout>
                <Clients />
              </ProtectedLayout>
            </Route>

            <Route path="/settings">
              <ProtectedLayout>
                <Settings />
              </ProtectedLayout>
            </Route>

            <Route path="/crm/tasks">
              <ProtectedLayout>
                <CRMTasks />
              </ProtectedLayout>
            </Route>

            <Route path="/crm/calendar">
              <ProtectedLayout>
                <CalendarScreen />
              </ProtectedLayout>
            </Route>

            <Route path={'/crm/calendarscreen'}>
              <ProtectedLayout>
                <DailyCalendar />
              </ProtectedLayout>
            </Route>

            <Route path="/master/calendar">
              <ProtectedLayout>
                <MasterCalendar />
              </ProtectedLayout>
            </Route>

            <Route path="/master-calendar">
              <ProtectedLayout>
                <MasterCalendar />
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
                <CRMServices />
              </ProtectedLayout>
            </Route>

            <Route path="/crm/services">
              <ProtectedLayout>
                <CRMServices />
              </ProtectedLayout>
            </Route>

            <Route path="/how-to-use">
              <ProtectedLayout>
                <HowToUsePage />
              </ProtectedLayout>
            </Route>

            {/* 404 страница */}
            <Route>
              <NotFound />
            </Route>
          </Switch>
        </div>
        <Toaster />
      </BranchProvider>
    </AuthProvider>
  );
}

export default App;