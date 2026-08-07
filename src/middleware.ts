import { NextRequest, NextResponse } from 'next/server';
import { verifySessionFromReq } from '@/lib/auth';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isAdminPage = pathname.startsWith('/admin');
  const isAdminApi = pathname.startsWith('/api/admin');

  if (isAdminPage || isAdminApi) {
    const session = await verifySessionFromReq(req);

    if (!session || session.role !== 'admin') {
      if (isAdminApi) {
        return NextResponse.json(
          { error: 'Forbidden: Admin privilege required' },
          { status: 403 }
        );
      }
      
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
