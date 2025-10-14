import React from 'react';
import { useLocale, type Locale } from '@/contexts/LocaleContext';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const localeNames = {
  ru: 'Русский',
  ky: 'Кыргызча',
  en: 'English',
};

const localeFlags = {
  ru: '🇷🇺',
  ky: '🇰🇬',
  en: '🇬🇧',
};

export const LocaleToggle: React.FC = () => {
  const { locale, setLocale } = useLocale();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 gap-1 text-sm font-medium"
        >
          <span className="text-base">{localeFlags[locale]}</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[120px]">
        {Object.entries(localeNames).map(([code, name]) => (
          <DropdownMenuItem
            key={code}
            onClick={() => setLocale(code as Locale)}
            className={`gap-2 ${locale === code ? 'bg-accent' : ''}`}
          >
            <span className="text-base">{localeFlags[code as Locale]}</span>
            <span>{name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
