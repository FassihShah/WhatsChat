'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api-client';
import {
  Send, Bot, MoreVertical, StickyNote, Zap, X, Paperclip,
  Mic, Square, Info, ChevronDown, ArrowLeft, AlertTriangle,
  CheckCircle, RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday } from 'date-fns';
import MessageBubble from './MessageBubble';
import MediaPreview from './MediaPreview';
import AIModeControl from './AIModeControl';

const QUICK_REPLIES = [
  'Thank you for reaching out! How can I help you today?',
  "I'd be happy to schedule a meeting with you. What time works best?",
  'Could you please share more details about your requirements?',
  'Our team will get back to you within 24 hours.',
];

// ─── Date divider ─────────────────────────────────────────────────────────────
function DateDivider({ date }: { date: Date }) {
  const label = isToday(date) ? 'Today' : isYesterday(date) ? 'Yesterday' : format(date, 'MMMM d, yyyy');
  return (
    <div className="flex items-center justify-center my-3 select-none">
      <span className="bg-[#e1f2fb]/90 text-[#54656f] text-[11.5px] font-medium px-3 py-1 rounded-full shadow-sm">
        {label}
      </span>
    </div>
  );
}

function groupMessagesByDate(messages: any[]) {
  const groups: any[] = [];
  let lastDate: string | null = null;
  for (const msg of messages) {
    const d = msg.timestamp ? new Date(msg.timestamp) : null;
    const dateKey = d ? format(d, 'yyyy-MM-dd') : null;
    if (dateKey && dateKey !== lastDate) {
      groups.push({ type: 'divider', date: d, key: 'div-' + dateKey });
      lastDate = dateKey;
    }
    groups.push({ type: 'msg', msg });
  }
  return groups;
}

// ─── Typing dots ──────────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex justify-start mb-2 px-1">
      <div className="bg-white rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full bg-[#adb5bd] inline-block"
            style={{ animation: `chatbounce 1.2s ease-in-out ${i * 0.18}s infinite` }}
          />
        ))}
      </div>
    </div>
  );
}

interface Props {
  conversation: any;
  onHandoverChange?: (mode: string) => void;
  onShowDetails?: () => void;
  currentUser: any;
  onBack?: () => void;
  onConversationUpdate?: (conv: any) => void;
}

