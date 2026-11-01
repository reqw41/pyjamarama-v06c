// Плагин: шаг игры целиком — нативный GameLoop (9 вызовов; Pause_Short пропускается) против модели src/model/game.js.
// Комнаты 0x19 и 0x1E (захватчики/аркада) исключены, пока нативная аркада не принята. Запуск: node tools/lockn.js 300 1 GameLoop
'use strict';
const G=require('../../src/model/game.js');
const SYM=require('../sym.js').SYM;
const ROOMS=[...Array(30).keys()];
module.exports={
  models:{GameLoop:(c)=>{const r=G.gameTick(c);c.res=r;}},
  setup(name,zmem,rnd,env){
    zmem[SYM.Wally_RoomNo]=ROOMS[Math.floor(rnd()*ROOMS.length)];
    zmem[SYM.BoxingTrap_Room]=rnd()<0.3?zmem[SYM.Wally_RoomNo]:0xFF;
    zmem[SYM.WallyLives]=3;zmem[SYM.DeathFlag]=rnd()<0.05?1:0;
    return null;
  },
  prims:{},ptrvars:[],
};
