import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { generatePresignedPutUrl } from '@/lib/minio';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const rawFileName = body.fileName || body.filename;
    const { contentType } = body;

    if (!rawFileName || !contentType) {
      return NextResponse.json({ error: 'fileName and contentType are required' }, { status: 400 });
    }

    // Clean filename
    const cleanBaseName = rawFileName.replace(/\\/g, '/').split('/').pop() || '';
    const cleanFileName = cleanBaseName.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    // Maintain directory prefixes (e.g. covers/ or videos/)
    let objectPath = `uploads/${Date.now()}-${cleanFileName}`;
    if (rawFileName.startsWith('covers/')) {
      objectPath = `covers/${Date.now()}-${cleanFileName}`;
    } else if (rawFileName.startsWith('videos/')) {
      objectPath = `videos/${Date.now()}-${cleanFileName}`;
    }

    const uploadUrl = await generatePresignedPutUrl(objectPath, contentType, 900);

    return NextResponse.json({ uploadUrl, objectKey: objectPath });
  } catch (error: any) {
    console.error('Error generating presigned upload URL:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
}
