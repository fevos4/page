import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'zahra-cron-secret-key-change-in-production';

    // Verify secret bearer token
    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized cron trigger' }, { status: 401 });
    }

    const now = new Date();

    // Query active members whose membership_expiry_date has passed
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
    });
  } catch (error: any) {
    console.error('Error running membership expiry cron:', error);
    return NextResponse.json({ error: 'Internal cron error' }, { status: 500 });
  }
}
