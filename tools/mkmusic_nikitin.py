#!/usr/bin/env python3
"""Мелодия меню — Олег Никитин (n1k-o), «ProTracker 3.7 compilation of Pijamarama» из pyjamarama_rus.tap, AY -> два канала ВИ53 (каналы 1 и 2; канал 0 — секундомер игры).
Исходник — запись регистров AY по кадрам (ref/pyj_rus_ay.bin: 900 кадров x 14 регистров; снята tools/capture_ay_rus.js: TAP грузится в zx48 с пейджингом 7FFD).
Канал B (мелодия) -> канал 1 ВИ53: пары (нота, кадров); канал A (арпеджио аккорда: верх, середина, низ, низ, середина[, верх]) -> канал 2: тройки (длина | тип<<7, низ, середина-низ | (верх-низ)<<4).
Нота = MIDI - 35 (1..61), 0 — тишина; делитель ВИ53 = 1,5 МГц / частота. Выход: src/vec/music_gen.inc."""
import math
N=int(__import__('os').environ.get('PJ_MUSIC_FRAMES','832'))
d=open('ref/pyj_rus_ay.bin','rb').read()
R=[d[i*14:(i+1)*14] for i in range(len(d)//14)]
def midi(per):
    if per==0: return 0
    return round(69+12*math.log2(1773400/(16*per)/440))
def note(m): return 0 if m<36 or m>96 else m-35
Bn=[];Bv=[];An=[];Av=[]
for r in R[:N]:
    Bn.append(midi(r[2]|(r[3]&15)<<8));Bv.append(r[9]&15)
    An.append(midi(r[0]|(r[1]&15)<<8));Av.append(r[8]&15)
# --- мелодия: громкость < 3 — тишина; выбросы в один кадр сглажены; повторная атака той же ноты — кадр тишины ---
mel=[note(m) if v>=3 else 0 for m,v in zip(Bn,Bv)]
for k in range(1,len(mel)-1):
    if mel[k]!=mel[k-1] and mel[k]!=mel[k+1] and mel[k-1]==mel[k+1]: mel[k]=mel[k-1]
    elif mel[k]!=mel[k-1] and mel[k-1]!=0 and mel[k]!=0 and mel[k+1]==mel[k-1]: mel[k]=mel[k-1]
for k in range(1,len(mel)):
    if mel[k] and mel[k]==mel[k-1] and Bv[k]>Bv[k-1]+2: mel[k]=0
def rle(seq):
    out=[];k=0
    while k<len(seq):
        j=k
        while j<len(seq) and seq[j]==seq[k] and j-k<255: j+=1
        out.append((seq[k],j-k)); k=j
    return out
# однокадровые «заходы» на полутон выше/ниже (скольжение высоты в начале ноты) заменяются следующей нотой
ev=rle(mel)
for _ in range(2):
    for k in range(len(ev)-1):
        if ev[k][1]<=2 and ev[k][0] and ev[k+1][0] and abs(ev[k][0]-ev[k+1][0])<=2: ev[k]=(ev[k+1][0],ev[k][1])
    mel=[n for n,l in ev for _ in range(l)]
    ev=rle(mel)
# --- аккорды A: сегменты по скачку громкости вверх ---
segs=[];s0=0
for k in range(1,N):
    if Av[k]>Av[k-1]+2: segs.append((s0,k)); s0=k
segs.append((s0,N))
ch=[]
for a,b in segs:
    n=[note(m) for m in An[a:b]]
    ps=[x for x in n[:6] if x]
    if len(ps)<3:
        ch.append((b-a,0,0,0,5)); continue
    top,mid,low=n[0],n[1],n[2]
    typ=6 if len(n)>5 and n[5]==top and n[4]==mid and n[3]==low else 5
    if not (low<=mid<=top): low,mid,top=sorted(ps[:3])
    ch.append((b-a,low,mid-low,top-low,typ))
# длины аккордов > 127 дробим не требуется (≤ 31)
assert all(c[0]<128 for c in ch)
assert all(c[2]<16 and c[3]<16 for c in ch if c[1]),'интервал аккорда >= 16'
assert sum(c[0] for c in ch)==N==sum(e[1] for e in ev)
div=[round(1.5e6/(440*2**((m+35-69)/12))) for m in range(1,62)]
assert max(div)<65536
sc1=[];[sc1.extend([n,l]) for n,l in ev]; sc1+=[0,0]
sc2=[]
for l,lo,m,t,typ in ch: sc2+=[l|(typ==6)<<7,lo,m|t<<4]
sc2+=[0]
out="; сгенерировано tools/mkmusic.py (не править): %d кадров, мелодия %d нот, аккордов %d\n"%(N,len(ev),len(ch))
def lines(lbl,op,v):
    o=lbl+':\n'
    for i in range(0,len(v),16): o+='\t'+op+'\t'+','.join(map(str,v[i:i+16]))+'\n'
    return o
out+=lines('mus_mel','db',sc1)+lines('mus_chd','db',sc2)+lines('mus_div','dw',div)
open('src/vec/music_gen.inc','w').write(out)
print('кадров',N,'| мелодия',len(ev),'событий',len(sc1),'Б | аккордов',len(ch),len(sc2),'Б | таблица',len(div)*2,'Б')
