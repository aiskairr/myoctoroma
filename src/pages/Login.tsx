import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface LoginFormInputs {
  email: string;
  password: string;
}

export default function Login() {
  const { login, isAuthenticated, refreshAuth } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [_, setLocation] = useLocation();

  // При загрузке компонента обновляем статус аутентификации
  useEffect(() => {
    const checkAuthStatus = async () => {
      await refreshAuth();
    };
    checkAuthStatus();
  }, [refreshAuth]);

  // Перенаправляем на главную, если пользователь уже авторизован
  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormInputs>({
    defaultValues: {
      email: "",
      password: ""
    }
  });

  const onSubmit = async (data: LoginFormInputs) => {
    setIsLoading(true);
    setError(null);

    console.log("Login form submitted with:", data.email);

    try {
      // Используем функцию login из AuthContext
      const result = await login(data.email, data.password);
      
      if (result.success) {
        console.log("Login successful via auth context");
        
        toast({
          title: "Успешная авторизация",
          description: "Переадресация на панель управления...",
          variant: "default",
        });
        
        // Повторная проверка статуса авторизации
        await refreshAuth();
        
        // Перенаправляем пользователя на главную страницу
        setTimeout(() => {
          console.log("Navigating to dashboard...");
          setLocation("/");
        }, 500);
      } else {
        const errorMsg = result.message || "Неверный логин или пароль";
        console.log("Login failed:", errorMsg);
        setError(errorMsg);
        toast({
          title: "Ошибка авторизации",
          description: errorMsg,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Login error:", error);
      const errorMsg = "Произошла ошибка сервера. Пожалуйста, попробуйте еще раз.";
      setError(errorMsg);
      toast({
        title: "Ошибка",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-background font-sans text-textPrimary min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl mb-1">Admin Dashboard</CardTitle>
          <CardDescription>Telegram Bot Integration with OpenAI</CardDescription>
          <div className="mt-4 p-3 bg-secondary/20 rounded-md text-sm">
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email / Username</Label>
              <Input
                id="email"
                type="text"
                {...register("email", { required: "Email or username is required" })}
                placeholder="Enter your email or username"
                className="w-full"
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                {...register("password", { required: "Password is required" })}
                placeholder="Enter your password"
                className="w-full"
              />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>
            
            {error && (
              <div className="text-red-500 text-sm text-center">{error}</div>
            )}
            
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Logging in..." : "Login"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
