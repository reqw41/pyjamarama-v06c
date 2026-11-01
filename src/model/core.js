// Модель логики Pyjamarama V1: контекст, регистры, примитивы вывода.
// Память модели — образ ZX (адреса как в оригинале). Пиксели (0x4000..0x57FF) модель не ведёт: вывод — журнал примитивов
// (c.log), атрибуты (0x5800..0x5AFF) — часть логики и ведутся.
'use strict';
const {SYM}=require('../../tools/sym.js');
const S=SYM;
const W=(M,a)=>M[a]|M[a+1]<<8;
const SW=(M,a,v)=>{M[a]=v&255;M[a+1]=(v>>8)&255;};

class Ctx{
  constructor(M,r,inputs){this.M=M;this.r=r;this.log=[];this.inputs=inputs||{};this.kb=(inputs&&inputs.kb)||[0x1f,0x1f,0x1f,0x1f,0x1f,0x1f,0x1f,0x1f];}
  b(a){return this.M[a];}
  sb(a,v){this.M[a]=v&255;}
  w(a){return W(this.M,a);}
  sw(a,v){SW(this.M,a,v);}
  // IN A,(port): клавиатура ZX
  inKey(port){ if(port&1)return 0xff; const hi=port>>8;let v=0x1f;for(let i=0;i<8;i++)if(!(hi&(1<<i)))v&=this.kb[i];return v|0xe0; }
  // регистровые пары
  get hl(){return this.r.h<<8|this.r.l;} set hl(v){this.r.h=(v>>8)&255;this.r.l=v&255;}
  get de(){return this.r.d<<8|this.r.e;} set de(v){this.r.d=(v>>8)&255;this.r.e=v&255;}
  get bc(){return this.r.b<<8|this.r.c;} set bc(v){this.r.b=(v>>8)&255;this.r.c=v&255;}
}

// ATTR для пикселя (y в H, x в L)
const attrAddr=(y,x)=>0x5800+((y>>3)<<5)+(x>>3);

// ---- примитивы вывода: действие в модели + запись журнала ----
// Каждый примитив: log(c) -> запись; fx(c) -> побочные действия на логику/регистры.
const PRIM={
  Bitmap16Draw:{ zx:(M,st)=>['bmp',st.a,M[S.BitmapX],M[S.BitmapY]],
    fx:(c)=>{c.log.push(['bmp',c.r.a,c.M[S.BitmapX],c.M[S.BitmapY]]);} },
  Beep_Effect:{ reentry:[0xAFC6], zx:(M,st)=>['snd',st.b,st.c,st.d,st.e,st.h,st.l],
    fx:(c)=>{const r=c.r;c.log.push(['snd',r.b,r.c,r.d,r.e,r.h,r.l]);
      // регистры после: B += -H*C ... + L*E, C=D=E=0, A=0
      let b=r.b,cc=r.c,d=r.d,e=r.e;
      do{b=(b-r.h)&255;cc=(cc-1)&255;}while(cc);
      do{d=(d-1)&255;}while(d);
      do{b=(b+r.l)&255;e=(e-1)&255;}while(e);
      r.b=b;r.c=0;r.d=0;r.e=0;r.a=0;} },
  TileDraw:{ zx:(M,st)=>['tile',st.a,st.d,st.e,st.c,W(M,S.TileStartPtr)],
    fx:(c)=>{const r=c.r;c.log.push(['tile',r.a,r.d,r.e,r.c,c.w(S.TileStartPtr)]);c.sb(0x5800+(r.d<<5)+r.e,r.c);} },
  Tile_DrawFlip:{ zx:(M,st)=>['flip',st.a,st.d,st.e,st.c,W(M,S.TileStartPtr)],
    fx:(c)=>{const r=c.r;c.log.push(['flip',r.a,r.d,r.e,r.c,c.w(S.TileStartPtr)]);c.sb(0x5800+(((0x1c-r.d)&255)<<5)+r.e,r.c);} },
  Tile_BlitDoubleHeight:{ zx:(M,st)=>['dbl',st.a,st.d,st.e,st.c],
    fx:(c)=>{const r=c.r;c.log.push(['dbl',r.a,r.d,r.e,r.c]);const a=0x5800+(r.d<<5)+r.e;c.sb(a,r.c);c.sb(a+32,r.c);} },
  ScreenClear:{ zx:()=>['clr'], fx:(c)=>{c.log.push(['clr']);c.r.ix=S.DF_lookup+0x40;} },
  ScreenClearEffect:{ zx:()=>['clrfx'], fx:()=>{} },
  Milk_DrawFull:{ zx:()=>['milkfull'],
    fx:(c)=>{c.log.push(['milkfull']);const r=c.r;
      // побочные регистры: IX=DF+0x40, B=0, C=0x9F, HL=Bmp_MilkFull+0x60, DE=адрес последней строки+0x0B+3
      r.ix=S.DF_lookup+0x40;r.b=0;r.c=0x9F;c.hl=S.Bmp_MilkFull+0x60;c.de=(c.w(S.DF_lookup+62)+0x0b+3)&0xffff;} },
};
function prim(c,name){PRIM[name].fx(c);}

module.exports={Ctx,S,W,SW,attrAddr,PRIM,prim};
