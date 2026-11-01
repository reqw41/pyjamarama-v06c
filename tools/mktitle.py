#!/usr/bin/env python3
"""Заставка Pyjamarama для Вектора.
Рисунок — ZX-экран (build/Pyjama2.bin, 6912 Б, биты = чернила) БЕЗ старой надписи «Pyjamarama!» (её компоненты связности вырезаются) -> плоскость 0 (8 КБ, столбцами,
строка ZX y -> L = 223-y) -> build/vec/title.zx0 + карта цветов ячеек 8x8 (ink/paper ZX) title_v.zx0. ЛОГОТИП — отдельно, ПОПИКСЕЛЬНО в цвете:
  art/logo_title.png (256x64, левый верх = экран (0,120); цвета ZX 0..6; иначе генератор по буквам) -> три маски AND (по плоскостям) tl_<плоскость>_<часть>.zx0 (src/vec/tlogo.inc);
  art/logo_game.png (256x32, нижняя полоса игры 1:1; цвета PICO-8 1..7)                              -> три плоскости lg_<плоскость>.zx0 (src/vec/logo_data.inc, logo_cfg.inc).
Маска заставки: на плоскости p пиксель логотипа сохраняется (бит 1) только если в цвете есть бит p; остальное 0xFF; в рантайме AND по уже раскрашенной (бумага белая) полосе."""
import sys,subprocess,os
sys.path.insert(0,'tools')
from mklogo import render,LOGO,layout
from collections import Counter
from PIL import Image
d=open('build/Pyjama2.bin','rb').read()
W,H=256,192
bm=[[0]*W for _ in range(H)]
for y in range(H):
    for x in range(W):
        a=((y&0xC0)<<5)|((y&7)<<8)|((y&0x38)<<2)|(x>>3)
        bm[y][x]=(d[a]>>(7-(x&7)))&1
# --- вырезать старую надпись: связные компоненты (8 соседей), ограничивающие прямоугольники найдены разбором (docs/JOURNAL.md) ---
lab=[[0]*W for _ in range(H)]; comps=[]
for y in range(H):
    for x in range(W):
        if bm[y][x] and not lab[y][x]:
            st=[(y,x)]; lab[y][x]=1; px=[]
            while st:
                cy,cx=st.pop(); px.append((cy,cx))
                for dy in(-1,0,1):
                    for dx in(-1,0,1):
                        ny,nx=cy+dy,cx+dx
                        if 0<=ny<H and 0<=nx<W and bm[ny][nx] and not lab[ny][nx]: lab[ny][nx]=1; st.append((ny,nx))
            xs=[p[0] for p in px]; ys=[p[1] for p in px]
            comps.append((len(px),min(ys),min(xs),max(ys),max(xs),px))   # размер, x0, y0, x1, y1
cut=0
for n,x0,y0,x1,y1,px in comps:
    logo = (y0>=126 and y1>=159 and n>=40 and not (x0>=89 and y0<10))        # буквы: низ >= 159, верх >= 126
    wide_left = (x0<=1 and y1>=165 and n>1000)                                   # «P» слита с рамой двери: режем только строки >= 113
    if logo:
        for y,x in px: bm[y][x]=0; cut+=1
    elif wide_left:
        for y,x in px:
            if y>=113: bm[y][x]=0; cut+=1
print('вырезано пикселей старой надписи:',cut)

# ================= логотип заставки: цвета ZX по пикселям =================
ZXINK=[3,2,1,4,3,1,2,4,3,1,2]          # цвета букв генератора (ZX ink: 1 синий, 2 красный, 3 пурпурный, 4 зелёный)
GAMEV=[5,2,1,4,6,3,7,4,5,2,1]          # цвета букв генератора для игры (коды палитры PICO-8)
ZXC=[(0,0,0),(0,0,205),(205,0,0),(205,0,205),(0,205,0),(0,205,205),(205,205,0)]   # ZX-цвета чернил 0..6 (белый — фон)
PICO={1:(255,236,39),2:(255,0,77),3:(41,173,255),4:(0,228,54),5:(182,109,255),6:(255,182,0),7:(219,146,85)}
def nearest(c,pal):
    return min(range(len(pal)),key=lambda k:sum((c[i]-pal[k][i])**2 for i in range(3)))
pcol_t={}                                # (X,Y экрана) -> ZX-цвет 0..6
if os.path.exists('art/logo_title.png'):
    im=Image.open('art/logo_title.png').convert('RGBA'); assert im.size==(256,64),'art/logo_title.png должен быть 256x64'
    for y in range(64):
        for x in range(256):
            r,g,b_,al=im.getpixel((x,y))
            if al<128 or (r>=235 and g>=235 and b_>=235): continue
            pcol_t[(x,120+y)]=nearest((r,g,b_),ZXC)
    print('логотип заставки из art/logo_title.png: %d пикселей'%len(pcol_t))
else:
    LS,LH,LC=layout(0.7); START=(32-LC)//2; TOP=182-LH+1
    for L in LS:
        for y,row in enumerate(L['mask']):
            for x,v in enumerate(row):
                if v: pcol_t[((START+L['col0'])*8+L['xoff']+x,TOP+L['dy']+y)]=ZXINK[L['id']]
# ореол вокруг логотипа в рисунке (стереть рисунок рядом с буквами), затем пиксели логотипа — в плоскость 0 (цвет ячейки = преобладающий, исключения — попиксельно ниже)
for x,y in pcol_t:
    for dy in(-1,0,1):
        for dx in(-1,0,1):
            if 0<=y+dy<H and 0<=x+dx<W: bm[y+dy][x+dx]=0
