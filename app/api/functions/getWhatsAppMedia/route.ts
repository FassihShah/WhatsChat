import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const mediaCache = new Map<string, { data: any; expires: number }>();

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { media_id, user_id } = await req.json();
  if (!media_id) return NextResponse.json({ error: 'media_id required' }, { status: 400 });

  const cleanId = media_id.replace('wa-media-id:', '');

  // Cache check (5 min)
  const cached = mediaCache.get(cleanId);
  if (cached && cached.expires > Date.now()) {
    return NextResponse.json(cached.data);
  }

  const configs = await prisma.userWAConfig.findMany({
    where: user_id ? { user_id, is_active: true } : { is_active: true },
  });
  if (!configs.length) return NextResponse.json({ error: 'No WA config' }, { status: 400 });
  const config = configs[0];

  try {
    // Get media URL from Meta
    const metaRes = await fetch(`https://graph.facebook.com/v18.0/${cleanId}`, {
      headers: { Authorization: `Bearer ${config.access_token}` },
    });
    const metaData: any = await metaRes.json();
    if (!metaRes.ok) return NextResponse.json({ error: metaData.error?.message || 'Failed to get media' }, { status: 400 });

    const mediaUrl: string = metaData.url;
    const mimeType: string = metaData.mime_type || 'application/octet-stream';

    // Download media bytes
    const dlRes = await fetch(mediaUrl, { headers: { Authorization: `Bearer ${config.access_token}` } });
    if (!dlRes.ok) return NextResponse.json({ error: 'Failed to download media' }, { status: 400 });

    const buffer = await dlRes.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64}`;

    // Extract filename from URL or mime
    const urlPath = new URL(mediaUrl).pathname;
    const rawFilename = urlPath.split('/').pop() || 'file';
    const ext = mimeType.split('/')[1]?.split(';')[0] || 'bin';
    const filename = rawFilename.includes('.') ? rawFilename : `${rawFilename}.${ext}`;

    const mediaType = mimeType.startsWith('image/') ? 'image'
      : mimeType.startsWith('audio/') ? 'audio'
      : mimeType.startsWith('video/') ? 'video'
      : 'document';

    const result = { data_url: dataUrl, media_type: mediaType, filename, mime_type: mimeType };

    // Cache 5 minutes
    mediaCache.set(cleanId, { data: result, expires: Date.now() + 5 * 60 * 1000 });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
