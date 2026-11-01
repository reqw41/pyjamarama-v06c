// Загрузка редакции Pyjamarama с TZX: BASIC (b_1) -> USR 23815 -> загрузчик 0x8016; подпрограмма ленты 0x804F подменена.
// node tools/unpack_tzx.js <dir: tc|v1|v2> [maxInstr] -> build/<dir>/ram.bin (с 0x4000), печатает порядок страниц
'use strict';
const fs=require('fs'),path=require('path');const ZX48=require('./zx48.js');
const root=path.join(__dirname,'..');const dir=process.argv[2];const max=+process.argv[3]||400000;
const rd=n=>fs.readFileSync(path.join(root,'build',dir,n));
const zx=new ZX48();
const basic=rd('b_1.bin').subarray(1,1+472);
zx.mem.set(basic,0x5ccb);
const w=(a,v)=>{zx.mem[a]=v&255;zx.mem[a+1]=v>>8;};
w(0x5c53,0x5ccb);w(0x5c4b,0x5ccb+191);
const blocks=[rd('b_2.bin'),rd('b_3.bin')];let bi=0;
zx.cpu.set_imode(1);zx.cpu.set_sp(0x7000);zx.cpu.set_pc(0x5ccb+191+28);
const seen=new Set();
for(let n=0;n<max;n++){
  const pc=zx.pc;
  if(pc===0x804f){
    const s=zx.cpu.getState();const len=s.d<<8|s.e;const dst=s.ix;
    const data=blocks[bi++].subarray(1,1+len);
    zx.mem.set(data,dst);
    console.log('лента: блок',bi,'->',dst.toString(16),'длина',len);
    s.ix=(dst+len)&0xffff;s.d=0;s.e=0;s.flags.C=1;
    const sp=s.sp;s.pc=zx.mem[sp]|zx.mem[sp+1]<<8;s.sp=sp+2;
    zx.cpu.setState(s);continue;
  }
  if(pc===0x803f){const s=zx.cpu.getState();const sp=s.sp;s.pc=zx.mem[sp]|zx.mem[sp+1]<<8;s.sp=sp+2;zx.cpu.setState(s);console.log('проверка суммы пропущена');continue;}
  const pg=pc>>8;if(!seen.has(pg)){seen.add(pg);console.log(n,'page',pg.toString(16),'pc',pc.toString(16));}
  if(pc===0xf67c||pc===0xf679||pc===0xf68d)break;
  zx.step();
}
console.log('pc',zx.pc.toString(16));
fs.writeFileSync(path.join(root,'build',dir,'ram.bin'),zx.mem.subarray(0x4000));
