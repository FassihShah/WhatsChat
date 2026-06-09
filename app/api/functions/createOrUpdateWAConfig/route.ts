import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { user_id, phone_number_id, access_token, waba_id, display_name } = await req.json();
  const uid = user_id || session.user.id;

  const verifyToken = randomUUID();
  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/functions/whatsappWebhook`;

  const existing = await prisma.userWAConfig.findFirst({ where: { user_id: uid, is_active: true } });

  let config;
  if (existing) {
    config = await prisma.userWAConfig.update({
      where: { id: existing.id },
      data: {
        phone_number_id: phone_number_id || existing.phone_number_id,
        access_token: access_token || existing.access_token,
        waba_id: waba_id || existing.waba_id,
        display_name: display_name || existing.display_name,
        verify_token: verifyToken,
        webhook_url: webhookUrl,
        connection_status: 'pending',
        error_message: null,
      },
    });
  } else {
    config = await prisma.userWAConfig.create({
      data: {
        user_id: uid,
        phone_number_id,
        access_token,
        waba_id,
        display_name,
        verify_token: verifyToken,
        webhook_url: webhookUrl,
        connection_status: 'pending',
        is_active: true,
      },
    });
  }

  return NextResponse.json({ success: true, config });
}
