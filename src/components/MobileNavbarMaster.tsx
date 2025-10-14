import React from 'react';
import { useAuth } from "../contexts/SimpleAuthContext";
import { useLocale } from "../contexts/LocaleContext";
import { 
  LogOut, 
  Bot
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export function MobileNavbarMaster() {
  const { logout } = useAuth();
  const { t } = useLocale();
  const { toast } = useToast();

  const handleLogout = async () => {
    await logout();
    toast({
      title: t('nav.logout_title'),
      description: t('nav.logout_success'),
      variant: "default",
    });
  };

  return (
    <div className="bg-background border-b shadow-sm px-4 py-3 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center">
        <Bot className="text-primary h-6 w-6 mr-2" />
        <h1 className="font-medium text-lg">Календарь мастера</h1>
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          <span className="ml-2 hidden sm:inline">{t('nav.logout')}</span>
        </Button>
      </div>
    </div>
  );
}