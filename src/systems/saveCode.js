// Save codes: the whole save (meta progress plus any run in progress) as one text code,
// to move it to another device or keep a backup. Phaser-free. Importing first copies the
// current save to a backup slot, so an import can always be undone.
import { SAVE_KEY } from './save.js';
import { RUN_KEY, clearRun } from './runStore.js';

const PREFIX = 'DINO1-';
const BACKUP_KEY = 'dino-conquest:backup';

const get = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const put = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); return true; } catch { return false; } };

// UTF-8 safe base64, plus a short checksum so a cut-off paste is caught.
const toB64 = (s) => { let b = ''; for (const c of new TextEncoder().encode(s)) b += String.fromCharCode(c); return btoa(b); };
const fromB64 = (s) => new TextDecoder().decode(Uint8Array.from(atob(s), (c) => c.charCodeAt(0)));
const sum = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h.toString(36).padStart(7, '0').slice(-7); };

// The code for this device's save. meta: the live meta object (written now, so it's current).
export function exportCode(meta) {
  const body = toB64(JSON.stringify({ meta, run: get(RUN_KEY) }));
  return `${PREFIX}${sum(body)}-${body}`;
}

// Read a pasted code: { data } or { error } ('format' | 'damaged').
export function readCode(code) {
  const s = String(code ?? '').replace(/\s+/g, '');
  if (!s.startsWith(PREFIX)) return { error: 'format' };
  const check = s.slice(PREFIX.length, PREFIX.length + 7), body = s.slice(PREFIX.length + 8);
  if (sum(body) !== check) return { error: 'damaged' };
  try {
    const data = JSON.parse(fromB64(body));
    if (!data?.meta || typeof data.meta !== 'object' || typeof data.meta.v !== 'number') return { error: 'format' };
    return { data };
  } catch {
    return { error: 'damaged' };
  }
}

// Replace this device's save with a code's (the code's settings are dropped: this device
// keeps its own sound and graphics). Backs the current save up first. The caller reloads.
export function importCode(data, settings) {
  if (!backup()) return false;
  clearRun(); // so the tab-hide safety save can't write the old run back
  return put(SAVE_KEY, JSON.stringify({ ...data.meta, settings })) && put(RUN_KEY, data.run ?? null);
}

function backup() {
  return put(BACKUP_KEY, JSON.stringify({ at: Date.now(), meta: get(SAVE_KEY), run: get(RUN_KEY) }));
}

// The save from before the last import: { at } or null.
export function backupInfo() {
  try { const b = JSON.parse(get(BACKUP_KEY)); return b?.meta ? { at: b.at } : null; } catch { return null; }
}

// Put the backup back (swapping: the save it replaces becomes the backup). The caller reloads.
export function restoreBackup() {
  let b;
  try { b = JSON.parse(get(BACKUP_KEY)); } catch { return false; }
  if (!b?.meta || !backup()) return false;
  clearRun();
  return put(SAVE_KEY, b.meta) && put(RUN_KEY, b.run ?? null);
}
