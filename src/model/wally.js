// Wally: ввод, ходьба, прыжок, падение, шаги, энергия (молоко). Адреса — как в оригинале V1.
'use strict';
const {S,prim,attrAddr}=require('./core.js');
const A_BGCOL=S.Wally_BgColour,A_PREVHEAD=0xF188;
const wallyPos=(c)=>c.w(S.Wally_X);            // L = X, H = Y

function ATTR(c,y,x){return c.b(attrAddr(y,x));}

// ---- Wally_Erase / Wally_Draw ----
function bmpPair(c,hl){
  // выбор кадра: по F188 (голова повёрнута в прошлый раз)
  const fr=c.b(S.Wally_Frame);let a;
  if(c.b(A_PREVHEAD)){a=fr<0x10?(fr+0x3e)&255:(fr+0x2f)&255;} else a=fr;
  c.sw(S.BitmapX,hl);
  c.r.a=a;prim(c,'Bitmap16Draw');
  c.sb(S.BitmapY,((hl>>8)+0x10)&255);
  c.r.a=(fr+1)&255;prim(c,'Bitmap16Draw');
}
function Wally_Erase(c){
  const r=c.r,save={a:r.a,b:r.b,c:r.c,d:r.d,e:r.e};
  let hl=wallyPos(c);let x=hl&255,y=hl>>8;
  const shift=x&7;c.sb(S.Wally_ShiftValue,shift);
  const col=x>>3;const rows=(y&7)?5:4;
  let at=0x5800+((y&0xf8)<<2)+col;let bc=A_BGCOL;
  for(let i=0;i<rows;i++){
    c.sb(at,c.b(bc));c.sb(at+1,c.b(bc+1));
    if(shift)c.sb(at+2,c.b(bc+2));
    bc+=3;at+=32;
  }
  bmpPair(c,hl);
  c.sb(A_PREVHEAD,c.b(S.Wally_HeadTurned));
  Object.assign(r,save);c.hl=hl;
}
function Wally_Draw(c){
  const r=c.r,save={a:r.a,b:r.b,c:r.c,d:r.d,e:r.e};
  const hl=wallyPos(c);let x=hl&255,y=hl>>8;
  bmpPair(c,hl);
  const shift=x&7;c.sb(S.Wally_ShiftValue,shift);
  const col=x>>3;c.sb(S.Wally_CharAligned,y&7);
  const rows=(y&7)?5:4;
  let at=0x5800+((y&0xf8)<<2)+col;let bc=A_BGCOL;
  for(let i=0;i<rows;i++){
    c.sb(bc,c.b(at));c.sb(at,0x46);
    c.sb(bc+1,c.b(at+1));c.sb(at+1,0x46);
    if(shift){c.sb(bc+2,c.b(at+2));c.sb(at+2,0x46);}
    bc+=3;at+=32;
  }
  Object.assign(r,save);c.hl=(0x5800+((y&0xf8)<<2)+col+32*rows)&0xffff;
}

