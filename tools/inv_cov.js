// Покрытие нативного кода invaders.asm при прогоне tools/lockn.js / lockn_inv_loop.js:
//   node -r ./tools/inv_cov.js tools/lockn.js 600 1 Inv_Update,...
// Печатает по подпрограммам непокрытые АДРЕСА КОМАНД (метка+смещение) из диапазона файла invaders.asm.
'use strict';
const path=require('path'),fs=require('fs');
const p=path.join(__dirname,'vendor/cpu80.js');
const Base=require(p);
const seen=new Set();
class Cov extends Base{constructor(){super();const c=this.cpu,ins=c.instruction.bind(c);c.instruction=function(){seen.add(c.pc);return ins();};}}
Cov.prototype.call=Base.prototype.call;
require.cache[require.resolve(p)].exports=Cov;
process.on('exit',()=>{
  const sym={};for(const l of fs.readFileSync(path.join(__dirname,'../build/vec/pyjama.sym'),'latin1').split('\n')){const m=/^(\S+):\s+EQU\s+0x([0-9A-Fa-f]+)/.exec(l);if(m)sym[m[1]]=parseInt(m[2],16);}
  // границы файла: от fx_noise до Invaders_Step + хвост
  const lo=sym.fx_noise,hi=sym.Invaders_Step+40;
  const lst=process.env.INVLST?fs.readFileSync(process.env.INVLST,'utf8'):null;
  const labs=Object.entries(sym).filter(([k,v])=>v>=lo&&v<hi).sort((a,b)=>a[1]-b[1]);
  // перечень адресов команд: из листинга sjasmplus (если задан), иначе только байты
  const miss=[];
  if(lst){for(const l of lst.split('\n')){const m=/^\s*\d+\+*\s+([0-9A-F]{4})\s+([0-9A-F]{2,})\s/.exec(l);if(!m)continue;const a=parseInt(m[1],16);if(a<lo||a>=hi)continue;if(!seen.has(a))miss.push([a,l.trim().slice(0,70)]);}}
  console.log('непокрытых команд в invaders.asm:',miss.length);
  for(const [a,t] of miss){const lb=labs.filter(x=>x[1]<=a).pop();console.log('  ',a.toString(16),lb?lb[0]+'+'+(a-lb[1]):'',t);}
});
