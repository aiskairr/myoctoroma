import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import axios from "axios";

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
      const storedData = localStorage.getItem('uuid');

      if (!storedData) {
        setIsAuthenticated(false);
        setUser(null);
        setIsLoading(false);
        return;
      }

      const parsedData = JSON.parse(storedData);
      const userId = parsedData?.user?.id;

      if (!userId) {
        setIsAuthenticated(false);
        setUser(null);
        setIsLoading(false);
        return;
      }

      const response = await axios.get(`${BACKEND_URL}/api/user/${userId}`, {
        headers: {
          "Accept": "application/json",
          "Cache-Control": "no-cache",
        },
        withCredentials: true,
      });

      const userData: any = response.data;

      // Проверяем success и hasValidSession
      if (userData && userData.success && userData.hasValidSession && userData.userId) {
        setIsAuthenticated(true);
        setUser({
          id: userData.userId,
          email: userData.email || '',
          username: userData.username || '',
          role: userData.role || '',
          instanceId: userData.instanceId || null,
          master_id: userData.master_id || null,
        });
      } else {
        setIsAuthenticated(false);
        setUser(null);
        localStorage.removeItem('uuid'); // Очищаем невалидные данные
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      setIsAuthenticated(false);
      setUser(null);
      localStorage.removeItem('uuid'); // Очищаем при ошибке
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
      // Очищаем состояние и localStorage
      setIsAuthenticated(false);
      setUser(null);
      localStorage.removeItem('uuid');
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