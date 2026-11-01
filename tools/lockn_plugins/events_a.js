// Плагин lockn для src/vec/events_a.asm: подкрутка редких состояний (крайние положения, попадания, еда на Wally, счётчики).
'use strict';
const {R}=require('../../src/model/events_a.js');
const mk=(nm)=>(c)=>{const log=R[nm].fn(c.M,c.r,c.inputs);for(const x of log||[])c.log.push(x);};
const NAMES=['Update_RollRock','Update_RollBall','Handler_Angels','Handler_Food','Food_CheckPickup','Handler_Chickens','Handler_Darts','Handler_BouncingAxe','Handler_SpookyHand'];
const models={};for(const n of NAMES)models[n]=mk(n);
const HAND_ROOMS=[2,9,0x0d,0x10,0x14,0x18,0x1b,0x0c];
const ROOM_OF={Update_RollRock:[0],Update_RollBall:[1,7],Handler_Angels:[2,11,12,14,17],Handler_Chickens:[3],Handler_Darts:[4,8,19],Handler_BouncingAxe:[5,10,18,21,29],Handler_SpookyHand:HAND_ROOMS};
function setup(name,m,rnd,env){
  const S=env.SYM;const ri=(n)=>Math.floor(rnd()*n);const pick=(a)=>a[ri(a.length)];
  const set=(a,v)=>{m[a]=v&255;};
  const W=(a)=>m[a]|m[a+1]<<8;
  const setw=(a,v)=>{m[a]=v&255;m[a+1]=(v>>8)&255;};
  if(ROOM_OF[name])set(S.Wally_RoomNo,pick(ROOM_OF[name]));
  set(S.DeathFlag,rnd()<0.15?1:0);
  set(S.Flag_BaddyInit,rnd()<0.2?0:1);
  // положить Wally рядом со спрайтом (lx,ly): попадание при lx-wx в [-13,12], ly-wy в [-14,27]
  const near=(lx,ly)=>{if(rnd()<0.6){set(S.Wally_X,lx+ri(26)-12);set(S.Wally_Y,ly-(ri(42)-14));}};
  const nearW=(a)=>near(m[a],m[a+1]);
  if(name==='Update_RollRock'){
    set(S.Wally_RoomNo,0);set(S.Room0_RockCount,rnd()<0.5?ri(3):0);set(S.Var_F18A||0xF18A,ri(0x28));
    m[0xF18A]=rnd()<0.5?0:ri(0x40);
  }else if(name==='Update_RollBall'){
    const a=S.RollBall_Position;set(a,pick([0x1a,0x18,0xb0,0xae,0x08,0x3a,0xac,0x1c,ri(0xe0)&~1]));set(a+1,pick([0xa8,0xa6,0xaa,0xa4,0x30,0x80,ri(0xb0)&~1]));
    set(S.RollBall_Bmp,0x8d+ri(3));nearW(a);
  }else if(name==='Handler_Angels'){
    for(const [p,d] of [[S.Angel1_Pos,S.Angel1_Direction],[S.Angel2_Pos,S.Angel2_Direction],[S.Angel3_Pos,S.Angel3_Direction]]){
      set(p,0x10+ri(0xc0));set(p+1,pick([0xa8,0xa6,0x32,0x30,0x2e,0xaa,0x40+ri(0x60)]));set(d,pick([2,254,2,254,2,254]));
    }
    set(S.Angel_Bmp,pick([0x93,0x95,0x97,0x98,0x93+ri(6)]));
    nearW(pick([S.Angel1_Pos,S.Angel2_Pos,S.Angel3_Pos]));
  }else if(name==='Handler_Food'||name==='Food_CheckPickup'){
    const k=ri(7),p=S.Food_Table+3*k;setw(S.Food_ActivePtr,p);
    set(S.Flag_FoodDrawn,rnd()<0.7?0:1);
    const mode=ri(4);
    if(mode===0)set(S.Wally_RoomNo,m[p]);
    else if(mode===1)set(S.Wally_RoomNo,m[p+0x16]);
    else if(mode===2)set(S.Wally_RoomNo,ri(0x1e));
    else set(S.Wally_RoomNo,m[p]);
    const q=(mode===1)?p+0x16:p;
    if(name==='Food_CheckPickup'){
      set(S.Wally_X,m[q+1]+pick([0,0,-1,-1,1,-2,2,ri(256)]));set(S.Wally_Y,rnd()<0.8?0x98:ri(256));
    }
  }else if(name==='Handler_Chickens'){
    for(const p of [S.Chicken1_Pos,S.Chicken2_Pos]){
      set(p,pick([0x0a,0x08,0xea,0xe8,0x7a,0x78,0x7c,0x40+ri(0x80)]));set(p+1,pick([0x80,0xa8,0x90,ri(256)]));set(p+2,ri(2));
    }
    set(S.Chicken_Bmp,0x7b+ri(4));nearW(pick([S.Chicken1_Pos,S.Chicken2_Pos]));
  }else if(name==='Handler_Darts'){
    for(const p of [S.Dart1_Pos,S.Dart2_Pos]){set(p,pick([0xee-ri(4),0xe0+ri(0x10),ri(256)]));set(p+1,0x60+ri(0x60));}
    set(S.Dart_Bmp,0x90+ri(3));set(S.Dart_Bmp+1,pick([1,1,2,3,0]));
    nearW(pick([S.Dart1_Pos,S.Dart2_Pos])-0);
  }else if(name==='Handler_BouncingAxe'){
    const a=S.Axe_Position;set(a,pick([0xe4,0xe6,0xe7,0xe8,0x20+ri(0xc0)]));set(a+1,pick([0x34,0x36,0xa4,0xa6,0xa8,0x38,0x3a,0x40+ri(0x60)]));
    set(S.Axe_VelocityY,pick([4,0xfc,2,0xfe,4,0xfc]));set(S.Axe_Bitmap,0xb3+ri(8));nearW(a);
  }else if(name==='Handler_SpookyHand'){
    set(S.SpookyHand,pick([0,0,1,2,0x32,ri(4)]));set(S.SpookyHand_f26c,pick([1,1,2,3]));set(S.SpookyHand_Frame,0xad+ri(6));
    if(rnd()<0.6){const t=S.SpookyHand_PosTable;for(let i=0;i<24;i+=3)if(m[t+i]===m[S.Wally_RoomNo]){near(m[t+i+1],m[t+i+2]);break;}}
  }
  return {zregs:{},nregs:{}};
}
module.exports={models,setup,prims:{},ptrvars:['Food_ActivePtr']};
