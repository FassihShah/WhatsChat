import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { callLLM } from '@/lib/llm';

function storeMediaId(mediaId: string | undefined) {
  return mediaId ? `wa-media-id:${mediaId}` : null;
}

// GET — webhook verification (unchanged WhatsApp handshake)
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token) {
    const config = await prisma.userWAConfig.findFirst({ where: { verify_token: token, is_active: true } });
    if (config) {
      return new NextResponse(challenge, { status: 200 });
    }
  }
  return new NextResponse('Forbidden', { status: 403 });
}

// POST — incoming messages (all WhatsApp API logic unchanged)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const entry = body?.entry?.[0];
    const change = entry?.changes?.[0]?.value;

    if (!change) return new NextResponse('OK', { status: 200 });

    const phoneNumberId = change?.metadata?.phone_number_id;
    if (!phoneNumberId) return NextResponse.json({ status: 'no_phone_id' }, { status: 200 });

    const userConfig = await prisma.userWAConfig.findFirst({ where: { phone_number_id: phoneNumberId, is_active: true } });
    if (!userConfig) return NextResponse.json({ status: 'unregistered' }, { status: 200 });

    const ownerUserId = userConfig.user_id;

    // Status updates
    if (change.statuses?.length > 0) {
      for (const status of change.statuses) {
        try {
          const msg = await prisma.message.findFirst({ where: { whatsapp_message_id: status.id } });
          if (msg) {
            const newStatus = status.status === 'read' ? 'read' : status.status === 'delivered' ? 'delivered' : 'sent';
            await prisma.message.update({ where: { id: msg.id }, data: { status: newStatus } });
          }
        } catch (err: any) {
          console.error('Status update error:', err.message);
        }
      }
      return new NextResponse('OK', { status: 200 });
    }

    if (!change.messages?.length) return new NextResponse('OK', { status: 200 });

    for (const message of change.messages) {
      const phone: string = message.from;
      const waMessageId: string = message.id;
      const timestamp = new Date(parseInt(message.timestamp) * 1000).toISOString();

      // Deduplication — identical to original
      const existing = await prisma.message.findFirst({ where: { whatsapp_message_id: waMessageId } });
      if (existing) continue;

      let messageType = 'text';
      let content = '';
      let mediaUrl: string | null = null;
      let mediaName: string | null = null;

      if (message.type === 'text') {
        content = message.text?.body || '';
        if (!content.trim()) continue;
      } else if (message.type === 'audio') {
        messageType = 'audio';
        mediaUrl = storeMediaId(message.audio?.id);
        content = '[Voice Message]';
        mediaName = `voice-${waMessageId}.ogg`;
      } else if (message.type === 'image') {
        messageType = 'image';
        mediaUrl = storeMediaId(message.image?.id);
        content = message.image?.caption || '[Image]';
        mediaName = `image-${waMessageId}`;
      } else if (message.type === 'document') {
        messageType = 'document';
        mediaUrl = storeMediaId(message.document?.id);
        content = message.document?.filename || '[Document]';
        mediaName = message.document?.filename || null;
      } else if (message.type === 'video') {
        messageType = 'video';
        mediaUrl = storeMediaId(message.video?.id);
        content = message.video?.caption || '[Video]';
        mediaName = `video-${waMessageId}`;
      } else {
        continue;
      }

      // Find or create conversation — identical logic
      let conversation = await prisma.conversation.findFirst({
        where: { customer_phone: phone, owner_user_id: ownerUserId },
      });

      if (!conversation) {
        const contact = change.contacts?.find((c: any) => c.wa_id === phone);
        conversation = await prisma.conversation.create({
          data: {
            owner_user_id: ownerUserId,
            customer_phone: phone,
            customer_name: contact?.profile?.name || phone,
            last_message: content,
            last_message_time: new Date(timestamp),
            unread_count: 1,
            status: 'new',
            handling_mode: 'ai',
            ai_paused: false,
          },
        });
      } else {
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: {
            last_message: content,
            last_message_time: new Date(timestamp),
            unread_count: { increment: 1 },
          },
        });
      }

      // Save incoming message
      await prisma.message.create({
        data: {
          conversation_id: conversation.id,
          sender: 'customer',
          content,
          message_type: messageType,
          media_url: mediaUrl,
          media_name: mediaName,
          whatsapp_message_id: waMessageId,
          timestamp: new Date(timestamp),
          status: 'delivered',
        },
      });

      // AI auto-reply guard — identical conditions
      const [freshConv, aiSettings] = await Promise.all([
        prisma.conversation.findFirst({ where: { customer_phone: phone, owner_user_id: ownerUserId } }),
        prisma.appSettings.findMany({ where: { category: 'ai_agent' } }),
      ]);

      const settingsMap: Record<string, string> = {};
      aiSettings.forEach((s) => { if (s.value) settingsMap[s.key] = s.value; });
      const aiGloballyEnabled = settingsMap['ai_enabled'] !== 'false';
      const aiGlobalMode = settingsMap['ai_mode'] || 'auto';
      const autoSendEnabled = aiGloballyEnabled && aiGlobalMode === 'auto';

      const aiShouldReply =
        messageType === 'text' &&
        content.trim() &&
        autoSendEnabled &&
        freshConv?.handling_mode === 'ai' &&
        freshConv?.ai_paused !== true &&
        freshConv?.status !== 'closed';

      if (!aiShouldReply) continue;

      try {
        const [prevMessages, kbEntries] = await Promise.all([
          prisma.message.findMany({
            where: { conversation_id: freshConv!.id },
            orderBy: { timestamp: 'asc' },
            take: 20,
          }),
          prisma.knowledgeBase.findMany({
            where: { is_active: true },
            orderBy: { created_date: 'desc' },
            take: 50,
          }),
        ]);

        const historyText = prevMessages
          .filter((m) => m.sender !== 'system' && m.message_type !== 'internal_note')
          .map((m) => `${m.sender === 'customer' ? 'Customer' : 'Assistant'}: ${m.content}`)
          .join('\n');

        const kbText = kbEntries
          .map((kb) => {
            if (kb.content_type === 'faq' && kb.faq_question && kb.faq_answer) {
              return `Q: ${kb.faq_question}\nA: ${kb.faq_answer}`;
            }
            return kb.content ? `[${kb.category}] ${kb.title}:\n${kb.content}` : `[${kb.category}] ${kb.title}`;
          })
          .join('\n\n');

        const systemPrompt =
          settingsMap['ai_system_prompt'] ||
          'You are a helpful business assistant on WhatsApp. Be concise, friendly, and professional. Keep responses short (1-3 sentences).';

        const promptText = `${systemPrompt}\n\n${kbText ? `--- KNOWLEDGE BASE ---\n${kbText}\n--- END KNOWLEDGE BASE ---\n` : ''}${historyText ? `Previous conversation:\n${historyText}\n` : ''}Customer's latest message: "${content}"\n\nRespond naturally and helpfully. Keep it brief (1-3 sentences max).`;

        // DeepSeek replaces Anthropic — same prompt, same logic
        const aiReply = await callLLM(promptText, 256);
        if (!aiReply) continue;

        // Race condition check — identical
        const raceConv = await prisma.conversation.findFirst({ where: { customer_phone: phone, owner_user_id: ownerUserId } });
        if (raceConv?.handling_mode !== 'ai' || raceConv?.ai_paused === true) continue;

        // Send via WhatsApp Graph API — unchanged
        const sendRes = await fetch(`https://graph.facebook.com/v18.0/${userConfig.phone_number_id}/messages`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${userConfig.access_token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ messaging_product: 'whatsapp', to: phone, type: 'text', text: { body: aiReply } }),
        });
        const sendData: any = await sendRes.json();
        const msgStatus = sendRes.ok ? 'sent' : 'failed';

        await prisma.message.create({
          data: {
            conversation_id: freshConv!.id,
            sender: 'ai',
            content: aiReply,
            message_type: 'text',
            timestamp: new Date(),
            status: msgStatus,
            whatsapp_message_id: sendData.messages?.[0]?.id || null,
          },
        });

        await prisma.conversation.update({
          where: { id: freshConv!.id },
          data: { last_message: aiReply, last_message_time: new Date() },
        });
      } catch (err: any) {
        console.error('AI reply error:', err.message);
      }
    }

    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ status: 'error' }, { status: 200 });
  }
}
