// Проверка Key_WaitAny (end.asm) на cpu80: ждёт «все отпущены», потом «любая нажата». Сценарий по числу выполненных инструкций.
'use strict';
const fs=require('fs'),path=require('path');const CPU80=require('./vendor/cpu80.js');
const ROOT=path.join(__dirname,'..');const nsym={};
for(const l of fs.readFileSync(path.join(ROOT,'build/vec/pyjama.sym'),'latin1').split('\n')){const m=/^(\S+):\s+EQU\s+0x([0-9A-Fa-f]+)/.exec(l);if(m)nsym[m[1]]=parseInt(m[2],16);}
function run(sc){ // sc: функция(шаг, mem) меняет vec_kbmat/vj_fire; возвращает шаг возврата или -1
  const n=new CPU80();n.mem.set(fs.readFileSync(path.join(ROOT,'build/vec/pyjama.r0m')));const c=n.cpu;
  n.mem[0x7FF1]=0xFF;n.mem[0x7FF0]=0xFE;c.sp=0x7FF0;c.pc=nsym.Key_WaitAny;
  for(let t=0;t<20000;t++){sc(t,n.mem);if(c.pc===0xFFFE)return t;c.instruction();}return -1;}
const K=nsym.vec_kbmat,J=nsym.vj_fire;let ok=true;const chk=(nm,c)=>{console.log(c?'ок':'ОШИБКА',nm);if(!c)ok=false;};
// 1) всё отпущено, на шаге 1000 нажали ряд 3 -> возврат вскоре после
{const t=run((t,m)=>{m[K+3]=t>=1000?0x04:0;});chk('нажатие при отпущенных ('+t+')',t>1000&&t<1100);}
// 2) клавиша удерживается с начала до шага 500, затем отпущена, нажата вновь на 1500
{const t=run((t,m)=>{m[K+5]=(t<500||t>=1500)?0x02:0;});chk('удержание не засчитывается ('+t+')',t>=1500&&t<1600);}
// 3) огонь джойстика
{const t=run((t,m)=>{m[J]=t>=800?1:0;});chk('vj_fire ('+t+')',t>800&&t<900);}
// 4) нет нажатия — не возвращается
{const t=run(()=>{});chk('без нажатия ждёт',t===-1);}
process.exit(ok?0:1);
