// Mide a dónde se van los tokens leyendo las sesiones guardadas de Claude Code.
// Uso: node medir.mjs [días=30]
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import os from 'node:os';

const ROOT = path.join(os.homedir(), '.claude', 'projects');
const DAYS = Number(process.argv[2] || 30);
const since = Date.now() - DAYS * 864e5;

// $ por millón de tokens (precio de API, usado solo como peso relativo)
const PRICES = [
  [/fable-5-2|mythos-5-2/, { n: 'Fable 5.2', i: 8, o: 40, r: 0.2 }],
  [/fable|mythos/, { n: 'Fable 5/5.1', i: 10, o: 50, r: 1 }],
  [/opus-5-5/, { n: 'Opus 5.5', i: 4, o: 20, r: 0.2 }],
  [/opus/, { n: 'Opus anterior', i: 5, o: 25, r: 0.5 }],
  [/sonnet-5-5/, { n: 'Sonnet 5.5', i: 2, o: 10, r: 0.1 }],
  [/sonnet-5/, { n: 'Sonnet 5', i: 2, o: 10, r: 0.2 }],
  [/sonnet/, { n: 'Sonnet anterior', i: 3, o: 15, r: 0.3 }],
  [/haiku-5-5/, { n: 'Haiku 5.5', i: 0.1, o: 0.5, r: 0.01 }],
  [/haiku/, { n: 'Haiku anterior', i: 1, o: 5, r: 0.1 }],
];
const priceOf = (m) => (PRICES.find(([re]) => re.test(m)) || [0, { n: m, i: 4, o: 20, r: 0.2 }])[1];

function* walk(dir) {
  let ents = [];
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of ents) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.name.endsWith('.jsonl')) yield p;
  }
}

const recs = new Map();
let files = 0;
for (const file of walk(ROOT)) {
  let st; try { st = fs.statSync(file); } catch { continue; }
  if (st.mtimeMs < since) continue;
  files++;
  const proj = path.relative(ROOT, file).split(path.sep)[0];
  const sideByPath = /subagents|[\\/]agent-/.test(file);
  const rl = readline.createInterface({ input: fs.createReadStream(file, 'utf8'), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.includes('"usage":{') || !line.includes('"type":"assistant"')) continue;
    let o; try { o = JSON.parse(line); } catch { continue; }
    const u = o?.message?.usage; const model = o?.message?.model;
    if (o.type !== 'assistant' || !u || !model || model.startsWith('<')) continue;
    const t = Date.parse(o.timestamp); if (!t) continue;
    const id = o.message.id || o.uuid;
    const cw = u.cache_creation_input_tokens || 0;
    const cw1 = u.cache_creation?.ephemeral_1h_input_tokens || 0;
    const r = {
      t, model, side: !!o.isSidechain || sideByPath, sid: o.sessionId || file, proj,
      in: u.input_tokens || 0, cw5: Math.max(0, cw - cw1), cw1, cr: u.cache_read_input_tokens || 0,
      out: u.output_tokens || 0,
    };
    const prev = recs.get(id);
    if (!prev || r.out > prev.out) recs.set(id, prev ? { ...r, t: Math.min(prev.t, r.t) } : r);
  }
}

const all = [...recs.values()].filter((r) => r.t >= since);
for (const r of all) {
  const p = priceOf(r.model);
  r.fam = p.n;
  r.cIn = (r.in * p.i) / 1e6;
  r.cW = ((r.cw5 * 1.25 + r.cw1 * 2) * p.i) / 1e6;
  r.cR = (r.cr * p.r) / 1e6;
  r.cOut = (r.out * p.o) / 1e6;
  r.c = r.cIn + r.cW + r.cR + r.cOut;
  r.ctx = r.in + r.cw5 + r.cw1 + r.cr;
}
const sum = (a, f) => a.reduce((s, x) => s + f(x), 0);
const pct = (x, tot) => (tot ? ((100 * x) / tot).toFixed(1).padStart(5) + ' %' : '   -  ');
const fmt = (n) => (n >= 1e9 ? (n / 1e9).toFixed(2) + ' mil M' : n >= 1e6 ? (n / 1e6).toFixed(1) + ' M' : n >= 1e3 ? (n / 1e3).toFixed(0) + ' k' : String(n));
const group = (a, k) => { const m = new Map(); for (const x of a) { const key = k(x); (m.get(key) || m.set(key, []).get(key)).push(x); } return m; };

