// Aviso de Peseta (se ejecuta al enviar cada mensaje). Mira cuánto pesa la sesión y,
// si toca, le pide a Claude que avise al usuario. No bloquea nada y no envía nada fuera.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// El tope es el punto en que Claude Code resume la sesión solo (ajuste autoCompactWindow)
let TOPE = 0;
try {
  TOPE = Number(JSON.parse(fs.readFileSync(path.join(os.homedir(), '.claude', 'settings.json'), 'utf8')).autoCompactWindow) || 0;
} catch {}
const CON_TOPE = TOPE > 0;
if (!CON_TOPE) TOPE = 400000; // sin tope puesto, se avisa como si estuviera en 400 k
const AVISO = Number(process.env.PESETA_AVISO_TOKENS) || Math.round(TOPE * 0.75); // aviso de peso
const PASO = 100000; // se repite cada +100 k si la sesión sigue creciendo
const VIGILAR = Math.round(TOPE * 0.5); // desde aquí se vigila el cambio de tarea y la vuelta en frío
const FRIO_MIN = 60; // minutos parada: la caché de la conversación ya ha caducado

let raw = '';
for await (const c of process.stdin) raw += c;
let ev = {};
try { ev = JSON.parse(raw); } catch {}
const file = ev.transcript_path;
if (!file || !fs.existsSync(file)) process.exit(0);

// Última llamada de la sesión principal, buscada solo en el final del archivo
function ultima(bytes) {
  const size = fs.statSync(file).size;
  const start = Math.max(0, size - bytes);
  const buf = Buffer.alloc(size - start);
  const fd = fs.openSync(file, 'r');
  fs.readSync(fd, buf, 0, buf.length, start);
  fs.closeSync(fd);
  const lines = buf.toString('utf8').split('\n');
  for (let i = lines.length - 1; i >= (start ? 1 : 0); i--) {
    const l = lines[i];
    if (!l.includes('"usage":{') || !l.includes('"type":"assistant"')) continue;
    try {
      const o = JSON.parse(l);
      const u = o.message?.usage;
      if (o.isSidechain || !u || String(o.message.model).startsWith('<')) continue;
      return {
        ctx: (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0),
        t: Date.parse(o.timestamp),
      };
    } catch {}
  }
  return null;
}
const last = ultima(2e6) || ultima(4e7);
if (!last) process.exit(0);

// Qué se avisó ya en esta sesión, para no repetir
const dir = path.join(os.tmpdir(), 'peseta');
const stFile = path.join(dir, `${String(ev.session_id || 'sesion').replace(/[^\w-]/g, '')}.json`);
let st = {};
try { st = JSON.parse(fs.readFileSync(stFile, 'utf8')); } catch {}
const guardar = () => {
  try { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(stFile, JSON.stringify(st)); } catch {}
};

if (last.ctx < AVISO * 0.8 && st.ctx) { delete st.ctx; guardar(); } // tras compactar se rearma
if (last.ctx < VIGILAR) process.exit(0);

const k = Math.round(last.ctx / 1000);
const horas = (Date.now() - last.t) / 36e5;
let linea = '';
if (horas * 60 >= FRIO_MIN && st.frio !== last.t) {
  const h = horas < 10 ? horas.toFixed(1).replace('.', ',') : Math.round(horas);
  linea = `Aviso de Peseta: esta sesión llevaba ${h} h parada y pesa ${k} k; al retomarla se ha releído entera de golpe. La próxima vez que pares más de una hora con algo a medias, di «relevo» antes de irte y vuelve en una sesión nueva.`;
  st.frio = last.t;
  if (last.ctx >= AVISO) st.ctx = last.ctx;
} else if (last.ctx >= AVISO && (!st.ctx || last.ctx - st.ctx >= PASO)) {
  const seguir = CON_TOPE ? `no hagas nada: al llegar a ${Math.round(TOPE / 1000)} k se resume sola` : 'escribe /compact para resumirla';
  linea = `Aviso de Peseta: esta sesión ya pesa ${k} k. Si has terminado la tarea, empieza la siguiente en una sesión nueva. Si sigues con lo mismo, ${seguir}.`;
  st.ctx = last.ctx;
}
if (linea) guardar();

const additionalContext = linea
  ? `Al final de tu respuesta, añade en una línea aparte y tal cual: ${linea}`
  : 'Peseta: si este mensaje empieza una tarea distinta de la que ocupa esta sesión, dilo en una línea al principio de tu respuesta (es tarea nueva y en una sesión nueva gastaría menos, sin perder nada porque no necesita este contexto) y luego haz la tarea igualmente.';
console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext } }));
