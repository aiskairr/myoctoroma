import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, LogIn } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MobileMasterLoginProps {
  onLogin: (masterId: number, masterName: string) => void;
  isMobile: boolean;
}

export function MobileMasterLogin({ onLogin, isMobile }: MobileMasterLoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      toast({
        title: "Ошибка",
        description: "Пожалуйста, введите логин и пароль",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Используем специальный endpoint для мобильного входа мастеров
      const response = await fetch('/api/auth/mobile-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim()
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: "Вход выполнен",
          description: `Добро пожаловать, ${data.masterName}!`,
          variant: "default",
        });
        
        // Вызываем callback с данными мастера
        onLogin(data.masterId, data.masterName);
      } else {
        toast({
          title: "Ошибка входа",
          description: data.message || "Неверный логин или пароль",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Ошибка",
        description: "Произошла ошибка при входе в систему",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
      <Card className={`w-full max-w-md ${isMobile ? 'w-[85vw]' : 'sm:w-[350px]'} shadow-lg`}>
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-3 rounded-full bg-primary/10">
              <Bot className="h-8 w-8 text-primary" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Вход для мастера</CardTitle>
            <CardDescription className="mt-2">
              Введите свои учетные данные для доступа к календарю
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Логин</Label>
              <Input
                id="username"
                type="text"
                placeholder="Введите логин"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                autoComplete="username"
                className="w-full"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                placeholder="Введите пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                autoComplete="current-password"
                className="w-full"
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Вход...
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4 mr-2" />
                  Войти
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}