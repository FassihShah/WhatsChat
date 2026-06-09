/**
 * Client-side API client — replaces base44Client.
 * Provides the same interface as the original base44 SDK:
 *   - entities.X.list() / filter() / create() / update() / delete() / subscribe()
 *   - functions.invoke(name, body)
 *   - auth.me()
 */

const BASE = '';

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw Object.assign(new Error(err.error || 'Request failed'), { status: res.status, data: err });
  }
  return res.json();
}

// ── Entity proxy ────────────────────────────────────────────────────────────
function makeEntity(name: string) {
  const base = `/api/entities/${name}`;

  return {
    async list(orderBy?: string, limit?: number) {
      const params = new URLSearchParams();
      if (orderBy) params.set('orderBy', orderBy);
      if (limit) params.set('limit', String(limit));
      return apiFetch(`${base}?${params}`);
    },

    async filter(where: Record<string, any>, orderBy?: string, limit?: number) {
      const params = new URLSearchParams();
      params.set('where', JSON.stringify(where));
      if (orderBy) params.set('orderBy', orderBy);
      if (limit) params.set('limit', String(limit));
      return apiFetch(`${base}?${params}`);
    },

    async get(id: string) {
      return apiFetch(`${base}/${id}`);
    },

    async create(data: Record<string, any>) {
      return apiFetch(base, { method: 'POST', body: JSON.stringify(data) });
    },

    async update(id: string, data: Record<string, any>) {
      return apiFetch(`${base}/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
    },

    async delete(id: string) {
      return apiFetch(`${base}/${id}`, { method: 'DELETE' });
    },

    /**
     * Real-time subscription using Supabase Realtime (SSE fallback).
     * Returns an unsubscribe function.
     */
    subscribe(callback: (event: { type: 'create' | 'update' | 'delete'; data: any }) => void) {
      // Dynamically import supabase client to avoid SSR issues
      let channel: any = null;
      let active = true;

      import('@/lib/supabase').then(({ supabase }) => {
        if (!active) return;
        const tableName = entityToTable(name);
        channel = supabase
          .channel(`${tableName}-changes`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: tableName },
            (payload: any) => {
              if (!active) return;
              const type = payload.eventType === 'INSERT' ? 'create'
                : payload.eventType === 'UPDATE' ? 'update'
                : 'delete';
              const data = payload.new || payload.old;
              callback({ type, data });
            }
          )
          .subscribe();
      });

      return () => {
        active = false;
        if (channel) {
          import('@/lib/supabase').then(({ supabase }) => {
            supabase.removeChannel(channel);
          });
        }
      };
    },
  };
}

function entityToTable(name: string): string {
  const map: Record<string, string> = {
    Conversation: 'conversations',
    Message: 'messages',
    UserWAConfig: 'user_wa_configs',
    MessageTemplate: 'message_templates',
    KnowledgeBase: 'knowledge_base',
    AppSettings: 'app_settings',
    AutomationRule: 'automation_rules',
    TeamMember: 'team_members',
    User: 'users',
  };
  return map[name] || name.toLowerCase();
}

// ── Auth ────────────────────────────────────────────────────────────────────
const auth = {
  async me() {
    return apiFetch('/api/auth/me');
  },
};

// ── Functions ────────────────────────────────────────────────────────────────
const functions = {
  async invoke(name: string, body: Record<string, any>) {
    const res = await apiFetch(`/api/functions/${name}`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return { data: res };
  },
};

// ── Main export ──────────────────────────────────────────────────────────────
export const api = {
  auth,
  functions,
  entities: new Proxy({} as Record<string, ReturnType<typeof makeEntity>>, {
    get(_, name: string) {
      return makeEntity(name);
    },
  }),
};

// Alias for drop-in replacement
export const base44 = api;
