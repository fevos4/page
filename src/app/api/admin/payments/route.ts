import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const payments = await prisma.payment.findMany({
    orderBy: { created_at: 'desc' },
    include: {
      user: {
        select: { id: true, name: true, email: true, membership_status: true, membership_expiry_date: true },
      },
      plan: true,
    },
  });

  return NextResponse.json({ payments });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { payment_id, action, rejection_reason } = body; // action: 'approve' | 'reject'

  if (!payment_id || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Valid payment_id and action required' }, { status: 400 });
  }

  const payment = await prisma.payment.findUnique({
    where: { id: payment_id },
    include: { user: true, plan: true },
  });

  if (!payment) {
    return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });
  }

  const now = new Date();

  if (action === 'approve') {
    // Approve Payment
    await prisma.payment.update({
      where: { id: payment_id },
      data: {
        status: 'verified',
        reviewed_by: session.userId,
        reviewed_at: now,
      },
    });

    // Calculate Expiry Date
    let newExpiryDate: Date;
    if (
      payment.user.membership_status === 'active' &&
      payment.user.membership_expiry_date &&
      new Date(payment.user.membership_expiry_date) > now
    ) {
      // Extend current active membership
      newExpiryDate = new Date(
        new Date(payment.user.membership_expiry_date).getTime() +
          payment.plan.duration_days * 24 * 60 * 60 * 1000
      );
    } else {
      // New or expired membership start
      newExpiryDate = new Date(now.getTime() + payment.plan.duration_days * 24 * 60 * 60 * 1000);
    }

    await prisma.user.update({
      where: { id: payment.user_id },
      data: {
        membership_status: 'active',
        membership_expiry_date: newExpiryDate,
        membership_cancelled_at: null,
        renewal_reminder_sent: false,
      },
    });

    return NextResponse.json({ success: true, action: 'approved', expiryDate: newExpiryDate });
  } else {
    // REJECTION LOGIC FIX (EXPLICIT DIRECT STATUS CHECK):
    // Reject Payment
    await prisma.payment.update({
      where: { id: payment_id },
      data: {
        status: 'rejected',
        rejection_reason: rejection_reason || 'Payment verification failed',
        reviewed_by: session.userId,
        reviewed_at: now,
      },
    });

    // Explicit direct status check:
    // Only flip to 'free' or 'expired' if the user's current status was 'pending_verification'.
    // If the user's current status is 'active', DO NOTHING — they retain existing access until actual expiry.
    if (payment.user.membership_status === 'pending_verification') {
      const pastExpiry = payment.user.membership_expiry_date;
      const isPastExpired = pastExpiry && new Date(pastExpiry) < now;

      await prisma.user.update({
        where: { id: payment.user_id },
        data: {
          membership_status: isPastExpired ? 'expired' : 'free',
        },
      });
    }

    return NextResponse.json({ success: true, action: 'rejected' });
  }
}
