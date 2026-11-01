// Сверка звука: ZX Beep_Effect (моменты переключений динамика по тактам) против нативной очереди на ВИ53 (записи делителей канала 2 по тактам).
//   node tools/sndcheck.js [seed=1] [случайных наборов=6]
// Сравниваются общая длительность и расписание периодов (по накопленному времени); допуск — по числу периодов и ошибке частоты.
'use strict';
const fs=require('fs'),path=require('path');
const Game=require('./zxgame.js');const {SYM}=require('./sym.js');const E=require('./vec_emu.js');
const ROOT=path.join(__dirname,'..');
const seed=+process.argv[2]||1,NR=+process.argv[3]||6;
let s=seed>>>0||1;const rnd=()=>{s^=s<<13;s>>>=0;s^=s>>17;s^=s<<5;s>>>=0;return s/4294967296;};
const nsym={};for(const l of fs.readFileSync(path.join(ROOT,'build/vec/pyjama.sym'),'latin1').split('\n')){const m=/^(\S+):\s+EQU\s+0x([0-9A-Fa-f]+)/.exec(l);if(m)nsym[m[1]]=parseInt(m[2],16);}
const SETS=[ // реальные вызовы игры: BC,DE,HL
  ['шаг',0x0701,0x0F01,0x0404],['молоко-',0xFF0A,0x0114,0x3CC4],['подбор',0xFF0A,0x0114,0x1401],['комната',0xC828,0x0128,0x02FD],
  ['переключатель',0x320A,0x050A,0x1414],['выстрел',0x1E0F,0x010F,0x08F8],['перчатка',0x0000,0x0101,0xE600],['будильник',0x020F,0x1902,0x6401]];
for(let i=0;i<NR;i++)SETS.push(['случайный '+i,Math.floor(rnd()*0x10000)&0xFFFF,(1+Math.floor(rnd()*3))<<8|1+Math.floor(rnd()*30),Math.floor(rnd()*0x10000)&0xFFFF]);

