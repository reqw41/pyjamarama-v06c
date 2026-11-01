#!/usr/bin/env node
// Снимок Вектора без окна (vector06js через tools/vec_emu.js): N кадров с планом клавиш, PNG 256x256.
//   node tools/vecshot.js build/vec/pyjama.r0m <кадров> "<кадр>:<клавиша>+ <кадр>:<клавиша>- ..." [out.png]
// Клавиши — матрица Вектора (a..z, 0..9, space, vk, left, up, right, down). Палитра — из образа (метка pal в build/vec/pyjama.sym).
'use strict';
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const E = require('./vec_emu');
const [ROM, NS, PLAN, OUT] = process.argv.slice(2);
const m = E.mk(ROM);
const VKEYS = { a: [4, 0x02], b: [4, 0x04], c: [4, 0x08], d: [4, 0x10], e: [4, 0x20], f: [4, 0x40], g: [4, 0x80],
  h: [5, 0x01], i: [5, 0x02], j: [5, 0x04], k: [5, 0x08], l: [5, 0x10], m: [5, 0x20], n: [5, 0x40], o: [5, 0x80],
  p: [6, 0x01], q: [6, 0x02], r: [6, 0x04], s: [6, 0x08], t: [6, 0x10], u: [6, 0x20], v: [6, 0x40], w: [6, 0x80],
  x: [7, 0x01], y: [7, 0x02], z: [7, 0x04], space: [7, 0x80],
  0: [2, 0x01], 1: [2, 0x02], 2: [2, 0x04], 3: [2, 0x08], 4: [2, 0x10], 5: [2, 0x20], 6: [2, 0x40], 7: [2, 0x80],
  8: [3, 0x01], 9: [3, 0x02], vk: [0, 0x04], left: [0, 0x10], up: [0, 0x20], right: [0, 0x40], down: [0, 0x80] };
const plan = {};
for (const it of (PLAN || '').split(/\s+/).filter(Boolean)) {
  const mm = it.match(/^(\d+):(\w+)([+-])$/); if (!mm) throw new Error('план: ' + it);
  (plan[+mm[1]] = plan[+mm[1]] || []).push([mm[2], mm[3] === '+']);
}
const N = +NS || 300;
for (let f = 0; f < N; f++) {
  for (const [k, d] of plan[f] || []) { const e = VKEYS[k]; if (d) m.keyboard.matrix[e[0]] |= e[1]; else m.keyboard.matrix[e[0]] &= ~e[1]; }
  m.frame();
}
let PAL = Array(16).fill(0).map((_, i) => (i >= 8 ? 0xFF : 0));
try {
  const sf = fs.readFileSync(ROM.replace(/\.r0m$/, '.sym'), 'latin1');
  const sp = sf.match(/^pal_ptr:\s+EQU\s+0x([0-9A-F]+)/im), sym = sf.match(/^pal:\s+EQU\s+0x([0-9A-F]+)/im);
  if (sp) { const pp = parseInt(sp[1], 16), pa = m.rd(pp) | m.rd(pp + 1) << 8; PAL = Array.from({ length: 16 }, (_, i) => m.rd(pa + i)); }
  else if (sym) { const pa = parseInt(sym[1], 16); PAL = Array.from({ length: 16 }, (_, i) => m.rd(pa + i)); }
} catch (e) { /* палитра по умолчанию */ }
const rgb = (c) => [(c & 7) * 255 / 7 | 0, ((c >> 3) & 7) * 255 / 7 | 0, ((c >> 6) & 3) * 255 / 3 | 0];
const W = 256, H = 256, img = Buffer.alloc(W * H * 3);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const a = ((x >> 3) << 8) | (255 - y), b = 7 - (x & 7);
  const bit = (p) => (m.rd(p + a) >> b) & 1;
  const idx = bit(0x8000) << 3 | bit(0xA000) << 2 | bit(0xC000) << 1 | bit(0xE000);
  img.set(rgb(PAL[idx]), (y * W + x) * 3);
}
const out = OUT || 'build/vecshot.png';
fs.writeFileSync(out + '.ppm', Buffer.concat([Buffer.from(`P6 ${W} ${H} 255\n`), img]));
execSync(`sips -s format png "${out}.ppm" --out "${out}" >/dev/null && rm "${out}.ppm"`);
console.log(`кадров ${N}, PC ${m.cpu.pc.toString(16)}, FRAMES ${m.rd(parseInt(((fs.readFileSync(ROM.replace(/\.r0m$/, '.sym'), 'latin1').match(/^FRAMES:\s+EQU\s+0x([0-9A-F]+)/im) || [0, '0'])[1]), 16))} -> ${out}`);
