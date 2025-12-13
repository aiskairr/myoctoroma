import { QueryClient } from "@tanstack/react-query";
import type { QueryFunction } from "@tanstack/react-query";
import Cookies from "js-cookie";
import { navigateTo } from "@/utils/navigation";
import { requestTokenRefresh } from "@/API/http";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let text = res.statusText;
    try {
      // Пытаемся прочитать текст только если тело не было уже прочитано
      text = await res.text();
    } catch (error) {
      // Если не можем прочитать тело (уже прочитано), используем statusText
      console.warn("Could not read response body, using statusText:", error);
    }
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  console.log(`API Request: ${method} ${url}`);
  
  const headers: Record<string, string> = {
    "Accept": "application/json",
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Pragma": "no-cache"
  };
  
  // Автоматически добавляем токен авторизации если он есть
  const token = Cookies.get('token') || localStorage.getItem('auth_token');
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  const executeRequest = () =>
    fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include", // Always include cookies in requests
    });

  let res = await executeRequest();

  if (res.status === 401) {
    const newToken = await requestTokenRefresh().catch((err) => {
      console.error("Failed to refresh token before retry:", err);
      return null;
    });
    if (newToken) {
      headers["Authorization"] = `Bearer ${newToken}`;
      res = await executeRequest();
    }
  }

  console.log(`API Response status: ${res.status}`);
  
  if (res.status === 401) {
    console.error("Authentication error - not authorized");
    // Clear invalid tokens
    Cookies.remove('token');
    Cookies.remove('user');
    localStorage.removeItem('uuid');
    // Redirect to login on unauthorized responses
    if (window.location.pathname !== '/login') {
      console.log("Redirecting to login due to 401 error");
      navigateTo('/login', { replace: true });
    }
  }
  
  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    console.log(`Query Request: GET ${queryKey[0]}`);
    
    const headers: Record<string, string> = {
      "Accept": "application/json",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache"
    };
    
    // Автоматически добавляем токен авторизации если он есть
    const token = Cookies.get('token') || localStorage.getItem('auth_token');
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    
    const executeRequest = () =>
      fetch(queryKey[0] as string, {
        credentials: "include",
        headers
      });

    let res = await executeRequest();

    if (res.status === 401) {
      const newToken = await requestTokenRefresh().catch((err) => {
        console.error("Failed to refresh token before retry:", err);
        return null;
      });
      if (newToken) {
        headers["Authorization"] = `Bearer ${newToken}`;
        res = await executeRequest();
      }
    }
    
    console.log(`Query Response status: ${res.status}`);

    if (res.status === 401) {
      console.error("Authentication error in query request");
      
      // Clear invalid tokens
      Cookies.remove('token');
      Cookies.remove('user');
      localStorage.removeItem('uuid');
      
      // Handle unauthorized based on behavior
      if (unauthorizedBehavior === "returnNull") {
        return null;
      } else if (window.location.pathname !== '/login') {
        // Redirect to login page when we get 401
        console.log("Redirecting to login due to 401 error");
        navigateTo('/login', { replace: true });
      }
    }

    await throwIfResNotOk(res);
    
    try {
      return await res.json();
    } catch (error) {
      console.error("Error parsing JSON response:", error);
      // Если не можем распарсить JSON, возвращаем null или пустой объект
      return null;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
