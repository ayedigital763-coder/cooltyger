import { Capacitor } from '@capacitor/core';

const DEFAULT_ANDROID_API_BASE =
  'https://ais-pre-ikhqxnlexfmhs3hzowzqc6-1022217317884.europe-west2.run.app';

function getSafeBaseUrl(): string {
  const configured = (import.meta.env.VITE_API_URL ?? '').trim().replace(/\/+$/, '');
  if (configured) {
    try {
      const parsed = new URL(configured);
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        return parsed.origin;
      }
    } catch {
      // Ignore malformed VITE_API_URL and fall back
    }
  }

  if (Capacitor.isNativePlatform()) {
    return DEFAULT_ANDROID_API_BASE;
  }

  return '';
}

export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const base = getSafeBaseUrl();
  return base ? `${base}${normalizedPath}` : normalizedPath;
}
