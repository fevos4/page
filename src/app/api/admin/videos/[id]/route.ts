import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAdminSession } from '@/lib/auth';
import { deleteMinIOObject } from '@/lib/minio';
import { normalizeEmbedUrl } from '@/lib/videoUtils';

export const dynamic = 'force-dynamic';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getAdminSession();
  if (!session || (session.role !== 'admin' && session.role !== 'super_admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { title, description, is_free, downloadable, position, format, source_type, embed_url } = body;

  const video = await prisma.video.findUnique({ where: { id: params.id } });
  if (!video) {
    return NextResponse.json({ error: 'Video not found' }, { status: 404 });
  }

  const newSourceType = source_type || video.source_type;
  const newFormat = format ? (format === 'portrait' ? 'portrait' : 'landscape') : video.format;

  // Embed video rule check: If source_type is 'embed', is_free MUST be true
  const freeFlag = newSourceType === 'embed' ? true : is_free !== undefined ? Boolean(is_free) : video.is_free;
  const downloadableFlag = newSourceType === 'self_hosted' ? (downloadable !== undefined ? Boolean(downloadable) : video.downloadable) : false;

  let normalizedEmbedUrl: string | null = video.embed_url;

  if (newSourceType === 'embed') {
    const rawEmbedUrl = embed_url !== undefined ? embed_url : video.embed_url;
    if (!rawEmbedUrl) {
      return NextResponse.json({ error: 'embed_url is required for embed videos' }, { status: 400 });
    }
    try {
      normalizedEmbedUrl = normalizeEmbedUrl(rawEmbedUrl);
    } catch (err: any) {
      return NextResponse.json(
        { error: err.message || "Couldn't recognize this as a valid YouTube or TikTok video URL. Please paste a direct video link." },
        { status: 400 }
      );
    }
  } else {
    normalizedEmbedUrl = null;
  }

  const updatedVideo = await prisma.video.update({
    where: { id: params.id },
    data: {
      ...(title && { title }),
      ...(description !== undefined && { description }),
      ...(position !== undefined && { position: parseInt(position) }),
      source_type: newSourceType,
      format: newFormat,
      embed_url: normalizedEmbedUrl,
      is_free: freeFlag,
      downloadable: downloadableFlag,
    },
  });

  return NextResponse.json({ video: updatedVideo });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getAdminSession();
  if (!session || (session.role !== 'admin' && session.role !== 'super_admin')) {
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
