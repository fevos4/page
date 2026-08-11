import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { generatePresignedGetUrl } from '@/lib/minio';
import HomepageClient from '@/app/HomepageClient';
import { setRequestLocale } from 'next-intl/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HomePage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);

  const rawTitles = await prisma.title.findMany({
    orderBy: { position: 'asc' },
    include: {
      videos: {
        orderBy: { position: 'asc' },
      },
    },
  });

  // Resolve cover image paths AND video thumbnail paths → presigned URLs (1 hour expiry)
  const titles = await Promise.all(
    rawTitles.map(async (t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      cover_image_path: t.cover_image_path
        ? await generatePresignedGetUrl(t.cover_image_path, 3600).catch(() => null)
        : null,
      position: t.position,
      created_at: t.created_at.toISOString(),
      videos: await Promise.all(
        t.videos.map(async (v) => ({
          id: v.id,
          title: v.title,
          description: v.description,
          source_type: v.source_type as 'self_hosted' | 'embed',
          format: v.format as 'landscape' | 'portrait',
          embed_url: v.embed_url,
          // Resolve thumbnail to a presigned URL if set; null otherwise
          thumbnail_path: v.thumbnail_path
            ? await generatePresignedGetUrl(v.thumbnail_path, 3600).catch(() => null)
            : null,
          is_free: v.is_free,
          position: v.position,
        }))
      ),
    }))
  );

  // Fetch most recently created Title name and cover image for the hero section
  const latestTitleObj = await prisma.title.findFirst({
    orderBy: { created_at: 'desc' },
    select: { name: true, cover_image_path: true, id: true },
  });

  // Fetch most recently added FREE video for the "Watch Free Preview" CTA
  const latestFreeVideoObj = await prisma.video.findFirst({
    where: { is_free: true },
    orderBy: { created_at: 'desc' },
  });

  const latestFreeVideo = latestFreeVideoObj
    ? {
        id: latestFreeVideoObj.id,
        title: latestFreeVideoObj.title,
        description: latestFreeVideoObj.description,
        source_type: latestFreeVideoObj.source_type as 'self_hosted' | 'embed',
        embed_url: latestFreeVideoObj.embed_url,
        thumbnail_path: latestFreeVideoObj.thumbnail_path,
        is_free: latestFreeVideoObj.is_free,
        position: latestFreeVideoObj.position,
      }
    : null;

  const session = await getSession();

  let user = null;
  if (session && session.userId) {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        membership_status: true,
      },
    });

    if (dbUser) {
      user = {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        role: dbUser.role,
        membershipStatus: dbUser.membership_status,
      };
    }
  }

  // Generate presigned URL for hero cover image (1 hour expiry)
  const heroCover = latestTitleObj?.cover_image_path
    ? await generatePresignedGetUrl(latestTitleObj.cover_image_path, 3600).catch(() => null)
    : null;

  return (
    <HomepageClient
      titles={titles}
      user={user}
      latestTitleName={latestTitleObj?.name || null}
      latestTitleCover={heroCover}
      latestFreeVideo={latestFreeVideo}
    />
  );
}
