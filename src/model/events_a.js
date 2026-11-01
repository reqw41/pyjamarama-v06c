// События комнат (набор A): катящийся камень, мяч, ангелы, еда, паучья рука, куры, дротики, прыгающий топор. Адреса — как в V1.
// Рисование — только Bitmap16Draw / TileDraw / Beep_Effect (примитивы core.js); пиксели экрана эти подпрограммы не читают.
'use strict';
const {S,prim,Ctx}=require('./core.js');
const W=require('./wally.js');
const Room=require('./room.js');

const A_ROCKX=0xF18A,A_ROCKCNT=S.Room0_RockCount;
const A_DARTDLY=0xEF70;   // задержка анимации дротиков (последний байт перед Handler_Darts)

const draw=(c)=>prim(c,'Bitmap16Draw');
const setBmp=(c,hl)=>c.sw(S.BitmapX,hl);
// Wally_HitTest с сохранением BC/DE (PUSH BC/DE ... POP DE/BC), B = сила удара
// Wally_HitTest с точными регистрами для случаев «мёртв»/«нет попадания» (DE=Wally_X, A=остаток проверки); попадание — модель wally.js.
function HitTest(c){
  const r=c.r;
  r.a=c.b(S.DeathFlag);
  if(r.a)return;
  const w=c.w(S.Wally_X);const e=w&255,d=w>>8;
  c.de=w;
  let a=(r.l-e-0x0d)&255;r.a=a;if(a<0xe6)return;
  a=(r.h-d-0x1c)&255;r.a=a;if(a<0xd6)return;
  W.Wally_HitTest(c);
}

// ---- катящийся камень в комнате 0 ----
function RollRock_Draw(c){
  const r=c.r;
  r.c=8;c.sw(S.TileStartPtr,S.RollRock_Tiles);c.hl=S.RollRock_Furniture;
  do{
    r.b=7;
    do{
      const bc=c.bc;
      r.a=r.e;
      if(r.e<0x20){r.c=5;r.a=c.b(c.hl);prim(c,'TileDraw');}
      r.d=(r.d+1)&255;c.hl=(c.hl+1)&0xffff;
      c.bc=bc;
      r.b=(r.b-1)&255;
    }while(r.b);
    r.e=(r.e-1)&255;
    r.d=(r.d-7)&255;r.a=r.d;
    r.c=(r.c-1)&255;
  }while(r.c);
}
function ScreenClearEffect(c){
  const col=c.b(S.Room_ColourTable+c.b(S.Wally_RoomNo));
  for(let i=0;i<0x260;i++)c.sb(0x58a0+i,col);
  c.log.push(['clrfx']);
}
// Подпрограмма заканчивается JP Wally_Resurrect (не возвращается): модель доходит до этого перехода.
function Update_RollRock(c){
  const r=c.r;
  let a=c.b(A_ROCKCNT);r.a=a;
  if(a){a--;c.sb(A_ROCKCNT,a);r.a=a;return;}
  r.b=0x26;
  do{
    const bc=c.bc;
    a=c.b(A_ROCKX);r.e=a;r.d=0x0e;a=(a+1)&255;c.sb(A_ROCKX,a);r.a=a;
    RollRock_Draw(c);
    // Pause_Short: регистры сохраняет
    c.bc=bc;r.b=(r.b-1)&255;
  }while(r.b);
  c.sb(S.Wally_RoomNo,0x1c);
  c.sb(A_ROCKX,0);c.sb(S.Flag_BaddyInit,0);
  c.sb(S.DeathFlag,1);c.sb(A_ROCKCNT,0xc8);r.a=0xc8;
  ScreenClearEffect(c);
  Room.RoomDraw(c);
  // JP Wally_Resurrect: в режиме шага игры (game.js) — выполнить воскрешение (оно кончается переходом на GameLoop)
  if(c.inputs&&c.inputs.tickMode){try{require('./flow.js').Wally_Resurrect(c);}catch(e){if(e.loop)c.inputs.pendingLoop=true;else throw e;}}
}

