// Проверка исправления итогового экрана: шаги N выводятся ровно как десятичное число (в ZX 100 выходило «111»).
//   node tools/endsteps.js
'use strict';
const fs=require('fs'),path=require('path');const CPU80=require('./vendor/cpu80.js');
const ROOT=path.join(__dirname,'..');
const nsym={};for(const l of fs.readFileSync(path.join(ROOT,'build/vec/pyjama.sym'),'latin1').split('\n')){const m=/^(\S+):\s+EQU\s+0x([0-9A-Fa-f]+)/.exec(l);if(m)nsym[m[1]]=parseInt(m[2],16);}
const IMG=fs.readFileSync(path.join(ROOT,'build/vec/pyjama.r0m'));
function show(steps){
  const n=new CPU80();n.mem.set(IMG);
  const s=String(steps).padStart(8,'0');   // 8 цифр, старшие первыми
  for(let i=0;i<4;i++){const hi=+s[2*(3-i)],lo=+s[2*(3-i)+1];n.mem[nsym.Steps_Count+i]=hi<<4|lo;}
  n.mem[nsym.TempStoreA]=1;n.mem[nsym.Digit_LeadZeroFlag]=0;
  const c=n.cpu,R=c.regs,SENT=0xFFFE;n.mem[0x7FF1]=SENT>>8;n.mem[0x7FF0]=SENT&255;c.sp=0x7FF0;c.pc=nsym.Game_DisplayFinalScore;
  const out=[];let t=0;
  while(c.pc!==SENT){
    if(c.pc===nsym.tile_dbl){out.push([R[7],R[2],R[3]]);c.pc=n.mem[c.sp]|n.mem[c.sp+1]<<8;c.sp+=2;continue;}   // A, D, E
    c.instruction();if(++t>1e6)throw new Error('не вернулась');
  }
  // цифры шагов — в строке D = 7
  return out.filter(x=>x[1]===7).map(x=>String.fromCharCode(x[0])).join('');
}
let bad=0;
for(const v of [0,5,10,100,101,120,1000,2005,12345,99999999,40,300]){
  const got=show(v),exp=String(v);
  const ok=got===exp||(v===0&&got==='');
  if(!ok)bad++;console.log(ok?'ОК  ':'РАСХ',v,'->',JSON.stringify(got));
}
console.log(bad?'расхождений '+bad:'итоги шагов: все значения выводятся верно');
