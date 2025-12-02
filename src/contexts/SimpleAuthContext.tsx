import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import Cookies from "js-cookie";
import { navigateTo } from "@/utils/navigation";

// Получаем URL бэкенда из переменной окружения
// Используем прямые URL из .env файла для всех режимов
const SECONDARY_BACKEND_URL = import.meta.env.VITE_SECONDARY_BACKEND_URL || import.meta.env.VITE_BACKEND_URL;

// Проверяем, что URL существует в production режиме
if (!import.meta.env.DEV && !import.meta.env.VITE_BACKEND_URL) {
  console.error("Ошибка конфигурации: URL бэкенда не найден для production.");
}

// Типы пользователей
type UserType = 'admin' | 'user' | 'staff';

// Axios настроен для работы с Bearer token

interface User {
  id: number;
  email: string;
  username: string;
  firstname?: string;
  lastname?: string;
  role: string;
  specialty?: string;
  description?: string;
  is_active?: boolean;
  photo_url?: string;
  organization?: {
    id: number;
    branches?: Array<{
      id: number;
      name: string;
    }>;
  } | null;
  instanceId?: string | null;
  master_id?: number | null;
  organisationId?: number | null;
  organization_id?: number | null;
  orgId?: number | null;
}



interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  userType: UserType | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

