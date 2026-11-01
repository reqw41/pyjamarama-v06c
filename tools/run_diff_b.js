// node tools/run_diff_b.js ТИКОВ SEED МОДУЛИ КОМНАТЫ — как run_diff.js, но: жизни пополняются (иначе Screen_YouLost ждёт клавишу),
// и периодически подкручивается память стенда для редких ветвей событий events_b (предметы в карманах, позиции, MagLock...).
'use strict';
const Game=require('./zxgame.js');const {Diff}=require('./difftest.js');const {SYM}=require('./sym.js');
const ticks=+process.argv[2]||300,seed=+process.argv[3]||1;
const mods=(process.argv[4]||'wally').split(',');const rooms=(process.argv[5]||'').split(',').filter(Boolean).map(Number);
const reg={};for(const m of mods)Object.assign(reg,require('../src/model/'+m+'.js').R);
const g=new Game();const d=new Diff(g,reg,{show:+process.env.SHOW||6});
let s=seed>>>0||1;const rnd=()=>{s^=s<<13;s>>>=0;s^=s>>17;s^=s<<5;s>>>=0;return s/4294967296;};
const pick=a=>a[Math.floor(rnd()*a.length)];
const pool=['O','P','M'];let held=[];let hold=0;
const per=rooms.length?Math.max(1,Math.floor(ticks/rooms.length)):0;
const m=g.mem;
for(const n of ['Screen_YouLost','Action14_Win','Game_Start','Game_MenuKeyScan'])if(SYM[n])d.addHook(SYM[n],()=>{if(process.env.TRACE)console.log('PC',n,'tick',g.ticks,'lives',m[SYM.WallyLives]);});
function put(x,y){ // телепорт Wally только на опору (иначе упадёт за экран и сломает память)
  const at=m[0x5800+(((y+0x20)>>3)<<5)+((x+8)>>3)];
  if(m[SYM.Wally_JumpDir]||m[SYM.Wally_Falling]||(m[SYM.Wally_Y]&7))return;
  if((at===0x45||at===0x42)&&(y&7)===0){m[SYM.Wally_X]=x;m[SYM.Wally_Y]=y;}
}
function perturb(){
  const room=m[SYM.Wally_RoomNo];
  const items={6:0x10,9:0x11,15:0x0f,16:0x12,28:0x0a,29:0x04};
  const it=items[room];
  if(it!==undefined){
    const r=rnd();
    if(r<0.35){m[SYM.Pocket1]=it;m[SYM.Pocket2]=0;} else if(r<0.55){m[SYM.Pocket2]=it;m[SYM.Pocket1]=0;} else {m[SYM.Pocket1]=0;m[SYM.Pocket2]=0;}
  }
  const q=rnd();
  if(room===6){m[SYM.Flag_WaterBucket]=rnd()<0.5?1:0;m[SYM.ObjSlot05_Bmp]=rnd()<0.3?0x10:m[SYM.ObjSlot05_Bmp];if(q<0.2)m[SYM.SavagePlants_Bmp]=0x79;}
  if(room===9){ if(q<0.6)put(pick([0x17,0x18,0x19,0x1a]),0x98); m[0xF18B]=rnd()<0.3?1:0; }
  if(room===16){ if(q>0.8)put(pick([0xe4,0xe6,0xe7]),0x98); }
  if(room===28){ if(q<0.1)m[SYM.Fire_Frame]=0x85; }
  if(room===29){ if(q<0.3){m[SYM.Pocket1]=4;if(!m[SYM.Wally_JumpDir]&&!m[SYM.Wally_Falling]&&!m[SYM.DeathFlag]){m[SYM.Wally_X]=pick([0x38,0x40,0x48]);m[SYM.Wally_Y]=0x84;}} if(q>0.8){m[SYM.Flag_MagLock]=pick([0x30,0x31,0xb6,0xb7]);m[SYM.MagLock_Dir]=pick([1,0xff]);} }
  if(room===22||room===23){ const gh=SYM.Ghost1+4*Math.floor(rnd()*3); if(q<0.15){m[gh]=(m[gh+2]&0x80)?0x08:0xe8;} if(q>0.85){m[gh+1]=(m[gh+3]&0x80)?0x30:0xa8;} }
  if(room===26||room===27){ if(q<0.05)m[SYM.Weight_Count]=0; if(q>0.97)m[SYM.Weight_Y]=0x6e; }
  if(rnd()<(+process.env.DEATH||0.06)&&!m[SYM.DeathFlag])m[SYM.DeathFlag]=1;
  if(rnd()<0.1&&!process.env.NOMILK)m[SYM.MilkLevel]=0;
}
for(let t=0;t<ticks;t++){
  if(rooms.length&&t%per===0&&rooms[t/per|0]!==undefined){d.pending.length=0;g.enterRoom(rooms[t/per|0]);}
  m[SYM.WallyLives]=3;
  if(t%7===3&&!process.env.NOPERT)perturb();
  if(hold<=0){held=[];if(rnd()<0.85){held.push(pick(pool));} hold=2+Math.floor(rnd()*12);}
  hold--;
  try{g.tick(held);}catch(e){console.log('HANG tick',t,'room',m[SYM.Wally_RoomNo],'pc',g.zx.pc.toString(16),'lives',m[SYM.WallyLives],'death',m[SYM.DeathFlag]);throw e;}
}
const names=Object.keys(require('../src/model/events_b.js').R);
for(const n of names)if(d.stats[n]){const x=d.stats[n];console.log(n.padEnd(24),`вызовов ${x.calls} ок ${x.ok} расх ${x.bad}`);}
d.report();
const COV=require('../src/model/events_b.js').COV;console.log('ВЕТВИ',JSON.stringify(COV));
