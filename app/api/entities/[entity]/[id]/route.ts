import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const ENTITY_MAP: Record<string, any> = {
  Conversation: prisma.conversation,
  Message: prisma.message,
  UserWAConfig: prisma.userWAConfig,
  MessageTemplate: prisma.messageTemplate,
  KnowledgeBase: prisma.knowledgeBase,
  AppSettings: prisma.appSettings,
  AutomationRule: prisma.automationRule,
  TeamMember: prisma.teamMember,
  User: prisma.user,
};

function getModel(entity: string) {
  const model = ENTITY_MAP[entity];
  if (!model) throw new Error(`Unknown entity: ${entity}`);
  return model;
}

export async function GET(req: NextRequest, { params }: { params: { entity: string; id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const model = getModel(params.entity);
    const result = await model.findUnique({ where: { id: params.id } });
    if (!result) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { entity: string; id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const model = getModel(params.entity);
    const data = await req.json();
    const result = await model.update({ where: { id: params.id }, data });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { entity: string; id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const model = getModel(params.entity);
    await model.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
