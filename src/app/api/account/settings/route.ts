import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import * as bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    const body = await req.json();
    const { name, currentPassword, newPassword, action } = body;

    // 1. Action: Cancel Membership
    if (action === 'cancel_membership') {
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
      });

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      if (user.membership_status !== 'active') {
        return NextResponse.json(
          { error: 'Only active memberships can be cancelled.' },
          { status: 400 }
        );
      }

      const now = new Date();
      await prisma.user.update({
        where: { id: session.userId },
        data: {
          membership_status: 'expired',
          membership_cancelled_at: now,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Membership cancelled successfully.',
      });
    }

    // 2. Action: Update Name or Change Password
    const currentUser = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updateData: { name?: string; password_hash?: string } = {};

    // Name Update
    if (name && name.trim() !== '') {
      updateData.name = name.trim();
    }

    // Password Change (Security check: requires currentPassword)
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'Current password is required to change password.' },
          { status: 400 }
        );
      }

      const isPasswordValid = await bcrypt.compare(currentPassword, currentUser.password_hash);
      if (!isPasswordValid) {
        return NextResponse.json({ error: 'Incorrect current password.' }, { status: 400 });
      }

      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: 'New password must be at least 6 characters.' },
          { status: 400 }
        );
      }

      updateData.password_hash = await bcrypt.hash(newPassword, 10);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No changes provided' }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.userId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      user: {
        name: updatedUser.name,
        email: updatedUser.email,
      },
    });
  } catch (error: any) {
    console.error('Error updating account settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
