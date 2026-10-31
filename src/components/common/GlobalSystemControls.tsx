import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export const GlobalSystemControls: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <div
      data-print-hide="true"
      className="fixed bottom-5 left-5 z-[80] flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 shadow-lg text-xs font-bold text-slate-800 dark:text-slate-100 transition no-print print:hidden global-system-controls"
    >
      <button
        type="button"
        onClick={toggleTheme}
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        className="flex items-center gap-1.5 hover:text-sky-600 dark:hover:text-sky-400 transition cursor-pointer whitespace-nowrap"
      >
        {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-sky-600" />}
        <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
      </button>
    </div>
  );
};
