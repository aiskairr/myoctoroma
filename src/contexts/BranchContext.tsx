import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import { useAuth } from "./SimpleAuthContext";
import { $apiSecondary } from "@/API/http";

export interface Branch {
  id: number;
  branches: string;
  address: string;
  phoneNumber: string;
  organisationId: string | number;
  waInstance?: string;
}

interface BranchContextType {
  currentBranch: Branch | null;
  setBranch: (branch: Branch) => void;
  branches: Branch[];
  isLoading: boolean;
  error: string | null;
  refetchBranches: () => Promise<void>;
  orgData: Organization | null;
}

 interface Organization {
  id: number;
  user_id: number;
  name: string;
  branches: string;           // в данных это строка: "300"
  paidDate: string;           // ISO-дата: "2025-10-21T00:00:00.000Z"
  isActive: boolean;
  createdAt: string;          // ISO-строка
  updatedAt: string;          // ISO-строка
}

const BranchContext = createContext<BranchContextType>({
  currentBranch: null,
  setBranch: () => {},
  branches: [],
  isLoading: true,
  error: null,
  refetchBranches: async () => {},
  orgData: null,
});

export const BranchProvider = ({ children }: { children: ReactNode }) => {
  const { user, isAuthenticated } = useAuth();
  const [currentBranch, setCurrentBranch] = useState<Branch | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orgData, setOrgData] = useState<Organization | null>(null);
  const [orgFetched, setOrgFetched] = useState(false); // Флаг что организация уже загружена

    const logCheck = async () => {
    // Не запускаем повторно если уже загружали
    if (orgFetched) {
      console.log("🏢 logCheck: Already fetched, skipping");
      return;
    }

    console.log("🏢 logCheck STARTED");
    setIsLoading(true);
    try {
      // Используем $apiSecondary для автоматического обновления токена
      // Токен добавляется автоматически через interceptor
      const response = await $apiSecondary.get<Organization[]>(
        `/organizations?ownerId=${user?.id}`
      );

      if (Array.isArray(response.data) && response.data.length > 0) {
        // берём первую или null
        const orgToSet = response.data ;
        const firstOrg = orgToSet[0];
        const resOrgData: any = firstOrg.id ;
        setOrgData(resOrgData);
        setOrgFetched(true); // Помечаем что загрузили
        if (firstOrg?.name) {
          localStorage.setItem('organization_name', firstOrg.name);
        }
        console.log("✅ Organization loaded:", firstOrg?.name);
      } else {
        console.log("⚠️ No organizations found");
        localStorage.removeItem('organization_name');
      }
    } catch (error: any) {
      console.error("❌ org fetch failed:", error);
      console.error("  - Error message:", error.message);
      console.error("  - Error response:", error.response?.data);
      console.error("  - Error status:", error.response?.status);
      setOrgData(null);
      setOrgFetched(true); // Даже при ошибке помечаем что попытались загрузить
      localStorage.removeItem('organization_name');
    } finally {
      setIsLoading(false);
      console.log("🏢 logCheck FINISHED");
    }
  };
  const fetchBranches = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🏢 BranchContext: Starting branch loading...');

      if (!isAuthenticated || !user) {
        setIsLoading(false);
        return;
      }

      // Для клиентов филиалы не нужны
      if (user.role === 'client') {
        console.log('ℹ️ User is a client, skipping branches loading');
        setIsLoading(false);
        return;
      }
      
      // Используем $apiSecondary для автоматического обновления токена
      const branchesResponse = await $apiSecondary.get<Branch[] | { branches: Branch[] }>(
        `/branches?organizationId=${orgData}`
      );

      const branchesData = branchesResponse.data;

      // Обрабатываем оба случая: если API вернул массив напрямую или объект с полем branches
      const branchList: Branch[] = Array.isArray(branchesData)
        ? branchesData
        : (branchesData.branches || []);

      console.log('✅ Loaded branches:', branchList.length);

      setBranches(branchList);

      const savedBranchId = localStorage.getItem("currentBranchId");

      if (savedBranchId && branchList.length > 0) {
        const saved = branchList.find((b: Branch) => b.id.toString() === savedBranchId);
        if (saved) {
          setCurrentBranch(saved);
        } else {
          setCurrentBranch(branchList[0]);
          localStorage.setItem("currentBranchId", branchList[0].id.toString());
        }
      } else if (branchList.length > 0) {
        setCurrentBranch(branchList[0]);
        localStorage.setItem("currentBranchId", branchList[0].id.toString());
      }
    } catch (err) {
      console.error('❌ Error fetching branches:', err);
      setError(err instanceof Error ? err.message : 'Ошибка загрузки филиалов');
    } finally {
      setIsLoading(false);
    }
  }, [user, isAuthenticated, orgData]);

  const setBranch = (branch: Branch) => {
    setCurrentBranch(branch);
    localStorage.setItem("currentBranchId", branch.id.toString());
  };

  useEffect(() => {
    // Сначала получаем организацию, потом филиалы
    // Вызываем только если user и isAuthenticated существуют
    if (user && isAuthenticated && !orgFetched) {
      logCheck();
    }
  }, [user, isAuthenticated]);

  useEffect(() => {
    // Загружаем филиалы только когда orgData готов
    if (orgData && !branches.length) {
      fetchBranches();
    }
  }, [orgData]);

  const value = {
    currentBranch,
    setBranch,
    branches,
    isLoading,
    error,
    orgData,
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
