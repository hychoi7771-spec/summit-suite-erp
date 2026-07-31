import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * The `receipts` bucket is private. Stored rows may contain legacy public URLs.
 * This helper extracts the object path and returns a short-lived signed URL.
 */
export function extractReceiptPath(url: string | null | undefined): string | null {
  if (!url) return null;
  const marker = '/receipts/';
  const idx = url.indexOf(marker);
  if (idx === -1) return url.startsWith('http') ? null : url;
  return decodeURIComponent(url.slice(idx + marker.length).split('?')[0]);
}

export async function getSignedReceiptUrl(url: string | null | undefined, expiresIn = 3600): Promise<string | null> {
  const path = extractReceiptPath(url);
  if (!path) return url ?? null;
  const { data, error } = await supabase.storage.from('receipts').createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export function useSignedReceiptUrl(url: string | null | undefined) {
  const [signed, setSigned] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!url) {
      setSigned(null);
      return;
    }
    getSignedReceiptUrl(url).then((res) => {
      if (active) setSigned(res);
    });
    return () => {
      active = false;
    };
  }, [url]);

  return signed;
}

export async function openReceipt(url: string | null | undefined) {
  const signed = await getSignedReceiptUrl(url);
  if (signed) window.open(signed, '_blank', 'noopener,noreferrer');
}
