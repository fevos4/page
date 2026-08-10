'use client';

import { useLocale } from 'next-intl';
import { Globe } from 'lucide-react';
import { ChangeEvent } from 'react';

export default function LanguageSwitcher() {
  const locale = useLocale();

  const handleLanguageChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const nextLocale = e.target.value as 'en' | 'am' | 'om';

    // Set cookie so user's choice is remembered across sessions
    document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000; SameSite=Lax`;

    // Compute new path with target locale prefix
    const currentPath = window.location.pathname;
    const pathWithoutLocale = currentPath.replace(/^\/(en|am|om)(\/|$)/, '$2') || '/';

    const newPath = nextLocale === 'en'
      ? pathWithoutLocale
      : `/${nextLocale}${pathWithoutLocale === '/' ? '' : pathWithoutLocale}`;

    // Force full navigation so Next.js server components load fresh messages dictionary
    window.location.href = newPath;
  };

  return (
    <div className="relative flex items-center">
      <Globe className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-2 pointer-events-none" />
      <select
        value={locale}
        onChange={handleLanguageChange}
        className="bg-slate-200/80 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 text-xs font-medium pl-7 pr-3 py-1.5 rounded appearance-none border border-slate-300 dark:border-slate-700 hover:border-amber-400 focus:outline-none focus:border-amber-500 transition cursor-pointer"
        aria-label="Select Language"
      >
        <option value="en">English</option>
        <option value="am">አማርኛ</option>
        <option value="om">Afaan Oromoo</option>
      </select>
    </div>
  );
}
