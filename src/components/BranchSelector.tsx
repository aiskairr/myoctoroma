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
import { Building, Building2, Warehouse } from "lucide-react";
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
  const getColorClasses = () => {
    switch (branch.color) {
      case "green":
        return {
          icon: "bg-green-100 text-green-700",
          border: isSelected ? "border-green-500" : "border-gray-200 hover:border-green-300",
          dot: "text-green-500"
        };
      case "blue":
        return {
          icon: "bg-blue-100 text-blue-700",
          border: isSelected ? "border-blue-500" : "border-gray-200 hover:border-blue-300",
          dot: "text-blue-500"
        };
      case "yellow":
        return {
          icon: "bg-yellow-100 text-yellow-700",
          border: isSelected ? "border-yellow-500" : "border-gray-200 hover:border-yellow-300",
          dot: "text-yellow-500"
        };
      default:
        return {
          icon: "bg-gray-100 text-gray-700",
          border: isSelected ? "border-primary" : "border-gray-200 hover:border-gray-300",
          dot: "text-primary"
        };
    }
  };

  const colorClasses = getColorClasses();

  return (
    <div
      className={cn(
        "p-4 border rounded-lg flex items-start gap-4 cursor-pointer transition-all duration-200",
        colorClasses.border,
        isSelected ? "bg-muted/50" : "bg-card hover:bg-muted/30"
      )}
      onClick={onClick}
    >
      <div className={cn("rounded-full p-3", colorClasses.icon)}>
        {branch.color === "green" ? (
          <Building2 className="h-6 w-6" />
        ) : branch.color === "blue" ? (
          <Building className="h-6 w-6" />
        ) : (
          <Warehouse className="h-6 w-6" />
        )}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-medium">{branch.name}</h3>
          {isSelected && (
            <span className={cn("text-xs px-2 py-1 rounded-full bg-primary/10", colorClasses.dot)}>
              Выбран
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{branch.address}</p>
        <p className="text-xs text-muted-foreground mt-1">WhatsApp: {branch.waInstance}</p>
      </div>
    </div>
  );
};

// Компонент выбора филиала (модальное окно)
interface BranchSelectorDialogProps {
  onSelect?: () => void; // Опциональный колбэк для вызова после выбора филиала
}

export const BranchSelectorDialog: React.FC<BranchSelectorDialogProps> = ({ onSelect }) => {
  const { currentBranch, setBranch, branches } = useBranch();
  const [open, setOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch>(currentBranch);

  const handleSave = () => {
    setBranch(selectedBranch);
    setOpen(false);
    if (onSelect) {
      onSelect();
    }
  };

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
              isSelected={selectedBranch.id === branch.id}
              onClick={() => setSelectedBranch(branch)}
            />
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Отмена
          </Button>
          <Button onClick={handleSave}>
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
  const { currentBranch } = useBranch();

  const getColorClasses = () => {
    switch (currentBranch.color) {
      case "green":
        return "text-green-600 bg-green-100";
      case "blue":
        return "text-blue-600 bg-blue-100";
      case "yellow":
        return "text-yellow-600 bg-yellow-100";
      default:
        return "text-primary bg-primary/10";
    }
  };

  return (
    <div className={compact ? "" : "px-4 py-2"}>
      <div className={cn(
        "flex items-center gap-2 text-sm font-medium rounded-md",
        getColorClasses(),
        compact ? "px-2 py-1" : "p-2"
      )}>
        {currentBranch.color === "green" ? (
          <Building2 className="h-4 w-4" />
        ) : currentBranch.color === "blue" ? (
          <Building className="h-4 w-4" />
        ) : (
          <Warehouse className="h-4 w-4" />
        )}
        <span className={compact ? "hidden sm:inline" : ""}>{currentBranch.name}</span>
      </div>
    </div>
  );
};