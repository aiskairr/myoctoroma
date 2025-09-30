import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, LogIn, Eye, EyeOff } from "lucide-react";
import Cookies from 'js-cookie';

interface User {
  id: number;
  email: string;
  username: string;
  role: string;
}

export default function SimpleLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    if (!email || !password) {
      setError("Пожалуйста, заполните все поля");
      return;
    }

    setIsLoading(true);
    setError("");

    // Получаем URL из переменной окружения
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

    // Проверяем, что URL существует, чтобы избежать ошибок
    if (!BACKEND_URL) {
      setError("Ошибка конфигурации: URL бэкенда не найден.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });

      // Парсим JSON только один раз
      const result = await response.json();

      if (response.ok && result.success) {
        // Сохраняем результат в localStorage
        localStorage.setItem('uuid', JSON.stringify(result));

        // Перенаправляем в зависимости от роли
        if (result.user?.role === 'master') {
          window.location.href = "/crm/calendar";
        } else {
          Cookies.set("token", result.token);
          const token = Cookies.get('token');
          const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/user`, {
            method: "GET",
            credentials: "include",
            headers: {
              "Accept": "application/json",
              "Authorization": `Bearer ${token}`
            }
          })

          console.log(await res.json())


          Cookies.set('user', JSON.stringify(await res.json()))
          window.location.href = "/";
        }
      } else {
        // Обрабатываем ошибку
        setError(result.message || "Неверный email или пароль");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Ошибка подключения к серверу");
    } finally {
      setIsLoading(false);
    }
  };

  // Обработчик нажатия клавиш
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSubmit(e as any);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
            <LogIn className="h-6 w-6 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-800">
            Вход в систему
          </CardTitle>
          <CardDescription className="text-gray-600">
            Octo CRM - Система управления записями
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
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 outline-none focus:outline-none"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Вход...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
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
  );
}