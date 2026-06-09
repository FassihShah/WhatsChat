'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Bot, ChevronRight, CheckCircle, Copy, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const STEPS = ['Create Meta App', 'API Credentials', 'Webhook Setup', 'Test Message', 'Go Live'];

export default function SetupWizard() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ phone_number_id: '', access_token: '', waba_id: '', display_name: '' });
  const [config, setConfig] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();

  const webhookUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/functions/whatsappWebhook`;

  const handleSaveCredentials = async () => {
    if (!form.phone_number_id || !form.access_token || !form.waba_id) {
      toast.error('All credentials are required');
      return;
    }
    setSaving(true);
    const res = await fetch('/api/functions/createOrUpdateWAConfig', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: session?.user?.id, ...form }),
    });
    const data = await res.json();
    if (data.success) { setConfig(data.config); setStep(2); }
    else toast.error(data.error || 'Failed to save');
    setSaving(false);
  };

  const handleVerify = async () => {
    setVerifying(true);
    const res = await fetch('/api/functions/verifyWhatsAppConnection', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config_id: config.id }),
    });
    const data = await res.json();
    if (data.success) { setVerified(true); setStep(3); toast.success('WhatsApp connected!'); }
    else toast.error(data.error || 'Verification failed. Check credentials and webhook.');
    setVerifying(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#128c7e]/10 to-background p-4 flex items-center justify-center">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 bg-[#128c7e] rounded-xl flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold">WhatsChat AI Setup</h1>
        </div>

        {/* Stepper */}
        <div className="flex items-center mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center flex-1">
              <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 shrink-0', i < step ? 'bg-primary border-primary text-white' : i === step ? 'border-primary text-primary bg-white' : 'border-border text-muted-foreground bg-white')}>
                {i < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && <div className={cn('flex-1 h-0.5 mx-2', i < step ? 'bg-primary' : 'bg-border')} />}
            </div>
          ))}
        </div>

        {/* Step content */}
        <Card className="border-border/60">
          <CardHeader><CardTitle className="text-base">{STEPS[step]}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {step === 0 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Follow these steps to create a WhatsApp Business API connection:</p>
                {[
                  { n: 1, text: 'Go to developers.facebook.com and create a new app with "Business" type' },
                  { n: 2, text: 'Add the "WhatsApp" product to your app' },
                  { n: 3, text: 'In WhatsApp → API Setup, note your Phone Number ID and temporary access token' },
                  { n: 4, text: 'Go to WhatsApp → Configuration — you\'ll set the webhook URL in the next steps' },
                ].map(({ n, text }) => (
                  <div key={n} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{n}</div>
                    <p className="text-sm">{text}</p>
                  </div>
                ))}
                <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="gap-2"><ExternalLink className="w-4 h-4" /> Open Meta Developer Console</Button>
                </a>
                <Button className="w-full" onClick={() => setStep(1)}>Next: Enter Credentials <ChevronRight className="w-4 h-4 ml-1" /></Button>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Enter your WhatsApp Business API credentials from the Meta Developer Console.</p>
                {[
                  { key: 'phone_number_id', label: 'Phone Number ID *', placeholder: '1234567890' },
                  { key: 'access_token', label: 'Access Token *', placeholder: 'EAABxxxx...' },
                  { key: 'waba_id', label: 'WABA ID (WhatsApp Business Account ID) *', placeholder: '1234567890' },
                  { key: 'display_name', label: 'Display Name (optional)', placeholder: 'My Business' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="text-xs font-medium text-muted-foreground">{label}</label>
                    <input value={(form as any)[key]} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))} placeholder={placeholder}
                      className="w-full mt-1 px-3 py-2.5 text-sm bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                ))}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(0)} className="flex-1">Back</Button>
                  <Button onClick={handleSaveCredentials} disabled={saving} className="flex-1">
                    {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : 'Save & Continue'}
                  </Button>
                </div>
              </div>
            )}

            {step === 2 && config && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Configure the webhook in Meta Developer Console:</p>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Webhook URL (paste this in Meta):</p>
                  <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2.5">
                    <code className="text-xs flex-1 break-all text-foreground">{webhookUrl}</code>
                    <button onClick={() => { navigator.clipboard.writeText(webhookUrl); toast.success('Copied!'); }} className="shrink-0"><Copy className="w-3.5 h-3.5 text-muted-foreground" /></button>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Verify Token (paste this in Meta):</p>
                  <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2.5">
                    <code className="text-xs flex-1 break-all text-foreground">{config.verify_token}</code>
                    <button onClick={() => { navigator.clipboard.writeText(config.verify_token); toast.success('Copied!'); }} className="shrink-0"><Copy className="w-3.5 h-3.5 text-muted-foreground" /></button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">After setting the webhook, subscribe to <strong>messages</strong> and <strong>message_status_updates</strong>.</p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
                  <Button onClick={handleVerify} disabled={verifying} className="flex-1">
                    {verifying ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Verifying...</> : 'Verify Connection'}
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-700">WhatsApp Connected!</p>
                    <p className="text-xs text-emerald-600">Send a WhatsApp message to your business number to test.</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">Send a test message to your WhatsApp number from any WhatsApp account. It should appear in your inbox within seconds.</p>
                <Button className="w-full" onClick={() => setStep(4)}>I've tested it — Continue</Button>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-xl border border-primary/20">
                  <Bot className="w-6 h-6 text-primary" />
                  <div>
                    <p className="text-sm font-semibold">Setup Complete!</p>
                    <p className="text-xs text-muted-foreground">Your WhatsApp AI inbox is ready.</p>
                  </div>
                </div>
                {[
                  '✅ WhatsApp Business API connected',
                  '✅ Webhook configured for real-time messages',
                  '✅ AI agent ready to auto-reply',
                  '✅ Lead management active',
                ].map((item) => <p key={item} className="text-sm">{item}</p>)}
                <Button className="w-full bg-[#128c7e] hover:bg-[#0f7a6d]" onClick={() => router.push('/')}>Open Dashboard</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
