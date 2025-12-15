import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useBranch } from '@/contexts/BranchContext';
import { useLocale } from '@/contexts/LocaleContext';
import { 
  Loader2, 
  Phone, 
  QrCode, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Copy, 
  ExternalLink,
  Smartphone,
  Wifi,
  WifiOff,
  AlertTriangle
} from 'lucide-react';

const WHATSAPP_API_URL = 'https://ilovesanzhar.click';

interface WhatsAppAccount {
  id: string;
  name: string;
  status: string;
  clientStatus?: string;
  useLimits: boolean;
  qrCode: string | null;
  phoneNumber: string | null;
  createdAt: string;
}

type ConnectionStatus = 
  | 'DISCONNECTED' 
  | 'CONNECTING' 
  | 'QR_READY' 
  | 'AUTHENTICATING' 
  | 'CONNECTED' 
  | 'FAILED';

const statusConfig: Record<ConnectionStatus, { label: string; color: string; icon: React.ReactNode }> = {
  DISCONNECTED: { label: 'Отключен', color: 'bg-gray-500', icon: <WifiOff className="h-4 w-4" /> },
  CONNECTING: { label: 'Подключается...', color: 'bg-yellow-500', icon: <Loader2 className="h-4 w-4 animate-spin" /> },
  QR_READY: { label: 'QR код готов', color: 'bg-blue-500', icon: <QrCode className="h-4 w-4" /> },
  AUTHENTICATING: { label: 'Авторизация...', color: 'bg-orange-500', icon: <Loader2 className="h-4 w-4 animate-spin" /> },
  CONNECTED: { label: 'Подключен', color: 'bg-green-500', icon: <Wifi className="h-4 w-4" /> },
  FAILED: { label: 'Ошибка', color: 'bg-red-500', icon: <XCircle className="h-4 w-4" /> },
};

