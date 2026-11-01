#!/usr/bin/env node
// Карта обращений к низкой памяти (0x100..0x7BFF) в живой игре на Векторе: пишет build/vec/touch.bin (бит0 = чтение, бит1 = запись).
// Сценарий: заставка -> игра; каждая комната 0..0x1D со случайным вводом; аркада; ракета; салют/победа; проигрыш.
'use strict';
const fs=require('fs'),path=require('path');const E=require('./vec_emu');
const ROM=path.join(__dirname,'..','build/vec/pyjama.r0m');
const sy={};for(const l of fs.readFileSync(ROM.replace(/\.r0m$/,'.sym'),'latin1').split('\n')){const m=/^(\S+):\s+EQU\s+0x([0-9A-Fa-f]+)/.exec(l);if(m)sy[m[1]]=parseInt(m[2],16);}
const m=E.mk(ROM);const T=new Uint8Array(0x10000);
m.onRead=(a)=>{if(a<0x8000)T[a]|=1;};m.onWrite=(a)=>{if(a<0x8000)T[a]|=2;};
const fr=n=>{for(let i=0;i<n;i++)m.frame();};
const goto=(label,sp=0x7F80)=>{const c=m.cpu;c.sp=sp;m.wr(c.sp,sy.GameLoop&255);m.wr(c.sp+1,sy.GameLoop>>8);c.pc=sy[label];c.iff=true;};
const rnd=(()=>{let s=12345;return()=>(s=(s*1103515245+12345)&0x7fffffff)>>8;})();
fr(60);m.keyboard.matrix[7]|=0x80;fr(20);m.keyboard.matrix[7]&=~0x80;fr(200);
const keys=[[0,0x10],[0,0x40],[7,0x80],[0,0x20],[0,0x80]];
function play(n){for(let i=0;i<n;i++){if(i%7==0){for(const k of keys)m.keyboard.matrix[k[0]]&=~k[1];const k=keys[rnd()%keys.length];m.keyboard.matrix[k[0]]|=k[1];}m.frame();}for(const k of keys)m.keyboard.matrix[k[0]]&=~k[1];}
for(let r=0;r<0x1E;r++){m.wr(sy.Wally_RoomNo,r);goto('loop_restart');play(120);m.wr(sy.WallyLives,3);}
for(const lab of ['a_arcade','a_rocket_earth','a_rocket_moon','a_win']){ if(sy[lab]){m.wr(sy.Wally_RoomNo,0x1E);goto(lab);play(400);} }
m.wr(sy.DeathFlag,1);play(300);
const out=Buffer.alloc(0x7C00);for(let a=0x100;a<0x7C00;a++)out[a]=T[a];
fs.writeFileSync(path.join(__dirname,'..','build/vec/touch.bin'),out);
let r=0,w=0,n=0;for(let a=0x100;a<0x7C00;a++){if(T[a]&1)r++;if(T[a]&2)w++;if(T[a])n++;}
console.log('прочитано',r,'записано',w,'тронуто',n,'из',0x7B00);
console.log('Wally_RoomNo',m.rd(sy.Wally_RoomNo),'pc',m.cpu.pc.toString(16),'WallyLives',m.rd(sy.WallyLives));
