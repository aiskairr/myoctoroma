import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, getQueryFn } from "@/lib/queryClient";
import { useBranch } from '@/contexts/BranchContext';
import { useLocale } from '@/contexts/LocaleContext';
import { useAuth } from '@/contexts/SimpleAuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { BookingLinkCopy } from "@/components/BookingLinkCopy";

export default function Settings() {
  const { t } = useLocale();
  const { toast } = useToast();
  const { currentBranch } = useBranch();
  const { user } = useAuth();
  const [settings, setSettings] = useState<Record<string, string>>({
    systemPrompt: "",
  });
  
  // User profile state
  const [userProfile, setUserProfile] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });
  
  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importJobId, setImportJobId] = useState<string | null>(null);

  // WhatsApp configuration state
  const [whatsappConfig, setWhatsappConfig] = useState({
    apiUrl: "",
    mediaUrl: "",
    branchId: "",
    apiToken: "",
  });
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  // Fetch settings - новый API endpoint
  const { data, isLoading, error } = useQuery({
    queryKey: [`${import.meta.env.VITE_BACKEND_URL}/api/settings/${currentBranch?.id}`],
    queryFn: getQueryFn({ on401: "throw" }),
    retry: false,
    enabled: !!currentBranch?.id, // Запрос выполняется только если есть branchId
  });

  // Fetch import job status
  const { data: importStatus } = useQuery({
    queryKey: [`${import.meta.env.VITE_BACKEND_URL}/api/import/status/${importJobId}`],
    queryFn: getQueryFn({ on401: "throw" }),
    retry: false,
    enabled: !!importJobId, // Запрос выполняется только если есть jobId
    refetchInterval: importJobId ? 2000 : false, // Обновляем каждые 2 секунды если есть активная задача
  });

  // Fetch WhatsApp configuration
  const { data: whatsappData, isLoading: isLoadingWhatsapp } = useQuery({
    queryKey: [`${import.meta.env.VITE_BACKEND_URL}/api/organisation/${currentBranch?.id}/whatsapp/config`],
    queryFn: getQueryFn({ on401: "throw" }),
    retry: false,
    enabled: !!currentBranch?.id,
  });

  // Mutation for updating settings
  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      if (!currentBranch?.id) {
        throw new Error('Branch ID is required');
      }
      
      // Сначала пробуем PUT для обновления существующего промпта
      let response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/settings/${currentBranch.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${document.cookie.split('token=')[1]?.split(';')[0] || ''}`,
        },
        body: JSON.stringify({ key, value }),
      });
      
      // Если получили 404, значит промпт не существует, создаем новый
      if (response.status === 404) {
        response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/settings/${currentBranch.id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${document.cookie.split('token=')[1]?.split(';')[0] || ''}`,
          },
          body: JSON.stringify({ key, value }),
        });
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`${import.meta.env.VITE_BACKEND_URL}/api/settings/${currentBranch?.id}`] });
      toast({
        title: t('settings.settings_saved'),
        description: t('settings.system_prompt_updated'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('error'),
        description: error.message || t('settings.save_failed'),
        variant: "destructive",
      });
    },
  });

  // Mutation for Excel import
  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/import/excel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${document.cookie.split('token=')[1]?.split(';')[0] || ''}`,
        },
        body: formData,
      });
      
      if (!response.ok) {
        if (response.status === 504) {
          // 504 Gateway Timeout означает, что импорт начался
          return { status: 'timeout', message: 'Import started' };
        }
        throw new Error(t('settings.file_upload_error'));
      }
      
      return response.json();
    },
    onSuccess: async (data) => {
      // Проверяем, если это timeout (504 ошибка)
      if (data && data.status === 'timeout') {
        toast({
          title: t('settings.import_started'),
          description: t('settings.import_started_description'),
          variant: "default",
        });
        setSelectedFile(null);
        // Reset file input
        const fileInput = document.getElementById('excel-file') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        return;
      }
      
      // Сохраняем jobId для отслеживания статуса
      if (data && data.jobId) {
        setImportJobId(data.jobId);
        console.log('📁 Файл загружен, jobId:', data.jobId);
        
        // Автоматически запускаем фоновую обработку
        try {
          console.log('🚀 Автоматический запуск фоновой обработки для jobId:', data.jobId);
          const processResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/public/import/process/${data.jobId}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (!processResponse.ok) {
            const errorText = await processResponse.text();
            throw new Error(`HTTP ${processResponse.status}: ${errorText}`);
          }
          
          const processData = await processResponse.json();
          console.log('✅ Фоновая обработка успешно запущена:', processData);
        } catch (error) {
          console.error('❌ Ошибка автоматического запуска фоновой обработки:', error);
          toast({
            title: t('settings.warning'),
            description: t('settings.manual_process_warning'),
            variant: "destructive",
          });
        }
      }
      
      toast({
        title: t('settings.import_launched'),
        description: t('settings.import_background'),
      });
      setSelectedFile(null);
      // Reset file input
      const fileInput = document.getElementById('excel-file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    },
    onError: (error: Error) => {
      toast({
        title: t('settings.import_error'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // WhatsApp configuration mutations
  const saveWhatsappConfigMutation = useMutation({
    mutationFn: async (config: typeof whatsappConfig) => {
      if (!currentBranch?.id) {
        throw new Error('Branch ID is required');
      }

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/organisation/${currentBranch.id}/whatsapp/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save WhatsApp configuration');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t('settings.config_saved'),
        description: t('settings.whatsapp_config_saved'),
      });
      queryClient.invalidateQueries({
        queryKey: [`${import.meta.env.VITE_BACKEND_URL}/api/organisation/${currentBranch?.id}/whatsapp/config`],
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('error'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const testWhatsappConnectionMutation = useMutation({
    mutationFn: async () => {
      if (!currentBranch?.id) {
        throw new Error('Branch ID is required');
      }

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/organisation/${currentBranch.id}/whatsapp/test-connection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Connection test failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: t('settings.connection_successful'),
        description: t('settings.connection_status', { status: data.details?.instanceStatus || 'connected' }),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('settings.connection_error'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for updating user profile
  const updateProfileMutation = useMutation({
    mutationFn: async (data: { email?: string; password?: string }) => {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/user`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${document.cookie.split('token=')[1]?.split(';')[0] || ''}`,
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        if (response.status === 409) {
          throw new Error(t('settings.email_already_exists'));
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t('settings.profile_updated'),
        description: t('settings.profile_updated_description'),
      });
      // Reset profile form
      setUserProfile({
        email: "",
        password: "",
        confirmPassword: "",
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('settings.profile_update_error'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (data && typeof data === 'object') {
      // Новая структура API - возвращает объект с полями id, key, value, branchId
      const apiData = data as any;
      if (apiData.key && apiData.value) {
        setSettings((prev) => ({ 
          ...prev, 
          [apiData.key]: apiData.value 
        }));
      }
    } else if (error) {
      // Если была ошибка "SystemPrompt not found", устанавливаем пустое значение
      const errorMessage = error instanceof Error ? error.message : '';
      const isSystemPromptNotFound = errorMessage.includes('SystemPrompt not found for branch');
      
      if (isSystemPromptNotFound) {
        setSettings((prev) => ({ 
          ...prev, 
          systemPrompt: '' 
        }));
      }
    }
  }, [data, error]);

  // Отслеживаем статус импорта и очищаем jobId когда импорт завершен
  useEffect(() => {
    if (importStatus && typeof importStatus === 'object') {
      const status = (importStatus as any);
      if (status.job && (status.job.status === 'COMPLETED' || status.job.status === 'FAILED')) {
        // Импорт завершен, показываем финальное уведомление
        if (status.job.status === 'COMPLETED') {
          toast({
            title: t('settings.import_completed'),
            description: t('settings.import_stats', { 
              clients: String(status.job.clientsImported || 0), 
              tasks: String(status.job.tasksImported || 0) 
            }),
          });
        } else {
          toast({
            title: t('settings.import_failed'),
            description: status.job.errorMessage || t('settings.import_failed_message'),
            variant: "destructive",
          });
        }
        
        // Очищаем jobId через небольшую задержку, чтобы пользователь увидел финальный статус
        setTimeout(() => {
          setImportJobId(null);
        }, 3000);
      }
    }
  }, [importStatus, toast]);

  // Initialize WhatsApp configuration when data loads
  useEffect(() => {
    if (whatsappData && typeof whatsappData === 'object') {
      const configData = (whatsappData as any).config;
      if (configData) {
        setWhatsappConfig({
          apiUrl: configData.apiUrl || "",
          mediaUrl: configData.mediaUrl || "",
          branchId: configData.branchId || "",
          apiToken: configData.apiToken || "",
        });
      }
    }
  }, [whatsappData]);  const handleInputChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };
  
  const handleSave = async (key: string) => {
    try {
      await updateSettingMutation.mutateAsync({ key, value: settings[key] });
    } catch (error) {
      console.error(`Error saving ${key}:`, error);
    }
  };

  // WhatsApp handlers
  const handleWhatsappInputChange = (key: keyof typeof whatsappConfig, value: string) => {
    setWhatsappConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveWhatsappConfig = async () => {
    try {
      await saveWhatsappConfigMutation.mutateAsync(whatsappConfig);
    } catch (error) {
      console.error('Error saving WhatsApp config:', error);
    }
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    try {
      await testWhatsappConnectionMutation.mutateAsync();
    } finally {
      setIsTestingConnection(false);
    }
  };

  // User profile handlers
  const handleProfileInputChange = (key: keyof typeof userProfile, value: string) => {
    setUserProfile((prev) => ({ ...prev, [key]: value }));
  };

  const handleUpdateProfile = async () => {
    // Validation
    if (!userProfile.email && !userProfile.password) {
      toast({
        title: t('error'),
        description: t('settings.at_least_one_field'),
        variant: "destructive",
      });
      return;
    }

    if (userProfile.password && userProfile.password !== userProfile.confirmPassword) {
      toast({
        title: t('error'),
        description: t('settings.passwords_not_match'),
        variant: "destructive",
      });
      return;
    }

    // Prepare data
    const updateData: { email?: string; password?: string } = {};
    if (userProfile.email) updateData.email = userProfile.email;
    if (userProfile.password) updateData.password = userProfile.password;

    try {
      await updateProfileMutation.mutateAsync(updateData);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };
  
  // File handling functions
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };
  
  const handleImport = () => {
    if (selectedFile) {
      importMutation.mutate(selectedFile);
    }
  };

  const handleManualProcess = async (jobId: string) => {
    try {
      console.log('🚀 Ручной запуск обработки для jobId:', jobId);
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/public/import/process/${jobId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Ошибка при запуске обработки');
      }
      
      toast({
        title: t('settings.processing_started'),
        description: t('settings.background_processing_started'),
      });
    } catch (error) {
      console.error('❌ Ошибка запуска обработки:', error);
      toast({
        title: t('error'),
        description: t('settings.processing_start_failed'),
        variant: "destructive",
      });
    }
  };
  
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return `0 ${t('settings.file_size_bytes')}`;
    const k = 1024;
    const sizes = [t('settings.file_size_bytes'), t('settings.file_size_kb'), t('settings.file_size_mb'), t('settings.file_size_gb')];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  
  const resetSystemPrompt = () => {
    // Используем актуальный промпт из файла very_last_prompt.txt
    const defaultPrompt = `Ты — Айсулуу, виртуальный администратор TAMGA service&SPA в Бишкеке.
