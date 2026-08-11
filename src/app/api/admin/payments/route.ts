import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAdminSession } from '@/lib/auth';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key');

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const session = await getAdminSession();
  if (!session || (session.role !== 'admin' && session.role !== 'super_admin')) {
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
  const session = await getAdminSession();
  if (!session || (session.role !== 'admin' && session.role !== 'super_admin')) {
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
    // Reject Payment
    const reasonText = rejection_reason || 'Payment verification failed';

    await prisma.payment.update({
      where: { id: payment_id },
      data: {
        status: 'rejected',
        rejection_reason: reasonText,
        reviewed_by: session.userId,
        reviewed_at: now,
      },
    });

    // Reset user membership status if pending
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

    // Send Rejection Email Notification via Resend (Failure should NOT break the rejection action)
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'Zahra Page <onboarding@resend.dev>';

      const emailResult = await resend.emails.send({
        from: fromEmail,
        to: [payment.user.email],
        subject: "Update on your Zahra's Page membership payment",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6;">
            <h2 style="color: #e11d48; margin-bottom: 16px;">Update on your Zahra's Page membership payment</h2>
            <p>Hi ${payment.user.name},</p>
            <p>Thank you for submitting your payment for <strong>Zahra's Page Membership</strong>. We regret to inform you that your payment submission (Reference #: <strong>${payment.reference_number}</strong>) was not approved.</p>
            
            <div style="background-color: #f8fafc; border-left: 4px solid #e11d48; padding: 12px 16px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; font-weight: bold; color: #0f172a; font-size: 14px;">Reason provided:</p>
              <p style="margin: 4px 0 0 0; color: #475569; font-size: 14px;">${reasonText}</p>
            </div>

            <h3 style="color: #0f172a; font-size: 16px; margin-top: 24px;">Next Steps:</h3>
            <ul style="padding-left: 20px; color: #334155;">
              <li>Please double-check your payment reference number or transaction screenshot and resubmit your payment.</li>
              <li>Ensure the full plan amount of <strong>ETB ${payment.amount_claimed}</strong> was sent to the designated account.</li>
              <li>If you believe this decision is in error, please contact our support team.</li>
            </ul>

            <div style="margin: 28px 0;">
              <a href="${appUrl}/membership" style="background-color: #f59e0b; color: #0f172a; font-weight: bold; text-decoration: none; padding: 12px 24px; border-radius: 4px; display: inline-block;">
                Review &amp; Resubmit Payment
              </a>
            </div>

            <p style="font-size: 12px; color: #64748b; margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
              This is an automated notification from Zahra's Page.
            </p>
          </div>
        `,
      });

      if (emailResult.error) {
        console.error(`Resend API returned error when notifying ${payment.user.email}:`, emailResult.error);
      } else {
        console.log(`Payment rejection email successfully dispatched to ${payment.user.email}. ID: ${emailResult.data?.id}`);
      }
    } catch (emailErr) {
      console.error(`Failed to send payment rejection email to user ${payment.user.id} (${payment.user.email}):`, emailErr);
    }

    return NextResponse.json({ success: true, action: 'rejected' });
  }
}
