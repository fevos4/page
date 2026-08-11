import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import * as bcrypt from 'bcryptjs';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admins = await prisma.user.findMany({
    where: {
      role: {
        in: ['admin', 'super_admin'],
      },
    },
    orderBy: { created_at: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      created_at: true,
    },
  });

  return NextResponse.json({ admins });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    // Enforce super_admin permissions server-side
    if (!session || session.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden: Super Admin privilege required' }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, password, role } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    if (role !== 'admin' && role !== 'super_admin') {
      return NextResponse.json({ error: 'Invalid role selection' }, { status: 400 });
    }

    // Check if email already exists (matching regular user signup logic)
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'This email is already registered' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newAdmin = await prisma.user.create({
      data: {
        name,
        email,
        password_hash: hashedPassword,
        role: role === 'super_admin' ? 'super_admin' : 'admin',
        membership_status: 'active', // default active membership for admin accounts
        membership_expiry_date: new Date('2035-01-01T00:00:00Z'),
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: newAdmin.id,
        name: newAdmin.name,
        email: newAdmin.email,
        role: newAdmin.role,
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating admin account:', error);
    return NextResponse.json({ error: 'Failed to create admin account' }, { status: 500 });
  }
}