// ---- ZX: периоды (мкс) ----
const g=new Game(),z=g.zx;
function zxEffect(bc,de,hl){
  const ev=[];z.onOut=(p,v)=>{if((p&1)===0)ev.push([z.total,(v>>4)&1]);};
  g.call(SYM.Beep_Effect,{b:bc>>8,c:bc&255,d:de>>8,e:de&255,h:hl>>8,l:hl&255});z.onOut=null;
  const rise=ev.filter(e=>e[1]===1).map(e=>e[0]);const per=[];
  for(let i=0;i+1<rise.length;i++)per.push((rise[i+1]-rise[i])/3.5);   // мкс
  // последний период — по длительности предыдущего
  if(per.length)per.push(per[per.length-1]);
  return per;
}
// ---- Вектор: расписание делителей (мкс) ----
const IMG=fs.readFileSync(path.join(ROOT,'build/vec/pyjama.r0m'));
function vecEffect(bc,de,hl){
  const m=E.mk(path.join(ROOT,'build/vec/pyjama.r0m'));
  for(let f=0;f<12;f++)m.frame();
  const c=m.cpu,R=c.regs,idx={b:0,c:1,d:2,e:3,h:4,l:5};
  R[0]=bc>>8;R[1]=bc&255;R[2]=de>>8;R[3]=de&255;R[4]=hl>>8;R[5]=hl&255;
  // вызов beep из состояния «в цикле игры»: адрес возврата — текущий PC, на стеке
  const ret=nsym.gm_w1;c.sp=0x7F80;m.wr(c.sp,ret&255);m.wr(c.sp+1,ret>>8);c.pc=nsym.beep;c.iff=true;   // кадр обрывается в вектор ISR — входим в beep из «цикла игры»
  let cyc=0,ev=[],last=0;
  const wr0=m.io.output.bind(m.io);m.io.output=(p,v)=>{ev.push([cyc,p&0xFF,v&0xFF]);wr0(p,v);};
  m.onInstr=()=>{cyc+=c.vcycles||0;};
  const maxF=400;let silent=-1;
  for(let f=0;f<maxF;f++){m.frame();if(f>2&&m.rd(nsym.snd_ph)===0&&m.rd(nsym.snd_qc)===0){silent=f;break;}}
  // ch2: слова 0x09 по два байта; расписание
  const segs=[];let lo=null;
  for(const [t,p,v] of ev){if(p===0x09){if(lo===null)lo=v;else{segs.push([t/3,(v<<8|lo)/1.5]);lo=null;}}else if(p===0x08&&(v>>6)===2)lo=null;}   // t мкс (3 МГц), период мкс
  const stopT=(()=>{for(let i=ev.length-1;i>=0;i--)if(ev[i][1]===0x08&&ev[i][2]===0xB0)return ev[i][0]/3;return segs.length?segs[segs.length-1][0]:0;})();
  return {segs,stopT};
}
function flatten(segs,stopT){ // периоды по расписанию делителей
  const out=[];for(let i=0;i<segs.length;i++){const [t,p]=segs[i];const t1=i+1<segs.length?segs[i+1][0]:stopT;const n=Math.max(1,Math.round((t1-t)/p));for(let k=0;k<n;k++)out.push(p);}
  return out;
}
let bad=0;
for(const [name,bc,de,hl] of SETS){
  const zper=zxEffect(bc,de,hl);
  const {segs,stopT}=vecEffect(bc,de,hl);
  const nper=flatten(segs,stopT);
  const zt=zper.reduce((a,b)=>a+b,0),nt=segs.length?stopT-segs[0][0]:0;
  // каждый записанный делитель должен быть периодом ZX, начавшимся незадолго до записи (задержка опроса); доля совпадений
  const zst=[];{let acc=0;for(const p of zper){zst.push(acc);acc+=p;}}
  let match=0;const t0=segs.length?segs[0][0]:0;
  for(const [t,p] of segs){const tr=t-t0;let hit=false;for(let i=0;i<zper.length;i++){if(zst[i]>tr+450)break;if(zst[i]>=tr-600&&Math.abs(p-zper[i])/zper[i]<0.05){hit=true;break;}}if(hit)match++;else if(process.env.SHOW===name&&match<999)console.log('  нет пары: t',tr.toFixed(0),'период',p.toFixed(0));}
  const frac=segs.length?match/segs.length:0;
  const dur=Math.abs(nt-zt);
  const ok=(dur<Math.max(0.06*zt,3000))&&frac>=0.8;
  if(process.env.NEAR&&process.env.SHOW===name){const T=+process.env.NEAR;console.log('ZX около',T,zper.map((p,i)=>[zst[i],p]).filter(x=>Math.abs(x[0]-T)<9000).map(x=>x[0].toFixed(0)+':'+x[1].toFixed(0)).join(' '));console.log('нат около',T,segs.map(x=>[x[0]-t0,x[1]]).filter(x=>Math.abs(x[0]-T)<9000).map(x=>x[0].toFixed(0)+':'+x[1].toFixed(0)).join(' '));}
  if(process.env.SHOW===name){console.log('ZX периоды мкс',zper.slice(0,16).map(x=>x.toFixed(0)).join(' '));console.log('нат сегменты (t,мкс)',segs.slice(0,16).map(x=>(x[0]-t0).toFixed(0)+':'+x[1].toFixed(0)).join(' '));}
  const intended=name==='шаг';   // осознанная замена: ультразвуковой щелчок ZX -> слышимый тик (см. snd.asm, beep)
  if(!ok&&!intended)bad++;
  console.log((ok?'ОК  ':intended?'ЗАМЕНА':'РАСХ')+' '+name.padEnd(14),'периодов ZX',zper.length,'| записей делителя',segs.length,'| длит ZX',(zt/1000).toFixed(2),'мс нат',(nt/1000).toFixed(2),'мс | делители совпали',(frac*100).toFixed(0),'%');
}
console.log(bad?`расхождений ${bad}`:'звук: все наборы совпали');
