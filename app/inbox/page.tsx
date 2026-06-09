'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { api } from '@/lib/api-client';
import AppLayout from '@/components/layout/AppLayout';
import ConversationList from '@/components/inbox/ConversationList';
import ChatArea from '@/components/inbox/ChatArea';
import LeadPanel from '@/components/inbox/LeadPanel';
import NewChatModal from '@/components/inbox/NewChatModal';

export default function InboxPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConv, setSelectedConv] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [activeView, setActiveView] = useState<'list' | 'chat'>('list');
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const isDragging = useRef(false);
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = session?.user?.id;

  useEffect(() => {
    if (!userId) return;

    (async () => {
      const configs = await api.entities.UserWAConfig.filter({ user_id: userId, is_active: true });
      if (!configs.length || configs[0].connection_status !== 'connected') {
        router.push('/setup');
        return;
      }
      const convs = await api.entities.Conversation.filter({ owner_user_id: userId }, '-last_message_time', 100);
      setConversations(convs);

      // Pre-select from URL param
      const idParam = searchParams.get('id');
      if (idParam) {
        const found = convs.find((c: any) => c.id === idParam);
        if (found) { setSelectedConv(found); setActiveView('chat'); }
      }
      setLoading(false);
    })();
  }, [userId, router, searchParams]);

  // Real-time subscription for conversations
  useEffect(() => {
    if (!userId) return;
    const unsubscribe = api.entities.Conversation.subscribe((event: any) => {
      const data = event.data;
      if (!data || data.owner_user_id !== userId) return;
      if (event.type === 'create') {
        setConversations((prev) => [data, ...prev]);
      } else if (event.type === 'update') {
        setConversations((prev) =>
          prev.map((c) => c.id === data.id ? data : c).sort((a, b) =>
            new Date(b.last_message_time || 0).getTime() - new Date(a.last_message_time || 0).getTime()
          )
        );
        setSelectedConv((prev: any) => prev?.id === data.id ? { ...prev, ...data } : prev);
      } else if (event.type === 'delete') {
        setConversations((prev) => prev.filter((c) => c.id !== data.id));
        setSelectedConv((prev: any) => prev?.id === data.id ? null : prev);
      }
    });
    return unsubscribe;
  }, [userId]);

  const handleSelectConv = async (conv: any) => {
    setSelectedConv(conv);
    setActiveView('chat');
    // Reset unread count
    if (conv.unread_count > 0) {
      await api.entities.Conversation.update(conv.id, { unread_count: 0 });
      setConversations((prev) => prev.map((c) => c.id === conv.id ? { ...c, unread_count: 0 } : c));
    }
  };

  const handleConversationUpdate = (updated: any) => {
    setConversations((prev) => prev.map((c) => c.id === updated.id ? updated : c));
    setSelectedConv(updated);
  };

  // Drag to resize sidebar
  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const onMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const newWidth = Math.min(480, Math.max(200, startWidth + e.clientX - startX));
      setSidebarWidth(newWidth);
    };
    const onUp = () => { isDragging.current = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const currentUser = userId ? { id: userId, full_name: session?.user?.name, email: session?.user?.email } : null;

  return (
    <AppLayout>
      <div className="flex h-full overflow-hidden">
        {/* Conversation list — hidden on mobile when chat is active */}
        <div
          className={`${activeView === 'chat' ? 'hidden md:flex' : 'flex'} flex-col border-r border-[#e9edef] shrink-0`}
          style={{ width: sidebarWidth }}
        >
          <ConversationList
            conversations={conversations}
            selectedId={selectedConv?.id}
            onSelect={handleSelectConv}
            onNewChat={() => setShowNewChat(true)}
            loading={loading}
          />
        </div>

        {/* Resize handle */}
        <div
          className="hidden md:block w-1 cursor-col-resize hover:bg-primary/20 transition-colors active:bg-primary/40 shrink-0"
          onMouseDown={handleMouseDown}
        />

        {/* Chat area */}
        <div className={`${activeView === 'list' ? 'hidden md:flex' : 'flex'} flex-1 min-w-0 overflow-hidden`}>
          <ChatArea
            conversation={selectedConv}
            onHandoverChange={(mode: string) => {
              setSelectedConv((prev: any) => prev ? {
                ...prev,
                handling_mode: mode === 'human' ? 'human' : 'ai',
                ai_paused: mode === 'paused',
              } : prev);
            }}
            onShowDetails={() => setShowDetails(!showDetails)}
            currentUser={currentUser}
            onBack={() => setActiveView('list')}
            onConversationUpdate={handleConversationUpdate}
          />

          {/* Lead details panel */}
          {showDetails && selectedConv && (
            <LeadPanel
              conversation={selectedConv}
              onUpdate={handleConversationUpdate}
              onClose={() => setShowDetails(false)}
            />
          )}
        </div>
      </div>

      {showNewChat && (
        <NewChatModal
          currentUser={currentUser}
          onClose={() => setShowNewChat(false)}
          onCreated={(conv: any) => {
            setConversations((prev) => [conv, ...prev]);
            setSelectedConv(conv);
            setActiveView('chat');
            setShowNewChat(false);
          }}
        />
      )}
    </AppLayout>
  );
}
