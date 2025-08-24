import { QueryClient } from "@tanstack/react-query";
import type { QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
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
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include", // Always include cookies in requests
  });

  console.log(`API Response status: ${res.status}`);
  
  if (res.status === 401) {
    console.error("Authentication error - not authorized");
    // Redirect to login on unauthorized responses
    if (window.location.pathname !== '/login') {
      console.log("Redirecting to login due to 401 error");
      window.location.href = '/login';
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
    
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
      headers: {
        "Accept": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache"
      }
    });
    
    console.log(`Query Response status: ${res.status}`);

    if (res.status === 401) {
      console.error("Authentication error in query request");
      
      // Handle unauthorized based on behavior
      if (unauthorizedBehavior === "returnNull") {
        return null;
      } else if (window.location.pathname !== '/login') {
        // Redirect to login page when we get 401
        console.log("Redirecting to login due to 401 error");
        window.location.href = '/login';
      }
    }

    await throwIfResNotOk(res);
    return await res.json();
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
