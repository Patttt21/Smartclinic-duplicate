/**
 * Smart Clinic API Configuration
 * Production-ready URL resolution for Vercel, local dev, and custom backends.
 */

function resolveApiBaseUrl(): string {
  const envUrl = (import.meta.env.VITE_API_URL || '').trim();

  // If in browser, detect whether localhost is being used erroneously in production
  if (typeof window !== 'undefined') {
    const isLocalhost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '0.0.0.0';

    // If deployed on Vercel / remote domain but VITE_API_URL was set to localhost, ignore it!
    if (!isLocalhost && (envUrl.includes('localhost') || envUrl.includes('127.0.0.1'))) {
      console.warn(
        '[Smart Clinic] VITE_API_URL points to localhost while running on remote domain. Using same-origin relative API path.'
      );
      return '';
    }
  }

  return envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
}

export const API_BASE_URL = resolveApiBaseUrl();

/**
 * Normalizes an API route path to include API_BASE_URL
 */
export function getApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}
