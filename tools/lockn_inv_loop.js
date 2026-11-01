// Сверка ШАГА аркадного цикла: нативный Invaders_Step (один проход F4A6..F4CD) против цепочки подпрограмм модели src/model/invaders.js.
// Граница шага та же, что в tools/run_invaders.js: Wally_Handler, Wally_StepCheck, 6*Inv_Update, Arcade_UpdateExplosions, Invaders_ExitCheck,
// Inv_BulletUpdate, Arcade_UpdateBombs, Invaders_Pause; Wally_CheckForDeath вынесен за шаг (нативный стоп на его метке).
// Выходы без возврата: ExitCheck -> loop_restart/GameLoop (стоп на GameLoop), последний захватчик -> возврат из Invaders_Step.
// Заодно сверяется вход a_arcade: нативный a_arcade до Invaders_Loop против Action13_EnterAcrade.
//   node tools/lockn_inv_loop.js [шагов=300] [seed=1]
// Состояние: ZX-эталон -> модель Action13_EnterAcrade -> случайное число шагов модели с возмущениями -> сверяемый шаг.
'use strict';
const fs=require('fs'),path=require('path');
const CPU80=require('./vendor/cpu80.js');
const Game=require('./zxgame.js');const {SYM}=require('./sym.js');
const {Ctx,PRIM}=require('../src/model/core.js');
const I=require('../src/model/invaders.js');const Wl=require('../src/model/wally.js');
const plug=require('./lockn_plugins/invaders.js');
const ROOT=path.join(__dirname,'..');
const rel=JSON.parse(fs.readFileSync(path.join(ROOT,'build/vec/reloc.json')));
const {z2n,n2z,segs,inData}=require('./zxmap');const LO=0x8200,HI=0xFCA0,ATTRZ=0x5800;
const nsym={};for(const l of fs.readFileSync(path.join(ROOT,'build/vec/pyjama.sym'),'latin1').split('\n')){const m=/^(\S+):\s+EQU\s+0x([0-9A-Fa-f]+)/.exec(l);if(m)nsym[m[1]]=parseInt(m[2],16);}
const ATTR=nsym.ATTR,IMG=fs.readFileSync(path.join(ROOT,'build/vec/pyjama.r0m'));
const PTRVARS=plug.ptrvars;
const PRIMN={bmp16:'Bitmap16Draw',bmp16w:'Bitmap16Draw',wally_half:'Bitmap16Draw',beep:'Beep_Effect',tile:'TileDraw',tile_flip:'Tile_DrawFlip',tile_dbl:'Tile_BlitDoubleHeight',milk_full:'Milk_DrawFull',clr_inv:'ScreenClear',clr_fx:'ScreenClearEffect',fx_noise:'FX_WhiteNoise'};
function mkNative(zmem){
  const n=new CPU80();n.mem.set(IMG);
  for(const [zs,len,vs] of segs)for(let k=0;k<len;k++)n.mem[vs+k]=zmem[zs+k];
  for(const r of rel.reloc){const v=n.mem[r.addr]|n.mem[r.addr+1]<<8;const w=(z2n(v)||0);n.mem[r.addr]=w&255;n.mem[r.addr+1]=w>>8;}
  for(const c of rel.codeptrs){n.mem[c.addr]=0;n.mem[c.addr+1]=0;}
  for(let i=0;i<0x300;i++)n.mem[ATTR+i]=zmem[ATTRZ+i];
  {const v=zmem[SYM.TileStartPtr]|zmem[SYM.TileStartPtr+1]<<8;const w=(z2n(v)||0);n.mem[z2n(SYM.TileStartPtr)]=w&255;n.mem[z2n(SYM.TileStartPtr)+1]=w>>8;}
  for(const nm of PTRVARS){const a=SYM[nm];const v=zmem[a]|zmem[a+1]<<8;if(v>=LO&&v<HI){const w=(z2n(v)||0);n.mem[z2n(a)]=w&255;n.mem[z2n(a)+1]=w>>8;}}
  n.mem[nsym.fd_flip]=(zmem[0xE1E0]|zmem[0xE1E1]<<8)===SYM.Tile_DrawFlip?1:0;
  return n;
}
function mirror(n){const z=new Uint8Array(0x10000);for(const [zs,len,vs] of segs)for(let k=0;k<len;k++)z[zs+k]=n.mem[vs+k];
  const v=(n.mem[z2n(SYM.TileStartPtr)]|n.mem[z2n(SYM.TileStartPtr)+1]<<8);const vv=n2z(v);z[SYM.TileStartPtr]=vv&255;z[SYM.TileStartPtr+1]=vv>>8;return z;}
