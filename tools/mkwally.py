#!/usr/bin/env python3
"""Раскраска спрайтов Wally по MSX-версии (msxdev24_pyjamarama_v1.0.dsk): Wally там — белый спрайт + жёлтая «кожа» поверх (аппаратные спрайты); формы совпадают с ZX
(объединение белого и жёлтого = ZX-спрайт, IoU ~1,0). Для каждого ZX-спрайта Wally 0..0x4B подбирается MSX-кадр (тот же или зеркальный, сдвиг по Y 0/±1).
Выход src/vec/wally_col_a.inc (wy_map, wy_off) и wally_col_b.inc (wy_data): wy_map (на ZX-индекс: бит0-3 = MSX-кадр 0..13, бит4 = зеркало, биты5-6 = dy: 0, 1 (вниз), 2 (вверх)),
wy_off (слова: адреса кадров в wy_data), wy_data (отрезки жёлтого: 2 Б = строка<<4|x0, длина; конец кадра 0xFF).
Источник MSX: ref/msx/WALLY.SPR (файл с диска, 45 спрайтов 16x16: 0..13 белые, 14..27 жёлтые поверх; 16x16 = байты 0..15 левая колонка, 16..31 правая)."""
import re,os
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)),'..'))
d=open('build/vec/data.bin','rb').read()
sym={}
for l in open('src/vec/zxsym.inc'):
    m=re.match(r'(\S+)\s+EQU\s+(0x[0-9A-Fa-f]+)',l)
    if m: sym[m.group(1)]=int(m.group(2),0)
B=sym['Bmp_Wally']
def zspr(i):
    a=B+32*i-0x100
    return [(d[a+2*r]<<8|d[a+2*r+1]) for r in range(16)]
M=open('ref/msx/WALLY.SPR','rb').read()
def mspr(i):
    s=M[i*32:(i+1)*32]
    return [((s[y]<<8)|s[16+y]) for y in range(16)]
def mirror(rows):
    out=[]
    for r in rows:
        v=0
        for k in range(16):
            if r&(1<<k): v|=0x8000>>k
        out.append(v)
    return out
def dyshift(rows,dy):
    if dy>0: return [0]*dy+rows[:16-dy]
    if dy<0: return rows[-dy:]+[0]*(-dy)
    return rows
def iou(a,b):
    inter=sum(bin(x&y).count('1') for x,y in zip(a,b)); un=sum(bin(x|y).count('1') for x,y in zip(a,b)); return inter/un if un else 0
W=[mspr(i) for i in range(14)]; Y=[mspr(i+14) for i in range(14)]
U=[[a|b for a,b in zip(W[i],Y[i])] for i in range(14)]
DYC={0:0,1:1,-1:2}
mp=bytearray(0x4C); minq=1
for zi in range(0x4C):
    z=zspr(zi); best=(-1,0,0,0)
    for mi in range(14):
        for mir in (0,1):
            u=mirror(U[mi]) if mir else U[mi]
            for dy in (0,1,-1):
                s=iou(z,dyshift(u,dy))
                if s>best[0]+1e-9: best=(s,mi,mir,dy)
    s,mi,mir,dy=best; minq=min(minq,s)
    mp[zi]=mi|(mir<<4)|(DYC[dy]<<5)
# отрезки жёлтого по кадрам (в ориентации MSX-кадра, зеркалирование и dy — в рантайме)
data=bytearray(); off=[]
for mi in range(14):
    off.append(len(data))
    for y in range(16):
        r=Y[mi][y]; x=0
        while x<16:
            if r&(0x8000>>x):
                x0=x
                while x<16 and r&(0x8000>>x): x+=1
                data+=bytes([(y<<4)|x0,x-x0])
            else: x+=1
    data.append(0xFF)
assert len(data)<65536
with open('src/vec/wally_col_a.inc','w') as f:
    f.write('; сгенерировано tools/mkwally.py: карта ZX-спрайт -> MSX-кадр и адреса кадров (плоскость 3)\nwy_map:\n')
    for i in range(0,0x4C,16): f.write('\tdb\t'+','.join('0x%02X'%b for b in mp[i:i+16])+'\n')
    f.write('wy_off:\tdw\t'+','.join('wy_data+%d'%o for o in off)+'\n')
with open('src/vec/wally_col_b.inc','w') as f:
    f.write('; сгенерировано tools/mkwally.py: отрезки жёлтого по MSX-кадрам (низкая память)\nwy_data:\n')
    for i in range(0,len(data),16): f.write('\tdb\t'+','.join('0x%02X'%b for b in data[i:i+16])+'\n')
print('карта %d Б, отрезки %d Б, худший IoU %.2f'%(len(mp),len(data),minq))