// ---- энергия (молоко) ----
function Bmp_DrawRows(c){
  const r=c.r;
  for(;;){
    let hl=c.hl;
    let de=0x000b;
    let ixv=c.w(r.ix);r.ix+=2;
    de=(ixv+de)&0xffff;
    // 3 x LDI: HL,DE +3, BC -3 (на экран не пишем)
    hl=(hl+3)&0xffff;de=(de+3)&0xffff;
    c.hl=hl;c.de=de;c.bc=(c.bc-3)&0xffff;
    const lvl=(c.b(S.MilkLevel)+1)&255;c.sb(S.MilkLevel,lvl);
    r.a=lvl;
    if(lvl===0x20){c.sb(S.DeathFlag,1);r.a=1;return;}
    r.b=(r.b-1)&255;if(r.b===0)return;
  }
}
function Milk_DecreaseByAmount(c){
  const r=c.r;const bsave=c.bc;
  r.b=0xff;r.c=0x0a;r.d=0x01;r.e=0x14;r.h=0x3c;r.l=0xc4;prim(c,'Beep_Effect');
  c.bc=bsave;
  const lvl=c.b(S.MilkLevel);
  r.ix=S.DF_lookup+((lvl*2)&255);
  r.c=0xff;
  const off=((lvl*2)&255)+lvl&255;
  c.de=off&255;c.hl=S.Bmp_MilkEmpty+(off&255);
  Bmp_DrawRows(c);
}
function Wally_EnergyIncBy(c){
  const r=c.r;
  let lvl=c.b(S.MilkLevel);
  const nl=lvl-r.b;
  r.a=nl&255;r.c=nl&255;c.sb(S.MilkLevel,nl&255);
  if(nl<0){prim(c,'Milk_DrawFull');r.a=0;c.sb(S.MilkLevel,0);return;}
  const a=nl&255;
  r.ix=S.DF_lookup+((a*2)&255);
  const off=(((a*2)&255)+a)&255;
  c.de=off;c.hl=S.Bmp_MilkFull+off;
  const bcSave=c.bc;
  r.b=(r.b+1)&255;
  Bmp_DrawRows(c);
  c.bc=bcSave;
  r.a=r.c;c.sb(S.MilkLevel,r.c);
}
function Energy_Countdown(c){
  const r=c.r;const sv={a:r.a,b:r.b,c:r.c,d:r.d,e:r.e,h:r.h,l:r.l};
  if(c.b(S.IgnoreEnergy))return;
  const v=(c.w(S.EnergyCounter)-1)&0xffff;c.sw(S.EnergyCounter,v);
  if(v===0){c.sw(S.EnergyCounter,0x012c);r.b=1;Milk_DecreaseByAmount(c);}
  Object.assign(r,sv);
}
function Wally_HitTest(c){
  const r=c.r;
  r.a=c.b(S.DeathFlag);
  if(r.a)return;
  const w=c.w(S.Wally_X);c.de=w;const e=w&255,d=w>>8;
  let a=(r.l-e-0x0d)&255;r.a=a;if(a<0xe6)return;
  a=(r.h-d-0x1c)&255;r.a=a;if(a<0xd6)return;
  const ix=r.ix,hl=c.hl;Milk_DecreaseByAmount(c);r.ix=ix;c.hl=hl;
}

// ---- шаги ----
function Wally_StepsIncr(c){
  const r=c.r;
  c.bc=0x0701;c.de=0x0f01;c.hl=0x0404;prim(c,'Beep_Effect');
  let p=S.Steps_Count;let carry=1;
  for(let i=0;i<4;i++){
    let v=c.b(p+i)+carry;
    // BCD сложение
    let lo=(c.b(p+i)&15)+carry,hi=c.b(p+i)>>4;
    carry=0;if(lo>9){lo-=10;hi++;}
    if(hi>9){hi-=10;carry=1;}
    c.sb(p+i,(hi<<4)|lo);
  }
  c.hl=p+3;
}
function Wally_StepCheck(c){
  const fr=c.b(S.Wally_Frame)&~0x18&255;
  if(fr){c.sb(S.Wally_StepFlag,0);return;}
  if(c.b(S.Wally_StepFlag))return;
  c.sb(S.Wally_StepFlag,1);
  Wally_StepsIncr(c);
}

// ---- поворот головы (случайный LD A,R из inputs.rands) ----
function Wally_TurnHead(c){
  const a=c.r.a;
  const cnt=()=>c.b(S.Wally_HeadCountdown);
  if(a===0x00||a===0x10){ if(cnt()===0)c.sb(S.Wally_HeadTurned,1); else c.sb(S.Wally_HeadCountdown,cnt()-1); return; }
  if(a===0x0c||a===0x1c){
    if(cnt()!==0){c.sb(S.Wally_HeadCountdown,cnt()-1);return;}
    c.sb(S.Wally_HeadTurned,0);
    const rv=c.inputs.rands&&c.inputs.rands.length?c.inputs.rands.shift():0;
    c.sb(S.Wally_HeadCountdown,rv&0x1f);return;
  }
  if(cnt()!==0)c.sb(S.Wally_HeadCountdown,cnt()-1);
}

