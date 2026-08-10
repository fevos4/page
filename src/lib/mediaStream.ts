import { NextResponse } from 'next/server';
import { s3Client, BUCKET_NAME } from '@/lib/minio';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import path from 'path';
import fs from 'fs';

function getContentType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    case '.avif':
      return 'image/avif';
    case '.mp4':
      return 'video/mp4';
    case '.webm':
      return 'video/webm';
    default:
      return 'application/octet-stream';
  }
}

export async function handleMediaRequest(key: string) {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const response = await s3Client.send(command);

    if (response.Body) {
      const contentType = response.ContentType || getContentType(key);
      const stream = response.Body as any;

      return new NextResponse(stream, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }
  } catch (err: any) {
    // Object not found in MinIO
  }

  // Fallback for missing images (thumbnails/covers)
  if (key.startsWith('thumbnails/') || key.startsWith('covers/')) {
    const fallbackPath = path.join(process.cwd(), 'public', 'imgs', 'Hero 2.avif');
    if (fs.existsSync(fallbackPath)) {
      const buffer = fs.readFileSync(fallbackPath);
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'image/avif',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }
  }

  return new NextResponse('Media object not found', { status: 404 });
}
