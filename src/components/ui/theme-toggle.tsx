import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Moon, Sun } from 'lucide-react';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className={`
        relative h-10 w-10 rounded-full transition-all duration-300 ease-in-out
        ${theme === 'dark' 
          ? 'bg-slate-700 hover:bg-slate-600 text-yellow-400 border border-slate-600' 
          : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 shadow-sm'
        }
        hover:scale-110 active:scale-95
      `}
      title={`Переключить на ${theme === 'light' ? 'темную' : 'светлую'} тему`}
    >
      <div className="relative">
        {theme === 'light' ? (
          <Moon className="h-5 w-5 transition-all duration-300 rotate-0 scale-100" />
        ) : (
          <Sun className="h-5 w-5 transition-all duration-300 rotate-0 scale-100" />
        )}
      </div>
      
      {/* Анимированный фон */}
      <div 
        className={`
          absolute inset-0 rounded-full transition-all duration-500 ease-in-out
          ${theme === 'dark' 
            ? 'bg-gradient-to-br from-indigo-500/20 to-purple-500/20' 
            : 'bg-gradient-to-br from-amber-300/20 to-orange-300/20'
          }
          opacity-0 hover:opacity-100
        `}
      />
    </Button>
  );
};
