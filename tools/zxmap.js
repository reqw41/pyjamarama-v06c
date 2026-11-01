// Карта адресов ZX -> Вектор (уплотнённый образ данных, build/vec/reloc.json: segs [[zx,len,vec],...]).
'use strict';
const fs=require('fs'),path=require('path');
const rel=JSON.parse(fs.readFileSync(path.join(__dirname,'..','build/vec/reloc.json')));
const segs=rel.segs;
function z2n(a){for(const [zs,n,vs] of segs)if(a>=zs&&a<zs+n)return vs+a-zs;for(const [zs,n,vs] of segs)if(a===zs+n)return vs+n;return undefined;}
function n2z(v){for(const [zs,n,vs] of segs)if(v>=vs&&v<vs+n)return zs+v-vs;return undefined;}
const _in=new Uint8Array(0x10000);for(const [zs,n] of segs)_in.fill(1,zs,zs+n);
function inData(a){return _in[a]===1;}
module.exports={rel,segs,z2n,n2z,inData};
