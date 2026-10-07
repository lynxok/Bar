// Sesión del usuario y acceso autenticado a la API del host.
// El token lo emite el proceso principal de Electron; el rol y los permisos
// se validan siempre del lado del servidor.
import { getIpc } from './ipc';

const TOKEN_KEY = 'bar_token';
const USER_KEY = 'bar_user';
const TABLES_KEY = 'bar_allowed_tables';

export interface SessionUser {
  id: number | string;
  name: string;
  role: string;
  permissions: string[];
  status?: string;
}

export interface AuthResult {
  ok: boolean;
  error?: string;
  token?: string;
  user?: SessionUser;
  allowedTables?: string[];
}

const safeGet = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const safeSet = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* sin storage */ } };
const safeDel = (k: string) => { try { localStorage.removeItem(k); } catch { /* sin storage */ } };

export const isElectronHost = () => !!getIpc();

export function isPublicClientRoute(): boolean {
  return window.location.hash.includes('/cliente/') || window.location.pathname.includes('/cliente/');
}

export function getPublicTableId(): string | null {
  const m = (window.location.hash + window.location.pathname).match(/\/cliente\/([^/?#]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export function getToken(): string | null {
  return safeGet(TOKEN_KEY);
}

export function getStoredUser(): SessionUser | null {
  try { return JSON.parse(safeGet(USER_KEY) || 'null'); } catch { return null; }
}

export function getAllowedTables(): string[] {
  try { return JSON.parse(safeGet(TABLES_KEY) || '[]'); } catch { return []; }
}

export function saveSession(token: string, user: SessionUser, allowedTables: string[]) {
  safeSet(TOKEN_KEY, token);
  safeSet(USER_KEY, JSON.stringify(user));
  safeSet(TABLES_KEY, JSON.stringify(allowedTables));
}

export function clearSession() {
  safeDel(TOKEN_KEY);
  safeDel(USER_KEY);
  safeDel(TABLES_KEY);
}

type Listener = () => void;
const unauthorizedListeners = new Set<Listener>();
export function onUnauthorized(fn: Listener) {
  unauthorizedListeners.add(fn);
  return () => { unauthorizedListeners.delete(fn); };
}
function emitUnauthorized() {
  clearSession();
  unauthorizedListeners.forEach(fn => fn());
}

/** fetch contra el host con el token de sesión. Lanza error si la respuesta no es OK. */
export async function apiFetch<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const res = await fetch(`${window.location.origin}${path}`, { ...options, headers });
  if (res.status === 401 && token && !isPublicClientRoute()) emitUnauthorized();
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const j = await res.json(); msg = j.error || msg; } catch { /* sin cuerpo */ }
    const err: any = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export async function login(name: string, password: string): Promise<AuthResult> {
  const ipc = getIpc();
  let result: AuthResult;
  if (ipc) {
    result = await ipc.invoke<AuthResult>('auth-login', { name, password });
  } else {
    const res = await fetch(`${window.location.origin}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, password }),
    });
    result = await res.json().catch(() => ({ ok: false, error: `Error ${res.status}` }));
  }
  if (result.ok && result.token && result.user) {
    saveSession(result.token, result.user, result.allowedTables || []);
  }
  return result;
}

/** Valida el token guardado contra el host. Devuelve el usuario o null si la sesión no es válida. */
export async function verifySession(): Promise<SessionUser | null> {
  const token = getToken();
  if (!token) return null;
  try {
    const ipc = getIpc();
    const info = ipc
      ? await ipc.invoke<{ user: SessionUser; allowedTables: string[] } | null>('auth-me', token)
      : await apiFetch<{ user: SessionUser; allowedTables: string[] }>('/api/auth/me');
    if (!info) { clearSession(); return null; }
    saveSession(token, info.user, info.allowedTables);
    return info.user;
  } catch (e: any) {
    // Sin conexión con el host: se mantiene la sesión local para no bloquear la operación offline
    if (e && e.status === 401) { clearSession(); return null; }
    return getStoredUser();
  }
}

export async function logout() {
  const token = getToken();
  try {
    const ipc = getIpc();
    if (ipc) await ipc.invoke('auth-logout', token);
    else if (token) await apiFetch('/api/auth/logout', { method: 'POST' });
  } catch { /* ignorar */ }
  clearSession();
}

export async function needsSuperadminSetup(): Promise<boolean> {
  const ipc = getIpc();
  if (!ipc) return false;
  try { return await ipc.invoke<boolean>('auth-needs-setup'); } catch { return false; }
}

export async function setupSuperadmin(name: string, password: string): Promise<AuthResult> {
  const ipc = getIpc();
  if (!ipc) return { ok: false, error: 'Solo se puede configurar desde la PC principal.' };
  const result = await ipc.invoke<AuthResult>('auth-setup-superadmin', { name, password });
  if (result.ok && result.token && result.user) saveSession(result.token, result.user, result.allowedTables || []);
  return result;
}

export const isAdminRole = (role?: string) => ['admin', 'superadmin'].includes(String(role || '').toLowerCase());
export const isSuperadminRole = (role?: string) => String(role || '').toLowerCase() === 'superadmin';
