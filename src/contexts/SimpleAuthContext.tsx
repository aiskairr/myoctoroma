import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";

// Получаем URL бэкенда из переменной окружения
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

// Проверяем, что URL существует, чтобы избежать ошибок
if (!BACKEND_URL) {
  console.error("Ошибка конфигурации: URL бэкенда не найден.");
}

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
  logout: async () => {},
  checkAuth: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Функция для проверки сессии
  const checkAuth = async () => {
    setIsLoading(true);
    try {
      // Отправляем запрос с учетными данными для проверки куки
      const response = await fetch(`${BACKEND_URL}/api/user`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Accept": "application/json",
          "Cache-Control": "no-cache",
        },
      });

      if (response.ok) {
        const userData = await response.json();
        // Убеждаемся, что получили данные пользователя
        if (userData && userData.id) {
          setIsAuthenticated(true);
          setUser(userData);
        } else {
          setIsAuthenticated(false);
          setUser(null);
        }
      } else {
        // Если ответ не 200, значит, сессия недействительна
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Функция для входа в систему
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Если вход успешен, обновляем состояние и проверяем сессию
        setIsAuthenticated(true);
        setUser(result.user);
        return { success: true, user: result.user };
      } else {
        setIsAuthenticated(false);
        setUser(null);
        return { success: false, message: result.message || "Ошибка входа" };
      }
    } catch (err) {
      console.error("Login error:", err);
      return { success: false, message: "Ошибка подключения к серверу" };
    } finally {
      setIsLoading(false);
    }
  };

  // Функция для выхода
  const logout = async () => {
    setIsLoading(true);
    try {
      await fetch(`${BACKEND_URL}/api/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      // Очищаем состояние и перенаправляем на страницу входа
      setIsAuthenticated(false);
      setUser(null);
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
