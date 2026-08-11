import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import * as bcrypt from 'bcryptjs';
import { createAdminSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    const genericErrorMessage = 'Invalid email or password';

    if (!email || !password) {
      return NextResponse.json({ error: genericErrorMessage }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ error: genericErrorMessage }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: genericErrorMessage }, { status: 401 });
    }

    // Require the role to be either 'admin' or 'super_admin'
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return NextResponse.json({ error: genericErrorMessage }, { status: 401 });
    }

    // Check if admin account is deactivated (membership_status === 'expired')
    if (user.membership_status === 'expired') {
      return NextResponse.json(
        { error: 'This admin account has been deactivated. Please contact a Super Administrator.' },
        { status: 403 }
      );
    }

    await createAdminSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        membershipStatus: user.membership_status,
      },
    });
  } catch (error: any) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { error: 'Invalid email or password' },
      { status: 401 }
    );
  }
}