export function WhatsAppConnect() {
  useLocale(); // For potential future translations
  const { toast } = useToast();
  const { currentBranch, refetchBranches, orgData } = useBranch();
  
  const [accountName, setAccountName] = useState('');
  const [useLimits, setUseLimits] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [account, setAccount] = useState<WhatsAppAccount | null>(null);
  const [qrLink, setQrLink] = useState('');

  const getStoredAccountId = () => {
    if (!currentBranch?.id) return null;
    return localStorage.getItem(`wa_account_${currentBranch.id}`);
  };

  // Загрузка аккаунта если он уже создан
  const loadAccount = useCallback(async (accountId: string, silent = false) => {
    if (!silent) setChecking(true);
    try {
      const response = await fetch(`${WHATSAPP_API_URL}/api/accounts/${accountId}`);
      if (response.ok) {
        const data = await response.json();
        setAccount(data);
        setQrLink(`${WHATSAPP_API_URL}/qr/${data.id}`);
        if (currentBranch?.id) {
          localStorage.setItem(`wa_account_${currentBranch.id}`, data.id);
        }
        return data;
      }
    } catch (error) {
      console.error('Error loading account:', error);
    } finally {
      if (!silent) setChecking(false);
    }
    return null;
  }, []);

  // Проверка статуса аккаунта при монтировании
  useEffect(() => {
    const existingId = currentBranch?.accountID || getStoredAccountId();
    if (existingId) {
      loadAccount(existingId);
    }
  }, [currentBranch?.id, currentBranch?.accountID, loadAccount]);

  // Автоматическое обновление статуса каждые 3 секунды пока не подключен
  useEffect(() => {
    if (!account || account.clientStatus === 'CONNECTED') return;

    const interval = setInterval(async () => {
      const updatedAccount = await loadAccount(account.id, true);
      if (updatedAccount?.clientStatus === 'CONNECTED') {
        clearInterval(interval);
        toast({
          title: '✅ WhatsApp подключен!',
          description: `Номер: ${updatedAccount.phoneNumber}`,
        });
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [account, loadAccount, toast]);

  // Создание нового аккаунта
  const createAccount = async () => {
    if (!accountName.trim()) {
      toast({
        title: 'Ошибка',
        description: 'Введите название аккаунта',
        variant: 'destructive',
      });
      return;
    }

    if (!currentBranch?.id) {
      toast({
        title: 'Ошибка',
        description: 'Не выбран филиал',
        variant: 'destructive',
      });
      return;
    }

    const organizationId = (orgData as any)?.id || orgData;
    if (!organizationId) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось определить организацию',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        `${import.meta.env.VITE_SECONDARY_BACKEND_URL}/bot/register-account`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          credentials: 'include',
          body: JSON.stringify({
            accountName: accountName.trim(),
            limitsEnabled: useLimits,
            branchId: currentBranch.id,
            organizationId,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Не удалось создать аккаунт');
      }

      const data = await response.json();
      const created = (data as any)?.data || {
        accountName: accountName.trim(),
        branchId: currentBranch.id,
        organizationId,
      };

      // Отображаем созданный аккаунт и ссылку на QR из ответа
      const waAccount = (created as any).whatsappAccount || {};
      setAccount({
        id: waAccount.id || created.accountId || accountName.trim(),
        name: waAccount.name || created.accountName || accountName.trim(),
        status: waAccount.status || 'PENDING',
        clientStatus: waAccount.status || 'DISCONNECTED',
        useLimits: waAccount.useLimits ?? useLimits,
        qrCode: waAccount.qrCode || null,
        phoneNumber: null,
        createdAt: new Date().toISOString(),
      });
      setQrLink((created as any).qrCodeUrl || waAccount.qrCodeUrl || '');
      if (currentBranch?.id) {
        const savedId = waAccount.id || created.accountId || accountName.trim();
        if (savedId) {
          localStorage.setItem(`wa_account_${currentBranch.id}`, savedId);
        }
      }

      // Сохраняем accountID в филиал
      if (currentBranch?.id) {
        await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/branches/${currentBranch.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${document.cookie.split('token=')[1]?.split(';')[0] || ''}`,
          },
          credentials: 'include',
          body: JSON.stringify({ accountID: data.id }),
        });
        refetchBranches();
      }

      toast({
        title: 'Аккаунт создан',
        description: 'Отправьте QR-ссылку клиенту для сканирования',
      });
    } catch (error) {
      console.error('Error creating account:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось создать аккаунт WhatsApp',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Переподключение аккаунта
  const reconnectAccount = async () => {
    if (!account) return;

    setLoading(true);
    try {
      const response = await fetch(`${WHATSAPP_API_URL}/api/accounts/${account.id}/connect`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Не удалось переподключить аккаунт');
      }

      // Перезагружаем данные аккаунта
      await loadAccount(account.id);
      
      toast({
        title: 'Переподключение',
        description: 'Отсканируйте новый QR код',
      });
    } catch (error) {
      console.error('Error reconnecting:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось переподключить аккаунт',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Отключение аккаунта
  const disconnectAccount = async () => {
    if (!account) return;

    setLoading(true);
    try {
      const response = await fetch(`${WHATSAPP_API_URL}/api/accounts/${account.id}/disconnect`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Не удалось отключить аккаунт');
      }

      await loadAccount(account.id);
      
      toast({
        title: 'Отключено',
        description: 'WhatsApp аккаунт отключен',
      });
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось отключить аккаунт',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Копирование ссылки
  const copyQrLink = () => {
    navigator.clipboard.writeText(qrLink);
    toast({
      title: 'Скопировано',
      description: 'QR-ссылка скопирована в буфер обмена',
    });
  };

  const status = (account?.clientStatus as ConnectionStatus) || 'DISCONNECTED';
  const statusInfo = statusConfig[status] || statusConfig.DISCONNECTED;

  return (
    <Card className="bg-gradient-to-br from-green-50 to-white border-green-200 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3 border-b border-green-100">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-slate-800 flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-green-600" />
              📱 Подключение WhatsApp
            </CardTitle>
            <CardDescription className="text-slate-600">
              Подключите WhatsApp номер для работы с чатами и AI ботом
            </CardDescription>
          </div>
          {account && (
            <Badge className={`${statusInfo.color} text-white flex items-center gap-1`}>
              {statusInfo.icon}
              {statusInfo.label}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {checking ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          </div>
        ) : !account ? (
          /* Форма создания аккаунта */
          <div className="space-y-4">
            <Alert className="bg-blue-50 border-blue-200">
              <AlertTriangle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-700">
                Для работы AI мессенджера необходимо подключить WhatsApp номер. 
                После создания аккаунта вы получите QR-ссылку для сканирования.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="account-name" className="text-slate-700 font-medium">
                Название аккаунта
              </Label>
              <Input
                id="account-name"
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="Например: WhatsApp салона"
                className="border-green-300 focus:border-green-500 focus:ring-green-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="use-limits"
                checked={useLimits}
                onChange={(e) => setUseLimits(e.target.checked)}
                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <Label htmlFor="use-limits" className="text-sm text-slate-600 cursor-pointer">
                Включить лимиты (рекомендуется для новых аккаунтов)
              </Label>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-700">
                💡 <strong>Совет:</strong> Для новых WhatsApp аккаунтов рекомендуется включить лимиты 
                на первые 7 дней для предотвращения блокировки.
              </p>
            </div>

            <Button
              onClick={createAccount}
              disabled={loading || !accountName.trim()}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Создание...
                </>
              ) : (
                <>
                  <Phone className="mr-2 h-4 w-4" />
                  Создать WhatsApp аккаунт
                </>
              )}
            </Button>
          </div>
        ) : (
          /* Информация о подключенном аккаунте */
          <div className="space-y-4">
            {/* Информация об аккаунте */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Название:</span>
                <span className="font-medium text-slate-800">{account.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">ID:</span>
                <code className="text-xs bg-slate-200 px-2 py-1 rounded">{account.id}</code>
              </div>
              {account.phoneNumber && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Номер телефона:</span>
                  <span className="font-medium text-green-600 flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    +{account.phoneNumber}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Лимиты:</span>
                <Badge variant={account.useLimits ? 'default' : 'secondary'}>
                  {account.useLimits ? 'Включены' : 'Выключены'}
                </Badge>
              </div>
            </div>

            {/* QR ссылка для неподключенных аккаунтов */}
            {status !== 'CONNECTED' && (
              <div className="space-y-3">
                <Alert className="bg-blue-50 border-blue-200">
                  <QrCode className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-700">
                    Отправьте эту ссылку на устройство с WhatsApp для сканирования QR кода
                  </AlertDescription>
                </Alert>

                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={qrLink}
                    className="flex-1 bg-slate-50 text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyQrLink}
                    title="Копировать ссылку"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => window.open(qrLink, '_blank')}
                    title="Открыть в новой вкладке"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>

                <div className="text-center">
                  <Button
                    variant="link"
                    onClick={() => window.open(qrLink, '_blank')}
                    className="text-green-600 hover:text-green-700"
                  >
                    <QrCode className="mr-2 h-4 w-4" />
                    Открыть страницу с QR кодом
                  </Button>
                </div>
              </div>
            )}

            {/* Успешное подключение */}
            {status === 'CONNECTED' && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700">
                  WhatsApp успешно подключен! Вы можете использовать AI мессенджер для общения с клиентами.
                </AlertDescription>
              </Alert>
            )}

            {/* Кнопки управления */}
            <div className="flex gap-2 pt-2">
              {status === 'CONNECTED' ? (
                <Button
                  variant="outline"
                  onClick={disconnectAccount}
                  disabled={loading}
                  className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <WifiOff className="mr-2 h-4 w-4" />
                  )}
                  Отключить
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={reconnectAccount}
                    disabled={loading}
                    className="flex-1 border-green-300 text-green-600 hover:bg-green-50"
                  >
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Переподключить
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => loadAccount(account.id)}
                    disabled={checking}
                    className="border-slate-300"
                  >
                    {checking ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default WhatsAppConnect;
