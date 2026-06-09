import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { user_id } = await req.json();

  const configs = await prisma.userWAConfig.findMany({
    where: user_id ? { user_id, is_active: true } : { is_active: true },
  });
  if (!configs.length) return NextResponse.json({ error: 'No WA config' }, { status: 400 });
  const config = configs[0];

  const allTemplates: any[] = [];
  let after: string | null = null;
  let pageCount = 0;

  while (pageCount < 5) {
    const url = new URL(`https://graph.facebook.com/v18.0/${config.waba_id}/message_templates`);
    url.searchParams.set('limit', '100');
    url.searchParams.set('fields', 'id,name,status,category,language,components,rejected_reason');
    if (after) url.searchParams.set('after', after);

    const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${config.access_token}` } });
    const data: any = await res.json();
    if (!res.ok) break;

    allTemplates.push(...(data.data || []));
    after = data.paging?.cursors?.after;
    if (!after || !data.paging?.next) break;
    pageCount++;
  }

  let upserted = 0;
  for (const tpl of allTemplates) {
    const bodyComponent = tpl.components?.find((c: any) => c.type === 'BODY');
    const headerComponent = tpl.components?.find((c: any) => c.type === 'HEADER');
    const footerComponent = tpl.components?.find((c: any) => c.type === 'FOOTER');
    const buttonsComponent = tpl.components?.find((c: any) => c.type === 'BUTTONS');

    const bodyText = bodyComponent?.text || '';
    const varMatches = bodyText.match(/\{\{\d+\}\}/g) || [];
    const varCount = varMatches.length;

    try {
      await prisma.messageTemplate.upsert({
        where: { user_id_name: { user_id: user_id || config.user_id, name: tpl.name } },
        update: {
          status: tpl.status?.toLowerCase() || 'pending',
          variable_count: varCount,
          body_text: bodyText,
          header_text: headerComponent?.text || null,
          footer_text: footerComponent?.text || null,
          buttons: buttonsComponent?.buttons || null,
          rejection_reason: tpl.rejected_reason || null,
          meta_template_id: tpl.id,
          user_id: user_id || config.user_id,
        },
        create: {
          name: tpl.name,
          category: tpl.category || 'MARKETING',
          language: tpl.language || 'en',
          status: tpl.status?.toLowerCase() || 'pending',
          variable_count: varCount,
          body_text: bodyText,
          header_text: headerComponent?.text || null,
          footer_text: footerComponent?.text || null,
          buttons: buttonsComponent?.buttons || null,
          rejection_reason: tpl.rejected_reason || null,
          meta_template_id: tpl.id,
          user_id: user_id || config.user_id,
        },
      });
      upserted++;
    } catch (e) {
      console.error('Template upsert error:', e);
    }
  }

  return NextResponse.json({ success: true, total: allTemplates.length, upserted });
}