export default function ChatArea({
  conversation,
  onHandoverChange,
  onShowDetails,
  currentUser,
  onBack,
  onConversationUpdate,
}: Props) {
  const [messages, setMessages] = useState<any[]>([]);
  const [liveConv, setLiveConv] = useState(conversation);
  const [input, setInput] = useState('');
  const [noteMode, setNoteMode] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<any>(null);
  const [mediaPreview, setMediaPreview] = useState<any>(null);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<any>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setLiveConv(conversation); }, [conversation]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Load messages + real-time subscription — identical logic to original
  useEffect(() => {
    if (!conversation?.id) return;
    setLoadingMessages(true);
    setSendError(null);
    setMessages([]);

    api.entities.Message.filter({ conversation_id: conversation.id }, 'timestamp', 100)
      .then((msgs: any[]) => {
        setMessages(msgs || []);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'auto' }), 50);
      })
      .catch(() => setMessages([]))
      .finally(() => setLoadingMessages(false));

    const unsubscribe = api.entities.Message.subscribe((event: any) => {
      if (event.data?.conversation_id !== conversation.id) return;
      if (event.type === 'create') {
        setIsTyping(false);
        setMessages((prev) => {
          if (prev.some((m) => m.id === event.data.id)) return prev;
          const updated = [...prev, event.data];
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
          return updated;
        });
      } else if (event.type === 'update') {
        setMessages((prev) => prev.map((m) => (m.id === event.data.id ? event.data : m)));
      } else if (event.type === 'delete') {
        setMessages((prev) => prev.filter((m) => m.id !== event.data.id));
      }
    });

    return unsubscribe;
  }, [conversation?.id]);

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 200);
  };

  const getMediaType = (file: File) => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    return 'document';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setMediaPreview({ file, url, type: getMediaType(file), name: file.name });
    e.target.value = '';
  };

  // Voice recording — identical logic to original
  const handleVoiceRecord = async () => {
    if (recording) { mediaRecorder?.stop(); return; }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType =
      ['audio/mp4', 'audio/aac', 'audio/ogg;codecs=opus', 'audio/webm;codecs=opus', 'audio/webm']
        .find((t) => MediaRecorder.isTypeSupported(t)) || '';
    const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks: Blob[] = [];
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    mr.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      setRecording(false);
      if (!chunks.length) return;
      const blob = new Blob(chunks, { type: mr.mimeType || 'audio/webm' });
      const ext = (mr.mimeType || '').includes('mp4') ? 'voice-message.mp4'
        : (mr.mimeType || '').includes('ogg') ? 'voice-message.ogg' : 'voice-message.webm';
      const url = URL.createObjectURL(blob);
      const file = new File([blob], ext, { type: blob.type });
      setMediaPreview({ file, url, type: 'audio', name: ext });
    };
    mr.start();
    setMediaRecorder(mr);
    setRecording(true);
  };

  // Send media — identical logic to original
  const sendMedia = async () => {
    if (!mediaPreview || !conversation) return;
    setSending(true);
    setSendError(null);
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(mediaPreview.file);
    });
    try {
      const res = await api.functions.invoke('sendWhatsAppMessage', {
        user_id: currentUser?.id,
        phone: conversation.customer_phone,
        media_base64: base64,
        media_type: mediaPreview.type,
        media_name: mediaPreview.name,
        caption: input.trim() || undefined,
        conversation_id: conversation.id,
      });
      if (!res?.data?.success) {
        setSendError({ content: mediaPreview.name, type: 'media', error: res?.data?.error });
        return;
      }
      await api.entities.Message.create({
        conversation_id: conversation.id,
        sender: 'agent',
        message_type: mediaPreview.type,
        content: input.trim() || mediaPreview.name,
        media_url: base64,
        media_name: mediaPreview.name,
        timestamp: new Date().toISOString(),
        status: 'sent',
        whatsapp_message_id: res.data.whatsapp_message_id || null,
        agent_name: currentUser?.full_name || 'Agent',
      });
      await api.entities.Conversation.update(conversation.id, {
        last_message: `[${mediaPreview.type}] ${mediaPreview.name}`,
        last_message_time: new Date().toISOString(),
      });
      setMediaPreview(null);
      setInput('');
    } finally {
      setSending(false);
    }
  };

  // Send text — identical logic to original
  const doSendText = async (content: string) => {
    setSending(true);
    setSendError(null);
    const res = await api.functions.invoke('sendWhatsAppMessage', {
      user_id: currentUser?.id,
      phone: conversation.customer_phone,
      message: content,
      conversation_id: conversation.id,
    });
    if (!res?.data?.success) {
      setSendError({ content, type: 'text', error: res?.data?.error });
      setSending(false);
      return false;
    }
    await api.entities.Message.create({
      conversation_id: conversation.id,
      sender: 'agent',
      message_type: 'text',
      content,
      timestamp: new Date().toISOString(),
      status: 'sent',
      whatsapp_message_id: res.data.whatsapp_message_id || null,
      agent_name: currentUser?.full_name || 'Agent',
    });
    await api.entities.Conversation.update(conversation.id, {
      last_message: content,
      last_message_time: new Date().toISOString(),
    });
    setSending(false);
    return true;
  };

  // Main send — identical logic to original
  const sendMessage = async () => {
    if (mediaPreview) { await sendMedia(); return; }
    if (!input.trim() || !conversation) return;
    const content = input.trim();
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    if (noteMode) {
      setSending(true);
      await api.entities.Message.create({
        conversation_id: conversation.id,
        sender: 'system',
        message_type: 'internal_note',
        content,
        timestamp: new Date().toISOString(),
        status: 'sent',
        agent_name: currentUser?.full_name || 'Agent',
      });
      await api.entities.Conversation.update(conversation.id, {
        last_message: '[Note] ' + content,
        last_message_time: new Date().toISOString(),
      });
      setSending(false);
      return;
    }
    await doSendText(content);
  };

  // Mark resolved / reopen — identical logic to original
  const handleMarkResolved = async () => {
    setShowMenu(false);
    await api.entities.Conversation.update(liveConv.id, { status: 'closed' });
    await api.entities.Message.create({
      conversation_id: liveConv.id,
      sender: 'system',
      message_type: 'system',
      content: 'Conversation marked as resolved',
      timestamp: new Date().toISOString(),
      status: 'sent',
    });
    const updated = { ...liveConv, status: 'closed' };
    setLiveConv(updated);
    onConversationUpdate?.(updated);
  };

  const handleReopen = async () => {
    setShowMenu(false);
    await api.entities.Conversation.update(liveConv.id, { status: 'contacted' });
    await api.entities.Message.create({
      conversation_id: liveConv.id,
      sender: 'system',
      message_type: 'system',
      content: 'Conversation reopened',
      timestamp: new Date().toISOString(),
      status: 'sent',
    });
    const updated = { ...liveConv, status: 'contacted' };
    setLiveConv(updated);
    onConversationUpdate?.(updated);
  };

  // AI mode — identical logic to original
  const handleModeChange = (newMode: string) => {
    const updated = { ...liveConv };
    if (newMode === 'ai') { updated.handling_mode = 'ai'; updated.ai_paused = false; }
    else if (newMode === 'human') { updated.handling_mode = 'human'; updated.ai_paused = false; }
    else if (newMode === 'paused') { updated.ai_paused = true; }
    setLiveConv(updated);
    onHandoverChange?.(newMode);
  };

  // ─── Empty placeholder ────────────────────────────────────────────────────
  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#f0f2f5]">
        <div className="w-24 h-24 rounded-full bg-white shadow-md flex items-center justify-center mb-5">
          <Bot className="w-12 h-12 text-[#128c7e]" />
        </div>
        <h3 className="text-xl font-light text-[#41525d] mb-2">WhatsChat AI</h3>
        <p className="text-sm text-[#667781]">Select a conversation to start chatting</p>
      </div>
    );
  }

  const aiActive = liveConv?.handling_mode === 'ai' && !liveConv?.ai_paused;
  const isClosed = liveConv?.status === 'closed';
  const initials = (liveConv?.customer_name || liveConv?.customer_phone || '?')[0].toUpperCase();
  const grouped = groupMessagesByDate(messages);

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-2 px-3 md:px-4 py-2 bg-[#f0f2f5] border-b border-[#e9edef] shrink-0"
        style={{ minHeight: 60 }}
      >
        {onBack && (
          <button
            onClick={onBack}
            className="md:hidden w-10 h-10 rounded-full flex items-center justify-center hover:bg-[#e9edef] transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-[#54656f]" />
          </button>
        )}

        {/* Avatar with AI indicator dot */}
        <div className="relative shrink-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#128c7e] to-[#25d366] flex items-center justify-center shadow-sm select-none">
            <span className="text-sm font-bold text-white">{initials}</span>
          </div>
          {aiActive && (
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-[#25d366] rounded-full border-2 border-[#f0f2f5] flex items-center justify-center">
              <Bot className="w-2.5 h-2.5 text-white" />
            </div>
          )}
        </div>

        {/* Name */}
        <div className="flex-1 min-w-0 ml-0.5">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-[#111b21] truncate leading-snug">
              {liveConv?.customer_name || liveConv?.customer_phone}
            </p>
            {isClosed && (
              <span className="shrink-0 text-[10px] font-bold bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full">
                CLOSED
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#667781] truncate">{liveConv?.customer_phone}</p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <AIModeControl conversation={liveConv} onModeChange={handleModeChange} />
          <button
            onClick={onShowDetails}
            className="w-9 h-9 rounded-full hover:bg-[#e9edef] flex items-center justify-center transition-colors"
            title="Lead details"
          >
            <Info className="w-5 h-5 text-[#54656f]" />
          </button>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu((v) => !v)}
              className="w-9 h-9 rounded-full hover:bg-[#e9edef] flex items-center justify-center transition-colors"
            >
              <MoreVertical className="w-5 h-5 text-[#54656f]" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-11 z-50 bg-white rounded-2xl shadow-xl border border-[#e9edef] min-w-[190px] overflow-hidden py-1">
                {!isClosed ? (
                  <button
                    onClick={handleMarkResolved}
                    className="w-full text-left flex items-center gap-3 px-4 py-2.5 text-sm text-[#111b21] hover:bg-[#f0f2f5] transition-colors"
                  >
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    Mark as Resolved
                  </button>
                ) : (
                  <button
                    onClick={handleReopen}
                    className="w-full text-left flex items-center gap-3 px-4 py-2.5 text-sm text-[#111b21] hover:bg-[#f0f2f5] transition-colors"
                  >
                    <RotateCcw className="w-4 h-4 text-blue-500 shrink-0" />
                    Reopen Conversation
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Mode banner ─────────────────────────────────────────────────────── */}
      {!aiActive && !isClosed && (
        <div className={cn(
          'flex items-center justify-center gap-1.5 py-1 text-[11.5px] font-semibold border-b',
          liveConv?.ai_paused
            ? 'bg-amber-50 text-amber-700 border-amber-100'
            : 'bg-blue-50 text-blue-700 border-blue-100',
        )}>
          {liveConv?.ai_paused
            ? '⏸  AI paused — you are replying manually'
            : '🙋  Human agent mode — AI is off'}
        </div>
      )}

      {/* ── Message list ─────────────────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 py-2"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h60v60H0z' fill='%23e5ddd5'/%3E%3Cpath d='M30 0l30 30-30 30L0 30z' fill='%23ddd5cc' fill-opacity='0.3'/%3E%3C/svg%3E")`,
          backgroundColor: '#e5ddd5',
        }}
      >
        {loadingMessages ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-7 h-7 border-[3px] border-[#128c7e]/20 border-t-[#128c7e] rounded-full animate-spin" />
          </div>
        ) : grouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full pb-10 select-none">
            <div className="w-16 h-16 rounded-full bg-white/80 shadow-sm flex items-center justify-center mb-3">
              <Bot className="w-8 h-8 text-[#128c7e]" />
            </div>
            <p className="text-sm text-[#667781] font-medium">No messages yet</p>
            <p className="text-xs text-[#adb5bd] mt-1">Say hello 👋</p>
          </div>
        ) : (
          <>
            {grouped.map((item, i) =>
              item.type === 'divider'
                ? <DateDivider key={item.key} date={item.date} />
                : <MessageBubble key={item.msg.id || i} msg={item.msg} userId={currentUser?.id} conversation={liveConv} />
            )}
            {isTyping && <TypingIndicator />}
          </>
        )}
        <div ref={bottomRef} className="h-1" />
      </div>

      {/* ── Scroll-to-bottom button ──────────────────────────────────────────── */}
      {showScrollBtn && (
        <button
          onClick={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })}
          className="absolute bottom-28 right-5 z-10 w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors"
        >
          <ChevronDown className="w-5 h-5 text-[#54656f]" />
        </button>
      )}

      {/* ── Send error ───────────────────────────────────────────────────────── */}
      {sendError?.type === 'text' && (
        <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border-t border-red-100 shrink-0">
          <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
          <span className="text-xs text-red-600 flex-1 truncate">
            Failed to send — {sendError.error || 'tap to retry'}
          </span>
          <button
            onClick={async () => { const c = sendError.content; setSendError(null); await doSendText(c); }}
            className="text-xs font-bold text-red-700 underline shrink-0"
          >
            Retry
          </button>
          <button onClick={() => setSendError(null)} className="p-0.5 rounded hover:bg-red-100 shrink-0">
            <X className="w-3 h-3 text-red-400" />
          </button>
        </div>
      )}

      {/* ── Quick replies ────────────────────────────────────────────────────── */}
      {showQuickReplies && (
        <div className="bg-white border-t border-[#e9edef] px-4 py-3 shrink-0 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-bold text-[#128c7e] uppercase tracking-wider">Quick Replies</span>
            <button onClick={() => setShowQuickReplies(false)} className="p-1 rounded-full hover:bg-gray-100">
              <X className="w-3.5 h-3.5 text-[#667781]" />
            </button>
          </div>
          <div className="flex flex-col gap-1.5">
            {QUICK_REPLIES.map((r, i) => (
              <button
                key={i}
                onClick={() => {
                  setInput(r);
                  setShowQuickReplies(false);
                  setTimeout(() => textareaRef.current?.focus(), 50);
                }}
                className="text-left text-[13px] px-3 py-2 rounded-xl hover:bg-[#f0f2f5] transition-colors text-[#111b21] border border-[#e9edef] hover:border-[#128c7e]/30"
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Media preview ────────────────────────────────────────────────────── */}
      {mediaPreview && (
        <MediaPreview
          preview={mediaPreview}
          onCancel={() => { if (!sending) setMediaPreview(null); }}
          caption={input}
          onCaptionChange={setInput}
          onSend={sendMedia}
          sending={sending}
        />
      )}

      {/* ── Note banner ──────────────────────────────────────────────────────── */}
      {noteMode && !mediaPreview && (
        <div className="flex items-center gap-2 px-4 py-1.5 bg-amber-50 border-t border-amber-100 shrink-0">
          <StickyNote className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span className="text-xs text-amber-700 font-medium flex-1">Internal note — not visible to customer</span>
          <button onClick={() => setNoteMode(false)} className="p-0.5 rounded hover:bg-amber-100">
            <X className="w-3 h-3 text-amber-500" />
          </button>
        </div>
      )}

      {/* ── Recording banner ─────────────────────────────────────────────────── */}
      {recording && (
        <div className="flex items-center justify-between gap-2 px-4 py-2 bg-red-50 border-t border-red-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs text-red-600 font-semibold">Recording voice message…</span>
          </div>
          <button
            onClick={handleVoiceRecord}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-full transition-colors"
          >
            <Square className="w-3 h-3" />
            Stop & Send
          </button>
        </div>
      )}

      {/* ── Closed banner ────────────────────────────────────────────────────── */}
      {isClosed && (
        <div className="bg-[#f0f2f5] border-t border-[#e9edef] px-4 py-3 flex items-center justify-between gap-3 shrink-0">
          <p className="text-sm text-[#667781]">This conversation is closed. Reopen to reply.</p>
          <button
            onClick={handleReopen}
            className="shrink-0 text-xs font-bold text-[#128c7e] hover:text-[#0f7a6d] underline underline-offset-2"
          >
            Reopen
          </button>
        </div>
      )}

      {/* ── Input bar ────────────────────────────────────────────────────────── */}
      {!isClosed && !mediaPreview && (
        <div className="bg-[#f0f2f5] px-3 py-2 flex items-end gap-2 shrink-0 border-t border-[#e9edef]">

          {/* Action buttons */}
          <div className="flex items-center gap-0.5 pb-1 shrink-0">
            <button
              onClick={() => setShowQuickReplies(!showQuickReplies)}
              className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center transition-colors',
                showQuickReplies ? 'bg-[#128c7e]/10 text-[#128c7e]' : 'hover:bg-[#e9edef] text-[#54656f]',
              )}
              title="Quick replies"
            >
              <Zap className="w-5 h-5" />
            </button>
            <button
              onClick={() => setNoteMode(!noteMode)}
              className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center transition-colors',
                noteMode ? 'bg-amber-100 text-amber-600' : 'hover:bg-[#e9edef] text-[#54656f]',
              )}
              title="Internal note"
            >
              <StickyNote className="w-5 h-5" />
            </button>
            {!noteMode && (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-9 h-9 rounded-full hover:bg-[#e9edef] flex items-center justify-center transition-colors text-[#54656f]"
                  title="Attach file"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </>
            )}
          </div>

          {/* Text input */}
          <div className={cn(
            'flex-1 flex items-end gap-2 rounded-3xl px-4 py-2 shadow-sm',
            noteMode ? 'bg-amber-50 border border-amber-200' : 'bg-white',
          )}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => { setInput(e.target.value); autoResize(e.target); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
              }}
              placeholder={noteMode ? 'Write an internal note…' : 'Type a message'}
              rows={1}
              className="flex-1 bg-transparent outline-none resize-none text-[14px] leading-relaxed text-[#111b21] placeholder:text-[#adb5bd] overflow-y-auto py-0.5"
              style={{ minHeight: 22, maxHeight: 120 }}
            />
          </div>

          {/* Send / mic */}
          {!recording && input.trim().length === 0 && !noteMode ? (
            <button
              onClick={handleVoiceRecord}
              className="w-11 h-11 rounded-full flex items-center justify-center bg-[#128c7e] hover:bg-[#0f7a6d] text-white shadow-md transition-all hover:scale-105 active:scale-95 shrink-0"
            >
              <Mic className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={sendMessage}
              disabled={(input.trim().length === 0 && !mediaPreview) || sending}
              className="w-11 h-11 rounded-full flex items-center justify-center bg-[#128c7e] hover:bg-[#0f7a6d] disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-md transition-all hover:scale-105 active:scale-95 shrink-0"
            >
              {sending
                ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <Send className="w-5 h-5 ml-0.5" />
              }
            </button>
          )}
        </div>
      )}

      <style>{`@keyframes chatbounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-5px)}}`}</style>
    </div>
  );
}
