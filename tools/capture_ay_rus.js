'use strict';
const fs=require('fs');const ZX48=require('/Users/boris/projects/pyjamarama-v06c/tools/zx48.js');
const bl=[1,2,3,4,5].map(k=>fs.readFileSync('/tmp/rus/b'+k+'.bin'));
const zx=new ZX48();
zx.mem.set(bl[0].subarray(1,1+443),0x5ccb);
const w=(a,v)=>{zx.mem[a]=v&255;zx.mem[a+1]=v>>8;};
w(0x5c53,0x5ccb);w(0x5c4b,0x5ccb+443);
// банки
const banks=[];for(let i=0;i<8;i++)banks.push(new Uint8Array(0x4000));
let cur=0;
let sel=0;const ay=[];const regs=new Uint8Array(16);
zx.onOut=(p,v)=>{
  if(p===0x7ffd){ banks[cur].set(zx.mem.subarray(0xc000,0x10000)); cur=v&7; zx.mem.set(banks[cur],0xc000); console.log('page',cur,'frame',zx.frames);}
  else if((p&0xc002)===0xc000) sel=v&15;
  else if((p&0xc002)===0x8000){ regs[sel]=v; ay.push([zx.frames,sel,v]); }
};
zx.cpu.set_imode(1);zx.cpu.set_sp(0x7000);zx.cpu.set_pc(0x5e46);
let bi=1;const maxF=+process.argv[2]||3000;
const seen=new Set();
let steps=0;
while(zx.frames<maxF && steps<1e9){
  const pc=zx.pc;
  if(pc===0x0556||pc===0x0562){const s=zx.cpu.getState();const len=s.d<<8|s.e;const dst=s.ix;
    const data=bl[bi++];zx.mem.set(data.subarray(1,1+len),dst);
    console.log('лента блок',bi-1,'->',dst.toString(16),len,'frame',zx.frames);
    s.ix=(dst+len)&0xffff;s.d=0;s.e=0;s.flags.C=1;const sp=s.sp;s.pc=zx.mem[sp]|zx.mem[sp+1]<<8;s.sp=sp+2;zx.cpu.setState(s);continue;}
  zx.step();steps++;
}
console.log('frames',zx.frames,'pc',zx.pc.toString(16),'ay writes',ay.length);
banks[cur].set(zx.mem.subarray(0xc000,0x10000));
fs.writeFileSync('/tmp/rus/ram.bin',zx.mem);
fs.writeFileSync('/tmp/rus/ay.json',JSON.stringify(ay));
banks.forEach((b,i)=>fs.writeFileSync('/tmp/rus/bank'+i+'.bin',b));
