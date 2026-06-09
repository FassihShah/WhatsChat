'use client';

import { useState } from 'react';
import { api } from '@/lib/api-client';
import { X, Phone, MessageSquare, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  currentUser: any;
  onClose: () => void;
  onCreated: (conv: any) => void;
}

function normalizePhone(raw: string) {
  let phone = raw.replace(/[^\d+]/g, '');
  if (phone.startsWith('0') && !phone.startsWith('00')) {
    phone = '+92' + phone.slice(1);
  }
  if (!phone.startsWith('+')) phone = '+' + phone;
  return phone;
}

export default function NewChatModal({ currentUser, onClose, onCreated }: Props) {
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const handleStartChat = async () => {
    const normalized = normalizePhone(phone);
    if (normalized.length < 8) { setError('Enter a valid phone number'); return; }
    setSending(true);
    setError('');
    try {
      // Create conversation
      const conv = await api.entities.Conversation.create({
        owner_user_id: currentUser.id,
        customer_phone: normalized,
        customer_name: name || normalized,
        status: 'new',
        handling_mode: 'ai',
        last_message_time: new Date().toISOString(),
      });

      if (message.trim()) {
        // Send message
        const res = await api.functions.invoke('sendWhatsAppMessage', {
          user_id: currentUser.id,
          phone: normalized,
          message: message.trim(),
          conversation_id: conv.id,
        });

        if (!res.data?.success) {
          setError(res.data?.error || 'Failed to send message');
          setSending(false);
          return;
        }

        await api.entities.Message.create({
          conversation_id: conv.id,
          sender: 'agent',
          message_type: 'text',
          content: message.trim(),
          timestamp: new Date().toISOString(),
          status: 'sent',
          whatsapp_message_id: res.data.whatsapp_message_id || null,
          agent_name: currentUser.full_name || 'Agent',
        });

        await api.entities.Conversation.update(conv.id, {
          last_message: message.trim(),
          last_message_time: new Date().toISOString(),
        });
      }

      onCreated(conv);
    } catch (err: any) {
      setError(err.message || 'Failed to start chat');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-card w-full max-w-md rounded-2xl p-5 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">New Chat</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Phone Number *</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+923001234567" className="w-full mt-1 px-3 py-2.5 text-sm bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary/20" />
              <p className="text-xs text-muted-foreground mt-1">Include country code (e.g., +1 for US, +92 for Pakistan)</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Contact Name (optional)</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="John Smith" className="w-full mt-1 px-3 py-2.5 text-sm bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
              <Button className="flex-1" onClick={() => { setError(''); setStep(2); }} disabled={!phone.trim()}>Next</Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="bg-muted rounded-xl p-3">
              <p className="text-xs text-muted-foreground">Sending to:</p>
              <p className="text-sm font-semibold mt-0.5">{name || normalizePhone(phone)}</p>
              <p className="text-xs text-muted-foreground">{normalizePhone(phone)}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"><MessageSquare className="w-3.5 h-3.5" /> First message (optional)</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Hi! How can I help you today?" rows={3} className="w-full mt-1 px-3 py-2.5 text-sm bg-muted rounded-lg border-0 outline-none resize-none focus:ring-2 focus:ring-primary/20" />
              <p className="text-xs text-muted-foreground mt-1">Leave empty to just create the conversation without sending a message.</p>
            </div>
            {error && <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Back</Button>
              <Button className="flex-1" onClick={handleStartChat} disabled={sending}>
                {sending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Starting...</> : 'Start Chat'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
