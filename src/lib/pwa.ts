import { Platform } from 'react-native';

/**
 * Web-only PWA wiring: inject the manifest link + theme color and register
 * the service worker. Relative paths keep this working whether the app is
 * hosted at the domain root or under a sub-path (e.g. GitHub Pages).
 * No-op on native and in dev (dev servers shouldn't cache).
 */
export function registerPWA(): void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;

  if (!document.querySelector('link[rel="manifest"]')) {
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = 'manifest.json';
    document.head.appendChild(link);
  }
  if (!document.querySelector('meta[name="theme-color"]')) {
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.content = '#101214';
    document.head.appendChild(meta);
  }

  if (__DEV__) return;
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {
        /* not fatal — the app still runs un-cached */
      });
    });
  }
}
