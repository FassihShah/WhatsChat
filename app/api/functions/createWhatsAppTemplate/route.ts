import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { user_id, name, category, language, header_text, body_text, footer_text, buttons, variable_labels } = await req.json();

  if (!name || !body_text) return NextResponse.json({ error: 'name and body_text required' }, { status: 400 });
  if (!/^[a-z0-9_]+$/.test(name)) return NextResponse.json({ error: 'Template name: only lowercase, numbers, underscores' }, { status: 400 });

  const uid = user_id || session.user.id;
  const configs = await prisma.userWAConfig.findMany({ where: { user_id: uid, is_active: true } });
  if (!configs.length) return NextResponse.json({ error: 'No WA config found' }, { status: 400 });
  const config = configs[0];

  const varMatches = body_text.match(/\{\{\d+\}\}/g) || [];
  const varCount = varMatches.length;

  const components: any[] = [];
  if (header_text) components.push({ type: 'HEADER', format: 'TEXT', text: header_text });
  components.push({ type: 'BODY', text: body_text });
  if (footer_text) components.push({ type: 'FOOTER', text: footer_text });
  if (buttons?.length) components.push({ type: 'BUTTONS', buttons });

  const metaPayload = { name, category: category || 'MARKETING', language: language || 'en', components };

  const res = await fetch(`https://graph.facebook.com/v18.0/${config.waba_id}/message_templates`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(metaPayload),
  });
  const data: any = await res.json();

  if (!res.ok) {
    const errMsg = data.error?.message || 'Failed to create template';
    return NextResponse.json({ error: errMsg, meta_error: data.error }, { status: 400 });
  }

  const template = await prisma.messageTemplate.create({
    data: {
      user_id: uid,
      name,
      category: category || 'MARKETING',
      language: language || 'en',
      status: 'pending',
      header_text: header_text || null,
      body_text,
      footer_text: footer_text || null,
      buttons: buttons || null,
      variable_count: varCount,
      variable_labels: variable_labels || [],
      meta_template_id: data.id || null,
    },
  });

  return NextResponse.json({ success: true, template });
}
