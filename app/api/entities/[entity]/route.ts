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

function parseWhere(whereStr: string | null): Record<string, any> {
  if (!whereStr) return {};
  try {
    return JSON.parse(whereStr);
  } catch {
    return {};
  }
}

function buildOrderBy(orderByStr: string | null) {
  if (!orderByStr) return { created_date: 'desc' as const };
  const desc = orderByStr.startsWith('-');
  const field = desc ? orderByStr.slice(1) : orderByStr;
  return { [field]: desc ? 'desc' : 'asc' } as any;
}

export async function GET(req: NextRequest, { params }: { params: { entity: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const model = getModel(params.entity);
    const url = new URL(req.url);
    const where = parseWhere(url.searchParams.get('where'));
    const orderBy = buildOrderBy(url.searchParams.get('orderBy'));
    const limit = parseInt(url.searchParams.get('limit') || '100', 10);

    const results = await model.findMany({ where, orderBy, take: Math.min(limit, 500) });
    return NextResponse.json(results);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { entity: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const model = getModel(params.entity);
    const data = await req.json();
    const result = await model.create({ data });
    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
