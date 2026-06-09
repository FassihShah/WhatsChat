import { NextRequest, NextResponse } from 'next/server';

// Dispatcher for named functions — proxies to individual route handlers
const FUNCTION_MAP: Record<string, string> = {
  sendWhatsAppMessage: '/api/functions/sendWhatsAppMessage',
  whatsappWebhook: '/api/functions/whatsappWebhook',
  toggleAIMode: '/api/functions/toggleAIMode',
  verifyWhatsAppConnection: '/api/functions/verifyWhatsAppConnection',
  getWhatsAppMedia: '/api/functions/getWhatsAppMedia',
  syncWhatsAppTemplates: '/api/functions/syncWhatsAppTemplates',
  generateTemplateWithAI: '/api/functions/generateTemplateWithAI',
  createOrUpdateWAConfig: '/api/functions/createOrUpdateWAConfig',
  createWhatsAppTemplate: '/api/functions/createWhatsAppTemplate',
  deleteWhatsAppTemplate: '/api/functions/deleteWhatsAppTemplate',
  checkTemplateStatus: '/api/functions/checkTemplateStatus',
};

export async function POST(req: NextRequest, { params }: { params: { name: string } }) {
  const target = FUNCTION_MAP[params.name];
  if (!target) {
    return NextResponse.json({ error: `Unknown function: ${params.name}` }, { status: 404 });
  }

  const body = await req.text();
  const url = new URL(target, req.url);

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: req.headers.get('cookie') || '' },
    body,
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
