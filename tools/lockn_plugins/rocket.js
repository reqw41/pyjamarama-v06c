// Ракета: нативные a_rocket_earth / a_rocket_moon против ZX-оракула (Action10/11). ZX после анимации прыгает в Room_TestEvents_0 (цикл скрипта) —
// в образце ZX-кода (zmem — копия памяти целиком, снимок потом восстанавливается) «JP Z,Room_TestEvents_0» (8C02) и «JP Demo_10» (8C05) переадресуются на ловушку 0xFFF0 стенда:
// оракул заканчивается там же, где нативный ret, HL = аргументы.
module.exports={
  models:{a_rocket_earth:{zx:'Action10_LiftOffFromEarth'},a_rocket_moon:{zx:'Action11_LiftOffFromMoon'}},
  setup(name,zmem,rnd,env){
    if(name!=='a_rocket_earth'&&name!=='a_rocket_moon')return null;
    zmem[0x8C03]=0xF0;zmem[0x8C04]=0xFF;zmem[0x8C06]=0xF0;zmem[0x8C07]=0xFF;
    // ячейки самомодификации ZX (8BD1,8BD3,8BD6/7,8BE0/1,8BEB/C) лежат в диапазоне «данных» стенда, а нативному коду они не нужны: ставим в образце ровно те значения,
    // которые запишет Action (оракул перезапишет теми же), чтобы сравнение памяти не краснело на мёртвом коде ZX
    const m=name==='a_rocket_moon';const row=m?0x90BB:0x90CB;
    zmem[0x8BD1]=m?0x80:0x88;zmem[0x8BD3]=m?0x7F:0x87;zmem[0x8BD6]=row&255;zmem[0x8BD7]=row>>8;zmem[0x8BE0]=zmem[0x8BEB]=m?0:0x16;zmem[0x8BE1]=zmem[0x8BEC]=0;
    const zp=0x9000+Math.floor(rnd()*0x1000);   // аргументы скрипта (значение произвольное, должно вернуться)
    return {zregs:{h:zp>>8,l:zp&255},nregs:{h:env.z2n(zp)>>8&255,l:env.z2n(zp)&255}};
  },
  prims:{},ptrvars:[],
};
