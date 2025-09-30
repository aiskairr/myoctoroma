import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";

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
  const [currentBranch, setCurrentBranch] = useState<Branch | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Функция для загрузки филиалов
  const fetchBranches = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Сначала пробуем основной эндпоинт
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/organisation-branches`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        }
      });

      let branchList: Branch[] = [];

      if (response.ok) {
        const data = await response.json();
        branchList = data.branches || [];
        
        // Сразу после успешного ответа, пробуем fallback эндпоинт
        // Если у нас есть хотя бы один филиал с organisationId
        if (branchList.length > 0 && branchList[0].organisationId) {
          try {
            console.log('Making fallback request to organisations endpoint...');
            const organisationId = branchList[0].organisationId;
            const fallbackResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/organisations/${organisationId}/branches`, {
              credentials: 'include',
              headers: {
                'Accept': 'application/json',
              }
            });
            
            if (fallbackResponse.ok) {
              const fallbackData = await fallbackResponse.json();
              const fallbackBranches = fallbackData.branches || [];
              if (fallbackBranches.length > 0) {
                branchList = fallbackBranches; // Используем данные из fallback эндпоинта
                console.log('Fallback endpoint successful, using branches from organisations endpoint:', branchList.length);
              }
            } else {
              console.log('Fallback endpoint failed, using original branches');
            }
          } catch (fallbackErr) {
            console.log('Fallback request failed, using original branches:', fallbackErr);
          }
        }
      } else {
        if (response.status === 401) {
          throw new Error('Необходима авторизация');
        } else if (response.status === 400) {
          throw new Error('Пользователь не связан с организацией');
        } else {
          throw new Error(`Ошибка сервера: ${response.status}`);
        }
      }

      setBranches(branchList);

      // Пытаемся восстановить сохраненный филиал
      const savedBranchId = localStorage.getItem("currentBranchId");
      if (savedBranchId && branchList.length > 0) {
        const saved = branchList.find((b: Branch) => b.id.toString() === savedBranchId);
        if (saved) {
          setCurrentBranch(saved);
        } else {
          // Если сохраненный филиал не найден, выбираем первый
          setCurrentBranch(branchList[0]);
          localStorage.setItem("currentBranchId", branchList[0].id.toString());
        }
      } else if (branchList.length > 0) {
        // Если нет сохраненного филиала, выбираем первый
        setCurrentBranch(branchList[0]);
        localStorage.setItem("currentBranchId", branchList[0].id.toString());
      }
    } catch (err) {
      console.error('Error fetching branches:', err);
      setError(err instanceof Error ? err.message : 'Ошибка загрузки филиалов');
    } finally {
      setIsLoading(false);
    }
  };

  // Функция для установки филиала
  const setBranch = (branch: Branch) => {
    setCurrentBranch(branch);
    localStorage.setItem("currentBranchId", branch.id.toString());
  };

  // Загружаем филиалы при монтировании компонента
  useEffect(() => {
    fetchBranches();
  }, []);

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