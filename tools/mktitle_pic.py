#!/usr/bin/env python3
"""Заставка Pyjamarama: попиксельная раскраска (три плоскости по 8 КБ, ZX0) вместо атрибутов ZX.
Исходник — ZX-экран idpixel (ref/idpixel/pyjamarama_63.png); правки раскраски — art/title/fixes.py (заливки областей, ограниченных чёрными линиями);
палитра — art/title/palette.py (код цвета = бит k плоскости k; 8 цветов).
Выход: build/vec/tp_<k>.zx0, src/vec/title_pal.inc (pal_title, размещение потоков), build/vec/title_preview.png."""
import sys,os,subprocess,importlib.util
sys.path.insert(0,'tools')
from title_lib import *
def load(p):
    sp=importlib.util.spec_from_file_location('m',p); m=importlib.util.module_from_spec(sp); sp.loader.exec_module(m); return m
PAL=load('art/title/palette.py').PAL            # 8 цветов RGB по коду
FIX=load('art/title/fixes.py')
px=load_zx()
px=[[7]*256 for _ in range(32)]+px+[[7]*256 for _ in range(32)]    # экран Вектора 256x256: картинка ZX 256x192 по центру, поля белые
px=FIX.apply(px)
# --- если есть раскрашенный внешней моделью/художником рисунок (art/title/colored.png), он заменяет раскраску: пиксели -> ближайший цвет палитры (PJ_DITHER=1 — с диффузией ошибки), чёрные контуры оригинала (outline_1x.png) остаются тёмно-фиолетовыми
_col='art/title/colored.png'
if os.path.exists(_col):
    from PIL import Image as _I
    from collections import Counter as _C
    ci=_I.open(_col).convert('RGB')
    SKIN=(253,194,105)          # телесный цвет модели: в палитре его нет — получается упорядоченным дизерингом оранжевого и белого (код 8 — «кожа»)
    BAYER4=[[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]]
    def near(c):
        if sum((c[i]-SKIN[i])**2 for i in range(3))<45**2: return 8
        return min(range(8),key=lambda k:sum((c[i]-PAL[k][i])**2 for i in range(3)))
    if abs(ci.size[0]/ci.size[1]-1)<0.05:
        # квадратная картинка: 192x192 по центру, поля 32 пикселя слева и справа — белые (код 7). Блок исходных пикселей -> один пиксель: контур (>=22% тёмных) приоритетнее, иначе самый частый цвет
        S=ci.size[0]; ref=[[near(ci.getpixel((x,y))) for x in range(S)] for y in range(S)]
        px=[[7]*256 for _ in range(256)]
        for ty in range(256):
            for tx in range(256):
                x0,x1=tx*S//256,max((tx+1)*S//256,tx*S//256+1); y0,y1=ty*S//256,max((ty+1)*S//256,ty*S//256+1)
                cnt=_C(ref[y][x] for y in range(y0,y1) for x in range(x0,x1)); n=sum(cnt.values())
                v=0 if cnt[0]>=0.22*n else cnt.most_common(1)[0][0] if cnt.most_common(1)[0][0]!=0 else cnt.most_common(2)[-1][0]
                px[ty][tx]=(6 if BAYER4[ty%4][tx%4]<10 else 7) if v==8 else v
        print('раскраска взята из',_col,'(квадрат на весь экран 256x256)')
    else:
        if ci.size!=(256,192): ci=ci.resize((256,192),_I.BOX)
        la=_I.open('art/title/outline_1x.png').convert('L')
        cp=[[list(ci.getpixel((x,y))) for x in range(256)] for y in range(192)]
        dith=os.environ.get('PJ_DITHER','0')=='1'
        for y in range(192):
            for x in range(256):
                c=cp[y][x]; k=near(c); px[y+32][x]=k
                if dith:
                    e=[c[i]-PAL[k][i] for i in range(3)]
                    for dx,dy,w in((1,0,7),(-1,1,3),(0,1,5),(1,1,1)):
                        nx,ny=x+dx,y+dy
                        if 0<=nx<256 and 0<=ny<192:
                            for i in range(3): cp[ny][nx][i]+=e[i]*w/16
                if la.getpixel((x,y))==0: px[y+32][x]=0
        print('раскраска взята из',_col)
# палитра Вектора: BBGGGRRR
def vbyte(c): return ((round(c[2]/85)&3)<<6)|((round(c[1]/36.43)&7)<<3)|(round(c[0]/36.43)&7)
VB=[vbyte(c) for c in PAL]
def unb(b): return (((b>>0)&7)*255//7,((b>>3)&7)*255//7,((b>>6)&3)*255//3)
PREV=[unb(b) for b in VB]
render(px,PREV,3,(0,0,256,256)).save('build/vec/title_preview.png')
# плоскости: бит k кода -> плоскость k; адрес = колонка*256 + (223-y); полосы вне 192 строк — код 7 (белый)
planes=[bytearray(0x2000) for _ in range(3)]
for y in range(256):
    for x in range(256):
        v=px[y][x]
        for k in range(3):
            if (v>>k)&1: planes[k][(x>>3)*256+255-y]|=0x80>>(x&7)
def zx0(buf,name):
    open('/tmp/_z.bin','wb').write(bytes(buf))
    subprocess.run(['tools/zx0/zx0','-f','-c','/tmp/_z.bin',name],stdout=subprocess.DEVNULL)
    return os.path.getsize(name)
TRIM=32          # хвост плоскости 2 не сжимается (копируется кодом): запас для распаковки «на месте»
open('build/vec/title_planes.bin','wb').write(bytes(planes[0]+planes[1]+planes[2]))
sz=[zx0(planes[0],'build/vec/tp_0.zx0'),zx0(planes[1],'build/vec/tp_1.zx0'),zx0(planes[2][:0x2000-TRIM],'build/vec/tp_2.zx0')]
print('заставка: ZX0 плоскостей',sz,'всего',sum(sz))
TAIL=bytes(planes[2][0x2000-TRIM:])
with open('src/vec/title_pal.inc','w') as f:
    f.write('; сгенерировано tools/mktitle_pic.py (не править)\n')
    f.write('pal_title:\tdb\t'+','.join('0x%02X,0x%02X'%(VB[c],VB[c]) for c in (0,4,2,6,1,5,3,7))+'\t; пары по индексу аппаратной палитры (порядок кодов 0,4,2,6,1,5,3,7)\n')
    f.write('TP_TRIM\tEQU\t%d\n'%TRIM)
    f.write('title_tail:\tdb\t'+','.join(str(b) for b in TAIL)+'\t; хвост плоскости 2 не сжат: запас для распаковки на месте\n')
    for k in range(3): f.write('TP%d_LEN\tEQU\t%d\n'%(k,sz[k]))
assert sz[0]+sz[1]+sz[2]<=0x2000,'потоки не влезают в плоскость 2'
