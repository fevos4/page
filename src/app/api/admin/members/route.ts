import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const members = await prisma.user.findMany({
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
