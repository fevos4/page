import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { generatePresignedGetUrl } from '@/lib/minio';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

    // Playability check: is_free = true OR active membership in DB
    let isPlayable = video.is_free;

    if (!isPlayable) {
      const session = await getSession();
      if (session && session.userId) {
        const dbUser = await prisma.user.findUnique({
          where: { id: session.userId },
          select: { membership_status: true, membership_expiry_date: true },
        });

        if (dbUser && dbUser.membership_status === 'active') {
          if (!dbUser.membership_expiry_date || new Date(dbUser.membership_expiry_date) > new Date()) {
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
        {
          status: 403,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
        }
      );
    }

    if (video.source_type === 'embed') {
      return NextResponse.json(
        {
          playable: true,
          source_type: 'embed',
          embed_url: video.embed_url,
        },
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
        }
      );
    }

    if (!video.file_path) {
      return NextResponse.json({ error: 'Video file path missing' }, { status: 404 });
    }

    const playUrl = await generatePresignedGetUrl(video.file_path, 900);

    return NextResponse.json(
      {
        playable: true,
        source_type: 'self_hosted',
        play_url: playUrl,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  } catch (error: any) {
    console.error('Error generating play URL:', error);
    return NextResponse.json({ error: 'Failed to access video' }, { status: 500 });
  }
}