function report(rows, title) {
  const T = sum(rows, (r) => r.c);
  console.log(`\n===== ${title} =====`);
  console.log(`Llamadas al modelo: ${rows.length} | sesiones: ${group(rows, (r) => r.sid).size} | peso total (equivalente API): ${T.toFixed(0)} $`);
  console.log('\n-- Por modelo --');
  for (const [k, v] of [...group(rows, (r) => r.fam)].sort((a, b) => sum(b[1], (r) => r.c) - sum(a[1], (r) => r.c)))
    console.log(`${k.padEnd(16)} ${pct(sum(v, (r) => r.c), T)}  llamadas ${String(v.length).padStart(6)}  salida ${fmt(sum(v, (r) => r.out))}`);
  console.log('\n-- Por tipo de token --');
  console.log(`Releer contexto (caché leída)   ${pct(sum(rows, (r) => r.cR), T)}  ${fmt(sum(rows, (r) => r.cr))} tokens`);
  console.log(`Guardar contexto (caché escrita) ${pct(sum(rows, (r) => r.cW), T)}  ${fmt(sum(rows, (r) => r.cw5 + r.cw1))} tokens (1 h: ${fmt(sum(rows, (r) => r.cw1))})`);
  console.log(`Entrada nueva sin caché          ${pct(sum(rows, (r) => r.cIn), T)}  ${fmt(sum(rows, (r) => r.in))} tokens`);
  console.log(`Salida (respuestas + pensar)     ${pct(sum(rows, (r) => r.cOut), T)}  ${fmt(sum(rows, (r) => r.out))} tokens`);
  console.log('\n-- Sesión principal frente a subagentes --');
  const main = rows.filter((r) => !r.side), side = rows.filter((r) => r.side);
  console.log(`Principal  ${pct(sum(main, (r) => r.c), T)}  llamadas ${main.length}`);
  console.log(`Subagentes ${pct(sum(side, (r) => r.c), T)}  llamadas ${side.length}`);
  for (const [k, v] of group(side, (r) => r.fam)) console.log(`   subagentes en ${k.padEnd(14)} ${pct(sum(v, (r) => r.c), T)}  llamadas ${v.length}`);
  console.log('\n-- Tamaño del contexto en cada llamada (solo principal) --');
  const B = [[0, 5e4, '< 50 k'], [5e4, 1e5, '50-100 k'], [1e5, 2e5, '100-200 k'], [2e5, 4e5, '200-400 k'], [4e5, 9e9, '> 400 k']];
  for (const [a, b, l] of B) { const v = main.filter((r) => r.ctx >= a && r.ctx < b); console.log(`${l.padEnd(10)} ${pct(sum(v, (r) => r.c), T)} del peso  llamadas ${pct(v.length, main.length)}`); }
  // por sesión
  const ses = [...group(main, (r) => r.sid)].map(([sid, v]) => { v.sort((a, b) => a.t - b.t); return { sid, v, c: sum(v, (r) => r.c), first: v[0].ctx, max: Math.max(...v.map((r) => r.ctx)) }; });
  const firsts = ses.map((s) => s.first).sort((a, b) => a - b);
  const med = (a) => (a.length ? a[Math.floor(a.length / 2)] : 0);
  console.log(`\n-- Arranque de sesión -- contexto en la PRIMERA llamada: mediana ${fmt(med(firsts))}, máximo ${fmt(firsts.at(-1) || 0)}`);
  const calls = ses.map((s) => s.v.length).sort((a, b) => a - b);
  console.log(`Llamadas por sesión: mediana ${med(calls)}, p90 ${calls[Math.floor(calls.length * 0.9)] || 0}, máximo ${calls.at(-1) || 0}`);
  // reescrituras en frío
  let coldN = 0, coldC = 0;
  for (const s of ses) for (let k = 1; k < s.v.length; k++) { const r = s.v[k]; if (r.ctx > 4e4 && r.cr / r.ctx < 0.3) { coldN++; coldC += r.cW + r.cIn; } }
  console.log(`Reescrituras en frío (volver a una sesión con la caché caducada o tras compactar): ${coldN} veces, ${pct(coldC, T)} del peso`);
  console.log('\n-- Las 8 sesiones que más pesan --');
  ses.sort((a, b) => b.c - a.c);
  const top8 = sum(ses.slice(0, 8), (s) => s.c), top20pct = sum(ses.slice(0, Math.ceil(ses.length * 0.2)), (s) => s.c);
  for (const s of ses.slice(0, 8)) {
    const fams = [...group(s.v, (r) => r.fam)].map(([k, v]) => `${k} ${v.length}`).join(', ');
    const h = ((s.v.at(-1).t - s.v[0].t) / 36e5).toFixed(1);
    console.log(`${pct(s.c, T)}  ${new Date(s.v[0].t).toISOString().slice(0, 10)}  llamadas ${String(s.v.length).padStart(5)}  ctx máx ${fmt(s.max).padStart(6)}  ${h} h  ${s.v[0].proj.slice(-28)}  [${fams}]`);
  }
  console.log(`Las 8 primeras suman ${pct(top8, T)}; el 20 % de sesiones más caras suma ${pct(top20pct, T)}`);
}

