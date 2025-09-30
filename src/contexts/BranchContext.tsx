import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { useAuth } from "./SimpleAuthContext";

export interface Branch {
  id: number;
  branches: string; // название филиала (как в API)
  address: string;
  phoneNumber: string;
  organisationId: string | number; // может быть строкой или числом
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
  const { user, isAuthenticated } = useAuth(); // Получаем пользователя из AuthContext
  const [currentBranch, setCurrentBranch] = useState<Branch | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Функция для загрузки филиалов
  const fetchBranches = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🏢 BranchContext: Starting branch loading...');
      
      // Сначала получаем organisationId из API пользователя
      console.log('� Getting organisationId from user API...');
      // Проверяем, что пользователь авторизован и данные доступны
      if (!isAuthenticated || !user) {
        throw new Error('Пользователь не авторизован');
      }
      
      console.log('👤 Using user data from AuthContext:', user);
      
      // Ищем organisationId в данных пользователя из AuthContext
      const organisationId = user.organisationId || user.organization_id || user.orgId;
      
      if (!organisationId) {
        console.log('⚠️ No organisationId found in user data, trying with organisationId = 1');
        // Fallback: пробуем с organisationId = 1
        const fallbackOrgId = 1;
        console.log('🆔 Using fallback organisationId:', fallbackOrgId);
        
        const branchesUrl = `${import.meta.env.VITE_BACKEND_URL}/api/organisations/${fallbackOrgId}/branches`;
        console.log('🌐 Fetching branches from (fallback):', branchesUrl);
        
        const branchesResponse = await fetch(branchesUrl, {
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
          }
        });

        if (!branchesResponse.ok) {
          throw new Error('Пользователь не связан с организацией');
        }

        const branchesData = await branchesResponse.json();
        console.log('📄 Branches response data (fallback):', branchesData);
        
        const branchList: Branch[] = branchesData.branches || [];
        console.log('✅ Loaded branches (fallback):', branchList.length, branchList.map(b => ({ id: b.id, name: b.branches })));

        setBranches(branchList);
        
        // Выбираем первый филиал
        if (branchList.length > 0) {
          setCurrentBranch(branchList[0]);
          localStorage.setItem("currentBranchId", branchList[0].id.toString());
          console.log('📍 Selected first branch (fallback):', branchList[0].branches);
        }
        
        return; // Выходим из функции, так как обработали fallback случай
      }
      
      console.log('🆔 Using organisationId:', organisationId);
      
      // Теперь загружаем филиалы напрямую через organisations endpoint
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
      console.log('🎯 Final branches set:', branchList.length);

      // Пытаемся восстановить сохраненный филиал
      const savedBranchId = localStorage.getItem("currentBranchId");
      if (savedBranchId && branchList.length > 0) {
        const saved = branchList.find((b: Branch) => b.id.toString() === savedBranchId);
        if (saved) {
          setCurrentBranch(saved);
          console.log('📍 Restored saved branch:', saved.branches);
        } else {
          // Если сохраненный филиал не найден, выбираем первый
          setCurrentBranch(branchList[0]);
          localStorage.setItem("currentBranchId", branchList[0].id.toString());
          console.log('📍 Selected first branch:', branchList[0].branches);
        }
      } else if (branchList.length > 0) {
        // Если нет сохраненного филиала, выбираем первый
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
  };

  // Функция для установки филиала
  const setBranch = (branch: Branch) => {
    setCurrentBranch(branch);
    localStorage.setItem("currentBranchId", branch.id.toString());
  };

  // Загружаем филиалы при монтировании компонента и когда пользователь загружен
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchBranches();
    }
  }, [isAuthenticated, user]);

  // Значение контекста
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

// Хук для использования контекста филиалов
export const useBranch = () => {
  const context = useContext(BranchContext);
  if (!context) {
    throw new Error("useBranch must be used within a BranchProvider");
  }
  return context;
};