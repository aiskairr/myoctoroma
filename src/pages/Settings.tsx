import React, { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useLocale } from "@/contexts/LocaleContext";
import { useAuth } from "@/contexts/SimpleAuthContext";
import { useBranch } from "@/contexts/BranchContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, BookOpen, ArrowRight, User, Bot, Calendar, Download } from "lucide-react";
import { BookingLinkCopy } from "@/components/BookingLinkCopy";
import WhatsAppConnect from "@/components/WhatsappConnect";

// Простые плейсхолдеры, если нужных компонентов нет в проекте
const UnifiedImportCard = () => (
  <Card>
    <CardHeader>
      <CardTitle>Импорт данных</CardTitle>
      <CardDescription>Компонент UnifiedImportCard отсутствует — добавьте его для полноценной работы.</CardDescription>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-muted-foreground">Здесь будет интерфейс импорта из Altegio/DIKIDI/Zapisi.kz.</p>
    </CardContent>
  </Card>
);


export default function Settings() {
  const { t } = useLocale();
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentBranch, refetchBranches } = useBranch();
  const [, setLocation] = useLocation();

  const [activeTab, setActiveTab] = useState<string>("account");
  const [userProfile, setUserProfile] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [customRole, setCustomRole] = useState("");
  const [botSettings, setBotSettings] = useState({
    accountID: "",
    managerTimeoutMinutes: "",
  });

  // Константная часть промпта
  const FIXED_PROMPT_TEMPLATE = `
🎯 ПРИНЦИП РАБОТЫ:
Первый бот (Bot#1) уже проанализировал сообщение клиента и определил его намерение.
На основе этого намерения система АВТОМАТИЧЕСКИ подготовила ТОЧНУЮ информацию из базы данных.
Эта информация передается тебе в разделе "📊 ДАННЫЕ ИЗ БД ДЛЯ ОТВЕТА".

🧠 ИНТЕЛЛЕКТУАЛЬНЫЙ КОНТЕКСТ:
Если клиент спросил "Какие мастера работают сегодня?" - тебе передан список РАБОТАЮЩИХ мастеров с их занятостью.
Если клиент спросил "Когда окно у Адиля?" - тебе передано РАСПИСАНИЕ АДИЛЯ с занятыми и свободными слотами.
Если клиент спросил "Сколько стоит массаж?" - тебе передан ПРАЙС-ЛИСТ именно по массажу.

📋 ЧТО НАХОДИТСЯ В КОНТЕКСТЕ:
✅ Конкретные имена мастеров (реальные люди из БД)
✅ Точные цены на услуги (из прайс-листа филиала)
✅ Реальная занятость (из расписания на сегодня/выбранную дату)
✅ Специализации мастеров (их реальные услуги)
✅ Свободные окна (вычислены на основе записей)

⚠️ КРИТИЧЕСКИ ВАЖНО:
❌ НИКОГДА не говори "у меня нет доступа к расписанию" - оно УЖЕ в контексте!
❌ НИКОГДА не говори "нет информации о мастерах" - они УЖЕ перечислены!
❌ НИКОГДА не говори "не знаю цены" - они УЖЕ в прайс-листе!
❌ НИКОГДА не придумывай имена - используй ТОЛЬКО те, что в контексте!

✅ ВСЕГДА читай раздел "📊 ДАННЫЕ ИЗ БД ДЛЯ ОТВЕТА"
✅ ВСЕГДА используй КОНКРЕТНЫЕ имена из списка
✅ ВСЕГДА указывай ТОЧНЫЕ цены из переданного прайса
✅ ВСЕГДА проверяй РЕАЛЬНУЮ занятость из расписания

📌 ПРИМЕРЫ ПРАВИЛЬНОЙ РАБОТЫ:
... (сокращено для читаемости) ...
`.trim();

  const extractCustomRole = (fullPrompt: string): string => {
    if (!fullPrompt) return "Ты - профессиональный администратор салона красоты/массажа.";
    const lines = fullPrompt.split("\n");
    const customLines: string[] = [];
    for (const line of lines) {
      if (line.includes("🎯 ПРИНЦИП РАБОТЫ:")) break;
      if (line.trim()) customLines.push(line);
    }
    return customLines.join("\n").trim() || "Ты - профессиональный администратор салона красоты/массажа.";
  };

  const generateFullPrompt = (role: string): string => {
    return `${role}\n${FIXED_PROMPT_TEMPLATE}`;
  };

  const updateSystemPromptMutation = useMutation({
    mutationFn: async (role: string) => {
      if (!currentBranch?.id) {
        throw new Error("Branch ID is required");
      }

      const fullPrompt = generateFullPrompt(role);
      const token = document.cookie.split("token=")[1]?.split(";")[0] || "";

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/branches/${currentBranch.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify({ systemPrompt: fullPrompt }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t("settings.settings_saved"),
        description: t("settings.system_prompt_updated"),
      });
      refetchBranches();
    },
    onError: (error: Error) => {
      toast({
        title: t("error"),
        description: error.message || t("settings.save_failed"),
        variant: "destructive",
      });
    },
  });

  const updateBotSettingsMutation = useMutation({
    mutationFn: async (settings: { accountID?: string; managerTimeoutMinutes?: number | null }) => {
      if (!currentBranch?.id) {
        throw new Error("Branch ID is required");
      }

      const token = document.cookie.split("token=")[1]?.split(";")[0] || "";
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/branches/${currentBranch.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t("settings.settings_saved"),
        description: "Настройки бота успешно обновлены",
      });
      refetchBranches();
    },
    onError: (error: Error) => {
      toast({
        title: t("error"),
        description: error.message || t("settings.save_failed"),
        variant: "destructive",
      });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { email?: string; password?: string }) => {
      const token = document.cookie.split("token=")[1]?.split(";")[0] || "";
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/user`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        if (response.status === 409) {
          throw new Error(t("settings.email_already_exists"));
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t("settings.profile_updated"),
        description: t("settings.profile_updated_description"),
      });
      setUserProfile({
        email: "",
        password: "",
        confirmPassword: "",
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("settings.profile_update_error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (currentBranch?.systemPrompt) {
      setCustomRole(extractCustomRole(currentBranch.systemPrompt));
    } else {
      setCustomRole("Ты - профессиональный администратор салона красоты/массажа.");
    }

    setBotSettings({
      accountID: (currentBranch as any)?.accountID || "",
      managerTimeoutMinutes: (currentBranch as any)?.managerTimeoutMinutes?.toString() || "",
    });
  }, [currentBranch]);

  const handleBotSettingsChange = (key: keyof typeof botSettings, value: string) => {
    setBotSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleUpdateBotSettings = () => {
    const settings: { accountID?: string; managerTimeoutMinutes?: number | null } = {};
    if (botSettings.accountID.trim()) settings.accountID = botSettings.accountID.trim();
    if (botSettings.managerTimeoutMinutes.trim()) {
      const timeout = parseInt(botSettings.managerTimeoutMinutes);
      if (!isNaN(timeout) && timeout > 0) {
        settings.managerTimeoutMinutes = timeout;
      } else {
        toast({
          title: t("error"),
          description: "Таймаут должен быть положительным числом",
          variant: "destructive",
        });
        return;
      }
    } else {
      settings.managerTimeoutMinutes = null;
    }
    updateBotSettingsMutation.mutate(settings);
  };

  const handleProfileInputChange = (key: keyof typeof userProfile, value: string) => {
    setUserProfile((prev) => ({ ...prev, [key]: value }));
  };

  const handleUpdateProfile = async () => {
    if (!userProfile.email && !userProfile.password) {
      toast({
        title: t("error"),
        description: t("settings.at_least_one_field"),
        variant: "destructive",
      });
      return;
    }

    if (userProfile.password && userProfile.password !== userProfile.confirmPassword) {
      toast({
        title: t("error"),
        description: t("settings.passwords_not_match"),
        variant: "destructive",
      });
      return;
    }

    const updateData: { email?: string; password?: string } = {};
    if (userProfile.email) updateData.email = userProfile.email;
    if (userProfile.password) updateData.password = userProfile.password;

    try {
      await updateProfileMutation.mutateAsync(updateData);
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  if (user?.role === "master") {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700">Доступ ограничен</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">
              Эта страница недоступна для мастеров. Используйте раздел "Настройки" в главном меню.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent mb-2">
            {t("settings.page_title") || "Настройки"}
          </h1>
          <p className="text-muted-foreground text-lg">
            {t("settings.page_description") || "Управление профилем, настройка системы и инструменты для работы"}
          </p>
        </div>

        <Tabs defaultValue="account" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 mb-8">
            <TabsTrigger value="account" className="flex items-center gap-2">
              <User className="h-4 w-4 flex-shrink-0" />
              <span className="hidden lg:inline">Настройки аккаунта</span>
              <span className="lg:hidden">Аккаунт</span>
            </TabsTrigger>
            <TabsTrigger value="chatbot" className="flex items-center gap-2">
              <Bot className="h-4 w-4 flex-shrink-0" />
              <span className="hidden lg:inline">Чат-бот</span>
              <span className="lg:hidden">Бот</span>
            </TabsTrigger>
            <TabsTrigger value="booking" className="flex items-center gap-2">
              <Calendar className="h-4 w-4 flex-shrink-0" />
              <span className="hidden lg:inline">Онлайн бронирование</span>
              <span className="lg:hidden">Бронь</span>
            </TabsTrigger>
            <TabsTrigger value="import" className="flex items-center gap-2">
              <Download className="h-4 w-4 flex-shrink-0" />
              <span className="hidden lg:inline">Импорт данных</span>
              <span className="lg:hidden">Импорт</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="account" className="space-y-6">
            <Card className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-indigo-200 shadow-md hover:shadow-lg transition-all duration-200">
              <CardHeader className="pb-3 border-b border-indigo-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-md">
                      <BookOpen className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-indigo-900">
                        {t("settings.how_to_use_title") || "Как пользоваться системой"}
                      </CardTitle>
                      <CardDescription className="text-indigo-600">
                        {t("settings.how_to_use_description") || "Видеоинструкции и руководства по работе с CRM"}
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    onClick={() => setLocation("/")}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium"
                  >
                    {t("settings.open_instructions") || "Открыть инструкции"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
            </Card>

            <Card className="mb-6 bg-gradient-to-br from-slate-50 to-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-slate-800">{t("settings.profile_title")}</CardTitle>
                <CardDescription className="text-slate-600">
                  {t("settings.profile_description")}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); handleUpdateProfile(); }}>
                  {user?.email && (
                    <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-lg">
                      <p className="text-sm text-emerald-700">
                        {t("settings.current_email")} <span className="font-semibold text-emerald-900">{user.email}</span>
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="new-email" className="text-slate-700 font-medium">{t("settings.new_email_label")}</Label>
                    <Input
                      id="new-email"
                      type="email"
                      value={userProfile.email}
                      onChange={(e) => handleProfileInputChange("email", e.target.value)}
                      placeholder={t("settings.new_email_placeholder")}
                      className="border-slate-300 focus:border-emerald-500 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-password" className="text-slate-700 font-medium">{t("settings.new_password_label")}</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={userProfile.password}
                      onChange={(e) => handleProfileInputChange("password", e.target.value)}
                      placeholder={t("settings.new_password_placeholder")}
                      className="border-slate-300 focus:border-emerald-500 focus:ring-emerald-500"
                    />
                  </div>

                  {userProfile.password && (
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password" className="text-slate-700 font-medium">{t("settings.confirm_password_label")}</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        value={userProfile.confirmPassword}
                        onChange={(e) => handleProfileInputChange("confirmPassword", e.target.value)}
                        placeholder={t("settings.confirm_password_placeholder")}
                        className="border-slate-300 focus:border-emerald-500 focus:ring-emerald-500"
                      />
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <Button
                      type="submit"
                      disabled={updateProfileMutation.isPending}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-6"
                    >
                      {updateProfileMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t("settings.updating_button")}
                        </>
                      ) : (
                        t("settings.update_profile_button")
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="chatbot" className="space-y-6">
            <WhatsAppConnect />

            {currentBranch && (
              <Card className="mb-6 bg-gradient-to-br from-blue-50 to-white border-blue-200 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-3 border-b border-blue-100">
                  <CardTitle className="text-slate-800">🤖 Настройки бота</CardTitle>
                  <CardDescription className="text-slate-600">
                    Настройте параметры работы бота WhatsApp
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <form
                    className="space-y-5"
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleUpdateBotSettings();
                    }}
                  >
                    <div className="space-y-2">
                      <Label htmlFor="accountID" className="text-slate-700 font-medium flex items-center gap-2">
                        🆔 Account ID (WhatsApp Business API)
                        <span className="text-xs text-slate-500 font-normal">(опционально)</span>
                      </Label>
                      <Input
                        id="accountID"
                        type="text"
                        value={botSettings.accountID}
                        onChange={(e) => handleBotSettingsChange("accountID", e.target.value)}
                        placeholder="Введите Account ID от провайдера WhatsApp API"
                        className="border-blue-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="managerTimeout" className="text-slate-700 font-medium flex items-center gap-2">
                        ⏱️ Таймаут молчания бота (минуты)
                        <span className="text-xs text-slate-500 font-normal">(по умолчанию: 15 минут)</span>
                      </Label>
                      <Input
                        id="managerTimeout"
                        type="number"
                        min="1"
                        value={botSettings.managerTimeoutMinutes}
                        onChange={(e) => handleBotSettingsChange("managerTimeoutMinutes", e.target.value)}
                        placeholder="15"
                        className="border-blue-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-slate-600">
                      {t("dashboard.current_branch")}: <span className="font-semibold text-slate-800">{(currentBranch as any).branches || currentBranch?.id}</span>
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button
                        type="submit"
                        disabled={updateBotSettingsMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-8"
                      >
                        {updateBotSettingsMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {t("settings.saving") || "Сохранение..."}
                          </>
                        ) : (
                          "Сохранить настройки бота"
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {currentBranch && (
              <Card className="mb-6 bg-gradient-to-br from-slate-50 to-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <CardTitle className="text-slate-800">
                    {t("settings.system_prompt_title") || "Настройка системного промпта"}
                  </CardTitle>
                  <CardDescription className="text-slate-600">
                    {t("settings.system_prompt_description") || "Настройте роль и описание вашего бота"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <form
                    className="space-y-6"
                    onSubmit={(e) => {
                      e.preventDefault();
                      updateSystemPromptMutation.mutate(customRole);
                    }}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="custom-role" className="text-slate-700 font-medium text-base">
                          📝 Описание роли бота
                        </Label>
                        <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                          Редактируемое поле
                        </span>
                      </div>
                      <Textarea
                        id="custom-role"
                        rows={3}
                        value={customRole}
                        onChange={(e) => setCustomRole(e.target.value)}
                        placeholder="Например: Ты - профессиональный администратор салона красоты/массажа."
                        className="border-emerald-300 focus:border-emerald-500 focus:ring-emerald-500 bg-white text-base"
                      />
                      <p className="text-xs text-slate-500">
                        💡 Опишите, кто ваш бот и какой у вас бизнес.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-slate-700 font-medium text-base">
                          🔒 Системная логика (защищена)
                        </Label>
                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                          Автоматическая часть
                        </span>
                      </div>
                      <div className="border border-slate-200 rounded-lg bg-slate-50/50 p-4 max-h-48 overflow-y-auto">
                        <pre className="text-xs text-slate-600 whitespace-pre-wrap font-mono leading-relaxed">
                          {FIXED_PROMPT_TEMPLATE}
                        </pre>
                      </div>
                    </div>

                    <div className="bg-slate-100 border border-slate-200 rounded-lg p-3 text-xs text-slate-600">
                      {t("dashboard.current_branch")}: <span className="font-semibold text-slate-800">{(currentBranch as any).branches || currentBranch?.id}</span>
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button
                        type="submit"
                        disabled={updateSystemPromptMutation.isPending || !customRole.trim()}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-8"
                      >
                        {updateSystemPromptMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {t("settings.saving") || "Сохранение..."}
                          </>
                        ) : (
                          t("settings.save_prompt") || "Сохранить промпт"
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="booking" className="space-y-6">
            <BookingLinkCopy />
          </TabsContent>

          <TabsContent value="import" className="space-y-6">
            <UnifiedImportCard />
          </TabsContent>
        </Tabs>

        <div className="mt-12 pb-6 text-center">
          <p className="text-sm text-gray-500">
            Powered by{" "}
            <a
              href="https://prom.consulting"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              Prom.Consulting
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
