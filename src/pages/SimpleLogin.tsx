import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, LogIn, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/SimpleAuthContext";
import { useLocale } from "@/contexts/LocaleContext";
import { LanguageSelector } from "@/components/LanguageSelector";
import Lottie from "lottie-react";
import circularLinesAnimation from "@/lotties/Circular lines 01.json";

export default function SimpleLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  
  const { login, isLoading, isAuthenticated, user } = useAuth();
  const { t } = useLocale();

  // Если пользователь уже авторизован, перенаправляем его
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'master') {
        window.location.href = "/crm/calendar";
      } else {
        window.location.href = "/";
      }
    }
  }, [isAuthenticated, user]);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    if (!email || !password) {
      setError(t('login.error.empty'));
      return;
    }

    setError("");

    try {
      const result = await login(email, password);

      if (result.success) {
        // Перенаправляем в зависимости от роли
        if (result.user?.role === 'master') {
          window.location.href = "/crm/calendar";
        } else {
          window.location.href = "/";
        }
      } else {
        // Обрабатываем ошибку
        setError(result.message || t('login.error.invalid'));
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(t('login.error.server'));
    }
  };

  // Обработчик нажатия клавиш
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSubmit(e as any);
    }
  };

  return (
    <div className="min-h-screen relative bg-gradient-to-br from-blue-900 via-blue-950 to-green-950">
      {/* Фоновая анимация */}
      <div className="fixed inset-0 z-0 flex items-center justify-center overflow-hidden">
        <Lottie 
          animationData={circularLinesAnimation}
          loop={true}
          autoplay={true}
          className="w-full h-full object-cover opacity-55 scale-[130%]"
        />
      </div>

      {/* Переключатель языка */}
      <div className="absolute top-4 right-4 z-20">
        <LanguageSelector variant="transparent" size="sm" />
      </div>

      {/* Модуль авторизации поверх анимации */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4 sm:p-6">
        <Card className="w-full max-w-md shadow-2xl bg-white/95 backdrop-blur-md border border-gray-200 rounded-[48px]">
          <CardHeader className="text-center space-y-3 sm:space-y-4 p-4 sm:p-6">
            <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
              <img 
                src="/PROM_logo_mid_blue.svg" 
                alt="Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            <CardTitle className="text-xl sm:text-2xl font-bold text-gray-800">
              {t('login.title')}
            </CardTitle>
            <CardDescription className="text-sm sm:text-base text-gray-600">
              {t('login.subtitle')}
            </CardDescription>
          </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
            <div className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription className="text-sm">{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs sm:text-sm font-medium text-gray-700">
                  {t('login.email')}
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t('login.email_placeholder')}
                  disabled={isLoading}
                  className="w-full outline-none focus:outline-none text-sm sm:text-base"
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs sm:text-sm font-medium text-gray-700">
                  {t('login.password')}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={t('login.password_placeholder')}
                    disabled={isLoading}
                    className="w-full pr-10 outline-none focus:outline-none text-sm sm:text-base"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 focus:ring-0 focus:ring-offset-0 focus:outline-none"
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-2.5 sm:py-3 outline-none focus:outline-none transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl active:scale-[0.98] group text-sm sm:text-base rounded-2xl"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                    {t('login.loading')}
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4 sm:h-5 sm:w-5 transition-transform group-hover:translate-x-1" />
                    {t('login.button')}
                  </>
                )}
              </Button>
            </div>
            <div className="mt-6 text-center text-sm text-gray-500">
            </div>
          </form>
        </CardContent>
      </Card>
      
      {/* Footer брендинг */}
      <div className="mt-6 sm:mt-8 text-center px-4">
        <p className="text-white/70 text-xs sm:text-sm font-light tracking-wide">
          {t('login.powered_by')}{" "}
          <span className="font-semibold text-white/90 hover:text-white transition-colors duration-200">
            {t('login.company')}
          </span>
        </p>
      </div>
      </div>
    </div>
  );
}