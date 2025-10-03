import { useQuery } from '@tanstack/react-query';
import { useBranch } from '@/contexts/BranchContext';
import { useAuth } from '@/contexts/SimpleAuthContext';
import { getBranchIdWithFallback } from '@/utils/branch-utils';
import { format } from 'date-fns';

// Interface for Task/Appointment from API
export interface CalendarTask {
  id: number;
  clientId: number;
  clientName: string;
  status: string;
  serviceType: string | null;
  scheduleDate: string | null;
  scheduleTime: string | null;
  endTime: string | null;
  masterName: string | null;
  masterId: number | null;
  serviceDuration: number | null;
  servicePrice: number | null;
  notes: string | null;
  instanceId: number | null;
  branchId: string;
  client?: {
    telegramId: string;
    firstName?: string;
    lastName?: string;
    customName?: string;
    phoneNumber?: string;
  };
}

// Hook to fetch calendar tasks for a specific date
export function useCalendarTasks(selectedDate: Date = new Date()) {
  const { selectedBranch } = useBranch();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  
  // Debug logging
  console.log("🔍 useCalendarTasks Debug:");
  console.log("  - selectedDate:", selectedDate);
  console.log("  - selectedBranch:", selectedBranch);
  console.log("  - isAuthenticated:", isAuthenticated);
  console.log("  - authLoading:", authLoading);
  console.log("  - user object:", user);
  
  if (user) {
    console.log("  - user.role:", user.role);
    console.log("  - user.master_id:", user.master_id);
  }

  const branchId = getBranchIdWithFallback(selectedBranch);
  const dateStr = selectedDate.toISOString().split('T')[0];
  
  const url = `/api/crm/tasks-calendar/${branchId}`;
  console.log("  - API URL:", url);
  
  // Build query parameters
  const params = new URLSearchParams({
    date: dateStr
  });
  
  // Add user role and master_id if available
  if (user?.role) {
    params.append('userRole', user.role);
  }
  if (user?.master_id) {
    params.append('userMasterId', user.master_id.toString());
  }
  
  const fullUrl = `${url}?${params.toString()}`;
  console.log("  - Full URL with params:", fullUrl);
  console.log("  - Query enabled:", !!branchId && isAuthenticated && !!user && !authLoading);

  return useQuery({
    queryKey: ['calendar-tasks', branchId, dateStr, user?.role, user?.master_id],
    queryFn: async (): Promise<CalendarTask[]> => {
      console.log("📡 Making API request to:", fullUrl);
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch calendar tasks: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("📦 API Response:", data);
      
      if (Array.isArray(data)) {
        return data;
      }
      
      return data.tasks || [];
    },
    enabled: !!branchId && isAuthenticated && !!user && !authLoading,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60, // 1 minute
  });
}
