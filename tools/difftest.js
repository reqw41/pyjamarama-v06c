// Пошаговая сверка подпрограмм модели с ZX. Реестр: src/model/*.js экспортируют R = { Имя: {fn(M,r), out:[регистры], mem:[[lo,hi]]?} }
// На входе в подпрограмму (PC == SYM[Имя]) снимается память и регистры; модель гоняется на копии; после возврата (SP == вход+2)
// сравниваются память 0x4000..0xFFFF (кроме стека под входным SP) и регистры из out.
'use strict';
const path=require('path');
const Game=require('./zxgame.js');const {SYM}=require('./sym.js');

function regsOf(s){return {a:s.a,b:s.b,c:s.c,d:s.d,e:s.e,h:s.h,l:s.l,ix:s.ix,iy:s.iy,
  cf:s.flags.C,zf:s.flags.Z,sf:s.flags.S,pf:s.flags.P,
  bc(){return this.b<<8|this.c;},de(){return this.d<<8|this.e;},hl(){return this.h<<8|this.l;}};}

class Diff{
  constructor(game,registry,opts){
    this.g=game;this.reg=registry;this.pending=[];this.stats={};this.fails=[];this.opts=opts||{};
    this.zxLog=[];
    const {PRIM}=require('../src/model/core.js');
    for(const [name,def] of Object.entries(registry)){
      const addr=def.addr!==undefined?def.addr:SYM[name];
      if(addr===undefined)throw new Error('нет адреса '+name);
      this.stats[name]={calls:0,ok:0,bad:0};
      this.addHook(addr,()=>this.enter(name,def));
      for(const ra of def.rand||[])this.addHook(ra,()=>{const st=game.zx.cpu.getState();for(const p of this.pending)p.rands.push(st.a);});
    }
    for(const [pn,pd] of Object.entries(PRIM)){
      this.addHook(SYM[pn],()=>{ if(!this.pending.length)return; if(pd.reentry&&pd.reentry.includes(this.prevPc))return; this.zxLog.push(pd.zx(game.zx.mem,game.zx.cpu.getState())); });
    }
    const z=game.zx;const origStep=z.step.bind(z);
    z.step=()=>{ this.prevPc=z.pc; const c=origStep(); if(this.pending.length){ this.checkRet(); if(z.pc===SYM.GameLoop&&this.pending.length)this.loopEnd(); } return c; };
  }
  addHook(addr,fn){ const prev=this.g.hooks.get(addr); this.g.hooks.set(addr,(g)=>{ if(prev)prev(g); fn(g); }); }
  checkRet(){
    const sp=this.g.zx.cpu.get_sp();
    while(this.pending.length){
      const p=this.pending[this.pending.length-1];
      if(sp===p.spRet&&this.g.zx.pc===p.ret){ this.pending.pop(); this.finish(p); } else break;
    }
  }
  loopEnd(){
    // переход на GameLoop со сбросом стека: завершаем ожидающие подпрограммы с endsAtLoop, остальные отбрасываем
    const list=this.pending.splice(0);
    for(let i=list.length-1;i>=0;i--){ if(list[i].def.endsAtLoop)this.finish(list[i],true); }
  }
  enter(name,def){
    const z=this.g.zx;if(this.opts.only&&!this.opts.only.includes(name))return;
    if(this.opts.max&&this.stats[name].calls>=this.opts.max)return;
    const st=z.cpu.getState();const sp=st.sp;
    this.stats[name].calls++;
    this.pending.push({name,def,spRet:(sp+2)&0xffff,ret:z.mem[sp]|z.mem[(sp+1)&0xffff]<<8,sp,M:new Uint8Array(z.mem),
      regs:regsOf(st),in:regsOf(st),tick:this.g.ticks,kb:Array.from(z.kb),rands:[],logStart:this.zxLog.length});
  }
  finish(p,viaLoop){
    const z=this.g.zx;const bad=[];
    let mlog=[];
    try{ mlog=p.def.fn(p.M,p.regs,{kb:p.kb,rands:p.rands.slice()})||[]; }catch(e){ this.stats[p.name].bad++; this.fails.push({name:p.name,tick:p.tick,err:String(e.stack||e)}); return; }
    const sp=p.sp;
    for(let a=0x5800;a<0x10000;a++){
      if(a>=sp-300&&a<=sp+1)continue;
      if(a===0xAB26||a===0xAB32||(this.opts.ignore&&this.opts.ignore(a)))continue;
      if(z.mem[a]!==p.M[a]){bad.push(['mem',a,z.mem[a],p.M[a]]);if(bad.length>8)break;}
    }
    const zl=JSON.stringify(this.zxLog.slice(p.logStart)),ml=JSON.stringify(mlog);
    if(zl!==ml){const za=this.zxLog.slice(p.logStart);let k=0;while(k<za.length&&k<mlog.length&&JSON.stringify(za[k])===JSON.stringify(mlog[k]))k++;
      bad.push(['log','#'+k+'/'+za.length+' '+JSON.stringify(za.slice(k,k+3)),'#'+k+'/'+mlog.length+' '+JSON.stringify(mlog.slice(k,k+3))]);}
    if(p.def.out&&!viaLoop){const s=regsOf(z.cpu.getState());for(const k of p.def.out){
      const zv=k==='hl'?s.hl():k==='de'?s.de():k==='bc'?s.bc():s[k];
      const mv=k==='hl'?p.regs.hl():k==='de'?p.regs.de():k==='bc'?p.regs.bc():p.regs[k];
      if(zv!==mv)bad.push([k,zv,mv]);
    }}
    if(bad.length){ this.stats[p.name].bad++; if(this.fails.length<60)this.fails.push({name:p.name,tick:p.tick,in:p.in,bad}); }
    else this.stats[p.name].ok++;
  }
  report(){
    const rows=Object.entries(this.stats).filter(([,s])=>s.calls);
    for(const [n,s] of rows)console.log(n.padEnd(34),`вызовов ${s.calls} ок ${s.ok} расхождений ${s.bad}`);
    for(const f of this.fails.slice(0,this.opts.show||8)){
      const fmt=b=>b.map(x=>x[0]==='mem'?`[${x[1].toString(16)}] zx=${x[2].toString(16)} model=${x[3].toString(16)}`:x[0]==='log'?`ЖУРНАЛ zx=${x[1]} model=${x[2]}`:`${x[0]} zx=${x[1]} model=${x[2]}`).join('; ');
      console.log('РАСХ',f.name,'тик',f.tick,f.err||fmt(f.bad));
      if(f.in)console.log('   вход',JSON.stringify({a:f.in.a,b:f.in.b,c:f.in.c,d:f.in.d,e:f.in.e,h:f.in.h,l:f.in.l}));
    }
  }
}
module.exports={Diff,regsOf};
