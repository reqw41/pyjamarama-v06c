// Пиксельная сверка ракеты (src/vec/rocket.asm) с ZX: случайный экран ZX -> Action10/11 (ZX, до конца анимации) -> перенос в раскладку Вектора и сравнение
// с плоскостью 0 после a_rocket_earth / a_rocket_moon. Заодно: HL на выходе = HL на входе, число Pause_Short (каждые 8 сдвигов).
// ZX после анимации прыгает в Room_TestEvents_0 (цикл скрипта) — в копии памяти ZX оба перехода (8C02, 8C05) переадресованы на ловушку 0xFFF0 g.call.
//   node tools/rocketcheck.js [образцов=20] [seed=1]      NEG=1 — негативный тест (в нативный код вносится порча, обязано краснеть)
'use strict';
const fs=require('fs'),path=require('path');
const CPU80=require('./vendor/cpu80.js');const Game=require('./zxgame.js');const {SYM}=require('./sym.js');
const ROOT=path.join(__dirname,'..');
const {z2n,n2z,segs,inData}=require('./zxmap');const LO=0x8200,HI=0xFCA0;
const nsym={};for(const l of fs.readFileSync(path.join(ROOT,'build/vec/pyjama.sym'),'latin1').split('\n')){const m=/^(\S+):\s+EQU\s+0x([0-9A-Fa-f]+)/.exec(l);if(m)nsym[m[1]]=parseInt(m[2],16);}
const IMG=fs.readFileSync(path.join(ROOT,'build/vec/pyjama.r0m'));
const N=+process.argv[2]||20,seed=+process.argv[3]||1;
let s=seed>>>0||1;const rnd=()=>{s^=s<<13;s>>>=0;s^=s>>17;s^=s<<5;s>>>=0;return s/4294967296;};
const zaddr=(y,c)=>0x4000+((y&0xC0)<<5)+((y&7)<<8)+((y&0x38)<<2)+c;
function zx2n(z,n){for(let y=0;y<192;y++)for(let c=0;c<32;c++)for(const b of [0x8000,0xA000,0xC000])n[b+c*256+223-y]=z[zaddr(y,c)];}
function diff(z,n){const bad=[];/* плоскости 1 и 2 сдвигаются так же, как 0 (Wally рисуется только в плоскости 0): между собой равны */for(let y=0;y<192&&bad.length<3;y++)for(let c=0;c<32;c++){if(n[0xA000+c*256+223-y]!==n[0xC000+c*256+223-y]){bad.push('плоскости 1 и 2 различны ('+c+','+y+')');break;}}for(let y=0;y<192;y++)for(let c=0;c<32;c++){const a=z[zaddr(y,c)],b=n[0x8000+c*256+223-y];if(a!==b){bad.push(`(кол ${c},y ${y}) zx=${a.toString(16)} нат=${b.toString(16)}`);if(bad.length>5)return bad;}}return bad;}
function native(zmem,screenInit,label,regs){
  const n=new CPU80();n.mem.set(IMG);for(const [zs,len,vs] of segs)for(let k=0;k<len;k++)n.mem[vs+k]=zmem[zs+k];
  {const v=zmem[SYM.TileStartPtr]|zmem[SYM.TileStartPtr+1]<<8;const w=(z2n(v)||0);n.mem[z2n(SYM.TileStartPtr)]=w&255;n.mem[z2n(SYM.TileStartPtr)+1]=w>>8;}
  for(let i=0;i<0x300;i++)n.mem[nsym.ATTR+i]=zmem[0x5800+i];
  for(const lab of ['bmp16w','wally_half']){n.mem[nsym[lab]]=0xC3;n.mem[nsym[lab]+1]=nsym.bmp16&255;n.mem[nsym[lab]+2]=nsym.bmp16>>8;}   // Wally целиком в плоскость 0, как у ZX (двухцветность проверяется отдельно)
  zx2n(screenInit,n.mem);
  if(process.env.NEG)n.mem[nsym[label]+2]^=1;   // порча: другая колонка
  const c=n.cpu,R=c.regs,idx={b:0,c:1,d:2,e:3,h:4,l:5,a:7};for(const k in regs)R[idx[k]]=regs[k]&255;
  const SENT=0xFFFE;n.mem[0x7FF1]=SENT>>8;n.mem[0x7FF0]=SENT&255;c.sp=0x7FF0;c.pc=nsym[label];let t=0,pauses=0;
  while(c.pc!==SENT){
    if(c.pc===nsym.Pause_Short){pauses++;c.pc=n.mem[c.sp]|n.mem[c.sp+1]<<8;c.sp+=2;continue;}
    c.instruction();if(++t>2e7)throw new Error('не вернулся '+label);}
  n.pauses=pauses;n.t=t;return n;
}
const g=new Game(),z=g.zx;const stat={};
for(const nm of ['earth','moon'])stat[nm]={ok:0,bad:0};
let maxT=0;
for(let i=0;i<N;i++){
  g.tick([]);const snap=Uint8Array.from(z.mem);
  for(const nm of ['earth','moon']){
    z.mem.set(snap);const zm=Uint8Array.from(snap);for(let a=0x4000;a<0x5800;a++)zm[a]=Math.floor(rnd()*256);
    const screen0=Uint8Array.from(zm);
    zm[0x8C03]=0xF0;zm[0x8C04]=0xFF;zm[0x8C06]=0xF0;zm[0x8C07]=0xFF;
    let hl;do{hl=0x9000+Math.floor(rnd()*0x1000);}while(!inData(hl));   // HL — указатель в данные: только там, где данные есть в образе
    z.mem.set(zm);
    try{g.call(SYM[nm==='earth'?'Action10_LiftOffFromEarth':'Action11_LiftOffFromMoon'],{h:hl>>8,l:hl&255});}catch(e){stat[nm].bad++;console.log('ZX',nm,e.message);continue;}
    const zafter=Uint8Array.from(z.mem);z.mem.set(snap);
    const n=native(zm,screen0,nm==='earth'?'a_rocket_earth':'a_rocket_moon',{h:(z2n(hl))>>8,l:(z2n(hl))&255});
    const R=n.cpu.regs;const bad=diff(zafter,n.mem);
    if(((R[4]<<8)|R[5])!==z2n(hl))bad.push('HL на выходе '+((R[4]<<8)|R[5]).toString(16)+' != '+(z2n(hl)).toString(16));
    const wantP=nm==='earth'?17:16;if(n.pauses!==wantP)bad.push('Pause_Short '+n.pauses+' != '+wantP);
    maxT=Math.max(maxT,n.t);
    if(bad.length){stat[nm].bad++;if(stat[nm].bad<=2)console.log('РАСХ',nm,'образец',i,bad.join(' '));}else stat[nm].ok++;
  }
}
for(const [k,v] of Object.entries(stat))console.log(k.padEnd(8),'ок',v.ok,'расхождений',v.bad);
console.log('макс. инструкций на действие (без пауз):',maxT);
