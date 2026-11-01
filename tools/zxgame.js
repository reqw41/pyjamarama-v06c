// Эталон: Pyjamarama V1 на модели ZX48. Память — build/v1/ram.bin (снимок на входе в заставку), старт сразу с Game_Start (после меню).
'use strict';
const fs=require('fs'),path=require('path');
const ZX48=require('./zx48.js');const {SYM}=require('./sym.js');
const ROOT=path.join(__dirname,'..');
class Game{
  constructor(){
    const z=this.zx=new ZX48();
    z.mem.set(fs.readFileSync(path.join(ROOT,'build/v1/ram.bin')),0x4000);
    z.cpu.set_imode(1);z.cpu.set_sp(0);
    z.cpu.set_pc(SYM.Game_Start+6);                 // после CALL MainMenu
    this.loop=SYM.GameLoop;
    this.hooks=new Map();                            // addr -> fn(game) перед выполнением команды
    this.ticks=0;
    this.runToLoop(true);
  }
  get mem(){return this.zx.mem;}
  // до следующего входа в GameLoop
  runToLoop(first){
    const z=this.zx;let guard=0,started=!first&&false;
    if(!first){ z.step(); }                          // сойти с метки
    for(;;){
      const pc=z.pc;
      if(pc===this.loop&&(!first||true)){ if(first||this.ticks>=0) return; }
      const h=this.hooks.get(pc);if(h)h(this);
      z.step();
      if(++guard>4e7)throw new Error('GameLoop не достигнут');
    }
  }
  // вызвать подпрограмму ZX из тестового стенда (между тиками); возврат на метку-ловушку
  call(addr,regs){
    const z=this.zx,cpu=z.cpu;const st=cpu.getState();
    const trap=0xFFF0;const sp=(st.sp-2)&0xffff;
    z.mem[sp]=trap&255;z.mem[sp+1]=trap>>8;
    const s2=Object.assign({},st,regs||{});s2.sp=sp;s2.pc=addr;cpu.setState(s2);
    let guard=0;
    while(z.pc!==trap){ z.step(); if(++guard>4e7)throw new Error('call: нет возврата'); }
    const s3=cpu.getState();s3.pc=st.pc;s3.sp=st.sp;cpu.setState(Object.assign(s3,{a:st.a,b:st.b,c:st.c,d:st.d,e:st.e,h:st.h,l:st.l}));
  }
  // телепорт в комнату n (как Action02_EnterRoom)
  enterRoom(n,x,y){
    const m=this.zx.mem;m[SYM.Wally_RoomNo]=n;
    if(x===undefined){x=m[SYM.Wally_ResurectX+n];y=m[SYM.Wally_ResurectY+n];}
    m[SYM.Wally_X]=x;m[SYM.Wally_Y]=y;
    this.call(SYM.Wally_Reset);this.call(SYM.Room_Enter);
  }
  tick(keys){ this.zx.keysOnly(keys||[]); this.ticks++; this.runToLoop(false); }
}
module.exports=Game;