console.log(`Archivos leídos: ${files}`);
report(all, `ÚLTIMOS ${DAYS} DÍAS`);
report(all.filter((r) => r.t >= Date.now() - 7 * 864e5), 'ÚLTIMOS 7 DÍAS');
console.log('\n-- Peso por semana --');
const wk = group(all, (r) => new Date(r.t - ((new Date(r.t).getUTCDay() + 6) % 7) * 864e5).toISOString().slice(0, 10));
for (const [k, v] of [...wk].sort()) console.log(`semana del ${k}: ${sum(v, (r) => r.c).toFixed(0).padStart(6)} $  llamadas ${v.length}`);

// Diagnóstico: las cifras que deciden dónde recortar, y cuánto se habría ahorrado
{
  const T = sum(all, (r) => r.c), main = all.filter((r) => !r.side), CAP = 2e5;
  const gordas = main.filter((r) => r.ctx > CAP);
  const subCaros = sum(all.filter((r) => r.side && /Opus|Fable/.test(r.fam)), (r) => r.c);
  console.log(`\n===== DIAGNÓSTICO (${DAYS} días) =====`);
  console.log(`Contexto (releer + guardar): ${pct(sum(all, (r) => r.cR + r.cW), T)} | salida: ${pct(sum(all, (r) => r.cOut), T)}`);
  console.log(`Llamadas de la sesión principal con más de 200 k de contexto: ${pct(sum(gordas, (r) => r.c), T)} del peso`);
  console.log(`Subagentes en Opus o Fable: ${pct(subCaros, T)} del peso; en Sonnet, aprox. ${pct(subCaros / 2, T)} menos`);
}

