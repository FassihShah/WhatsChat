import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      user_id,
      phone,
      message,
      media_url,
      media_base64,
      media_type,
      media_name,
      caption,
      conversation_id,
      template_name,
      language_code,
      template_variables,
    } = body;

    if (!phone)
      return NextResponse.json({ success: false, error: 'phone is required', whatsapp_message_id: null, error_code: 'MISSING_PHONE' });
    if (!user_id)
      return NextResponse.json({ success: false, error: 'user_id is required', whatsapp_message_id: null, error_code: 'MISSING_USER_ID' });

    // Get WA config
    let configs = await prisma.userWAConfig.findMany({ where: { user_id, is_active: true } });
    if (!configs.length) {
      configs = await prisma.userWAConfig.findMany({ where: { is_active: true } });
    }
    if (!configs.length) {
      return NextResponse.json({ success: false, error: 'WhatsApp not configured.', whatsapp_message_id: null, error_code: 'NO_CONFIG' });
    }
    const userConfig = configs[0];
    const toPhone = String(phone).replace(/[^\d]/g, '');

    // Duplicate detection (10s window)
    if (message && conversation_id) {
      const tenSecondsAgo = new Date(Date.now() - 10000);
      const recentMsgs = await prisma.message.findMany({
        where: { conversation_id, content: message, sender: 'agent', timestamp: { gt: tenSecondsAgo } },
      });
      if (recentMsgs.length > 0) {
        return NextResponse.json({ success: true, whatsapp_message_id: recentMsgs[0]?.whatsapp_message_id || null, error: null, error_code: null });
      }
    }

    // Template sending
    if (template_name && template_variables) {
      const msgPayload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: toPhone,
        type: 'template',
        template: {
          name: template_name,
          language: { code: language_code || 'en' },
          components: [{ type: 'body', parameters: template_variables.map((v: any) => ({ type: 'text', text: String(v) })) }],
        },
      };

      const delays = [0, 1000, 2000];
      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0) await sleep(delays[attempt]);
        const sendRes = await fetch(`https://graph.facebook.com/v18.0/${userConfig.phone_number_id}/messages`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${userConfig.access_token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(msgPayload),
        });
        const sendData: any = await sendRes.json();
        if (!sendRes.ok) {
          const errCode = sendData.error?.code;
          if (errCode === 131047) return NextResponse.json({ success: false, whatsapp_message_id: null, error_code: 'WINDOW_CLOSED', error: '24-hour messaging window closed. Use a template.' });
          if (errCode === 132000) return NextResponse.json({ success: false, whatsapp_message_id: null, error_code: 'TEMPLATE_NOT_FOUND', error: 'Template not found on Meta.' });
          if (errCode === 132001) return NextResponse.json({ success: false, whatsapp_message_id: null, error_code: 'TEMPLATE_PAUSED', error: 'This template is paused by Meta.' });
          if (errCode === 131026) return NextResponse.json({ success: false, whatsapp_message_id: null, error_code: 'PHONE_NOT_WA', error: 'This phone number is not on WhatsApp.' });
          if (sendRes.status === 401) {
            await prisma.userWAConfig.update({ where: { id: userConfig.id }, data: { connection_status: 'error', error_message: 'Token expired' } });
            return NextResponse.json({ success: false, whatsapp_message_id: null, error: 'WhatsApp token expired.', error_code: 'TOKEN_EXPIRED' });
          }
          if (attempt === 2) return NextResponse.json({ success: false, whatsapp_message_id: null, error: sendData.error?.message || 'Failed', error_code: 'SEND_FAILED' });
        } else {
          return NextResponse.json({ success: true, whatsapp_message_id: sendData.messages?.[0]?.id || null, error: null, error_code: null });
        }
      }
    }

    // Upload base64 media to Meta
    let resolvedMediaId: string | null = null;
    if (media_base64 && media_type) {
      const base64Data = media_base64.includes(',') ? media_base64.split(',')[1] : media_base64;
      const mimeType = media_base64.includes(',') ? media_base64.split(';')[0].replace('data:', '') : 'application/octet-stream';
      const bytes = Buffer.from(base64Data, 'base64');

      const formData = new FormData();
      formData.append('messaging_product', 'whatsapp');
      formData.append('file', new Blob([bytes], { type: mimeType }), media_name || 'upload');

      const uploadRes = await fetch(`https://graph.facebook.com/v18.0/${userConfig.phone_number_id}/media`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${userConfig.access_token}` },
        body: formData,
      });
      const uploadData: any = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.id) {
        return NextResponse.json({ success: false, error: 'Media upload to WhatsApp failed', whatsapp_message_id: null, error_code: 'MEDIA_UPLOAD_FAILED' });
      }
      resolvedMediaId = uploadData.id;
    }

    let msgPayload: any;
    const typeMap: Record<string, string> = { image: 'image', video: 'video', document: 'document', audio: 'audio' };

    if (resolvedMediaId) {
      const waType = typeMap[media_type] || 'document';
      const mediaObj: any = { id: resolvedMediaId };
      if (media_type === 'document' && media_name) mediaObj.filename = media_name;
      if (caption) mediaObj.caption = caption;
      msgPayload = { messaging_product: 'whatsapp', to: toPhone, type: waType, [waType]: mediaObj };
    } else if (media_url && media_type) {
      const waType = typeMap[media_type] || 'document';
      const mediaObj: any = { link: media_url };
      if (media_type === 'document' && media_name) mediaObj.filename = media_name;
      if (caption) mediaObj.caption = caption;
      msgPayload = { messaging_product: 'whatsapp', to: toPhone, type: waType, [waType]: mediaObj };
    } else if (message) {
      msgPayload = { messaging_product: 'whatsapp', recipient_type: 'individual', to: toPhone, type: 'text', text: { preview_url: false, body: message } };
    } else {
      return NextResponse.json({ success: false, error: 'message or media required', whatsapp_message_id: null, error_code: 'MISSING_CONTENT' });
    }

    const delays = [0, 1000, 2000];
    let lastError: string | null = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) await sleep(delays[attempt]);
      const sendRes = await fetch(`https://graph.facebook.com/v18.0/${userConfig.phone_number_id}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${userConfig.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(msgPayload),
      });
      const sendData: any = await sendRes.json();

      if (sendRes.ok) {
        return NextResponse.json({ success: true, whatsapp_message_id: sendData.messages?.[0]?.id || null, media_id: resolvedMediaId, error: null, error_code: null });
      }
      if (sendRes.status === 401) {
        await prisma.userWAConfig.update({ where: { id: userConfig.id }, data: { connection_status: 'error', error_message: 'Token expired' } });
        return NextResponse.json({ success: false, whatsapp_message_id: null, error: 'WhatsApp token expired.', error_code: 'TOKEN_EXPIRED' });
      }
      if (sendRes.status === 429) {
        await sleep(5000);
        const retryRes = await fetch(`https://graph.facebook.com/v18.0/${userConfig.phone_number_id}/messages`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${userConfig.access_token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(msgPayload),
        });
        if (retryRes.ok) {
          const retryData: any = await retryRes.json();
          return NextResponse.json({ success: true, whatsapp_message_id: retryData.messages?.[0]?.id || null, error: null, error_code: null });
        }
        return NextResponse.json({ success: false, whatsapp_message_id: null, error: 'Rate limit hit.', error_code: 'RATE_LIMITED' });
      }
      lastError = sendData.error?.message || 'Failed to send message';
    }

    return NextResponse.json({ success: false, whatsapp_message_id: null, error: lastError, error_code: 'SEND_FAILED' });
  } catch (error: any) {
    console.error('sendWhatsAppMessage error:', error.message);
    return NextResponse.json({ success: false, whatsapp_message_id: null, error: error.message, error_code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
