#!/usr/bin/env python3
"""Мелодия заставки: таблица нот ZX (BC=полупериод в итерациях Pause, DE=число периодов) -> делители канала 1 ВИ53 и длительности в кадрах (50 Гц) -> src/vec/music_gen.inc.
Период ZX = 52*BC + 190 тактов @3,5 МГц; делитель ВИ53 (1,5 МГц) N = период*3/7. Партитуру (пары «повтор, нота», 0 = конец, FF = пауза) играет сам ZX-образ данных."""
import re
ram=open('build/v1/ram.bin','rb').read()
def b(a): return ram[a-0x4000]
sy={}
for l in open('ref/pyjamarama.lst'):
    m=re.match(r'([0-9A-F]{4})  (\S+)',l)
    if m and re.match(r'[A-Za-z_]',m.group(2)): sy[m.group(2)]=int(m.group(1),16)
nt=sy['Music_NoteTable']
sc=sy['Music_ScoreSheet'];p=sc;mx=0
while b(p)!=0:
    n=b(p+1);p+=2
    if n!=0xFF: mx=max(mx,n)
div=[];fr=[]
for i in range(1,mx+1):
    a=nt+(i-1)*4;bc=b(a)|b(a+1)<<8;de=b(a+2)|b(a+3)<<8
    T=52*bc+190
    div.append(round(T*3/7));fr.append(max(1,round(de*T/3.5e6*50)))
out="; сгенерировано tools/mkmusic.py (не править)\nmus_n_div:\tdw\t"+",".join(map(str,div))+"\nmus_n_fr:\tdb\t"+",".join(map(str,fr))+"\n"
open('src/vec/music_gen.inc','w').write(out)
print('нот',mx,'делители',div,'кадров',fr)
