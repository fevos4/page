import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const session = await getAdminSession();
  if (!session || !session.userId) {
    return NextResponse.json(
      { user: null },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      membership_status: true,
    },
  });

  if (!dbUser || (dbUser.role !== 'admin' && dbUser.role !== 'super_admin')) {
    return NextResponse.json(
      { user: null },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  }

  return NextResponse.json(
    {
      user: {
        id: dbUser.id,
        userId: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        role: dbUser.role,
        membershipStatus: dbUser.membership_status,
      },
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    }
  );
}
