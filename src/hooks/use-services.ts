import { useQuery } from '@tanstack/react-query';
import { useBranch } from '@/contexts/BranchContext';
import { getBranchIdWithFallback } from '@/utils/branch-utils';

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
    queryKey: ['/services?branch_id', branchId],
    queryFn: async () => {
      if (!branchId) {
        console.warn('❌ No valid branch ID available, skipping services fetch');
        return [];
      }

      try {
        // Use the new path-based API structure with pagination
        const url = `${import.meta.env.VITE_BACKEND_URL}/services?branch_id=${branchId}&page=1&limit=1000`;
        console.log('📡 Services API URL:', url);
        
        const token = localStorage.getItem('auth_token');
        
        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
          }
        });

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Необходима авторизация');
          } else if (response.status === 404) {
            console.log('📋 No services found for this branch');
            return [];
          } else {
            const errorText = await response.text();
            throw new Error(`Ошибка загрузки услуг: ${response.status} - ${errorText}`);
          }
        }

        const result = await response.json();
        // API возвращает пагинированный ответ { page, limit, total, pages, data }
        const data = result.data || [];
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
