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
const NARG={0:2,1:2,2:1,3:0,4:0,5:1,6:0,7:0,8:0};
const blocks=[];
for(let r=0;r<30;r++){
  let a=m.rd(sy.Table_RoomDataPtr+2*r)|m.rd(sy.Table_RoomDataPtr+2*r+1)<<8;
  for(;;){
    const tests=[];let b=m.rd(a);
    if(b===0xFF)break;
    while(b!==0xFD&&b!==0xFF){a++;const n=NARG[b];const args=[];for(let k=0;k<n;k++)args.push(m.rd(a++));tests.push([b,...args]);b=m.rd(a);}
    a++;const acts=[];let c=m.rd(a);const st=a;
    while(m.rd(a)!==0xFE){a++;} acts.push(m.rd(st),m.rd(st+1),m.rd(st+2),m.rd(st+3));a++;
    blocks.push({room:r,tests,acts});
  }
}
for(const bl of blocks){
  const pos=bl.tests.find(t=>t[0]===0),car=bl.tests.filter(t=>t[0]===2).map(t=>t[1]);
  if(!pos||bl.acts[0]!==2)continue;
  const R=bl.acts[1];
  function run(have){
    m.wr(sy.Wally_RoomNo,bl.room);call('Room_Enter');
    m.wr(sy.Pocket1,have[0]===undefined?0xFF:have[0]);m.wr(sy.Pocket2,have[1]===undefined?0xFF:have[1]);
    m.wr(sy.Wally_X,pos[1]);m.wr(sy.Wally_X+1,pos[2]);
    try{call('Room_TestEvents');}catch(e){return 'зависло';}
    return m.rd(sy.Wally_RoomNo);
  }
  const withObj=run(car),without=car.length?run([]):'-';
  console.log('комната',bl.room,'позиция',pos[1].toString(16),pos[2].toString(16),'-> комната',R,'| нужны предметы',JSON.stringify(car),'| с предметами:',withObj,'| без:',without,'| все тесты',JSON.stringify(bl.tests));
}
