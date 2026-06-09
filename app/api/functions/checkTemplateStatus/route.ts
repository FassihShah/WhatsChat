import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { template_id, user_id } = await req.json();
  if (!template_id) return NextResponse.json({ error: 'template_id required' }, { status: 400 });

  const uid = user_id || session.user.id;
  const template = await prisma.messageTemplate.findUnique({ where: { id: template_id } });
  if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });

  const configs = await prisma.userWAConfig.findMany({ where: { user_id: uid, is_active: true } });
  if (!configs.length) return NextResponse.json({ error: 'No WA config' }, { status: 400 });
  const config = configs[0];

  const res = await fetch(
    `https://graph.facebook.com/v18.0/${config.waba_id}/message_templates?name=${template.name}&fields=status,rejected_reason`,
    { headers: { Authorization: `Bearer ${config.access_token}` } }
  );
  const data: any = await res.json();
  if (!res.ok) return NextResponse.json({ error: data.error?.message || 'Failed' }, { status: 400 });

  const metaTemplate = data.data?.[0];
  if (!metaTemplate) return NextResponse.json({ error: 'Template not found on Meta' }, { status: 404 });

  const newStatus = metaTemplate.status?.toLowerCase() || template.status;
  await prisma.messageTemplate.update({
    where: { id: template_id },
    data: { status: newStatus, rejection_reason: metaTemplate.rejected_reason || null },
  });

  return NextResponse.json({ success: true, status: newStatus, rejection_reason: metaTemplate.rejected_reason });
}
