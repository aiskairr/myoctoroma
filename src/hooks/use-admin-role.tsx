import { useAuth } from "@/contexts/SimpleAuthContext";

export function useIsAdmin() {
  const { user, isLoading } = useAuth();
  
  return {
    isAdmin: user?.role === "admin",
    isLoading,
    user
  };
}