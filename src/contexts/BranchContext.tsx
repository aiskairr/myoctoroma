import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface Branch {
  id: string;
  name: string;
  address: string;
  waInstance: string;
  color: string;
}

export const BRANCHES: Branch[] = [
  {
    id: "toktogula",
    name: "Токтогула",
    address: "Токтогула 93",
    waInstance: "wa1",
    color: "blue"
  }
];

interface BranchContextType {
  currentBranch: Branch;
  setBranch: (branch: Branch) => void;
  branches: Branch[];
}

// Устанавливаем дефолтное значение (первый филиал)
const defaultBranch = BRANCHES[0];

const BranchContext = createContext<BranchContextType>({
  currentBranch: defaultBranch,
  setBranch: () => {},
  branches: BRANCHES,
});

export const BranchProvider = ({ children }: { children: ReactNode }) => {
  const [currentBranch, setCurrentBranch] = useState<Branch>(() => {
    // Пытаемся получить сохраненный филиал из localStorage
    const saved = localStorage.getItem("currentBranch");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Проверяем, что объект имеет нужные поля
        if (parsed && parsed.waInstance) {
          // Находим соответствующий филиал в списке
          const found = BRANCHES.find(b => b.waInstance === parsed.waInstance);
          if (found) return found;
        }
      } catch (e) {
        console.error("Error parsing branch from localStorage:", e);
      }
    }
    // Если не удалось получить из localStorage, используем дефолтный
    return defaultBranch;
  });

  // Функция для установки филиала
  const setBranch = (branch: Branch) => {
    setCurrentBranch(branch);
    localStorage.setItem("currentBranch", JSON.stringify(branch));
  };

  // Значение контекста
  const value = {
    currentBranch,
    setBranch,
    branches: BRANCHES,
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