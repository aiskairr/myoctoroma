import { useState, useEffect } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import { useBranch } from '@/contexts/BranchContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, Phone, Calendar, Edit, Loader2, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiGetJson, apiRequest } from '@/lib/api';

interface Client {
  id: number;
  telegramId: string;
  firstName: string | null;
  lastName?: string | null;
  customName?: string;
  phoneNumber: string;
  branchId: string;
  tasks_count: number;
  isActive: boolean;
  lastActiveAt: string;
  firstSeenAt: string;
  username?: string | null;
}

interface Task {
  id: number;
  client_id: number;
  status: string;
  service_type: string;
  schedule_date: string;
  schedule_time: string;
  master_name: string;
  service_price: number;
  notes?: string;
}

interface ClientsResponse {
  clients: Client[];
  total: number;
  searchPattern: string;
  branchId: string;
  timestamp: string;
}

interface ClientTasksResponse {
  tasks: Task[];
  total: number;
  clientInfo: {
    id: number;
    firstName: string;
    customName?: string;
  };
}

export default function Clients() {
  const { t } = useLocale();
  const { currentBranch } = useBranch();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [todaysClients, setTodaysClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [todaysLoading, setTodaysLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientTasks, setClientTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Partial<Client>>({});
  const [editLoading, setEditLoading] = useState(false);

  const loadTodaysClients = async () => {
    if (!currentBranch) return;
    
    setTodaysLoading(true);
    try {
      // Загружаем сегодняшних клиентов
      const data: Client[] = await apiGetJson(`/api/clients/today/${currentBranch.id}`);
      setTodaysClients(data || []);
    } catch (error) {
      console.error('Error loading today\'s clients:', error);
      toast({
        title: t('error'),
        description: t('clients.todaysClientsError'),
        variant: 'destructive',
      });
      setTodaysClients([]);
    } finally {
      setTodaysLoading(false);
    }
  };

  const searchClients = async (query: string = searchQuery) => {
    if (!currentBranch || !query.trim()) {
      setClients([]);
      return;
    }
    
    setLoading(true);
    try {
      // Используем новый эндпоинт для поиска клиентов по telegram ID
      const data: ClientsResponse = await apiGetJson(`/api/clients/${encodeURIComponent(query.trim())}?branchId=${currentBranch.id}`);
      
      setClients(data.clients || []);
    } catch (error) {
      console.error('Error searching clients:', error);
      toast({
        title: t('error'),
        description: t('clients.searchError'),
        variant: 'destructive',
      });
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  const loadClientTasks = async (clientId: number) => {
    setTasksLoading(true);
    try {
      // Новый эндпоинт для получения задач клиента
      const data: ClientTasksResponse = await apiGetJson(`/api/clients/${clientId}/tasks`);
      setClientTasks(data.tasks || []);
    } catch (error) {
      console.error('Error loading client tasks:', error);
      setClientTasks([]);
    } finally {
      setTasksLoading(false);
    }
  };

  const updateClient = async (clientId: number, updates: Partial<Client>) => {
    setEditLoading(true);
    try {
      const response = await apiRequest(`/api/clients/${clientId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const updatedClient = await response.json();
        
        // Обновляем клиента в списке поиска
        setClients(prevClients => 
          prevClients.map(client => 
            client.id === clientId ? { ...client, ...updatedClient.client } : client
          )
        );
        
        // Обновляем клиента в списке сегодняшних
        setTodaysClients(prevClients => 
          prevClients.map(client => 
            client.id === clientId ? { ...client, ...updatedClient.client } : client
          )
        );
        
        // Обновляем выбранного клиента
        if (selectedClient?.id === clientId) {
          setSelectedClient(prev => prev ? { ...prev, ...updatedClient.client } : null);
        }

        toast({
          title: t('success'),
          description: t('clients.updateSuccess'),
        });
        
        setIsEditDialogOpen(false);
        setEditingClient({});
      } else {
        throw new Error('Update failed');
      }
    } catch (error) {
      console.error('Error updating client:', error);
      toast({
        title: t('error'),
        description: t('clients.updateError'),
        variant: 'destructive',
      });
    } finally {
      setEditLoading(false);
    }
  };

  const handleSearch = () => {
    searchClients(searchQuery);
  };

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
    loadClientTasks(client.id);
    setIsDetailDialogOpen(true);
  };

  const handleClientCardClick = (client: Client) => {
    setSelectedClient(client);
    setIsDetailDialogOpen(true);
    loadClientTasks(client.id);
  };

  const handleEditClient = (client: Client) => {
    setEditingClient({
      firstName: client.firstName || '',
      lastName: client.lastName || '',
      customName: client.customName || '',
      phoneNumber: client.phoneNumber,
      username: client.username || '',
      isActive: client.isActive,
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (selectedClient) {
      updateClient(selectedClient.id, editingClient);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'KGS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const formatDateTime = (dateString: string, timeString?: string) => {
    const date = new Date(dateString);
    const formattedDate = date.toLocaleDateString('ru-RU');
    return timeString ? `${formattedDate} ${timeString}` : formattedDate;
  };

  const getClientDisplayName = (client: Client) => {
    if (client.customName) return client.customName;
    if (client.firstName && client.lastName) return `${client.firstName} ${client.lastName}`.trim();
    if (client.firstName) return client.firstName;
    return t('clients.noName');
  };

  useEffect(() => {
    if (currentBranch) {
      // Загружаем сегодняшних клиентов при изменении филиала
      loadTodaysClients();
      setClients([]);
      setSelectedClient(null);
    }
  }, [currentBranch]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col space-y-4">
        <h1 className="text-3xl font-bold">{t('sidebar.clients')}</h1>
        
        {/* Инструкция */}
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              {t('clients.searchInstructionNew')}
            </p>
          </CardContent>
        </Card>

        {/* Поиск */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder={t('clients.searchPlaceholderNew')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-10"
            />
          </div>
          <Button onClick={handleSearch} disabled={loading || !searchQuery.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {t('search')}
          </Button>
        </div>
      </div>

      {/* Сегодняшние клиенты */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">{t('clients.todaysClients')}</h2>
        {todaysLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : todaysClients.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {t('clients.noTodaysClients')}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {todaysClients.map((client) => (
              <Card 
                key={client.id} 
                className="cursor-pointer transition-colors hover:bg-accent hover:shadow-md"
                onClick={() => handleClientCardClick(client)}
              >
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold text-lg">{getClientDisplayName(client)}</h3>
                      <Badge variant={client.isActive ? "default" : "secondary"} className="text-xs">
                        {client.isActive ? t('clients.active') : t('clients.inactive')}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      {client.phoneNumber}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Telegram: {client.telegramId}
                    </div>
                    {client.username && (
                      <div className="text-sm text-muted-foreground">
                        @{client.username}
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-2">
                      <Badge variant="outline" className="text-xs">
                        {client.tasks_count} {t('clients.tasks')}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(client.lastActiveAt)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Результаты поиска */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-2xl font-semibold">{t('clients.searchResults')}</h2>
          {loading && clients.length === 0 ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : clients.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                {searchQuery ? t('clients.noResults') : t('clients.enterSearchNew')}
              </CardContent>
            </Card>
          ) : (
            <>
              {clients.map((client) => (
                <Card 
                  key={client.id} 
                  className={`cursor-pointer transition-colors hover:bg-accent ${
                    selectedClient?.id === client.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => handleClientSelect(client)}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <h3 className="font-semibold">{getClientDisplayName(client)}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          {client.phoneNumber}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Telegram ID: {client.telegramId}
                        </div>
                        {client.username && (
                          <div className="text-sm text-muted-foreground">
                            @{client.username}
                          </div>
                        )}
                      </div>
                      <div className="text-right space-y-1">
                        <Badge variant={client.isActive ? "default" : "secondary"}>
                          {client.isActive ? t('clients.active') : t('clients.inactive')}
                        </Badge>
                        <Badge variant="outline">
                          {client.tasks_count} {t('clients.tasks')}
                        </Badge>
                        <div className="text-xs text-muted-foreground">
                          {t('clients.lastActive')}: {formatDate(client.lastActiveAt)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Диалоговое окно с подробной информацией о клиенте */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              {selectedClient ? getClientDisplayName(selectedClient) : t('clients.clientDetails')}
              {selectedClient && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEditClient(selectedClient)}>
                    <Edit className="h-4 w-4 mr-1" />
                    {t('edit')}
                  </Button>
                </div>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedClient && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Информация о клиенте */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{t('clients.clientDetails')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">{t('clients.name')}</label>
                      <p className="text-base">{getClientDisplayName(selectedClient)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">{t('clients.phone')}</label>
                      <p className="text-base">{selectedClient.phoneNumber}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Telegram ID</label>
                      <p className="text-base font-mono text-sm">{selectedClient.telegramId}</p>
                    </div>
                    {selectedClient.username && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">{t('clients.username')}</label>
                        <p className="text-base">@{selectedClient.username}</p>
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">{t('clients.status')}</label>
                      <div className="mt-1">
                        <Badge variant={selectedClient.isActive ? "default" : "secondary"}>
                          {selectedClient.isActive ? t('clients.active') : t('clients.inactive')}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">{t('clients.tasksCount')}</label>
                      <p className="text-base">{selectedClient.tasks_count}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">{t('clients.firstSeen')}</label>
                      <p className="text-base">{formatDate(selectedClient.firstSeenAt)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">{t('clients.lastActive')}</label>
                      <p className="text-base">{formatDate(selectedClient.lastActiveAt)}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* История записей */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      {t('clients.taskHistory')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {tasksLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : clientTasks.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">
                        {t('clients.noTasks')}
                      </p>
                    ) : (
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {clientTasks.map((task) => (
                          <div key={task.id} className="border rounded-lg p-4 bg-card">
                            <div className="flex justify-between items-start mb-3">
                              <h4 className="font-medium text-base">{task.service_type}</h4>
                              <Badge variant={task.status === 'completed' ? 'default' : 'secondary'}>
                                {t(`taskStatus.${task.status}`)}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-1 gap-2 text-sm">
                              <div>
                                <span className="font-medium text-muted-foreground">{t('clients.master')}: </span>
                                <span>{task.master_name}</span>
                              </div>
                              <div>
                                <span className="font-medium text-muted-foreground">{t('clients.date')}: </span>
                                <span>{formatDateTime(task.schedule_date, task.schedule_time)}</span>
                              </div>
                              <div>
                                <span className="font-medium text-muted-foreground">{t('clients.price')}: </span>
                                <span className="font-medium">{formatCurrency(task.service_price)}</span>
                              </div>
                              {task.notes && (
                                <div>
                                  <span className="font-medium text-muted-foreground">{t('clients.notes')}: </span>
                                  <span>{task.notes}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Диалоговое окно редактирования клиента */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('clients.editClient')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="firstName">{t('clients.firstName')}</Label>
              <Input
                id="firstName"
                value={editingClient.firstName || ''}
                onChange={(e) => setEditingClient(prev => ({...prev, firstName: e.target.value}))}
              />
            </div>
            <div>
              <Label htmlFor="lastName">{t('clients.lastName')}</Label>
              <Input
                id="lastName"
                value={editingClient.lastName || ''}
                onChange={(e) => setEditingClient(prev => ({...prev, lastName: e.target.value}))}
              />
            </div>
            <div>
              <Label htmlFor="customName">{t('clients.customName')}</Label>
              <Input
                id="customName"
                value={editingClient.customName || ''}
                onChange={(e) => setEditingClient(prev => ({...prev, customName: e.target.value}))}
              />
            </div>
            <div>
              <Label htmlFor="phoneNumber">{t('clients.phone')}</Label>
              <Input
                id="phoneNumber"
                value={editingClient.phoneNumber || ''}
                onChange={(e) => setEditingClient(prev => ({...prev, phoneNumber: e.target.value}))}
              />
            </div>
            <div>
              <Label htmlFor="username">{t('clients.username')}</Label>
              <Input
                id="username"
                value={editingClient.username || ''}
                onChange={(e) => setEditingClient(prev => ({...prev, username: e.target.value}))}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isActive"
                checked={editingClient.isActive || false}
                onChange={(e) => setEditingClient(prev => ({...prev, isActive: e.target.checked}))}
              />
              <Label htmlFor="isActive">{t('clients.isActive')}</Label>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                <X className="h-4 w-4 mr-1" />
                {t('cancel')}
              </Button>
              <Button onClick={handleSaveEdit} disabled={editLoading}>
                {editLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                {t('save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}