// ---- катящийся шар ----
function Update_RollBall(c){
  const r=c.r;
  let a=c.b(S.Flag_BaddyInit);r.a=a;
  if(!a){
    c.sb(S.Flag_BaddyInit,1);
    c.hl=0x3008;c.sw(S.RollBall_Position,0x3008);setBmp(c,0x3008);
    r.a=c.b(S.RollBall_Bmp);draw(c);return;
  }
  c.hl=c.w(S.RollBall_Position);setBmp(c,c.hl);
  r.a=c.b(S.RollBall_Bmp);r.b=r.a;
  r.a=r.l;
  if(r.l!==0xb0){
    r.a=r.b;draw(c);
    r.a=r.l;r.l=(r.l+2)&255;
    if(r.a>=0x1a)r.h=(r.h+1)&255;
  }else{
    r.a=r.b;draw(c);
    r.h=(r.h+2)&255;r.a=r.h;
    if(r.a>=0xaa)c.hl=0x3008;
  }
  setBmp(c,c.hl);
  r.a=r.b;
  if(!(r.l&2)){r.a=(r.a+1)&255;if(r.a===0x90)r.a=0x8d;}
  draw(c);
  c.sb(S.RollBall_Bmp,r.a);c.sw(S.RollBall_Position,c.hl);
  r.b=0x0a;HitTest(c);
}

// ---- ангелы смерти ----
function Handler_Angels(c){
  const r=c.r;
  let a=c.b(S.Flag_BaddyInit);r.a=a;
  if(!a){
    c.sb(S.Flag_BaddyInit,1);r.a=2;
    c.sb(S.Angel1_Direction,2);c.sb(S.Angel2_Direction,2);c.sb(S.Angel3_Direction,2);
    c.hl=0x3278;c.sw(S.Angel1_Pos,c.hl);setBmp(c,c.hl);r.a=c.b(S.Angel_Bmp);draw(c);
    c.hl=0x6438;c.sw(S.Angel2_Pos,c.hl);setBmp(c,c.hl);draw(c);
    c.hl=0x50b8;c.sw(S.Angel3_Pos,c.hl);setBmp(c,c.hl);draw(c);
    return;
  }
  a=(c.b(S.Angel_Bmp)+1)&255;if(a===0x99)a=0x93;
  r.d=a;
  let ix=S.Angel1_Pos;r.b=3;
  do{
    r.l=c.b(ix);r.h=c.b(ix+1);r.c=c.b(ix+2);
    ix+=3;
    setBmp(c,c.hl);
    a=(r.h+r.c)&255;r.h=a;
    if(a===0xaa||a===0x30)r.c=(-r.c)&255;
    r.a=a;
    c.sb(ix-1,r.c);c.sb(ix-2,r.h);
    r.a=c.b(S.Angel_Bmp);draw(c);
    setBmp(c,c.hl);
    r.a=r.d;draw(c);
    const bc=c.bc,de=c.de;
    r.b=4;r.ix=ix;HitTest(c);
    c.bc=bc;c.de=de;r.ix=ix;
    r.b=(r.b-1)&255;
  }while(r.b);
  r.a=r.d;c.sb(S.Angel_Bmp,r.d);
  r.ix=ix;
}

// ---- еда ----
function Handler_Food(c){
  const r=c.r;
  let a=c.b(S.Flag_FoodDrawn);r.a=a;
  if(a)return;
  c.sb(S.Flag_FoodDrawn,1);
  c.hl=c.w(S.Food_ActivePtr);
  r.a=c.b(S.Wally_RoomNo);
  if(r.a!==c.b(c.hl)){
    c.de=0x16;c.hl=(c.hl+0x16)&0xffff;
    if(r.a!==c.b(c.hl))return;
  }
  c.hl=(c.hl+1)&0xffff;r.e=c.b(c.hl);
  c.hl=(c.hl+1)&0xffff;r.a=c.b(c.hl);
  r.d=0xa8;setBmp(c,c.de);draw(c);
}
function Food_CheckPickup(c){
  const r=c.r;
  c.hl=c.w(S.Food_ActivePtr);
  r.a=c.b(S.Wally_RoomNo);
  if(r.a!==c.b(c.hl)){
    c.de=0x16;c.hl=(c.hl+0x16)&0xffff;
    if(r.a!==c.b(c.hl))return;
  }
  c.hl=(c.hl+1)&0xffff;
  r.a=(c.b(S.Wally_X)-c.b(c.hl)-1)&255;
  if(r.a<0xfe)return;
  r.a=c.b(S.Wally_Y);
  if(r.a!==0x98)return;
  r.e=c.b(c.hl);c.hl=(c.hl+1)&0xffff;
  r.d=0xa8;setBmp(c,c.de);
  r.a=c.b(c.hl);draw(c);
  c.hl=(c.w(S.Food_ActivePtr)+3)&0xffff;
  r.a=c.b(c.hl);
  if(r.a===0xff)c.hl=S.Food_Table;
  c.sw(S.Food_ActivePtr,c.hl);
  r.b=0x0a;W.Wally_EnergyIncBy(c);
  c.bc=0x643c;c.de=0x0128;c.hl=0x0103;prim(c,'Beep_Effect');
}

