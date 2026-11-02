// Снимки HUD с парами предметов в карманах. Снимки всех комнат (без окна): стартуем игру, затем для каждой комнаты n вызываем подпрограммы начала игры с Wally_RoomNo=n.
//   node tools/allrooms.js [выходная папка=build/rooms] [первая=0] [последняя=80]
'use strict';
const fs=require('fs'),path=require('path'),{execSync}=require('child_process');
const E=require('./vec_emu'),{z2n}=require('./zxmap');
const ROOT=path.join(__dirname,'..'),OUT=process.argv[2]||path.join(ROOT,'build/rooms');fs.mkdirSync(OUT,{recursive:true});
const A=+process.argv[3]||0,B=process.argv[4]!==undefined?+process.argv[4]:80;
const sy={};for(const l of fs.readFileSync(path.join(ROOT,'build/vec/pyjama.sym'),'latin1').split('\n')){const x=/^(\S+):\s+EQU\s+0x([0-9A-Fa-f]+)/.exec(l);if(x)sy[x[1]]=parseInt(x[2],16);}
const m=E.mk(path.join(ROOT,'build/vec/pyjama.r0m'));
const press=(k,n)=>{const e={vk:[0,4],zero:[2,1]}[k];m.keyboard.matrix[e[0]]|=e[1];for(let i=0;i<n;i++)m.frame();m.keyboard.matrix[e[0]]&=~e[1];for(let i=0;i<20;i++)m.frame();};
for(let i=0;i<250;i++)m.frame();press("vk",6);for(let i=0;i<60;i++)m.frame();press("zero",8);for(let i=0;i<200;i++)m.frame();
const cpu=m.cpu;
function call(label){const sp0=cpu.sp,pc0=cpu.pc,SENT=0xFF00;
  const sv=[m.rd(SENT),m.rd(SENT+1),m.rd(SENT+2)];m.wr(SENT,0xC3);m.wr(SENT+1,SENT&255);m.wr(SENT+2,SENT>>8);   // jmp $ — «возврат» зависает, кадры доходят до конца
  const s=cpu.sp-2;m.wr(s,SENT&255);m.wr(s+1,SENT>>8);cpu.sp=s;cpu.pc=sy[label];cpu.iff=true;
  let done=false;for(let f=0;f<400&&!done;f++){m.frame();if(cpu.pc===SENT)done=true;}
  if(!done)throw new Error('не вернулся '+label);
  for(let k=0;k<3;k++)m.wr(SENT+k,sv[k]);cpu.sp=sp0;cpu.pc=pc0;}
const rd=a=>m.rd(a);
const PAL=Array.from({length:16},(_,i)=>m.rd(sy.pal+i));
const rgb=c=>[(c&7)*255/7|0,((c>>3)&7)*255/7|0,((c>>6)&3)*255/3|0];
function shot(f){const W=256,H=256,img=Buffer.alloc(W*H*3);for(let y=0;y<H;y++)for(let x=0;x<W;x++){const a=((x>>3)<<8)|(255-y),b=7-(x&7);const bit=p=>(m.rd(p+a)>>b)&1;img.set(rgb(PAL[bit(0x8000)<<3|bit(0xA000)<<2|bit(0xC000)<<1|bit(0xE000)]),(y*W+x)*3);}
  fs.writeFileSync(f+'.ppm',Buffer.concat([Buffer.from(`P6 ${W} ${H} 255\n`),img]));execSync(`sips -s format png "${f}.ppm" --out "${f}" >/dev/null && rm "${f}.ppm"`);}
const OUTD=OUT;
for(let k=0;k<28;k+=2){
  m.wr(sy.Pocket1,k);m.wr(sy.Pocket2,k+1);
  for(const f of ['Flag_LaserGun','Flag_FuelCan','Flag_WaterBucket'])if(sy[f]!==undefined)m.wr(sy[f],(k>>1)&1);
  try{call('Inv_Redraw');}catch(e){console.log(k,e.message);continue;}
  shot(path.join(OUTD,'hud'+String(k).padStart(2,'0')+'.png'));
}