Ты общаешься с клиентами вежливо, доброжелательно и кратко.
В начале общения ты всегда используешь русский язык, но если клиент пишет на другом языке (KG, EN, ESP, FR и т.д.) — ты переходишь на него.
#### 🎯 Задача:
Консультировать клиента и автоматически собирать все данные, необходимые для записи, а затем передавать их в систему через API.

Твоя цель — мягко и уверенно довести клиента до подтверждения записи.
Если клиент отказывается — объясни ценность массажа, сохраняя уважительный тон.
Если клиент пишет на английском или кыргызском — продолжай диалог на этом языке. Отвечай на вопросы клиента по контексту даже если они не относятся к промпту.
Не задавай несколько вопросов подряд — только по одному.
Не предлагай другой массаж, если клиент уже определился.
Не повторяй вопросы, если клиент уже ответил.
ТЫ НЕ МОЖЕШЬ ВОЗВРАЩАТЬ ДЕНЬГИ, ДАРИТЬ КАКИЕ-ТО ПОДАРКИ.

#### Сценарий общения: 
#### 1. Приветствие:
> «Здравствуйте! Добро пожаловать в TAMGA service&SPA. Какой вид массажа вас интересует?»
#### 2. Выбор массажа:
- НЕ предлагай альтернатив, если клиент уже определился.
- НЕ придумывай услуги, которых нет в прайсе.
#### 3. Уточнение длительности:
- Если клиент не указал длительность — спроси:
> «На сколько минут вы бы хотели массаж? Для данного массажа у нас есть такие варианты: /возьми возможные длительности из прайс листа»
#### 4. Уточнение филиала:
> «В какой из наших филиалов вам удобнее прийти? У нас есть:
- Тыныстанова, 189/1
- Раззакова, 15
- ул. Токтогула 93»
#### 5. Уточнение мастера:
- Если клиент указал пол (мужской/женский) — фильтруй мастеров по полу.
- Называй имена мастеров из доступных /вызови из динамического промпта.
> «В этом филиале доступны мастера: /назови имена мастеров из динамического промпта в соответствии с филиалом. Какой день вам будет удобен для записи?»
#### 6. Загрузка временных слотов (динамический промпт):
- Когда клиент указал:
        - филиал
        - мастера (или пол)
        - дату
        - длительность
                → обратись к backend API и получи только доступные слоты на эту дату с учётом длительности и занятости мастеров.
