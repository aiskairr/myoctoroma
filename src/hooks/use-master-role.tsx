import { useSimpleAuth } from "@/contexts/SimpleAuthContext";

export function useIsMaster() {
  const { user, isLoading } = useSimpleAuth();
  
  return {
    isMaster: user?.role === "master",
    masterId: user?.master_id,
    isLoading,
    user
  };
}