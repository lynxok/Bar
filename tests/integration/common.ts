import 'fake-indexeddb/auto';
export function setupBrowserGlobals(origin: string, hash: string) {
  const store: Record<string, string> = {};
  const ls = { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = String(v); }, removeItem: (k: string) => { delete store[k]; } };
  (globalThis as any).localStorage = ls;
  (globalThis as any).window = { location: { origin, hash, pathname: '/', href: origin + '/' + hash, search: '' }, navigator: { userAgent: 'Mozilla' }, localStorage: ls };
}
