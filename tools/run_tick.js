// Сверка шага игры целиком: node tools/run_tick.js [тиков=300] [seed=1] [комнаты через запятую]
'use strict';
const Game=require('./zxgame.js');const {SYM}=require('./sym.js');const {PRIM}=require('../src/model/core.js');
const {regsOf}=require('./difftest.js');
const game=require('../src/model/game.js');
const mods=['wally','room','flow','events_a','events_b','invaders'].map(m=>require('../src/model/'+m+'.js'));
const randAddrs=new Set();for(const m of mods)for(const d of Object.values(m.R||{}))for(const a of d.rand||[])randAddrs.add(a);
const ticks=+process.argv[2]||300,seed=+process.argv[3]||1;const rooms=(process.argv[4]||'').split(',').filter(Boolean).map(Number);
const g=new Game();const z=g.zx;
let zlog=[],rands=[],prevPc=0;
for(const a of randAddrs)g.hooks.set(a,()=>rands.push(z.cpu.getState().a));
for(const [n,d] of Object.entries(PRIM))g.hooks.set(SYM[n],()=>{ if(d.reentry&&d.reentry.includes(prevPc))return; zlog.push(d.zx(z.mem,z.cpu.getState())); });
const os=z.step.bind(z);z.step=()=>{prevPc=z.pc;return os();};
let s=seed>>>0||1;const rnd=()=>{s^=s<<13;s>>>=0;s^=s>>17;s^=s<<5;s>>>=0;return s/4294967296;};
const pool=['O','P','M'];let held=[],hold=0,bad=0,ok=0,ends={};
const per=rooms.length?Math.max(1,Math.floor(ticks/rooms.length)):0;
for(let t=0;t<ticks;t++){
  if(rooms.length&&t%per===0&&rooms[t/per|0]!==undefined)g.enterRoom(rooms[t/per|0]);
  if(g.mem[SYM.WallyLives]<2)g.mem[SYM.WallyLives]=3;
  if(hold<=0){held=[];if(rnd()<0.85)held.push(pool[Math.floor(rnd()*3)]);hold=2+Math.floor(rnd()*12);}hold--;
  const M0=new Uint8Array(z.mem),regs=regsOf(z.cpu.getState()),kb=Array.from(z.kb);
  zlog=[];rands=[];
  g.tick(held);
  // клавиши во время тика = held (keysOnly вызывается в tick до выполнения); модель берёт kb после keysOnly
  const kb2=Array.from(z.kb);
  const M=M0,r=Object.assign({},regs);
  let res;
  try{res=game.run(M,r,{kb:kb2,rands:rands.slice()});}catch(e){console.log('ОШИБКА модели тик',t,e.message);bad++;break;}
  const diffs=[];
  const sp=z.cpu.get_sp();
  for(let a=0x5800;a<0x10000;a++){ if(a===0xAB26||a===0xAB32)continue; if(a>=0xFF00)continue; if(z.mem[a]!==M[a]){diffs.push(a.toString(16)+':zx='+z.mem[a].toString(16)+' m='+M[a].toString(16));if(diffs.length>6)break;} }
  const zl=JSON.stringify(zlog),ml=JSON.stringify(res.log);
  ends[res.res]=(ends[res.res]||0)+1;
  if(diffs.length||zl!==ml){bad++;if(bad<=5){console.log('РАСХ тик',t,'комната',g.mem[SYM.Wally_RoomNo],diffs.join(' '));if(zl!==ml){let k=0;const za=zlog,ma=res.log;while(k<za.length&&k<ma.length&&JSON.stringify(za[k])===JSON.stringify(ma[k]))k++;console.log('  журнал #'+k+'/'+za.length+'/'+ma.length,JSON.stringify(za[k]),JSON.stringify(ma[k]));}}}
  else ok++;
}
console.log(`тиков ${ok+bad}: совпало ${ok}, расхождений ${bad}`,JSON.stringify(ends));
