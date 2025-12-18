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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useBranch } from "../contexts/BranchContext";
import { useAuth } from "../contexts/SimpleAuthContext";
import { useLocale } from '../contexts/LocaleContext';
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
  name: string;
  phone: string;
  address: string;
  isActive: boolean;
  systemPrompt?: string;
  limitsEnabled?: boolean;
  accountName?: string;
}

// Карточка филиала для модального окна
const BranchCard: React.FC<BranchCardProps> = ({ branch, isSelected, onClick, onEdit }) => {
  const { t } = useLocale();
  
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
          <h3 className="font-medium text-foreground">{branch.branches}</h3>
          {isSelected && (
            <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
              {t('branch.selected')}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{branch.address}</p>
        <p className="text-xs text-muted-foreground mt-1">{t('branch.phone_prefix')}{branch.phoneNumber}</p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 hover:bg-primary/10 text-muted-foreground hover:text-primary"
        onClick={handleEditClick}
        title={t('branch.edit_tooltip')}
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
  const { t } = useLocale();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(currentBranch);
  
  // Состояние для редактирования филиала
  const [editDialog, setEditDialog] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [editData, setEditData] = useState<EditBranchData>({
    name: "",
    phone: "",
    address: "",
    isActive: true,
    systemPrompt: "",
    limitsEnabled: false,
    accountName: ""
  });
  const [isUpdating, setIsUpdating] = useState(false);

  // Проверяем, является ли пользователь учредителем, админом или суперадмином
  const isAdminOrSuperAdmin = user?.role === 'owner' || user?.role === 'admin' || user?.role === 'superadmin';

  // Если пользователь не учредитель, админ или суперадмин, не показываем компонент
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
      name: branch.branches,
      phone: branch.phoneNumber,
      address: branch.address,
      isActive: (branch as any).isActive ?? true,
      systemPrompt: (branch as any).systemPrompt || "",
      limitsEnabled: (branch as any).limitsEnabled || false,
      accountName: (branch as any).accountName || ""
    });
    setEditDialog(true);
  };

  const handleUpdateBranch = async () => {
    if (!editingBranch) return;

    setIsUpdating(true);
    try {
      const token = localStorage.getItem('auth_token');

      // Подготавливаем payload согласно API документации
      const payload: any = {
        name: editData.name?.trim() || '',
        phone: editData.phone?.trim() || '',
        address: editData.address?.trim() || '',
        isActive: editData.isActive ?? true
      };

      // Добавляем опциональные поля только если они заполнены
      if (editData.systemPrompt?.trim()) {
        payload.systemPrompt = editData.systemPrompt.trim();
      }
      if (editData.limitsEnabled !== undefined && editData.limitsEnabled !== null) {
        payload.limitsEnabled = editData.limitsEnabled;
      }
      if (editData.accountName?.trim()) {
        payload.accountName = editData.accountName.trim();
      }

      const response = await fetch(
        `${import.meta.env.VITE_SECONDARY_BACKEND_URL}/branches/${editingBranch.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          credentials: 'include',
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Ошибка при обновлении филиала');
      }

      const result = await response.json();
      console.log('✅ Branch updated:', result);

      toast({
        title: t('common.success') || 'Успешно',
        description: t('branch.update_success') || 'Филиал успешно обновлен'
      });

      // Обновляем список филиалов
      await refetchBranches();

      // Закрываем диалог редактирования
      setEditDialog(false);
      setEditingBranch(null);

    } catch (error: any) {
      console.error('❌ Error updating branch:', error);
      toast({
        title: t('common.error') || 'Ошибка',
        description: error.message || t('branch.update_error') || 'Не удалось обновить филиал',
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
        <span className="text-left">{t('branch.loading')}</span>
      </Button>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" className="justify-start px-3 py-2 w-full hover:text-white hover:bg-white/10 text-slate-300">
            <Building2 className="h-5 w-5 mr-2" />
            <span className="text-left">{t('branch.title')}</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('branch.select_title')}</DialogTitle>
            <DialogDescription>
              {t('branch.select_description')}
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
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSave} disabled={!selectedBranch}>
              {t('common.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог редактирования филиала */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('branch.edit_title')}</DialogTitle>
            <DialogDescription>
              {t('branch.edit_description')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div>
              <Label htmlFor="branchName">Название филиала *</Label>
              <Input
                id="branchName"
                value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                placeholder="Например: Центральный офис"
              />
            </div>

            <div>
              <Label htmlFor="branchPhone">Телефон *</Label>
              <Input
                id="branchPhone"
                value={editData.phone}
                onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                placeholder="+996700000000"
              />
            </div>

            <div>
              <Label htmlFor="branchAddress">Адрес *</Label>
              <Input
                id="branchAddress"
                value={editData.address}
                onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                placeholder="ул. Ленина, 25"
              />
            </div>

            <div className="flex items-center justify-between space-x-2 py-2">
              <div className="space-y-0.5">
                <Label htmlFor="isActive">Филиал активен</Label>
                <p className="text-xs text-muted-foreground">
                  Включить/выключить филиал
                </p>
              </div>
              <Switch
                id="isActive"
                checked={editData.isActive}
                onCheckedChange={(checked) => setEditData({ ...editData, isActive: checked })}
              />
            </div>

            <div className="flex items-center justify-between space-x-2 py-2">
              <div className="space-y-0.5">
                <Label htmlFor="limitsEnabled">Лимиты включены</Label>
                <p className="text-xs text-muted-foreground">
                  Использовать лимиты WhatsApp
                </p>
              </div>
              <Switch
                id="limitsEnabled"
                checked={editData.limitsEnabled || false}
                onCheckedChange={(checked) => setEditData({ ...editData, limitsEnabled: checked })}
              />
            </div>

            <div>
              <Label htmlFor="accountName">Название WhatsApp аккаунта</Label>
              <Input
                id="accountName"
                value={editData.accountName || ""}
                onChange={(e) => setEditData({ ...editData, accountName: e.target.value })}
                placeholder="WhatsApp Business"
              />
            </div>

            <div>
              <Label htmlFor="systemPrompt">Системный промпт для AI бота</Label>
              <Textarea
                id="systemPrompt"
                value={editData.systemPrompt || ""}
                onChange={(e) => setEditData({ ...editData, systemPrompt: e.target.value })}
                placeholder="Опишите роль и поведение AI бота..."
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Этот промпт будет использоваться AI ботом для ответов клиентам
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setEditDialog(false)}
              disabled={isUpdating}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleUpdateBranch}
              disabled={isUpdating || !editData.name?.trim() || !editData.phone?.trim() || !editData.address?.trim()}
            >
              {isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('branch.saving')}
                </>
              ) : (
                t('common.save')
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
  const { t } = useLocale();

  // Проверяем, является ли пользователь учредителем, админом или суперадмином
  const isAdminOrSuperAdmin = user?.role === 'owner' || user?.role === 'admin' || user?.role === 'superadmin';
  // Если пользователь не учредитель, админ или суперадмин, не показываем компонент
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
            {isLoading ? t('branch.loading') : currentBranch?.address}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={compact ? "" : "px-4 py-2"}>
      <div className={cn(
        "flex items-center gap-2  text-sm font-medium rounded-md text-slate-200 bg-primary/10",
        compact ? "px-2 py-1" : "p-2"
      )}>
        <Building className="h-4 w-4" />
        <span className={compact ? "hidden sm:inline" : ""}>{currentBranch.address}</span>
      </div>
    </div>
  );
};