// Сверка НАТИВНОГО i8080 с моделью: состояние из ZX-эталона (реалистичное), модель — на раскладке ZX, нативный код — на раскладке Вектора
// (данные сдвиг -0x8100, атрибуты в ATTR). Сравнение: вся память данных+атрибутов и журнал примитивов.
//   node tools/lockn.js [тиков=200] [seed=1] [подпрограммы через запятую: Wally_Erase,Wally_Draw,...]
'use strict';
const fs=require('fs'),path=require('path');
const CPU80=require('./vendor/cpu80.js');
const Game=require('./zxgame.js');const {SYM}=require('./sym.js');
const {Ctx,PRIM}=require('../src/model/core.js');
const ROOT=path.join(__dirname,'..');
const rel=JSON.parse(fs.readFileSync(path.join(ROOT,'build/vec/reloc.json')));
const {z2n,n2z,segs,inData}=require('./zxmap'); const SHIFT=0, LO=0x8200, HI=0xFCA0, ATTRZ=0x5800;
const nsym={};for(const l of fs.readFileSync(path.join(ROOT,'build/vec/pyjama.sym'),'latin1').split('\n')){const m=/^(\S+):\s+EQU\s+0x([0-9A-Fa-f]+)/.exec(l);if(m)nsym[m[1]]=parseInt(m[2],16);}
const ATTR=nsym.ATTR;
const IMG=fs.readFileSync(path.join(ROOT,'build/vec/pyjama.r0m'));

