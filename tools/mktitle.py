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
# ================= заставка: готовый ZX-экран с idpixel.ru (ref/idpixel/pyjamarama_63.png, 1024x768 = x4) =================
# Картинка — настоящий экран ZX (две краски на ячейку 8x8); цвета сводятся к 8 оттенкам (яркость отброшена): код = цвет ZX (бит 0 синий, 1 красный, 2 зелёный).
_im=Image.open('ref/idpixel/pyjamarama_63.png').convert('RGB'); assert _im.size==(1024,768)
def hue(c): return (1 if c[2]>100 else 0)|(2 if c[0]>100 else 0)|(4 if c[1]>100 else 0)
px=[[hue(_im.getpixel((x*4+1,y*4+1))) for x in range(W)] for y in range(H)]
bm=[[0]*W for _ in range(H)]
vmap=[0]*768
for cy in range(24):
    for cx in range(32):
        cn=Counter(px[y][x] for y in range(cy*8,cy*8+8) for x in range(cx*8,cx*8+8))
        cols=[c for c,_ in cn.most_common(2)]
        if len(cols)==1:
            vmap[cy*32+cx]=(cols[0]<<3)|((cols[0]+1)&7); continue       # однотонная: рисунок 0 (бумага), чернила — любые другие
        ink,paper=(min(cols),max(cols))
        vmap[cy*32+cx]=(paper<<3)|ink
        for y in range(cy*8,cy*8+8):
            for x in range(cx*8,cx*8+8):
                bm[y][x]=1 if px[y][x]==ink else 0
# --- сжатие: ячейки с шумным дизерингом (много переходов 0/1) заменяются упорядоченным дизерингом той же плотности (оттенок сохраняется, ZX0 сжимает в разы лучше); PJ_DN — порог переходов (меньше — больше замен)
DN=int(os.environ.get('PJ_DN','999'))
BAYER=[[0,32,8,40,2,34,10,42],[48,16,56,24,50,18,58,26],[12,44,4,36,14,46,6,38],[60,28,52,20,62,30,54,22],[3,35,11,43,1,33,9,41],[51,19,59,27,49,17,57,25],[15,47,7,39,13,45,5,37],[63,31,55,23,61,29,53,21]]
nrep=0
for cy in range(24):
    for cx in range(32):
        a=vmap[cy*32+cx]
        if (a&7)==0 or (a>>3)==0: continue                   # чёрные линии и чёрный фон — как есть
        c=[[bm[cy*8+y][cx*8+x] for x in range(8)] for y in range(8)]
        cnt=sum(map(sum,c))
        if cnt in (0,64): continue
        tr=sum(c[y][x]!=c[y][x+1] for y in range(8) for x in range(7))+sum(c[y][x]!=c[y+1][x] for y in range(7) for x in range(8))
        if tr<DN: continue
        for y in range(8):
            for x in range(8): bm[cy*8+y][cx*8+x]=1 if BAYER[y][x]<cnt else 0
        nrep+=1
print('ячеек с упрощённым дизерингом:',nrep)
pcol_t={}
exc=[]
ZXC=[(0,0,0),(0,0,205),(205,0,0),(205,0,205),(0,205,0),(0,205,205),(205,205,0)]
PICO={1:(255,236,39),2:(255,0,77),3:(41,173,255),4:(0,228,54),5:(182,109,255),6:(255,182,0),7:(219,146,85)}
GAMEV=[5,2,1,4,6,3,7,4,5,2,1]
def nearest(c,pal):
    return min(range(len(pal)),key=lambda k:sum((c[i]-pal[k][i])**2 for i in range(3)))
from mklogo import layout
plane=bytearray(0x2000)
for y in range(H):
    for x in range(W):
        if bm[y][x]: plane[(x>>3)*256+223-y]|=0x80>>(x&7)
open('build/vec/title.bin','wb').write(plane)
def zx0(buf,name):
    open('/tmp/_z.bin','wb').write(bytes(buf))
    subprocess.run(['tools/zx0/zx0','-f','-c','/tmp/_z.bin',name],stdout=subprocess.DEVNULL)
    return os.path.getsize(name)
print('ZX0 рисунка:',zx0(plane,'build/vec/title.zx0'),'Б')
open('build/vec/title_v.bin','wb').write(bytes(vmap))
print('цветовая карта ZX0:',zx0(vmap,'build/vec/title_v.zx0'),'Б')
with open('src/vec/tlogo.inc','w') as f:
    f.write('; заставка: исключений логотипа нет\ntl_n:\tdb\t0\ntl_tab:\n')
ZXP=[(0,0,0),(0,0,255),(255,0,0),(255,0,255),(0,255,0),(0,255,255),(255,255,0),(255,255,255)]
cv=Image.new('RGB',(W,H))
for y in range(H):
    for x in range(W):
        a=vmap[(y>>3)*32+(x>>3)]
        cv.putpixel((x,y),ZXP[a&7] if bm[y][x] else ZXP[(a>>3)&7])
cv.resize((768,576),Image.NEAREST).save('build/vec/title_color_preview.png')

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
