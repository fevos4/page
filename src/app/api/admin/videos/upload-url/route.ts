import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { generatePresignedPutUrl } from '@/lib/minio';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { fileName, contentType } = body;

    if (!fileName || !contentType) {
      return NextResponse.json({ error: 'fileName and contentType are required' }, { status: 400 });
    }

    const objectPath = `videos/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const uploadUrl = await generatePresignedPutUrl(objectPath, contentType, 900);

    return NextResponse.json({ uploadUrl, objectPath });
  } catch (error: any) {
    console.error('Error generating presigned upload URL:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
}
