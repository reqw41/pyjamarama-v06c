// Таблица меток из ref/pyjamarama.lst (редакция V1): SYM[имя] = адрес
'use strict';
const fs=require('fs'),path=require('path');
const SYM={};
for(const l of fs.readFileSync(path.join(__dirname,'..','ref','pyjamarama.lst'),'utf8').split('\n')){
  const m=/^([0-9A-F]{4})  (\S+)/.exec(l);
  if(m && /^[A-Za-z_]\w*$/.test(m[2]) && !/^(DEF|LD|JP)/.test(m[2])) SYM[m[2]]=parseInt(m[1],16);
}
module.exports={SYM};
