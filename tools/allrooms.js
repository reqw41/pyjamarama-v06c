// Снимки всех комнат (без окна): стартуем игру, затем для каждой комнаты n вызываем подпрограммы начала игры с Wally_RoomNo=n.
//   node tools/allrooms.js [выходная папка=build/rooms] [первая=0] [последняя=80]
'use strict';
const fs=require('fs'),path=require('path'),{execSync}=require('child_process');
const E=require('./vec_emu'),{z2n}=require('./zxmap');
const ROOT=path.join(__dirname,'..'),OUT=process.argv[2]||path.join(ROOT,'build/rooms');fs.mkdirSync(OUT,{recursive:true});
const A=+process.argv[3]||0,B=process.argv[4]!==undefined?+process.argv[4]:80;
const sy={};for(const l of fs.readFileSync(path.join(ROOT,'build/vec/pyjama.sym'),'latin1').split('\n')){const x=/^(\S+):\s+EQU\s+0x([0-9A-Fa-f]+)/.exec(l);if(x)sy[x[1]]=parseInt(x[2],16);}
const m=E.mk(path.join(ROOT,'build/vec/pyjama.r0m'));
const press=(k,n)=>{const e={vk:[0,4]}[k];m.keyboard.matrix[e[0]]|=e[1];for(let i=0;i<n;i++)m.frame();m.keyboard.matrix[e[0]]&=~e[1];for(let i=0;i<20;i++)m.frame();};
for(let i=0;i<150;i++)m.frame();press('vk',6);for(let i=0;i<30;i++)m.frame();press('vk',6);for(let i=0;i<120;i++)m.frame();
const cpu=m.cpu;
function call(label,regs){const sp0=cpu.sp,pc0=cpu.pc,SENT=0xFFFE;
  const s=cpu.sp-2;m.wr(s,SENT&255);m.wr(s+1,SENT>>8);cpu.sp=s;cpu.pc=sy[label];if(regs){if(regs.hl!==undefined){cpu.regs[4]=regs.hl>>8;cpu.regs[5]=regs.hl&255;}if(regs.de!==undefined){cpu.regs[2]=regs.de>>8;cpu.regs[3]=regs.de&255;}}
  const ei=cpu.iff;cpu.iff=false;let t=0;while(cpu.pc!==SENT){cpu.instruction();if(++t>3e7)throw new Error('не вернулся '+label);}cpu.sp=sp0;cpu.pc=pc0;cpu.iff=ei;}
const rd=a=>m.rd(a);
const PAL=Array.from({length:16},(_,i)=>m.rd(sy.pal+i));
const rgb=c=>[(c&7)*255/7|0,((c>>3)&7)*255/7|0,((c>>6)&3)*255/3|0];
function shot(f){const W=256,H=256,img=Buffer.alloc(W*H*3);for(let y=0;y<H;y++)for(let x=0;x<W;x++){const a=((x>>3)<<8)|(255-y),b=7-(x&7);const bit=p=>(m.rd(p+a)>>b)&1;img.set(rgb(PAL[bit(0x8000)<<3|bit(0xA000)<<2|bit(0xC000)<<1|bit(0xE000)]),(y*W+x)*3);}
  fs.writeFileSync(f+'.ppm',Buffer.concat([Buffer.from(`P6 ${W} ${H} 255\n`),img]));execSync(`sips -s format png "${f}.ppm" --out "${f}" >/dev/null && rm "${f}.ppm"`);}
for(let n=A;n<=B;n++){
  const p=m.rd(z2n(0x0758)+2*n)|m.rd(z2n(0x0758)+2*n+1)<<8;
  if(!p||p<0x0800||p>0xFF00){console.log('комната',n,'пропуск (указатель %s)',p.toString(16));continue;}
  m.wr(sy.Wally_RoomNo,n);
  try{call('clear_area');call('fill_attr');call('Game_InitStats');m.wr(sy.Wally_RoomNo,n);call('RoomDraw');
    call('FurnitureDraw',{hl:sy.ScoreBoard_Item,de:1});call('Inv_Redraw');call('LivesReset');call('milk_full');}catch(e){console.log(n,e.message);continue;}
  shot(path.join(OUT,'r'+String(n).padStart(2,'0')+'.png'));
}
console.log('готово',OUT);
