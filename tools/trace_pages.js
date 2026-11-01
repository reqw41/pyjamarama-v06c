'use strict';
const fs=require('fs'),path=require('path');const ZX48=require('./zx48.js');
const root=path.join(__dirname,'..');const zx=new ZX48();
zx.mem.set(fs.readFileSync(path.join(root,'build/Pyjama2.bin')).subarray(0,6912),0x4000);
zx.mem.set(fs.readFileSync(path.join(root,'build/Pyjama3.bin')),0x64ff);
zx.cpu.set_imode(1);zx.cpu.set_sp(0x5f00);zx.cpu.set_pc(0x8110);
const seen=new Set();let n=0;
while(n++<300000){const pc=zx.pc;const pg=pc>>8;if(!seen.has(pg)){seen.add(pg);console.log(n,'page',pg.toString(16),'pc',pc.toString(16));}zx.step();}
