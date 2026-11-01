// Один шаг игры (GameLoop, B354..B372): 9 вызовов. Pause_Short модель не считает.
'use strict';
const {Ctx}=require('./core.js');
const W=require('./wally.js'),Rm=require('./room.js'),F=require('./flow.js');
const A=require('./events_a.js');
function gameTick(c){
  c.tickMode=true;c.inputs.tickMode=true;
  try{
    W.Wally_Handler(c);
    W.Wally_StepCheck(c);
    F.Wally_CheckForDeath(c);
    Rm.Wally_TestObjSlot(c);
    Rm.Game_PercentUpdate(c);
    F.Room_EventCaller(c);
    F.Game_ExitCheck(c);
    A.Food_CheckPickup(c);
    Rm.Room_TestEvents(c);
    return 'ok';
  }catch(e){
    if(e.loop)return 'loop';
    if(e.gameOver)return 'gameover';
    if(e.title)return 'title';
    throw e;
  }
}
function run(M,r,inputs){const c=new Ctx(M,r,inputs);const res=gameTick(c);return {log:c.log,res};}
module.exports={gameTick,run};
