'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api-client';
import { useSession } from 'next-auth/react';
import AppLayout from '@/components/layout/AppLayout';
import { Settings, Wifi, WifiOff, Eye, EyeOff, Copy, CheckCircle, AlertCircle, RefreshCw, Bot, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const TABS = [
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'ai', label: 'AI Agent' },
  { key: 'templates', label: 'Templates' },
];

function ToggleRow({ label, desc, value, onChange }: any) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div><p className="text-sm font-medium">{label}</p>{desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}</div>
      <button onClick={() => onChange(!value)} className={cn('relative w-11 h-6 rounded-full transition-colors shrink-0', value ? 'bg-primary' : 'bg-muted')}>
        <div className={cn('absolute w-4 h-4 bg-white rounded-full top-1 transition-transform shadow-sm', value ? 'translate-x-6' : 'translate-x-1')} />
      </button>
    </div>
  );
}

function InputRow({ label, value, onChange, type = 'text', placeholder = '', readOnly = false }: any) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  return (
    <div className="py-2">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="relative mt-1">
        <input
          type={isPassword && !show ? 'password' : 'text'}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          readOnly={readOnly}
          className={cn('w-full px-3 py-2 text-sm bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary/20', readOnly && 'cursor-default opacity-70')}
        />
        {isPassword && (
          <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('whatsapp');
  const { data: session } = useSession();
  const userId = session?.user?.id;

  // WA Config state
  const [waConfig, setWaConfig] = useState<any>(null);
  const [waForm, setWaForm] = useState({ phone_number_id: '', access_token: '', waba_id: '', display_name: '' });
  const [verifying, setVerifying] = useState(false);
  const [savingWA, setSavingWA] = useState(false);

  // AI Settings state
  const [aiEnabled, setAiEnabled] = useState(true);
  const [aiAfterHours, setAiAfterHours] = useState(false);
  const [aiMode, setAiMode] = useState('auto');
  const [aiSettingIds, setAiSettingIds] = useState<Record<string, string>>({});

  // Templates state
  const [templates, setTemplates] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!userId) return;
    // Load WA config
    api.entities.UserWAConfig.filter({ user_id: userId, is_active: true }).then((configs: any[]) => {
      if (configs.length) {
        setWaConfig(configs[0]);
        setWaForm({
          phone_number_id: configs[0].phone_number_id || '',
          access_token: configs[0].access_token || '',
          waba_id: configs[0].waba_id || '',
          display_name: configs[0].display_name || '',
        });
      }
    });
    // Load AI settings
    api.entities.AppSettings.filter({ category: 'ai_agent' }).then((settings: any[]) => {
      const ids: Record<string, string> = {};
      settings.forEach((s) => {
        ids[s.key] = s.id;
        if (s.key === 'ai_enabled') setAiEnabled(s.value !== 'false');
        if (s.key === 'ai_mode') setAiMode(s.value);
        if (s.key === 'ai_after_hours') setAiAfterHours(s.value === 'true');
      });
      setAiSettingIds(ids);
    });
    // Load templates
    api.entities.MessageTemplate.filter({ user_id: userId }, '-created_date', 100).then(setTemplates);
  }, [userId]);

  const handleSaveWA = async () => {
    setSavingWA(true);
    try {
      const res = await fetch('/api/functions/createOrUpdateWAConfig', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, ...waForm }),
      });
      const data = await res.json();
      if (data.success) { setWaConfig(data.config); toast.success('WhatsApp config saved'); }
      else toast.error(data.error || 'Save failed');
    } finally { setSavingWA(false); }
  };

  const handleVerify = async () => {
    if (!waConfig) return;
    setVerifying(true);
    try {
      const res = await fetch('/api/functions/verifyWhatsAppConnection', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config_id: waConfig.id }),
      });
      const data = await res.json();
      if (data.success) { setWaConfig((p: any) => ({ ...p, connection_status: 'connected' })); toast.success('WhatsApp connected!'); }
      else toast.error(data.error || 'Verification failed');
    } finally { setVerifying(false); }
  };

  const handleSyncTemplates = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/functions/syncWhatsAppTemplates', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Synced ${data.upserted} templates`);
        api.entities.MessageTemplate.filter({ user_id: userId }, '-created_date', 100).then(setTemplates);
      } else toast.error('Sync failed');
    } finally { setSyncing(false); }
  };

  const upsertAiSetting = async (key: string, value: string) => {
    if (aiSettingIds[key]) {
      await api.entities.AppSettings.update(aiSettingIds[key], { value });
    } else {
      const created = await api.entities.AppSettings.create({ key, value, category: 'ai_agent', label: key });
      setAiSettingIds((p) => ({ ...p, [key]: created.id }));
    }
  };

  const statusColor = waConfig?.connection_status === 'connected' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : waConfig?.connection_status === 'error' ? 'bg-red-50 text-red-700 border-red-200'
    : 'bg-amber-50 text-amber-700 border-amber-200';

  const webhookUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/functions/whatsappWebhook`;

  return (
    <AppLayout>
      <div className="p-6 overflow-y-auto h-full space-y-5">
        <div><h1 className="text-2xl font-bold">Settings</h1><p className="text-sm text-muted-foreground mt-0.5">Configure your WhatsApp Business integration</p></div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted p-1 rounded-xl w-fit">
          {TABS.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all', activeTab === tab.key ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* WhatsApp Tab */}
        {activeTab === 'whatsapp' && (
          <div className="space-y-4">
            {waConfig && (
              <div className={cn('flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium', statusColor)}>
                {waConfig.connection_status === 'connected' ? <CheckCircle className="w-4 h-4" /> : waConfig.connection_status === 'error' ? <AlertCircle className="w-4 h-4" /> : <RefreshCw className="w-4 h-4 animate-spin" />}
                {waConfig.connection_status === 'connected' ? `Connected${waConfig.display_name ? ` — ${waConfig.display_name}` : ''}` : waConfig.connection_status === 'error' ? 'Connection error — check your credentials' : 'Pending verification'}
              </div>
            )}

            <Card className="border-border/60">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">API Credentials</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                <InputRow label="Phone Number ID" value={waForm.phone_number_id} onChange={(v: string) => setWaForm((p) => ({ ...p, phone_number_id: v }))} placeholder="Enter phone number ID" />
                <InputRow label="Access Token" type="password" value={waForm.access_token} onChange={(v: string) => setWaForm((p) => ({ ...p, access_token: v }))} placeholder="Enter access token" />
                <InputRow label="WABA ID" value={waForm.waba_id} onChange={(v: string) => setWaForm((p) => ({ ...p, waba_id: v }))} placeholder="WhatsApp Business Account ID" />
                <InputRow label="Display Name" value={waForm.display_name} onChange={(v: string) => setWaForm((p) => ({ ...p, display_name: v }))} placeholder="Business display name" />
                <div className="flex gap-2 pt-3">
                  <Button onClick={handleSaveWA} disabled={savingWA} className="flex-1">{savingWA ? 'Saving...' : 'Save Config'}</Button>
                  {waConfig && <Button variant="outline" onClick={handleVerify} disabled={verifying} className="flex-1">{verifying ? 'Verifying...' : 'Test Connection'}</Button>}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Webhook Configuration</CardTitle></CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-2">Set this as your webhook URL in Meta Developer Console:</p>
                <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2.5">
                  <code className="text-xs flex-1 truncate text-foreground">{webhookUrl}</code>
                  <button onClick={() => { navigator.clipboard.writeText(webhookUrl); toast.success('Copied!'); }} className="shrink-0 text-muted-foreground hover:text-foreground"><Copy className="w-3.5 h-3.5" /></button>
                </div>
                {waConfig?.verify_token && (
                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground mb-1">Verify Token:</p>
                    <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2.5">
                      <code className="text-xs flex-1 truncate text-foreground">{waConfig.verify_token}</code>
                      <button onClick={() => { navigator.clipboard.writeText(waConfig.verify_token); toast.success('Copied!'); }} className="shrink-0 text-muted-foreground hover:text-foreground"><Copy className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* AI Tab */}
        {activeTab === 'ai' && (
          <Card className="border-border/60">
            <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Bot className="w-4 h-4 text-primary" /> AI Agent Settings</CardTitle></CardHeader>
            <CardContent className="divide-y divide-border/50">
              <ToggleRow label="Enable AI Agent" desc="AI will auto-reply to customer messages" value={aiEnabled} onChange={(v: boolean) => { setAiEnabled(v); upsertAiSetting('ai_enabled', String(v)); }} />
              <ToggleRow label="After-Hours Replies" desc="AI responds even outside business hours" value={aiAfterHours} onChange={(v: boolean) => { setAiAfterHours(v); upsertAiSetting('ai_after_hours', String(v)); }} />
              <div className="py-3">
                <p className="text-sm font-medium mb-2">Reply Mode</p>
                <select value={aiMode} onChange={(e) => { setAiMode(e.target.value); upsertAiSetting('ai_mode', e.target.value); }} className="w-full px-3 py-2 text-sm bg-muted rounded-lg border-0 outline-none">
                  <option value="auto">Fully Automatic</option>
                  <option value="approval">Approval Mode</option>
                  <option value="draft">Draft Only</option>
                  <option value="human">Human Only</option>
                </select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{templates.length} templates</p>
              <Button onClick={handleSyncTemplates} disabled={syncing} variant="outline" className="gap-2">
                <RefreshCw className={cn('w-4 h-4', syncing && 'animate-spin')} />
                {syncing ? 'Syncing...' : 'Sync from Meta'}
              </Button>
            </div>
            <div className="space-y-2">
              {templates.length === 0 ? (
                <Card className="p-8 text-center border-border/60 border-dashed">
                  <p className="text-sm text-muted-foreground">No templates yet. Click "Sync from Meta" to import your approved templates.</p>
                </Card>
              ) : templates.map((tpl) => (
                <Card key={tpl.id} className="border-border/60">
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium">{tpl.name}</p>
                        <Badge className={cn('text-xs border-0', tpl.status === 'approved' ? 'bg-green-100 text-green-700' : tpl.status === 'rejected' ? 'bg-red-100 text-red-700' : tpl.status === 'paused' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600')}>
                          {tpl.status}
                        </Badge>
                        <Badge variant="outline" className="text-xs">{tpl.category}</Badge>
                      </div>
                      {tpl.body_text && <p className="text-xs text-muted-foreground truncate">{tpl.body_text}</p>}
                    </div>
                    {tpl.variable_count > 0 && <Badge variant="secondary" className="text-xs">{tpl.variable_count} vars</Badge>}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
