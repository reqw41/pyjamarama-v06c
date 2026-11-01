// Комнаты с «захватчиками»: событие комнаты 0x19 (Handler_Invaders) и аркадная комната 0x1E (Invaders_Loop и все её подпрограммы).
// Адреса — как в оригинале V1. Пиксели не читаются нигде: только Bitmap16Draw (стирание/рисование, XOR) и FX_WhiteNoise.
//
// Граница «шага» аркадной комнаты: одна итерация Invaders_Loop (F4A6 .. JR F4A6): Wally_Handler, Wally_StepCheck, 6×Inv_Update,
// Arcade_UpdateExplosions, Invaders_ExitCheck, Inv_BulletUpdate, Arcade_UpdateBombs, Invaders_Pause, Wally_CheckForDeath.
// Выходы без возврата (LD SP,0 + JP): Invaders_ExitCheck -> GameLoop; Inv_BulletUpdate (последний захватчик) -> Invaders_Loop;
// Action13_EnterAcrade -> Invaders_Loop. Модель делает всё до JP; стенд (tools/run_invaders.js) сверяет память в момент достижения метки.
'use strict';
const {S,prim,PRIM,Ctx}=require('./core.js');
const Wl=require('./wally.js');
const Rm=require('./room.js');

// ---- новые листовые примитивы ----
if(!PRIM.FX_WhiteNoise)PRIM.FX_WhiteNoise={ zx:()=>['wn'],
  fx:(c)=>{c.log.push(['wn']);let p=c.w(0xAFE9);p=(p+0x32)&0xffff;if((p>>8)===0x9c)p=(p&255)|0x8000;c.sw(0xAFE9,p);} };

const A_PTR=S.Inv_TypePtr,A_DATA=S.Invaders_Data,A_EXPL=S.Arcade_ExplosionSlots,A_BOMB=S.Arcade_BombData;
const A_ISARC=S.IsArcadeMode;
const draw=(c,a)=>{c.r.a=a&255;prim(c,'Bitmap16Draw');};
const setBmp=(c,x,y)=>{c.sb(S.BitmapX,x);c.sb(S.BitmapY,y);};
// CP A,n : возвращает «перенос» (A<n)
const neg=(a)=>(256-a)&255;

// ================= Комната 0x19 =================
function Handler_Invaders(c){
  const r=c.r;
  let up=false;
  r.a=c.b(S.Flag_LaserGun);
  if(r.a){
    r.a=c.b(S.Pocket1);if(r.a===0x0d)up=true;
    else{r.a=c.b(S.Pocket2);if(r.a===0x0d)up=true;}
  }
  if(!up){
    r.a=c.b(S.ObjSlot19);
    if(r.a===0x0d){r.a=c.b(S.Flag_LaserGun);if(r.a)up=true;}
  }
  r.c=up?0x30:0x70;
  r.a=c.b(S.Flag_BaddyInit);
  if(!r.a){
    r.a=1;c.sb(S.Flag_BaddyInit,1);
    const bc=c.bc;
    for(let i=0;i<0x12;i++)c.sb(S.Invader1+i,c.b(S.Invader_Init+i));
    c.hl=S.Invader_Init+0x12;c.de=S.Invader1+0x12;
    c.bc=bc;r.b=6;r.ix=S.Invader1;
    do{
      r.l=c.b(r.ix);r.a=(c.b(r.ix+2)+r.c)&255;r.h=r.a;
      r.ix+=3;
      r.a=c.b(S.Invaders_bitmap);c.sw(S.BitmapX,c.hl);prim(c,'Bitmap16Draw');
      r.b=(r.b-1)&255;
    }while(r.b);
    return;
  }
  let a=(c.b(S.Invaders_bitmap)+1)&255;
  if(a===0x9b)a=0x99;
  r.e=a;r.b=6;r.ix=S.Invader1;
  do{
    r.l=c.b(r.ix);r.a=c.b(r.ix+2);r.d=c.b(r.ix+1);
    r.ix+=3;
    r.a=(r.a+r.c)&255;r.h=r.a;
    r.a=r.l;
    if(r.a===0x32||r.a===0xe8){r.a=neg(r.d);r.d=r.a;c.sb(r.ix-2,r.d);}
    c.sw(S.BitmapX,c.hl);r.a=c.b(S.Invaders_bitmap);prim(c,'Bitmap16Draw');
    r.a=(r.l+r.d)&255;c.sb(r.ix-3,r.a);c.sb(S.BitmapX,r.a);
    r.a=r.e;prim(c,'Bitmap16Draw');
    const sb=r.b,sc=r.c,sd=r.d,se=r.e;
    r.b=3;Wl.Wally_HitTest(c);
    r.b=sb;r.c=sc;r.d=sd;r.e=se;
    r.b=(r.b-1)&255;
  }while(r.b);
  r.a=r.e;c.sb(S.Invaders_bitmap,r.a);
}

