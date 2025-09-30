import { createContext, useContext, useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import Cookies from "js-cookie";

interface AuthContextType {
  isAuthenticated: boolean;
  user: { id: number; email: string; username: string; role: string } | null;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  isLoading: boolean;
  refreshAuth: () => Promise<boolean>;
}

// Create a default context value to avoid undefined error
const defaultContextValue: AuthContextType = {
  isAuthenticated: false,
  user: null,
  login: async () => ({ success: false }),
  logout: async () => { },
  isLoading: true,
  refreshAuth: async () => false
};

const AuthContext = createContext<AuthContextType>(defaultContextValue);

export function AuthProvider({ children }: { children: any }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<{ id: number; email: string; username: string; role: string } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [_, setLocation] = useLocation();

  // Упрощенная функция для проверки статуса аутентификации
  const checkAuthStatus = async (): Promise<boolean> => {
    try {
      console.log("Checking authentication status...");
      const token = Cookies.get('token');
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/user`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });

      if (res.ok) {
        const userData = await res.json();

        // Если сервер вернул null, пользователь не авторизован
        if (userData === null) {
          console.log("User not authenticated (null response)");
          setIsAuthenticated(false);
          setUser(null);
          return false;
        }

        // Если есть данные пользователя, устанавливаем авторизацию
        console.log("User authenticated:", userData);
        setIsAuthenticated(true);
        setUser(userData);
        return true;
      } else {
        console.log("User not authenticated (status:", res.status, ")");
        setIsAuthenticated(false);
        setUser(null);
        return false;
      }
    } catch (error) {
      console.error("Auth check error:", error);
      setIsAuthenticated(false);
      setUser(null);
      return false;
    }
  };

  // Публичная функция для обновления статуса аутентификации
  const refreshAuth = async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      const result = await checkAuthStatus();
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  // Проверяем статус аутентификации при первой загрузке
  useEffect(() => {
    const initialAuthCheck = async () => {
      try {
        setIsLoading(true);
        console.log("Performing initial auth check...");
        await checkAuthStatus();
      } catch (error) {
        console.error("Initial auth check error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initialAuthCheck();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      setIsLoading(true);
      console.log("Attempting login with:", username);

      try {
        // Используем правильный endpoint ${import.meta.env.VITE_BACKEND_URL}/api/auth/login
        const res = await fetch("${import.meta.env.VITE_BACKEND_URL}/api/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({
            username, // Отправляем username, а не email
            password
          }),
          credentials: "include"
        });

        console.log("Login response status:", res.status);

        try {
          const data = await res.json();
          console.log("Login response data:", data);

          if (res.ok && data.success) {
            console.log("Login successful, setting state...");

            // Устанавливаем данные пользователя
            setIsAuthenticated(true);

            if (data.user) {
              setUser(data.user);
            } else {
              // Запрашиваем данные пользователя отдельно, на случай если они не были
              // включены в ответ при авторизации
              await checkAuthStatus();
            }

            return { success: true };
          } else {
            console.log("Login failed:", data.message);
            return {
              success: false,
              message: data.message || "Неверный логин или пароль"
            };
          }
        } catch (parseError) {
          console.error("Failed to parse response:", parseError);
          // Если не удалось распарсить JSON, но статус ответа OK
          if (res.ok) {
            setIsAuthenticated(true);
            await checkAuthStatus(); // Повторная проверка авторизации
            return { success: true };
          }
          return {
            success: false,
            message: "Ошибка формата ответа сервера"
          };
        }
      } catch (fetchError) {
        console.error("Fetch error during login:", fetchError);
        return {
          success: false,
          message: "Ошибка при выполнении запроса авторизации"
        };
      }
    } catch (error) {
      console.error("Login request error:", error);
      return {
        success: false,
        message: "Ошибка соединения. Пожалуйста, проверьте подключение к интернету."
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      console.log("Attempting to logout...");

      const res = await fetch("${import.meta.env.VITE_BACKEND_URL}/api/logout", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        }
      });

      console.log("Logout response status:", res.status);

      // Очищаем состояние аутентификации вне зависимости от результата
      setIsAuthenticated(false);
      setUser(null);

      // Перенаправляем на страницу входа с полной перезагрузкой
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout error:", error);
      // Даже при ошибке разлогиниваем пользователя локально
      setIsAuthenticated(false);
      setUser(null);
      window.location.href = "/login";
    } finally {
      setIsLoading(false);
    }
  };

  const contextValue = {
    isAuthenticated,
    user,
    login,
    logout,
    isLoading,
    refreshAuth
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
