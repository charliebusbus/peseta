// Aplica (o quita) los ajustes que recomienda Peseta en la configuración de Claude Code.
// Uso: node aplicar.mjs [--tope 300000] [--subagentes sonnet] [--quitar]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const p = process.env.PESETA_SETTINGS || path.join(os.homedir(), '.claude', 'settings.json');
const arg = (n) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : undefined; };
const quitar = process.argv.includes('--quitar');
const tope = arg('--tope');
const sub = arg('--subagentes');
const salir = (msg) => { console.error(msg); process.exit(1); };

if (!quitar && tope === undefined && sub === undefined) salir('Nada que aplicar. Opciones: --tope <tokens>, --subagentes <sonnet|haiku|opus>, --quitar');
if (tope !== undefined && !(Number(tope) >= 100000 && Number(tope) <= 1000000)) salir('El tope tiene que estar entre 100000 y 1000000.');
if (sub !== undefined && !['sonnet', 'haiku', 'opus'].includes(sub)) salir('Subagentes: sonnet, haiku u opus.');

let s = {};
if (fs.existsSync(p)) {
  s = JSON.parse(fs.readFileSync(p, 'utf8').replace(/^﻿/, ''));
  const copia = p + '.bak-peseta';
  if (!fs.existsSync(copia)) fs.copyFileSync(p, copia); // se conserva la copia de antes de Peseta
} else {
  fs.mkdirSync(path.dirname(p), { recursive: true });
}

if (quitar) {
  delete s.autoCompactWindow;
  if (s.env) {
    delete s.env.CLAUDE_CODE_SUBAGENT_MODEL;
    if (!Object.keys(s.env).length) delete s.env;
  }
} else {
  if (tope !== undefined) s.autoCompactWindow = Number(tope);
  if (sub !== undefined) s.env = { ...(s.env || {}), CLAUDE_CODE_SUBAGENT_MODEL: sub };
}
fs.writeFileSync(p, JSON.stringify(s, null, 2) + '\n');

console.log(`Ajustes en ${p}`);
console.log(`  tope de contexto: ${s.autoCompactWindow ?? 'sin tope'}`);
console.log(`  modelo de los subagentes: ${s.env?.CLAUDE_CODE_SUBAGENT_MODEL ?? 'el de la sesión'}`);
console.log('Valen para las sesiones que se abran a partir de ahora.');
