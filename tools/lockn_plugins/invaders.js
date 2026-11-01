// Плагин стенда tools/lockn.js: захватчики (комната 19) и аркада (комната 1E), src/vec/invaders.asm. Модель — src/model/invaders.js.
// Состояний «в аркаде» в ZX-эталоне нет (игра идёт в других комнатах), поэтому setup СТРОИТ состояние: таблица захватчиков, пуля, бомбы,
// взрывы, кадры, Wally рядом с целью (ветви ударов), редкие случаи (последний этап, 3 жизни, Y>=0xA0 и т.д.).
// Экспорт arcState(zmem,rnd,SYM,opt) используется и tools/lockn_inv_loop.js.
'use strict';
const I=require('../../src/model/invaders.js');
const NOISE=0xAFE9;   // указатель белого шума FX_WhiteNoise в модели (нативный fx_noise — пустая заглушка): после модели возвращаем как было
const nz=(f)=>(c)=>{const a=c.M[NOISE],b=c.M[NOISE+1];const r=f(c);c.M[NOISE]=a;c.M[NOISE+1]=b;return r;};
const models={
  Handler_Invaders:nz(I.Handler_Invaders),
  Invaders_Init_YPos:nz(I.Invaders_Init_YPos),
  Invaders_Init_XPos:nz(I.Invaders_Init_XPos),
  Invaders_Init:nz(I.Invaders_Init),
  Inv_Update:nz(I.Inv_Update),
  Arcade_CreateExplosions:nz(I.Arcade_CreateExplosions),
  Arcade_UpdateExplosions:nz(I.Arcade_UpdateExplosions),
  Invaders_NextStage:nz(I.Invaders_NextStage),
  inv_bu:nz(I.Inv_BulletUpdate),            // нативное тело Inv_BulletUpdate (CF=1 — смена этапа); обёртка Inv_BulletUpdate прыгает в цикл
  Invaders_Pause:nz(I.Invaders_Pause),
  Arcade_UpdateBombs:nz(I.Arcade_UpdateBombs),
  Invaders_ExitCheck:nz(I.Invaders_ExitCheck),
  arcade_enter:nz(I.Action13_EnterAcrade),   // a_arcade = arcade_enter + JP Invaders_Loop
};
const prims={fx_noise:'FX_WhiteNoise'};
const ptrvars=['Inv_TypePtr','Inv_DataPtr'];
const ri=(rnd,n)=>Math.floor(rnd()*n);
const STAGES=[0x735E,0x7360,0x7362,0x7364,0x7366,0x7368,0x736A,0x736C].map(a=>a+0x8100);   // Inv_TypePtr (ZX): выбор этапа; 736C — FF (конец таблицы)

