import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAdminSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getAdminSession();
  if (!session || (session.role !== 'admin' && session.role !== 'super_admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const whereClause = session.role === 'super_admin' ? {} : { role: 'user' as const };

  const members = await prisma.user.findMany({
    where: whereClause,
    orderBy: { created_at: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      membership_status: true,
      membership_expiry_date: true,
      created_at: true,
    },
  });

  return NextResponse.json({ members });
}
