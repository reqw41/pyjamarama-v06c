// Комната: рисование из описаний, инвентарь, интерпретатор скриптов (тесты/действия), посещения и очки.
'use strict';
const {S,prim,Ctx}=require('./core.js');
const W=require('./wally.js');
const A_FULL=0xE5CB,A_EMPTY=0xE5D0,A_PREV=0xF188;

const tileFn=(c,callAddr)=>c.w(callAddr)===S.Tile_DrawFlip?'Tile_DrawFlip':'TileDraw';

// ---- мебель из строки ----
function FurnitureDraw(c){
  const r=c.r;
  for(;;){
    let a=c.b(c.hl);c.hl=(c.hl+1)&0xffff;r.a=a;
    if(a&0x80){
      if(a===0xff)return;
      if(a===0xfe){r.c=c.b(c.hl);c.hl=c.hl+1;continue;}
      if(a===0xfc){r.e=(r.e+c.b(c.hl))&255;c.hl++;r.d=(r.d+c.b(c.hl))&255;c.hl++;continue;}
      if(a===0xfb){c.sb(S.TileStartPtr,c.b(c.hl));c.hl++;c.sb(0xC147,c.b(c.hl));c.hl++;continue;}
      r.b=c.b(c.hl);c.hl++;r.a=c.b(c.hl);c.hl++;
      do{ prim(c,tileFn(c,0xE1D8));r.e=(r.e+1)&255;r.b=(r.b-1)&255; }while(r.b);
      continue;
    }
    prim(c,tileFn(c,0xE1E0));r.e=(r.e+1)&255;
  }
}
function String_DrawDouble(c){
  const r=c.r;
  for(;;){
    let a=c.b(c.hl);c.hl++;r.a=a;
    if(a&0x80){
      if(a===0xff)return;
      if(a===0xfe){r.c=c.b(c.hl);c.hl++;continue;}
      if(a===0xfc){r.e=(r.e+c.b(c.hl))&255;c.hl++;r.d=(r.d+c.b(c.hl))&255;c.hl++;continue;}
    }
    prim(c,'Tile_BlitDoubleHeight');r.e=(r.e+1)&255;
  }
}
function InventoryDrawText(c){
  const r=c.r;
  for(;;){
    let a=c.b(c.hl);c.hl++;r.a=a;
    if(a&0x80){
      if(a===0xff){
        if(c.b(c.hl)!==0xfa)return;
        const pocket=c.b(r.c===0x44?S.Pocket1:S.Pocket2);
        const col=r.c;r.c=6;
        const flag=pocket===0x0d?S.Flag_LaserGun:pocket===0x08?S.Flag_FuelCan:S.Flag_WaterBucket;
        r.e=(r.e+1)&255;
        c.hl=c.b(flag)?A_FULL:A_EMPTY;
        r.a=c.b(flag);
        continue;
      }
      if(a===0xfc){r.e=(r.e+c.b(c.hl))&255;c.hl++;r.d=(r.d+c.b(c.hl))&255;c.hl++;continue;}
    }
    prim(c,'TileDraw');r.e=(r.e+1)&255;
  }
}
function Inv_Redraw(c){
  const r=c.r;const hl0=c.hl;
  prim(c,'ScreenClear');
  const p1=c.w(S.ObjectTextPtrTable+2*c.b(S.Pocket1));
  const p2=c.w(S.ObjectTextPtrTable+2*c.b(S.Pocket2));
  c.sw(S.TileStartPtr,S.Bmp_Tiles);
  c.hl=p1;r.e=0x14;r.d=0;r.c=0x44;InventoryDrawText(c);
  c.hl=p2;r.e=0x14;r.d=2;r.c=0x45;InventoryDrawText(c);
  r.a=(c.b(S.Pocket1)+0x50)&255;c.hl=0x0088;c.sw(S.BitmapX,0x0088);prim(c,'Bitmap16Draw');
  r.a=(c.b(S.Pocket2)+0x50)&255;r.h=0x10;c.sw(S.BitmapX,0x1088);prim(c,'Bitmap16Draw');
  c.hl=hl0;
}
function Draw_CeilingWallFloor(c){
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
function RoomDraw(c){
  const r=c.r;
  c.hl=c.w(S.RoomData+2*c.b(S.Wally_RoomNo));
  if(c.b(c.hl)===0xf5)Draw_CeilingWallFloor(c);
  for(;;){
    const a=c.b(c.hl);
    if(a===0xff)break;
    if(a===0xf4||a===0xf3){const t=a===0xf4?S.Tile_DrawFlip:S.TileDraw;c.sw(0xE1E0,t);c.sw(0xE1D8,t);r.b=t>>8;r.c=t&255;c.hl++;continue;}
    if(a===0xde){c.hl++;const bc=c.w(c.hl);c.hl+=2;r.b=bc>>8;r.c=bc&255;r.a=c.b(bc);if(r.a===0)break;continue;}
    r.e=a;c.hl++;r.d=c.b(c.hl);c.hl++;
    const idx=c.b(c.hl);c.hl++;
    const save=c.hl;
    c.hl=c.w(S.FurniturePtrTable+2*idx);
    FurnitureDraw(c);
    c.hl=save;
  }
  const slot=S.Room_ObjSlots+3*c.b(S.Wally_RoomNo);
  c.sb(S.BitmapX,c.b(slot));c.sb(S.BitmapY,(c.b(slot+1)+0x10)&255);
  r.a=(c.b(slot+2)+0x50)&255;prim(c,'Bitmap16Draw');
}
function ScreenClearEffect(c){
  const col=c.b(S.Room_ColourTable+c.b(S.Wally_RoomNo));
  for(let i=0;i<0x260;i++)c.sb(0x58a0+i,col);
  c.log.push(['clrfx']);
}
function Wally_Reset(c){
  c.sb(S.Wally_Frame,0);c.sb(A_PREV,0);c.sb(S.Wally_HeadTurned,0);c.sb(S.Wally_Falling,0);c.sb(S.Wally_Dir,0);c.sb(S.Wally_JumpDir,0);
  c.sb(S.Wall_LastDir,0xff);
  if(c.b(S.Wally_X)<0x78){c.sb(S.Wally_Frame,0x10);c.sb(S.Wall_LastDir,1);}
}
function Room_Enter(c){
  const hl=c.hl;
  c.sb(0xF18A,0);c.sb(S.Flag_BaddyInit,0);c.sb(S.Flag_FoodDrawn,0);c.sb(0xF18B,0);
  c.sb(S.MagLock_Dir,1);c.sb(S.SpookyHand,0x30);c.sb(S.Flag_MagLock,0x30);c.sb(S.Room0_RockCount,0xc8);
  ScreenClearEffect(c);RoomDraw(c);W.Wally_Draw(c);Inv_Redraw(c);
  c.hl=hl;
}
function Game_PercentUpdate(c){
  c.sb(S.Room_VisitedTable+c.b(S.Wally_RoomNo),1);
  c.sb(S.Object_FoundTable+2*c.b(S.Pocket1),1);
  c.sb(S.Object_FoundTable+2*c.b(S.Pocket2),1);
}
function Wally_TestObjSlot(c){
  if(!c.b(S.ObjEventPause))return;
  const slot=S.Room_ObjSlots+3*c.b(S.Wally_RoomNo);
  const a=(c.b(slot)-(c.w(S.Wally_X)&255)-6)&255;
  if(a>=0xf4)return;
  c.sb(S.ObjEventPause,0);
}
function Beep_PickUp(c){c.bc=0xff0a;c.de=0x0114;c.hl=0x1401;prim(c,'Beep_Effect');}

// ---- интерпретатор скриптов ----
// тест: (c, hl) -> {hl, ok}; действие: (c, hl) -> hl
const TESTS=[
  (c,hl)=>{ // 00 позиция выхода
    const w=c.w(S.Wally_X),e=w&255,d=w>>8;
    let a=(c.b(hl)-e-9)&255;hl++;
    if(a<0xef){hl++;return{hl,ok:false};}
    a=(c.b(hl)-d-3)&255;hl++;
    return{hl,ok:a>=0xfa};},
  (c,hl)=>{ // 01 позиция события
    if(c.b(S.ObjEventPause))return{hl,ok:false};
    const w=c.w(S.Wally_X),e=w&255,d=w>>8;
    let a=(c.b(hl)-e-3)&255;hl++;
    if(a<0xfa){hl++;return{hl,ok:false};}
    a=(c.b(hl)-d-3)&255;hl++;
    return{hl,ok:a>=0xfa};},
  (c,hl)=>{const a=c.b(hl);hl++;return{hl,ok:a===c.b(S.Pocket1)||a===c.b(S.Pocket2)};},
  (c,hl)=>({hl,ok:!!c.b(S.Flag_FuelCan)}),
  (c,hl)=>({hl,ok:!!c.b(S.Lift_Count)}),
  (c,hl)=>{const v=c.b(hl);hl++;return{hl,ok:v===c.b(S.LiftFloorNo)};},
  (c,hl)=>({hl,ok:!c.b(S.Lift_Count)}),
  (c,hl)=>({hl,ok:!c.b(S.Flag_HelpSwitch)}),
];
function actionUpdate(c,hl,bc,lift){
  c.sw(S.BitmapX,bc);c.r.a=0x70;prim(c,'Bitmap16Draw');c.r.a=0x71;prim(c,'Bitmap16Draw');
  c.bc=0x320a;c.de=0x050a;c.hl=0x1414;prim(c,'Beep_Effect');return hl;
}
const ACTIONS=[
  (c,hl)=>{ // 00 обмен предмета
    c.sb(S.ObjEventPause,1);
    const want=c.b(hl);hl++;
    const pk=c.b(S.Pocket1)===want?S.Pocket1:S.Pocket2;
    const slot=S.Room_ObjSlots+3*c.b(S.Wally_RoomNo);
    c.sb(S.BitmapX,c.b(slot));c.sb(S.BitmapY,(c.b(slot+1)+0x10)&255);
    const cc=c.b(pk);c.sb(pk,c.b(slot+2));c.sb(slot+2,cc);
    c.r.c=cc;
    c.r.a=(cc+0x50)&255;prim(c,'Bitmap16Draw');
    c.r.a=(c.b(pk)+0x50)&255;prim(c,'Bitmap16Draw');
    const sv=c.hl;Inv_Redraw(c);Beep_PickUp(c);c.hl=sv;
    return hl;},
  (c,hl)=>{ // 01 подобрать
    c.sb(S.ObjEventPause,1);
    const p1=c.b(S.Pocket1),p2=c.b(S.Pocket2);
    const slot=S.Room_ObjSlots+3*c.b(S.Wally_RoomNo);
    c.sb(S.BitmapX,c.b(slot));c.sb(S.BitmapY,(c.b(slot+1)+0x10)&255);
    c.sb(S.Pocket2,p1);c.sb(S.Pocket1,c.b(slot+2));c.sb(slot+2,p2);
    c.r.b=p1;c.r.c=p2;
    c.r.a=(p2+0x50)&255;prim(c,'Bitmap16Draw');
    c.r.a=(c.b(S.Pocket1)+0x50)&255;prim(c,'Bitmap16Draw');
    Inv_Redraw(c);Beep_PickUp(c);
    return hl;},
  (c,hl)=>{ // 02 вход в комнату
    c.sb(S.Wally_RoomNo,c.b(hl));hl++;
    c.sb(S.Wally_X,c.b(hl));hl++;c.sb(S.Wally_Y,c.b(hl));hl++;
    Wally_Reset(c);
    c.bc=0xc828;c.de=0x0128;c.hl=0x02fd;prim(c,'Beep_Effect');
    c.hl=hl;Room_Enter(c);
    return hl;},
  (c,hl)=>{ if(!c.b(S.Flag_WaterBucket)){c.sb(S.Flag_WaterBucket,1);c.hl=hl;Inv_Redraw(c);} return hl;},
  (c,hl)=>{ if(!c.b(S.Flag_LaserGun)){c.sb(S.Flag_LaserGun,1);c.hl=hl;Inv_Redraw(c);} return hl;},
  (c,hl)=>{ c.sb(S.Flag_LaserGun,0);return hl;},
  (c,hl)=>{ c.sb(S.Flag_WaterBucket,0);return hl;},
  (c,hl)=>{ if(!c.b(S.Flag_FuelCan)){c.sb(S.Flag_FuelCan,1);c.hl=hl;Inv_Redraw(c);} return hl;},
  (c,hl)=>{ c.sb(S.Flag_FuelCan,0);return hl;},
  null, // 09 ниже
  (c,hl)=>{ c.sb(S.LiftFloorNo,c.b(hl));return hl+1;},
  (c,hl)=>{ c.sb(S.Lift_Count,(c.b(S.Lift_Count)-1)&255);return hl;},
  (c,hl)=>{ // 0C освещение лифта
    const a=c.b(hl);hl++;
    for(let i=0;i<4;i++)c.sb(0x5988+6*i,0x42);
    c.sb(0x5988+6*a,0x47);return hl;},
  null, // 0D магнитный замок (комнаты)
  (c,hl)=>{ c.sb(S.Flag_HelpSwitch,1);c.r.b=0x60;c.r.c=0x78;return actionUpdate(c,hl,0x6078);},
  (c,hl)=>{ c.sb(S.Flag_HelpSwitch,0);return hl;},
];
ACTIONS[9]=(c,hl)=>{c.sb(S.Lift_Count,4);c.r.b=0x88;c.r.c=0x78;return actionUpdate(c,hl,0x8878);};

function Room_TestEvents(c){
  let hl=c.w(S.Table_RoomDataPtr+2*c.b(S.Wally_RoomNo));
  for(;;){
    let cmd=c.b(hl);hl++;
    if(cmd===0xff)return;
    if(cmd===0xfd){
      for(;;){
        const a=c.b(hl);hl++;
        if(a===0xfe)break;
        const f=ACTIONS[a];
        if(!f)throw new Error('действие '+a.toString(16)+' не реализовано');
        hl=f(c,hl);
      }
      continue;
    }
    const f=TESTS[cmd];
    if(!f)throw new Error('тест '+cmd.toString(16)+' не реализован');
    const res=f(c,hl);hl=res.hl;
    if(!res.ok){ while(c.b(hl++)!==0xfe); }
  }
}

ACTIONS[0x13]=(c,hl)=>{require('./invaders.js').Action13_EnterAcrade(c);return hl;};
const run=(f)=>(M,r,i)=>{const c=new Ctx(M,r,i);try{f(c);}catch(e){if(!e.loop&&!e.gameOver&&!e.title)throw e;}return c.log;};
const R={
  Wally_TestObjSlot:{fn:run(Wally_TestObjSlot),out:[]},
  Game_PercentUpdate:{fn:run(Game_PercentUpdate),out:[]},
  Wally_Reset:{fn:run(Wally_Reset),out:[]},
  FurnitureDraw:{fn:run(FurnitureDraw),out:['hl','de','c']},
  String_DrawDouble:{fn:run(String_DrawDouble),out:['hl','de','c']},
  Inv_Redraw:{fn:run(Inv_Redraw),out:['hl']},
  RoomDraw:{fn:run(RoomDraw),out:[]},
  Room_Enter:{fn:run(Room_Enter),out:['hl']},
  Room_TestEvents:{fn:run(Room_TestEvents),out:[],endsAtLoop:true,rand:[0xADA5]},
};
module.exports={R,FurnitureDraw,String_DrawDouble,Inv_Redraw,RoomDraw,Room_Enter,Wally_Reset,Game_PercentUpdate,Wally_TestObjSlot,Room_TestEvents,ACTIONS,TESTS,Beep_PickUp};