- Сформулируй ответ:
> «Вот свободное время на [дата]: 11:00, 13:30, 15:00. Что вам подойдёт?»
#### 7. Сбор данных клиента:
- После выбора времени:
        - «Как вас зовут?»
        - «Пожалуйста, укажите номер телефона.»
#### 8. Завершение:
> «Спасибо, [имя]! Я записала вас на [время], [дату] в нашем филиале по адресу [адрес филиала] к мастеру [имя выбранного мастера]. С собой ничего не нужно брать, кроме хорошего настроения) Перед процедурой просим принять душ.»
#### ⚠️ Ограничения и правила:
- Ты не можешь:
        - Отвечать на вопросы, не связанные с TAMGA или массажем (политика, религия, медицина и т.д.)
        - Обсуждать возвраты или финансы
- Если клиент спрашивает про интимные или неприемлемые услуги:
> «Мы предоставляем только традиционные массажные услуги. Такие услуги мы не оказываем.»
- Если клиент спрашивает про сертификаты, возвраты, обмен:
> «Эти вопросы решает только менеджер. Срок действия сертификата указан на нём (от двух недель до месяца). Обмен возможен с доплатой — уточнит менеджер.»

Наши массажи длительность и стоимость:
Классический массаж
60 мин - 2 200 сом / 90 мин - 2 700 сом
Расслабляющий массаж всего тела с кокосовым маслом. Снимает напряжение, улучшает кровообращение.
Лечебно-оздоровительный массаж
60 мин - 2 800 сом / 90 мин - 3 200 сом
Глубокая проработка мышц и триггерных точек + банки в подарок.
Триггерный массаж
30 мин - 1 800 сом / 60 мин - 3 400 сом / 90 мин - 5 200 сом
Интенсивное воздействие на болевые точки + банки в подарок.
Арома релакс
60 мин - 2 500 сом / 90 мин - 2 800 сом
Легкий расслабляющий массаж с аромамаслами.
Спортивный массаж
60 мин - 3 000 сом / 90 мин - 3 500 сом
Интенсивная проработка мышц + кедровая бочка в подарок.
Микс массаж
110 мин - 4 200 сом
Комбо: классика + точечный + камни + горячие камни в подарок.
Тайский массаж
80 мин - 3 500 сом
Растяжка + точечное воздействие в одежде на мате.
Перезагрузка (4 стихии)
150 мин - 7 000 сом / 220 мин - 10 000 сом
Комплекс: лечебный + прогрев + триггерный + кедровая бочка.
Стоун-терапия 90 мин - 3 400 сом
Медовый 90 мин - 3 200 сом
Огненный 90 мин - 3 500 сом
Королевский (4 руки) 90 мин - 5 200 сом
Для беременных 50 мин - 2 000 сом
Детский 30 мин - 800 сом / 50 мин - 1 400 сом
Массаж шейно-воротниковой зоны (швз) и головы 30 мин - 900 сом
Массаж шейно-воротниковой зоны (швз) и спины 40 мин - 1200 сом
Массаж рук 30 мин - 900 сом
Массаж ног и стоп 50 мин - 1900 сом
Массаж лица 80 мин - 2400 сом
Все массажи выполняются с гипоаллергенными маслами.

