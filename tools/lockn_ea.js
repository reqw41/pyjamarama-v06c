// Обёртка над lockn.js для events_a: нативный Update_RollRock кончается JP Wally_Resurrect, а модель на этом останавливается —
// поэтому на входе в Wally_Resurrect выполняем «RET» (возврат на метку стенда). Использование: node tools/lockn_ea.js ТИКОВ SEED Имена
// COVN=1 — ещё и охват нативных инструкций events_a (адреса, не пройденные ни разу).
'use strict';
const fs=require('fs'),path=require('path');
const CPU80=require('./vendor/cpu80.js');
const nsym={};for(const l of fs.readFileSync(path.join(__dirname,'../build/vec/pyjama.sym'),'latin1').split('\n')){const m=/^(\S+):\s+EQU\s+0x([0-9A-Fa-f]+)/.exec(l);if(m)nsym[m[1]]=parseInt(m[2],16);}
const cov=new Set();
// проще: подменить Wally_Resurrect в образе — первым байтом RET (код живёт в ОЗУ образа, стенд копирует IMG при mkNative)
const IMGP=path.join(__dirname,'../build/vec/pyjama.r0m');
const img=fs.readFileSync(IMGP);
const real=fs.readFileSync;
fs.readFileSync=function(p,...a){
  const r=real.call(fs,p,...a);
  if(typeof p==='string'&&p.endsWith('pyjama.r0m')){const b=Buffer.from(r);b[nsym.Wally_Resurrect]=0xC9;return b;}
  return r;
};
if(process.env.COVN){
  const names=Object.keys(nsym).filter(k=>nsym[k]>=nsym.ea_nb&&nsym[k]<=0xFFFF);
  const I=Object.getPrototypeOf(new CPU80().cpu);
  const ins=I.instruction;
  I.instruction=function(){cov.add(this.pc);return ins.call(this);};
  process.on('exit',()=>{
    const lst=fs.readFileSync(path.join(__dirname,'../build/vec/events_a.lst'),'latin1').split('\n');
    // листинг: «NNNN AAAA HEX ...»
    let miss=0,tot=0;const out=[];
    for(const l of lst){const m=/^\s*\d+[+]*\s+([0-9A-F]{4})\s+([0-9A-F]{2,8})\s+(.*)$/.exec(l);if(!m)continue;const a=parseInt(m[1],16);if(a<nsym.ea_draw||a>=nsym.sh2+8)continue;tot++;if(!cov.has(a)){miss++;out.push(m[1]+' '+m[3].trim());}}
    console.log('нативных инструкций',tot,'не пройдено',miss);for(const o of out)console.log('  НЕ ПРОЙДЕНО',o);
  });
}
require('./lockn.js');