const relset=new Set();for(const r of rel.reloc){relset.add(n2z(r.addr));relset.add(n2z(r.addr)+1);}
for(const c of rel.codeptrs){relset.add(n2z(c.addr));relset.add(n2z(c.addr)+1);}
function cmp(n,zm){
  const bad=[];const skip=new Set([0xAB26,0xAB32,0xE1D8,0xE1D9,0xE1E0,0xE1E1,0xAFE9,0xAFEA,SYM.TileStartPtr,SYM.TileStartPtr+1]);
  {const mv=(z2n(zm[SYM.TileStartPtr]|zm[SYM.TileStartPtr+1]<<8)||0),nv=n.mem[z2n(SYM.TileStartPtr)]|n.mem[z2n(SYM.TileStartPtr)+1]<<8;if(mv!==nv)bad.push([SYM.TileStartPtr,mv,nv]);
   for(const nm of PTRVARS){const a=SYM[nm];skip.add(a);skip.add(a+1);const v=zm[a]|zm[a+1]<<8;const mv=(v>=LO&&v<HI)?(z2n(v)||0):v;const nv=n.mem[z2n(a)]|n.mem[z2n(a)+1]<<8;if(mv!==nv)bad.push([a,mv,nv]);}}
  for(let a=LO;a<HI;a++){if(!inData(a)||relset.has(a)||skip.has(a))continue;if(n.mem[z2n(a)]!==zm[a]){bad.push([a,zm[a],n.mem[z2n(a)]]);if(bad.length>8)break;}}
  for(let i=0;i<0x300&&bad.length<9;i++)if(n.mem[ATTR+i]!==zm[ATTRZ+i])bad.push([ATTRZ+i,zm[ATTRZ+i],n.mem[ATTR+i]]);
  return bad;
}
// нативный запуск: from — метка; stops — {pc:имя}; возврат на SENT = 'ret'. Возвращает {why,log}
function runNative(n,from,stops,rands){
  const c=n.cpu,R=c.regs,SENT=0xFFFE,log=[];
  n.mem[0x7FF1]=SENT>>8;n.mem[0x7FF0]=SENT&255;c.sp=0x7FF0;c.pc=nsym[from];
  const hooks={};for(const [lab,pn] of Object.entries(PRIMN))if(nsym[lab]!==undefined)hooks[nsym[lab]]=pn;
  const stp={};for(const [lab,nm] of Object.entries(stops))stp[nsym[lab]]=nm;
  let t=0;
  for(;;){
    if(c.pc===SENT)return {why:'ret',log};
    if(stp[c.pc])return {why:stp[c.pc],log};
    if(c.pc===nsym.Pause_Short||c.pc===nsym.Tick_Wait||c.pc===nsym.pause_chk||c.pc===nsym.Invaders_Pause){c.pc=n.mem[c.sp]|n.mem[c.sp+1]<<8;c.sp+=2;continue;}
    if(c.pc===nsym.rnd_a){R[7]=rands.shift()&255;c.pc=n.mem[c.sp]|n.mem[c.sp+1]<<8;c.sp+=2;continue;}
    const pn=hooks[c.pc];if(pn)log.push(PRIM[pn].zx(mirror(n),{a:R[7],b:R[0],c:R[1],d:R[2],e:R[3],h:R[4],l:R[5]}));
    if(c.pc===nsym.bmp16w||c.pc===nsym.wally_half){c.pc=n.mem[c.sp]|n.mem[c.sp+1]<<8;c.sp+=2;continue;}
    if(pn==='Beep_Effect'||pn==='FX_WhiteNoise'){c.pc=n.mem[c.sp]|n.mem[c.sp+1]<<8;c.sp+=2;continue;}
    try{c.instruction();}catch(e){const best=Object.entries(nsym).filter(([k,v])=>v<=c.pc).sort((a,b)=>b[1]-a[1])[0];console.log('исключение у',c.pc.toString(16),best);throw e;}if(++t>3e6)throw new Error('нативный '+from+' не завершился, pc '+c.pc.toString(16));
  }
}
// шаг модели
function stepModel(c){
  const r=c.r;
  Wl.Wally_Handler(c);Wl.Wally_StepCheck(c);
  for(let i=0;i<6;i++)I.Inv_Update(c);
  I.Arcade_UpdateExplosions(c);
  if(I.Invaders_ExitCheck(c))return 'GameLoop';
  if(I.Inv_BulletUpdate(c))return 'ret';
  I.Arcade_UpdateBombs(c);I.Invaders_Pause(c);
  return 'Wally_CheckForDeath';
}
const steps=+process.argv[2]||300,seed=+process.argv[3]||1;
let s=seed>>>0||1;const rnd=()=>{s^=s<<13;s>>>=0;s^=s>>17;s^=s<<5;s>>>=0;return s/4294967296;};
const ri=(k)=>Math.floor(rnd()*k);
const g=new Game();const z=g.zx;
const regs0=()=>({a:0,b:0,c:0x42,d:0,e:0,h:0,l:0,ix:0,iy:0});
const mkRands=()=>{const a=[];for(let i=0;i<60;i++)a.push(rnd()<0.1?ri(8):ri(256));return a;};
const mkKb=()=>{const kb=[0x1f,0x1f,0x1f,0x1f,0x1f,0x1f,0x1f,0x1f];const k=ri(8);if(k&1)kb[5]&=~1;if(k&2)kb[5]&=~2;if(k&4)kb[7]&=~4;if(rnd()<0.5)kb[7]|=4;return kb;};
const stat={step:{ok:0,bad:0},enter:{ok:0,bad:0}};const outc={};let shown=0;
function report(kind,why,bad,ml,nl,extra){
  stat[kind].bad++;if(shown++<6){console.log('РАСХ',kind,extra||'','исход',why,bad.map(b=>b[0].toString(16)+':модель='+b[1]+' нативный='+b[2]).join(' '));
    let k=0;while(k<ml.length&&k<nl.length&&JSON.stringify(ml[k])===JSON.stringify(nl[k]))k++;if(ml.length!==nl.length||k<ml.length)console.log('  журнал: отличие #'+k+' из',ml.length,nl.length,JSON.stringify(ml[k]),JSON.stringify(nl[k]));}
}
let M=null;
for(let t=0;t<steps;t++){
  if(!M||rnd()<0.04){   // новая аркада: ZX-эталон -> вход моделью, затем несколько шагов модели
    if(z.mem[SYM.WallyLives]<2)z.mem[SYM.WallyLives]=3;
    g.tick(rnd()<0.8?[['O','P','M'][ri(3)]]:[]);
    M=Uint8Array.from(z.mem);
    plug.arcState(M,rnd,SYM);
    // вход в аркаду НЕ по нативной a_arcade: модель (состояние-источник); нативный вход сверяем отдельно ниже
    const zin=Uint8Array.from(M);const c0=new Ctx(zin,regs0(),{kb:mkKb(),rands:mkRands()});
    const nn=mkNative(M);
    I.Action13_EnterAcrade(c0);
    const nr=runNative(nn,'a_arcade',{Invaders_Loop:'loop'},[]);
    const bad=cmp(nn,zin);const jm=JSON.stringify(c0.log),jn=JSON.stringify(nr.log);
    if(bad.length||jm!==jn||nr.why!=='loop')report('enter',nr.why,bad,c0.log,nr.log);else stat.enter.ok++;
    M=zin;
    const k=ri(25);
    for(let i=0;i<k;i++){const c=new Ctx(M,regs0(),{kb:mkKb(),rands:mkRands()});const w=stepModel(c);if(w==='GameLoop'){M=null;break;}}
    if(!M)continue;
  }
  // возмущения для редких ветвей
  {const q=ri(14);
   if(q===0)M[SYM.Invaders_PauseValue]=1;
   else if(q===1){const v=0x736C+0x8100;M[SYM.Inv_TypePtr]=v&255;M[SYM.Inv_TypePtr+1]=v>>8;}
   else if(q===2)M[SYM.WallyLives]=2+ri(2);
   else if(q===3){M[SYM.Wally_X]=7+ri(3);}
   else if(q===4){M[SYM.Wally_X]=0x20+ri(0xa0);}
   else if(q===5){const i=ri(24);const D=SYM.Invaders_Data;if(M[D+2*i]!==0xFE){M[SYM.Inv_BulletX]=(M[D+2*i]+ri(20)-8)&255;M[SYM.Inv_BulletY]=(M[D+2*i+1]+ri(20)-8)&255;}}
   else if(q===6){const i=ri(24);const D=SYM.Invaders_Data;if(M[D+2*i]!==0xFE)M[D+2*i+1]=0x9C+ri(5);M[SYM.Inv___Flag]=2;}
   else if(q===7){const D=SYM.Invaders_Data;let c=0;for(let i=0;i<24;i++)if(M[D+2*i]!==0xFE)c++;
     if(c>1){let keep=ri(24);while(M[D+2*keep]===0xFE)keep=ri(24);for(let i=0;i<24;i++)if(i!==keep)M[D+2*i]=0xFE;M[SYM.Invaders_PauseValue]=1;
       M[SYM.Inv_BulletX]=M[D+2*keep]+2;M[SYM.Inv_BulletY]=M[D+2*keep+1]+2;}}
  }
  const zm=Uint8Array.from(M);
  const nat=mkNative(zm);
  const kb=mkKb();nat.mem[nsym.in_state]=(!(kb[5]&1)?1:0)|(!(kb[5]&2)?2:0)|(!(kb[7]&4)?4:0);
  const rands=mkRands();
  const c=new Ctx(zm,regs0(),{kb,rands:rands.slice()});
  const why=stepModel(c);
  const nr=runNative(nat,'Invaders_Step',{Wally_CheckForDeath:'Wally_CheckForDeath',GameLoop:'GameLoop'},rands.slice());
  const bad=cmp(nat,zm);const jm=JSON.stringify(c.log),jn=JSON.stringify(nr.log);
  outc[why]=(outc[why]||0)+1;
  if(bad.length||jm!==jn||nr.why!==why)report('step',why+'/'+nr.why,bad,c.log,nr.log,'шаг '+t);else stat.step.ok++;
  M=zm;
  if(why==='GameLoop')M=null;
}
console.log('шаг аркады  ок',stat.step.ok,'расхождений',stat.step.bad,'| исходы модели',JSON.stringify(outc));
console.log('вход a_arcade ок',stat.enter.ok,'расхождений',stat.enter.bad);
