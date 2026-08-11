import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSessionFromReq } from '@/lib/auth';
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

  const isAdminPage = pathnameWithoutLocale.startsWith('/admin');
  const isAdminApi = pathname.startsWith('/api/admin');

  // 2. Perform Admin Session Authentication Guard
  let refreshedAdminToken: string | undefined = undefined;

  if (isAdminPage || isAdminApi) {
    const { session, newToken } = await verifyAdminSessionFromReq(req);
    refreshedAdminToken = newToken;

    const isAdminLoginPage = pathnameWithoutLocale === '/admin-login';
    const isSuperAdminOnlyPage = pathnameWithoutLocale.startsWith('/admin/manage-admins');
    const isSuperAdminOnlyApi = pathname.startsWith('/api/admin/create-admin-account');

    if (!session) {
      if (isAdminApi) {
        return NextResponse.json({ error: 'Forbidden: Admin privilege required' }, { status: 403 });
      }
      // If unauthenticated and visiting /admin dashboard (or subpages), redirect to /admin-login
      if (isAdminPage && !isAdminLoginPage) {
        return NextResponse.redirect(new URL('/admin-login', req.url));
      }
    } else {
      // If authenticated and visiting /admin-login, redirect directly to /admin dashboard
      if (isAdminLoginPage) {
        const redirectRes = NextResponse.redirect(new URL('/admin', req.url));
        if (refreshedAdminToken) {
          redirectRes.cookies.set('zahra_admin_session', refreshedAdminToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 15 * 60,
          });
        }
        return redirectRes;
      }

      if (isSuperAdminOnlyPage || isSuperAdminOnlyApi) {
        if (session.role !== 'super_admin') {
          if (isAdminApi) {
            return NextResponse.json({ error: 'Forbidden: Super Admin privilege required' }, { status: 403 });
          }
          // Redirect non-super-admins trying to access /admin/manage-admins back to /admin
          const redirectRes = NextResponse.redirect(new URL('/admin', req.url));
          if (refreshedAdminToken) {
            redirectRes.cookies.set('zahra_admin_session', refreshedAdminToken, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              path: '/',
              maxAge: 15 * 60,
            });
          }
          return redirectRes;
        }
      } else {
        if (session.role !== 'admin' && session.role !== 'super_admin') {
          if (isAdminApi) {
            return NextResponse.json({ error: 'Forbidden: Admin privilege required' }, { status: 403 });
          }
        }
      }
    }
  }

  // 3. Skip intl middleware for API routes and static files
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.')
  ) {
    const res = NextResponse.next();
    if (refreshedAdminToken) {
      res.cookies.set('zahra_admin_session', refreshedAdminToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 15 * 60,
      });
    }
    return res;
  }

  // 4. Run next-intl middleware for all page routes
  const res = intlMiddleware(req);
  if (refreshedAdminToken) {
    res.cookies.set('zahra_admin_session', refreshedAdminToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60,
    });
  }
  return res;
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)', '/admin/:path*', '/admin-login', '/api/admin/:path*'],
};
