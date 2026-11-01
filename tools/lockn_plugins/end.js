// Плагин lockn для src/vec/end.asm: ZX как оракул (Fireworks, Action14_Win без экрана итогов, экраны без Key_WaitAny, подсчёт очков).
//   node tools/lockn.js 60 SEED Fireworks,a_win_body,Game_CalculateScore,Game_DisplayFinalScore,scr_lost,scr_congr,scr_final
// Key_WaitAny в ZX заменяется на RET правкой кода образца (CALL Key_WaitAny -> RET), нативно он проверяется отдельно (tools/endkey.js).
// Негативный тест: tools/endneg.sh (порча нативного кода в копии, стенд краснеет).
'use strict';
const {SYM}=require('../sym.js');
const FW=0xB71B;
const ptrvars=[];
for(let k=0;k<10;k++)for(const [j,o] of [['s',0],['c',2],['e',4]]){const nm='fw_'+k+j;SYM[nm]=FW+7*k+o;ptrvars.push(nm);}
const models={
  Fireworks:{zx:'Fireworks'},
  a_win_body:{zx:'Action14_Win'},
  Game_CalculateScore:{zx:'Game_CalculateScore'},
  Game_DisplayFinalScore:{zx:'Game_DisplayFinalScore'},
  scr_lost:{zx:'Screen_YouLost'},
  scr_congr:{zx:'Screen_Congrats'},
  scr_final:{zx:'Screen_FinalScore'},
};
const calls={};
process.on('exit',()=>{if(Object.keys(calls).length)console.log('end: покрытие',JSON.stringify(calls));});
function setup(name,m,rnd,env){
  const ri=(n)=>Math.floor(rnd()*n);
  const bcd=()=>(ri(10)<<4)|ri(10);
  const sk=(a)=>{const w=m[a]|m[a+1]<<8;return w;};
  // салют: случайная фаза у каждой ракеты, часть — на последнем шаге (сброс), цвет произвольный
  if(name==='Fireworks'||name==='a_win_body'){
    for(let k=0;k<10;k++){const b=FW+7*k;const s=sk(b),e=sk(b+4);const n=(e-s)/6|0;
      let cur;const r=rnd();
      if(name==='a_win_body')cur=s;else cur=r<0.3?e-6:r<0.45?s:s+6*ri(n);
      if(cur<s||cur>e)cur=s;
      m[b+2]=cur&255;m[b+3]=cur>>8;m[b+6]=0x40|ri(8);
      if(cur===e-6)calls.reset=(calls.reset||0)+1;else calls.step=(calls.step||0)+1;}
  }
  if(name==='a_win_body'){m[0xB651]=0xC9;m[SYM.TempStoreA]=ri(256);}   // JP Screen_Congrats -> RET
  if(name==='Game_CalculateScore'||name==='Game_DisplayFinalScore'||name==='scr_final'){
    for(let i=0;i<0x20;i++)m[SYM.Object_FoundTable+2*i]=rnd()<0.5?0:1+ri(3);        // найденные: 1 (после DEC -> 0)
    for(let i=0;i<0x20;i++)m[SYM.Object_FoundTable+2*i+1]=rnd()<0.8?(ri(3)<<4|ri(10)):bcd();
    for(let i=0;i<0x1E;i++)m[SYM.Room_VisitedTable+i]=rnd()<0.6?1:0;
    if(rnd()<0.15){for(let i=0;i<0x20;i++)m[SYM.Object_FoundTable+2*i]=1;for(let i=0;i<0x1E;i++)m[SYM.Room_VisitedTable+i]=1;}
  }
  if(name==='Game_DisplayFinalScore'||name==='scr_final'){
    // шаги: после первой значащей цифры нулей нет (ZX рисует там «1» вместо «0» — ошибка исправлена в нативном коде, tools/endsteps.js)
    {const z=ri(9),dg=[];for(let i=0;i<8;i++)dg.push(i<z?0:1+ri(9));
     for(let i=0;i<4;i++){const hi=dg[2*(3-i)],lo=dg[2*(3-i)+1];m[SYM.Steps_Count+i]=hi<<4|lo;}}
    m[SYM.TempStoreA]=rnd()<0.5?1:bcd();m[SYM.Digit_LeadZeroFlag]=0;
    if(rnd()<0.25){for(let i=0;i<0x20;i++)m[SYM.Object_FoundTable+2*i]=1;}
    calls.disp=(calls.disp||0)+1;
  }
  if(name==='scr_lost')m[0xB2A8]=0xC9;       // CALL Key_WaitAny -> RET
  if(name==='scr_congr')m[0xB2B9]=0xC9;
  if(name==='scr_final')m[0xB2CB]=0xC9;
  return null;
}
module.exports={models,setup,prims:{},ptrvars};