// ================= Аркадная комната =================
function Invaders_Init_YPos(c){
  const r=c.r;let hl=A_DATA;r.b=8;
  do{
    hl++;c.sb(hl,0x38);hl+=2;c.sb(hl,0x58);hl+=2;c.sb(hl,0x78);hl++;
    r.b=(r.b-1)&255;
  }while(r.b);
  c.hl=hl;
}
function Invaders_Init_XPos(c){
  const r=c.r;let hl=A_DATA;let a=0x0a;r.b=8;
  do{
    c.sb(hl,a);hl+=2;c.sb(hl,a);hl+=2;c.sb(hl,a);hl+=2;
    a=(a+0x18)&255;r.b=(r.b-1)&255;
  }while(r.b);
  c.hl=hl;
  c.sb(S.Invaders_ChangeDirFlag,0);c.sb(S.Invaders_CurrentDir,1);
  c.sb(S.Invaders_PauseValue,0x18);r.a=0x18;
}
function ScreenClearEffect(c){
  const col=c.b(S.Room_ColourTable+c.b(S.Wally_RoomNo));
  for(let i=0;i<0x260;i++)c.sb(0x58a0+i,col);
  c.log.push(['clrfx']);
}
function Draw_CeilingWallFloor(c){   // копия из room.js (там не экспортируется)
  const r=c.r;const hl=c.hl,bc=c.bc,de=c.de;
  r.c=0x43;c.sw(S.TileStartPtr,S.Tile_Ceiling);
  r.a=0;r.d=5;r.e=0;
  for(let i=0;i<0x20;i++){prim(c,'TileDraw');r.e=(r.e+1)&255;}
  r.a=1;r.c=0x45;r.d=0x17;r.e=0;
  for(let i=0;i<0x20;i++){prim(c,'TileDraw');r.e=(r.e+1)&255;}
  r.a=2;r.c=0x42;r.d=6;r.e=0;
  for(let i=0;i<0x11;i++){prim(c,'TileDraw');r.d=(r.d+1)&255;}
  r.e=0x1f;r.d=6;
  for(let i=0;i<0x11;i++){prim(c,'TileDraw');r.d=(r.d+1)&255;}
  c.bc=bc;c.de=de;c.hl=(hl+1)&0xffff;
}
function Invaders_Init(c){
  const r=c.r;
  const hl=c.w(A_PTR),diff=hl-S.Inv_FirstInvType;
  const carry=diff<0?1:0;
  c.hl=diff&0xffff;
  r.a=((r.l>>1)|(carry<<7))&255;
  r.a=(r.a+0x1d)&255;c.sb(S.Wally_RoomNo,r.a);
  ScreenClearEffect(c);
  Draw_CeilingWallFloor(c);
  c.de=0x0f00;c.hl=S.item_dc31;Rm.FurnitureDraw(c);
  Wl.Wally_Draw(c);
  c.hl=A_DATA;r.b=0x18;
  do{
    r.a=c.b(c.hl);r.e=r.a;c.hl++;r.d=c.b(c.hl);c.hl++;
    if(r.a!==0xfe){
      c.sw(S.BitmapX,c.de);
      const sv=c.hl;
      c.de=(c.w(S.Inv_DataPtr)+1)&0xffff;
      r.a=(sv>=c.de)?c.b(S.Inv_CurrentFrame):c.b(S.Inv_NextFrame);
      c.hl=sv;
      prim(c,'Bitmap16Draw');
    }
    r.b=(r.b-1)&255;
  }while(r.b);
  c.hl=A_EXPL;
  for(;;){r.a=c.b(c.hl);if(r.a===0xfe)break;c.sb(c.hl,0xff);c.hl+=3;}
  r.b=3;c.hl=A_BOMB;
  do{c.sb(c.hl,0xff);c.hl+=3;r.b=(r.b-1)&255;}while(r.b);
}

