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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building, Building2, Pencil, Loader2 } from "lucide-react";
import { useBranch } from "../contexts/BranchContext";
import { useAuth } from "../contexts/SimpleAuthContext";
import { useToast } from "@/hooks/use-toast";
import type { Branch } from "../contexts/BranchContext";
import { cn } from "@/lib/utils";

interface BranchCardProps {
  branch: Branch;
  isSelected: boolean;
  onClick: () => void;
  onEdit?: (branch: Branch) => void;
}

interface EditBranchData {
  branches: string;
  address: string;
  phoneNumber: string;
}

// Карточка филиала для модального окна
const BranchCard: React.FC<BranchCardProps> = ({ branch, isSelected, onClick, onEdit }) => {
  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Предотвращаем выбор филиала при клике на карандаш
    if (onEdit) {
      onEdit(branch);
    }
  };

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
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 hover:bg-primary/10 text-muted-foreground hover:text-primary"
        onClick={handleEditClick}
        title="Редактировать филиал"
      >
        <Pencil className="h-4 w-4" />
      </Button>
    </div>
  );
};

// Компонент выбора филиала (модальное окно)
interface BranchSelectorDialogProps {
  onSelect?: () => void; // Опциональный колбэк для вызова после выбора филиала
}

export const BranchSelectorDialog: React.FC<BranchSelectorDialogProps> = ({ onSelect }) => {
  const { currentBranch, setBranch, branches, isLoading, refetchBranches } = useBranch();
  const { user } = useAuth(); // Получаем данные пользователя
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(currentBranch);
  
  // Состояние для редактирования филиала
  const [editDialog, setEditDialog] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [editData, setEditData] = useState<EditBranchData>({
    branches: "",
    address: "",
    phoneNumber: ""
  });
  const [isUpdating, setIsUpdating] = useState(false);

  // Проверяем, является ли пользователь админом или суперадмином
  const isAdminOrSuperAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  // Если пользователь не админ и не суперадмин, не показываем компонент
  if (!isAdminOrSuperAdmin) {
    return null;
  }

  const handleSave = () => {
    if (selectedBranch) {
      setBranch(selectedBranch);
      setOpen(false);
      if (onSelect) {
        onSelect();
      }
    }
  };

  const handleEditBranch = (branch: Branch) => {
    setEditingBranch(branch);
    setEditData({
      branches: branch.branches,
      address: branch.address,
      phoneNumber: branch.phoneNumber
    });
    setEditDialog(true);
  };

  const handleUpdateBranch = async () => {
    if (!editingBranch) return;

    setIsUpdating(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/branches/${editingBranch.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(editData)
      });

      if (!response.ok) {
        throw new Error('Ошибка при обновлении филиала');
      }

      toast({
        title: "Успех",
        description: "Филиал успешно обновлен"
      });

      // Обновляем список филиалов
      await refetchBranches();
      
      // Закрываем диалог редактирования
      setEditDialog(false);
      setEditingBranch(null);

    } catch (error) {
      console.error('Error updating branch:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить филиал",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
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
    <>
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
                onEdit={handleEditBranch}
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

      {/* Диалог редактирования филиала */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Редактирование филиала</DialogTitle>
            <DialogDescription>
              Измените информацию о филиале
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="branchName">Название филиала</Label>
              <Input
                id="branchName"
                value={editData.branches}
                onChange={(e) => setEditData({ ...editData, branches: e.target.value })}
                placeholder="Введите название филиала"
              />
            </div>
            <div>
              <Label htmlFor="branchAddress">Адрес</Label>
              <Input
                id="branchAddress"
                value={editData.address}
                onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                placeholder="Введите адрес филиала"
              />
            </div>
            <div>
              <Label htmlFor="branchPhone">Телефон</Label>
              <Input
                id="branchPhone"
                value={editData.phoneNumber}
                onChange={(e) => setEditData({ ...editData, phoneNumber: e.target.value })}
                placeholder="Введите номер телефона"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setEditDialog(false)}
              disabled={isUpdating}
            >
              Отмена
            </Button>
            <Button 
              onClick={handleUpdateBranch}
              disabled={isUpdating || !editData.branches.trim()}
            >
              {isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Сохранение...
                </>
              ) : (
                "Сохранить"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Индикатор текущего филиала (для показа в сайдбаре)
interface BranchIndicatorProps {
  compact?: boolean; // Компактный режим для мобильного вида
}

export const BranchIndicator: React.FC<BranchIndicatorProps> = ({ compact = false }) => {
  const { currentBranch, isLoading } = useBranch();
  const { user } = useAuth(); // Получаем данные пользователя

  // Проверяем, является ли пользователь админом или суперадмином
  const isAdminOrSuperAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  // Если пользователь не админ и не суперадмин, не показываем компонент
  if (!isAdminOrSuperAdmin) {
    return null;
  }

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
        "flex items-center gap-2  text-sm font-medium rounded-md text-white bg-primary/10",
        compact ? "px-2 py-1" : "p-2"
      )}>
        <Building className="h-4 w-4" />
        <span className={compact ? "hidden sm:inline" : ""}>{currentBranch.branches}</span>
      </div>
    </div>
  );
};