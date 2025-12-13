import { useQuery } from '@tanstack/react-query';
import { useBranch } from '@/contexts/BranchContext';
import { getBranchIdWithFallback } from '@/utils/branch-utils';
import { apiGetJson } from '@/lib/api';

// Interface for Master from API
export interface Master {
  username: ReactNode;
  id: number;
  name: string;
  specialization?: string;
  isActive: boolean;
  startWorkHour: string;
  endWorkHour: string;
  description?: string;
  createdAt: string; // Формат: YYYY-MM-DD HH:mm:ss
  photoUrl?: string;
  branchId: string;
}

// Hook to fetch masters for current branch
export const useMasters = () => {
  const { currentBranch, branches } = useBranch();
  
  // Get proper branch ID using utility function
  const branchId = getBranchIdWithFallback(currentBranch, branches);

  return useQuery<Master[]>({
    queryKey: ['/staff', branchId],
    queryFn: async () => {
      if (!branchId) {
        console.warn('❌ No valid branch ID available, skipping masters fetch');
        return [];
      }

      try {
        // Use the shared API helper to avoid cached 304 responses and handle auth
        const response = await apiGetJson<Master[] | { data?: Master[]; staff?: Master[] }>(`/staff?branchId=${branchId}`);
        const data = Array.isArray(response) ? response : response.data || response.staff || [];
        console.log('✅ Loaded masters:', data.length, data.map((m: Master) => ({ id: m.id, name: m.name })));
        return data;
      } catch (error) {
        console.error('❌ Failed to fetch masters:', error);
        throw error;
      }
    },
    enabled: !!branchId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
};
