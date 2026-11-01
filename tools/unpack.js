// Запускает защитный загрузчик Pyjamarama (USR 33040) на модели ZX48, снимает память после расшифровки: build/ram.bin (с 0x4000)
'use strict';
const fs=require('fs'),path=require('path');const ZX48=require('./zx48.js');
const root=path.join(__dirname,'..');const zx=new ZX48();
zx.mem.set(fs.readFileSync(path.join(root,'build/Pyjama2.bin')).subarray(0,6912),0x4000);
zx.mem.set(fs.readFileSync(path.join(root,'build/Pyjama3.bin')),0x64ff);
zx.cpu.set_imode(1);zx.cpu.set_sp(0x5f00);zx.cpu.set_pc(0x8110);
const N=+process.argv[2]||7157;
for(let n=0;n<N;n++)zx.step();
console.log('pc',zx.pc.toString(16));
fs.writeFileSync(path.join(root,'build/ram.bin'),zx.mem.subarray(0x4000));
