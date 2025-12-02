import { createContext, useContext, useState, useEffect } from "react";
import Cookies from "js-cookie";
import { navigateTo } from "@/utils/navigation";

const SECONDARY_BACKEND_URL = import.meta.env.VITE_SECONDARY_BACKEND_URL || import.meta.env.VITE_BACKEND_URL;

type UserType = 'admin' | 'user';

interface AuthContextType {
  isAuthenticated: boolean;
  user: { id: number; email: string; username: string; role: string } | null;
  userType: UserType | null;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  isLoading: boolean;
  refreshAuth: () => Promise<boolean>;
}

// Create a default context value to avoid undefined error
const defaultContextValue: AuthContextType = {
  isAuthenticated: false,
  user: null,
  userType: null,
  login: async () => ({ success: false }),
  logout: async () => { },
  isLoading: true,
  refreshAuth: async () => false
};

const AuthContext = createContext<AuthContextType>(defaultContextValue);

export function AuthProvider({ children }: { children: any }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<{ id: number; email: string; username: string; role: string } | null>(null);
  const [userType, setUserType] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Восстанавливаем тип пользователя из localStorage при загрузке
  useEffect(() => {
    const savedUserType = localStorage.getItem('user_type') as UserType | null;
    if (savedUserType) {
      setUserType(savedUserType);
    }
  }, []);

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

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      console.log("Attempting login with:", email);

      let detectedUserType: UserType | null = null;

      try {
        // Сначала пробуем авторизоваться через /admin/ (новый эндпоинт)
        let res = await fetch(`${SECONDARY_BACKEND_URL}/admin`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({
            email,
            password
          }),
          credentials: "include"
        });

        console.log("Admin login response status:", res.status);

        // Если admin login успешен, сохраняем тип пользователя
        if (res.ok) {
          detectedUserType = 'admin';
        }

        // Если admin login не удался (401), пробуем user auth
        if (res.status === 401) {
          console.log("Admin login failed, trying user/auth...");
          res = await fetch(`${SECONDARY_BACKEND_URL}/user/auth`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/json"
            },
            body: JSON.stringify({
              email,
              password
            }),
            credentials: "include"
          });
          console.log("User login response status:", res.status);

          // Если user login успешен, сохраняем тип пользователя
          if (res.ok) {
            detectedUserType = 'user';
          }
        }

        try {
          const data = await res.json();
          console.log("Login response data:", data);

          if (res.ok && data.success) {
            console.log("Login successful, setting state...");

            // Сохраняем тип пользователя
            if (detectedUserType) {
              setUserType(detectedUserType);
              localStorage.setItem('user_type', detectedUserType);
              console.log(`User type detected: ${detectedUserType}`);
            }

            // Сохраняем токен из ответа
            if (data.token) {
              Cookies.set('token', data.token, {
                expires: 365,
                path: '/',
                sameSite: 'lax'
              });
              localStorage.setItem('auth_token', data.token);
            }

            // Устанавливаем данные пользователя
            setIsAuthenticated(true);

            if (data.user) {
              setUser(data.user);
            }
            // Примечание: не вызываем checkAuthStatus, так как данные уже получены при login

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
      console.log("Current user type:", userType);

      const token = Cookies.get('token') || localStorage.getItem('auth_token');
      const currentUserType = userType || localStorage.getItem('user_type') as UserType;

      // Выбираем правильный эндпоинт на основе типа пользователя
      let logoutEndpoint = '';
      if (currentUserType === 'admin') {
        logoutEndpoint = `${SECONDARY_BACKEND_URL}/admin/logout`;
      } else {
        logoutEndpoint = `${SECONDARY_BACKEND_URL}/user/logout`;
      }

      try {
        console.log(`Logging out using ${currentUserType} endpoint:`, logoutEndpoint);
        const res = await fetch(logoutEndpoint, {
          method: "DELETE",
          credentials: "include",
          headers: {
            "Accept": "application/json",
            ...(currentUserType === 'admin' && token ? { "Authorization": `Bearer ${token}` } : {})
          }
        });

        console.log(`${currentUserType} logout response status:`, res.status);
      } catch (logoutError) {
        console.error("Logout request error:", logoutError);
      }

      // Очищаем все токены и состояние аутентификации
      Cookies.remove('token');
      Cookies.remove('refreshToken');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user_type');
      setIsAuthenticated(false);
      setUser(null);
      setUserType(null);

      // Перенаправляем на страницу входа с полной перезагрузкой
      navigateTo("/login", { replace: true });
    } catch (error) {
      console.error("Logout error:", error);
      // Даже при ошибке разлогиниваем пользователя локально
      Cookies.remove('token');
      Cookies.remove('refreshToken');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user_type');
      setIsAuthenticated(false);
      setUser(null);
      setUserType(null);
      navigateTo("/login", { replace: true });
    } finally {
      setIsLoading(false);
    }
  };

  const contextValue = {
    isAuthenticated,
    user,
    userType,
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
