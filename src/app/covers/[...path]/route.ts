import { NextRequest } from 'next/server';
import { handleMediaRequest } from '@/lib/mediaStream';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const filePath = params.path.join('/');
  return handleMediaRequest(`covers/${filePath}`);
}
