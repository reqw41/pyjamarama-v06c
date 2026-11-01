// Потоки игры: диспетчер событий комнат, смерть/воскрешение Wally, ловушка с перчаткой, верёвка, проверка выхода.
// Переходы «LD SP,0 / JP GameLoop» моделируются исключением LoopRestart; конец игры — GameOver.
'use strict';
const {S,prim,Ctx}=require('./core.js');
const W=require('./wally.js');
const Rm=require('./room.js');

class LoopRestart extends Error{constructor(){super('GameLoop');this.loop=true;}}
class GameOver extends Error{constructor(why){super('GameOver '+why);this.gameOver=why||true;}}
class ExitToTitle extends Error{constructor(){super('Main_Title');this.title=true;}}

// ---- обработчики комнат: ищем в реестрах модулей (events_a/b, invaders) ----
const MODS=['events_a','events_b','invaders'];
const regs=[];
function reg(){ regs.length=0; for(const m of MODS){ try{ regs.push(require('./'+m+'.js').R); }catch(e){ if(e.code!=='MODULE_NOT_FOUND')throw e; } } return regs; }
function callH(c,name){
  for(const R of reg()) if(R[name]){ const d=R[name]; const log=d.fn(c.M,c.r,c.inputs); for(const x of log||[])c.log.push(x); if(c.inputs&&c.inputs.pendingLoop){c.inputs.pendingLoop=false;throw new LoopRestart();} return; }
  throw new Error('обработчик '+name+' не найден');
}
const ROOM_SEQ=[
  ['Update_RollRock'],['Update_RollBall'],['Handler_Angels','Handler_Food','Handler_SpookyHand'],['Handler_Chickens'],['Handler_Darts'],
  ['Handler_BouncingAxe'],['Handler_SavagePlant'],['Update_RollBall'],['Handler_Darts'],['Handler_Food','Handler_BalloonHelp','Handler_SpookyHand'],
  ['Handler_BouncingAxe'],['Handler_Angels'],['Handler_Angels','Handler_SpookyHand'],['Handler_SpookyHand'],['Handler_Angels'],
  ['Handler_Food','Handler_Books'],['Handler_MovingFloor','Animate_MovingFloor','Handler_SpookyHand'],['Handler_Food','Handler_Angels'],
  ['Handler_BouncingAxe'],['Handler_Darts'],['Handler_SpookyHand'],['Handler_Food','Handler_BouncingAxe'],['Handler_Ghosts'],
  ['Handler_Ghosts','Handler_Food'],['Handler_SpookyHand'],['Handler_Invaders'],['Handler_Food','Handler_ThreeTon'],
  ['Handler_ThreeTon','Handler_SpookyHand'],['Handler_FallingBlocks','Handler_Fire'],
  ['Handler_BouncingAxe','Handler_MagLock','Handler_MagLock','Handler_MagLock','Handler_MagLock','Handler_MagLock'],
  ['Inv_Update','Inv_Update','Inv_Update','Inv_Update','Inv_Update','Inv_Update','Arcade_UpdateExplosions','Inv_BulletUpdate','Arcade_UpdateBombs'],
];
function Room_EventCaller(c){
  for(const n of ROOM_SEQ[c.b(S.Wally_RoomNo)])callH(c,n);
}
const Pause_Short=()=>{};

