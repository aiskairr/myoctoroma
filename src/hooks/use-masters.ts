import { useQuery } from '@tanstack/react-query';
import { useBranch } from '@/contexts/BranchContext';
import { getBranchIdWithFallback } from '@/utils/branch-utils';

// Interface for Master from API
export interface Master {
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
    queryKey: ['/api/crm/masters', branchId],
    queryFn: async () => {
      if (!branchId) {
        console.warn('❌ No valid branch ID available, skipping masters fetch');
        return [];
      }

      try {
        // Use the new path-based API structure
        const url = `${import.meta.env.VITE_BACKEND_URL}/api/crm/masters/${branchId}`;
        console.log('📡 Masters API URL:', url);
        
        const response = await fetch(url, {
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
          }
        });

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Необходима авторизация');
          } else if (response.status === 404) {
            throw new Error('Мастера не найдены для данного филиала');
          } else {
            const errorText = await response.text();
            throw new Error(`Ошибка загрузки мастеров: ${response.status} - ${errorText}`);
          }
        }

        const data = await response.json();
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