const models={
  Wally_Erase:require('../src/model/wally.js').Wally_Erase, Wally_Draw:require('../src/model/wally.js').Wally_Draw,
  Wally_StepCheck:require('../src/model/wally.js').Wally_StepCheck, Wally_StepsIncr:require('../src/model/wally.js').Wally_StepsIncr,
  Wally_CheckFall:require('../src/model/wally.js').Wally_CheckFall, Wally_Move:require('../src/model/wally.js').Wally_Move,
  Wally_Jump:require('../src/model/wally.js').Wally_Jump, Wally_Handler:require('../src/model/wally.js').Wally_Handler,
  Energy_Countdown:require('../src/model/wally.js').Energy_Countdown, Milk_DecreaseByAmount:require('../src/model/wally.js').Milk_DecreaseByAmount,
  Wally_HitTest:require('../src/model/wally.js').Wally_HitTest,
  FurnitureDraw:require('../src/model/room.js').FurnitureDraw, Inv_Redraw:require('../src/model/room.js').Inv_Redraw, RoomDraw:require('../src/model/room.js').RoomDraw,
  Room_Enter:require('../src/model/room.js').Room_Enter, Wally_Reset:require('../src/model/room.js').Wally_Reset, Game_PercentUpdate:require('../src/model/room.js').Game_PercentUpdate,
  Wally_TestObjSlot:require('../src/model/room.js').Wally_TestObjSlot, Room_TestEvents:require('../src/model/room.js').Room_TestEvents,
  Wally_EnergyIncBy:require('../src/model/wally.js').Wally_EnergyIncBy, Wally_TurnHead:require('../src/model/wally.js').Wally_TurnHead,
};
// плагины: tools/lockn_plugins/*.js экспортируют { models:{Имя:fn(ctx)}, setup(name,zmem,rnd,env)->{zregs,nregs}|null, prims:{метка:'ИмяПримитиваМодели'} }
const plugins=[];
{const dir=path.join(__dirname,'lockn_plugins');if(fs.existsSync(dir))for(const f of fs.readdirSync(dir).sort())if(f.endsWith('.js'))plugins.push(require(path.join(dir,f)));}
for(const pl of plugins)Object.assign(models,pl.models||{});
const PTRVARS=[];for(const pl of plugins)for(const nm of (pl.ptrvars||[]))PTRVARS.push(nm);
function mkNative(zmem){
  const n=new CPU80();n.mem.set(IMG);
  for(const [zs,len,vs] of segs)for(let k=0;k<len;k++)n.mem[vs+k]=zmem[zs+k];
  for(const r of rel.reloc){const v=n.mem[r.addr]|n.mem[r.addr+1]<<8;const w=(z2n(v)||0);n.mem[r.addr]=w&255;n.mem[r.addr+1]=w>>8;}   // слова-указатели на данные
  for(const c of rel.codeptrs){n.mem[c.addr]=0;n.mem[c.addr+1]=0;}
  for(let i=0;i<0x300;i++)n.mem[ATTR+i]=zmem[ATTRZ+i];
  {const v=zmem[SYM.TileStartPtr]|zmem[SYM.TileStartPtr+1]<<8;const w=(z2n(v)||0);n.mem[z2n(SYM.TileStartPtr)]=w&255;n.mem[z2n(SYM.TileStartPtr)+1]=w>>8;}
  for(const nm of PTRVARS){const a=SYM[nm];const v=zmem[a]|zmem[a+1]<<8;if(v>=LO&&v<HI){const w=(z2n(v)||0);n.mem[z2n(a)]=w&255;n.mem[z2n(a)+1]=w>>8;}}
  n.mem[nsym.fd_flip]=(zmem[0xE1E0]|zmem[0xE1E1]<<8)===SYM.Tile_DrawFlip?1:0;
  return n;
}
// нативный вызов с перехватом примитивов; возвращает журнал
const PRIMN={bmp16:'Bitmap16Draw',bmp16w:'Bitmap16Draw',wally_half:'Bitmap16Draw',beep:'Beep_Effect',tile:'TileDraw',tile_flip:'Tile_DrawFlip',tile_dbl:'Tile_BlitDoubleHeight',milk_full:'Milk_DrawFull',clr_inv:'ScreenClear',clr_fx:'ScreenClearEffect'};
for(const pl of plugins)Object.assign(PRIMN,pl.prims||{});
const STUBLABELS=['a_arcade','a_magnet','a_rope','Test08_Box','a_rocket_earth','a_rocket_moon','a_win'];
function callNative(n,fullname,regs,rands){
  const name=fullname.split('@')[0];
  const stubs=new Set();for(const l of STUBLABELS){const a=nsym[l];if(a!==undefined&&(n.mem[a]===0xC9||(n.mem[a]===0xB7&&n.mem[a+1]===0xC9)))stubs.add(a);}
  const c=n.cpu,R=c.regs,SENT=0xFFFE,log=[];
  const idx={b:0,c:1,d:2,e:3,h:4,l:5,a:7};for(const k in (regs||{}))R[idx[k]]=regs[k]&255;
  n.mem[0x7FF1]=SENT>>8;n.mem[0x7FF0]=SENT&255;c.sp=0x7FF0;c.pc=nsym[name];
  const hooks={};for(const [lab,pn] of Object.entries(PRIMN))if(nsym[lab]!==undefined)hooks[nsym[lab]]=pn;
  let t=0;const pcs=[];
  while(c.pc!==SENT){
    if(c.pc===nsym.GameLoop&&t>0)return log;
    if(c.pc===nsym.Pause_Short||c.pc===nsym.Tick_Wait||c.pc===nsym.pause_chk){c.pc=n.mem[c.sp]|n.mem[c.sp+1]<<8;c.sp+=2;continue;}   // пауза шага в стенде не нужна
    if(c.pc===nsym.game_over)throw new Error('SKIP game_over');
    if(c.pc===nsym.rnd_a&&rands){R[7]=rands.shift()&255;}
    const pn=hooks[c.pc];
    if(c.pc===nsym.rd_fd&&process.env.FDDBG){(n.fdl=n.fdl||[]).push([n2z(R[4]<<8|R[5]),R[2],R[3],R[1],n.mem[nsym.fd_flip]]);}
    if(c.pc===nsym.a_unimpl)throw new Error('SKIP unimpl');
    if(stubs.has(c.pc))throw new Error('SKIP заглушка');
    if(c.pc===nsym.a_arcade&&name!=='a_arcade')throw new Error('SKIP аркада не возвращается в скрипт (arcade_enter проверяется отдельно)');
    if(pn){
      const st={a:R[7],b:R[0],c:R[1],d:R[2],e:R[3],h:R[4],l:R[5]};
      // журнал по ZX-расширителю модели: читает переменные из ЗЕРКАЛА в раскладке ZX
      log.push(PRIM[pn].zx(mirror(n),st));
      if(c.pc===nsym.bmp16w||c.pc===nsym.wally_half){c.pc=n.mem[c.sp]|n.mem[c.sp+1]<<8;c.sp+=2;continue;}   // нижняя половина Wally (две плоскости): журнал — как один bmp16, рисование не исполняем
      if(pn==='Beep_Effect'||pn==='FX_WhiteNoise'){c.pc=n.mem[c.sp]|n.mem[c.sp+1]<<8;c.sp+=2;continue;}   // звук играет таймер: в стенде тело beep не исполняем (EI), проверка звука — tools/sndcheck.js
    }
    if(c.pc===nsym.rnd_a&&rands){c.pc=n.mem[c.sp]|n.mem[c.sp+1]<<8;c.sp+=2;continue;}
    if(n.mem[c.pc]===0x76){let best='?',bd=1e9;for(const [k,v] of Object.entries(nsym))if(v<=c.pc&&c.pc-v<bd&&v>=0xE000){bd=c.pc-v;best=k+'+'+bd;}throw new Error('HLT pc '+c.pc.toString(16)+' ('+best+') sp '+c.sp.toString(16));}
    if(c.pc===0x38&&!pcs.frozen){pcs.frozen=true;const nm=(p)=>{let best='?',bd=1e9;for(const [k,v] of Object.entries(nsym))if(v<=p&&p-v<bd&&v>=0xE000){bd=p-v;best=k+'+'+bd;}return best;};throw new Error('RST38 из: '+pcs.map(x=>x.toString(16)+'('+nm(x)+')').join(' ')+' sp '+c.sp.toString(16));}
    pcs.push(c.pc);if(pcs.length>12)pcs.shift();
    try{c.instruction();}catch(e){const nm=(p)=>{let best='?',bd=1e9;for(const [k,v] of Object.entries(nsym))if(v<=p&&p-v<bd&&v>=0xE000){bd=p-v;best=k+'+'+bd;}return best;};throw new Error(e.message+' | pc '+c.pc.toString(16)+' последние: '+pcs.map(x=>x.toString(16)+'('+nm(x)+')').join(' '));}
    if(++t>4e7){const nm=(p)=>{let best='?',bd=1e9;for(const [k,v] of Object.entries(nsym))if(v<=p&&p-v<bd&&v>=0xE000){bd=p-v;best=k+'+'+bd;}return best;};let st=[];for(let i=0;i<10;i++){const w=n.mem[c.sp+2*i]|n.mem[c.sp+2*i+1]<<8;st.push(w.toString(16)+'('+nm(w)+')');}throw new Error('нативный '+name+' не вернулся, pc '+c.pc.toString(16)+' ('+nm(c.pc)+') стек: '+st.join(' '));}
  }
  return log;
}
// зеркало нативной памяти в раскладке ZX (только то, что читают zx-расширители журнала)
function mirror(n){
  const z=new Uint8Array(0x10000);
  for(const [zs,len,vs] of segs)for(let k=0;k<len;k++)z[zs+k]=n.mem[vs+k];
  {const v=n2z(n.mem[z2n(SYM.TileStartPtr)]|n.mem[z2n(SYM.TileStartPtr)+1]<<8);z[SYM.TileStartPtr]=v&255;z[SYM.TileStartPtr+1]=v>>8;}
  return z;
}
function compare(n,zmodel){
  const bad=[];
  for(let a=LO;a<HI;a++){
    if(!inData(a))continue;
    if(a===0xAB26||a===0xAB32||a===0xE1D8||a===0xE1E0||a===0xE1D9||a===0xE1E1)continue;
    if(n.mem[z2n(a)]!==zmodel[a]){
      // слова-указатели на данные: native = zx - SHIFT
      bad.push([a,zmodel[a],n.mem[z2n(a)]]);if(bad.length>8)break;
    }
  }
  for(let i=0;i<0x300&&bad.length<9;i++)if(n.mem[ATTR+i]!==zmodel[ATTRZ+i])bad.push([ATTRZ+i,zmodel[ATTRZ+i],n.mem[ATTR+i]]);
  return bad;
}
// исключить слова-указатели (там у модели ZX-адреса): маска по reloc
const relset=new Set();for(const r of rel.reloc){relset.add(n2z(r.addr));relset.add(n2z(r.addr)+1);}
for(const c of rel.codeptrs){relset.add(n2z(c.addr));relset.add(n2z(c.addr)+1);}
const origCompare=compare;
function cmp(n,zm){
  const bad=[];
  const skip=new Set([0xAB26,0xAB32,0xE1D8,0xE1D9,0xE1E0,0xE1E1,SYM.TileStartPtr,SYM.TileStartPtr+1]);
  { const mv=(z2n(zm[SYM.TileStartPtr]|zm[SYM.TileStartPtr+1]<<8)||0),nv=n.mem[z2n(SYM.TileStartPtr)]|n.mem[z2n(SYM.TileStartPtr)+1]<<8;
    if(mv!==nv)bad.push([SYM.TileStartPtr,mv,nv]);
    for(const nm of PTRVARS){const a=SYM[nm];skip.add(a);skip.add(a+1);const v=zm[a]|zm[a+1]<<8;const mv=(v>=LO&&v<HI)?(z2n(v)||0):v;const nv=n.mem[z2n(a)]|n.mem[z2n(a)+1]<<8;if(mv!==nv)bad.push([a,mv,nv]);}
    const mf=(zm[0xE1E0]|zm[0xE1E1]<<8)===SYM.Tile_DrawFlip?1:0;if(mf!==n.mem[nsym.fd_flip])bad.push([0xE1E0,mf,n.mem[nsym.fd_flip]]); }
  for(let a=LO;a<HI;a++){ if(!inData(a))continue; if(relset.has(a))continue; if(skip.has(a))continue;
    if(n.mem[z2n(a)]!==zm[a]){bad.push([a,zm[a],n.mem[z2n(a)]]);if(bad.length>8)break;} }
  for(let i=0;i<0x300&&bad.length<9;i++)if(n.mem[ATTR+i]!==zm[ATTRZ+i])bad.push([ATTRZ+i,zm[ATTRZ+i],n.mem[ATTR+i]]);
  return bad;
}