function Room_EventSixTimes(c){
  const bc=c.bc,hl=c.hl,de=c.de;
  for(let i=0;i<6;i++){ Room_EventCaller(c); }
  c.hl=hl;c.de=de;c.bc=bc;c.r.b=0;
}
function Wally_KnockedDown(c){
  const r=c.r;
  c.r.c=c.b(S.Wally_ResurectY+c.b(S.Wally_RoomNo));
  for(;;){
    const cc=r.c,bb=r.b;
    Room_EventCaller(c);
    r.c=cc;r.b=bb;W.Wally_Erase(c);
    c.sb(0xF188,0);c.sb(S.Wally_HeadTurned,0);
    let hl=c.w(S.Wally_X);hl=(hl&0xff)|((((hl>>8)+3)&255)<<8);c.hl=hl;
    r.a=hl>>8;
    if((hl>>8)>=cc){ break; }
    c.sw(S.Wally_X,hl);W.Wally_Draw(c);
  }
  r.h=r.c;r.a=(r.c+0x10)&255;r.d=r.a;
  c.sw(S.Wally_X,c.hl);
  c.sb(S.Wally_Frame,0x9b);W.Wally_Draw(c);
  Room_EventSixTimes(c);
  W.Wally_Erase(c);
  c.sb(S.Wally_Frame,0x9d);W.Wally_Draw(c);
}
function Wally_CheckForDeath(c){
  if(!c.b(S.DeathFlag))return;
  Wally_KnockedDown(c);Room_EventSixTimes(c);W.Wally_Erase(c);
  Wally_Death(c);
}
function drawDead(c){
  const r=c.r;
  r.a=0x4d;prim(c,'Bitmap16Draw');
  c.sb(S.BitmapX,(r.l+0x10)&255);r.a=0x4e;prim(c,'Bitmap16Draw');
}
function Wally_Death(c){
  const r=c.r;
  let a=r.l;r.h=r.d;
  a=a-8; if(a<0)a=0;
  if(a>=0xe0)a=0xe0;
  r.l=a;c.sw(S.BitmapX,c.hl);
  drawDead(c);
  for(let i=0;i<0x28;i++){ const hl=c.hl,bc=c.bc; Room_EventCaller(c); c.hl=hl; }
  r.b=0;
  for(;;){
    const hl=c.hl;Room_EventCaller(c);c.hl=hl;
    c.sw(S.BitmapX,c.hl);drawDead(c);
    r.h=(r.h-2)&255;
    if(r.h<0x30)return Wally_Resurrect(c);
    c.sw(S.BitmapX,c.hl);drawDead(c);
  }
}
function Wally_Resurrect(c){
  const r=c.r;
  c.sb(S.MilkLevel,0);prim(c,'Milk_DrawFull');
  const lives=(c.b(S.WallyLives)-1)&255;c.sb(S.WallyLives,lives);
  c.sb(S.BitmapX,(lives<<4)&255);c.sb(S.BitmapY,0x10);
  r.a=0x4c;prim(c,'Bitmap16Draw');
  if(lives===0)throw new GameOver('lost');
  const rm=c.b(S.Wally_RoomNo);
  r.h=c.b(S.Wally_ResurectY+rm);r.l=c.b(S.Wally_ResurectX+rm);
  c.sw(S.BitmapX,c.hl);
  r.a=0x9f;prim(c,'Bitmap16Draw');
  c.sb(S.BitmapY,(r.h+0x10)&255);prim(c,'Bitmap16Draw');
  r.d=0x9f;r.b=5;
  for(;;){
    c.sw(S.BitmapX,c.hl);r.a=r.d;prim(c,'Bitmap16Draw');
    c.sb(S.BitmapY,(r.h+0x10)&255);r.a=r.d;prim(c,'Bitmap16Draw');
    r.d=(r.d+1)&255;
    c.sw(S.BitmapX,c.hl);r.a=r.d;prim(c,'Bitmap16Draw');
    c.sb(S.BitmapY,(r.h+0x10)&255);r.a=r.d;prim(c,'Bitmap16Draw');
    const hl=c.hl,de=c.de,bc=c.bc;
    Room_EventCaller(c);Room_EventCaller(c);
    c.hl=hl;c.de=de;c.bc=bc;
    r.b=(r.b-1)&255;if(!r.b)break;
  }
  c.sw(S.Wally_X,c.hl);c.sw(S.BitmapX,c.hl);
  r.a=r.d;prim(c,'Bitmap16Draw');c.sb(S.BitmapY,(r.h+0x10)&255);r.a=r.d;prim(c,'Bitmap16Draw');
  c.sb(S.DeathFlag,0);
  Rm.Wally_Reset(c);W.Wally_Draw(c);
  if(c.b(S.Wally_RoomNo)<0x1e)throw new LoopRestart();
  throw new Error('аркадная комната: возврат в Invaders_Loop (модуль invaders)');
}