// ---- ходьба ----
function Wally_Move(c){
  const r=c.r;
  Energy_Countdown(c);
  if(c.b(S.Wally_Dir)===1){
    let a=c.b(S.Wally_Frame);r.a=a;Wally_TurnHead(c);
    if(a<0x10){c.sb(S.Wally_HeadTurned,0);a=0x10;}
    else{a=(a+2)&255;if(a>=0x20){c.sb(S.Wally_HeadTurned,0);a=0x10;}}
    r.a=a;Wally_Erase(c);c.sb(S.Wally_Frame,a);
    let hl=c.hl;let l=((hl&255)+2)&255;if(l>=0xe9)l=0xe9;
    c.sw(S.Wally_X,(hl&0xff00)|l);r.a=a;Wally_Draw(c);
  }else{
    let a=c.b(S.Wally_Frame);r.a=a;Wally_TurnHead(c);
    // CP 0 / JR NC всегда идёт в _1
    a=(a+2)&255;
    if(a>=0x10){c.sb(S.Wally_HeadTurned,0);a=0;}
    r.a=a;Wally_Erase(c);c.sb(S.Wally_Frame,a);
    let hl=c.hl;let l=((hl&255)-2)&255;if(l<7)l=7;
    c.sw(S.Wally_X,(hl&0xff00)|l);r.a=a;Wally_Draw(c);
  }
}

// ---- прыжок ----
function Wally_StepsIncrJump(c){Wally_StepsIncr(c);}
function jumpCommon(c,right){
  const r=c.r;
  c.sb(S.Wally_HeadTurned,0);
  const t=S.Wally_JumpTable+c.b(S.Wally_JumpCount)*3;
  const e=c.b(t),d=c.b(t+1),b=c.b(t+2);
  r.e=e;r.d=d;r.b=b;
  const f=(d-1)&255;
  let skipMove=false;
  if(!(f&0x80)){
    const at=c.b(S.Wally_ATTR);
    if((at===0x42||at===0x45)&&(c.b(S.Wally_Y)&7)===0)skipMove=true;
  }
  Wally_Erase(c);
  if(!skipMove){
    let hl=c.hl;let h=((hl>>8)+d)&255;let l=hl&255;
    if(right){l=(l+e)&255;if(l>=0xe9)l=0xe9;}
    else{l=(l-e)&255;if(l<7)l=7;}
    c.sw(S.Wally_X,(h<<8)|l);c.hl=(h<<8)|l;
  }
  c.sb(S.Wally_Frame,(b+(right?0x30:0x20))&255);
  Wally_Draw(c);
  const n=(c.b(S.Wally_JumpCount)+1)&255;c.sb(S.Wally_JumpCount,n);
  if(n!==0x0c)return;
  c.sb(S.Wally_Dir,0);c.sb(S.Wally_JumpDir,0);
  Wally_StepsIncr(c);
}
function Wally_JumpHandlerEntry(c){ jumpCommon(c,c.b(S.Wally_Dir)===1); }
function Wally_ShootCreate(c){
  const r=c.r;
  if(c.b(S.Inv_BulletX)!==0xff)return Wally_Handler_5(c);
  let hl=c.w(S.Wally_X);hl=(hl&0xff)|((((hl>>8)-8)&255)<<8);
  c.sw(S.Inv_BulletX,hl);c.sw(S.BitmapX,hl);
  r.a=0xbf;prim(c,'Bitmap16Draw');
  c.bc=0x1e0f;c.de=0x010f;c.hl=0x08f8;prim(c,'Beep_Effect');
  return Wally_Handler_5(c);
}
function Wally_Jump(c){
  if(c.b(S.IsArcadeMode))return Wally_ShootCreate(c);
  Energy_Countdown(c);
  let a=c.b(S.Wally_Dir);
  if(a===0){a=c.b(S.Wall_LastDir);c.sb(S.Wally_Dir,a);}
  c.sb(S.Wally_JumpDir,a);c.sb(S.Wally_JumpCount,0);
  Wally_JumpHandlerEntry(c);
}

// ---- падение ----
function Wally_CheckFall(c){
  const r=c.r;
  const at=c.b(S.Wally_ATTR);
  if((at===0x42||at===0x45)&&(c.b(S.Wally_Y)&7)===0){c.sb(S.Wally_Falling,0);return;}
  r.a=c.b(S.Wally_Frame);Wally_Erase(c);
  const hl=c.hl;const h=((hl>>8)+4)&255;
  c.sb(S.Wally_Y,h);
  Wally_Draw(c);
}

