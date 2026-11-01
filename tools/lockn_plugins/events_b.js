// Плагин стенда lockn для src/vec/events_b.asm (модели: src/model/events_b.js, R).
// Подкрутка редких состояний — по мотивам tools/run_diff_b.js. Проверка a_magnet: EB_MAGNET=1 node tools/lockn.js N SEED Room_TestEvents
// (комната 29, Pocket1=4, Wally у позиции теста 00 40 88; без переменной setup для Room_TestEvents ничего не делает).
// Покрытие ветвей модели печатается при выходе (счётчики COV и число вызовов).
'use strict';
const EB=require('../../src/model/events_b.js');
const R=EB.R;
const ROOM=require('../../src/model/room.js');
const calls={};
const mk=(name)=>(c)=>{calls[name]=(calls[name]||0)+1;const log=R[name].fn(c.M,c.r,c.inputs);for(const x of log||[]){c.log.push(x);if(x[0]==='snd'&&x[1]===0xff&&x[2]===0x0a){const k=name+'.hit';calls[k]=(calls[k]||0)+1;}}};
const models={};for(const n of Object.keys(R))models[n]=mk(n);
models.Room_TestEvents=(c)=>{calls.Room_TestEvents=(calls.Room_TestEvents||0)+1;ROOM.Room_TestEvents(c);};
process.on('exit',()=>{if(Object.keys(calls).length)console.log('events_b: вызовов',JSON.stringify(calls),'\nветви модели',JSON.stringify(EB.COV));});

function setup(name,m,rnd,env){
  const S=env.SYM;
  const ri=(a,b)=>a+Math.floor(rnd()*(b-a+1));
  const pick=(a)=>a[Math.floor(rnd()*a.length)];
  const p=(x)=>rnd()<x;
  if(name==='Room_TestEvents'){
    if(!process.env.EB_MAGNET)return null;
    m[S.Wally_RoomNo]=29;m[S.DeathFlag]=0;
    m[S.Pocket1]=p(0.75)?4:ri(0,0x1f);m[S.Pocket2]=0;
    m[S.Wally_X]=(0x40+ri(-2,2))&255;m[S.Wally_Y]=(0x88+ri(-2,2))&255;
    m[S.ObjEventPause]=p(0.2)?1:0;m[S.MagLock_Dir]=pick([1,0xff,0]);
    return null;
  }
  // общее состояние
  m[S.DeathFlag]=p(0.1)?1:0;
  m[S.Wally_X]=ri(7,0xe0);m[S.Wally_Y]=ri(0x30,0x90);m[S.Wally_Frame]=ri(0,0x2f);
  m[S.Wally_HeadTurned]=p(0.3)?1:0;m[S.IsArcadeMode+1]=p(0.3)?1:0;
  for(let i=0;i<15;i++)m[S.Wally_BgColour+i]=ri(0,7)|0x40;
  m[S.MilkLevel]=p(0.15)?0x1f-ri(0,1):ri(0,0x1e);
  m[S.Pocket1]=p(0.5)?0:ri(1,0x1f);m[S.Pocket2]=p(0.5)?0:ri(1,0x1f);
  m[S.Flag_BaddyInit]=p(0.2)?0:1;
  const item=(it)=>{const r=rnd();if(r<0.3){m[S.Pocket1]=it;}else if(r<0.5){m[S.Pocket2]=it;m[S.Pocket1]=p(0.5)?0:ri(1,0x1f);if(m[S.Pocket1]===it)m[S.Pocket1]=0;}else{if(m[S.Pocket1]===it)m[S.Pocket1]=0;if(m[S.Pocket2]===it)m[S.Pocket2]=0;}};
  const near=(x,y,prob)=>{if(p(prob)){m[S.Wally_X]=Math.max(7,Math.min(0xe8,x+ri(-10,10)));m[S.Wally_Y]=Math.max(0x30,Math.min(0x98,y+ri(-12,12)));}};
  switch(name){
  case 'Handler_SavagePlant':
    item(0x10);m[S.Flag_WaterBucket]=p(0.5)?1:0;m[S.ObjSlot05_Bmp]=p(0.3)?0x10:ri(0,0x20);
    m[S.SavagePlants_Bmp]=ri(0x75,0x79);near(pick([0x48,0xa8]),0x98,0.7);m[S.Wally_Y]=Math.max(m[S.Wally_Y],p(0.6)?0x88:0);break;
  case 'Handler_BalloonHelp':
    item(0x11);m[0xF18B]=p(0.3)?1:0;
    if(p(0.7)){m[S.Wally_X]=pick([0x17,0x18,0x17,0x18,0x16,0x19]);m[S.Wally_Y]=p(0.85)?0x98:ri(0x30,0x90);}
    break;
  case 'Handler_Books':
    item(0x0f);m[S.Book1_Ypos]=p(0.2)?0x7f:ri(0x46,0x7f);m[S.Book2_Ypos]=p(0.2)?0x7f:ri(0x46,0x7f);
    near(0x70,pick([m[S.Book1_Ypos],m[S.Book2_Ypos]]),0.6);break;
  case 'Handler_MovingFloor':
    item(0x12);m[S.Wally_Y]=p(0.75)?ri(0x91,0x98):m[S.Wally_Y];m[S.Wally_X]=p(0.3)?ri(0xe2,0xe8):m[S.Wally_X];break;
  case 'Animate_MovingFloor':
    item(0x12);break;
  case 'Handler_Ghosts':{
    m[S.Ghost_Bitmap]=ri(0xbb,0xbe);
    for(let g=0;g<3;g++){const a=S.Ghost1+4*g;
      m[a]=p(0.25)?pick([0x08,0xe8]):ri(0x10,0xe0);m[a+1]=p(0.25)?pick([0x30,0xa8]):ri(0x38,0xa0);
      m[a+2]=pick([1,2,0xff,0xfe]);m[a+3]=pick([1,2,0xff,0xfe]);}
    const g=S.Ghost1+4*ri(0,2);near(m[g],m[g+1],0.5);break;}
  case 'Handler_ThreeTon':
    m[S.Weight_Count]=pick([0,0,5,0x64,1]);m[S.Weight_Y]=p(0.25)?0x70:p(0.3)?0x6e:ri(0x30,0x6e)&~1;
    near(0x88,Math.min(0x98,m[S.Weight_Y]+0x10),0.6);break;
  case 'Handler_FallingBlocks':{
    m[S.Fire_Frame]=ri(0x81,0x85);
    for(let i=0;i<5;i++){const a=S.Block_Data+3*i;m[a]=ri(0x10,0xe0);m[a+1]=p(0.3)?ri(0xa8,0xaf):ri(0x40,0xa7);m[a+2]=pick([1,2]);}
    const a=S.Block_Data+3*ri(0,4);near(m[a],m[a+1],0.5);break;}
  case 'Handler_Fire':
    item(0x0a);m[S.Fire_Frame]=p(0.3)?0x85:ri(0x81,0x85);near(0xe0,0x98,0.6);break;
  case 'Handler_MagLock':
    m[S.Flag_MagLock]=pick([0x30,0x31,0xb6,0xb7,ri(0x30,0xb7)]);m[S.MagLock_Dir]=pick([1,0xff]);break;
  }
  return null;
}
module.exports={models,setup,prims:{},ptrvars:[]};
