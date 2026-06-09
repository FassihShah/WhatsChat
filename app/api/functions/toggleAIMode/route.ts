import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { conversation_id, mode } = await req.json();
  if (!conversation_id || !mode) return NextResponse.json({ error: 'conversation_id and mode required' }, { status: 400 });

  const validModes = ['ai', 'human', 'paused'];
  if (!validModes.includes(mode)) return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });

  const messages: Record<string, string> = {
    ai: 'AI mode activated — AI agent is now handling this conversation.',
    human: 'Human takeover — AI agent paused. You are now handling this conversation.',
    paused: 'AI paused — AI is monitoring but not auto-replying.',
  };

  const updateData: any =
    mode === 'ai' ? { handling_mode: 'ai', ai_paused: false }
    : mode === 'human' ? { handling_mode: 'human', ai_paused: false }
    : { ai_paused: true };

  await prisma.conversation.update({ where: { id: conversation_id }, data: updateData });

  await prisma.message.create({
    data: {
      conversation_id,
      sender: 'system',
      message_type: 'system',
      content: messages[mode],
      timestamp: new Date(),
      status: 'sent',
    },
  });

  return NextResponse.json({ success: true, mode });
}