// ---- тест 08: ловушка «боксёрская перчатка» ----
function Test08(c,hl){
  if(c.b(S.Pocket1)===0x15||c.b(S.Pocket2)===0x15)return{hl,ok:true};
  const rm=c.b(S.Wally_RoomNo);
  if(c.b(S.BoxingTrap_Room)!==rm)return{hl,ok:true};
  const r=c.r;
  const sv={hl:c.hl,de:c.de,bc:c.bc};
  c.bc=0;c.de=0x0101;c.hl=0xe600;prim(c,'Beep_Effect');
  c.hl=sv.hl;c.de=sv.de;c.bc=sv.bc;
  c.sb(S.DeathFlag,1);
  let p=c.w(S.BoxingTrap_NextPtr);
  c.sb(S.BoxingTrap_Room,c.b(p));p++;
  if(c.b(p)===0xff)p=S.BoxingTrap_Rooms;
  c.sw(S.BoxingTrap_NextPtr,p);
  c.sw(S.BitmapX,0x98e8);r.a=0xa5;prim(c,'Bitmap16Draw');
  r.b=7;r.c=r.a;
  do{
    const bc=c.bc;
    W.Wally_Erase(c);
    let w=c.w(S.Wally_X);w=(w&0xff00)|((((w&255)-2))&255);c.sw(S.Wally_X,w);
    W.Wally_Draw(c);
    c.bc=bc;
    r.a=r.c;c.sw(S.BitmapX,0x98e8);prim(c,'Bitmap16Draw');
    r.c=(r.c+1)&255;r.a=(r.a+1)&255;prim(c,'Bitmap16Draw');
    Room_EventCaller(c);
    r.b=(r.b-1)&255;
  }while(r.b);
  Wally_KnockedDown(c);
  for(let i=0;i<0x28;i++)Room_EventCaller(c);
  r.b=0;
  c.sw(S.BitmapX,0x98e8);r.a=0xac;prim(c,'Bitmap16Draw');
  W.Wally_Erase(c);
  r.d=0xa8;
  if(c.b(S.MilkLevel)>=0x1a)return Wally_Death(c);
  c.sb(S.DeathFlag,0);c.sb(S.Wally_JumpDir,0);c.sb(S.Wally_Dir,0);c.sb(S.Wally_Frame,0x10);
  W.Wally_Draw(c);
  r.b=5;W.Milk_DecreaseByAmount(c);
  c.sb(S.DeathFlag,1);
  for(let i=0;i<10;i++)Room_EventCaller(c);
  c.sb(S.DeathFlag,0);
  throw new LoopRestart();
}
Rm.TESTS[8]=Test08;

// ---- действие 12: верёвка ----
Rm.ACTIONS[0x12]=function(c,hl){
  const r=c.r;const script=hl;
  for(;;){
    W.Wally_Erase(c);
    c.sb(S.Wally_Frame,0x10);
    let h=(r.h-2)&255;r.h=h;c.sw(S.Wally_X,c.hl);
    if(h===0x70)break;
    W.Wally_Draw(c);
  }
  for(;;){
    r.l=(r.l+2)&255;c.sw(S.Wally_X,c.hl);
    if(r.l>=0xe8)break;
    W.Wally_Draw(c);W.Wally_Erase(c);
  }
  c.hl=0x3038;c.sw(S.Wally_X,0x3038);c.sb(S.Wally_RoomNo,0x0d);
  Rm.Wally_Reset(c);c.sb(S.Wally_Frame,0x9b);
  Rm.Room_Enter(c);
  r.b=0x44;
  do{
    const bc=c.bc;
    W.Wally_Erase(c);
    r.l=(r.l+2)&255;r.h=(r.h+1)&255;c.sw(S.Wally_X,c.hl);
    W.Wally_Draw(c);
    c.bc=bc;r.b=(r.b-1)&255;
  }while(r.b);
  W.Wally_Erase(c);c.sb(S.Wally_Frame,0x10);W.Wally_Draw(c);
  return script;
};

function Game_ExitCheck(c){
  const a=c.inKey(0xfe<<8|0xfe), b=c.inKey(0x7f<<8|0xfe);
  c.r.b=a;
  if(((a|b)&1)===0)throw new ExitToTitle();
  c.r.a=(a|b);
}

const run=(f)=>(M,r,i)=>{const c=new Ctx(M,r,i);try{f(c);}catch(e){if(!e.loop&&!e.gameOver&&!e.title)throw e;c.ended=e;}return c.log;};
const R={
  Room_EventCaller:{fn:run(Room_EventCaller),out:[],rand:[0xADA5]},
  Wally_CheckForDeath:{fn:run(Wally_CheckForDeath),out:[],rand:[0xADA5],endsAtLoop:true},
  Game_ExitCheck:{fn:run(Game_ExitCheck),out:[]},
};
module.exports={R,ROOM_SEQ,Room_EventCaller,Wally_CheckForDeath,Wally_KnockedDown,Room_EventSixTimes,Wally_Death,Wally_Resurrect,Game_ExitCheck,Pause_Short,LoopRestart,GameOver,ExitToTitle,callH};
