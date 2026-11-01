// События комнат (часть B): Savage Plant, Balloon Help, Books, Moving Floor, Ghosts, Three Ton, Falling Blocks, Fire, MagLock + Action0D.
'use strict';
const {S,prim,Ctx}=require('./core.js');
const W=require('./wally.js');
const ROOM=require('./room.js');

const COV={};const cv=(k)=>{COV[k]=(COV[k]||0)+1;};
const bmp=(c,a,hl)=>{ // LD (BitmapX),HL ; LD A,a ; CALL Bitmap16Draw
  if(hl!==undefined)c.sw(S.BitmapX,hl);
  c.r.a=a&255;prim(c,'Bitmap16Draw');
};
const hit=(c,b)=>{ if(b!==undefined)c.r.b=b; W.Wally_HitTest(c); };

// ---- E75B: магнитные прутья (XOR по пикселям экрана, пиксели логики не читаются) ----
function Handler_MagLock(c){
  const dir=c.b(S.MagLock_Dir);let a=c.b(S.Flag_MagLock);
  if(dir===1){ if(a===0xb7){cv('mag.closedEnd');return;} cv('mag.close'); }
  else{ if(a===0x30){cv('mag.openEnd');return;} cv('mag.open'); a=(a-1)&255; }
  const row=c.w(S.DF_lookup+2*a);
  let hl=(row+0x0f)&0xffff;
  for(const o of [0,1,3,6,8,9]){const p=(hl+o)&0xffff;c.M[p]^=0x2c;}
  c.sb(S.Flag_MagLock,c.b(S.Flag_MagLock)+dir);
  c.r.a=c.b(S.Flag_MagLock);
}
// ---- E7AE: действие 0D (замок открыт: раскраска платформ) ----
function Action0D(c,hl){
  cv('action0D');
  c.sb(S.MagLock_Dir,0xff);
  let p=0x5a8d;
  for(let i=0;i<5;i++){c.sb(p,0x45);c.sb(p+1,0x45);p=p-0x1e;}
  p=0x5a37;
  for(let i=0;i<4;i++){c.sb(p,0x45);c.sb(p+1,0x45);p+=0x22;}
  return hl; // в ZX это RET из Room_TestEvents; в данных комнаты 0x1D действие последнее (FD 0D FE FF)
}
ROOM.ACTIONS[0x0d]=Action0D;

// ---- E7FE / EAEC: движущийся пол ----
function Handler_MovingFloor(c){
  const r=c.r;
  if(c.b(S.DeathFlag)){cv('mf.dead');return;}
  if(c.b(S.Pocket1)===0x12||c.b(S.Pocket2)===0x12){cv('mf.remote');return;}
  if(c.b(S.Wally_Y)<0x91){cv('mf.above');return;}
  cv('mf.move');
  W.Wally_Erase(c);
  let a=(r.l+2)&255;if(a>=0xe8){a=0xe8;cv('mf.clamp');}
  r.l=a;c.sw(S.Wally_X,c.hl);
  W.Wally_Draw(c);
}
function Animate_MovingFloor(c){
  const r=c.r;
  if(c.b(S.Pocket1)===0x12||c.b(S.Pocket2)===0x12){cv('am.remote');return;}
  if(c.b(S.DeathFlag)){cv('am.dead');return;}
  cv('am.run');
  let ix=0x91dd;
  for(let cc=2;cc>0;cc--){
    let hl=(c.w(ix)-2)&0xffff;ix=(ix-2)&0xffff;
    r.a=c.b(hl);r.a=((r.a>>1)|(r.a<<7))&255;
    for(let b=0x20;b>0;b--){const v=c.b(hl);c.sb(hl,((v>>1)|(v<<7))&255);hl=(hl+1)&0xffff;}
    c.hl=hl;r.b=0;r.c=0;
  }
  r.ix=ix;
}

// ---- E838: падающие блоки ----
function Handler_FallingBlocks(c){
  const r=c.r;
  if(!c.b(S.Flag_BaddyInit)){
    cv('fb.init');
    c.sb(S.Flag_BaddyInit,1);
    let ix=S.Block_Data;
    for(r.b=5;r.b;r.b--){
      c.hl=c.w(ix);ix+=3;
      bmp(c,0x72,c.hl);
    }
    c.hl=0x98e0;
    bmp(c,c.b(S.Fire_Frame),c.hl);
    return;
  }
  let ix=S.Block_Data;
  for(r.b=5;r.b;r.b--){
    c.hl=c.w(ix);r.c=c.b(ix+2);
    const bc=c.bc;
    r.b=2;hit(c);
    c.bc=bc;
    ix+=3;
    bmp(c,0x72,c.hl);
    let a=(r.h+r.c)&255;
    if(a>=0xb0){
      cv('fb.wrap');
      const rv=c.inputs.rands&&c.inputs.rands.length?c.inputs.rands.shift():0;
      r.c=(rv&1)+1;a=0x68;
    }
    c.sb(ix-2,a);c.sb(ix-1,r.c);
    c.sb(S.BitmapY,a);
    r.a=0x72;prim(c,'Bitmap16Draw');
  }
}

