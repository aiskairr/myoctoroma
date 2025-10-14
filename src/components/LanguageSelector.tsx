import { Globe } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import type { Locale } from "@/contexts/LocaleContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface LanguageSelectorProps {
  variant?: 'default' | 'sidebar' | 'transparent';
  size?: 'sm' | 'md' | 'lg';
}

const languageNames = {
  ru: 'Русский',
  ky: 'Кыргызча',
  en: 'English',
};

export function LanguageSelector({ variant = 'default', size = 'md' }: LanguageSelectorProps) {
  const { locale, setLocale } = useLocale();

  const sizeClasses = {
    sm: 'h-8 text-xs',
    md: 'h-9 text-sm',
    lg: 'h-10 text-base',
  };

  const variantClasses = {
    default: 'bg-white hover:bg-gray-50 border border-gray-200 text-gray-700',
    sidebar: 'bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700',
    transparent: 'bg-white/10 hover:bg-white/20 border border-white/20 text-white backdrop-blur-md',
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={`${variantClasses[variant]} ${sizeClasses[size]} px-3 gap-2 font-medium transition-all duration-200`}
        >
          <Globe className="w-4 h-4" />
          <span className="uppercase">{locale}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px]">
        {(['ru', 'ky', 'en'] as Locale[]).map((lang) => (
          <DropdownMenuItem
            key={lang}
            onClick={() => setLocale(lang)}
            className={`cursor-pointer px-3 py-2 ${
              locale === lang
                ? 'bg-blue-50 text-blue-700 font-semibold'
                : 'hover:bg-gray-50'
            }`}
          >
            <span className="uppercase font-medium mr-2">{lang}</span>
            <span className="text-gray-600">— {languageNames[lang]}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
