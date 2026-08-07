import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { generatePresignedGetUrl } from '@/lib/minio';

export async function GET(
  req: NextRequest,
  { params }: { params: { videoId: string } }
) {
  try {
    const videoId = params.videoId;
    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }

    const video = await prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // Embed videos rule check
    if (video.source_type === 'embed') {
      if (!video.is_free) {
        return NextResponse.json({ error: 'Embed videos must be free' }, { status: 400 });
      }
      return NextResponse.json({
        playable: true,
        source_type: 'embed',
        embed_url: video.embed_url,
      });
    }

    // Self-hosted video playability check: is_free = true OR active membership
    let isPlayable = video.is_free;

    if (!isPlayable) {
      const session = await getSession();
      if (session) {
        // Fetch fresh user membership status from DB
        const user = await prisma.user.findUnique({
          where: { id: session.userId },
          select: { membership_status: true, membership_expiry_date: true },
        });

        if (user && user.membership_status === 'active') {
          // Check expiry date if present
          if (!user.membership_expiry_date || new Date(user.membership_expiry_date) > new Date()) {
            isPlayable = true;
          }
        }
      }
    }

    if (!isPlayable) {
      return NextResponse.json(
        {
          playable: false,
          error: 'Members-only content. Active membership required.',
        },
        { status: 403 }
      );
    }

    if (!video.file_path) {
      return NextResponse.json({ error: 'Video file path missing' }, { status: 404 });
    }

    // Server-side presigned URL generation (valid 15 minutes)
    const playUrl = await generatePresignedGetUrl(video.file_path, 900);

    return NextResponse.json({
      playable: true,
      source_type: 'self_hosted',
      play_url: playUrl,
    });
  } catch (error: any) {
    console.error('Error generating play URL:', error);
    return NextResponse.json({ error: 'Failed to access video' }, { status: 500 });
  }
}