// ---- главный обработчик ----
function key(c,port){ return c.inKey(port); }
function Wally_Handler(c){
  const r=c.r;
  if(c.b(S.Wally_CharAligned)===0){
    const w=c.w(S.Wally_X);
    const x=((w&255)+8)&255,y=((w>>8)+0x20)&255;
    const a=c.b(attrAddr(y,x));
    c.sb(S.Wally_ATTR,a);c.sb(S.Wally_ATTRAlt,c.b(0xAE35));
  }else{
    c.sb(S.Wally_ATTRAlt,c.b(0xAE38));c.sb(S.Wally_ATTR,c.b(0xAE38));
  }
  if(!c.b(S.IsArcadeMode)&&c.b(S.Wally_JumpDir)) return Wally_JumpHandlerEntry(c);
  if(c.b(S.Wally_Falling)) return Wally_CheckFall(c);
  const at=c.b(S.Wally_ATTR);
  if(at!==0x45&&at!==0x42){c.sb(S.Wally_Falling,1);return Wally_CheckFall(c);}
  // прыжок?
  let jump;
  const kemp=c.kempston!==undefined?c.kempston:0xff;
  if(c.b(S.Input_Flag))jump=(kemp&0x10)!==0;
  else{ jump=((c.inKey((c.b(S.Game_InputJumpAddr)<<8)|0xfe)|0xe0)|c.b(S.Game_InputJump))!==0xff; }
  if(jump) return Wally_Jump(c);
  return Wally_Handler_5(c);
}
function Wally_Handler_5(c){
  c.sb(S.Wally_Dir,0);
  let right;
  const kemp=c.kempston!==undefined?c.kempston:0xff;
  if(c.b(S.Input_Flag)) right=(kemp&1)!==0;
  else right=((c.inKey((c.b(S.Game_InputRightAddr)<<8)|0xfe)|0xe0|c.b(S.Game_InputRight))!==0xff);
  if(right){c.sb(S.Wally_Dir,1);c.sb(S.Wall_LastDir,1);return Wally_Move(c);}
  let left;
  if(c.b(S.Input_Flag)) left=(kemp&2)!==0;
  else left=((c.inKey((c.b(S.Game_InputLeftAddr)<<8)|0xfe)|0xe0|c.b(S.Game_InputLeft))!==0xff);
  if(!left)return;
  c.sb(S.Wally_Dir,0xff);c.sb(S.Wall_LastDir,0xff);return Wally_Move(c);
}

const R={
  Wally_Erase:{fn:(M,r,i)=>run(M,r,i,Wally_Erase),out:['hl','a','b','c','d','e']},
  Wally_Draw:{fn:(M,r,i)=>run(M,r,i,Wally_Draw),out:['hl','a','b','c','d','e']},
  Energy_Countdown:{fn:(M,r,i)=>run(M,r,i,Energy_Countdown),out:['a','b','c','d','e','h','l']},
  Milk_DecreaseByAmount:{fn:(M,r,i)=>run(M,r,i,Milk_DecreaseByAmount),out:['b','c','ix']},
  Wally_EnergyIncBy:{fn:(M,r,i)=>run(M,r,i,Wally_EnergyIncBy),out:[]},
  Wally_HitTest:{fn:(M,r,i)=>run(M,r,i,Wally_HitTest),out:['hl','a','d','e','b','c','ix']},
  Wally_StepCheck:{fn:(M,r,i)=>run(M,r,i,Wally_StepCheck),out:[]},
  Wally_StepsIncr:{fn:(M,r,i)=>run(M,r,i,Wally_StepsIncr),out:[]},
  Wally_TurnHead:{fn:(M,r,i)=>run(M,r,i,Wally_TurnHead),out:['a'],rand:[0xADA5]},
  Wally_Move:{fn:(M,r,i)=>run(M,r,i,Wally_Move),out:[],rand:[0xADA5]},
  Wally_Jump:{fn:(M,r,i)=>run(M,r,i,Wally_Jump),out:[]},
  Wally_CheckFall:{fn:(M,r,i)=>run(M,r,i,Wally_CheckFall),out:[]},
  Wally_Handler:{fn:(M,r,i)=>run(M,r,i,Wally_Handler),out:[],rand:[0xADA5]},
};
const {Ctx}=require('./core.js');
function run(M,r,i,f){const c=new Ctx(M,r,i);f(c);return c.log;}
module.exports={R,Wally_Erase,Wally_Draw,Wally_Handler,Wally_Move,Wally_Jump,Energy_Countdown,Milk_DecreaseByAmount,Wally_EnergyIncBy,Wally_HitTest,Wally_StepCheck,Wally_StepsIncr,Wally_CheckFall,Wally_TurnHead};