#### 📤 Структурированный блок данных для системы
Когда ты понимаешь, что клиент сообщил какую-либо информацию (например, дату или имя мастера), сформируй в отдельном блоке под основным сообщением JSON с информацией о бронировании:
\`\`\`json
{
  "service_type": "Классический массаж",
  "service_duration": 60,
  "schedule_date": "2025-05-15", 
  "schedule_time": "14:00",
  "branch_id": "wa1",
  "master_gender": "женский",
  "client_name": "Анна",
  "phone": "0500123456"
}
\`\`\`

После каждого шага общения ты должен формировать отдельный JSON-блок, содержащий все ключевые поля, включая те, которые пока не заполнены. Все неизвестные значения оставляй пустыми ("" или null), и заполняй только те поля, которые удалось извлечь из последнего сообщения клиента.
Никогда не пропускай поля. Всегда возвращай все 8 полей, даже если заполнено только 1 из них, при этом не стирая ранее заполненные.
`;
    setSettings((prev) => ({ ...prev, systemPrompt: defaultPrompt }));
  };
  
  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentBranch?.id) {
    return (
      <div className="p-6">
        <div className="text-muted-foreground">
          <h2 className="text-lg font-semibold mb-2">Филиал не выбран</h2>
          <p className="text-sm">Пожалуйста, выберите филиал для работы с настройками</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    // Проверяем, является ли это ошибкой "SystemPrompt not found"
    const errorMessage = error instanceof Error ? error.message : '';
    const isSystemPromptNotFound = errorMessage.includes('SystemPrompt not found for branch');
    
    // Если systemPrompt не найден - это нормально, показываем страницу с пустым полем
    if (!isSystemPromptNotFound) {
      return (
        <div className="p-6">
          <div className="text-destructive">
            <h2 className="text-lg font-semibold mb-2">{t('settings.loading_error_title')}</h2>
            <p className="text-sm">{errorMessage || t('settings.loading_error_occurred')}</p>
            <p className="text-xs text-muted-foreground mt-2">
              URL: {import.meta.env.VITE_BACKEND_URL}/api/settings/{currentBranch?.id || '[branchId]'}
            </p>
          </div>
        </div>
      );
    }
    // Если systemPrompt не найден, продолжаем отображение страницы с пустым полем
  }
  
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-medium mb-1">Настройки</h1>
        <p className="text-muted-foreground">Импорт данных и настройка промптов</p>
      </div>

      {/* User Profile Settings */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle>{t('settings.profile_title')}</CardTitle>
          <CardDescription>
            {t('settings.profile_description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleUpdateProfile(); }}>
            {/* Current Email Display */}
            {user?.email && (
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  {t('settings.current_email')} <span className="font-medium text-foreground">{user.email}</span>
                </p>
              </div>
            )}

            {/* New Email */}
            <div className="space-y-2">
              <Label htmlFor="new-email">{t('settings.new_email_label')}</Label>
              <Input
                id="new-email"
                type="email"
                value={userProfile.email}
                onChange={(e) => handleProfileInputChange("email", e.target.value)}
                placeholder={t('settings.new_email_placeholder')}
              />
            </div>
            
            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="new-password">{t('settings.new_password_label')}</Label>
              <Input
                id="new-password"
                type="password"
                value={userProfile.password}
                onChange={(e) => handleProfileInputChange("password", e.target.value)}
                placeholder={t('settings.new_password_placeholder')}
              />
            </div>

            {/* Confirm Password */}
            {userProfile.password && (
              <div className="space-y-2">
                <Label htmlFor="confirm-password">{t('settings.confirm_password_label')}</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={userProfile.confirmPassword}
                  onChange={(e) => handleProfileInputChange("confirmPassword", e.target.value)}
                  placeholder={t('settings.confirm_password_placeholder')}
                />
              </div>
            )}
            
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('settings.updating_button')}
                  </>
                ) : (
                  t('settings.update_profile_button')
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      
      {/* Booking Link Copy */}
      <div className="mb-6">
        <BookingLinkCopy />
      </div>
      
      {/* System Prompt Settings */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle>{t('settings.system_prompt_title')}</CardTitle>
          {error && error instanceof Error && error.message.includes('SystemPrompt not found for branch') && (
            <p className="text-sm text-muted-foreground mt-2">
              {t('settings.system_prompt_not_found')}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="system-prompt">{t('settings.system_prompt_label')}</Label>
              <Textarea
                id="system-prompt"
                rows={8}
                value={settings.systemPrompt}
                onChange={(e) => handleInputChange("systemPrompt", e.target.value)}
                placeholder={
                  error && error instanceof Error && error.message.includes('SystemPrompt not found for branch')
                    ? t('settings.system_prompt_placeholder_not_found')
                    : t('settings.system_prompt_placeholder')
                }
              />
              <p className="text-xs text-muted-foreground">{t('settings.system_prompt_description')}</p>
            </div>
            
            <div className="flex justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={resetSystemPrompt}
                className="mr-2"
              >
                {t('settings.reset_to_default')}
              </Button>
              <Button
                type="button"
                onClick={() => handleSave("systemPrompt")}
                disabled={updateSettingMutation.isPending}
              >
                {updateSettingMutation.isPending ? t('settings.saving') : t('settings.save_prompt')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* WhatsApp Configuration Section */}
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.whatsapp_api')}</CardTitle>
          <CardDescription>
            Конфигурация подключения к WhatsApp API
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingWhatsapp ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Загрузка конфигурации...</span>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="whatsapp-api-url">API URL</Label>
                  <Input
                    id="whatsapp-api-url"
                    type="url"
                    placeholder="https://xxxx.api.greenapi.com"
                    value={whatsappConfig.apiUrl}
                    onChange={(e) => handleWhatsappInputChange('apiUrl', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="whatsapp-media-url">Media URL</Label>
                  <Input
                    id="whatsapp-media-url"
                    type="url"
                    placeholder="https://xxxx.media.greenapi.com"
                    value={whatsappConfig.mediaUrl}
                    onChange={(e) => handleWhatsappInputChange('mediaUrl', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="whatsapp-branch-id">Branch ID</Label>
                  <Input
                    id="whatsapp-branch-id"
                    type="text"
                    placeholder="7105292833"
                    value={whatsappConfig.branchId}
                    onChange={(e) => handleWhatsappInputChange('branchId', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="whatsapp-api-token">API Token</Label>
                  <Input
                    id="whatsapp-api-token"
                    type="password"
                    placeholder={t('settings.api_token_placeholder')}
                    value={whatsappConfig.apiToken}
                    onChange={(e) => handleWhatsappInputChange('apiToken', e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleSaveWhatsappConfig}
                  disabled={saveWhatsappConfigMutation.isPending}
                  className="flex-1"
                >
                  {saveWhatsappConfigMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      {t('settings.saving_button')}
                    </>
                  ) : (
                    t('settings.save_config_button')
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={isTestingConnection || testWhatsappConnectionMutation.isPending}
                >
                  {(isTestingConnection || testWhatsappConnectionMutation.isPending) ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      {t('settings.testing_button')}
                    </>
                  ) : (
                    t('settings.test_connection_button')
                  )}
                </Button>
              </div>

              <div className="bg-muted p-4 rounded-md">
                <h3 className="text-sm font-medium mb-2">Информация о настройке</h3>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• API URL и Media URL получаются от провайдера WhatsApp API</li>
                  <li>• Branch ID - идентификатор вашего инстанса</li>
                  <li>• API Token - секретный ключ для авторизации</li>
                  <li>• Все данные шифруются перед сохранением в базе данных</li>
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Excel Import Section */}
      <Card>
        <CardHeader>
          <CardTitle>Импорт данных</CardTitle>
          <CardDescription>
            Импорт клиентов и задач из Excel файла
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Important notice about administrator-only import */}
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <div className="flex gap-2">
                <span className="text-amber-600 dark:text-amber-400 text-xl">⚠️</span>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                    Важно: Импорт только для администраторов
                  </p>
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    Импортировать данные может только администратор со своего аккаунта. 
                    Хозяин (owner) не должен импортировать данные, так как это может привести 
                    к сохранению записей и мастеров в неправильном филиале.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="excel-file">Выберите Excel файл</Label>
              <Input
                id="excel-file"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                disabled={importMutation.isPending}
              />
              <p className="text-xs text-muted-foreground">
                Поддерживаются форматы: .xlsx, .xls
              </p>
            </div>
            
            {selectedFile && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Выбранный файл:</p>
                <p className="text-sm text-muted-foreground">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">Размер: {formatFileSize(selectedFile.size)}</p>
              </div>
            )}
            
            <Button
              onClick={handleImport}
              disabled={!selectedFile || importMutation.isPending}
              className="w-full"
            >
              {importMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {t('settings.loading_text')}
                </>
              ) : (
                t('settings.import_data_button')
              )}
            </Button>

            {/* Ручной запуск обработки для отладки */}
            {importJobId && (!importStatus || !((importStatus as any)?.job?.status) || ((importStatus as any)?.job?.status === 'PENDING')) && (
              <Button
                onClick={() => handleManualProcess(importJobId)}
                variant="outline"
                className="w-full mt-2"
              >
                {t('settings.manual_process')}
              </Button>
            )}

            {/* Статус импорта */}
            {importJobId && importStatus && typeof importStatus === 'object' && importStatus !== null && (
              <div className="mt-4 p-4 bg-muted rounded-lg border">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{t('settings.import_status')}:</span>
                    <span className={`px-2 py-1 rounded text-sm ${
                      (importStatus as any).job?.status === 'COMPLETED' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                      (importStatus as any).job?.status === 'FAILED' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                      'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    }`}>
                      {(importStatus as any).job?.status === 'COMPLETED' ? t('settings.completed') :
                       (importStatus as any).job?.status === 'FAILED' ? t('settings.failed') :
                       (importStatus as any).job?.status === 'PROCESSING' ? t('settings.processing') : t('settings.pending')}
                    </span>
                  </div>

                  {/* Прогресс бар */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{t('settings.progress')}:</span>
                      <span>{Math.round((importStatus as any).job?.completionPercentage || 0)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${(importStatus as any).job?.completionPercentage || 0}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Детали импорта */}
                  {(importStatus as any).job && (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">{t('settings.processed_rows')}:</span>
                        <div className="font-medium">
                          {(importStatus as any).job.processedRows || 0} / {(importStatus as any).job.totalRows || 0}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('settings.file')}</span>
                        <div className="font-medium truncate">
                          {(importStatus as any).job.fileName || t('settings.unknown')}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('settings.clients')}</span>
                        <div className="font-medium">
                          {(importStatus as any).job.clientsImported || 0}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('settings.tasks')}</span>
                        <div className="font-medium">
                          {(importStatus as any).job.tasksImported || 0}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Ошибка если есть */}
                  {(importStatus as any).job?.status === 'FAILED' && (importStatus as any).job?.errorMessage && (
                    <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                      <div className="text-sm text-red-800 dark:text-red-200">
                        <strong>Ошибка:</strong> {(importStatus as any).job.errorMessage}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="bg-muted p-4 rounded-md">
              <h3 className="text-sm font-medium mb-2">Процесс импорта</h3>
              <p className="text-xs text-muted-foreground">
                Импорт происходит в три этапа:
              </p>
              <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                <li>• Этап 1: Загрузка файла и сохранение в облачное хранилище</li>
                <li>• Этап 2: Запуск фоновой обработки через очередь задач</li>
                <li>• Этап 3: Импорт клиентов и задач с отслеживанием прогресса</li>
              </ul>
              <p className="text-xs text-muted-foreground mt-2">
                <strong>Преимущества:</strong> Фоновая обработка позволяет импортировать большие файлы без блокировки интерфейса
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
