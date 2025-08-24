import { useSimpleAuth } from "@/contexts/SimpleAuthContext";

export function useIsAdmin() {
  const { user, isLoading } = useSimpleAuth();
  
  return {
    isAdmin: user?.role === "admin",
    isLoading,
    user
  };
}