// opt.mode: 'arc' (состояние аркады), 'room19' (Handler_Invaders)
function arcState(m,rnd,SYM,opt){
  opt=opt||{};
  const b=(a,v)=>{m[a]=v&255;}, w=(a,v)=>{m[a]=v&255;m[a+1]=(v>>8)&255;};
  const near=rnd()<0.6;
  // этап
  const st=STAGES[ri(rnd,rnd()<0.12?8:7)];
  const stIdx=(st-0x8100-0x735E)>>1;
  w(SYM.Inv_TypePtr,st+(opt.next?0:0));
  const tab=[0x75,0x7A,0x7B,0x7F,0x93,0x99,0x99,0x9B,0xAD,0xB3,0xB3,0xBB,0xBB,0xBF];
  const cur0=tab[2*Math.min(stIdx,6)],end0=tab[2*Math.min(stIdx,6)+1];
  const cur=cur0+ri(rnd,Math.max(1,end0-cur0));
  b(SYM.Inv_StartFrame,cur0);b(SYM.Inv_EndFrame,end0);b(SYM.Inv_CurrentFrame,cur);
  b(SYM.Inv_NextFrame,rnd()<0.3?end0-1:Math.min(cur+1,end0-1));
  b(SYM.Invaders_CurrentDir,rnd()<0.5?1:0xFF);
  b(SYM.Invaders_ChangeDirFlag,rnd()<0.3?1:0);
  b(SYM.Inv___Flag,rnd()<0.3?2:0);
  b(SYM.Invaders_PauseValue,rnd()<0.2?1:(rnd()<0.2?2:1+ri(rnd,0x18)));
  b(SYM.WallyLives,[1,2,3,3][ri(rnd,4)]);
  b(SYM.DeathFlag,rnd()<0.1?1:0);
  b(SYM.IsArcadeMode,rnd()<0.8?1:0);
  // таблица захватчиков: 24 записи (X,Y), FE = убит, FF-терминатор
  const D=SYM.Invaders_Data;
  const dead=[0,0.1,0.5,0.9,1][ri(rnd,5)];
  for(let i=0;i<24;i++){
    const row=i%3;const xx=0x0a+0x18*((i/3)|0);
    let x=xx+(rnd()<0.2?ri(rnd,0x60)-0x30:0),y=[0x38,0x58,0x78][row]+(rnd()<0.2?ri(rnd,0x40):0);
    if(rnd()<0.08){x=rnd()<0.5?0xE7:0x09;}                    // край: смена направления
    if(rnd()<0.08){y=0x9C+ri(rnd,6);}                         // низ: смерть
    x&=255;y&=255;
    if(x===0xFE||x===0xFF)x=0xE0;
    if(rnd()<dead){x=0xFE;}
    b(D+2*i,x);b(D+2*i+1,y);
  }
  b(D+48,0xFF);
  const k=rnd()<0.1?24:(rnd()<0.1?0:ri(rnd,25));
  w(SYM.Inv_DataPtr,D+2*k);
  // взрывы: слоты по 3 байта до FE
  let p=SYM.Arcade_ExplosionSlots;const nslots=[];
  for(let g=0;g<12&&m[p]!==0xFE;g++,p+=3)nslots.push(p);
  const fill=[0,0.3,1][ri(rnd,3)];
  for(const sp of nslots){ if(rnd()<fill){b(sp,0x30+ri(rnd,0x70));b(sp+1,0x30+ri(rnd,0x70));b(sp+2,0x9F+ri(rnd,6));}else b(sp,0xFF); }
  // бомбы: 3 слота (X,Y,кадр); X=FF — пусто
  const bf=[0,0.5,1][ri(rnd,3)];
  for(let i=0;i<3;i++){const sp=SYM.Arcade_BombData+3*i;
    if(rnd()<bf){b(sp,0x10+ri(rnd,0xC0));b(sp+1,rnd()<0.3?0xA4+ri(rnd,4):0x40+ri(rnd,0x60));b(sp+2,0xC0+ri(rnd,7));}else b(sp,0xFF);}
  b(0xF45D,0xC0+ri(rnd,7));
  // пуля
  if(rnd()<0.3){b(SYM.Inv_BulletX,0xFF);b(SYM.Inv_BulletY,ri(rnd,256));}
  else{
    let live=[];for(let i=0;i<24;i++)if(m[D+2*i]!==0xFE)live.push(i);
    if(live.length&&near){const i=live[ri(rnd,live.length)];b(SYM.Inv_BulletX,(m[D+2*i]+ri(rnd,32)-16)&255);b(SYM.Inv_BulletY,(m[D+2*i+1]+ri(rnd,32)-16)&255);}
    else{b(SYM.Inv_BulletX,0x10+ri(rnd,0xC0));b(SYM.Inv_BulletY,rnd()<0.2?0x30+ri(rnd,6):0x30+ri(rnd,0x70));}
    if(m[SYM.Inv_BulletX]===0xFF)b(SYM.Inv_BulletX,0xFE);
  }
  // Wally: рядом с каким-либо спрайтом (удар), у края (выход) или где попало
  const t=rnd();
  if(t<0.45){
    const cands=[];
    for(let i=0;i<24;i++)if(m[D+2*i]!==0xFE)cands.push([m[D+2*i],m[D+2*i+1]]);
    for(let i=0;i<3;i++)if(m[SYM.Arcade_BombData+3*i]!==0xFF)cands.push([m[SYM.Arcade_BombData+3*i],m[SYM.Arcade_BombData+3*i+1]]);
    if(cands.length){const c=cands[ri(rnd,cands.length)];b(SYM.Wally_X,(c[0]+ri(rnd,26)-12)&255);b(SYM.Wally_Y,Math.min(0x98,Math.max(0x30,(c[1]-ri(rnd,42)+14)&255)));}
  }else if(t<0.6){b(SYM.Wally_X,7+ri(rnd,3));b(SYM.Wally_Y,0x98);}
  else{b(SYM.Wally_X,7+ri(rnd,0xE0));b(SYM.Wally_Y,0x30+ri(rnd,0x69));}
  b(SYM.MilkLevel,ri(rnd,0x20));
}
function room19State(m,rnd,SYM){
  const b=(a,v)=>{m[a]=v&255;};
  b(SYM.Flag_LaserGun,rnd()<0.6?1:0);
  const pk=()=>rnd()<0.3?0x0D:ri(rnd,0x20);
  b(SYM.Pocket1,pk());b(SYM.Pocket2,pk());b(SYM.ObjSlot19,rnd()<0.4?0x0D:ri(rnd,0x20));
  b(SYM.Flag_BaddyInit,rnd()<0.2?0:1);
  b(SYM.Invaders_bitmap,[0x99,0x9A,0x99,0x9A,0x9B][ri(rnd,5)]);
  const xs=[0x32,0xE8,0x30,0x34,0xE6,0xEA,0x40,0x80,0xB0,0xDC];
  for(let i=0;i<6;i++){
    b(SYM.Invader1+3*i,rnd()<0.4?xs[ri(rnd,xs.length)]:0x20+ri(rnd,0xB0));
    b(SYM.Invader1+3*i+1,[2,0xFE,1,0xFF][ri(rnd,4)]);
    b(SYM.Invader1+3*i+2,[0,0x18][ri(rnd,2)]);
  }
  b(SYM.DeathFlag,rnd()<0.1?1:0);
  // Wally рядом с одним из захватчиков
  const i=ri(rnd,6),off=rnd()<0.5?0x30:0x70;
  if(rnd()<0.6){b(SYM.Wally_X,(m[SYM.Invader1+3*i]+ri(rnd,26)-12)&255);b(SYM.Wally_Y,Math.min(0x98,Math.max(0x30,(m[SYM.Invader1+3*i+2]+off-ri(rnd,42)+14)&255)));}
  b(SYM.MilkLevel,ri(rnd,0x20));
  b(SYM.Wally_RoomNo,0x19);
}
function setup(name,m,rnd,env){
  const SYM=env.SYM;
  if(name==='Handler_Invaders'){room19State(m,rnd,SYM);return null;}
  arcState(m,rnd,SYM);
  if(name==='Arcade_CreateExplosions'){
    const hl={h:0x30+ri(rnd,0x70),l:0x10+ri(rnd,0xC0)};return {zregs:hl,nregs:hl};
  }
  if(name==='Invaders_Init'||name==='Invaders_NextStage'||name==='arcade_enter'){
    const R={c:0x40+ri(rnd,8),b:ri(rnd,256),d:ri(rnd,256),e:ri(rnd,256),h:ri(rnd,256),l:ri(rnd,256)};return {zregs:R,nregs:R};
  }
  if(name==='Invaders_ExitCheck'){ if(rnd()<0.5)m[SYM.Wally_X]=7+ri(rnd,3); else if(rnd()<0.5)m[SYM.Wally_X]=0x40+ri(rnd,0x80); }
  return null;
}
module.exports={models,setup,prims,ptrvars,arcState,room19State};
