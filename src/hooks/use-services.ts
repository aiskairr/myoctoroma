import { useQuery } from '@tanstack/react-query';
import { useBranch } from '@/contexts/BranchContext';
import { getBranchIdWithFallback } from '@/utils/branch-utils';
import { apiGetJson } from '@/lib/api';

// Interface for Service from API
export interface Service {
  id: number;
  name: string;
  description?: string;
  defaultDuration: number;
  branchID: string;
  duration10_price?: number;
  duration15_price?: number;
  duration20_price?: number;
  duration30_price?: number;
  duration40_price?: number;
  duration50_price?: number;
  duration60_price?: number;
  duration80_price?: number;
  duration90_price?: number;
  duration110_price?: number;
  duration120_price?: number;
  duration150_price?: number;
  duration220_price?: number;
}

// Interface for converted service (compatible with existing code)
export interface ConvertedService {
  name: string;
  duration: number;
  price: number;
  id: number;
  description?: string;
}

// Hook to fetch services for current branch
export const useServices = () => {
  const { currentBranch, branches } = useBranch();
  
  // Get proper branch ID using utility function
  const branchId = getBranchIdWithFallback(currentBranch, branches);

  return useQuery<Service[]>({
    queryKey: [`/services?branchId=${branchId}`],
    queryFn: async () => {
      if (!branchId) {
        console.warn('❌ No valid branch ID available, skipping services fetch');
        return [];
      }

      try {
        // Use shared API helper to avoid cached 304 responses and ensure auth headers
        const result = await apiGetJson<{ data?: Service[] } | Service[]>(`/services?branchId=${branchId}`);
        // API возвращает пагинированный ответ { page, limit, total, pages, data }
        const data = Array.isArray(result) ? result : result.data || [];
        console.log('✅ Loaded services:', data.length, data.map((s: Service) => ({ id: s.id, name: s.name })));
        return data;
      } catch (error) {
        console.error('❌ Failed to fetch services:', error);
        throw error;
      }
    },
    enabled: !!branchId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
};

// Helper function to convert API services to the format expected by the component
export const convertServicesToLegacyFormat = (services: Service[]): ConvertedService[] => {
  return services.map(service => {
    // Find the first available price (prioritize common durations)
    const priceFields = [
      { duration: 30, price: service.duration30_price },
      { duration: 60, price: service.duration60_price },
      { duration: 45, price: service.duration40_price }, // closest to 45
      { duration: 90, price: service.duration90_price },
      { duration: 120, price: service.duration120_price },
      { duration: 15, price: service.duration15_price },
      { duration: 20, price: service.duration20_price },
      { duration: 50, price: service.duration50_price },
      { duration: 80, price: service.duration80_price },
      { duration: 110, price: service.duration110_price },
      { duration: 150, price: service.duration150_price },
      { duration: 220, price: service.duration220_price },
      { duration: 10, price: service.duration10_price },
    ];

    // Find first available price
    const availablePrice = priceFields.find(field => field.price && field.price > 0);
    
    return {
      id: service.id,
      name: service.name,
      duration: availablePrice?.duration || service.defaultDuration || 60,
      price: availablePrice?.price || 0,
      description: service.description
    };
  });
};

// Helper function to get all available durations for a specific service
export const getServiceDurations = (service: Service): Array<{ duration: number; price: number }> => {
  const durations: Array<{ duration: number; price: number }> = [];
  
  const priceFields = [
    { duration: 10, price: service.duration10_price },
    { duration: 15, price: service.duration15_price },
    { duration: 20, price: service.duration20_price },
    { duration: 30, price: service.duration30_price },
    { duration: 40, price: service.duration40_price },
    { duration: 50, price: service.duration50_price },
    { duration: 60, price: service.duration60_price },
    { duration: 80, price: service.duration80_price },
    { duration: 90, price: service.duration90_price },
    { duration: 110, price: service.duration110_price },
    { duration: 120, price: service.duration120_price },
    { duration: 150, price: service.duration150_price },
    { duration: 220, price: service.duration220_price },
  ];

  priceFields.forEach(field => {
    if (field.price && field.price > 0) {
      durations.push({ duration: field.duration, price: field.price });
    }
  });

  // Sort by duration
  return durations.sort((a, b) => a.duration - b.duration);
};
