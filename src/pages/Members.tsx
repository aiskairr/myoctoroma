import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGetJson, apiPostJson, apiPatch, apiDelete } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Grid, List, Trello, Users, Plus, X, EditIcon, ChevronDown } from "lucide-react";
import { useBranch } from "@/contexts/BranchContext";
import { useAuth } from "@/contexts/SimpleAuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

// Интерфейс для создания члена
interface CreateMemberInput {
  first_name: string;
  last_name: string;
  patronymic?: string;
  date_of_birth?: string;
  address?: string;
  inn?: string;
  email?: string;
  phone_number?: string;
  branch_id: number;
  status?: 'active' | 'inactive';
}

// Интерфейс для члена из API
interface Member {
  chlen_id: number;
  first_name: string;
  last_name: string;
  patronymic?: string;
  date_of_birth?: string;
  address?: string;
  branch_id: number;
  inn?: string;
  email?: string;
  phone_number?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

// Вспомогательные функции
const getFullName = (member: Member): string => {
  return `${member.first_name} ${member.last_name}`.trim();
};

const getInitials = (member: Member): string => {
  const first = member.first_name?.[0]?.toUpperCase() || '';
  const last = member.last_name?.[0]?.toUpperCase() || '';
  return (first + last).slice(0, 2);
};

// Компонент формы создания члена
interface CreateMemberFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CreateMemberForm: React.FC<CreateMemberFormProps> = ({ onClose, onSuccess }) => {
  const { user } = useAuth();
  const { currentBranch, branches } = useBranch();
  
  // Проверяем роль пользователя
  const isSuperAdminOrAdmin = user?.role === 'superadmin' || user?.role === 'admin';
  const isReceptionist = user?.role === 'reception';
  
  // Определяем начальный филиал:
  // - Для суперадмина/админа: первый филиал из списка
  // - Для ресепшена: текущий филиал
  const getInitialBranchId = (): number => {
    if (isSuperAdminOrAdmin && branches.length > 0) {
      return branches[0].id;
    }
    return currentBranch?.id || 0;
  };
  
