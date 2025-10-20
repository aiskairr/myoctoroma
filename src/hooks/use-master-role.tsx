import { useAuth } from "@/contexts/SimpleAuthContext";

export function useIsMaster() {
  const { user, isLoading } = useAuth();
  
  // Используем masterId (новое поле) с fallback на master_id (deprecated)
  const masterId = user?.masterId || user?.master_id;
  
  return {
    isMaster: user?.role === "master",
    masterId,
    isLoading,
    user
  };
}