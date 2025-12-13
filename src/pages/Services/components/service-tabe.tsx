import React, { useState, useMemo, useEffect, ChangeEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Check, Trash2, Eye, Settings, Search, Upload, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiGet, apiPut, apiDelete } from '@/lib/api';
import { useBranch } from '@/contexts/BranchContext';
import { getBranchIdWithFallback } from '@/utils/branch-utils';
import { useLocale } from '@/contexts/LocaleContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { apiPatchJson } from '@/API/http';

const TIME_COLUMNS = [10, 15, 20, 30, 40, 50, 60, 75, 80, 90, 110, 120, 150, 220] as const;

const ServicesTable: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { branches, currentBranch } = useBranch();
  const { t } = useLocale();

  const [editingServices, setEditingServices] = useState<Record<number, any>>({});
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [durationDialogOpen, setDurationDialogOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<number | null>(null);
  const [serviceToView, setServiceToView] = useState<any | null>(null);
  const [serviceToConfigureDurations, setServiceToConfigureDurations] = useState<any | null>(null);
  const [tempDurations, setTempDurations] = useState<Record<string, number | null>>({});
  const [uploadingPhotos, setUploadingPhotos] = useState<Record<number, boolean>>({});

  const branchOptions = branches.map(branch => ({ id: branch.id.toString(), name: branch.branches }));

  const correctBranchId = getBranchIdWithFallback(currentBranch, branches);

  const { data: services = [], isLoading, error } = useQuery<any[]>({
    queryKey: ['crm-services'],
    queryFn: async () => {
      if (!correctBranchId) {
        throw new Error('No branch selected');
      }
      const response = await apiGet(`/services?branchId=${correctBranchId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch services');
      }
      const result = await response.json();
      const list: any[] = Array.isArray(result) ? result : result.data || [];

      return list.map((service) => {
        const normalized: any = {
          ...service,
          branchID: service.branchID || service.branch_id?.toString?.() || service.branch_id,
          defaultDuration: service.defaultDuration || service.default_duration || 60,
          photoUrl: service.photo_url || service.photoUrl,
        };

        if (Array.isArray(service.prices)) {
          service.prices.forEach((p: any) => {
            if (p?.duration) {
              normalized[`duration${p.duration}_price`] = p.price || 0;
            }
          });
        }

        return normalized;
      });
    },
    enabled: !!correctBranchId
  });

  useEffect(() => {
    if (services.length > 0) {
      const initialState: Record<number, any> = {};
      services.forEach((service) => {
        initialState[service.id] = { ...service };
      });
      setEditingServices(initialState);
    }
  }, [services]);

  const filteredServices = useMemo(() => {
    if (!searchQuery.trim()) return services;
    const query = searchQuery.toLowerCase();
    return services.filter((service) => {
      const name = service.name?.toLowerCase() || '';
      const description = service.description?.toLowerCase() || '';
      return name.includes(query) || description.includes(query);
    });
  }, [services, searchQuery]);

  const updateMutation = useMutation({
    mutationFn: async (service: any) => {
      const priceItems = TIME_COLUMNS
        .map((time) => {
          const price = service[`duration${time}_price`];
          if (price === null || price === undefined || price === '') return null;
          return { duration: time, price: Number(price) || 0 };
        })
        .filter(Boolean) as Array<{ duration: number; price: number }>;

      const prices = priceItems.length > 0
        ? priceItems
        : [{ duration: Number(service.defaultDuration) || 60, price: 0 }];

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/services/${service.id}?branchId=${currentBranch?.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('auth_token') ? { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` } : {})
        },
        body: JSON.stringify({
          name: service.name,
          description: service.description,
          isActive: service.isActive,
          defaultDuration: Number(service.defaultDuration) || 60,
          prices,
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || 'Failed to update service'); 
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-services'] });
      toast({ title: t('services.service_updated') });
    },
    onError: (error: Error) => {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (serviceId: number) => {
      const response = await apiDelete(`/api/crm/services/${serviceId}`);
      if (!response.ok) throw new Error(t('services.error_deleting'));
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-services'] });
      toast({ title: t('services.service_deleted') });
    },
    onError: (error: Error) => {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    },
  });

  const uploadPhotoMutation = useMutation({
    mutationFn: async ({ serviceId, file }: { serviceId: number, file: File }) => {
      const formData = new FormData();
      formData.append('photo', file);

      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/services/${serviceId}/photo`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to upload photo');
      }

      return res.json();
    },
    onSuccess: (data, variables) => {
      setUploadingPhotos(prev => ({ ...prev, [variables.serviceId]: false }));

      const description = data.status === 'processing'
        ? `${data.message || t('services.photo_processing')} (fileGuid: ${data.fileGuid})`
        : data.message || t('services.photo_uploaded');

      toast({
        title: t('services.photo_uploaded'),
        description,
        variant: 'default',
      });

      if (data.status === 'processing') {
        toast({
          title: t('services.photo_processing_title'),
          description: t('services.photo_processing_desc'),
          variant: 'default',
        });
      }

      queryClient.invalidateQueries({ queryKey: ['crm-services'] });
    },
    onError: (error, variables) => {
      setUploadingPhotos(prev => ({ ...prev, [variables.serviceId]: false }));
      toast({
        title: t('services.error_uploading_photo'),
        description: `${error}`,
        variant: 'destructive',
      });
    }
  });

  const handleInputChange = (serviceId: number, field: any, value: string | number | boolean | null) => {
    setEditingServices((prev) => ({
      ...prev,
      [serviceId]: {
        ...prev[serviceId],
        [field]: field.includes('price') ? (value === '' ? null : Number(value)) : value,
      },
    }));
  };

  const handleSaveService = (serviceId: number) => {
    const service = editingServices[serviceId];
    if (service) {
      updateMutation.mutate(service);
    }
  };

  const handleDeleteService = (serviceId: number) => {
    setServiceToDelete(serviceId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (serviceToDelete !== null) {
      deleteMutation.mutate(serviceToDelete);
      setDeleteDialogOpen(false);
      setServiceToDelete(null);
    }
  };

  const handleViewService = (service: any) => {
    setServiceToView(service);
    setViewDialogOpen(true);
  };

  const handleConfigureDurations = (service: any) => {
    setServiceToConfigureDurations(service);
    const durations: Record<string, number | null> = {};
    TIME_COLUMNS.forEach((time) => {
      durations[`duration${time}_price`] = service[`duration${time}_price`] || null;
    });
    setTempDurations(durations);
    setDurationDialogOpen(true);
  };

  const handleDurationChange = (field: string, value: string) => {
    setTempDurations((prev) => ({
      ...prev,
      [field]: value === '' ? null : Number(value)
    }));
  };

  const handleSaveDurations = () => {
    if (serviceToConfigureDurations) {
      setEditingServices((prev) => ({
        ...prev,
        [serviceToConfigureDurations.id]: {
          ...prev[serviceToConfigureDurations.id],
          ...tempDurations
        }
      }));

      const updatedService = {
        ...editingServices[serviceToConfigureDurations.id],
        ...tempDurations
      };
      updateMutation.mutate(updatedService);

      setDurationDialogOpen(false);
      setServiceToConfigureDurations(null);
    }
  };

  const handlePhotoUpload = (serviceId: number, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: t('common.error'),
        description: t('services.please_select_image'),
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      toast({
        title: t('common.error'),
        description: t('services.file_size_limit_100mb'),
        variant: 'destructive',
      });
      return;
    }

    setUploadingPhotos(prev => ({ ...prev, [serviceId]: true }));
    uploadPhotoMutation.mutate({ serviceId, file });
  };

  const getBranchName = (branchID: string | null) => {
    const branch = branchOptions.find((b) => b.id === branchID);
    return branch ? branch.name : t('services.not_specified');
  };

  if (isLoading) {
    return <div className="text-center py-8">{t('services.loading')}</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">{t('services.loading_error')}: {(error as Error).message}</div>;
  }

  return (
    <>
      <div className="mb-4 px-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            type="text"
            placeholder={t('services.search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 w-full text-base"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>
        {searchQuery && (
          <div className="mt-2 text-sm text-gray-600">
            {t('services.found_results', { count: filteredServices.length.toString() })}
          </div>
        )}
      </div>

      <Card className="w-full p-4 hidden md:block">
        <div className="overflow-x-auto max-h-[calc(100vh-200px)]">
          <table className="w-full border-collapse rounded-xl relative">
            <thead>
              <tr className="bg-gray-50">
                <th className="min-w-[180px] border border-gray-300 px-4 py-3 text-left text-base font-semibold sticky left-0 top-0 z-40 bg-gray-50 shadow-sm">{t('services.name')}</th>
                <th className="min-w-[100px] border border-gray-300 px-4 py-3 text-center text-base font-semibold sticky top-0 z-10 bg-gray-50">{t('services.photo')}</th>
                <th className="min-w-[140px] border border-gray-300 px-4 py-3 text-left text-base font-semibold sticky top-0 z-10 bg-gray-50">{t('services.description')}</th>
                <th className="min-w-[140px] border border-gray-300 px-4 py-3 text-left text-base font-semibold sticky top-0 z-10 bg-gray-50">{t('services.duration')}</th>
                <th className="min-w-[200px] text-center border border-gray-300 px-4 py-3 text-base font-semibold sticky top-0 z-10 bg-gray-50">{t('services.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredServices.map((service, index) => {
                const editingService = editingServices[service.id] || service;
                return (
                  <tr key={service.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border border-gray-300 px-4 py-3 sticky left-0 z-20 bg-white shadow-sm">
                      <Input
                        value={editingService.name}
                        onChange={(e) => handleInputChange(service.id, 'name', e.target.value)}
                        className="border-0 shadow-none p-2 text-base font-medium bg-transparent focus-visible:ring-1 focus-visible:ring-blue-500 min-w-[250px]"
                      />
                    </td>
                    <td className="border border-gray-300 px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <Avatar className="h-10 w-10">
                          {editingService.photoUrl ? (
                            <AvatarImage src={editingService.photoUrl} alt={editingService.name} />
                          ) : (
                            <AvatarFallback>{editingService.name[0]}</AvatarFallback>
                          )}
                        </Avatar>
                        <label htmlFor={`photo-upload-${service.id}`} className="cursor-pointer">
                          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
                            {uploadingPhotos[service.id] ? (
                              <Loader2 className="h-4 w-4 animate-spin text-gray-600" />
                            ) : (
                              <Upload className="h-4 w-4 text-gray-600" />
                            )}
                          </div>
                          <input
                            id={`photo-upload-${service.id}`}
                            type="file"
                            accept="image/*"
                            onChange={(e) => handlePhotoUpload(service.id, e)}
                            className="hidden"
                            disabled={uploadingPhotos[service.id]}
                          />
                        </label>
                      </div>
                    </td>
                    <td className="border border-gray-300 px-4 py-3">
                      <Input
                        value={editingService.description || ''}
                        onChange={(e) => handleInputChange(service.id, 'description', e.target.value)}
                        placeholder={t('services.description')}
                        className="border-0 shadow-none p-2 text-base bg-transparent min-w-[150px] focus-visible:ring-1 focus-visible:ring-blue-500"
                      />
                    </td>
                    <td className="border border-gray-300 px-4 py-3">
                      <Select
                        value={(editingService.defaultDuration || editingService.default_duration || 60).toString()}
                        onValueChange={(value) => handleInputChange(service.id, 'defaultDuration', parseInt(value))}
                      >
                        <SelectTrigger className="border-0 shadow-none p-2 text-base bg-transparent focus:ring-1 focus:ring-blue-500">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_COLUMNS.map((time) => (
                            <SelectItem key={time} value={time.toString()}>
                              {time} {t('services.minutes')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="border border-gray-300 px-4 py-3">
                      <div className="flex gap-2 justify-center flex-wrap">
                        <Button
                          onClick={() => handleConfigureDurations(editingService)}
                          className="inline-flex items-center justify-center h-9 px-3 border border-gray-300 bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors"
                        >
                          <Settings className="h-4 w-4 mr-1" />
                          <span className="text-sm">{t('services.configure')}</span>
                        </Button>
                        <Button
                          onClick={() => handleSaveService(service.id)}
                          disabled={updateMutation.isPending}
                          className="inline-flex items-center justify-center h-9 w-9 p-0 border border-gray-300 bg-white hover:bg-gray-50 rounded-md transition-colors"
                        >
                          <Check className="h-4 w-4" color="#000" />
                        </Button>
                        <Button
                          onClick={() => handleDeleteService(service.id)}
                          disabled={deleteMutation.isPending}
                          className="inline-flex items-center justify-center h-9 w-9 p-0 border border-gray-300 bg-white text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => handleViewService(editingService)}
                          className="inline-flex items-center justify-center h-9 w-9 p-0 border border-gray-300 bg-white hover:bg-gray-50 rounded-md transition-colors"
                        >
                          <Eye className="h-4 w-4" color="#000" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredServices.length === 0 && <div className="text-center py-8 text-gray-500">{searchQuery ? t('services.no_results') : t('services.no_services')}</div>}
      </Card>

      <div className="md:hidden space-y-3 p-2">
        {filteredServices.length === 0 ? (
          <Card className="p-6">
            <div className="text-center text-gray-500">{searchQuery ? t('services.no_results') : t('services.no_services')}</div>
          </Card>
        ) : (
          filteredServices.map((service) => {
            const editingService = editingServices[service.id] || service;
            return (
              <Card key={service.id} className="p-4 space-y-3 shadow-sm">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500">{t('services.photo')}</label>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-16 w-16">
                      {editingService.photoUrl ? (
                        <AvatarImage src={editingService.photoUrl} alt={editingService.name} />
                      ) : (
                        <AvatarFallback className="text-lg">{editingService.name[0]}</AvatarFallback>
                      )}
                    </Avatar>
                    <label htmlFor={`photo-upload-mobile-${service.id}`} className="cursor-pointer flex-1">
                      <div className="flex items-center justify-center gap-2 h-10 px-4 rounded-md bg-gray-100 hover:bg-gray-200 transition-colors">
                        {uploadingPhotos[service.id] ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin text-gray-600" />
                            <span className="text-sm text-gray-600">{t('services.uploading')}</span>
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 text-gray-600" />
                            <span className="text-sm text-gray-600">{t('services.upload_photo')}</span>
                          </>
                        )}
                      </div>
                      <input
                        id={`photo-upload-mobile-${service.id}`}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handlePhotoUpload(service.id, e)}
                        className="hidden"
                        disabled={uploadingPhotos[service.id]}
                      />
                    </label>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500">{t('services.name')}</label>
                  <Input
                    value={editingService.name}
                    onChange={(e) => handleInputChange(service.id, 'name', e.target.value)}
                    className="text-base font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500">{t('services.description')}</label>
                  <Input
                    value={editingService.description || ''}
                    onChange={(e) => handleInputChange(service.id, 'description', e.target.value)}
                    placeholder={t('services.description')}
                    className="text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500">{t('services.duration')}</label>
                  <Select
                    value={(editingService.defaultDuration || editingService.default_duration || 60).toString()}
                    onValueChange={(value) => handleInputChange(service.id, 'defaultDuration', parseInt(value))}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_COLUMNS.map((time) => (
                        <SelectItem key={time} value={time.toString()}>
                          {time} {t('services.minutes')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    onClick={() => handleConfigureDurations(editingService)}
                    className="flex-1 bg-blue-600 text-white hover:bg-blue-700 text-sm h-9"
                  >
                    <Settings className="h-4 w-4 mr-1" />
                    {t('services.configure')}
                  </Button>
                  <Button
                    onClick={() => handleSaveService(service.id)}
                    disabled={updateMutation.isPending}
                    className="h-9 w-9 p-0 bg-white border border-gray-300 hover:bg-gray-50"
                  >
                    <Check className="h-4 w-4 text-gray-700" />
                  </Button>
                  <Button
                    onClick={() => handleDeleteService(service.id)}
                    disabled={deleteMutation.isPending}
                    className="h-9 w-9 p-0 bg-white border border-gray-300 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => handleViewService(editingService)}
                    className="h-9 w-9 p-0 bg-white border border-gray-300 hover:bg-gray-50"
                  >
                    <Eye className="h-4 w-4 text-gray-700" />
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('services.delete_service_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('services.confirm_delete')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-[600px]" aria-describedby="service-view-description">
          <DialogHeader>
            <DialogTitle>{t('services.service_info')}</DialogTitle>
            <DialogDescription id="service-view-description">
              {t('services.view_detailed_info')}
            </DialogDescription>
          </DialogHeader>
          {serviceToView && (
            <div className="space-y-4">
              {serviceToView.photoUrl && (
                <div className="flex justify-center">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={serviceToView.photoUrl} alt={serviceToView.name} />
                    <AvatarFallback className="text-2xl">{serviceToView.name[0]}</AvatarFallback>
                  </Avatar>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-500">{t('services.name')}</p>
                <p className="text-base font-semibold">{serviceToView.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">{t('services.description')}</p>
                <p className="text-base">{serviceToView.description || t('services.no_description')}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">{t('services.branch')}</p>
                <p className="text-base">{getBranchName(serviceToView.branchID)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">{t('services.default_duration')}</p>
                <p className="text-base">{serviceToView.defaultDuration} {t('common.minutes')}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">{t('services.status')}</p>
                <p className="text-base">{serviceToView.isActive ? t('services.active') : t('services.inactive')}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">{t('services.prices_by_duration')}</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {TIME_COLUMNS.map((time) => {
                    const price = serviceToView[`duration${time}_price`];
                    if (price && price > 0) {
                      return (
                        <div key={time} className="flex justify-between border-b pb-1">
                          <span>{time} {t('common.minutes')}:</span>
                          <span className="font-medium">{price} {t('services.currency')}</span>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={durationDialogOpen} onOpenChange={setDurationDialogOpen}>
        <DialogContent className="w-[95vw] sm:max-w-[700px] max-h-[90vh] overflow-y-auto" aria-describedby="duration-config-description">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">{t('services.configure_durations')}</DialogTitle>
            <DialogDescription id="duration-config-description" className="text-sm">
              {t('services.configure_durations_desc')}
            </DialogDescription>
          </DialogHeader>
          {serviceToConfigureDurations && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs sm:text-sm font-medium text-gray-700">
                  {t('services.configuring_for')}: <span className="font-bold">{serviceToConfigureDurations.name}</span>
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {TIME_COLUMNS.map((time) => {
                  const field = `duration${time}_price`;
                  const price = tempDurations[field];
                  return (
                    <div key={time} className="space-y-2">
                      <label className="text-xs sm:text-sm font-medium text-gray-700">
                        {time} {t('services.minutes')}
                      </label>
                      <Input
                        type="number"
                        value={price || ''}
                        onChange={(e) => handleDurationChange(field, e.target.value)}
                        placeholder="0"
                        className="text-sm sm:text-base"
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDurationDialogOpen(false)}
                  className="w-full sm:w-auto"
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveDurations}
                  disabled={updateMutation.isPending}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {updateMutation.isPending ? t('common.saving') : t('common.save')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ServicesTable;
