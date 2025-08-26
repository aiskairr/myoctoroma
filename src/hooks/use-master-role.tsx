import { useAuth } from "@/contexts/SimpleAuthContext";

export function useIsMaster() {
  const { user, isLoading } = useAuth();
  
  return {
    isMaster: user?.role === "master",
    masterId: user?.master_id,
    isLoading,
    user
  };
}