import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const titles = await prisma.title.findMany({
    orderBy: { position: 'asc' },
    include: {
      videos: {
        orderBy: { position: 'asc' },
      },
    },
  });

  return NextResponse.json({ titles });
}
