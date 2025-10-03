import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import axios from "axios";
import Cookies from "js-cookie";

// Получаем URL бэкенда из переменной окружения
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

// Проверяем, что URL существует, чтобы избежать ошибок
if (!BACKEND_URL) {
  console.error("Ошибка конфигурации: URL бэкенда не найден.");
}

// Настраиваем axios для отправки куки
axios.defaults.withCredentials = true;

interface User {
  id: number;
  email: string;
  username: string;
  role: string;
  instanceId?: string | null;
  master_id?: number | null;
  organisationId?: number | null;
  organization_id?: number | null;
  orgId?: number | null;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

// Создаем контекст с начальным состоянием
const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  isLoading: true,
  login: async () => ({}),
  logout: async () => { },
  checkAuth: async () => { },
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Функция для проверки сессии
  const checkAuth = async () => {
    setIsLoading(true);

    try {
      // Сначала проверяем localStorage
      const storedData = localStorage.getItem('uuid');
      const token = Cookies.get('token');

      if (!storedData && !token) {
        setIsAuthenticated(false);
        setUser(null);
        setIsLoading(false);
        return;
      }

      // Если есть токен, проверяем его на сервере
      if (token) {
        try {
          const response = await fetch(`${BACKEND_URL}/api/user`, {
            method: "GET",
            credentials: "include",
            headers: {
              "Accept": "application/json",
              "Authorization": `Bearer ${token}`
            }
          });

          if (response.ok) {
            const userData = await response.json();
            console.log("Token valid, user data:", userData);
            
            setIsAuthenticated(true);
            setUser({
              id: userData.id,
              email: userData.email || '',
              username: userData.username || '',
              role: userData.role || '',
              instanceId: userData.instanceId || null,
              master_id: userData.master_id || null,
              organisationId: userData.organisationId || null,
              organization_id: userData.organization_id || null,
              orgId: userData.orgId || null,
            });
            
            // Обновляем cookie с актуальными данными
            Cookies.set('user', JSON.stringify(userData));
            setIsLoading(false);
            return;
          } else {
            console.log("Token invalid, clearing auth data");
            // Токен невалиден, очищаем все данные
            setIsAuthenticated(false);
            setUser(null);
            localStorage.removeItem('uuid');
            Cookies.remove('token');
            Cookies.remove('user');
            setIsLoading(false);
            return;
          }
        } catch (error) {
          console.error("Error checking token:", error);
          // При ошибке проверки токена очищаем данные
          setIsAuthenticated(false);
          setUser(null);
          localStorage.removeItem('uuid');
          Cookies.remove('token');
          Cookies.remove('user');
          setIsLoading(false);
          return;
        }
      }

      // Fallback к старому методу через localStorage и cookies
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        const userId = parsedData?.user?.id;

        if (!userId) {
          setIsAuthenticated(false);
          setUser(null);
          setIsLoading(false);
          return;
        }

        const userCookie = Cookies.get('user') || '';
        
        if (userCookie) {
          try {
            const userData = JSON.parse(userCookie);
            
            setIsAuthenticated(true);
            setUser({
              id: userData.id || userId,
              email: userData.email || '',
              username: userData.username || '',
              role: userData.role || '',
              instanceId: userData.instanceId || null,
              master_id: userData.master_id || null,
              organisationId: userData.organisationId || null,
              organization_id: userData.organization_id || null,
              orgId: userData.orgId || null,
            });
          } catch (parseError) {
            console.error("Error parsing user cookie:", parseError);
            setIsAuthenticated(false);
            setUser(null);
            localStorage.removeItem('uuid');
            Cookies.remove('user');
          }
        } else {
          setIsAuthenticated(false);
          setUser(null);
          localStorage.removeItem('uuid');
        }
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      setIsAuthenticated(false);
      setUser(null);
      localStorage.removeItem('uuid');
      Cookies.remove('token');
      Cookies.remove('user');
    } finally {
      setIsLoading(false);
    }
  };

  // Функция для входа в систему
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/login`,
        { email, password },
        {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: true,
        }
      );

      const result: any = response.data;

      if (result.success) {
        // Сохраняем данные в localStorage
        localStorage.setItem('uuid', JSON.stringify(result));
        
        // Сохраняем токен в cookies если он есть
        if (result.token) {
          Cookies.set('token', result.token);
        }

        // Обновляем состояние
        setIsAuthenticated(true);
        setUser(result.user);
        
        return { success: true, user: result.user };
      } else {
        setIsAuthenticated(false);
        setUser(null);
        return { success: false, message: result.message || "Ошибка входа" };
      }
    } catch (err: any) {
      console.error("Login error:", err);
      const message = err.response?.data?.message || "Ошибка подключения к серверу";
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  };

  // Функция для выхода
  const logout = async () => {
    setIsLoading(true);
    try {
      await axios.post(`${BACKEND_URL}/api/logout`, {}, {
        withCredentials: true,
      });
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      // Очищаем состояние и все данные авторизации
      setIsAuthenticated(false);
      setUser(null);
      localStorage.removeItem('uuid');
      Cookies.remove('token');
      Cookies.remove('user');
      setIsLoading(false);
      window.location.href = "/login";
    }
  };

  // Проверка аутентификации при загрузке приложения
  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        isLoading,
        login,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Кастомный хук для использования контекста
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}