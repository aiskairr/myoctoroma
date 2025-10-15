import { useAuth } from "../contexts/SimpleAuthContext";
import { useLocale } from "../contexts/LocaleContext";
import { 
  LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import LOGO from "./assets/PROM_logo_big_white.svg";

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
      <div className="flex items-center gap-2">
        <img width={32} height={32} src={LOGO} alt="Octō CRM Logo" className="h-7 w-auto" />
        <h1 className="font-semibold text-lg">{t('nav.master_calendar')}</h1>
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          <span className="ml-2 hidden sm:inline">{t('nav.logout')}</span>
        </Button>
      </div>
    </div>
  );
}