import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/SimpleAuthContext";
import { Loader2 } from "lucide-react";

// Публичные маршруты, которые не требуют авторизации
const PUBLIC_ROUTES = [
  "/login",
  "/booking",
  "/public/booking",
  "/messenger",
  "/mobile",
];

interface AuthMiddlewareProps {
  children: React.ReactNode;
}

export function AuthMiddleware({ children }: AuthMiddlewareProps) {
  const [location, setLocation] = useLocation();
  const { isAuthenticated, isLoading } = useAuth();

  // Проверяем, является ли текущий маршрут публичным
  const isPublicRoute = PUBLIC_ROUTES.some((route) => location.startsWith(route));

  useEffect(() => {
    // В production режиме всегда проверяем авторизацию
    const isProduction = import.meta.env.PROD;

    if (isProduction) {
      console.log("🔒 [Production] Auth middleware check:", {
        location,
        isPublicRoute,
        isAuthenticated,
        isLoading,
      });
    }

    // Если не загружается и не авторизован и не на публичном маршруте
    if (!isLoading && !isAuthenticated && !isPublicRoute) {
      console.log("🚫 Unauthorized access attempt. Redirecting to /login...");
      setLocation("/login", { replace: true });
    }
  }, [location, isAuthenticated, isLoading, isPublicRoute, setLocation]);

  // Показываем загрузку во время проверки авторизации
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-700 font-medium">Проверка авторизации...</p>
          <p className="text-gray-500 text-sm mt-2">Пожалуйста, подождите</p>
        </div>
      </div>
    );
  }

  // Если пытаемся зайти на защищенный маршрут без авторизации
  if (!isAuthenticated && !isPublicRoute) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-700 font-medium">Перенаправление на страницу входа...</p>
        </div>
      </div>
    );
  }

  // Если авторизован на /login, перенаправляем на главную
  if (isAuthenticated && location === "/login") {
    setLocation("/", { replace: true });
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-700 font-medium">Перенаправление...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
