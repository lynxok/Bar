// Copias de seguridad completas de la base local (solo en la PC principal).
import Dexie from 'dexie';
import { db } from '../db/database';
import { getIpc } from './ipc';

const FORMAT = 'lynx-baros-backup';
// Tablas que no se respaldan: la cola offline y los registros de borrado son técnicos
const SKIP = new Set(['outbox', 'tombstones']);

export interface BackupInfo { name: string; size: number; mtime: string; }

export async function buildBackupJson(): Promise<string> {
  const tables: Record<string, any[]> = {};
  for (const t of db.tables) {
    if (!SKIP.has(t.name)) tables[t.name] = await t.toArray();
  }
  return JSON.stringify({
    format: FORMAT,
    version: 1,
    dbVersion: db.verno,
    appVersion: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev',
    createdAt: new Date().toISOString(),
    tables,
  });
}

export async function createBackup(kind: 'auto' | 'manual' | 'prerestore' = 'manual') {
  const ipc = getIpc();
  if (!ipc) throw new Error('Las copias solo se pueden hacer desde la PC principal.');
  return ipc.invoke<{ path: string }>('backup-write', { json: await buildBackupJson(), kind });
}

export async function listBackups(): Promise<BackupInfo[]> {
  const ipc = getIpc();
  return ipc ? ipc.invoke<BackupInfo[]>('backup-list') : [];
}

export async function exportBackup() {
  const ipc = getIpc();
  if (!ipc) throw new Error('Solo disponible en la PC principal.');
  return ipc.invoke<{ canceled: boolean; path?: string }>('backup-export', await buildBackupJson());
}

/** Crea la copia automática del día si todavía no existe. */
export async function runAutoBackupIfNeeded() {
  const ipc = getIpc();
  if (!ipc) return;
  const d = new Date();
  const today = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const list = await listBackups();
  if (!list.some(b => b.name.startsWith(`lynx-backup-${today}`) && b.name.endsWith('-auto.json.gz'))) {
    await createBackup('auto');
  }
}

function parseBackup(json: string) {
  const data = JSON.parse(json);
  if (!data || data.format !== FORMAT || typeof data.tables !== 'object') {
    throw new Error('El archivo no es una copia válida de LYNX BarOS.');
  }
  return data as { tables: Record<string, any[]>; createdAt: string };
}

/** Reemplaza TODOS los datos por los de la copia. Antes guarda una copia del estado actual. */
export async function restoreBackupJson(json: string) {
  const data = parseBackup(json);
  await createBackup('prerestore');
  const targets = db.tables.filter(t => !SKIP.has(t.name) && Array.isArray(data.tables[t.name]));
  await db.transaction('rw', db.tables, async () => {
    for (const t of targets) {
      await t.clear();
      if (data.tables[t.name].length) await t.bulkAdd(data.tables[t.name]);
    }
  });
  // Los borrados registrados durante la restauración no deben replicarse a los dispositivos
  await Dexie.ignoreTransaction(() => db.tombstones.clear());
  return data.createdAt;
}

export async function restoreFromStoredBackup(name: string) {
  const ipc = getIpc();
  if (!ipc) throw new Error('Solo disponible en la PC principal.');
  return restoreBackupJson(await ipc.invoke<string>('backup-read', name));
}

export async function restoreFromFile() {
  const ipc = getIpc();
  if (!ipc) throw new Error('Solo disponible en la PC principal.');
  const json = await ipc.invoke<string | null>('backup-import-dialog');
  if (!json) return null;
  return restoreBackupJson(json);
}

export function openBackupFolder() {
  return getIpc()?.invoke('backup-open-folder');
}
