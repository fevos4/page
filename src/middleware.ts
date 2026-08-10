import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { verifySessionFromReq } from '@/lib/auth';
import { locales, defaultLocale, localePrefix } from './navigation';

const intlMiddleware = createMiddleware({
  locales: [...locales],
  defaultLocale,
  localePrefix,
});

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Strip locale prefix (e.g. /en/admin, /am/admin, /om/admin -> /admin)
  const pathnameWithoutLocale = pathname.replace(/^\/(en|am|om)/, '') || '/';

  const isAdminPage = pathnameWithoutLocale.startsWith('/admin') && !pathnameWithoutLocale.startsWith('/admin-login');
  const isAdminApi = pathname.startsWith('/api/admin');

  // 2. Perform Admin Session Authentication Guard
  if (isAdminPage || isAdminApi) {
    const session = await verifySessionFromReq(req);

    if (!session || session.role !== 'admin') {
      if (isAdminApi) {
        return NextResponse.json(
          { error: 'Forbidden: Admin privilege required' },
          { status: 403 }
        );
      }

      const loginUrl = new URL('/admin-login', req.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 3. Skip intl middleware for API routes and static files
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // 4. Run next-intl middleware for all page routes
  return intlMiddleware(req);
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)', '/admin/:path*', '/api/admin/:path*'],
};
