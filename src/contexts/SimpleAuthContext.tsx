import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface User {
  id: number;
  email: string;
  username: string;
  role: string;
  instanceId?: string | null;
  master_id?: number | null;
}

interface SimpleAuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  checkAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

const SimpleAuthContext = createContext<SimpleAuthContextType>({
  isAuthenticated: false,
  user: null,
  isLoading: true,
  checkAuth: async () => {},
  logout: async () => {}
});

export function SimpleAuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const response = await fetch("${import.meta.env.VITE_BACKEND_URL}/api/user", {
        method: "GET",
        credentials: "include",
        headers: {
          "Accept": "application/json",
          "Cache-Control": "no-cache"
        }
      });

      if (response.ok) {
        const userData = await response.json();
        if (userData && userData.id) {
          setIsAuthenticated(true);
          setUser(userData);
        } else {
          setIsAuthenticated(false);
          setUser(null);
        }
      } else {
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

  const logout = async () => {
    try {
      await fetch("${import.meta.env.VITE_BACKEND_URL}/api/logout", {
        method: "POST",
        credentials: "include"
      });
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setIsAuthenticated(false);
      setUser(null);
      window.location.href = "/login";
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <SimpleAuthContext.Provider 
      value={{ 
        isAuthenticated, 
        user, 
        isLoading, 
        checkAuth, 
        logout 
      }}
    >
      {children}
    </SimpleAuthContext.Provider>
  );
}

export function useSimpleAuth() {
  const context = useContext(SimpleAuthContext);
  if (!context) {
    throw new Error("useSimpleAuth must be used within SimpleAuthProvider");
  }
  return context;
}