import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const session = await getSession();
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
      membership_expiry_date: true,
    },
  });

  if (!dbUser) {
    return NextResponse.json(
      { user: null },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  }

  // Fetch the single most recent payment to surface rejection status on the account page
  const latestPayment = await prisma.payment.findFirst({
    where: { user_id: session.userId },
    orderBy: { created_at: 'desc' },
    select: { status: true, rejection_reason: true },
  });

  return NextResponse.json(
    {
      user: {
        id: dbUser.id,
        userId: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        role: dbUser.role,
        membershipStatus: dbUser.membership_status,
        membershipExpiryDate: dbUser.membership_expiry_date
          ? dbUser.membership_expiry_date.toISOString()
          : null,
        latestPaymentStatus: latestPayment?.status ?? null,
        latestPaymentRejectionReason: latestPayment?.rejection_reason ?? null,
      },
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    }
  );
}
