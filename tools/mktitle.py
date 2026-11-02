#!/usr/bin/env python3
"""Заставка и логотип игры Pyjamarama для Вектора.
Заставка — готовый ZX-экран ref/idpixel/pyjamarama_63.png (две краски на ячейку 8x8, 8 оттенков): рисунок -> плоскость 0 (title.zx0) + карта цветов ячеек (ink | paper<<3, title_v.zx0).
Логотип игры: art/logo_game[_lang].png (256x32, нижняя полоса игры 1:1; цвета PICO-8 1..7) -> три плоскости lg_<плоскость>.zx0 (src/vec/logo_data.inc, logo_cfg.inc)."""
import sys,subprocess,os
PJ_LANG=os.environ.get('PJ_LANG','ru')
sys.path.insert(0,'tools')
from collections import Counter
from PIL import Image
W,H=256,192
PICO={1:(255,236,39),2:(255,0,77),3:(41,173,255),4:(0,228,54),5:(182,109,255),6:(255,182,0),7:(219,146,85)}
GAMEV=[5,2,1,4,6,3,7,4,5,2,1]
def nearest(c,pal):
    return min(range(len(pal)),key=lambda k:sum((c[i]-pal[k][i])**2 for i in range(3)))
from mklogo import layout
def zx0(buf,name):
    open('/tmp/_z.bin','wb').write(bytes(buf))
    subprocess.run(['tools/zx0/zx0','-f','-c','/tmp/_z.bin',name],stdout=subprocess.DEVNULL)
    return os.path.getsize(name)

# ================= логотип игры: цвета PICO-8 по пикселям, три плоскости =================
pcol_g={}                                # (x,y холста 256x32) -> код цвета 1..7
_lg='art/logo_game_%s.png'%PJ_LANG
ART_G=_lg if (PJ_LANG!='en' and os.path.exists(_lg)) else 'art/logo_game.png'
if os.path.exists(ART_G):
    im=Image.open(ART_G).convert('RGBA'); assert im.size==(256,32),ART_G+' должен быть 256x32'
    for y in range(32):
        for x in range(256):
            r,g,b_,al=im.getpixel((x,y))
            if al<128 or max(r,g,b_)<70 or (r>=235 and g>=235 and b_>=235): continue
            pcol_g[(x,y)]=1+nearest((r,g,b_),[PICO[k] for k in range(1,8)])
    print('логотип игры из %s: %d пикселей'%(ART_G,len(pcol_g)))
else:
    SS,SHH,SC0=layout(0.45); cb=(32-SC0)//2; yb=(32-SHH)//2
    for L in SS:
        for y,row in enumerate(L['mask']):
            for x,v in enumerate(row):
                if v: pcol_g[((cb+L['col0'])*8+L['xoff']+x,yb+L['dy']+y)]=GAMEV[L['id']]
assert pcol_g,'пустой логотип игры'
c0=min(x for x,y in pcol_g)>>3; c1=max(x for x,y in pcol_g)>>3; r0=min(y for x,y in pcol_g); r1=max(y for x,y in pcol_g)
SC=c1-c0+1; ROWS=r1-r0+1
tot=0
with open('src/vec/logo_data.inc','w') as f:
    f.write('; сгенерировано tools/mktitle.py: плоскости логотипа игры (ZX0; в буфер ATTR распаковывается по одной): колонки подряд по LOGO_ROWS байт, строка 0 сверху\n')
    for p in range(3):
        buf=bytearray(SC*ROWS)
        for (x,y),v in pcol_g.items():
            if (v>>p)&1: buf[((x>>3)-c0)*ROWS+(y-r0)]|=0x80>>(x&7)
        n=zx0(buf,'build/vec/lg_%d.zx0'%p); tot+=n
        f.write('lg_%d:\tINCBIN\t"../../build/vec/lg_%d.zx0"\n'%(p,p))
    f.write('lg_tab:\tdw\tlg_0,lg_1,lg_2\n')
open('src/vec/logo_cfg.inc','w').write("LOGO_COLS\tEQU\t%d\nLOGO_ROWS\tEQU\t%d\nLOGO_PAGE\tEQU\t0x%02X\nLOGO_L0\tEQU\t%d\n"%(SC,ROWS,0x80+c0,31-r0))
print('логотип игры: колонки %d..%d, строки %d..%d (%dx%d); три плоскости ZX0 = %d Б'%(c0,c1,r0,r1,SC,ROWS,tot))
