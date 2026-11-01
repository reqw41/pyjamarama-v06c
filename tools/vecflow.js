#!/usr/bin/env node
// Сценарий на Векторе без окна: кадры, клавиши, записи в память по меткам, вызов подпрограммы, снимки.
//   node tools/vecflow.js "30:key space+ 40:key space- 100:poke WallyLives 1 100:poke DeathFlag 1 200:shot a.png 300:call a_win 400:shot b.png" [всего кадров]
// действия: key <имя>(+|-), poke <метка|hex> <значение>, call <метка> (вызов из цикла игры; не возвращается — для a_win и т.п.), shot <файл.png>, print <метка> (байт)
'use strict';
const fs=require('fs'),path=require('path'),{execSync}=require('child_process');
const E=require('./vec_emu');
const ROM=path.join(__dirname,'..','build/vec/pyjama.r0m');
const sy={};for(const l of fs.readFileSync(ROM.replace(/\.r0m$/,'.sym'),'latin1').split('\n')){const m=/^(\S+):\s+EQU\s+0x([0-9A-Fa-f]+)/.exec(l);if(m)sy[m[1]]=parseInt(m[2],16);}
const VK={a:[4,2],b:[4,4],c:[4,8],d:[4,0x10],e:[4,0x20],f:[4,0x40],g:[4,0x80],h:[5,1],i:[5,2],j:[5,4],k:[5,8],l:[5,0x10],m:[5,0x20],n:[5,0x40],o:[5,0x80],p:[6,1],q:[6,2],r:[6,4],s:[6,8],t:[6,0x10],u:[6,0x20],v:[6,0x40],w:[6,0x80],x:[7,1],y:[7,2],z:[7,4],space:[7,0x80],left:[0,0x10],up:[0,0x20],right:[0,0x40],down:[0,0x80],vk:[0,4],f1:[1,8],f2:[1,0x10],f3:[1,0x20],f4:[1,0x40],f5:[1,0x80]};
const m=E.mk(ROM);
const acts={};let last=0;
for(const it of process.argv[2].split(/\s+(?=\d+:)/).filter(Boolean)){const mm=/^(\d+):(\w+)\s*(.*)$/.exec(it.trim());(acts[+mm[1]]=acts[+mm[1]]||[]).push([mm[2],mm[3].trim()]);last=Math.max(last,+mm[1]);}
const N=+process.argv[3]||last+5;
function render(file){
  const pa=m.rd(sy.pal_ptr)|m.rd(sy.pal_ptr+1)<<8;const PAL=Array.from({length:16},(_,i)=>m.rd(pa+i));
  const rgb=c=>[(c&7)*255/7|0,((c>>3)&7)*255/7|0,((c>>6)&3)*255/3|0];const img=Buffer.alloc(256*256*3);
  for(let y=0;y<256;y++)for(let x=0;x<256;x++){const a=((x>>3)<<8)|(255-y),b=7-(x&7);const bit=p=>(m.rd(p+a)>>b)&1;img.set(rgb(PAL[bit(0x8000)<<3|bit(0xA000)<<2|bit(0xC000)<<1|bit(0xE000)]),(y*256+x)*3);}
  fs.writeFileSync(file+'.ppm',Buffer.concat([Buffer.from('P6 256 256 255\n'),img]));execSync(`sips -s format png "${file}.ppm" --out "${file}" >/dev/null && rm "${file}.ppm"`);
}
const val=(s)=>/^0x/i.test(s)?parseInt(s,16):/^\d+$/.test(s)?+s:sy[s];
for(let f=0;f<N;f++){
  for(const [a,arg] of acts[f]||[]){
    if(a==='key'){const [k,sgn]=/^(\w+)([+-])$/.exec(arg).slice(1);const e=VK[k];if(sgn==='+')m.keyboard.matrix[e[0]]|=e[1];else m.keyboard.matrix[e[0]]&=~e[1];}
    else if(a==='poke'){const [t,v]=arg.split(/\s+/);const ad=val(t);m.wr(ad,val(v));}
    else if(a==='call'){const c=m.cpu;c.sp=0x7F80;m.wr(c.sp,sy.GameLoop&255);m.wr(c.sp+1,sy.GameLoop>>8);c.pc=sy[arg];c.iff=true;}
    else if(a==='shot'){render(arg);console.log('кадр',f,'->',arg,'PC',m.cpu.pc.toString(16));}
    else if(a==='print')console.log('кадр',f,arg,'=',m.rd(sy[arg]));
  }
  m.frame();
}
