import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key');

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return handleCron(req);
}

export async function POST(req: NextRequest) {
  return handleCron(req);
}

async function handleCron(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'zahra-cron-secret-key-change-in-production';

    const isBearerValid = authHeader === `Bearer ${cronSecret}`;
    if (!isBearerValid) {
      return NextResponse.json({ error: 'Unauthorized cron trigger' }, { status: 401 });
    }

    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    // 1. Send Renewal Reminders (3 days prior to expiration)
    const upcomingExpiringUsers = await prisma.user.findMany({
      where: {
        membership_status: 'active',
        membership_expiry_date: {
          gte: now,
          lte: threeDaysFromNow,
        },
        renewal_reminder_sent: false,
      },
    });

    let remindersSentCount = 0;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    for (const user of upcomingExpiringUsers) {
      try {
        const formattedDate = user.membership_expiry_date
          ? new Date(user.membership_expiry_date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })
          : 'soon';

        await resend.emails.send({
          from: 'Zahra Page <reminders@zahra.com>',
          to: [user.email],
          subject: "Your Zahra's Page membership expires soon",
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
              <h2 style="color: #f59e0b;">Zahra's Page Membership Expiry Notice</h2>
              <p>Hi ${user.name},</p>
              <p>Your membership on <strong>Zahra's Page</strong> is set to expire on <strong>${formattedDate}</strong>.</p>
              <p>To continue enjoying uninterrupted access to exclusive documentaries and ad-free content, please renew your membership.</p>
              <div style="margin: 24px 0;">
                <a href="${appUrl}/membership" style="background-color: #f59e0b; color: #0f172a; font-weight: bold; text-decoration: none; padding: 12px 24px; border-radius: 4px; display: inline-block;">
                  Renew Membership Now
                </a>
              </div>
              <p style="font-size: 12px; color: #64748b;">If you have already submitted a renewal payment, your account will update automatically once verified.</p>
            </div>
          `,
        });

        await prisma.user.update({
          where: { id: user.id },
          data: { renewal_reminder_sent: true },
        });

        remindersSentCount++;
      } catch (emailErr) {
        console.error(`Failed to send renewal reminder email to user ${user.id} (${user.email}):`, emailErr);
      }
    }

    // 2. Process Expired Memberships
    const expiredUsers = await prisma.user.updateMany({
      where: {
        membership_status: 'active',
        membership_expiry_date: {
          lte: now,
        },
      },
      data: {
        membership_status: 'expired',
      },
    });

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      expiredCount: expiredUsers.count,
      remindersSentCount,
    });
  } catch (error: any) {
    console.error('Error running membership expiry & reminder cron:', error);
    return NextResponse.json({ error: 'Internal cron error' }, { status: 500 });
  }
}
