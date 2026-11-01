// node tools/run_invaders.js [тиков_на_сценарий=400] [seed=1]
// Сверка src/model/invaders.js с ZX. Сценарии:
//  (g.enterRoom(0x1E) невозможен: у комнаты 0x1E нет данных, Room_Enter уходит в ПЗУ — аркада входится только через Action13_EnterAcrade)
//  A: комната 0x19 (Handler_Invaders), с подменой флагов лазера/карманов/ObjSlot19 и повторными входами в комнату;
//  B: аркада через Action13_EnterAcrade, тики = итерации Invaders_Loop (F4A6), выход через Invaders_ExitCheck -> GameLoop,
//     с повторным входом; редкие ветви (последний захватчик, FF в таблице этапов, низкий Y, жизни) форсируются записью в память.
// zxgame.js не правится: цикл подменён наследником (метки GameLoop и Invaders_Loop).
'use strict';
const fs=require('fs');
const Game=require('./zxgame.js');const {Diff}=require('./difftest.js');const {SYM}=require('./sym.js');
const ticks=+process.argv[2]||400,seed=+process.argv[3]||1;
class G extends Game{
  runToLoop(first){
    const z=this.zx;let guard=0;const L=[SYM.GameLoop,SYM.Invaders_Loop];
    if(!first)z.step();
    for(;;){
      const pc=z.pc;
      if(L.includes(pc))return;
      const h=this.hooks.get(pc);if(h)h(this);
      z.step();
      if(++guard>4e7)throw new Error('цикл не достигнут, pc='+z.pc.toString(16));
    }
  }
}
const reg=require('../src/model/invaders.js').R;
const g=new G();const d=new Diff(g,reg,{show:+process.env.SHOW||8,ignore:(a)=>a>=0xFFA0}); // хвост стека после LD SP,0
const z=g.zx;
// выходы без возврата: сверка в момент достижения метки цикла
{const st=z.step.bind(z);
 z.step=()=>{const cy=st();const pc=z.pc;
  if(d.pending.length&&(pc===SYM.Invaders_Loop||pc===SYM.GameLoop)){
    let p;while((p=d.pending[d.pending.length-1])&&p.def.noret){d.pending.pop();d.finish(p);}
  }return cy;};}
// ожидание клавиши (Key_WaitAny: конец игры и т.п.) — отпустить, потом нажать
d.addHook(SYM.Key_WaitAny,()=>z.keysOnly([]));d.addHook(SYM.Key_WaitAny_0,()=>z.keysOnly(['M']));
// покрытие ZX-кода
const seen=new Set();{const st=z.step.bind(z);z.step=()=>{seen.add(z.pc);return st();};}
let s=seed>>>0||1;const rnd=()=>{s^=s<<13;s>>>=0;s^=s>>17;s^=s<<5;s>>>=0;return s/4294967296;};
const ri=(n)=>Math.floor(rnd()*n);
const m=g.mem;
let held=[],hold=0;
function keys(smart){
  if(hold<=0){
    held=[];hold=2+ri(10);
    if(smart&&rnd()<0.7){
      const wx=m[SYM.Wally_X];const xs=[];
      for(let a=SYM.Invaders_Data;a<SYM.Invaders_Data+48;a+=2)if(m[a]!==0xfe&&m[a]!==0xff)xs.push(m[a]);
      if(xs.length){const t=xs[ri(xs.length)];
        if(wx>t+8)held.push('O');else if(wx<t-8)held.push('P');else held.push('M');
        if(rnd()<0.3)held.push('M');}
    }else{const r=rnd();if(r<0.8){held.push(['O','P','M'][ri(3)]);if(rnd()<0.2)held.push('M');}}
  }
  hold--;return held;
}
const tick=(smart)=>{if(m[SYM.WallyLives]<2)m[SYM.WallyLives]=2;g.tick(keys(smart));};   // без конца игры
function enterArcade(){
  const st=z.cpu.getState();
  z.cpu.set_pc(SYM.Action13_EnterAcrade);
  g.runToLoop(true);
}
// --- A: комната 0x19 ---
for(const room of [0x19]){
  d.pending.length=0;g.enterRoom(room);
  for(let t=0;t<ticks*2;t++){
    if(t%60===30){ // перемешать условия
      const pick=ri(5);
      m[SYM.Flag_LaserGun]=pick&1;
      m[SYM.Pocket1]=(pick&2)?0x0d:m[SYM.Pocket1]===0x0d?0x03:m[SYM.Pocket1];
      m[SYM.Pocket2]=(pick===4)?0x0d:m[SYM.Pocket2]===0x0d?0x03:m[SYM.Pocket2];
      m[SYM.ObjSlot19]=ri(2)?0x0d:0x05;
    }
    if(t%150===149){d.pending.length=0;g.enterRoom(room);}
    tick(false);
    if(m[SYM.Wally_RoomNo]!==room){d.pending.length=0;g.enterRoom(room);}
  }
}
// --- B: аркада ---
let wasArc=false;
d.pending.length=0;g.enterRoom(0x01);
enterArcade();
for(let t=0;t<ticks*8;t++){
  if(z.pc===SYM.GameLoop){ // вне аркады: немного поиграть и войти снова
    for(let k=0;k<5;k++)tick(false);
    enterArcade();continue;
  }
  if(t%113===50){ // редкие ветви
    const r=ri(8);
    if(r===0)m[SYM.Invaders_PauseValue]=1;
    else if(r===1)c16(SYM.Inv_TypePtr,0xf46c);
    else if(r===2)m[SYM.WallyLives]=2+ri(2);
    else if(r===3){const a=SYM.Invaders_Data+1+6*ri(8);if(m[a-1]!==0xfe){m[a]=0x9e;m[SYM.Inv___Flag]=2;}}
    else if(r===4){m[SYM.Wally_X]=0x20+ri(0xa0);}
    else if(r===5){m[SYM.Wally_X]=9;}
  }
  tick(true);
}
function c16(a,v){m[a]=v&255;m[a+1]=v>>8;}
d.report();
// непокрытые адреса ZX в наших подпрограммах
const code=fs.readFileSync('build/code.txt','utf8').split('\n');
const miss=[];
for(const l of code){const mm=/^([0-9A-F]{4}) /.exec(l);if(!mm)continue;const a=parseInt(mm[1],16);
  if(!((a>=0xF0BF&&a<=0xF176)||(a>=0xF300&&a<=0xF68C)))continue;
  if(a>=0xF4F5&&a<=0xF4F5)continue; if(a===0xF518||a===0xF519||a===0xF633||a===0xF636||a===0xF45D||a===0xF45E||a===0xF3A0||a===0xF3A1||a===0xF5BE||a===0xF5C1)continue;
  if(!seen.has(a))miss.push(l.slice(0,60));}
console.log('непокрытые команды ZX:',miss.length);
for(const l of miss)console.log('  '+l);
