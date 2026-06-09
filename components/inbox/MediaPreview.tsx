'use client';

import { X, File, Image, Video, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  preview: { file: File; url: string; type: string; name: string };
  onCancel: () => void;
  caption: string;
  onCaptionChange: (v: string) => void;
  onSend: () => void;
  sending: boolean;
}

export default function MediaPreview({ preview, onCancel, caption, onCaptionChange, onSend, sending }: Props) {
  const Icon = preview.type === 'image' ? Image : preview.type === 'video' ? Video : preview.type === 'audio' ? Music : File;

  return (
    <div className="bg-white border-t border-[#e9edef] px-4 py-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[#111b21]">Send {preview.type}</span>
        <button onClick={onCancel} disabled={sending} className="p-1 rounded hover:bg-gray-100"><X className="w-4 h-4 text-[#667781]" /></button>
      </div>
      <div className="flex items-center gap-3 p-3 bg-[#f0f2f5] rounded-xl">
        {preview.type === 'image' ? (
          <img src={preview.url} alt="preview" className="w-16 h-16 rounded-lg object-cover" />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-[#e9edef] flex items-center justify-center">
            <Icon className="w-7 h-7 text-[#54656f]" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{preview.name}</p>
          <p className="text-xs text-[#667781] mt-0.5">{preview.type}</p>
        </div>
      </div>
      {preview.type !== 'audio' && (
        <input value={caption} onChange={(e) => onCaptionChange(e.target.value)} placeholder="Add a caption..." className="w-full px-3 py-2 text-sm bg-[#f0f2f5] rounded-xl border-0 outline-none" />
      )}
      <Button onClick={onSend} disabled={sending} className="w-full bg-[#128c7e] hover:bg-[#0f7a6d]">
        {sending ? 'Sending...' : 'Send'}
      </Button>
    </div>
  );
}
