import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAdminSession } from '@/lib/auth';
import { normalizeEmbedUrl } from '@/lib/videoUtils';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session || (session.role !== 'admin' && session.role !== 'super_admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const {
    title_id,
    title,
    description,
    source_type,
    format,
    file_path,
    embed_url,
    thumbnail_path,
    is_free,
    downloadable,
    position,
  } = body;

  if (!title_id || !title || !source_type) {
    return NextResponse.json(
      { error: 'title_id, title, and source_type are required' },
      { status: 400 }
    );
  }

  const videoFormat = format === 'portrait' ? 'portrait' : 'landscape';

  // Embed video rule check: If source_type is 'embed', is_free MUST be true
  const freeFlag = source_type === 'embed' ? true : Boolean(is_free);
  const downloadableFlag = source_type === 'self_hosted' ? Boolean(downloadable) : false;

  let normalizedEmbedUrl: string | null = null;
  if (source_type === 'embed') {
    if (!embed_url) {
      return NextResponse.json({ error: 'embed_url is required for embed videos' }, { status: 400 });
    }
    try {
      normalizedEmbedUrl = normalizeEmbedUrl(embed_url);
    } catch (err: any) {
      return NextResponse.json(
        { error: err.message || "Couldn't recognize this as a valid YouTube or TikTok video URL. Please paste a direct video link." },
        { status: 400 }
      );
    }
  }

  if (source_type === 'self_hosted' && !file_path) {
    return NextResponse.json(
      { error: 'file_path is required for self_hosted videos' },
      { status: 400 }
    );
  }

  const videoCount = await prisma.video.count({ where: { title_id } });
  const newPosition = position !== undefined ? parseInt(position) : videoCount + 1;

  // VIDEO RECORD CREATION TIMING:
  // Created ONLY after client confirms direct-to-MinIO PUT upload succeeded.
  const video = await prisma.video.create({
    data: {
      title_id,
      title,
      description: description || null,
      source_type,
      format: videoFormat,
      file_path: file_path || null,
      embed_url: normalizedEmbedUrl,
      thumbnail_path: thumbnail_path || null,
      is_free: freeFlag,
      downloadable: downloadableFlag,
      position: newPosition,
      uploaded_by: session.userId,
    },
  });

  return NextResponse.json({ video }, { status: 201 });
}
