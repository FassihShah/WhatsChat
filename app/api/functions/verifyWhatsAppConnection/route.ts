import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { config_id } = await req.json();
  if (!config_id) return NextResponse.json({ error: 'config_id required' }, { status: 400 });

  const config = await prisma.userWAConfig.findUnique({ where: { id: config_id } });
  if (!config) return NextResponse.json({ error: 'Config not found' }, { status: 404 });

  try {
    const res = await fetch(
      `https://graph.facebook.com/v18.0/${config.phone_number_id}?fields=display_phone_number,verified_name`,
      { headers: { Authorization: `Bearer ${config.access_token}` } }
    );
    const data: any = await res.json();

    if (!res.ok) {
      await prisma.userWAConfig.update({
        where: { id: config_id },
        data: { connection_status: 'error', error_message: data.error?.message || 'Verification failed' },
      });
      return NextResponse.json({ success: false, error: data.error?.message || 'Verification failed' });
    }

    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/functions/whatsappWebhook`;
    await prisma.userWAConfig.update({
      where: { id: config_id },
      data: {
        connection_status: 'connected',
        display_name: data.verified_name || data.display_phone_number,
        webhook_url: webhookUrl,
        error_message: null,
      },
    });

    return NextResponse.json({ success: true, display_name: data.verified_name, phone: data.display_phone_number });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
