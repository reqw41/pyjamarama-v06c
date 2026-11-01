#!/usr/bin/env node
// Какие индексы спрайтов рисует bmp16 и откуда (по меткам вызывающего): для раздачи плоскостей цвета. Сценарий как в touchmap.js.
'use strict';
const fs=require('fs'),path=require('path');const E=require('./vec_emu');
const ROM=path.join(__dirname,'..','build/vec/pyjama.r0m');
const sy={};for(const l of fs.readFileSync(ROM.replace(/\.r0m$/,'.sym'),'latin1').split('\n')){const m=/^(\S+):\s+EQU\s+0x([0-9A-Fa-f]+)/.exec(l);if(m)sy[m[1]]=parseInt(m[2],16);}
const labs=Object.entries(sy).filter(([k,v])=>v>=0x5000&&!/^(gx_|dzx|ps0|sn_)/.test(k)).sort((a,b)=>a[1]-b[1]);
const near=pc=>{let r='?';for(const [k,v] of labs){if(v<=pc)r=k;else break;}return r;};
const m=E.mk(ROM);const use={};
m.onInstr=pc=>{if(pc===sy.bmp16){const a=m.cpu.regs[7],sp=m.cpu.sp,ret=m.rd(sp)|m.rd(sp+1)<<8;const k=near(ret-3);(use[k]=use[k]||new Set()).add(a);}};
const fr=n=>{for(let i=0;i<n;i++)m.frame();};
const goto=(label)=>{const c=m.cpu;c.sp=0x7F80;m.wr(c.sp,sy.GameLoop&255);m.wr(c.sp+1,sy.GameLoop>>8);c.pc=sy[label];c.iff=true;};
const rnd=(()=>{let s=777;return()=>(s=(s*1103515245+12345)&0x7fffffff)>>8;})();
fr(60);m.keyboard.matrix[7]|=0x80;fr(20);m.keyboard.matrix[7]&=~0x80;fr(200);
const keys=[[0,0x10],[0,0x40],[7,0x80],[0,0x20],[0,0x80]];
function play(n){for(let i=0;i<n;i++){if(i%7==0){for(const k of keys)m.keyboard.matrix[k[0]]&=~k[1];const k=keys[rnd()%keys.length];m.keyboard.matrix[k[0]]|=k[1];}m.frame();}for(const k of keys)m.keyboard.matrix[k[0]]&=~k[1];}
for(let r=0;r<0x1E;r++){m.wr(sy.Wally_RoomNo,r);goto('loop_restart');play(200);m.wr(sy.WallyLives,3);}
for(const lab of ['a_arcade','a_rocket_earth','a_rocket_moon','a_win']){if(sy[lab]){m.wr(sy.Wally_RoomNo,0x1E);goto(lab);play(500);}}
m.wr(sy.DeathFlag,1);play(300);
for(const [k,s] of Object.entries(use).sort())console.log(k.padEnd(24),[...s].sort((a,b)=>a-b).map(x=>x.toString(16)).join(' '));