// ---- куры ----
function Handler_Chickens(c){
  const r=c.r;
  let a=c.b(S.Flag_BaddyInit);r.a=a;
  if(!a){
    c.sb(S.Flag_BaddyInit,1);
    c.hl=0x8088;c.sw(S.Chicken1_Pos,c.hl);setBmp(c,c.hl);
    r.a=0x7b;c.sb(S.Chicken_Bmp,0x7b);draw(c);
    c.hl=0xa8a8;c.sw(S.Chicken2_Pos,c.hl);setBmp(c,c.hl);draw(c);
    return;
  }
  r.b=2;let ix=S.Chicken1_Pos;
  a=(c.b(S.Chicken_Bmp)+1)&255;if(a===0x7f)a=0x7b;
  r.a=a;r.d=a;
  do{
    r.l=c.b(ix);r.h=c.b(ix+1);r.c=c.b(ix+2);
    setBmp(c,c.hl);
    {const bc=c.bc,de=c.de;r.b=1;HitTest(c);c.bc=bc;c.de=de;}
    ix+=3;
    a=r.h;r.a=a;
    if(a===0x80){
      r.a=c.b(S.Chicken_Bmp);draw(c);
      r.l=(r.l-2)&255;r.a=r.l;
      if(r.l===0x78)r.h=0x82;
    }else if(a!==0xa8){
      r.a=c.b(S.Chicken_Bmp);draw(c);
      r.h=(r.h+2)&255;
    }else if(r.c!==0){
      r.a=c.b(S.Chicken_Bmp);draw(c);
      r.l=(r.l-2)&255;r.a=r.l;
      if(r.l===0x08){r.l=0xb4;r.h=0x80;}
    }else{
      r.a=c.b(S.Chicken_Bmp);draw(c);
      r.l=(r.l+2)&255;r.a=r.l;
      if(r.l===0xe8){r.l=0xb4;r.h=0x80;}
    }
    setBmp(c,c.hl);
    r.a=r.d;draw(c);
    c.sb(ix-3,r.l);c.sb(ix-2,r.h);
    r.b=(r.b-1)&255;
  }while(r.b);
  r.a=r.d;c.sb(S.Chicken_Bmp,r.d);
  r.ix=ix;
}

// ---- дротики ----
function Handler_Darts(c){
  const r=c.r;
  let a=c.b(S.Flag_BaddyInit);r.a=a;
  if(!a){
    c.sb(S.Flag_BaddyInit,1);
    c.hl=0x8808;c.sw(S.Dart1_Pos,c.hl);setBmp(c,c.hl);r.a=c.b(S.Dart_Bmp);draw(c);
    c.hl=0xa878;c.sw(S.Dart2_Pos,c.hl);setBmp(c,c.hl);draw(c);
    return;
  }
  let ix=S.Dart1_Pos;r.b=2;
  a=c.b(S.Dart_Bmp);
  c.hl=A_DARTDLY;
  const dl=(c.b(A_DARTDLY)-1)&255;c.sb(A_DARTDLY,dl);
  if(dl===0){
    c.sb(A_DARTDLY,2);
    a=(a+1)&255;if(a===0x93)a=0x90;
  }
  r.a=a;r.d=a;
  do{
    r.l=c.b(ix);r.h=c.b(ix+1);ix+=2;
    r.a=c.b(S.Dart_Bmp);setBmp(c,c.hl);draw(c);
    r.l=(r.l+2)&255;r.a=r.l;
    if(r.l>=0xf0)r.l=0x08;
    setBmp(c,c.hl);r.a=r.d;draw(c);
    c.sb(ix-2,r.l);
    const bc=c.bc,de=c.de;r.b=1;HitTest(c);c.bc=bc;c.de=de;
    r.b=(r.b-1)&255;
  }while(r.b);
  r.a=r.d;c.sb(S.Dart_Bmp,r.d);
  r.ix=ix;
}

