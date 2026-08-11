import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAdminSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getAdminSession();
  if (!session || (session.role !== 'admin' && session.role !== 'super_admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = params;
  const body = await req.json();
  const { name, description, cover_image_path } = body;

  try {
    const updated = await prisma.title.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(cover_image_path !== undefined && { cover_image_path }),
      },
    });

    return NextResponse.json({ title: updated });
  } catch (error: any) {
    console.error('Error updating title:', error);
    return NextResponse.json({ error: 'Failed to update title' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getAdminSession();
  if (!session || (session.role !== 'admin' && session.role !== 'super_admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.title.delete({
    where: { id: params.id },
  });

  return NextResponse.json({ success: true });
}