// ---- E8B0: огонь ----
function Handler_Fire(c){
  const r=c.r;
  if(c.b(S.Pocket1)===0x0a||c.b(S.Pocket2)===0x0a){cv('fire.ext');return;}
  cv('fire.run');
  let a=c.b(S.Fire_Frame);
  c.hl=0x98e0;bmp(c,a,c.hl);
  a=(a+1)&255;if(a===0x86){a=0x81;cv('fire.loop');}
  c.sb(S.Fire_Frame,a);
  bmp(c,a);
  hit(c,0x10);
}

// ---- EA60: воздушный шар ----
function Handler_BalloonHelp(c){
  const r=c.r;
  if(!c.b(S.Flag_BaddyInit)){
    cv('bh.init');c.sb(S.Flag_BaddyInit,1);
    c.hl=0x8018;
    bmp(c,0x73,c.hl);
    c.sb(S.BitmapY,0x90);
    bmp(c,0x74);
    return;
  }
  const w=c.w(S.Wally_X);const e=w&255,d=w>>8;
  r.d=d;r.e=e;
  if(((0x18-e-1)&255)<0xfe){cv('bh.x');return;}
  if(d!==0x98){cv('bh.y');return;}
  if(c.b(S.Pocket1)!==0x11&&c.b(S.Pocket2)!==0x11){cv('bh.noscissors');return;}
  if(c.b(0xF18B)){cv('bh.done');return;}
  cv('bh.lift'+(c.b(S.Pocket1)===0x11?'1':'2'));
  r.b=0x50;r.c=0x80;
  do{
    const bc=c.bc;
    r.l=0x18;r.h=r.c;
    bmp(c,0x73,c.hl);
    r.h=(r.h-1)&255;bmp(c,0x73,c.hl);
    r.h=(r.h+0x11)&255;bmp(c,0x74,c.hl);
    r.h=(r.h-1)&255;bmp(c,0x74,c.hl);
    W.Wally_Erase(c);
    r.h=(r.h-1)&255;c.sw(S.Wally_X,c.hl);
    W.Wally_Draw(c);
    c.bc=bc;
    r.c=(r.c-1)&255;r.b=(r.b-1)&255;
  }while(r.b);
  c.sb(0xF18B,1);
}

// ---- EBBC: хищные растения ----
function Handler_SavagePlant(c){
  const r=c.r;
  if(!c.b(S.Flag_BaddyInit)){
    cv('sp.init');c.sb(S.Flag_BaddyInit,1);
    const a=c.b(S.SavagePlants_Bmp);
    c.hl=0xa848;bmp(c,a,c.hl);
    r.l=0xa8;bmp(c,a,c.hl);
    return;
  }
  if(c.b(S.Flag_WaterBucket)){
    if(c.b(S.Pocket1)===0x10){cv('sp.frz1');return;}
    if(c.b(S.Pocket2)===0x10){cv('sp.frz2');return;}
    if(c.b(S.ObjSlot05_Bmp)===0x10){cv('sp.frzSlot');return;}
  }
  let a=c.b(S.SavagePlants_Bmp);
  c.hl=0xa848;bmp(c,a,c.hl);
  r.l=0xa8;bmp(c,a,c.hl);
  a=(a+1)&255;if(a===0x7a){a=0x75;cv('sp.loop');}
  r.b=8;c.sb(S.SavagePlants_Bmp,a);
  r.l=0x48;r.h=0xa8;
  bmp(c,a,c.hl);
  const sa=r.a;hit(c);r.a=sa;
  r.l=0xa8;bmp(c,r.a,c.hl);
  hit(c);
  a=c.b(S.SavagePlants_Bmp);r.a=a;
  if(a!==0x75)return;
  cv('sp.beep');
  c.bc=0x1408;c.de=0x0108;c.hl=0x7f82;prim(c,'Beep_Effect');
}

// ---- EC45: книги ----
function Handler_Books(c){
  const r=c.r;
  if(!c.b(S.Flag_BaddyInit)){
    cv('bk.init');c.sb(S.Flag_BaddyInit,1);
    c.sb(S.Book1_Ypos,0x58);r.h=0x58;r.l=0x70;
    bmp(c,0x7a,c.hl);
    c.sb(S.Book2_Ypos,0x77);r.h=0x77;
    bmp(c,0xc7,c.hl);
    return;
  }
  const book=(ypos,bm)=>{
    let b=c.b(ypos);r.b=b;r.h=b;r.l=0x70;
    bmp(c,bm,c.hl);
    r.b=(r.b+1)&255;let a=r.b;
    if(a>=0x80){a=0x46;cv('bk.wrap');}
    c.sb(ypos,a);c.sb(S.BitmapY,a);
    bmp(c,bm);
  };
  book(S.Book1_Ypos,0x7a);
  if(c.b(S.Pocket1)!==0x0f&&c.b(S.Pocket2)!==0x0f)hit(c,0x10); else cv('bk.helmet1');
  book(S.Book2_Ypos,0xc7);
  if(c.b(S.Pocket1)===0x0f||c.b(S.Pocket2)===0x0f){cv('bk.helmet2');return;}
  hit(c,0x10);
}

