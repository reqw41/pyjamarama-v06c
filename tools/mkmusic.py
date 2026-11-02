#!/usr/bin/env python3
"""Мелодия меню — из второго издания (build/v2/ram.bin, TZX v2): партитура F6F7 — пары (длительность 1/2/4/8, нота), таблица нот F7AD (BC = полупериод, DE = число периодов), бипер.
Период ZX T = 52*BC + 250 тактов @3,5 МГц; делитель канала 1 ВИ53 (1,5 МГц) = T*3/7; кадров на единицу длительности ≈ 3,3. Байт партитуры: бит 0-2 — нота (1..6, 7 — пауза), бит 3-4 — длительность (индекс 1/2/4/8), 0 — конец.
Выход: src/vec/music_gen.inc (mus_score, mus_div, mus_dur)."""
B=open('build/v2/ram.bin','rb').read()
def b(a): return B[a-0x4000]
a=0xF6F7;pairs=[]
while b(a)!=0: pairs.append((b(a),b(a+1))); a+=2
used=sorted({n for _,n in pairs if n}); assert len(used)==6,used
code={n:i+1 for i,n in enumerate(used)}
LEN={1:0,2:1,4:2,8:3}
sc=[(7 if n==0 else code[n])|(LEN[l]<<3) for l,n in pairs]+[0]
div=[]
for n in used:
    t=0xF7AD+4*n; bc=b(t)|b(t+1)<<8; T=52*bc+250; div.append(round(T*3/7))
dur=[3,7,13,26]
out="; сгенерировано tools/mkmusic.py (не править)\nmus_score:\tdb\t"+",".join(map(str,sc))+"\nmus_div:\tdw\t"+",".join(map(str,div))+"\nmus_dur:\tdb\t"+",".join(map(str,dur))+"\n"
open('src/vec/music_gen.inc','w').write(out)
print('нот в партитуре',len(pairs),'делители',div)
