import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { name, description, cover_image_path, position } = body;

  const updatedTitle = await prisma.title.update({
    where: { id: params.id },
    data: {
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(cover_image_path !== undefined && { cover_image_path }),
      ...(position !== undefined && { position: parseInt(position) }),
    },
  });

  return NextResponse.json({ title: updatedTitle });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.title.delete({
    where: { id: params.id },
  });

  return NextResponse.json({ success: true });
}
