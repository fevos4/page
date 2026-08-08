import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
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

  if (source_type === 'embed' && !embed_url) {
    return NextResponse.json({ error: 'embed_url is required for embed videos' }, { status: 400 });
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
      embed_url: embed_url || null,
      thumbnail_path: thumbnail_path || null,
      is_free: freeFlag,
      position: newPosition,
      uploaded_by: session.userId,
    },
  });

  return NextResponse.json({ video }, { status: 201 });
}