// Ajuste: simula el tope de contexto con los datos de este usuario y recomienda el suyo.
// Repite las mismas llamadas con el contexto limitado y cobra cada resumen que haría falta.
{
  const T = sum(all, (r) => r.c);
  const main = all.filter((r) => !r.side);
  const ses = [...group(main, (r) => r.sid).values()].map((v) => v.sort((a, b) => a.t - b.t));
  const med = (a) => a.sort((x, y) => x - y)[a.length >> 1] || 0;
  const ini = ses.map((v) => v[0]).filter((r) => r.ctx < 13e4);
  const BASE = med(ini.map((r) => r.ctx)) || 60000; // con cuánto arranca una sesión
  const COMUN = med(ini.map((r) => r.cr)) || BASE / 2; // parte que ya está en caché al arrancar
  const TRAS = BASE + 25000; // tamaño de la sesión después de un resumen
  const RESUMEN = 6000, HORA = 36e5; // tokens de salida de un resumen; caducidad de la caché
  const coste = (CAP) => {
    let c = 0, n = 0, calls = 0;
    for (const v of ses) {
      const p = priceOf(v[0].model), r = p.r / 1e6, W = (p.i * 2) / 1e6, O = p.o / 1e6;
      let s = CAP === Infinity || v[0].ctx <= CAP ? v[0].ctx : TRAS;
      for (let k = 0; k < v.length; k++) {
        const frio = k > 0 && v[k].t - v[k - 1].t > HORA;
        if (CAP === Infinity) s = v[k].ctx;
        else if (k > 0) { const x = v[k].ctx - v[k - 1].ctx; if (x > 0) s += Math.min(x, 1e5); else s = Math.min(s, v[k].ctx); }
        if (s > CAP) { c += s * (frio ? W : r) + RESUMEN * O + (TRAS - COMUN) * W; s = TRAS; n++; c += s * r; }
        else c += s * (frio ? W : r);
        calls++;
      }
    }
    return { c, n, calls };
  };
  const sinTope = coste(Infinity);
  const filas = [15e4, 2e5, 25e4, 3e5, 35e4, 4e5, 5e5]
    .filter((CAP) => CAP > TRAS + 3e4)
    .map((CAP) => { const x = coste(CAP); return { CAP, ...x, ahorro: T ? (100 * (sinTope.c - x.c)) / T : 0 }; });
  console.log(`\n===== AJUSTE (${DAYS} días) =====`);
  console.log(`Arranque de sesión: ${fmt(BASE)} (ya en caché ${fmt(COMUN)}) | llamadas de la sesión principal: ${main.length}`);
  for (const x of filas) console.log(`Tope ${fmt(x.CAP).padStart(5)}: ahorro ${x.ahorro.toFixed(1).padStart(5)} % del total | se resume cada ${x.n ? Math.round(x.calls / x.n) : '-'} llamadas`);
  const mejor = Math.max(0, ...filas.map((x) => x.ahorro));
  const elegido = mejor >= 3 ? filas.filter((x) => x.ahorro >= mejor - 1.5).at(-1) : null;
  const subCaros = T ? (100 * sum(all.filter((r) => r.side && /Opus|Fable/.test(r.fam)), (r) => r.c)) / T : 0;
  const rec = {
    tope: elegido ? elegido.CAP : null,
    ahorroTope: elegido ? +elegido.ahorro.toFixed(1) : 0,
    subagentes: subCaros >= 5 ? 'sonnet' : null,
    ahorroSubagentes: subCaros >= 5 ? +(subCaros / 2).toFixed(1) : 0,
    pocosDatos: main.length < 300,
  };
  console.log(elegido ? `Tope recomendado: ${fmt(elegido.CAP)} (el mayor que queda a menos de 1,5 puntos del mejor, para interrumpir menos)` : 'Tope: no compensa ponerlo; las sesiones ya son ligeras');
  console.log(rec.subagentes ? `Subagentes: en Sonnet ahorrarían aprox. ${rec.ahorroSubagentes} % (hoy pesan ${subCaros.toFixed(1)} % en Opus o Fable)` : 'Subagentes: no hace falta cambiarlos');
  if (rec.pocosDatos) console.log('Pocos datos: con menos de 300 llamadas la recomendación vale poco.');
  console.log('RECOMENDACION ' + JSON.stringify(rec));
}
