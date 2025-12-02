import { useAuth } from "@/contexts/SimpleAuthContext";
import { Loader2 } from "lucide-react";
import { navigateTo } from "@/utils/navigation";

interface SimpleProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

export function SimpleProtectedRoute({ children, requiredRole }: SimpleProtectedRouteProps) {
  const { isAuthenticated, user, isLoading } = useAuth();

  // Показываем загрузку во время проверки аутентификации
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Проверка авторизации...</p>
        </div>
      </div>
    );
  }

  // Если не авторизован, перенаправляем на логин
  if (!isAuthenticated) {
    navigateTo("/login", { replace: true });
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Перенаправление на страницу входа...</p>
        </div>
      </div>
    );
  }

  // Проверяем роль если требуется
  if (requiredRole && user?.role !== requiredRole) {
    // Мастера направляем на календарь
    if (user?.role === 'master') {
      navigateTo("/crm/calendar", { replace: true });
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Перенаправление...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Доступ ограничен</h2>
          <p className="text-gray-600">У вас нет прав для просмотра этой страницы.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
