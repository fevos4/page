import { getRequestConfig } from 'next-intl/server';
import { locales } from './navigation';

export default getRequestConfig(async ({ locale }) => {
  const targetLocale: string = (locale && locales.includes(locale as any)) ? (locale as string) : 'en';

  return {
    locale: targetLocale,
    messages: (await import(`../messages/${targetLocale}.json`)).default,
  };
});
