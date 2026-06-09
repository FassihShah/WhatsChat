import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { callLLM } from '@/lib/llm';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { description, category, language } = await req.json();
  if (!description) return NextResponse.json({ error: 'description required' }, { status: 400 });

  // Prompt is identical to original — only the LLM backend changes
  const prompt = `Generate a WhatsApp Business message template for the following use case: "${description}"

Category: ${category || 'MARKETING'}
Language: ${language || 'English'}

STRICT META REQUIREMENTS:
- Template name: only lowercase letters, numbers, underscores (no spaces, no capitals)
- Variables must use sequential {{1}}, {{2}}, etc. format
- Body text: max 1024 characters
- Header text: max 60 characters (optional)
- Footer text: max 60 characters (optional)
- Keep it concise and professional

Return ONLY valid JSON (no markdown, no explanation) in this exact format:
{
  "name": "template_name_here",
  "body": "Template body text with {{1}} variables",
  "header": "Optional header text or null",
  "footer": "Optional footer text or null",
  "variables": ["Variable 1 description", "Variable 2 description"],
  "buttons": []
}`;

  try {
    const text = await callLLM(prompt, 1024);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ error: 'AI returned invalid response' }, { status: 500 });

    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ success: true, template: parsed });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
