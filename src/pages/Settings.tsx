import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Copy } from "lucide-react";

export default function Settings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Record<string, string>>({
    telegramToken: "",
    openaiApiKey: "",
    systemPrompt: "",
    webhookUrl: "",
    botActive: "true",
  });
  
  // Fetch settings
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/settings"],
    queryFn: () => fetch("/api/settings").then(res => res.json()),
  });
  
  // Mutation for updating settings
  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const response = await apiRequest("POST", "/api/settings", { key, value });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
  });
  
  // Состояние для данных вебхука
  const [webhookInfo, setWebhookInfo] = useState<{
    url: string;
    verifyToken: string;
    instructions: string;
  }>({
    url: "",
    verifyToken: "",
    instructions: "",
  });

  useEffect(() => {
    if (data) {
      // Обработка параметров настроек
      const settingsMap: Record<string, string> = {};
      data.settings.forEach((setting: any) => {
        settingsMap[setting.key] = setting.value;
      });
      setSettings(settingsMap);
      
      // Обработка информации о вебхуке, если она есть
      if (data.webhookInfo) {
        setWebhookInfo(data.webhookInfo);
      }
    }
  }, [data]);
  
  const handleInputChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };
  
  const handleSave = async (key: string) => {
    try {
      await updateSettingMutation.mutateAsync({ key, value: settings[key] });
      
      // Русификация сообщений в зависимости от ключа
      let keyName = "";
      if (key === "telegramToken") keyName = "Токен Telegram";
      else if (key === "openaiApiKey") keyName = "API ключ OpenAI";
      else if (key === "systemPrompt") keyName = "Системный промпт";
      else keyName = key;
      
      toast({
        title: "Настройки сохранены",
        description: `${keyName} успешно обновлен.`,
        variant: "default",
      });
    } catch (error) {
      console.error(`Error saving ${key}:`, error);
      toast({
        title: "Ошибка",
        description: `Не удалось сохранить настройки.`,
        variant: "destructive",
      });
    }
  };
  
  const handleSwitchChange = async (checked: boolean) => {
    const value = checked ? "true" : "false";
    setSettings((prev) => ({ ...prev, botActive: value }));
    try {
      await updateSettingMutation.mutateAsync({ key: "botActive", value });
      toast({
        title: "Статус бота обновлен",
        description: checked ? "Бот теперь активен." : "Бот теперь неактивен.",
        variant: "default",
      });
    } catch (error) {
      console.error("Error updating bot status:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить статус бота.",
        variant: "destructive",
      });
    }
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Скопировано в буфер обмена",
      variant: "default",
    });
  };
  
  const resetSystemPrompt = () => {
    // Используем актуальный промпт из файла very_last_prompt.txt
    const defaultPrompt = `Ты — Айсулуу, виртуальный администратор TAMGA Massage&SPA в Бишкеке.
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
> «Здравствуйте! Добро пожаловать в TAMGA Massage&SPA. Какой вид массажа вас интересует?»
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
  "massage_type": "Классический массаж",
  "massage_duration": 60,
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
  
  if (error) {
    return (
      <div className="p-6">
        <div className="text-destructive">Ошибка загрузки настроек</div>
      </div>
    );
  }
  
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-medium mb-1">Настройки</h1>
        <p className="text-muted-foreground">Настройка бота, API ключей и промптов</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Telegram Bot Settings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Настройки Telegram бота</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="bot-token">Токен бота</Label>
                <Input
                  id="bot-token"
                  type="password"
                  value={settings.telegramToken}
                  onChange={(e) => handleInputChange("telegramToken", e.target.value)}
                  placeholder="Введите токен Telegram бота"
                />
                <p className="text-xs text-muted-foreground">Получите у BotFather в Telegram</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="webhook-url">URL для вебхука</Label>
                <div className="flex">
                  <Input
                    id="webhook-url"
                    value={settings.webhookUrl}
                    readOnly
                    className="rounded-r-none"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    className="rounded-l-none"
                    onClick={() => copyToClipboard(settings.webhookUrl)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Конечная точка для обновлений Telegram</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="bot-active"
                    checked={settings.botActive === "true"}
                    onCheckedChange={handleSwitchChange}
                  />
                  <Label htmlFor="bot-active">Бот активен</Label>
                </div>
                <p className="text-xs text-muted-foreground">Включить или отключить бота глобально</p>
              </div>
              
              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={() => handleSave("telegramToken")}
                  disabled={updateSettingMutation.isPending}
                >
                  {updateSettingMutation.isPending ? "Сохранение..." : "Сохранить настройки"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        
        {/* OpenAI API Settings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Настройки OpenAI API</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="api-key">API ключ</Label>
                <Input
                  id="api-key"
                  type="password"
                  value={settings.openaiApiKey}
                  onChange={(e) => handleInputChange("openaiApiKey", e.target.value)}
                  placeholder="Введите ваш ключ OpenAI API"
                />
                <p className="text-xs text-muted-foreground">Ваш ключ OpenAI API для модели GPT-4o-mini</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="model">Модель</Label>
                <Input
                  id="model"
                  value="gpt-4o-mini"
                  disabled
                />
                <p className="text-xs text-muted-foreground">Поддерживается только GPT-4o-mini</p>
              </div>
              
              <div className="space-y-2">
                <Label>Температура (фиксировано на 0.4)</Label>
                <Slider
                  value={[0.4]}
                  max={2}
                  step={0.1}
                  disabled
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0 (Детерминистично)</span>
                  <span>0.4</span>
                  <span>2.0 (Случайно)</span>
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={() => handleSave("openaiApiKey")}
                  disabled={updateSettingMutation.isPending}
                >
                  {updateSettingMutation.isPending ? "Сохранение..." : "Сохранить настройки"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
      
      {/* System Prompt Settings */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle>Настройки системного промпта</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="system-prompt">Системный промпт</Label>
              <Textarea
                id="system-prompt"
                rows={8}
                value={settings.systemPrompt}
                onChange={(e) => handleInputChange("systemPrompt", e.target.value)}
                placeholder="Введите системный промпт здесь..."
              />
              <p className="text-xs text-muted-foreground">Этот системный промпт будет отправляться с каждым запросом к OpenAI</p>
            </div>
            
            <div className="flex justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={resetSystemPrompt}
                className="mr-2"
              >
                Сбросить к стандартному
              </Button>
              <Button
                type="button"
                onClick={() => handleSave("systemPrompt")}
                disabled={updateSettingMutation.isPending}
              >
                {updateSettingMutation.isPending ? "Сохранение..." : "Сохранить промпт"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      
      {/* WhatsApp Webhook Settings */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle>Настройки веб-хука WhatsApp</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="webhook-url">URL вебхука</Label>
              <div className="flex">
                <Input
                  id="webhook-url"
                  value={webhookInfo.url}
                  readOnly
                  className="rounded-r-none"
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="rounded-l-none"
                  onClick={() => copyToClipboard(webhookInfo.url)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">URL для настройки вебхука WhatsApp</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="verify-token">Токен верификации</Label>
              <div className="flex">
                <Input
                  id="verify-token"
                  value={webhookInfo.verifyToken}
                  readOnly
                  className="rounded-r-none"
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="rounded-l-none"
                  onClick={() => copyToClipboard(webhookInfo.verifyToken)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Токен для подтверждения вашего вебхука</p>
            </div>
            
            <div className="bg-muted p-4 rounded-md">
              <h3 className="text-sm font-medium mb-2">Инструкции по настройке</h3>
              <p className="text-xs text-muted-foreground">
                Используйте эти данные для настройки веб-хука в панели управления WhatsApp Business API.
                При настройке укажите наш URL в качестве Callback URL и токен верификации для подтверждения подписки.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Веб-хук поддерживает как GET (верификация), так и POST (приём событий) запросы.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
