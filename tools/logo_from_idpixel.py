#!/usr/bin/env python3
"""Русский логотип «Пижамарама!» из загрузочного экрана ZX с idpixel.ru (ref/idpixel/pyjamarama_47_zoom4.png, 1024x768 = ZX 256x192 x4).
Пишет art/logo_title_ru.png (256x64, заставка: левый верх = экран (0,120); буквы сдвинуты на 8 строк вверх — под надпись «НАЖМИТЕ…» на строке 23) и
art/logo_game_ru.png (256x32, нижняя полоса игры: масштаб по покрытию, цвета ZX -> PICO-8)."""
import os,sys
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)),'..'))
from PIL import Image
im=Image.open('ref/idpixel/pyjamarama_47_zoom4.png').convert('RGB')
W,H=256,192
ZXC={'r':(205,0,0),'m':(205,0,205),'g':(0,205,0),'b':(0,0,205)}
PICO={'m':(182,109,255),'r':(255,0,77),'g':(0,228,54),'b':(41,173,255)}
ALL={(0,0,205):'b',(205,0,0):'r',(205,0,205):'m',(0,205,0):'g',(0,205,205):'c',(205,205,0):'y',(0,0,0):'k',(205,205,205):'.'}
def cls(p): return ALL[min(ALL,key=lambda k:sum((a-b)**2 for a,b in zip(k,p)))]
c=[[cls(im.getpixel((x*4+2,y*4+2))) for x in range(W)] for y in range(H)]
# компоненты цветных пикселей y>=120; пижама героя (красная, начинается выше y=130) исключается
seen=set(); letters=[]
for y in range(120,H):
    for x in range(W):
        if c[y][x] in 'rmgb' and (x,y) not in seen:
            st=[(x,y)]; seen.add((x,y)); pts=[]
            while st:
                cx,cy=st.pop(); pts.append((cx,cy))
                for dx in(-1,0,1):
                    for dy in(-1,0,1):
                        nx,ny=cx+dx,cy+dy
                        if 0<=nx<W and 120<=ny<H and (nx,ny) not in seen and c[ny][nx] in 'rmgb': seen.add((nx,ny)); st.append((nx,ny))
            ymin=min(p[1] for p in pts); ymax=max(p[1] for p in pts); xmin=min(p[0] for p in pts)
            if ymin>=125 and len(pts)>8 and not (ymax<158 and xmin<225): letters+= [(p,c[p[1]][p[0]]) for p in pts]     # без кусков пижамы героя
ys=[p[1] for p,_ in letters]; y0=min(ys); y1=max(ys)
SHIFT=8                                        # вверх, чтобы низ букв не заходил на строку надписи (y>=184)
title=Image.new('RGBA',(256,64),(255,255,255,0))
mask={}
for (x,y),k in letters:
    cy=y-120-SHIFT
    if 0<=cy<64: title.putpixel((x,cy),ZXC[k]+(255,)); mask[(x,cy)]=k
title.save('art/logo_title_ru.png')
# игра: уменьшение до 28 строк по покрытию (порог 0,45), цвет — преобладающий в блоке
rows=[cy for _,cy in mask]; r0=min(rows); r1=max(rows); h=r1-r0+1; sc=28/h
xs=[x for x,_ in mask]; x0=min(xs); x1=max(xs); w=x1-x0+1; nw=round(w*sc)
game=Image.new('RGBA',(256,32),(0,0,0,0))
from collections import Counter
for ty in range(28):
    for tx in range(nw):
        xa,xb=x0+tx/sc,x0+(tx+1)/sc; ya,yb=r0+ty/sc,r0+(ty+1)/sc
        n=0;t=0;cn=Counter()
        for yy in range(int(ya),int(yb)+1):
            for xx in range(int(xa),int(xb)+1):
                ow=min(xb,xx+1)-max(xa,xx); oh=min(yb,yy+1)-max(ya,yy)
                if ow>0 and oh>0:
                    a=ow*oh; t+=a
                    if (xx,yy) in mask: n+=a; cn[mask[(xx,yy)]]+=a
        if t and n/t>=0.45: game.putpixel(((256-nw)//2+tx,2+ty),PICO[cn.most_common(1)[0][0]]+(255,))
game.save('art/logo_game_ru.png')
print('логотип: строки экрана %d..%d (%d), %d пикселей; игра: %dx28'%(y0,y1,y1-y0+1,len(mask),nw))