// Создаем контекст с начальным состоянием
const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  userType: null,
  isLoading: true,
  login: async () => ({}),
  logout: async () => { },
  checkAuth: async () => { },
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [userType, setUserType] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Восстанавливаем тип пользователя из localStorage при загрузке
  useEffect(() => {
    const savedUserType = localStorage.getItem('user_type') as UserType | null;
    if (savedUserType) {
      setUserType(savedUserType);
    }
  }, []);

  // Функция для проверки сессии
  const checkAuth = async () => {
    console.log("🔍 checkAuth STARTED");
    setIsLoading(true);

    try {
      // Проверяем наличие токена
      const token = localStorage.getItem('auth_token') || Cookies.get('token');
      console.log("🔑 Token check:");
      console.log("  - localStorage:", localStorage.getItem('auth_token') ? "EXISTS" : "NOT FOUND");
      console.log("  - cookies:", Cookies.get('token') ? "EXISTS" : "NOT FOUND");

      if (!token) {
        console.log("❌ No token found, user not authenticated");
        setIsAuthenticated(false);
        setUser(null);
        setIsLoading(false);
        return;
      }

      // Токен есть - восстанавливаем user из localStorage (более надежно) или cookies
      console.log("✅ Token found, restoring session");
      
      // Сначала пробуем localStorage
      const savedUserFromLocalStorage = localStorage.getItem('user_data');
      const savedUserFromCookies = Cookies.get('user');
      
      console.log("🔍 User in localStorage:", savedUserFromLocalStorage ? "EXISTS" : "MISSING");
      console.log("🔍 User in cookies:", savedUserFromCookies ? savedUserFromCookies : "MISSING");
      
      const savedUserStr = savedUserFromLocalStorage || savedUserFromCookies;
      
      if (savedUserStr) {
        try {
          const user = JSON.parse(savedUserStr);
          console.log("👤 Restored user from", savedUserFromLocalStorage ? "localStorage" : "cookies");
          console.log("  - ID:", user.id);
          console.log("  - Email:", user.email);
          console.log("  - Role:", user.role);
          console.log("  - Username:", user.username);
          
          // Валидируем что у пользователя есть все необходимые поля
          if (!user.role || !user.email) {
            console.error("❌ User object is incomplete! Missing role or email");
            console.log("Logging out...");
            setIsAuthenticated(false);
            setUser(null);
            localStorage.removeItem('uuid');
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_data');
            Cookies.remove('token');
            Cookies.remove('user');
            return;
          }
          
          setIsAuthenticated(true);
          setUser(user);
          console.log("✅ User authenticated with role:", user.role);
        } catch (e) {
          console.error("⚠️ Failed to parse user data:", e);
          console.log("⚠️ Corrupted user data, logging out");
          // Если не удалось распарсить данные - логаут
          setIsAuthenticated(false);
          setUser(null);
          localStorage.removeItem('uuid');
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user_data');
          Cookies.remove('token');
          Cookies.remove('user');
        }
      } else {
        console.log("⚠️ No saved user data found, logging out");
        // Если нет данных пользователя - логаут
        setIsAuthenticated(false);
        setUser(null);
        localStorage.removeItem('uuid');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        Cookies.remove('token');
        Cookies.remove('user');
      }
      
    } catch (error) {
      console.error("❌ Auth check failed:", error);
      setIsAuthenticated(false);
      setUser(null);
      localStorage.removeItem('uuid');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      Cookies.remove('token');
      Cookies.remove('user');
    } finally {
      setIsLoading(false);
    }
  };


  // Функция для входа в систему
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    let detectedUserType: UserType | null = null;

    try {
      // Сначала пробуем /admin/ (новый эндпоинт)
      let response = await fetch(`${SECONDARY_BACKEND_URL}/admin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      console.log("Admin login response status:", response.status);

      // Если admin login успешен
      if (response.ok) {
        detectedUserType = 'admin';
      }

      // Если admin login вернул 401, пробуем staff login
      if (response.status === 401) {
        console.log("Admin login failed, trying staffAuthorization/login...");
        response = await fetch(`${SECONDARY_BACKEND_URL}/staffAuthorization/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ email, password }),
        });

        console.log("Staff login response status:", response.status);

        // Если staff login успешен
        if (response.ok) {
          detectedUserType = 'staff';
        }
      }

      // Если staff login тоже вернул 401, пробуем user auth
      if (response.status === 401) {
        console.log("Staff login failed, trying user/auth...");
        response = await fetch(`${SECONDARY_BACKEND_URL}/user/auth`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ email, password }),
        });

        console.log("User login response status:", response.status);

        // Если user login успешен
        if (response.ok) {
          detectedUserType = 'user';
        }
      }

      const responseText = await response.text();
      let result: any = {};
      try {
        result = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        console.error("❌ Failed to parse /user/auth response:", parseError);
      }

      if (!response.ok) {
        console.log("❌ Login request failed with status:", response.status);
        // Специальная обработка для 401 (неверные учетные данные)
        if (response.status === 401) {
          setIsAuthenticated(false);
          setUser(null);
          return {
            success: false,
            message: result?.message || "Неверный логин или пароль"
          };
        }
        const error: any = new Error(result?.message || "Login request failed");
        error.response = { status: response.status, data: result };
        throw error;
      }

      console.log(`🔍 FULL RESPONSE from login (${detectedUserType || 'unknown'} endpoint):`);
      console.log("  Status:", response.status);
      console.log("  Data:", JSON.stringify(result, null, 2));
      console.log("  result.success:", result.success);
      console.log("  result.token:", result.token ? "EXISTS" : "MISSING");
      console.log("  result.accessToken:", result.accessToken ? "EXISTS" : "MISSING");
      console.log("  result.data?.accessToken:", result.data?.accessToken ? "EXISTS" : "MISSING");
      console.log("  result.refreshToken:", result.refreshToken ? "EXISTS" : "MISSING");
      console.log("  result.user:", result.user ? "EXISTS" : "MISSING");
      console.log("  result.data?.user:", result.data?.user ? "EXISTS" : "MISSING");

      // ВАЖНО: Проверяем что аутентификация успешна
      if (result.success === false) {
        console.log("❌ Authentication failed - wrong credentials");
        setIsAuthenticated(false);
        setUser(null);
        return { success: false, message: result.message || "Неверный логин или пароль" };
      }

      // Проверяем какой формат токенов используется
      // Staff API возвращает данные в result.data
      // Staff API использует data.token вместо data.accessToken
      const accessToken = result.accessToken || result.data?.accessToken || result.data?.token || result.token;
      let refreshToken = result.refreshToken || result.data?.refreshToken;
      const userInfo = result.user || result.data?.user;

      console.log("🔍 Checking conditions:");
      console.log("  - result.success:", result.success);
      console.log("  - accessToken:", accessToken ? "EXISTS" : "MISSING");
      console.log("  - userInfo:", userInfo ? "EXISTS" : "MISSING");

      if (result.success && accessToken && userInfo) {
        console.log("✅ Token and user data received from backend");
        console.log("📋 User info:", {
          id: userInfo.id,
          role: userInfo.role
        });

        // Сохраняем данные в localStorage
        localStorage.setItem('uuid', JSON.stringify(result));

        // Сохраняем access token в localStorage
        localStorage.setItem('auth_token', accessToken);
        localStorage.setItem('access_token', accessToken);
        console.log("💾 Access token saved to localStorage");

        // Сохраняем тип пользователя
        if (detectedUserType) {
          setUserType(detectedUserType);
          localStorage.setItem('user_type', detectedUserType);
          console.log(`💾 User type detected and saved: ${detectedUserType}`);
        }

        // Если backend прислал refresh token только в cookies - пытаемся прочитать его
        if (!refreshToken) {
          const refreshTokenFromCookies =
            Cookies.get('refreshToken') ||
            Cookies.get('refresh_token') ||
            Cookies.get('refresh-token');
          
          if (refreshTokenFromCookies) {
            refreshToken = refreshTokenFromCookies;
            console.log("💾 Refresh token extracted from cookies");
          } else {
            console.warn("⚠️ Refresh token not found in response body or cookies");
          }
        }

        // Сохраняем refresh token если есть
        if (refreshToken) {
          localStorage.setItem('refresh_token', refreshToken);
          console.log("💾 Refresh token saved to localStorage");
        }

        // Также сохраняем в cookies для совместимости
        Cookies.set('token', accessToken, {
          expires: 365,
          path: '/',
          sameSite: 'lax'
        });
        
        // Проверяем что токен сохранился
        const savedToken = localStorage.getItem('auth_token');
        console.log("✓ Verification - Token in localStorage:", savedToken ? "EXISTS (length: " + savedToken.length + ")" : "NOT SAVED!");

        // Создаем объект пользователя из данных ответа
        // Используем все доступные данные из userInfo
        const userData = {
          id: userInfo.id,
          email: userInfo.email || email, // Предпочитаем email из ответа, иначе из формы
          username: userInfo.username || userInfo.email || email,
          firstname: userInfo.firstname,
          lastname: userInfo.lastname,
          role: userInfo.role,
          customRole: userInfo.customRole,
          specialty: userInfo.specialty,
          description: userInfo.description,
          is_active: userInfo.is_active !== undefined ? userInfo.is_active : true,
          isActive: userInfo.isActive,
          photo_url: userInfo.photo_url || userInfo.photoUrl,
          organization: userInfo.organization,
          branches: userInfo.branches,
        };

        console.log("📝 Creating user object:", userData);
        console.log("📝 JSON stringified user object:", JSON.stringify(userData));
        console.log("📝 Length of stringified user:", JSON.stringify(userData).length);

        console.log("🔧 Setting authentication state...");
        setIsAuthenticated(true);
        console.log("🔧 setIsAuthenticated(true) called");
        setUser(userData);
        console.log("🔧 setUser called with:", userData);
        
        const userJsonString = JSON.stringify(userData);
        console.log("💾 About to save user data...");
        console.log("💾 User JSON:", userJsonString);
        console.log("💾 User JSON length:", userJsonString.length, "bytes");
        
        // Сохраняем в localStorage (более надежно)
        localStorage.setItem('user_data', userJsonString);
        console.log("✅ User data saved to localStorage");
        
        // Также сохраняем в cookies для совместимости
        Cookies.set('user', userJsonString, {
          expires: 365,
          path: '/',
          sameSite: 'lax'
        });
        console.log("✅ User data saved to cookies");
        
        // Проверяем что данные сохранились ВЕЗДЕ
        const savedInLocalStorage = localStorage.getItem('user_data');
        const savedInCookies = Cookies.get('user');
        
        console.log("✓ Verification IMMEDIATELY AFTER SET:");
        console.log("  - localStorage:", savedInLocalStorage ? "EXISTS" : "❌ NOT SAVED");
        console.log("  - cookies:", savedInCookies ? "EXISTS" : "❌ NOT SAVED");
        
        if (savedInLocalStorage) {
          try {
            const savedUserData = JSON.parse(savedInLocalStorage);
            console.log("✓ localStorage - role:", savedUserData.role);
            console.log("✓ localStorage - id:", savedUserData.id);
            console.log("✓ localStorage - email:", savedUserData.email);
          } catch (e) {
            console.error("❌ Failed to parse localStorage user data:", e);
          }
        }
        
        if (savedInCookies) {
          try {
            const savedUserData = JSON.parse(savedInCookies);
            console.log("✓ cookies - role:", savedUserData.role);
            console.log("✓ cookies - id:", savedUserData.id);
            console.log("✓ cookies - email:", savedUserData.email);
          } catch (e) {
            console.error("❌ Failed to parse cookie user data:", e);
          }
        }
        
        console.log("🎉 Login successful with role:", userData.role);
        console.log("🎉 Returning result:", { success: true, user: userData });

        // Предзагружаем название организации для refresh токена (если доступно)
        if (userData.role === "owner" || userData.role === "admin") {
          preloadOrganizationName(userData.id, accessToken).catch(() => {});
        }

        const finalResult = { success: true, user: userData };
        console.log("📤 FINAL RETURN VALUE:", finalResult);
        return finalResult;
      } else {
        // Нет токена или данных пользователя - значит ошибка
        console.log("❌ No token or user data in response");
        console.log("  AccessToken:", accessToken ? "EXISTS" : "MISSING");
        console.log("  User:", userInfo ? "EXISTS" : "MISSING");
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


  // Функция для входа администратора (не используется, так как используется общая функция login)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const adminLogin = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${SECONDARY_BACKEND_URL}/admin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Чтобы получать куки от бэкенда
        body: JSON.stringify({ email, password }),
      });

      const responseText = await response.text();
      let result: any = {};
      try {
        result = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        console.error("❌ Failed to parse /admin/login response:", parseError);
      }

      if (!response.ok) {
        console.log("❌ Admin login request failed with status:", response.status);
        // Специальная обработка для 401 (неверные учетные данные)
        if (response.status === 401) {
          setIsAuthenticated(false);
          setUser(null);
          return {
            success: false,
            message: result?.message || "Неверный логин или пароль"
          };
        }
        const error: any = new Error(result?.message || "Admin login request failed");
        error.response = { status: response.status, data: result };
        throw error;
      }

      console.log("🔍 FULL RESPONSE from /admin/login:");
      console.log("  Status:", response.status);
      console.log("  Data:", JSON.stringify(result, null, 2));
      console.log("  result.success:", result.success);
      console.log("  result.token:", result.token ? "EXISTS" : "MISSING");
      console.log("  result.user:", result.user ? "EXISTS" : "MISSING");

      // ВАЖНО: Проверяем что аутентификация успешна
      if (result.success === false) {
        console.log("❌ Admin authentication failed - wrong credentials");
        setIsAuthenticated(false);
        setUser(null);
        return { success: false, message: result.message || "Неверный логин или пароль" };
      }

      // Проверяем формат токена
      const accessToken = result.token;
      const userInfo = result.user;

      if (result.success && accessToken && userInfo) {
        console.log("✅ Admin token and user data received from backend");
        console.log("📋 Admin user info:", {
          id: userInfo.id,
          role: userInfo.role,
          username: userInfo.username
        });

        // Сохраняем данные в localStorage
        localStorage.setItem('uuid', JSON.stringify(result));

        // Сохраняем access token в localStorage
        localStorage.setItem('auth_token', accessToken);
        localStorage.setItem('access_token', accessToken);
        console.log("💾 Admin access token saved to localStorage");

        // Также сохраняем в cookies для совместимости
        Cookies.set('token', accessToken, {
          expires: 365,
          path: '/',
          sameSite: 'lax'
        });

        // Проверяем что токен сохранился
        const savedToken = localStorage.getItem('auth_token');
        console.log("✓ Verification - Admin token in localStorage:", savedToken ? "EXISTS (length: " + savedToken.length + ")" : "NOT SAVED!");

        // Создаем объект пользователя из данных ответа
        const userData = {
          id: userInfo.id,
          email: userInfo.username || email, // Используем username из ответа или email из формы
          username: userInfo.username || email,
          firstname: userInfo.first_name,
          lastname: userInfo.last_name,
          role: userInfo.role, // owner, admin, и т.д.
          is_active: true,
        };

        console.log("📝 Creating admin user object:", userData);

        setIsAuthenticated(true);
        setUser(userData);

        const userJsonString = JSON.stringify(userData);
        console.log("💾 About to save admin user data...");

        // Сохраняем в localStorage (более надежно)
        localStorage.setItem('user_data', userJsonString);
        console.log("✅ Admin user data saved to localStorage");

        // Также сохраняем в cookies для совместимости
        Cookies.set('user', userJsonString, {
          expires: 365,
          path: '/',
          sameSite: 'lax'
        });
        console.log("✅ Admin user data saved to cookies");

        // Проверяем что данные сохранились ВЕЗДЕ
        const savedInLocalStorage = localStorage.getItem('user_data');
        const savedInCookies = Cookies.get('user');

        console.log("✓ Verification IMMEDIATELY AFTER SET:");
        console.log("  - localStorage:", savedInLocalStorage ? "EXISTS" : "❌ NOT SAVED");
        console.log("  - cookies:", savedInCookies ? "EXISTS" : "❌ NOT SAVED");

        console.log("🎉 Admin login successful with role:", userData.role);

        // Предзагружаем название организации для refresh токена (если доступно)
        if (userData.role === "owner" || userData.role === "admin") {
          preloadOrganizationName(userData.id, accessToken).catch(() => {});
        }
        return { success: true, user: userData };
      } else {
        // Нет токена или данных пользователя - значит ошибка
        console.log("❌ No admin token or user data in response");
        console.log("  AccessToken:", accessToken ? "EXISTS" : "MISSING");
        console.log("  User:", userInfo ? "EXISTS" : "MISSING");
        setIsAuthenticated(false);
        setUser(null);
        return { success: false, message: result.message || "Ошибка входа администратора" };
      }
    } catch (err: any) {
      console.error("Admin login error:", err);
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
      const token = Cookies.get('token') || localStorage.getItem('auth_token');
      const currentUserType = userType || localStorage.getItem('user_type') as UserType;

      // Выбираем правильный эндпоинт на основе типа пользователя
      let logoutEndpoint = '';
      let logoutMethod = 'DELETE';

      if (currentUserType === 'admin') {
        logoutEndpoint = `${SECONDARY_BACKEND_URL}/admin/logout`;
      } else if (currentUserType === 'staff') {
        logoutEndpoint = `${SECONDARY_BACKEND_URL}/staffAuthorization/logout`;
        logoutMethod = 'POST'; // staff logout использует POST
      } else {
        logoutEndpoint = `${SECONDARY_BACKEND_URL}/user/logout`;
      }

      console.log(`Logging out using ${currentUserType || 'user'} endpoint:`, logoutEndpoint);

      await fetch(logoutEndpoint, {
        method: logoutMethod,
        credentials: "include",
        headers: {
          "Accept": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
      });
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      // Очищаем состояние и все данные авторизации
      setIsAuthenticated(false);
      setUser(null);
      setUserType(null);
      localStorage.removeItem('uuid');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user_data');
      localStorage.removeItem('user_type');
      localStorage.removeItem('organization_name');
      Cookies.remove('token');
      Cookies.remove('user');
      Cookies.remove('refreshToken'); // Удаляем httpOnly refresh token cookie (если доступно)
      Cookies.remove('refresh_token');
      Cookies.remove('refresh-token');
      setIsLoading(false);
      navigateTo("/login", { replace: true });
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
        userType,
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
  const preloadOrganizationName = async (ownerId: number, token: string) => {
    try {
      const response = await fetch(`${SECONDARY_BACKEND_URL}/organizations?ownerId=${ownerId}`, {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to load organizations (${response.status})`);
      }

      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        const orgName = data[0]?.name;
        if (orgName) {
          localStorage.setItem("organization_name", orgName);
          console.log("🏷 Organization name saved for refresh:", orgName);
        }
      }
    } catch (error) {
      console.warn("⚠️ Could not preload organization name:", error);
    }
  };
