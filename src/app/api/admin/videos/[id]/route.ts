import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { deleteMinIOObject } from '@/lib/minio';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { title, description, is_free, position } = body;

  const video = await prisma.video.findUnique({ where: { id: params.id } });
  if (!video) {
    return NextResponse.json({ error: 'Video not found' }, { status: 404 });
  }

  const freeFlag = video.source_type === 'embed' ? true : is_free !== undefined ? Boolean(is_free) : video.is_free;

  const updatedVideo = await prisma.video.update({
    where: { id: params.id },
    data: {
      ...(title && { title }),
      ...(description !== undefined && { description }),
      ...(position !== undefined && { position: parseInt(position) }),
      is_free: freeFlag,
    },
  });

  return NextResponse.json({ video: updatedVideo });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const video = await prisma.video.findUnique({ where: { id: params.id } });
  if (!video) {
    return NextResponse.json({ error: 'Video not found' }, { status: 404 });
  }

  // ORPHANED MINIO FILES ON DELETE FIX:
  // Clean up object file in MinIO if self_hosted, ensuring no orphaned file remains.
  if (video.source_type === 'self_hosted' && video.file_path) {
    await deleteMinIOObject(video.file_path);
  }

  await prisma.video.delete({
    where: { id: params.id },
  });

  return NextResponse.json({ success: true, deletedPath: video.file_path });
}
