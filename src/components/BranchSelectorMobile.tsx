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

// Карточка филиала для мобильного модального окна
const BranchCard: React.FC<BranchCardProps> = ({ branch, isSelected, onClick, onEdit }) => {
  const { t } = useLocale();
  
  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(branch);
    }
  };

  return (
    <div
      className={cn(
        "p-3 border rounded-lg flex items-start gap-3 cursor-pointer transition-all duration-200",
        isSelected ? "border-primary bg-muted/50" : "border-gray-200 hover:border-gray-300 bg-card hover:bg-muted/30"
      )}
      onClick={onClick}
    >
      {branch.photoUrl ? (
        <Avatar className="h-10 w-10">
          <AvatarImage src={branch.photoUrl} alt={branch.branches} />
          <AvatarFallback className="text-sm">{branch.branches[0]}</AvatarFallback>
        </Avatar>
      ) : (
        <div className="rounded-full p-2 bg-primary/10 text-primary">
          <Building className="h-5 w-5" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-sm truncate">{branch.branches}</h3>
          {isSelected && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary whitespace-nowrap">
              {t('branch.selected')}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">{branch.address}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{t('branch.phone_prefix')}{branch.phoneNumber}</p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0 hover:bg-primary/10 text-muted-foreground hover:text-primary flex-shrink-0"
        onClick={handleEditClick}
        title={t('branch.edit_tooltip')}
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
};

// Мобильный компонент выбора филиала
interface BranchSelectorMobileProps {
  onSelect?: () => void;
}

export const BranchSelectorMobile: React.FC<BranchSelectorMobileProps> = ({ onSelect }) => {
  const { currentBranch, setBranch, branches, isLoading, refetchBranches } = useBranch();
  const { user } = useAuth();
  const { t } = useLocale();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(currentBranch);
  
  const [editDialog, setEditDialog] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [editData, setEditData] = useState<EditBranchData>({
    branches: "",
    address: "",
    phoneNumber: ""
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const isAdminOrSuperAdmin = user?.role === 'admin' || user?.role === 'superadmin';

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
    
    if (!file.type.startsWith('image/')) {
      toast({
        title: t('common.error'),
        description: t('branch.please_select_image'),
        variant: 'destructive',
      });
      return;
    }
    
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

      await refetchBranches();
      
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
      <Button variant="ghost" size="sm" className="h-8 px-3" disabled>
        <Building2 className="h-4 w-4 mr-1.5" />
        <span className="text-xs">{t('branch.loading')}</span>
      </Button>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            size="sm"
            className="bg-gradient-to-r from-emerald-400 to-teal-400 border-emerald-500 hover:from-emerald-500 hover:to-teal-500 hover:border-emerald-600 text-slate-900 hover:text-slate-900 font-semibold shadow-md hover:shadow-xl transition-all duration-200 gap-1.5 h-8 px-3"
          >
            <Building2 className="h-4 w-4" />
            <span className="text-xs">{currentBranch?.branches || t('branch.title')}</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">{t('branch.select_title')}</DialogTitle>
            <DialogDescription className="text-sm">
              {t('branch.select_description')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-3">
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
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto">
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSave} disabled={!selectedBranch} className="w-full sm:w-auto">
              {t('common.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог редактирования филиала - оптимизирован для мобильных */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">{t('branch.edit_title')}</DialogTitle>
            <DialogDescription className="text-sm">
              {t('branch.edit_description')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-3">
            {/* Фото филиала */}
            <div>
              <Label className="text-sm">{t('branch.photo')}</Label>
              <div className="flex items-center gap-2 mt-2">
                <Avatar className="h-16 w-16">
                  {editingBranch?.photoUrl ? (
                    <AvatarImage src={editingBranch.photoUrl} alt={editingBranch.branches} />
                  ) : (
                    <AvatarFallback className="text-lg">{editingBranch?.branches[0]}</AvatarFallback>
                  )}
                </Avatar>
                <label htmlFor="branch-photo-upload" className="cursor-pointer flex-1">
                  <div className="flex items-center justify-center gap-2 h-9 px-3 rounded-md bg-secondary hover:bg-secondary/80 transition-colors">
                    {uploadingPhoto ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span className="text-xs">{t('branch.uploading')}</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-3.5 w-3.5" />
                        <span className="text-xs">{t('branch.upload_photo')}</span>
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
              <Label htmlFor="branchName" className="text-sm">{t('branch.name_label')}</Label>
              <Input
                id="branchName"
                value={editData.branches}
                onChange={(e) => setEditData({ ...editData, branches: e.target.value })}
                placeholder={t('branch.name_placeholder')}
                className="text-sm"
              />
            </div>
            <div>
              <Label htmlFor="branchAddress" className="text-sm">{t('branch.address_label')}</Label>
              <Input
                id="branchAddress"
                value={editData.address}
                onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                placeholder={t('branch.address_placeholder')}
                className="text-sm"
              />
            </div>
            <div>
              <Label htmlFor="branchPhone" className="text-sm">{t('branch.phone_label')}</Label>
              <Input
                id="branchPhone"
                value={editData.phoneNumber}
                onChange={(e) => setEditData({ ...editData, phoneNumber: e.target.value })}
                placeholder={t('branch.phone_placeholder')}
                className="text-sm"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => setEditDialog(false)}
              disabled={isUpdating}
              className="w-full sm:w-auto"
            >
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={handleUpdateBranch}
              disabled={isUpdating || !editData.branches.trim()}
              className="w-full sm:w-auto"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
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