  const [formData, setFormData] = useState<CreateMemberInput>({
    first_name: '',
    last_name: '',
    patronymic: '',
    date_of_birth: '',
    address: '',
    inn: '',
    email: '',
    phone_number: '',
    branch_id: getInitialBranchId(),
    status: 'active',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const createMemberMutation = useMutation({
    mutationFn: async (data: CreateMemberInput) => {
      const response = await apiPostJson('/api/members', {
        ...data,
        branch_id: data.branch_id,
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: 'Успешно',
        description: 'Член успешно создан',
        duration: 3000,
      });
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка',
        description: error.message || 'Ошибка при создании члена',
        duration: 3000,
        variant: 'destructive',
      });
    },
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'Имя обязательно';
    }
    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Фамилия обязательна';
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Некорректный email';
    }
    if (formData.phone_number && !/^\+?[\d\s\-\(\)]{10,}$/.test(formData.phone_number)) {
      newErrors.phone_number = 'Некорректный номер телефона';
    }
    if (formData.inn && !/^\d{10,}$/.test(formData.inn)) {
      newErrors.inn = 'ИНН должен содержать минимум 10 цифр';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      createMemberMutation.mutate(formData);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    // Очистить ошибку при начале редактирования
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleBranchChange = (branchId: string) => {
    const branchIdNum = parseInt(branchId, 10);
    setFormData(prev => ({
      ...prev,
      branch_id: branchIdNum,
    }));
  };

  const handleStatusChange = (status: string) => {
    setFormData(prev => ({
      ...prev,
      status: status as 'active' | 'inactive',
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Филиал (только для суперадмина и админа) */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Филиал</h3>
        <div>
          <Label htmlFor="branch_id" className="text-gray-700 font-medium">
            Филиал {isReceptionist ? '' : '*'}
          </Label>
          {isSuperAdminOrAdmin ? (
            <Select value={formData.branch_id.toString()} onValueChange={handleBranchChange}>
              <SelectTrigger id="branch_id" className="w-full">
                <SelectValue placeholder="Выберите филиал" />
              </SelectTrigger>
              <SelectContent>
                {branches.map(branch => (
                  <SelectItem key={branch.id} value={branch.id.toString()}>
                    {branch.branches}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700">
              {branches.find(b => b.id === formData.branch_id)?.branches || 'Филиал не выбран'}
            </div>
          )}
        </div>

        {/* Статус */}
        <div>
          <Label htmlFor="status" className="text-gray-700 font-medium">
            Статус
          </Label>
          <Select value={formData.status || 'active'} onValueChange={handleStatusChange}>
            <SelectTrigger id="status" className="w-full">
              <SelectValue placeholder="Выберите статус" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Активный</SelectItem>
              <SelectItem value="inactive">Неактивный</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      {/* Основные данные */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Основные данные</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="first_name" className="text-gray-700 font-medium">
              Имя *
            </Label>
            <Input
              id="first_name"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              placeholder="Введите имя"
              className={errors.first_name ? 'border-red-500' : ''}
            />
            {errors.first_name && (
              <p className="text-red-500 text-sm mt-1">{errors.first_name}</p>
            )}
          </div>

          <div>
            <Label htmlFor="last_name" className="text-gray-700 font-medium">
              Фамилия *
            </Label>
            <Input
              id="last_name"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              placeholder="Введите фамилию"
              className={errors.last_name ? 'border-red-500' : ''}
            />
            {errors.last_name && (
              <p className="text-red-500 text-sm mt-1">{errors.last_name}</p>
            )}
          </div>

          <div>
            <Label htmlFor="patronymic" className="text-gray-700 font-medium">
              Отчество
            </Label>
            <Input
              id="patronymic"
              name="patronymic"
              value={formData.patronymic}
              onChange={handleChange}
              placeholder="Введите отчество (опционально)"
            />
          </div>

          <div>
            <Label htmlFor="date_of_birth" className="text-gray-700 font-medium">
              Дата рождения
            </Label>
            <Input
              id="date_of_birth"
              name="date_of_birth"
              type="date"
              value={formData.date_of_birth}
              onChange={handleChange}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Контактные данные */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Контактные данные</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="phone_number" className="text-gray-700 font-medium">
              Телефон
            </Label>
            <Input
              id="phone_number"
              name="phone_number"
              value={formData.phone_number}
              onChange={handleChange}
              placeholder="+7 (xxx) xxx-xx-xx"
              className={errors.phone_number ? 'border-red-500' : ''}
            />
            {errors.phone_number && (
              <p className="text-red-500 text-sm mt-1">{errors.phone_number}</p>
            )}
          </div>

          <div>
            <Label htmlFor="email" className="text-gray-700 font-medium">
              Email
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="example@mail.com"
              className={errors.email ? 'border-red-500' : ''}
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email}</p>
            )}
          </div>
        </div>
      </div>

      <Separator />

      {/* Дополнительные данные */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Дополнительные данные</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="address" className="text-gray-700 font-medium">
              Адрес
            </Label>
            <Input
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Город, улица, дом"
            />
          </div>

          <div>
            <Label htmlFor="inn" className="text-gray-700 font-medium">
              ИНН
            </Label>
            <Input
              id="inn"
              name="inn"
              value={formData.inn}
              onChange={handleChange}
              placeholder="Индивидуальный номер налогоплательщика"
              className={errors.inn ? 'border-red-500' : ''}
            />
            {errors.inn && (
              <p className="text-red-500 text-sm mt-1">{errors.inn}</p>
            )}
          </div>
        </div>
      </div>

      {/* Кнопки действия */}
      <div className="flex gap-3 justify-end pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={createMemberMutation.isPending}
        >
          Отмена
        </Button>
        <Button
          type="submit"
          disabled={createMemberMutation.isPending}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {createMemberMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Создание...
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              Создать члена
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

// Компонент формы редактирования члена
interface EditMemberFormProps {
  member: Member;
  onClose: () => void;
  onSuccess: () => void;
}

// Интерфейс для лога члена
interface MemberLogEntry {
  id: number;
  member_id: number;
  event_type: 'CREATE' | 'UPDATE' | 'PATCH' | 'DELETE';
  action_by_user_id?: number;
  action_by_role?: string;
  changes?: Record<string, { old: any; new: any }>;
  previous_data?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  request_path?: string;
  request_method?: string;
  status_code?: number;
  response_message?: string;
  error_message?: string;
  created_at: string;
}

// Компонент для отображения логов членов
const MemberLogsView: React.FC<{ member: Member }> = ({ member }) => {
  const [logs, setLogs] = useState<MemberLogEntry[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set());

  React.useEffect(() => {
    const fetchLogs = async () => {
      setIsLoadingLogs(true);
      try {
        const response = await apiGetJson<any>(`/api/members/${member.chlen_id}/logs?limit=50`);
        setLogs(response.data || []);
      } catch (error) {
        console.log('Логи недоступны (система логирования может быть не активирована)');
        setLogs([]);
      } finally {
        setIsLoadingLogs(false);
      }
    };

    if (member.chlen_id) {
      fetchLogs();
    }
  }, [member.chlen_id]);

  const toggleExpand = (logId: number) => {
    setExpandedLogs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  };

  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case 'CREATE':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'UPDATE':
      case 'PATCH':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'DELETE':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getEventTypeLabel = (eventType: string) => {
    switch (eventType) {
      case 'CREATE':
        return '✨ Создано';
      case 'UPDATE':
        return '✏️ Обновлено (PUT)';
      case 'PATCH':
        return '🔄 Изменено (PATCH)';
      case 'DELETE':
        return '🗑️ Удалено';
      default:
        return eventType;
    }
  };

  const getMethodBadgeColor = (method: string) => {
    switch (method) {
      case 'POST':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'PATCH':
        return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'PUT':
        return 'bg-purple-50 text-purple-700 border border-purple-200';
      case 'DELETE':
        return 'bg-red-50 text-red-700 border border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border border-gray-200';
    }
  };

  if (isLoadingLogs) {
    return (
      <div className="flex justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">Загрузка истории...</p>
        </div>
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="py-12 text-center border border-dashed border-gray-300 rounded-lg bg-gray-50">
        <p className="text-gray-400 text-sm">📝 История изменений отсутствует</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Статистика */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-emerald-600">
            {logs.filter(l => l.event_type === 'CREATE').length}
          </div>
          <div className="text-xs text-emerald-600">Создано</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-blue-600">
            {logs.filter(l => l.event_type === 'PATCH' || l.event_type === 'UPDATE').length}
          </div>
          <div className="text-xs text-blue-600">Изменено</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-red-600">
            {logs.filter(l => l.event_type === 'DELETE').length}
          </div>
          <div className="text-xs text-red-600">Удалено</div>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-gray-600">{logs.length}</div>
          <div className="text-xs text-gray-600">Всего</div>
        </div>
      </div>

      <Separator className="my-6" />

      {/* Временная лента */}
      <div className="space-y-4">
        {logs.map((log, index) => {
          const isExpanded = expandedLogs.has(log.id);
          return (
            <div key={log.id} className="relative">
              {/* Линия временной шкалы */}
              {index !== logs.length - 1 && (
                <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gradient-to-b from-blue-200 to-transparent" />
              )}

              <div className="flex gap-4">
                {/* Точка на временной шкале */}
                <div className="relative flex flex-col items-center">
                  <div className={`w-4 h-4 rounded-full ring-4 ring-white relative z-10 ${
                    log.event_type === 'CREATE' ? 'bg-emerald-500' :
                    log.event_type === 'DELETE' ? 'bg-red-500' :
                    'bg-blue-500'
                  }`} />
                </div>

                {/* Содержание события */}
                <div className="flex-1 pb-4">
                  <Card className="border border-gray-200 hover:shadow-md transition-shadow cursor-pointer" onClick={() => toggleExpand(log.id)}>
                    <div className="p-4">
                      {/* Заголовок события (всегда видим) */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Badge className={`${getEventTypeColor(log.event_type)} border flex-shrink-0`}>
                            {getEventTypeLabel(log.event_type)}
                          </Badge>
                          <Badge variant="outline" className={`${getMethodBadgeColor(log.request_method || '')} flex-shrink-0`}>
                            {log.request_method}
                            {log.status_code && (
                              <span className={log.status_code < 400 ? 'text-green-600 ml-1' : 'text-red-600 ml-1'}>
                                {log.status_code}
                              </span>
                            )}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-gray-600 font-medium whitespace-nowrap">
                            {new Date(log.created_at).toLocaleString('ru-RU')}
                          </span>
                          <ChevronDown 
                            className={`h-5 w-5 text-gray-500 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                          />
                        </div>
                      </div>

                      {/* Расширенное содержание (видимо только если развёрнуто) */}
                      {isExpanded && (
                        <div className="mt-4 space-y-4">
                          {/* Изменения */}
                          {log.changes && Object.keys(log.changes).length > 0 && (
                            <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-lg border border-gray-200">
                              <p className="font-semibold text-gray-700 mb-3 text-sm">📋 Изменения:</p>
                              <div className="space-y-2">
                                {Object.entries(log.changes)
                                  .sort((a, b) => a[0].localeCompare(b[0]))
                                  .map(([field, change]: [string, any]) => (
                                  <div key={field} className="flex items-center justify-between text-sm bg-white p-2.5 rounded border border-gray-200">
                                    <span className="font-medium text-gray-600 min-w-[120px]">
                                      {field.replace(/_/g, ' ')}:
                                    </span>
                                    <div className="flex items-center gap-2 flex-1 ml-4">
                                      {change.old !== null && change.old !== undefined ? (
                                        <span className="bg-red-100 text-red-700 px-2.5 py-1 rounded text-xs font-medium max-w-xs truncate">
                                          {String(change.old).substring(0, 40)}
                                        </span>
                                      ) : (
                                        <span className="bg-gray-100 text-gray-400 px-2.5 py-1 rounded text-xs italic">
                                          пусто
                                        </span>
                                      )}
                                      <span className="text-gray-400 font-bold text-xs flex-shrink-0">→</span>
                                      {change.new !== null && change.new !== undefined ? (
                                        <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded text-xs font-medium max-w-xs truncate">
                                          {String(change.new).substring(0, 40)}
                                        </span>
                                      ) : (
                                        <span className="bg-gray-100 text-gray-400 px-2.5 py-1 rounded text-xs italic">
                                          пусто
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Данные перед удалением */}
                          {log.event_type === 'DELETE' && log.previous_data && (
                            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                              <p className="font-semibold text-red-700 mb-3 text-sm">🗑️ Удалённые данные:</p>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                {Object.entries(log.previous_data)
                                  .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
                                  .map(([field, value]: [string, any]) => (
                                  <div key={field} className="bg-white p-2 rounded border border-red-200">
                                    <span className="font-medium text-red-700">{field}:</span>
                                    <span className="text-red-600 ml-1">{String(value) || 'пусто'}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Мета информация */}
                          {(log.ip_address || log.request_path) && (
                            <div className="pt-3 border-t border-gray-200 text-xs text-gray-500 space-y-1">
                              {log.ip_address && (
                                <p>
                                  <span className="font-medium text-gray-600">🌐 IP:</span> {log.ip_address}
                                </p>
                              )}
                              {log.request_path && (
                                <p>
                                  <span className="font-medium text-gray-600">📁 Эндпоинт:</span> <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">{log.request_path}</code>
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const EditMemberForm: React.FC<EditMemberFormProps> = ({ member, onClose, onSuccess }) => {
  const { user } = useAuth();
  const { branches } = useBranch();
  
  // Проверяем роль пользователя
  const isSuperAdminOrAdmin = user?.role === 'superadmin' || user?.role === 'admin';
  
  const [formData, setFormData] = useState<Partial<Member>>({
    first_name: member.first_name || '',
    last_name: member.last_name || '',
    patronymic: member.patronymic || '',
    date_of_birth: member.date_of_birth || '',
    address: member.address || '',
    inn: member.inn || '',
    email: member.email || '',
    phone_number: member.phone_number || '',
    branch_id: member.branch_id || 0,
    status: member.status || 'active',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const updateMemberMutation = useMutation({
    mutationFn: async (data: Partial<Member>) => {
      const response = await apiPatch(`/api/members/${member.chlen_id}`, {
        first_name: data.first_name,
        last_name: data.last_name,
        patronymic: data.patronymic,
        date_of_birth: data.date_of_birth,
        address: data.address,
        inn: data.inn,
        email: data.email,
        phone_number: data.phone_number,
        branch_id: data.branch_id,
        status: data.status,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Успешно',
        description: 'Член успешно обновлен',
        duration: 3000,
      });
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка',
        description: error.message || 'Ошибка при обновлении члена',
        duration: 3000,
        variant: 'destructive',
      });
    },
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.first_name?.trim()) {
      newErrors.first_name = 'Имя обязательно';
    }
    if (!formData.last_name?.trim()) {
      newErrors.last_name = 'Фамилия обязательна';
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Некорректный email';
    }
    if (formData.phone_number && !/^\+?[\d\s\-\(\)]{10,}$/.test(formData.phone_number)) {
      newErrors.phone_number = 'Некорректный номер телефона';
    }
    if (formData.inn && !/^\d{10,}$/.test(formData.inn)) {
      newErrors.inn = 'ИНН должен содержать минимум 10 цифр';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      updateMemberMutation.mutate(formData);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    // Очистить ошибку при начале редактирования
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleBranchChange = (branchId: string) => {
    const branchIdNum = parseInt(branchId, 10);
    setFormData(prev => ({
      ...prev,
      branch_id: branchIdNum,
    }));
  };

  const handleStatusChange = (status: string) => {
    setFormData(prev => ({
      ...prev,
      status: status as 'active' | 'inactive',
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Филиал (только для суперадмина и админа) */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Филиал</h3>
        <div>
          <Label htmlFor="branch_id" className="text-gray-700 font-medium">
            Филиал
          </Label>
          {isSuperAdminOrAdmin ? (
            <Select value={formData.branch_id?.toString()} onValueChange={handleBranchChange}>
              <SelectTrigger id="branch_id" className="w-full">
                <SelectValue placeholder="Выберите филиал" />
              </SelectTrigger>
              <SelectContent>
                {branches.map(branch => (
                  <SelectItem key={branch.id} value={branch.id.toString()}>
                    {branch.branches}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700">
              {branches.find(b => b.id === formData.branch_id)?.branches || 'Филиал не выбран'}
            </div>
          )}
        </div>

        {/* Статус */}
        <div>
          <Label htmlFor="status" className="text-gray-700 font-medium">
            Статус
          </Label>
          <Select value={formData.status || 'active'} onValueChange={handleStatusChange}>
            <SelectTrigger id="status" className="w-full">
              <SelectValue placeholder="Выберите статус" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Активный</SelectItem>
              <SelectItem value="inactive">Неактивный</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      {/* Основные данные */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Основные данные</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="edit_first_name" className="text-gray-700 font-medium">
              Имя *
            </Label>
            <Input
              id="edit_first_name"
              name="first_name"
              value={formData.first_name || ''}
              onChange={handleChange}
              placeholder="Введите имя"
              className={errors.first_name ? 'border-red-500' : ''}
            />
            {errors.first_name && (
              <p className="text-red-500 text-sm mt-1">{errors.first_name}</p>
            )}
          </div>

          <div>
            <Label htmlFor="edit_last_name" className="text-gray-700 font-medium">
              Фамилия *
            </Label>
            <Input
              id="edit_last_name"
              name="last_name"
              value={formData.last_name || ''}
              onChange={handleChange}
              placeholder="Введите фамилию"
              className={errors.last_name ? 'border-red-500' : ''}
            />
            {errors.last_name && (
              <p className="text-red-500 text-sm mt-1">{errors.last_name}</p>
            )}
          </div>

          <div>
            <Label htmlFor="edit_patronymic" className="text-gray-700 font-medium">
              Отчество
            </Label>
            <Input
              id="edit_patronymic"
              name="patronymic"
              value={formData.patronymic || ''}
              onChange={handleChange}
              placeholder="Введите отчество (опционально)"
            />
          </div>

          <div>
            <Label htmlFor="edit_date_of_birth" className="text-gray-700 font-medium">
              Дата рождения
            </Label>
            <Input
              id="edit_date_of_birth"
              name="date_of_birth"
              type="date"
              value={formData.date_of_birth || ''}
              onChange={handleChange}
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="edit_phone_number" className="text-gray-700 font-medium">
              Телефон
            </Label>
            <Input
              id="edit_phone_number"
              name="phone_number"
              value={formData.phone_number || ''}
              onChange={handleChange}
              placeholder="Введите номер телефона"
              className={errors.phone_number ? 'border-red-500' : ''}
            />
            {errors.phone_number && (
              <p className="text-red-500 text-sm mt-1">{errors.phone_number}</p>
            )}
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="edit_email" className="text-gray-700 font-medium">
              Email
            </Label>
            <Input
              id="edit_email"
              name="email"
              type="email"
              value={formData.email || ''}
              onChange={handleChange}
              placeholder="Введите email"
              className={errors.email ? 'border-red-500' : ''}
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email}</p>
            )}
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="edit_address" className="text-gray-700 font-medium">
              Адрес
            </Label>
            <Input
              id="edit_address"
              name="address"
              value={formData.address || ''}
              onChange={handleChange}
              placeholder="Введите адрес"
            />
          </div>

          <div>
            <Label htmlFor="edit_inn" className="text-gray-700 font-medium">
              ИНН
            </Label>
            <Input
              id="edit_inn"
              name="inn"
              value={formData.inn || ''}
              onChange={handleChange}
              placeholder="Введите ИНН"
              className={errors.inn ? 'border-red-500' : ''}
            />
            {errors.inn && (
              <p className="text-red-500 text-sm mt-1">{errors.inn}</p>
            )}
          </div>
        </div>
      </div>

      <Separator />

      {/* Кнопки действия */}
      <div className="flex gap-3 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={updateMemberMutation.isPending}
        >
          Отмена
        </Button>
        <Button
          type="submit"
          disabled={updateMemberMutation.isPending}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {updateMemberMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Сохранение...
            </>
          ) : (
            <>
              <EditIcon className="mr-2 h-4 w-4" />
              Сохранить
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

// Компонент карточки члена
const MemberCard: React.FC<{ 
  member: Member;
  onEditClick?: () => void;
  onDeleteClick?: () => void;
}> = ({ member, onEditClick, onDeleteClick }) => {
  const initials = getInitials(member);
  const fullName = getFullName(member);

  return (
    <Card 
      className={`relative overflow-hidden transition-all duration-300 ${
        member.status === 'inactive' ? 'opacity-80 bg-gray-50' : 'bg-white'
      } hover:shadow-lg border-none shadow-sm`}
    >
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-4 flex-1">
            <Avatar className="h-14 w-14">
              <AvatarFallback className={`${
                member.status === 'active' 
                  ? 'bg-green-100 text-green-600' 
                  : 'bg-gray-300 text-gray-600'
              } text-lg font-bold`}>
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                {fullName}
                {member.status === 'inactive' && (
                  <Badge className="bg-gray-200 text-gray-700 hover:bg-gray-300">
                    Неактивен
                  </Badge>
                )}
                {member.status === 'active' && (
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                    ✓ Активен
                  </Badge>
                )}
              </CardTitle>
              {member.patronymic && (
                <CardDescription className="text-sm text-gray-500 mt-1">
                  Отчество: {member.patronymic}
                </CardDescription>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {member.phone_number && (
            <div className="flex items-center text-sm text-gray-600">
              <span className="font-medium text-gray-500 w-20">📞</span>
              <span>{member.phone_number}</span>
            </div>
          )}
          {member.email && (
            <div className="flex items-center text-sm text-gray-600">
              <span className="font-medium text-gray-500 w-20">✉️</span>
              <span className="truncate">{member.email}</span>
            </div>
          )}
          {member.date_of_birth && (
            <div className="flex items-center text-sm text-gray-600">
              <span className="font-medium text-gray-500 w-20">🎂</span>
              <span>{member.date_of_birth}</span>
            </div>
          )}
          {member.address && (
            <div className="flex items-start text-sm text-gray-600">
              <span className="font-medium text-gray-500 w-20">📍</span>
              <p className="line-clamp-2">{member.address}</p>
            </div>
          )}
          {member.inn && (
            <div className="flex items-center text-sm text-gray-600">
              <span className="font-medium text-gray-500 w-20">🔢</span>
              <span>{member.inn}</span>
            </div>
          )}
        </div>
      </CardContent>
      <div className="pt-4 border-t border-gray-100 px-4 pb-4 flex flex-wrap gap-2">
        {onEditClick && (
          <Button
            variant="outline"
            size="sm"
            onClick={onEditClick}
            className="flex-1 text-gray-600 border-gray-200 hover:bg-gray-50 min-w-[120px]"
          >
            <EditIcon className="h-4 w-4 mr-2" />
            Редактировать
          </Button>
        )}
        {onDeleteClick && (
          <Button
            variant="destructive"
            size="sm"
            onClick={onDeleteClick}
            className="flex-1 bg-red-600 hover:bg-red-700 min-w-[100px]"
          >
            <X className="h-4 w-4 mr-2" />
            Удалить
          </Button>
        )}
      </div>
    </Card>
  );
};

// Компонент строки таблицы
const MemberTableRow: React.FC<{ member: Member }> = ({ member }) => {
  const fullName = getFullName(member);
  const initials = getInitials(member);

  return (
    <tr className="border-b hover:bg-gray-50 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-indigo-500 text-white text-sm font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="text-sm font-medium text-gray-900">{fullName}</div>
            <div className="text-xs text-gray-500">{member.patronymic || 'N/A'}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
        {member.phone_number || '-'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
        {member.email || '-'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
        {member.date_of_birth || '-'}
      </td>
      <td className="px-6 py-4">
        {member.status === 'active' ? (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-200 cursor-default">
            ✓ Активен
          </Badge>
        ) : (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-200 cursor-default">
            ✗ Неактивен
          </Badge>
        )}
      </td>
    </tr>
  );
};

// Компонент доски по филиалам и статусам
const MemberBoardByBranchAndStatus: React.FC<{ 
  members: Member[];
  branches: Array<{ id: number; branches: string }>;
}> = ({ members, branches }) => {
  const boardGroups = useMemo(() => {
    const groups: { [key: string]: { [key: string]: Member[] } } = {};
    
    members.forEach(member => {
      const branchName = branches.find(b => b.id === member.branch_id)?.branches || `Филиал ${member.branch_id}`;
      const status = member.status === 'active' ? 'Активные' : 'Неактивные';
      
      if (!groups[branchName]) {
        groups[branchName] = {};
      }
      if (!groups[branchName][status]) {
        groups[branchName][status] = [];
      }
      groups[branchName][status].push(member);
    });
    
    return groups;
  }, [members, branches]);

  return (
    <div className="space-y-6">
      {Object.entries(boardGroups).map(([branchName, statusGroups]) => (
        <div key={branchName}>
          <h3 className="text-lg font-bold text-gray-900 mb-4 border-l-4 border-blue-500 pl-3">
            {branchName}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Активные */}
            <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
              <h4 className="font-semibold text-green-900 mb-4 flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-green-500"></span>
                Активные ({statusGroups['Активные']?.length || 0})
              </h4>
              <div className="space-y-3">
                {(statusGroups['Активные'] || []).map(member => (
                  <Card key={member.chlen_id} className="cursor-pointer hover:shadow-md transition-shadow bg-white">
                    <CardContent className="p-3">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-green-500 text-white text-xs font-bold">
                            {getInitials(member)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{getFullName(member)}</p>
                          <p className="text-xs text-gray-500 truncate">{member.phone_number || 'N/A'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Неактивные */}
            <div className="bg-red-50 rounded-lg p-4 border-2 border-red-200">
              <h4 className="font-semibold text-red-900 mb-4 flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-500"></span>
                Неактивные ({statusGroups['Неактивные']?.length || 0})
              </h4>
              <div className="space-y-3">
                {(statusGroups['Неактивные'] || []).map(member => (
                  <Card key={member.chlen_id} className="cursor-pointer hover:shadow-md transition-shadow bg-white opacity-75">
                    <CardContent className="p-3">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-red-500 text-white text-xs font-bold">
                            {getInitials(member)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate line-through">{getFullName(member)}</p>
                          <p className="text-xs text-gray-500 truncate">{member.phone_number || 'N/A'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Основной компонент страницы членов
const Members: React.FC = () => {
  const { currentBranch, branches } = useBranch();
  const { user } = useAuth();
  const [viewType, setViewType] = useState<'grid' | 'table' | 'board-branch-status'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [branchFilter, setBranchFilter] = useState<'all' | number>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editMember, setEditMember] = useState<Member | null>(null);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Определяем роль пользователя
  const isSuperAdminOrAdmin = user?.role === 'superadmin' || user?.role === 'admin';
  const isReceptionist = user?.role === 'reception';

  const { data: members, isLoading, isError } = useQuery({
    // Для администраторов используем /api/members (без привязки к филиалу)
    // Для ресепшена используем /api/members/branch (привязана к текущему филиалу)
    queryKey: isSuperAdminOrAdmin 
      ? ['/api/members'] 
      : ['/api/members/branch', currentBranch?.id],
    queryFn: async () => {
      // Ресепшен не может загружать членов без филиала
      if (!currentBranch?.id && isReceptionist) {
        return [];
      }
      
      // Суперадмин и админ получают всех членов организации (независимо от филиала)
      if (isSuperAdminOrAdmin) {
        const url = '/api/members';
        const response = await apiGetJson(url);
        return response.data || [];
      }
      
      // Ресепшен получает только членов своего филиала
      const url = `/api/members/branch/${currentBranch?.id}`;
      const response = await apiGetJson(url);
      return response.data || [];
    },
    // Для админов запрос всегда возможен, для ресепшена только если есть филиал
    enabled: !!(isSuperAdminOrAdmin || currentBranch?.id),
  });

  const handleMemberCreated = () => {
    if (isSuperAdminOrAdmin) {
      // Инвалидируем запрос для всех членов
      queryClient.invalidateQueries({ queryKey: ['/api/members'] });
    } else {
      // Инвалидируем запрос для членов филиала
      queryClient.invalidateQueries({ queryKey: ['/api/members/branch', currentBranch?.id] });
    }
  };

  const deleteMemberMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiDelete(`/api/members/${id}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Успешно',
        description: 'Член успешно удален',
        duration: 3000,
      });
      handleMemberCreated();
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка',
        description: error.message || 'Ошибка при удалении члена',
        duration: 3000,
        variant: 'destructive',
      });
    },
  });

  const handleEditClick = (member: Member) => {
    setEditMember(member);
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (id: number) => {
    if (window.confirm('Вы уверены, что хотите удалить этого члена?')) {
      deleteMemberMutation.mutate(id);
    }
  };

  const handleMemberUpdated = () => {
    setIsEditDialogOpen(false);
    setEditMember(null);
    handleMemberCreated();
  };

  const filteredMembers = useMemo(() => {
    if (!members) return [];

    let result = members;

    // Фильтр по статусу
    if (statusFilter !== 'all') {
      result = result.filter((m: Member) => m.status === statusFilter);
    }

    // Фильтр по филиалу
    if (branchFilter !== 'all') {
      result = result.filter((m: Member) => m.branch_id === branchFilter);
    }

    // Поиск по тексту
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((m: Member) => {
        const fullName = getFullName(m).toLowerCase();
        const hasMatch =
          fullName.includes(query) ||
          (m.phone_number && m.phone_number.includes(query)) ||
          (m.email && m.email.toLowerCase().includes(query)) ||
          (m.patronymic && m.patronymic.toLowerCase().includes(query)) ||
          (m.address && m.address.toLowerCase().includes(query)) ||
          (m.inn && m.inn.includes(query)) ||
          (m.date_of_birth && m.date_of_birth.includes(query));
        return hasMatch;
      });
    }

    return result;
  }, [members, searchQuery, statusFilter, branchFilter]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      );
    }

    if (isError) {
      return (
        <div className="bg-red-50 p-6 rounded-lg text-red-800 my-8 border border-red-200">
          Ошибка при загрузке членов
        </div>
      );
    }

    if (!filteredMembers || filteredMembers.length === 0) {
      return (
        <div className="bg-gray-50 p-8 rounded-lg text-center my-8 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Членов не найдено</h3>
          <p className="text-gray-500">
            Попробуйте изменить параметры поиска
          </p>
        </div>
      );
    }

    switch (viewType) {
      case 'table':
        return (
          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      ФИО
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Телефон
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Дата рождения
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Статус
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((member: Member) => (
                    <MemberTableRow key={member.chlen_id} member={member} />
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        );

      case 'board-branch-status':
        return <MemberBoardByBranchAndStatus members={filteredMembers} branches={branches} />;

      case 'grid':
      default:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMembers.map((member: Member) => (
              <MemberCard 
                key={member.chlen_id} 
                member={member}
                onEditClick={() => handleEditClick(member)}
                onDeleteClick={() => handleDeleteClick(member.chlen_id)}
              />
            ))}
          </div>
        );
    }
  };

  return (
    <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <Card className="rounded-xl shadow-lg mb-8">
        <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-t-xl">
          <CardTitle className="flex items-center gap-3 text-2xl">
            <Users className="h-8 w-8" />
            Члены организации
          </CardTitle>
          <CardDescription className="text-blue-100 mt-2">
            Управление членами команды и просмотр информации
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4">
            {/* Поиск и фильтры */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
              <div className="flex-1 w-full">
                <Input
                  placeholder="Поиск по имени, телефону, email, адресу, ИНН, отчеству..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-lg"
                />
              </div>

              {/* Кнопка фильтров */}
              <Button
                variant={isFilterPanelOpen ? 'default' : 'outline'}
                onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                className="whitespace-nowrap"
              >
                🔍 Фильтры
              </Button>

              {/* Кнопка создания */}
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-green-600 hover:bg-green-700 whitespace-nowrap">
                    <Plus className="mr-2 h-4 w-4" />
                    Новый член
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Создание нового члена организации</DialogTitle>
                    <DialogDescription>
                      Заполните форму для добавления нового члена в организацию
                    </DialogDescription>
                  </DialogHeader>
                  {currentBranch?.id && (
                    <CreateMemberForm
                      onClose={() => setIsCreateDialogOpen(false)}
                      onSuccess={handleMemberCreated}
                    />
                  )}
                </DialogContent>
              </Dialog>

              {/* Выбор типа представления */}
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={viewType === 'grid' ? 'default' : 'outline'}
                  size="icon"
                  onClick={() => setViewType('grid')}
                  title="Вид сетки"
                  className="rounded-lg"
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewType === 'table' ? 'default' : 'outline'}
                  size="icon"
                  onClick={() => setViewType('table')}
                  title="Табличный вид"
                  className="rounded-lg"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewType === 'board-branch-status' ? 'default' : 'outline'}
                  size="icon"
                  onClick={() => setViewType('board-branch-status')}
                  title="Доска по филиалам и статусам"
                  className="rounded-lg"
                >
                  <Trello className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Панель фильтров */}
            {isFilterPanelOpen && (
              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-4 space-y-4">
                <h3 className="font-semibold text-gray-900 text-sm">Фильтры</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Фильтр по статусу */}
                  <div className="space-y-2">
                    <Label htmlFor="status-filter" className="text-sm font-medium">
                      Статус
                    </Label>
                    <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                      <SelectTrigger id="status-filter" className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все статусы</SelectItem>
                        <SelectItem value="active">✓ Активные</SelectItem>
                        <SelectItem value="inactive">✗ Неактивные</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Фильтр по филиалу */}
                  <div className="space-y-2">
                    <Label htmlFor="branch-filter" className="text-sm font-medium">
                      Филиал
                    </Label>
                    <Select 
                      value={branchFilter.toString()} 
                      onValueChange={(value) => setBranchFilter(value === 'all' ? 'all' : parseInt(value))}
                    >
                      <SelectTrigger id="branch-filter" className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все филиалы</SelectItem>
                        {branches.map((branch) => (
                          <SelectItem key={branch.id} value={branch.id.toString()}>
                            {branch.branches}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Кнопка сброса фильтров */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setStatusFilter('all');
                      setBranchFilter('all');
                      setSearchQuery('');
                    }}
                    className="text-gray-600"
                  >
                    ↻ Сбросить фильтры
                  </Button>
                </div>
              </div>
            )}

            <Separator />

            {/* Количество результатов */}
            <div className="text-sm text-gray-600">
              Найдено членов: <span className="font-semibold">{filteredMembers.length}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Контент */}
      {renderContent()}

      {/* Диалог редактирования члена */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Редактирование члена организации</DialogTitle>
            <DialogDescription>
              Обновите информацию о члене организации или просмотрите историю изменений
            </DialogDescription>
          </DialogHeader>
          {editMember && (
            <Tabs defaultValue="edit" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="edit">Редактирование</TabsTrigger>
                <TabsTrigger value="logs">История изменений</TabsTrigger>
              </TabsList>
              <TabsContent value="edit" className="space-y-4">
                <EditMemberForm
                  member={editMember}
                  onClose={() => setIsEditDialogOpen(false)}
                  onSuccess={handleMemberUpdated}
                />
              </TabsContent>
              <TabsContent value="logs" className="space-y-4">
                <div className="mt-4">
                  <h3 className="text-lg font-semibold mb-4">Журнал событий</h3>
                  <MemberLogsView member={editMember} />
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Members;