function Inv_Update(c){
  const r=c.r;
  c.hl=c.w(S.Inv_DataPtr);
  for(;;){
    r.a=c.b(c.hl);
    if(r.a===0xfe){c.hl+=2;continue;}
    break;
  }
  if(r.a===0xff){
    c.hl=A_DATA;c.sw(S.Inv_DataPtr,c.hl);
    c.hl=c.w(S.Inv_StartFrame);
    r.a=c.b(S.Inv_NextFrame);c.sb(S.Inv_CurrentFrame,r.a);
    r.a=(r.a+1)&255;
    if(r.a===r.h)r.a=r.l;
    c.sb(S.Inv_NextFrame,r.a);
    r.a=c.b(S.Invaders_ChangeDirFlag);r.a=(r.a+r.a)&255;
    c.sb(S.Inv___Flag,r.a);
    if(!r.a)return;
    r.a=0;c.sb(S.Invaders_ChangeDirFlag,0);
    r.a=neg(c.b(S.Invaders_CurrentDir));c.sb(S.Invaders_CurrentDir,r.a);
    return;
  }
  r.c=r.a;c.hl++;r.b=c.b(c.hl);c.hl++;
  c.sw(S.Inv_DataPtr,c.hl);c.hl-=2;
  setBmp(c,r.c,r.b);
  r.a=(c.b(S.Invaders_CurrentDir)+r.c)&255;r.c=r.a;c.sb(c.hl,r.a);
  if(r.a===0xe8||r.a===0x08){r.a=1;c.sb(S.Invaders_ChangeDirFlag,1);}
  r.a=(c.b(S.Inv___Flag)+r.b)&255;r.b=r.a;
  if(r.a>=0xa0){r.a=1;c.sb(S.DeathFlag,1);}
  c.hl++;c.sb(c.hl,r.b);
  draw(c,c.b(S.Inv_CurrentFrame));
  setBmp(c,r.c,r.b);
  draw(c,c.b(S.Inv_NextFrame));
  c.hl=c.w(S.BitmapX);r.b=2;Wl.Wally_HitTest(c);
  c.hl=c.w(S.BitmapX);
  const rv=c.inputs.rands&&c.inputs.rands.length?c.inputs.rands.shift():0;   // LD A,R
  r.a=rv;
  if(r.a>=8)return;
  c.de=c.hl;               // EX DE,HL (HL получает прежний DE — далее перезаписывается)
  r.b=3;c.hl=A_BOMB;
  for(;;){
    r.a=c.b(c.hl);
    if(r.a===0xff)break;
    c.hl+=3;r.b=(r.b-1)&255;
    if(!r.b)return;
  }
  c.sb(c.hl,r.e);c.hl++;c.sb(c.hl,r.d);c.hl++;
  c.de=c.hl;c.hl=0xF45D;
  c.sb(c.hl,(c.b(c.hl)+1)&255);r.a=c.b(c.hl);
  if(r.a===0xc7){r.a=0xc0;c.sb(c.hl,r.a);}
  c.sb(c.de,r.a);
  prim(c,'Bitmap16Draw');
}

function Arcade_CreateExplosions(c){
  const r=c.r;const hl0=c.hl,de0=c.de,bc0=c.bc;
  c.de=c.hl;c.hl=A_EXPL;
  for(;;){
    r.a=c.b(c.hl);
    if(r.a===0xfe)break;
    if(r.a===0xff){
      c.sb(c.hl,r.e);c.hl++;c.sb(c.hl,r.d);c.hl++;
      r.a=0x9f;c.sb(c.hl,r.a);
      c.hl=c.de;c.sw(S.BitmapX,c.hl);prim(c,'Bitmap16Draw');
      break;
    }
    c.hl+=3;
  }
  prim(c,'FX_WhiteNoise');
  c.bc=bc0;c.de=de0;c.hl=hl0;
}
function Arcade_UpdateExplosions(c){
  const r=c.r;r.ix=A_EXPL;
  for(;;){
    r.a=c.b(r.ix);
    if(r.a===0xfe)return;
    if(r.a!==0xff){
      r.l=r.a;r.h=c.b(r.ix+1);r.a=c.b(r.ix+2);
      c.sw(S.BitmapX,c.hl);prim(c,'Bitmap16Draw');
      r.a=(r.a+1)&255;
      if(r.a===0xa5)c.sb(r.ix,0xff);
      else{c.sb(r.ix+2,r.a);prim(c,'Bitmap16Draw');}
    }
    r.ix+=3;
  }
}

