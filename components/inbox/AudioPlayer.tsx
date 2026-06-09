'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  src: string;
  isSent?: boolean;
}

export default function AudioPlayer({ src, isSent }: Props) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnd = () => { setPlaying(false); setProgress(0); };
    const onTime = () => setProgress(audio.currentTime / (audio.duration || 1));
    const onLoad = () => setDuration(audio.duration || 0);
    audio.addEventListener('ended', onEnd);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onLoad);
    return () => { audio.removeEventListener('ended', onEnd); audio.removeEventListener('timeupdate', onTime); audio.removeEventListener('loadedmetadata', onLoad); };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play(); setPlaying(true); }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  return (
    <div className={cn('flex items-center gap-2 px-3 py-2 rounded-xl', isSent ? 'bg-[#dcf8c6]/50' : 'bg-gray-100')} style={{ minWidth: 200, maxWidth: 260 }}>
      <audio ref={audioRef} src={src} preload="metadata" />
      <button onClick={togglePlay} className={cn('w-9 h-9 rounded-full flex items-center justify-center shrink-0', isSent ? 'bg-[#128c7e]' : 'bg-[#54656f]')}>
        {playing ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white ml-0.5" />}
      </button>
      <div className="flex-1">
        {/* Waveform bars */}
        <div className="flex items-center gap-0.5 h-6 mb-1">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className={cn('rounded-full transition-all', i / 20 <= progress ? (isSent ? 'bg-[#128c7e]' : 'bg-[#54656f]') : 'bg-gray-300')}
              style={{ width: 2, height: `${Math.random() * 16 + 4}px` }} />
          ))}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-[#667781]">{formatTime(playing || progress > 0 ? (audioRef.current?.currentTime || 0) : duration)}</span>
        </div>
      </div>
    </div>
  );
}
