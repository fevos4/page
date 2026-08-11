import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAdminSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAdminSession();
    if (!session || (session.role !== 'admin' && session.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const userId = params.id;
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Safety check: Prevent self-termination
    if (session.userId === userId) {
      return NextResponse.json({ error: 'You cannot terminate your own active admin session.' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Super admin hierarchy protection: only super_admin can terminate another super_admin/admin
    if (targetUser.role === 'super_admin' && session.role !== 'super_admin') {
      return NextResponse.json({ error: 'Only Super Admins can terminate Super Admin accounts.' }, { status: 403 });
    }

    // Delete related records to prevent FK violations
    await prisma.$transaction([
      prisma.payment.deleteMany({ where: { user_id: userId } }),
      prisma.user.delete({ where: { id: userId } }),
    ]);

    return NextResponse.json({ success: true, message: 'Account terminated successfully.' });
  } catch (error: any) {
    console.error('Error terminating user account:', error);
    return NextResponse.json({ error: error.message || 'Failed to terminate account.' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAdminSession();
    // Enforce Super Admin requirement
    if (!session || session.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden: Super Admin privilege required' }, { status: 403 });
    }

    const userId = params.id;
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Safety check: Prevent self-deactivation
    if (session.userId === userId) {
      return NextResponse.json({ error: 'You cannot deactivate your own active super admin session.' }, { status: 400 });
    }

    const body = await req.json();
    const { action } = body; // 'deactivate' | 'activate'

    if (action !== 'deactivate' && action !== 'activate') {
      return NextResponse.json({ error: 'Invalid action. Must be activate or deactivate.' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const newStatus = action === 'deactivate' ? 'expired' : 'active';
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        membership_status: newStatus,
        ...(action === 'activate' ? { membership_expiry_date: new Date('2035-01-01T00:00:00Z') } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Account ${action === 'deactivate' ? 'deactivated' : 'activated'} successfully.`,
      user: updatedUser,
    });
  } catch (error: any) {
    console.error('Error toggling account activation:', error);
    return NextResponse.json({ error: error.message || 'Failed to update account status.' }, { status: 500 });
  }
}
