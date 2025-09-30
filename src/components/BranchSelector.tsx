import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Building, Building2 } from "lucide-react";
import { useBranch } from "../contexts/BranchContext";
import type { Branch } from "../contexts/BranchContext";
import { cn } from "@/lib/utils";

interface BranchCardProps {
  branch: Branch;
  isSelected: boolean;
  onClick: () => void;
}

// Карточка филиала для модального окна
const BranchCard: React.FC<BranchCardProps> = ({ branch, isSelected, onClick }) => {
  return (
    <div
      className={cn(
        "p-4 border rounded-lg flex items-start gap-4 cursor-pointer transition-all duration-200",
        isSelected ? "border-primary bg-muted/50" : "border-gray-200 hover:border-gray-300 bg-card hover:bg-muted/30"
      )}
      onClick={onClick}
    >
      <div className="rounded-full p-3 bg-primary/10 text-primary">
        <Building className="h-6 w-6" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-medium">{branch.branches}</h3>
          {isSelected && (
            <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
              Выбран
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{branch.address}</p>
        <p className="text-xs text-muted-foreground mt-1">Тел: {branch.phoneNumber}</p>
      </div>
    </div>
  );
};

// Компонент выбора филиала (модальное окно)
interface BranchSelectorDialogProps {
  onSelect?: () => void; // Опциональный колбэк для вызова после выбора филиала
}

export const BranchSelectorDialog: React.FC<BranchSelectorDialogProps> = ({ onSelect }) => {
  const { currentBranch, setBranch, branches, isLoading } = useBranch();
  const [open, setOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(currentBranch);

  const handleSave = () => {
    if (selectedBranch) {
      setBranch(selectedBranch);
      setOpen(false);
      if (onSelect) {
        onSelect();
      }
    }
  };

  if (isLoading) {
    return (
      <Button variant="ghost" className="justify-start px-3 py-2 w-full hover:text-white hover:bg-white/10 text-slate-300" disabled>
        <Building2 className="h-5 w-5 mr-2" />
        <span className="text-left">Загрузка...</span>
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="justify-start px-3 py-2 w-full hover:text-white hover:bg-white/10 text-slate-300">
          <Building2 className="h-5 w-5 mr-2" />
          <span className="text-left">Филиал</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Выбор филиала</DialogTitle>
          <DialogDescription>
            Выберите филиал для работы с клиентами
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-4">
          {branches.map((branch) => (
            <BranchCard
              key={branch.id}
              branch={branch}
              isSelected={selectedBranch?.id === branch.id}
              onClick={() => setSelectedBranch(branch)}
            />
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Отмена
          </Button>
          <Button onClick={handleSave} disabled={!selectedBranch}>
            Подтвердить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Индикатор текущего филиала (для показа в сайдбаре)
interface BranchIndicatorProps {
  compact?: boolean; // Компактный режим для мобильного вида
}

export const BranchIndicator: React.FC<BranchIndicatorProps> = ({ compact = false }) => {
  const { currentBranch, isLoading } = useBranch();

  if (isLoading || !currentBranch) {
    return (
      <div className={compact ? "" : "px-4 py-2"}>
        <div className={cn(
          "flex items-center gap-2 text-sm font-medium rounded-md text-muted-foreground bg-muted/50",
          compact ? "px-2 py-1" : "p-2"
        )}>
          <Building className="h-4 w-4" />
          <span className={compact ? "hidden sm:inline" : ""}>
            {isLoading ? "Загрузка..." : "Нет филиала"}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={compact ? "" : "px-4 py-2"}>
      <div className={cn(
        "flex items-center gap-2 text-sm font-medium rounded-md text-primary bg-primary/10",
        compact ? "px-2 py-1" : "p-2"
      )}>
        <Building className="h-4 w-4" />
        <span className={compact ? "hidden sm:inline" : ""}>{currentBranch.branches}</span>
      </div>
    </div>
  );
};