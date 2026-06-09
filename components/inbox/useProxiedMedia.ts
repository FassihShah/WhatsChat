'use client';

import { useState, useEffect } from 'react';
import { mediaCache } from './mediaCache';

export function useProxiedMedia(mediaUrl: string | null, userId?: string) {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mediaUrl || !mediaUrl.startsWith('wa-media-id:')) {
      setResult(null);
      return;
    }

    const mediaId = mediaUrl.replace('wa-media-id:', '');

    // Check cache
    const cached = mediaCache.get(mediaId);
    if (cached) {
      setResult(cached);
      return;
    }

    // Loading state from cache
    if (mediaCache.isLoading(mediaId)) {
      const interval = setInterval(() => {
        const r = mediaCache.get(mediaId);
        if (r) { setResult(r); clearInterval(interval); }
      }, 200);
      return () => clearInterval(interval);
    }

    setLoading(true);
    mediaCache.setLoading(mediaId);

    fetch('/api/functions/getWhatsAppMedia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ media_id: mediaUrl, user_id: userId }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          mediaCache.setError(mediaId);
        } else {
          mediaCache.set(mediaId, data);
          setResult(data);
        }
      })
      .catch((err) => {
        setError(err.message);
        mediaCache.setError(mediaId);
      })
      .finally(() => setLoading(false));
  }, [mediaUrl, userId]);

  return { result, loading, error };
}
