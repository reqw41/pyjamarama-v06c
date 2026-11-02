// Оригинальное стартовое меню ZX Pyjamarama: рисуем теми же подпрограммами (ScreenClearSimple, String_DrawDouble Str_MainMenu, Menu_UpdateKeys), снимок экрана ZX -> build/zx_menu.ppm
'use strict';
const fs=require('fs'),path=require('path');
const Game=require('./zxgame.js');const {SYM}=require('./sym.js');
const g=new Game(),z=g.zx;g.tick([]);
g.call(SYM.ScreenClearSimple,{});
g.call(SYM.String_DrawDouble,{h:SYM.Str_MainMenu>>8,l:SYM.Str_MainMenu&255,d:0,e:3,c:0x47});
g.call(SYM.Menu_UpdateKeys,{});
const PAL=[[0,0,0],[0,0,205],[205,0,0],[205,0,205],[0,205,0],[0,205,205],[205,205,0],[205,205,205]],BR=[[0,0,0],[0,0,255],[255,0,0],[255,0,255],[0,255,0],[0,255,255],[255,255,0],[255,255,255]];
const W=256,H=192,img=Buffer.alloc(W*H*3);
for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const a=0x4000+((y&0xC0)<<5)+((y&7)<<8)+((y&0x38)<<2)+(x>>3),b=(z.mem[a]>>(7-(x&7)))&1,at=z.mem[0x5800+(y>>3)*32+(x>>3)];
  const ink=at&7,pap=(at>>3)&7,br=(at>>6)&1;const c=(b?ink:pap),col=(br?BR:PAL)[c];img.set(col,(y*W+x)*3);
}
fs.writeFileSync('build/zx_menu.ppm',Buffer.concat([Buffer.from(`P6 ${W} ${H} 255\n`),img]));
console.log('ok');
