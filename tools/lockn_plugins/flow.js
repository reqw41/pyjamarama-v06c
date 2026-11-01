// Плагин: потоки (диспетчер событий, смерть, ловушка-перчатка). NOEV=1 — без обработчиков комнат (иначе нужны нативные events_a/b/invaders).
'use strict';
const F=require('../../src/model/flow.js');
const wrap=(R,name)=>(c)=>{const log=R[name].fn(c.M,c.r,c.inputs);for(const x of log||[])c.log.push(x);};
const SYM=require('../sym.js').SYM;
module.exports={
  models:{
    Room_EventCaller:wrap(F.R,'Room_EventCaller'),
    Wally_CheckForDeath:wrap(F.R,'Wally_CheckForDeath'),
    a_rope:(c)=>{require('../../src/model/room.js').ACTIONS[0x12](c,c.hl);},
    'Room_TestEvents@box':(c)=>{const R=require('../../src/model/room.js').R;const log=R.Room_TestEvents.fn(c.M,c.r,c.inputs);for(const x of log||[])c.log.push(x);},
  },
  setup(name,zmem,rnd,env){
    const rm=Math.floor(rnd()*30);
    if(name==='Wally_CheckForDeath'){
      zmem[SYM.Wally_RoomNo]=rm;zmem[SYM.DeathFlag]=rnd()<0.8?1:0;zmem[SYM.WallyLives]=2+Math.floor(rnd()*2);
      zmem[SYM.Wally_X]=7+Math.floor(rnd()*0xE0);zmem[SYM.Wally_Y]=0x30+Math.floor(rnd()*0x60);zmem[SYM.MilkLevel]=Math.floor(rnd()*0x1F);
    }
    if(name==='a_rope'){zmem[SYM.Wally_Y]=0x72+2*Math.floor(rnd()*12);zmem[SYM.Wally_X]=7+Math.floor(rnd()*0xD0);zmem[SYM.Wally_RoomNo]=rm;return {zregs:{h:0x12,l:0x34},nregs:{h:0x12,l:0x34}};}
    if(name==='Room_TestEvents@box'){ // комнаты ловушки, без полотенца, ловушка активна здесь
      const rooms=[0x11,0x0F,0x03,0x07,0x01,0x14,0x0A];const r=rooms[Math.floor(rnd()*rooms.length)];
      zmem[SYM.Wally_RoomNo]=r;zmem[SYM.BoxingTrap_Room]=rnd()<0.8?r:0xFF;zmem[SYM.Pocket1]=0x01;zmem[SYM.Pocket2]=rnd()<0.15?0x15:0x02;zmem[SYM.WallyLives]=3;
      zmem[SYM.MilkLevel]=Math.floor(rnd()*0x1F);zmem[SYM.DeathFlag]=0;
      // встать на позицию теста 00, за которым в скрипте идёт тест 08 (дверь с ловушкой)
      let p=env.W(SYM.Table_RoomDataPtr+2*r),last=null,found=null;
      for(let k=0;k<80&&found===null;k++){const b=zmem[p++];if(b===0xFF)break;
        if(b===0xFD){while(zmem[p]!==0xFE){const a=zmem[p++];if(a===2)p+=3;else if(a===0x0A||a===0x0C||a===0)p+=1;}p++;continue;}
        if(b===0){last=[zmem[p],zmem[p+1]];p+=2;}else if(b===1){p+=2;last=null;}else if(b===2||b===5)p+=1;
        else if(b===8&&last)found=last;}
      if(found&&rnd()<0.9){zmem[SYM.Wally_X]=found[0];zmem[SYM.Wally_Y]=found[1];}
    }
    return null;
  },
  prims:{},ptrvars:[],
};
