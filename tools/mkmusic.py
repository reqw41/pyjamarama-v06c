#!/usr/bin/env python3
"""Мелодия меню — Popcorn (ASC Sound Master, ref/popcorn.asc) -> два канала ВИ53 (каналы 1 и 2; канал 0 — секундомер игры).
Канал C ASC (ведущий голос) -> канал 1: пары (нота, кадров); канал B ASC (бас с огибающей, высота по периоду огибающей) -> канал 2: тройки (длина|тип<<7, низ, 0) (один тон).
Ударные (канал A и шумовые ноты B) опускаются. Нота = MIDI-35 (1..61), 0 — тишина; делитель ВИ53 = 1,5 МГц / частота.
Позиции PJ_POS (по умолчанию 5..11) — тема без вступления, зацикливается. Выход: src/vec/music_gen.inc."""
import sys,os,math,struct
sys.path.insert(0,os.path.dirname(__file__))
os.chdir(os.path.join(os.path.dirname(__file__),'..'))
from asc_parse import D,PO,tempo,pos,chan
POS=[int(x) for x in os.environ.get('PJ_POS','5,6,7,8,9,10,11').split(',')]
TR=22                      # нота ASC 57 (тоника) -> G5
def rows(ch,p):
    """-> список по 64 строкам: None или (нота, env_T, длина в строках)"""
    ws=struct.unpack("<3H",D[PO+p*6:PO+p*6+6]); ev=chan(PO+ws[ch])
    out=[];per=0
    for e in ev:
        if e[0]=="skip": per=e[1]
        elif e[0]=="tempo": raise SystemExit('смена темпа не поддержана')
        elif e[0] in("note","stop","rest"):
            out.append(((e[1],e[2]) if e[0]=="note" else None,per+1))
    assert sum(l for _,l in out)==64
    return out
def midi_env(T):
    m=round(69+12*math.log2(1773400/(512*T)/440))
    return m+12 if m<36 else m
def note(m): assert 36<=m<=96,m; return m-35
mel=[];bas=[]
for p in POS:
    for ev,l in rows(2,p): mel+= [note(ev[0]+TR) if ev else 0]*(l*tempo)
    for ev,l in rows(1,p):
        if ev and ev[1] is not None: bas+=[note(midi_env(ev[1]))]*(l*tempo)
        else: bas+=[0]*(l*tempo)
N=len(mel); assert N==len(bas)
# мелодия: повтор той же ноты — кадр тишины
for k in range(1,N):
    pass
def rle(seq):
    out=[];k=0
    while k<len(seq):
        j=k
        while j<len(seq) and seq[j]==seq[k] and j-k<255: j+=1
        out.append((seq[k],j-k)); k=j
    return out
ev=[];prev=None
for n,l in rle(mel):
    ev.append((n,l))
ev2=[]
for i,(n,l) in enumerate(ev):
    nxt=ev[(i+1)%len(ev)][0]
    if n and nxt==n and l>1: ev2+=[(n,l-1),(0,1)]
    else: ev2.append((n,l))
# слитые подряд одинаковые (пауза + пауза)
ev=[]
for n,l in ev2:
    if ev and ev[-1][0]==n and ev[-1][1]+l<256: ev[-1]=(n,ev[-1][1]+l)
    else: ev.append((n,l))
ch=[(l,n,0,0,5) for n,l in rle(bas)]
assert all(c[0]<128 for c in ch)
assert sum(e[1] for e in ev)==N==sum(c[0] for c in ch)
div=[round(1.5e6/(440*2**((m+35-69)/12))) for m in range(1,62)]
TAIL=36   # концовка после последнего прохода: тоника, держится 36 кадров
sc1=[];[sc1.extend([n,l]) for n,l in ev]; sc1+=[0,0, note(57+TR),TAIL, 0,0,0,0]
sc2=[]
for l,lo,m,t,typ in ch: sc2+=[l|(typ==6)<<7,lo,m|t<<4]
sc2+=[0, TAIL,note(midi_env(35)),0, 0,0]
out="; сгенерировано tools/mkmusic.py (не править): %d кадров, мелодия %d нот, бас %d\n"%(N,len(ev),len(ch))
def lines(lbl,op,v):
    o=lbl+':\n'
    for i in range(0,len(v),16): o+='\t'+op+'\t'+','.join(map(str,v[i:i+16]))+'\n'
    return o
out+=lines('mus_mel','db',sc1)+lines('mus_chd','db',sc2)+lines('mus_div','dw',div)
open('src/vec/music_gen.inc','w').write(out)
print('кадров',N,'| мелодия',len(ev),'событий',len(sc1),'Б | бас',len(ch),len(sc2),'Б | таблица',len(div)*2,'Б',min(n for n,_ in ev if n),max(n for n,_ in ev))