// ---- EE00: гиря на 3 тонны ----
function Handler_ThreeTon(c){
  const r=c.r;
  const draw=()=>{ // Weight_draw
    bmp(c,0x7f,c.hl);
    r.h=(r.h+0x10)&255;c.sb(S.BitmapY,r.h);
    r.a=0x80;prim(c,'Bitmap16Draw');
  };
  if(!c.b(S.Flag_BaddyInit)){
    cv('tt.init');
    c.sb(S.Flag_BaddyInit,1);
    c.sb(S.Weight_Count,0x64);c.sb(S.Weight_Y,0x30);
    r.h=0x30;r.l=0x88;
    draw();
  }else{
    let a=c.b(S.Weight_Count);
    if(a){cv('tt.wait');c.sb(S.Weight_Count,(a-1)&255);return;}
    a=c.b(S.Weight_Y);r.h=a;r.l=0x88;
    if(a!==0x70){
      cv('tt.fall');
      bmp(c,0x7f,c.hl);
      c.sb(S.BitmapY,(r.h+0x10)&255);
      r.a=0x80;prim(c,'Bitmap16Draw');
      r.h=(r.h+2)&255;
      c.sb(S.Weight_Y,r.h);
      draw();
    }
  }
  if(!(c.b(S.Weight_Y)!==0x70))cv('tt.table');
  hit(c,2);
}

// ---- EFF4: привидения ----
function Handler_Ghosts(c){
  const r=c.r;
  if(!c.b(S.Flag_BaddyInit)){
    cv('gh.init');c.sb(S.Flag_BaddyInit,1);
    c.hl=0xa064;c.sw(S.Ghost1,c.hl);bmp(c,c.b(S.Ghost_Bitmap),c.hl);
    c.hl=0x50dc;c.sw(S.Ghost2,c.hl);bmp(c,c.b(S.Ghost_Bitmap),c.hl);
    c.hl=0x3a30;c.sw(S.Ghost3,c.hl);bmp(c,c.b(S.Ghost_Bitmap),c.hl);
    return;
  }
  let a=(c.b(S.Ghost_Bitmap)+1)&255;if(a===0xbf){a=0xbb;cv('gh.animloop');}
  r.c=a;
  let ix=S.Ghost1;
  for(r.b=3;r.b;r.b=(r.b-1)&255){
    r.l=c.b(ix);r.h=c.b(ix+1);r.e=c.b(ix+2);r.d=c.b(ix+3);ix+=4;
    if(r.l===0x08||r.l===0xe8){cv('gh.bounceX'+r.l);r.e=(-r.e)&255;}
    if(r.h===0x30||r.h===0xa8){cv('gh.bounceY'+r.h);r.d=(-r.d)&255;}
    bmp(c,c.b(S.Ghost_Bitmap),c.hl);
    r.l=(r.l+r.e)&255;r.h=(r.h+r.d)&255;
    bmp(c,r.c,c.hl);
    c.sb(ix-1,r.d);c.sb(ix-2,r.e);c.sb(ix-3,r.h);c.sb(ix-4,r.l);
    const bc=c.bc;hit(c,1);c.bc=bc;
  }
  c.sb(S.Ghost_Bitmap,r.c);
}

const run=(f)=>(M,r,i)=>{const c=new Ctx(M,r,i);f(c);return c.log;};
const R={
  Handler_SavagePlant:{fn:run(Handler_SavagePlant),out:[]},
  Handler_BalloonHelp:{fn:run(Handler_BalloonHelp),out:[]},
  Handler_Books:{fn:run(Handler_Books),out:[]},
  Handler_MovingFloor:{fn:run(Handler_MovingFloor),out:[]},
  Animate_MovingFloor:{fn:run(Animate_MovingFloor),out:[]},
  Handler_Ghosts:{fn:run(Handler_Ghosts),out:[]},
  Handler_ThreeTon:{fn:run(Handler_ThreeTon),out:[]},
  Handler_FallingBlocks:{fn:run(Handler_FallingBlocks),out:[],rand:[0xE86A]},
  Handler_Fire:{fn:run(Handler_Fire),out:[]},
  Handler_MagLock:{fn:run(Handler_MagLock),out:[]},
};
module.exports={COV,R,Handler_SavagePlant,Handler_BalloonHelp,Handler_Books,Handler_MovingFloor,Animate_MovingFloor,Handler_Ghosts,Handler_ThreeTon,Handler_FallingBlocks,Handler_Fire,Handler_MagLock,Action0D};
