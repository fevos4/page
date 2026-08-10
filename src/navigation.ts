import { createNavigation } from 'next-intl/navigation';

export const locales = ['en', 'am', 'om'] as const;
export const defaultLocale = 'en' as const;
export const localePrefix = 'as-needed' as const;

export const { Link, redirect, usePathname, useRouter } =
  createNavigation({ locales, defaultLocale, localePrefix });
