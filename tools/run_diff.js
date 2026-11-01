// node tools/run_diff.js [тиков=300] [seed=1] [модули через запятую] — случайные клавиши, сверка подпрограмм модели с ZX
'use strict';
const path=require('path');const Game=require('./zxgame.js');const {Diff}=require('./difftest.js');
const ticks=+process.argv[2]||300,seed=+process.argv[3]||1;
const mods=(process.argv[4]||'wally').split(',');const rooms=(process.argv[5]||'').split(',').filter(Boolean).map(Number);
const reg={};for(const m of mods)Object.assign(reg,require('../src/model/'+m+'.js').R);
const g=new Game();const d=new Diff(g,reg,{show:+process.env.SHOW||6});
let s=seed>>>0||1;const rnd=()=>{s^=s<<13;s>>>=0;s^=s>>17;s^=s<<5;s>>>=0;return s/4294967296;};
const pool=['O','P','M','Q'];let held=[];let hold=0;
const per=rooms.length?Math.max(1,Math.floor(ticks/rooms.length)):0;
for(let t=0;t<ticks;t++){
  if(rooms.length&&t%per===0&&rooms[t/per|0]!==undefined){d.pending.length=0;g.enterRoom(rooms[t/per|0]);}
  if(hold<=0){held=[];if(rnd()<0.85){const k=pool[Math.floor(rnd()*3)];held.push(k);} hold=2+Math.floor(rnd()*12);}
  hold--;
  if(g.mem[require('./sym.js').SYM.WallyLives]<2)g.mem[require('./sym.js').SYM.WallyLives]=3;   // чтобы игра не ушла на экран проигрыша
  g.tick(held);
}
d.report();
