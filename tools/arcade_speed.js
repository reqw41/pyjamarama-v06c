#!/usr/bin/env node
// Скорость аркады: проходов Invaders_Step за N кадров (после входа через call a_arcade). ZX: ~31,6 прохода/с.
'use strict';
const fs=require('fs'),path=require('path');const E=require('./vec_emu');
const ROM=path.join(__dirname,'..','build/vec/pyjama.r0m');
const sy={};for(const l of fs.readFileSync(ROM.replace(/\.r0m$/,'.sym'),'latin1').split('\n')){const m=/^(\S+):\s+EQU\s+0x([0-9A-Fa-f]+)/.exec(l);if(m)sy[m[1]]=parseInt(m[2],16);}
const m=E.mk(ROM);const N=+process.argv[2]||150;
for(let f=0;f<60;f++)m.frame();
m.keyboard.matrix[7]|=0x80; for(let f=0;f<20;f++)m.frame(); m.keyboard.matrix[7]&=~0x80;
for(let f=0;f<200;f++)m.frame(); // заставка -> игра
m.wr(sy.CurrentRoom||0,0x1E);
const c=m.cpu;c.sp=0x7F80;m.wr(c.sp,sy.GameLoop&255);m.wr(c.sp+1,sy.GameLoop>>8);c.pc=sy.a_arcade;c.iff=true;
let n=0;m.onInstr=pc=>{if(pc===sy.Invaders_Step)n++;};
for(let f=0;f<N;f++)m.frame();
console.log('проходов',n,'за',N,'кадров =',(n*50/N).toFixed(1),'/с (ZX 31,6)');
