'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { api } from '@/lib/api-client';
import { MessageSquare, Users, Calendar, Bot, TrendingUp, ArrowRight, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AppLayout from '@/components/layout/AppLayout';
import { formatDistanceToNow } from 'date-fns';

const StatCard = ({ icon: Icon, label, value, sub, color }: any) => (
  <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow">
    <CardContent className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{label}</p>
          <p className="text-3xl font-bold mt-1 text-foreground">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function Dashboard() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [waConnected, setWaConnected] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!session?.user?.id) return;
    const userId = session.user.id;

    (async () => {
      const configs = await api.entities.UserWAConfig.filter({ user_id: userId, is_active: true });
      if (!configs.length || configs[0].connection_status !== 'connected') {
        router.push('/setup');
        return;
      }
      setWaConnected(true);
      const convs = await api.entities.Conversation.filter({ owner_user_id: userId }, '-last_message_time', 20);
      setConversations(convs);
      setLoading(false);
    })();
  }, [session, router]);

  const stats = {
    total: conversations.length,
    new: conversations.filter((c) => c.status === 'new').length,
    aiHandled: conversations.filter((c) => c.handling_mode === 'ai').length,
    appointments: conversations.filter((c) => ['scheduled', 'confirmed'].includes(c.appointment_status)).length,
    unread: conversations.reduce((a, c) => a + (c.unread_count || 0), 0),
    qualified: conversations.filter((c) => c.status === 'qualified').length,
  };

  return (
    <AppLayout>
      <div className="p-6 overflow-y-auto h-full space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Welcome back — here's what's happening today</p>
          </div>
          {waConnected && (
            <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-medium border border-emerald-200">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              WhatsApp Connected
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={MessageSquare} label="Total Conversations" value={loading ? '...' : stats.total} sub={`${stats.unread} unread`} color="bg-blue-50 text-blue-600" />
          <StatCard icon={Users} label="New Leads" value={loading ? '...' : stats.new} sub="Awaiting contact" color="bg-violet-50 text-violet-600" />
          <StatCard icon={Bot} label="AI Handled" value={loading ? '...' : stats.aiHandled} sub={`${stats.total ? Math.round((stats.aiHandled / stats.total) * 100) : 0}% automation rate`} color="bg-primary/10 text-primary" />
          <StatCard icon={Calendar} label="Appointments" value={loading ? '...' : stats.appointments} sub="Scheduled / confirmed" color="bg-amber-50 text-amber-600" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { href: '/inbox', icon: MessageSquare, label: 'Open Inbox', sub: `${stats.unread} unread messages`, color: 'bg-primary/10 text-primary', hoverColor: 'bg-primary/20' },
            { href: '/leads', icon: Users, label: 'View Leads', sub: `${stats.qualified} qualified leads`, color: 'bg-violet-50 text-violet-600', hoverColor: 'bg-violet-100' },
            { href: '/knowledge', icon: Zap, label: 'AI Knowledge Base', sub: 'Manage what AI knows', color: 'bg-amber-50 text-amber-600', hoverColor: 'bg-amber-100' },
          ].map(({ href, icon: Icon, label, sub, color, hoverColor }) => (
            <Link key={href} href={href} className="group">
              <Card className="border-border/60 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center group-hover:${hoverColor} transition-colors`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{label}</p>
                    <p className="text-xs text-muted-foreground">{sub}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Recent Conversations</CardTitle>
              <Link href="/inbox">
                <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 text-xs">
                  View all <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Loading...</div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center">
                <MessageSquare className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No conversations yet</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {conversations.slice(0, 6).map((conv) => (
                  <Link key={conv.id} href={`/inbox?id=${conv.id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/40 transition-colors">
                    <div className="relative shrink-0">
                      <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-sm font-semibold text-primary">
                          {(conv.customer_name || conv.customer_phone || '?')[0].toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium truncate">{conv.customer_name || conv.customer_phone}</p>
                        <span className="text-xs text-muted-foreground ml-2 shrink-0">
                          {conv.last_message_time ? formatDistanceToNow(new Date(conv.last_message_time), { addSuffix: true }) : ''}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{conv.last_message || 'No messages yet'}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {conv.unread_count > 0 && (
                        <Badge className="bg-primary text-white text-xs h-4 min-w-4 px-1 rounded-full border-0">{conv.unread_count}</Badge>
                      )}
                      <Badge variant="secondary" className={`text-xs border-0 ${conv.handling_mode === 'ai' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                        {conv.handling_mode === 'ai' ? 'AI' : 'Human'}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
