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
import { Building, Building2, Pencil, Loader2, Upload } from "lucide-react";
import { useBranch } from "../contexts/BranchContext";
import { useAuth } from "../contexts/SimpleAuthContext";
import { useLocale } from '../contexts/LocaleContext';
import { useToast } from "@/hooks/use-toast";
import type { Branch } from "../contexts/BranchContext";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
      {/* Фото или иконка филиала */}
      {branch.photoUrl ? (
        <Avatar className="h-12 w-12">
          <AvatarImage src={branch.photoUrl} alt={branch.branches} />
          <AvatarFallback className="text-lg">{branch.branches[0]}</AvatarFallback>
        </Avatar>
      ) : (
        <div className="rounded-full p-3 bg-primary/10 text-primary">
          <Building className="h-6 w-6" />
        </div>
      )}
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-medium">{branch.branches}</h3>
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
    branches: "",
    address: "",
    phoneNumber: ""
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

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

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !editingBranch) return;
    
    // Проверка типа файла
    if (!file.type.startsWith('image/')) {
      toast({
        title: t('common.error'),
        description: t('branch.please_select_image'),
        variant: 'destructive',
      });
      return;
    }
    
    // Проверка размера файла (максимум 100MB)
    if (file.size > 100 * 1024 * 1024) {
      toast({
        title: t('common.error'),
        description: t('branch.file_size_limit_100mb'),
        variant: 'destructive',
      });
      return;
    }
    
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/branches/${editingBranch.id}/photo`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload photo');
      }
      
      const result = await response.json();
      
      const description = result.status === 'processing' 
        ? `${result.message || t('branch.photo_processing')} (fileGuid: ${result.fileGuid})`
        : result.message || t('branch.photo_uploaded');
      
      toast({
        title: t('branch.photo_uploaded'),
        description: description,
        variant: 'default',
      });
      
      if (result.status === 'processing') {
        toast({
          title: t('branch.photo_processing_title'),
          description: t('branch.photo_processing_desc'),
          variant: 'default',
        });
      }
      
      // Обновляем список филиалов
      await refetchBranches();
      
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        title: t('branch.error_uploading_photo'),
        description: `${error}`,
        variant: 'destructive',
      });
    } finally {
      setUploadingPhoto(false);
    }
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
        title: t('common.success'),
        description: t('branch.update_success')
      });

      // Обновляем список филиалов
      await refetchBranches();
      
      // Закрываем диалог редактирования
      setEditDialog(false);
      setEditingBranch(null);

    } catch (error) {
      console.error('Error updating branch:', error);
      toast({
        title: t('common.error'),
        description: t('branch.update_error'),
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
          <div className="space-y-4 py-4">
            {/* Фото филиала */}
            <div>
              <Label>{t('branch.photo')}</Label>
              <div className="flex items-center gap-3 mt-2">
                <Avatar className="h-20 w-20">
                  {editingBranch?.photoUrl ? (
                    <AvatarImage src={editingBranch.photoUrl} alt={editingBranch.branches} />
                  ) : (
                    <AvatarFallback className="text-2xl">{editingBranch?.branches[0]}</AvatarFallback>
                  )}
                </Avatar>
                <label htmlFor="branch-photo-upload" className="cursor-pointer flex-1">
                  <div className="flex items-center justify-center gap-2 h-10 px-4 rounded-md bg-secondary hover:bg-secondary/80 transition-colors">
                    {uploadingPhoto ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">{t('branch.uploading')}</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        <span className="text-sm">{t('branch.upload_photo')}</span>
                      </>
                    )}
                  </div>
                  <input
                    id="branch-photo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    disabled={uploadingPhoto}
                  />
                </label>
              </div>
            </div>
            
            <div>
              <Label htmlFor="branchName">{t('branch.name_label')}</Label>
              <Input
                id="branchName"
                value={editData.branches}
                onChange={(e) => setEditData({ ...editData, branches: e.target.value })}
                placeholder={t('branch.name_placeholder')}
              />
            </div>
            <div>
              <Label htmlFor="branchAddress">{t('branch.address_label')}</Label>
              <Input
                id="branchAddress"
                value={editData.address}
                onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                placeholder={t('branch.address_placeholder')}
              />
            </div>
            <div>
              <Label htmlFor="branchPhone">{t('branch.phone_label')}</Label>
              <Input
                id="branchPhone"
                value={editData.phoneNumber}
                onChange={(e) => setEditData({ ...editData, phoneNumber: e.target.value })}
                placeholder={t('branch.phone_placeholder')}
              />
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
              disabled={isUpdating || !editData.branches.trim()}
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
            {isLoading ? t('branch.loading') : t('branch.no_branch')}
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