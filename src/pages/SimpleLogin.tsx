import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, LogIn, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/SimpleAuthContext";
import Lottie from "lottie-react";
import abstractionAnimation from "@/lotties/Abstraction.json";

export default function SimpleLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  
  const { login, isLoading, isAuthenticated, user } = useAuth();

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
      setError("Пожалуйста, заполните все поля");
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
        setError(result.message || "Неверный email или пароль");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Ошибка подключения к серверу");
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
          animationData={abstractionAnimation}
          loop={true}
          autoplay={true}
          className="w-full h-full object-cover opacity-50"
        />
      </div>

      {/* Модуль авторизации поверх анимации */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md shadow-2xl bg-white/95 backdrop-blur-md border border-gray-200">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-20 h-20 flex items-center justify-center">
              <img 
                src="/PROM_logo_mid_blue.svg" 
                alt="Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-800">
              Вход в систему
            </CardTitle>
            <CardDescription className="text-gray-600">
              Octō CRM - Система управления записями
            </CardDescription>
          </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
            <div className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email адрес
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="your@email.com"
                  disabled={isLoading}
                  className="w-full outline-none focus:outline-none"
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Пароль
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Введите пароль"
                    disabled={isLoading}
                    className="w-full pr-10 outline-none focus:outline-none"
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
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 outline-none focus:outline-none transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl active:scale-[0.98] group"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Вход...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                    Войти
                  </>
                )}
              </Button>
            </div>
            <div className="mt-6 text-center text-sm text-gray-500">
            </div>
          </form>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}