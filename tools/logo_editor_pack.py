#!/usr/bin/env python3
"""Собирает art/logo_editor.html: шаблон tools/logo_editor_template.html + встроенные текущие art/logo_title.png, art/logo_game.png и картинка заставки без логотипа (контекст).
Запуск: python3 tools/logo_editor_pack.py  (после logo_export.py, если файлов в art/ ещё нет)."""
import os,sys,base64,io,json
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)),'..'))
from PIL import Image
def b64(path):
    return 'data:image/png;base64,'+base64.b64encode(open(path,'rb').read()).decode()
# контекст: заставка без логотипа (ZX-цвета с бумагой), старая надпись вырезана так же, как в mktitle.py
d=open('build/Pyjama2.bin','rb').read(); W,H=256,192
bm=[[0]*W for _ in range(H)]
for y in range(H):
    for x in range(W):
        a=((y&0xC0)<<5)|((y&7)<<8)|((y&0x38)<<2)|(x>>3); bm[y][x]=(d[a]>>(7-(x&7)))&1
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
            comps.append((len(px),min(ys),min(xs),max(ys),max(xs),px))
for n,x0,y0,x1,y1,px in comps:
    if (y0>=126 and y1>=159 and n>=40 and not (x0>=89 and y0<10)):
        for y,x in px: bm[y][x]=0
    elif (x0<=1 and y1>=165 and n>1000):
        for y,x in px:
            if y>=113: bm[y][x]=0
at=d[0x1800:0x1B00]
ZXC=[(0,0,0),(0,0,205),(205,0,0),(205,0,205),(0,205,0),(0,205,205),(205,205,0),(205,205,205)]
ctx=Image.new('RGB',(W,H))
for y in range(H):
    for x in range(W):
        a=at[(y>>3)*32+(x>>3)]
        ctx.putpixel((x,y),ZXC[a&7] if bm[y][x] else ZXC[(a>>3)&7])
ctx.save('/tmp/_ctx.png')
for f in ('art/logo_title.png','art/logo_game.png'):
    if not os.path.exists(f): sys.exit('нет %s: сначала python3 tools/logo_export.py'%f)
art=dict(title=b64('art/logo_title.png'),game=b64('art/logo_game.png'),context=b64('/tmp/_ctx.png'))
html=open('tools/logo_editor_template.html',encoding='utf-8').read().replace('/*ART*/{}',json.dumps(art))
open('art/logo_editor.html','w',encoding='utf-8').write(html)
print('art/logo_editor.html:',len(html)//1024,'КБ')
