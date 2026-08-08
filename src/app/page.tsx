import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import HomepageClient from './HomepageClient';

export default async function HomePage() {
  const session = await getSession();

  const rawTitles = await prisma.title.findMany({
    orderBy: { position: 'asc' },
    include: {
      videos: {
        orderBy: { position: 'asc' },
      },
    },
  });

  const titles = rawTitles.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    cover_image_path: t.cover_image_path,
    position: t.position,
    created_at: t.created_at.toISOString(),
    videos: t.videos.map((v) => ({
      id: v.id,
      title: v.title,
      description: v.description,
      source_type: v.source_type as 'self_hosted' | 'embed',
      format: v.format as 'landscape' | 'portrait',
      embed_url: v.embed_url,
      thumbnail_path: v.thumbnail_path,
      is_free: v.is_free,
      position: v.position,
    })),
  }));

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

  const user = session
    ? {
        name: session.name,
        email: session.email,
        role: session.role,
        membershipStatus: session.membershipStatus,
      }
    : null;

  return (
    <HomepageClient
      titles={titles}
      user={user}
      latestTitleName={latestTitleObj?.name || null}
      latestTitleCover={latestTitleObj?.cover_image_path || null}
      latestFreeVideo={latestFreeVideo}
    />
  );
}