function Invaders_NextStage(c){
  const r=c.r;
  c.hl=c.w(A_PTR);r.a=c.b(c.hl);
  if(r.a===0xff){
    r.a=c.b(S.WallyLives);
    if(r.a!==3){
      r.a=(r.a+1)&255;c.sb(S.WallyLives,r.a);
      // LifeDraw_Erase -> LifeDraw_Blit
      r.a=(r.a-1)&255;r.a=(r.a*16)&255;r.l=r.a;r.h=0x10;c.sw(S.BitmapX,c.hl);r.a=0x4c;prim(c,'Bitmap16Draw');
    }
    c.hl=S.Inv_FirstInvType;
  }
  r.a=c.b(c.hl);c.sb(S.Inv_CurrentFrame,r.a);c.sb(S.Inv_StartFrame,r.a);
  c.hl++;r.a=(r.a+1)&255;c.sb(S.Inv_NextFrame,r.a);
  r.a=c.b(c.hl);c.sb(S.Inv_EndFrame,r.a);
  c.hl++;c.sw(A_PTR,c.hl);
  Invaders_Init_XPos(c);Invaders_Init_YPos(c);Invaders_Init(c);
}

// Возвращает true, если дальше управление не вернулось в вызывающего (LD SP,0 ; JP Invaders_Loop)
function Inv_BulletUpdate(c){
  const r=c.r;
  c.hl=c.w(S.Inv_BulletX);r.a=r.l;
  if(r.a===0xff)return false;
  c.de=c.hl;c.hl=A_DATA;r.b=0x18;
  for(;;){
    r.a=c.b(c.hl);
    let next=false;
    if(r.a===0xfe)next=true;
    else{
      r.a=(r.e-c.b(c.hl)-0x10)&255;
      if(r.a<0xe0)next=true;                       // дальше по Y не проверяем: _1 (двойной INC HL)
      else{
        c.hl++;
        r.a=(r.d-c.b(c.hl)-0x10)&255;
        if(r.a<0xe0){                              // _2: один INC HL
          c.hl++;r.b=(r.b-1)&255;
          if(!r.b)break;
          continue;
        }
        // попадание
        c.hl--;
        c.sw(S.BitmapX,c.de);
        r.a=0xff;c.sb(S.Inv_BulletX,r.a);
        r.a=0xbf;prim(c,'Bitmap16Draw');
        r.e=c.b(c.hl);c.sb(c.hl,0xfe);c.hl++;r.d=c.b(c.hl);
        c.sw(S.BitmapX,c.de);c.hl--;
        c.de=(c.w(S.Inv_DataPtr)-1)&0xffff;
        r.a=(c.hl>=c.de)?c.b(S.Inv_CurrentFrame):c.b(S.Inv_NextFrame);
        // SBC HL,DE меняет HL
        c.hl=(c.hl-c.de)&0xffff;
        prim(c,'Bitmap16Draw');
        c.hl=c.w(S.BitmapX);
        Arcade_CreateExplosions(c);
        c.hl=S.Invaders_PauseValue;
        const v=(c.b(c.hl)-1)&255;c.sb(c.hl,v);
        if(v)return false;
        Invaders_NextStage(c);
        return true;
      }
    }
    if(next){c.hl+=2;r.b=(r.b-1)&255;if(!r.b)break;}
  }
  // ни с кем не столкнулась: двигаем пулю вверх
  c.hl=c.w(S.Inv_BulletX);
  c.sw(S.BitmapX,c.hl);
  draw(c,0xbf);
  r.a=(r.h-3)&255;
  if(r.a<0x30){r.a=0xff;c.sb(S.Inv_BulletX,0xff);return false;}
  c.sb(S.Inv_BulletY,r.a);c.sb(S.BitmapY,r.a);
  draw(c,0xbf);
  return false;
}

