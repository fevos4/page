import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const plans = await prisma.membershipPlan.findMany({
    where: { is_active: true },
    orderBy: { price: 'asc' },
  });

  return NextResponse.json({ plans });
}
