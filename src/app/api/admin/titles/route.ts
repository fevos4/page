import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

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

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { name, description, cover_image_path, position } = body;

  if (!name) {
    return NextResponse.json({ error: 'Title name is required' }, { status: 400 });
  }

  const titleCount = await prisma.title.count();
  const newPosition = position !== undefined ? parseInt(position) : titleCount + 1;

  const title = await prisma.title.create({
    data: {
      name,
      description: description || null,
      cover_image_path: cover_image_path || null,
      position: newPosition,
      created_by: session.userId,
    },
  });

  return NextResponse.json({ title }, { status: 201 });
}
