import { meta, persist } from '../systems/meta.js';
import { quickSave } from '../systems/runStore.js';
import { exportCode, readCode, importCode, backupInfo, restoreBackup } from '../systems/saveCode.js';
import { sfx } from '../systems/sfx.js';
import { choose } from './popup.js';

// Settings > SAVE DATA: copy this save as a code, paste one from another device, or undo
// the last paste. The game has no text field, so pasting uses the browser's own prompt.
const ok = (scene, title, lines) => choose(scene, { title, lines, options: [{ label: 'OK' }] });

async function copy(s) {
  try { await navigator.clipboard.writeText(s); return true; } catch { return false; }
}

async function exportSave(scene) {
  persist();
  quickSave();
  const code = exportCode(meta);
  if (await copy(code)) {
    sfx('levelup');
    return ok(scene, 'CODE COPIED', ['PASTE IT SOMEWHERE SAFE, THEN', 'USE PASTE A CODE ON THE OTHER', 'DEVICE.']);
  }
  window.prompt('Copy your save code:', code); // no clipboard access: show it to copy by hand
}

async function importSave(scene) {
  const pasted = window.prompt('Paste your save code:');
  if (!pasted) return;
  const { data, error } = readCode(pasted);
  if (error) {
    sfx('deny');
    return ok(scene, 'CODE NOT VALID', error === 'damaged' ? ['IT LOOKS CUT OFF.', 'COPY THE WHOLE CODE AGAIN.'] : ['THAT ISN\'T A SAVE CODE.']);
  }
  const m = data.meta;
  const yes = await choose(scene, {
    title: 'USE THIS SAVE?',
    lines: [`${m.amber ?? 0} AMBER, ${m.stats?.runs ?? 0} RUNS, ${m.fossils?.length ?? 0} ANCESTORS`, data.run ? 'WITH A RUN IN PROGRESS' : 'NO RUN IN PROGRESS',
      'THIS DEVICE\'S SAVE IS BACKED', 'UP FIRST (UNDO LAST PASTE).'],
    options: [{ label: 'CANCEL' }, { label: 'YES, USE IT' }]
  });
  if (yes !== 1) return;
  if (!importCode(data, meta.settings)) { sfx('deny'); return ok(scene, 'COULD NOT SAVE', ['THE BROWSER BLOCKED STORAGE.']); }
  window.location.reload();
}

async function undo(scene) {
  const b = backupInfo();
  const yes = await choose(scene, {
    title: 'UNDO LAST PASTE?',
    lines: ['PUTS BACK THE SAVE FROM', new Date(b.at).toLocaleString().toUpperCase(), 'THE CURRENT ONE BECOMES THE BACKUP.'],
    options: [{ label: 'CANCEL' }, { label: 'YES, PUT IT BACK' }]
  });
  if (yes !== 1) return;
  if (!restoreBackup()) { sfx('deny'); return ok(scene, 'COULD NOT RESTORE', ['THE BACKUP IS UNREADABLE.']); }
  window.location.reload();
}

export async function saveMenu(scene) {
  for (;;) {
    const b = backupInfo();
    const i = await choose(scene, {
      title: 'SAVE DATA',
      lines: ['MOVE YOUR PROGRESS TO', 'ANOTHER DEVICE.'],
      options: [
        { label: 'COPY MY CODE', sub: 'YOUR WHOLE SAVE AS TEXT' },
        { label: 'PASTE A CODE', sub: 'REPLACES THIS SAVE (BACKED UP)' },
        { label: 'UNDO LAST PASTE', sub: 'BRING BACK THE BACKUP', disabled: b ? null : 'NO BACKUP YET' },
        { label: 'RESET SAVE', sub: 'ERASES ALL PROGRESS' },
        { label: 'BACK' }
      ],
      bh: 26
    });
    if (i === 0) await exportSave(scene);
    else if (i === 1) await importSave(scene);
    else if (i === 2) await undo(scene);
    else return i === 3 ? 'reset' : null; // Home asks before erasing
  }
}