function Invaders_Pause(c){
  const r=c.r;
  r.b=c.b(S.Invaders_PauseValue);
  r.a=(0x18-r.b)&255;r.a=(r.a*8)&255;
  c.hl=r.a*4+1;
  c.hl=0;r.a=0;           // цикл DEC HL до нуля
}

function Arcade_UpdateBombs(c){
  const r=c.r;r.ix=A_BOMB;r.b=3;
  do{
    r.a=c.b(r.ix);
    if(r.a===0xff)r.ix+=3;
    else{
      r.l=c.b(r.ix);r.h=c.b(r.ix+1);r.c=c.b(r.ix+2);
      r.ix+=3;
      r.a=r.c;c.sw(S.BitmapX,c.hl);prim(c,'Bitmap16Draw');
      r.h=(r.h+2)&255;r.a=r.h;
      if(r.a>=0xa8){
        c.sb(r.ix-3,0xff);r.h=(r.h-2)&255;
        Arcade_CreateExplosions(c);
      }else{
        c.sb(r.ix-2,r.h);c.sw(S.BitmapX,c.hl);r.a=r.c;prim(c,'Bitmap16Draw');
        const bc=c.bc;r.b=2;Wl.Wally_HitTest(c);c.bc=bc;
      }
    }
    r.b=(r.b-1)&255;
  }while(r.b);
}

// false — вернулся, true — вышел в GameLoop (LD SP,0; JP GameLoop)
function Invaders_ExitCheck(c){
  const r=c.r;
  c.hl=c.w(S.Wally_X);r.a=r.l;
  r.a=(r.a-8)&255;r.a=(r.a-1)&255;
  if(r.a<0xfe)return false;
  r.a=0x15;c.sb(S.Wally_RoomNo,r.a);
  c.hl=0x98d0;c.sw(S.Wally_X,c.hl);
  Rm.Room_Enter(c);
  r.a=0;c.sb(A_ISARC,0);
  return true;
}

// вход в аркаду (LD SP,0; JP Invaders_Loop)
function Action13_EnterAcrade(c){
  const r=c.r;
  c.hl=0x9810;c.sw(S.Wally_X,c.hl);
  Rm.Wally_Reset(c);
  Invaders_Init_XPos(c);Invaders_Init_YPos(c);Invaders_Init(c);
  r.a=1;c.sb(A_ISARC,1);r.a=0xff;c.sb(S.Inv_BulletX,0xff);
}

const run=(f)=>(M,r,i)=>{const c=new Ctx(M,r,i);f(c);return c.log;};
const R={
  Handler_Invaders:{fn:run(Handler_Invaders),out:['a','b','c','d','e','h','l','ix']},
  Invaders_Init_YPos:{fn:run(Invaders_Init_YPos),out:['b','h','l']},
  Invaders_Init_XPos:{fn:run(Invaders_Init_XPos),out:['a','b','h','l']},
  Invaders_Init:{fn:run(Invaders_Init),out:['a','b','h','l','d','e']},
  Inv_Update:{fn:run(Inv_Update),out:[],rand:[0xF433]},
  Arcade_CreateExplosions:{fn:run(Arcade_CreateExplosions),out:['a','b','c','d','e','h','l']},
  Arcade_UpdateExplosions:{fn:run(Arcade_UpdateExplosions),out:['a','h','l','ix']},
  Invaders_NextStage:{fn:run(Invaders_NextStage),out:['a','b','h','l','d','e']},
  Inv_BulletUpdate:{fn:run(Inv_BulletUpdate),out:[],noret:true},
  Invaders_Pause:{fn:run(Invaders_Pause),out:['a','b','h','l']},
  Arcade_UpdateBombs:{fn:run(Arcade_UpdateBombs),out:['b','c','h','l','ix']},
  Invaders_ExitCheck:{fn:run(Invaders_ExitCheck),out:['a','h','l'],noret:true},
  Action13_EnterAcrade:{fn:run(Action13_EnterAcrade),out:[],noret:true},
};
module.exports={R,Handler_Invaders,Invaders_Init_YPos,Invaders_Init_XPos,Invaders_Init,Inv_Update,Arcade_CreateExplosions,Arcade_UpdateExplosions,
  Invaders_NextStage,Inv_BulletUpdate,Invaders_Pause,Arcade_UpdateBombs,Invaders_ExitCheck,Action13_EnterAcrade};
