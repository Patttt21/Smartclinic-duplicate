import React from 'react';
import { Sun, Moon, Globe } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useClinic } from '../../context/ClinicContext';

export const GlobalSystemControls: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();
  const { language, setLanguage } = useClinic();

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'fil' : 'en');
  };

  return (
    <div
      data-print-hide="true"
      className="fixed bottom-5 left-5 z-[80] flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full px-3.5 py-2 shadow-2xl text-xs font-bold text-slate-800 dark:text-slate-100 transition no-print print:hidden !print:hidden global-system-controls"
    >
      {/* Theme Toggle Button */}
      <button
        type="button"
        onClick={toggleTheme}
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        className="flex items-center gap-1.5 hover:text-teal-600 dark:hover:text-teal-400 transition cursor-pointer pr-2.5 border-r border-slate-200 dark:border-slate-800"
      >
        {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
        <span className="hidden sm:inline">{isDark ? 'Light' : 'Dark'}</span>
      </button>

      {/* Language Switch Button */}
      <button
        type="button"
        onClick={toggleLanguage}
        title={language === 'en' ? 'Switch to Tagalog / Filipino' : 'Switch to English'}
        aria-label={language === 'en' ? 'Switch to Tagalog / Filipino' : 'Switch to English'}
        className="flex items-center gap-1.5 hover:text-teal-600 dark:hover:text-teal-400 transition cursor-pointer pl-1"
      >
        <Globe className="w-4 h-4 text-teal-600 dark:text-teal-400" />
        <span>{language === 'en' ? '🇵🇭 Tagalog' : '🇺🇸 English'}</span>
      </button>
    </div>
  );
};