// ---- прыгающий топор ----
function Sound_AxeBounce(c){
  const r=c.r;const sv={a:r.a,b:r.b,c:r.c,d:r.d,e:r.e,h:r.h,l:r.l};
  c.bc=0x640a;c.de=0x050a;c.hl=0x0801;prim(c,'Beep_Effect');
  Object.assign(r,sv);
}
function Handler_BouncingAxe(c){
  const r=c.r;
  let a=c.b(S.Flag_BaddyInit);r.a=a;
  if(!a){
    c.hl=0x3a64;c.sw(S.Axe_Position,c.hl);setBmp(c,c.hl);
    c.sb(S.Axe_VelocityY,4);r.a=c.b(S.Axe_Bitmap);draw(c);
    c.sb(S.Flag_BaddyInit,1);r.a=1;return;
  }
  c.hl=c.w(S.Axe_Position);setBmp(c,c.hl);
  r.d=c.b(S.Axe_VelocityY);
  a=(r.h+r.d)&255;r.h=a;r.a=a;
  if(a>=0xa8||a<0x38){r.d=(-r.d)&255;r.a=r.d;Sound_AxeBounce(c);}
  r.a=c.b(S.Axe_Bitmap);draw(c);
  r.l=(r.l+1)&255;r.a=r.l;
  if(r.l>=0xe8){c.hl=0x9808;r.d=0xfc;}
  setBmp(c,c.hl);c.sw(S.Axe_Position,c.hl);
  r.a=r.d;c.sb(S.Axe_VelocityY,r.d);
  r.a=c.b(S.Axe_Bitmap);
  if(r.l&1){
    r.a=(r.a+1)&255;if(r.a===0xbb)r.a=0xb3;
    c.sb(S.Axe_Bitmap,r.a);
  }
  draw(c);
  r.b=5;HitTest(c);
}

// ---- паучья рука ----
function Handler_SpookyHand(c){
  const r=c.r;
  c.hl=S.SpookyHand;
  let a=c.b(c.hl);r.a=a;
  if(a){
    c.sb(c.hl,(a-1)&255);
    if((a-1)&255)return;
    r.a=c.b(S.Wally_RoomNo);r.b=r.a;
    c.hl=S.SpookyHand_PosTable;
    do{ r.a=c.b(c.hl);c.hl=(c.hl+3)&0xffff; }while(r.a!==r.b);
    c.hl=(c.hl-1)&0xffff;r.d=c.b(c.hl);
    c.hl=(c.hl-1)&0xffff;r.e=c.b(c.hl);
    setBmp(c,c.de);r.a=0xad;c.sb(S.SpookyHand_Frame,0xad);draw(c);
    return;
  }
  c.hl=S.SpookyHand_f26c;
  a=(c.b(c.hl)-1)&255;c.sb(c.hl,a);
  if(a)return;
  c.sb(c.hl,3);
  r.a=c.b(S.Wally_RoomNo);
  c.hl=S.SpookyHand_PosTable;
  let m;
  do{ m=c.b(c.hl);c.hl=(c.hl+3)&0xffff; }while(m!==r.a);
  c.hl=(c.hl-1)&0xffff;r.d=c.b(c.hl);
  c.hl=(c.hl-1)&0xffff;r.e=c.b(c.hl);
  {const t=c.hl;c.hl=c.de;c.de=t;}
  setBmp(c,c.hl);
  r.a=c.b(S.SpookyHand_Frame);draw(c);
  r.a=(r.a+1)&255;
  if(r.a===0xb3){r.a=0x32;c.sb(S.SpookyHand,0x32);return;}
  c.sb(S.SpookyHand_Frame,r.a);draw(c);
  r.b=2;HitTest(c);
}

const run=(f)=>(M,r,i)=>{const c=new Ctx(M,r,i);f(c);return c.log;};
const ALL=['a','b','c','d','e','h','l'];
const R={
  RollRock_Draw:{fn:run(RollRock_Draw),out:['a','b','c','d','e','h','l']},
  Update_RollRock:{fn:run(Update_RollRock),out:[]},
  Update_RollBall:{fn:run(Update_RollBall),out:ALL},
  Handler_Angels:{fn:run(Handler_Angels),out:ALL.concat('ix')},
  Handler_Food:{fn:run(Handler_Food),out:ALL},
  Food_CheckPickup:{fn:run(Food_CheckPickup),out:ALL},
  Handler_Chickens:{fn:run(Handler_Chickens),out:ALL.concat('ix')},
  Handler_Darts:{fn:run(Handler_Darts),out:ALL.concat('ix')},
  Sound_AxeBounce:{fn:run(Sound_AxeBounce),out:ALL},
  Handler_BouncingAxe:{fn:run(Handler_BouncingAxe),out:ALL},
  Handler_SpookyHand:{fn:run(Handler_SpookyHand),out:ALL},
};
module.exports={R,RollRock_Draw,Update_RollRock,Update_RollBall,Handler_Angels,Handler_Food,Food_CheckPickup,Handler_Chickens,Handler_Darts,Handler_BouncingAxe,Handler_SpookyHand,Sound_AxeBounce};
