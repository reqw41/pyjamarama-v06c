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
px=FIX.apply(px)
# палитра Вектора: BBGGGRRR
def vbyte(c): return ((round(c[2]/85)&3)<<6)|((round(c[1]/36.43)&7)<<3)|(round(c[0]/36.43)&7)
VB=[vbyte(c) for c in PAL]
def unb(b): return (((b>>0)&7)*255//7,((b>>3)&7)*255//7,((b>>6)&3)*255//3)
PREV=[unb(b) for b in VB]
render(px,PREV,3).save('build/vec/title_preview.png')
# плоскости: бит k кода -> плоскость k; адрес = колонка*256 + (223-y); полосы вне 192 строк — код 7 (белый)
planes=[bytearray(0x2000) for _ in range(3)]
for c in range(32):
    for l in list(range(0,32))+list(range(224,256)):
        for k in range(3): planes[k][c*256+l]=0xFF
for y in range(192):
    for x in range(256):
        v=px[y][x]
        for k in range(3):
            if (v>>k)&1: planes[k][(x>>3)*256+223-y]|=0x80>>(x&7)
def zx0(buf,name):
    open('/tmp/_z.bin','wb').write(bytes(buf))
    subprocess.run(['tools/zx0/zx0','-f','-c','/tmp/_z.bin',name],stdout=subprocess.DEVNULL)
    return os.path.getsize(name)
TRIM=int(os.environ.get('PJ_TRIM','32'))          # хвост плоскости 2 (полоса вне картинки, 0xFF) не сжимается: запас для распаковки «на месте»
assert all(b==0xFF for b in planes[2][0x2000-TRIM:])
open('build/vec/title_planes.bin','wb').write(bytes(planes[0]+planes[1]+planes[2]))
sz=[zx0(planes[0],'build/vec/tp_0.zx0'),zx0(planes[1],'build/vec/tp_1.zx0'),zx0(planes[2][:0x2000-TRIM],'build/vec/tp_2.zx0')]
print('заставка: ZX0 плоскостей',sz,'всего',sum(sz))
with open('src/vec/title_pal.inc','w') as f:
    f.write('; сгенерировано tools/mktitle_pic.py (не править)\n')
    f.write('pal_title:\tdb\t'+','.join('0x%02X,0x%02X'%(VB[c],VB[c]) for c in (0,4,2,6,1,5,3,7))+'\t; пары по индексу аппаратной палитры (порядок кодов 0,4,2,6,1,5,3,7)\n')
    f.write('TP_TRIM\tEQU\t%d\n'%TRIM)
    for k in range(3): f.write('TP%d_LEN\tEQU\t%d\n'%(k,sz[k]))
assert sz[0]+sz[1]+sz[2]<=0x2000,'потоки не влезают в плоскость 2'
