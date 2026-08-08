import { PrismaClient, Role, SourceType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clean existing data
  await prisma.payment.deleteMany();
  await prisma.video.deleteMany();
  await prisma.title.deleteMany();
  await prisma.membershipPlan.deleteMany();
  await prisma.user.deleteMany();

  // Create Admin User
  const adminPasswordHash = await bcrypt.hash('AdminPass123!', 10);
  const admin = await prisma.user.create({
    data: {
      name: 'Zahra Admin',
      email: 'admin@zahra.com',
      phone: '+251911000000',
      password_hash: adminPasswordHash,
      role: Role.admin,
      membership_status: 'active',
      membership_expiry_date: new Date('2030-01-01T00:00:00Z'),
    },
  });
  console.log('Created Admin User:', admin.email);

  // Create Membership Plan
  const monthlyPlan = await prisma.membershipPlan.create({
    data: {
      name: 'Monthly Membership',
      price: 500.0,
      duration_days: 30,
      is_active: true,
    },
  });
  console.log('Created Membership Plan:', monthlyPlan.name);

  // Create Sample Title 1
  const title1 = await prisma.title.create({
    data: {
      name: 'Bride of Charlie',
      description: 'An exclusive investigative documentary series diving deep into untold stories.',
      cover_image_path: 'covers/bride-of-charlie.jpg',
      position: 1,
      created_by: admin.id,
    },
  });

  // Create Sample Title 2
  const title2 = await prisma.title.create({
    data: {
      name: 'Behind the Scenes & Culture',
      description: 'Deep dives, unfiltered commentary, and behind-the-scenes perspectives.',
      cover_image_path: 'covers/behind-the-scenes.jpg',
      position: 2,
      created_by: admin.id,
    },
  });

  // Create Sample Videos for Title 1
  await prisma.video.createMany({
    data: [
      {
        title_id: title1.id,
        title: 'Episode 1: The Beginning (Free Trailer)',
        description: 'Public intro episode into the Bride of Charlie investigation.',
        source_type: SourceType.embed,
        embed_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        thumbnail_path: 'thumbnails/ep1.jpg',
        is_free: true,
        position: 1,
        uploaded_by: admin.id,
      },
      {
        title_id: title1.id,
        title: 'Episode 2: Uncovering the Clues',
        description: 'Members-only deep dive into key witnesses and documents.',
        source_type: SourceType.self_hosted,
        file_path: 'videos/bride-ep2.mp4',
        thumbnail_path: 'thumbnails/ep2.jpg',
        is_free: false,
        position: 2,
        uploaded_by: admin.id,
      },
      {
        title_id: title1.id,
        title: 'Episode 3: The Verdict',
        description: 'Exclusive finale analysis only accessible to active members.',
        source_type: SourceType.self_hosted,
        file_path: 'videos/bride-ep3.mp4',
        thumbnail_path: 'thumbnails/ep3.jpg',
        is_free: false,
        position: 3,
        uploaded_by: admin.id,
      },
    ],
  });

  // Create Sample Title 3 (Shorts Row - Vertical 9:16)
  const title3 = await prisma.title.create({
    data: {
      name: 'Shorts & Quick Takes',
      description: 'Quick vertical clips, highlights, and viral shorts.',
      cover_image_path: 'covers/shorts.jpg',
      position: 3,
      created_by: admin.id,
    },
  });

  // Create Sample Videos for Title 3 (Portrait Format)
  await prisma.video.createMany({
    data: [
      {
        title_id: title3.id,
        title: 'Quick Take #1: Truth in 60 Seconds',
        description: 'Free vertical short clip.',
        source_type: SourceType.embed,
        format: 'portrait',
        embed_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        thumbnail_path: 'thumbnails/short1.jpg',
        is_free: true,
        position: 1,
        uploaded_by: admin.id,
      },
      {
        title_id: title3.id,
        title: 'Members Short #2: Unfiltered Reaction',
        description: 'Members-only vertical quick take.',
        source_type: SourceType.self_hosted,
        format: 'portrait',
        file_path: 'videos/short2.mp4',
        thumbnail_path: 'thumbnails/short2.jpg',
        is_free: false,
        position: 2,
        uploaded_by: admin.id,
      },
      {
        title_id: title3.id,
        title: 'Members Short #3: Raw Behind-The-Scenes',
        description: 'Members-only portrait clip.',
        source_type: SourceType.self_hosted,
        format: 'portrait',
        file_path: 'videos/short3.mp4',
        thumbnail_path: 'thumbnails/short3.jpg',
        is_free: false,
        position: 3,
        uploaded_by: admin.id,
      },
    ],
  });

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