// ZX как оракул: plugin.models[имя] = {zx:'МеткаZX'} — подпрограмма ZX выполняется на настоящем эмуляторе (память образца, регистры), журнал примитивов и случайные берутся оттуда
const RANDSITES=[0xADA5,0xB6C6,0xE86A,0xF433];
function zxOracle(def,zmem,zregs,z,SYMx){
  const snap=Uint8Array.from(z.mem);z.mem.set(zmem);
  const zlog=[],zrands=[];const hooks=new Map();
  for(const [pn,pd] of Object.entries(PRIM)){const a=SYMx[pn];if(a!==undefined)hooks.set(a,()=>{if(pd.reentry&&pd.reentry.includes(prevPc))return;zlog.push(pd.zx(z.mem,z.cpu.getState()));});}
  for(const a of RANDSITES)hooks.set(a,()=>zrands.push(z.cpu.getState().a));
  const cpu=z.cpu,st0=cpu.getState();const trap=0xFFF0;const sp=(st0.sp-2)&0xffff;z.mem[sp]=trap&255;z.mem[sp+1]=trap>>8;
  const s2=Object.assign({},st0,def.regs?def.regs(zregs):zregs);s2.sp=sp;s2.pc=SYMx[def.zx];cpu.setState(s2);
  let guard=0,prevPc=0;while(z.pc!==trap){const h=hooks.get(z.pc);if(h)h();prevPc=z.pc;z.step();if(++guard>4e7)throw new Error('ZX-оракул: нет возврата');}
  const M=Uint8Array.from(z.mem);
  const s3=cpu.getState();Object.assign(s3,{pc:st0.pc,sp:st0.sp,a:st0.a,b:st0.b,c:st0.c,d:st0.d,e:st0.e,h:st0.h,l:st0.l});cpu.setState(s3);z.mem.set(snap);
  return {M,log:zlog,rands:zrands};
}
const ticks=+process.argv[2]||200,seed=+process.argv[3]||1;
const names=(process.argv[4]||'Wally_Erase,Wally_Draw').split(',');
let s=seed>>>0||1;const rnd=()=>{s^=s<<13;s>>>=0;s^=s>>17;s^=s<<5;s>>>=0;return s/4294967296;};
const g=new Game();const z=g.zx;
const stat={};for(const nme of names)stat[nme]={ok:0,bad:0};
let shown=0;
for(let t=0;t<ticks;t++){
  if(z.mem[SYM.WallyLives]<2)z.mem[SYM.WallyLives]=3;
  g.tick(rnd()<0.8?[['O','P','M'][Math.floor(rnd()*3)]]:[]);
  for(const name of names){
    const zmem=Uint8Array.from(z.mem);
    // разнообразие: случайные позиция/кадр/флаги
    if(rnd()<0.7){zmem[SYM.Wally_X]=7+Math.floor(rnd()*0xE0);zmem[SYM.Wally_Y]=0x30+Math.floor(rnd()*0x69);zmem[SYM.Wally_Frame]=Math.floor(rnd()*0x30);zmem[SYM.Wally_HeadTurned]=rnd()<0.3?1:0;zmem[SYM.IsArcadeMode+1]=rnd()<0.3?1:0;
      for(let i=0;i<15;i++)zmem[SYM.Wally_BgColour+i]=Math.floor(rnd()*8)|0x40;}
    if(rnd()<0.7){
      zmem[SYM.Wally_Dir]=[0,1,0xFF][Math.floor(rnd()*3)];zmem[SYM.Wally_JumpDir]=rnd()<0.4?[1,0xFF][Math.floor(rnd()*2)]:0;zmem[SYM.Wally_JumpCount]=Math.floor(rnd()*12);
      zmem[SYM.Wally_Falling]=rnd()<0.2?1:0;zmem[SYM.IsArcadeMode]=rnd()<0.15?1:0;zmem[SYM.Inv_BulletX]=rnd()<0.5?0xFF:Math.floor(rnd()*200);
      zmem[SYM.Wally_ATTR]=[0x42,0x45,0x46,0x47,0x01][Math.floor(rnd()*5)];zmem[SYM.Wally_CharAligned]=rnd()<0.5?0:Math.floor(rnd()*8);
      zmem[SYM.MilkLevel]=Math.floor(rnd()*0x20);zmem[SYM.IgnoreEnergy]=rnd()<0.2?1:0;zmem[SYM.DeathFlag]=rnd()<0.15?1:0;
      const ec=rnd()<0.3?1:2+Math.floor(rnd()*300);zmem[SYM.EnergyCounter]=ec&255;zmem[SYM.EnergyCounter+1]=ec>>8;
      zmem[SYM.Wally_HeadCountdown]=rnd()<0.4?0:Math.floor(rnd()*30);zmem[SYM.Wally_StepFlag]=rnd()<0.5?0:1;
      for(let i=0;i<4;i++)zmem[SYM.Steps_Count+i]=rnd()<0.5?0x99:((Math.floor(rnd()*10)<<4)|Math.floor(rnd()*10));
    }
    const rands=[];for(let i=0;i<4;i++)rands.push(Math.floor(rnd()*256));
    // регистры на входе (B — урон, HL — позиция чужого спрайта, A — кадр для TurnHead)
    const regs0={a:zmem[SYM.Wally_Frame],b:1+Math.floor(rnd()*9),h:0x30+Math.floor(rnd()*0x90),l:Math.max(7,Math.floor(rnd()*0xE0))};
    const regs=regs0;
    if(rnd()<0.5){regs.l=zmem[SYM.Wally_X]+Math.floor(rnd()*20)-10&255;regs.h=zmem[SYM.Wally_Y]+Math.floor(rnd()*30)-15&255;}
    let zregs=null,nregs=null;
    {const W=(a)=>zmem[a]|zmem[a+1]<<8;
     if(name==='FurnitureDraw'){const idx=Math.floor(rnd()*66);const zp=W(SYM.FurniturePtrTable+2*idx);const d=Math.floor(rnd()*0x10),e=Math.floor(rnd()*0x1A),c=0x40+Math.floor(rnd()*8);
       const f=rnd()<0.3?SYM.Tile_DrawFlip:SYM.TileDraw;zmem[0xE1E0]=f&255;zmem[0xE1E1]=f>>8;zmem[0xE1D8]=f&255;zmem[0xE1D9]=f>>8;
       const tp=[SYM.Bmp_Tiles,SYM.Tile_Ceiling][Math.floor(rnd()*2)];zmem[SYM.TileStartPtr]=tp&255;zmem[SYM.TileStartPtr+1]=tp>>8;
       zregs={h:zp>>8,l:zp&255,d,e,c};nregs={h:(z2n(zp))>>8,l:(z2n(zp))&255,d,e,c};}
     else if(['RoomDraw','Room_Enter','Inv_Redraw','Game_PercentUpdate','Wally_TestObjSlot','Room_TestEvents'].includes(name)){
       {const cc=0x40+Math.floor(rnd()*8);zregs={c:cc};nregs={c:cc};}
       zmem[SYM.Wally_RoomNo]=Math.floor(rnd()*30);zmem[SYM.Pocket1]=Math.floor(rnd()*0x20);zmem[SYM.Pocket2]=Math.floor(rnd()*0x20);
       for(const f of ['Flag_FuelCan','Flag_LaserGun','Flag_WaterBucket','Flag_HelpSwitch','Flag_MagLock','Flag_BaddyInit','ObjEventPause'])zmem[SYM[f]]=rnd()<0.5?1:0;
       zmem[SYM.Lift_Count]=Math.floor(rnd()*5);zmem[SYM.LiftFloorNo]=Math.floor(rnd()*5);zmem[SYM.BoxingTrap_Room]=0xFF;
       const f=rnd()<0.3?SYM.Tile_DrawFlip:SYM.TileDraw;zmem[0xE1E0]=f&255;zmem[0xE1E1]=f>>8;zmem[0xE1D8]=f&255;zmem[0xE1D9]=f>>8;
       if(name==='Room_TestEvents'&&rnd()<0.8){ // встать на позицию первого теста 00/01 в скрипте комнаты
         let p=W(SYM.Table_RoomDataPtr+2*zmem[SYM.Wally_RoomNo]);const pos=[];
         for(let k=0;k<60;k++){const b=zmem[p++];if(b===0xFF)break;if(b===0xFD){while(zmem[p]!==0xFE){const a=zmem[p++];p+=[3,0,0,0,0,0,0,0,0,0,1,0,1,0,0,0][a]||0;if(a===2)p+=2;if(a<2&&0)p++;}p++;continue;}
           if(b===0||b===1){pos.push([zmem[p],zmem[p+1]]);p+=2;}else if(b===2||b===5)p+=1;}
         if(pos.length){const q=pos[Math.floor(rnd()*pos.length)];zmem[SYM.Wally_X]=q[0]+Math.floor(rnd()*5)-2&255;zmem[SYM.Wally_Y]=q[1]+Math.floor(rnd()*5)-2&255;}
       }
     }}
    for(const pl of plugins)if(pl.models&&pl.models[name]&&pl.setup){const W=(a)=>zmem[a]|zmem[a+1]<<8;const r=pl.setup(name,zmem,rnd,{SYM,SHIFT,z2n,n2z,W,nsym,ATTR});if(r){zregs=r.zregs||zregs;nregs=r.nregs||nregs;}}
    const n=mkNative(zmem);
    if(process.env.NOEV){for(let i=0;i<31;i++){n.mem[nsym.rev_tab+2*i]=nsym.rev_empty&255;n.mem[nsym.rev_tab+2*i+1]=nsym.rev_empty>>8;} for(let i=0;i<31;i++)require('../src/model/flow.js').ROOM_SEQ[i]=[];}
    // ввод: ZX-матрица (O, P, M) -> in_state
    const kb=Array.from(z.kb);const kbj={O:!(kb[5]&2),P:!(kb[5]&1),M:!(kb[7]&4)};
    n.mem[nsym.in_state]=(kbj.P?1:0)|(kbj.O?2:0)|(kbj.M?4:0);
    const M=Uint8Array.from(zmem);const zr=zregs||regs;const ctx=new Ctx(M,{a:zr.a||0,b:zr.b||0,c:zr.c||0,d:zr.d||0,e:zr.e||0,h:zr.h||0,l:zr.l||0,ix:0,iy:0},{kb,rands:rands.slice()});
    let ml,nl;
    let rands2=rands;
    try{const mdef=models[name];if(typeof mdef==='function')mdef(ctx);else{const o=zxOracle(mdef,zmem,zregs||regs,z,SYM);M.set(o.M);ctx.log=o.log;if(o.rands.length)rands2=o.rands;}ml=ctx.log;nl=callNative(n,name,nregs||regs,rands2.slice());}catch(e){if(/не реализован|SKIP|rt_unimpl/.test(e.message)){stat[name].skip=(stat[name].skip||0)+1;continue;}stat[name].bad++;if(shown++<6)console.log('ОШИБКА',name,'тик',t,e.message);continue;}
    if(process.env.FDDBG&&n.fdl&&name==='RoomDraw'){ // ожидаемые вызовы мебели по скрипту ZX
      const W=(a)=>zmem[a]|zmem[a+1]<<8;let p=W(SYM.RoomData+2*zmem[SYM.Wally_RoomNo]);const ex=[];if(zmem[p]===0xF5)p++;
      for(;;){const b=zmem[p];if(b===0xFF)break;if(b===0xF4||b===0xF3){p++;continue;}if(b===0xDE){const a=W(p+1);p+=3;if(!zmem[a])break;continue;}
        ex.push([W(SYM.FurniturePtrTable+2*zmem[p+2]),zmem[p+1],zmem[p]]);p+=3;}
      let k=0;while(k<ex.length&&k<n.fdl.length&&ex[k][0]===n.fdl[k][0]&&ex[k][1]===n.fdl[k][1]&&ex[k][2]===n.fdl[k][2])k++;
      if(k<Math.max(ex.length,n.fdl.length))console.log('  FD: ожидалось',ex.length,'вызовов, нативных',n.fdl.length,'; первое отличие #'+k,JSON.stringify(ex[k]),JSON.stringify(n.fdl[k]));}
    const bad=cmp(n,M);const jl0=JSON.stringify(ml);const jl=jl0;if(process.env.GREP&&jl.includes(process.env.GREP))stat[name].hit=(stat[name].hit||0)+1;const _jl=jl,jn=JSON.stringify(nl);
    if(bad.length||jl!==jn){stat[name].bad++;if(shown++<6){console.log('РАСХ',name,'тик',t,'комната',zmem[SYM.Wally_RoomNo],bad.map(b=>b[0].toString(16)+':модель='+b[1]+' нативный='+b[2]).join(' '));if(jl!==jn){let k=0;while(k<ml.length&&k<nl.length&&JSON.stringify(ml[k])===JSON.stringify(nl[k]))k++;console.log('  журнал: первое отличие #'+k+' из',ml.length,nl.length,'модель',JSON.stringify(ml[k]),'нативный',JSON.stringify(nl[k]));if(process.env.WIN){console.log('  модель вокруг:',JSON.stringify(ml.slice(Math.max(0,k-4),k+6)));console.log('  нативный вокруг:',JSON.stringify(nl.slice(Math.max(0,k-4),k+6)));}}}}
    else stat[name].ok++;
  }
}
for(const [k,v] of Object.entries(stat))console.log(k.padEnd(24),'ок',v.ok,'расхождений',v.bad,v.skip?'пропущено '+v.skip:'',v.hit?'с «'+process.env.GREP+'»: '+v.hit:'');
