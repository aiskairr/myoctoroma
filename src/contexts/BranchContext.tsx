import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import { useAuth } from "./SimpleAuthContext";

export interface Branch {
  id: number;
  branches: string;
  address: string;
  phoneNumber: string;
  organisationId: string | number;
  accountID?: string | null; // Новое поле для ID аккаунта
  photoUrl?: string | null; // URL фотографии филиала
  systemPrompt?: string | null; // System prompt для AI ассистента
  managerTimeoutMinutes?: number | null; // Таймаут до передачи менеджеру (минуты)
  view24h?: boolean; // Режим 24-часового отображения календаря
  isActive?: boolean; // Для поддержки soft delete
  createdAt?: string;
  updatedAt?: string;
}

interface BranchContextType {
  currentBranch: Branch | null;
  setBranch: (branch: Branch) => void;
  branches: Branch[];
  isLoading: boolean;
  error: string | null;
  refetchBranches: () => Promise<void>;
}

const BranchContext = createContext<BranchContextType>({
  currentBranch: null,
  setBranch: () => {},
  branches: [],
  isLoading: true,
  error: null,
  refetchBranches: async () => {},
});

export const BranchProvider = ({ children }: { children: ReactNode }) => {
  const { user, isAuthenticated } = useAuth();
  const [currentBranch, setCurrentBranch] = useState<Branch | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBranches = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🏢 BranchContext: Starting branch loading...');
      
      if (!isAuthenticated || !user) {
        console.log('Пользователь не авторизован или данные не доступны. Пропускаем загрузку филиалов.');
        setIsLoading(false);
        return;
      }
      
      console.log('👤 Using user data from AuthContext:', user);
      
      const organisationId = user.organisationId || user.organization_id || user.orgId;
      
      console.log('🔍 Checking organisationId fields:', {
        organisationId: user.organisationId,
        organization_id: user.organization_id,
        orgId: user.orgId,
        finalOrgId: organisationId
      });
      
      if (!organisationId) {
        console.error('❌ КРИТИЧЕСКАЯ ОШИБКА: organisationId НЕ НАЙДЕН в данных пользователя!');
        console.log('📝 Полные данные пользователя:', JSON.stringify(user, null, 2));
        throw new Error('organisationId не найден в данных пользователя. Требуется корректная авторизация.');
      }
      
      console.log('🆔 Using organisationId:', organisationId);
      
      const branchesUrl = `${import.meta.env.VITE_BACKEND_URL}/api/organisations/${organisationId}/branches`;
      console.log('🌐 Fetching branches from:', branchesUrl);
      
      const branchesResponse = await fetch(branchesUrl, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        }
      });

      if (!branchesResponse.ok) {
        if (branchesResponse.status === 401) {
          throw new Error('Необходима авторизация');
        } else if (branchesResponse.status === 404) {
          throw new Error('Организация не найдена');
        } else {
          const errorText = await branchesResponse.text();
          throw new Error(`Ошибка загрузки филиалов: ${branchesResponse.status} - ${errorText}`);
        }
      }

      const branchesData = await branchesResponse.json();
      console.log('📄 Branches response data:', branchesData);
      
      const branchList: Branch[] = branchesData.branches || [];
      console.log('✅ Loaded branches:', branchList.length, branchList.map(b => ({ id: b.id, name: b.branches })));

      setBranches(branchList);
      
      const savedBranchId = localStorage.getItem("currentBranchId");
      if (savedBranchId && branchList.length > 0) {
        const saved = branchList.find((b: Branch) => b.id.toString() === savedBranchId);
        if (saved) {
          setCurrentBranch(saved);
          console.log('📍 Restored saved branch:', saved.branches);
        } else {
          setCurrentBranch(branchList[0]);
          localStorage.setItem("currentBranchId", branchList[0].id.toString());
          console.log('📍 Selected first branch:', branchList[0].branches);
        }
      } else if (branchList.length > 0) {
        setCurrentBranch(branchList[0]);
        localStorage.setItem("currentBranchId", branchList[0].id.toString());
        console.log('📍 Selected first branch:', branchList[0].branches);
      }
    } catch (err) {
      console.error('❌ Error fetching branches:', err);
      setError(err instanceof Error ? err.message : 'Ошибка загрузки филиалов');
    } finally {
      setIsLoading(false);
      console.log('🏁 BranchContext: Loading completed');
    }
  }, [user, isAuthenticated]);

  const setBranch = (branch: Branch) => {
    setCurrentBranch(branch);
    localStorage.setItem("currentBranchId", branch.id.toString());
  };

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  const value = {
    currentBranch,
    setBranch,
    branches,
    isLoading,
    error,
    refetchBranches: fetchBranches,
  };

  return (
    <BranchContext.Provider value={value}>
      {children}
    </BranchContext.Provider>
  );
};

export const useBranch = () => {
  const context = useContext(BranchContext);
  if (!context) {
    throw new Error("useBranch must be used within a BranchProvider");
  }
  return context;
};