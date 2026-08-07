import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    const body = await req.json();
    const { plan_id, reference_number, amount_claimed, receipt_image_path } = body;

    if (!plan_id || !reference_number || !amount_claimed) {
      return NextResponse.json(
        { error: 'Plan selection, reference number, and amount are required.' },
        { status: 400 }
      );
    }

    // Check duplicate reference number cleanly
    const existingPayment = await prisma.payment.findUnique({
      where: { reference_number: reference_number.trim() },
    });

    if (existingPayment) {
      return NextResponse.json(
        { error: 'This reference number has already been submitted' },
        { status: 409 }
      );
    }

    const plan = await prisma.membershipPlan.findUnique({
      where: { id: plan_id },
    });

    if (!plan || !plan.is_active) {
      return NextResponse.json({ error: 'Invalid or inactive membership plan' }, { status: 400 });
    }

    // Fetch current user status
    const currentUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { membership_status: true },
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        user_id: session.userId,
        plan_id: plan.id,
        reference_number: reference_number.trim(),
        amount_claimed: parseFloat(amount_claimed),
        receipt_image_path: receipt_image_path || null,
        status: 'pending_verification',
      },
    });

    // RENEWAL EDGE CASE FIX:
    // Only set membership_status = pending_verification if current status is free or expired.
    // If currently active, leave status untouched so access is retained during review.
    if (currentUser.membership_status === 'free' || currentUser.membership_status === 'expired') {
      await prisma.user.update({
        where: { id: session.userId },
        data: { membership_status: 'pending_verification' },
      });
    }

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      message: 'Payment submitted successfully and pending verification.',
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'This reference number has already been submitted' },
        { status: 409 }
      );
    }
    console.error('Error submitting payment:', error);
    return NextResponse.json({ error: 'Failed to process payment submission' }, { status: 500 });
  }
}