for (x,y) in pcol_t: bm[y][x]=1
# --- карта цветов ячеек (ZX-атрибут: ink биты 0-2, paper биты 3-5, яркость отброшена) ---
at=d[0x1800:0x1B00]
vmap=[t&0x3F for t in at]
# --- правка раскраски героя на заставке (по просьбе владельца): кожа жёлтая (бумага ячеек головы), пижама белая (красные чернила -> чёрные линии на белой бумаге) ---
SKIN_CELLS=[(r,c) for r in range(7,12) for c in range(14,20)]       # голова: строки 7..11, колонки 14..19
for r,c in SKIN_CELLS: vmap[r*32+c]=(6<<3)|(vmap[r*32+c]&7)
for r in range(11,21):
    for c in range(12,21):
        a=vmap[r*32+c]
        if (a&7)==2 and ((a>>3)&7)==7: vmap[r*32+c]=(7<<3)|0
# ячейки с логотипом: бумага белая, чернила — преобладающий цвет пикселей логотипа ячейки; пиксели другого цвета — исключения (попиксельно после colorize)
tally={}
for (X,Y),zc in pcol_t.items(): tally.setdefault((Y>>3,X>>3),Counter())[zc]+=1
cellcol={}
for (cy,cx),cn in tally.items(): cellcol[(cy,cx)]=cn.most_common(1)[0][0]; vmap[cy*32+cx]=(7<<3)|cellcol[(cy,cx)]
exc=[(X,Y,zc) for (X,Y),zc in sorted(pcol_t.items()) if zc!=cellcol[(Y>>3,X>>3)]]
print('смешанных ячеек: %d, пикселей-исключений: %d'%(sum(1 for c in tally.values() if len(c)>1),len(exc)))
fixed=0
for cy in range(24):
    for cx in range(32):
        a=vmap[cy*32+cx]
        if (a&7)==((a>>3)&7):
            for y in range(cy*8,cy*8+8):
                for x in range(cx*8,cx*8+8): bm[y][x]=0
            vmap[cy*32+cx]=(a&0x38)|(((a&7)+1)&7); fixed+=1
print('однотонных ячеек (ink == paper):',fixed)
plane=bytearray(0x2000)
prev=Image.new('1',(W,H),1)
for y in range(H):
    for x in range(W):
        if bm[y][x]:
            plane[(x>>3)*256+223-y]|=0x80>>(x&7); prev.putpixel((x,y),0)
open('build/vec/title.bin','wb').write(plane)
prev.convert('RGB').save('build/vec/title_vec.png')
def zx0(buf,name):
    open('/tmp/_z.bin','wb').write(bytes(buf))
    subprocess.run(['tools/zx0/zx0','-f','-c','/tmp/_z.bin',name],stdout=subprocess.DEVNULL)
    return os.path.getsize(name)
print('ZX0 рисунка:',zx0(plane,'build/vec/title.zx0'),'Б; плоскость 0 — ненулевых байт',sum(1 for b in plane if b))
open('build/vec/title_v.bin','wb').write(bytes(vmap))
print('цветовая карта ZX0:',zx0(vmap,'build/vec/title_v.zx0'),'Б')
# --- исключения: пиксели логотипа, цвет которых отличается от цвета их ячейки. Запись 4 байта: страница плоскости 0 (0x80+колонка), линия Вектора, маска бита, цвет ZX ---
assert len(exc)<256
with open('src/vec/tlogo.inc','w') as f:
    f.write('; сгенерировано tools/mktitle.py: пиксели логотипа заставки с цветом, отличным от цвета ячейки (страница, линия, маска, цвет ZX)\ntl_n:\tdb\t%d\ntl_tab:\n'%len(exc))
    for X,Y,zc in exc: f.write('\tdb\t0x%02X,%d,0x%02X,%d\n'%(0x80+(X>>3),223-Y,0x80>>(X&7),zc))
print('исключений логотипа заставки: %d (%d Б)'%(len(exc),4*len(exc)))
# цветной предпросмотр: цвета ZX (обычная яркость), логотип поверх
ZXP=[(0,0,0),(0,0,205),(205,0,0),(205,0,205),(0,205,0),(0,205,205),(205,205,0),(205,205,205)]
cv=Image.new('RGB',(W,H))
for y in range(H):
    for x in range(W):
        a=vmap[(y>>3)*32+(x>>3)]
        cv.putpixel((x,y),ZXP[a&7] if bm[y][x] else ZXP[(a>>3)&7])
for (X,Y),zc in pcol_t.items(): cv.putpixel((X,Y),ZXP[zc])
cv.resize((768,576),Image.NEAREST).save('build/vec/title_color_preview.png')

# ================= логотип игры: цвета PICO-8 по пикселям, три плоскости =================
pcol_g={}                                # (x,y холста 256x32) -> код цвета 1..7
if os.path.exists('art/logo_game.png'):
    im=Image.open('art/logo_game.png').convert('RGBA'); assert im.size==(256,32),'art/logo_game.png должен быть 256x32'
    for y in range(32):
        for x in range(256):
            r,g,b_,al=im.getpixel((x,y))
            if al<128 or max(r,g,b_)<70 or (r>=235 and g>=235 and b_>=235): continue
            pcol_g[(x,y)]=1+nearest((r,g,b_),[PICO[k] for k in range(1,8)])
    print('логотип игры из art/logo_game.png: %d пикселей'%len(pcol_g))
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
