// node tools/run_events_a.js [тиков=1500] [seed=1] [комнаты через запятую] [модули=events_a,wally,room]
// Сверка events_a.js с ZX: как run_diff.js + вмешательство в память стенда (жизни, молоко, позиции, еда, счётчик камня) для редких ветвей.
'use strict';
let insp,covDone;
if(process.env.COV){insp=new (require('inspector').Session)();insp.connect();insp.post('Profiler.enable');insp.post('Profiler.startPreciseCoverage',{callCount:true,detailed:true});}
const Game=require('./zxgame.js');const {Diff}=require('./difftest.js');const {SYM}=require('./sym.js');
const ticks=+process.argv[2]||1500,seed=+process.argv[3]||1;
const rooms=(process.argv[4]||'0,1,2,3,4,5,7,8,9,10,11,12,13,14,15,17,18,21,22,23,24,26,27,29').split(',').map(x=>parseInt(x,10));
const mods=(process.argv[5]||'events_a,wally,room').split(',');
const reg={};for(const m of mods)Object.assign(reg,require('../src/model/'+m+'.js').R);
const g=new Game();const d=new Diff(g,reg,{show:+process.env.SHOW||8});
const mem=g.mem;
// Update_RollRock не возвращается (JP Wally_Resurrect): закрываем сверку на входе в Wally_Resurrect
if(reg.Update_RollRock){
  const prev=g.hooks.get(SYM.Wally_Resurrect);
  g.hooks.set(SYM.Wally_Resurrect,(gg)=>{ if(prev)prev(gg);
    const t=d.pending[d.pending.length-1];
    if(t&&t.name==='Update_RollRock'){d.pending.pop();d.finish(t);d.rockEnd=(d.rockEnd||0)+1;rockDone=g.ticks;}
  });
}
let s=seed>>>0||1;const rnd=()=>{s^=s<<13;s>>>=0;s^=s>>17;s^=s<<5;s>>>=0;return s/4294967296;};
const ri=n=>Math.floor(rnd()*n);
const pool=['O','P','M'];let held=[];let rockDone=-1e9;let hold=0;
const per=Math.max(1,Math.floor(ticks/rooms.length));
const cov={};process.on('uncaughtException',e=>{{const o=require('fs').readFileSync(__dirname+'/../build/v1/ram.bin');const ch=[];for(let a=0x5b00;a<0x10000;a++)if(mem[a]!==o[a-0x4000])ch.push(a.toString(16));if(process.env.DBG)console.error('changed',ch.length,ch.slice(0,80).join(' '));}console.error(e.message,'pc',g.zx.pc.toString(16),'sp',g.zx.cpu.get_sp().toString(16),'room',mem[SYM.Wally_RoomNo]);process.exit(1);});
for(let t=0;t<ticks;t++){
  if(process.env.DBG)console.error(t,mem[SYM.Wally_RoomNo]);
  if(t%per===0&&rooms[t/per|0]!==undefined){d.pending.length=0;g.enterRoom(rooms[t/per|0]);}
  let room=mem[SYM.Wally_RoomNo];
  const tgt=rooms[Math.min(rooms.length-1,t/per|0)];
  if(room!==tgt&&!(tgt===0&&room===0x1c&&rockDone-t>-40)){d.pending.length=0;g.enterRoom(tgt);room=tgt;}
  // не умираем: жизни и молоко (но удары остаются)
  mem[SYM.WallyLives]=5; if(mem[SYM.MilkLevel]>0x18)mem[SYM.MilkLevel]=ri(8);
  if(room!==0x1c&&mem[SYM.DeathFlag]&&room!==0)mem[SYM.DeathFlag]=0;
  if(mem[SYM.Wally_Y]>mem[SYM.Wally_ResurectY+room]+8&&room<0x1d){d.pending.length=0;g.enterRoom(room);}
  const r=process.env.NOPOKE?1:rnd();
  // еда: активный указатель на случайную запись, Wally на её место
  if(r<0.02){const k=ri(7);const p=SYM.Food_Table+3*k;mem[SYM.Food_ActivePtr]=p&255;mem[SYM.Food_ActivePtr+1]=p>>8;
    const rm=mem[p];if(rm<0x1e&&(rnd()<0.5)){(process.env.DBG&&console.error('food',rm,mem[p+1].toString(16),p.toString(16)),0)||g.enterRoom(rm,Math.max(8,mem[p+1]-ri(3)+ri(3)),0x98);d.pending.length=0;}
    else if(rnd()<0.5){const q=p+0x16;if(mem[q]<0x1e){g.enterRoom(mem[q],mem[q+1]+ri(3)-1,0x98);d.pending.length=0;}}}
  else if(r<0.04){if(process.env.DBG)console.error('hitpoke'); // Wally на движущийся объект (попадание)
    const lst=[SYM.Angel1_Pos,SYM.Angel2_Pos,SYM.Angel3_Pos,SYM.Chicken1_Pos,SYM.Chicken2_Pos,SYM.Dart1_Pos,SYM.Dart2_Pos,SYM.Axe_Position,SYM.RollBall_Position];
    const a=lst[ri(lst.length)];mem[SYM.Wally_X]=Math.min(0xe0,Math.max(8,mem[a]-0x10+ri(24)));mem[SYM.Wally_Y]=Math.min(mem[SYM.Wally_ResurectY+room],Math.max(0x30,(mem[a+1]-0x20+ri(30))&~3));}
  else if(r<0.06){ // положения/направления в крайних точках
    const w=ri(8);if(process.env.DBG)console.error('poke',w);
    if(w===0)mem[SYM.Axe_Position]=0xe4+ri(4);
    if(w===1)mem[SYM.Axe_Position+1]=[0x34,0x36,0xa4,0xa6,0xa8][ri(5)];
    if(w===2){mem[SYM.Chicken1_Pos+2]=ri(2);mem[SYM.Chicken2_Pos+2]=ri(2);mem[SYM.Chicken1_Pos+1]=[0x80,0xa8,0x90][ri(3)];mem[SYM.Chicken2_Pos+1]=[0x80,0xa8,0x90][ri(3)];}
    if(w===3){mem[SYM.Chicken1_Pos]=[0x0a,0xea,0x7a,0x7c][ri(4)];mem[SYM.Chicken2_Pos]=[0x0a,0xea,0x7a,0x7c][ri(4)];}
    if(w===4){mem[SYM.RollBall_Position]=[0x1a,0x18,0xb0,0xae][ri(4)];mem[SYM.RollBall_Position+1]=0xa8+ri(4)*2;}
    if(w===5){mem[SYM.Dart1_Pos]=0xee-ri(4);mem[SYM.Dart2_Pos]=0xee-ri(4);}
    if(w===6){mem[SYM.Angel1_Pos+1]=[0xa8,0x32,0x30,0xaa][ri(4)];mem[SYM.Angel2_Pos+1]=[0xa8,0x32,0x30,0xaa][ri(4)];mem[SYM.Angel1_Pos+2]=[2,254][ri(2)];mem[SYM.Angel3_Pos+2]=[2,254][ri(2)];}
    if(w===7){mem[SYM.SpookyHand]=ri(3);mem[SYM.SpookyHand_f26c]=1+ri(2);}
  }
  if(room===0&&rnd()<0.01)mem[SYM.Room0_RockCount]=ri(3);
  if(hold<=0){held=[];if(rnd()<0.85)held.push(pool[ri(3)]);hold=2+ri(12);}
  hold--;
  g.tick(held);
}
d.report();
console.log('Update_RollRock до Wally_Resurrect закрыто сверок:',d.rockEnd||0);

if(insp){insp.post('Profiler.takePreciseCoverage',(err,{result})=>{
  const f=result.find(x=>x.url.endsWith('events_a.js'));const src=require('fs').readFileSync(__dirname+'/../src/model/events_a.js','utf8');
  const lineOf=o=>src.slice(0,o).split('\n').length;
  for(const fn of f.functions)for(const r of fn.ranges)if(r.count===0)console.log('НЕ ПОКРЫТО строки',lineOf(r.startOffset),'-',lineOf(r.endOffset),'|',src.slice(r.startOffset,Math.min(r.endOffset,r.startOffset+70)).replace(/\n/g,' '));
});}
