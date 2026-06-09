'use client';

import { useEffect } from 'react';
import { X, Download } from 'lucide-react';

interface Props {
  url: string;
  type: 'image' | 'video';
  filename?: string;
  onClose: () => void;
}

export default function MediaLightbox({ url, type, filename, onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const download = () => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'file';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center" onClick={onClose}>
      <div className="absolute top-4 right-4 flex gap-2 z-10">
        <button onClick={(e) => { e.stopPropagation(); download(); }} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
          <Download className="w-5 h-5 text-white" />
        </button>
        <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
          <X className="w-5 h-5 text-white" />
        </button>
      </div>
      <div onClick={(e) => e.stopPropagation()} className="max-w-[90vw] max-h-[90vh]">
        {type === 'image' ? (
          <img src={url} alt={filename || 'image'} className="max-w-full max-h-[90vh] object-contain rounded-lg" />
        ) : (
          <video src={url} controls autoPlay className="max-w-full max-h-[90vh] rounded-lg" />
        )}
      </div>
    </div>
  );
}
