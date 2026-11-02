// Пиксельная сверка нативной графики (src/vec/gfx.asm) с настоящими подпрограммами ZX.
// Случайный экран ZX (пиксели 0x4000..0x57FF) -> ZX-примитив -> перенос в раскладку Вектора (строка y ZX -> L = 223-y, колонка = столбец) и сравнение с нативным результатом.
//   node tools/gfxcheck.js [образцов=100] [seed=1] [имена: bmp16,tile,flip,dbl,milkfull,milkdec,clrinv,clrfx]
'use strict';
const fs=require('fs'),path=require('path');
const CPU80=require('./vendor/cpu80.js');const Game=require('./zxgame.js');const {SYM}=require('./sym.js');
const ROOT=path.join(__dirname,'..');
const {z2n,n2z,segs}=require('./zxmap');const LO=0x8200,HI=0xFCA0;
const nsym={};for(const l of fs.readFileSync(path.join(ROOT,'build/vec/pyjama.sym'),'latin1').split('\n')){const m=/^(\S+):\s+EQU\s+0x([0-9A-Fa-f]+)/.exec(l);if(m)nsym[m[1]]=parseInt(m[2],16);}
const HUDL=nsym.HUD_L|0;   // 1 — русская раскладка HUD (на колонку левее)
const IMG=fs.readFileSync(path.join(ROOT,'build/vec/pyjama.r0m'));
const N=+process.argv[2]||100,seed=+process.argv[3]||1;const names=(process.argv[4]||'bmp16,tile,flip,dbl,milkfull,milkdec,clrinv,clrfx').split(',');
let s=seed>>>0||1;const rnd=()=>{s^=s<<13;s>>>=0;s^=s>>17;s^=s<<5;s>>>=0;return s/4294967296;};
const ri=(a,b)=>a+Math.floor(rnd()*(b-a+1));
const zaddr=(y,c)=>0x4000+((y&0xC0)<<5)+((y&7)<<8)+((y&0x38)<<2)+c;
function zx2n(z,n){for(let y=0;y<192;y++)for(let c=0;c<32;c++)for(const b of [0x8000,0xA000,0xC000])n[b+c*256+223-y]=z[zaddr(y,c)];}   // три плоскости с одним и тем же исходным экраном
function diff(z,n,base=0x8000){const bad=[];for(let y=0;y<192;y++)for(let c=0;c<32;c++){const a=z[zaddr(y,c)],b=n[base+c*256+223-y];if(a!==b){bad.push(`(${c},${y}) zx=${a.toString(16)} нат=${b.toString(16)}`);if(bad.length>5)return bad;}}return bad;}
function native(zmem,screenInit,label,regs){
  const n=new CPU80();n.mem.set(IMG);for(const [zs,len,vs] of segs)for(let k=0;k<len;k++)n.mem[vs+k]=zmem[zs+k];
  {const v=zmem[SYM.TileStartPtr]|zmem[SYM.TileStartPtr+1]<<8;const w=(z2n(v)||0);n.mem[z2n(SYM.TileStartPtr)]=w&255;n.mem[z2n(SYM.TileStartPtr)+1]=w>>8;}
  for(let i=0;i<0x300;i++)n.mem[nsym.ATTR+i]=zmem[0x5800+i];
  zx2n(screenInit,n.mem);
  const c=n.cpu,R=c.regs,idx={b:0,c:1,d:2,e:3,h:4,l:5,a:7};for(const k in regs)R[idx[k]]=regs[k]&255;
  const SENT=0xFFFE;n.mem[0x7FF1]=SENT>>8;n.mem[0x7FF0]=SENT&255;c.sp=0x7FF0;c.pc=nsym[label];let t=0;
  while(c.pc!==SENT){if(c.pc===nsym.beep){c.pc=n.mem[c.sp]|n.mem[c.sp+1]<<8;c.sp+=2;continue;}c.instruction();if(++t>6e6)throw new Error('не вернулся '+label);}
  return n;
}
const g=new Game(),z=g.zx;const stat={};
for(const nm of names)stat[nm]={ok:0,bad:0};
for(let i=0;i<N;i++){
  g.tick([]);const snap=Uint8Array.from(z.mem);
  for(const nm of names){
    z.mem.set(snap);const zm=Uint8Array.from(snap);for(let a=0x4000;a<0x5800;a++)zm[a]=Math.floor(rnd()*256);
    const screen0=Uint8Array.from(zm);
    let zlabel,nlabel,zregs={},nregs={};
    if(nm==='bmp16'){zm[SYM.BitmapX]=ri(0,0xD8);zm[SYM.BitmapY]=ri(0,0xA8);const a=ri(0,0xC0);zregs={a};nregs={a};zlabel='Bitmap16Draw';nlabel='bmp16';}
    else if(nm==='tile'||nm==='flip'||nm==='dbl'){
      const f=nm==='dbl'?[ri(0,22),ri(0,31)]:nm==='flip'?[ri(5,28),ri(0,31)]:[ri(0,23),ri(0,31)];
      const a=ri(0,0x5F),base=SYM.Bmp_Tiles;zm[SYM.TileStartPtr]=base&255;zm[SYM.TileStartPtr+1]=base>>8;
      zregs={a,d:f[0],e:f[1],c:0x40|ri(0,7)};nregs=zregs;for(let q=0x4000;q<0x5800;q++){zm[q]=0;screen0[q]=0;}zlabel=nm==='tile'?'TileDraw':nm==='flip'?'Tile_DrawFlip':'Tile_BlitDoubleHeight';nlabel=nm==='tile'?'tile_px':nm==='flip'?'tile_flip_px':'tile_dbl_px';}
    else if(nm==='milkfull'){zlabel='Milk_DrawFull';nlabel='milk_full';}
    else if(nm==='milkdec'){const lv=ri(0,0x1C),b=ri(1,3);zm[SYM.MilkLevel]=lv;zregs={b};nregs={b};zlabel='Milk_DecreaseByAmount';nlabel='Milk_DecreaseByAmount';}
    else if(nm==='clrinv'){zlabel='ScreenClear';nlabel='clr_inv';}
    else if(nm==='clrfx'){zlabel='ScreenClearEffect';nlabel='clr_fx';}
    // ZX
    z.mem.set(zm);
    try{g.call(SYM[zlabel],zregs);}catch(e){stat[nm].bad++;console.log('ZX',nm,e.message);continue;}
    const zafter=Uint8Array.from(z.mem);z.mem.set(snap);
    const n=native(zm,screen0,nlabel,nregs);
    // ожидание по плоскостям: sprite — только своя плоскость меняется; тайлы — плоскости по коду цвета; остальное — все три одинаково
    const PLN=[[0x4F,0],[0x6D,2],[0x9A,1],[0xA4,0],[0xAC,1],[0xBA,2],[0xFF,1]];const INKV=[0,1,2,5,4,3,6,7];
    const bad=[];
    for(let pl=0;pl<3;pl++){
      let exp=zafter;
      if(nm==='bmp16'){const k=PLN.find(r=>nregs.a<=r[0])[1];exp=(pl===k)?zafter:screen0;}
      else if(nm==='tile'||nm==='flip'||nm==='dbl'){const v=INKV[nregs.c&7];exp=(v>>pl&1)?zafter:screen0;}
      if(HUDL&&(nm==='milkfull'||nm==='milkdec')){exp=Uint8Array.from(screen0);for(let y=0;y<32;y++){let ch=false;for(let c=13;c<=15;c++)if(zafter[zaddr(y,c)]!==screen0[zaddr(y,c)])ch=true;if(ch)for(let c=12;c<=14;c++)exp[zaddr(y,c)]=zafter[zaddr(y,c+1)];}}   // в порту стакан сдвинут на колонку влево (12..14); сверка по изменённым строкам
      if(HUDL&&nm==='clrinv'){exp=Uint8Array.from(zafter);for(let y=0;y<32;y++)exp[zaddr(y,16)]=0;}                                                              // область инвентаря в порту шире на колонку (с 16)
      for(const b of diff(exp,n.mem,0x8000+0x2000*pl))bad.push('п'+pl+' '+b);if(bad.length>5)break;
    }
    if(process.env.DBG&&nm==='bmp16'&&i===0){const cz=new Set(),cn=new Set();for(let y=0;y<192;y++)for(let c=0;c<32;c++){if(zafter[zaddr(y,c)]!==screen0[zaddr(y,c)])cz.add(c+','+y);if(n.mem[0x8000+c*256+223-y]!==screen0[zaddr(y,c)])cn.add(c+','+y);}console.log('ZX изменил колонки',[...new Set([...cz].map(x=>x.split(',')[0]))],'строки',Math.min(...[...cz].map(x=>+x.split(',')[1])),Math.max(...[...cz].map(x=>+x.split(',')[1])),'| нативный колонки',[...new Set([...cn].map(x=>x.split(',')[0]))],'строки',Math.min(...[...cn].map(x=>+x.split(',')[1])),Math.max(...[...cn].map(x=>+x.split(',')[1])));}
    if(bad.length){stat[nm].bad++;if(stat[nm].bad<=2)console.log('РАСХ',nm,'тик',i,JSON.stringify(zregs),'bmp',zm[SYM.BitmapX],zm[SYM.BitmapY],bad.join(' '));}else stat[nm].ok++;
  }
}
for(const [k,v] of Object.entries(stat))console.log(k.padEnd(10),'ок',v.ok,'расхождений',v.bad);
