#!/usr/bin/env python3
"""Заготовки логотипа «Pyjamarama!» для ручной правки в любом растровом редакторе (Aseprite, GIMP, Photoshop, Krita...).
  python3 tools/logo_export.py [c64|layout]
    c64    (по умолчанию) — логотип C64 как есть: слитные буквы, цвета букв C64 переведены в цвета ZX (заставка) и игры;
    layout — текущая раскладка по буквам (раздельные буквы).
Пишет art/logo_title.png (256x64, заставка: левый верх на экране = (0,120); строка надписи «PRESS A KEY…» ниже, y=184..191) и art/logo_game.png (256x32, нижняя полоса игры 1:1),
плюс art/logo_*_guide.png (сетка ячеек 8x8 — только для просмотра; в сборке НЕ участвуют).
Правила и сборка — art/README.md. Файлы art/logo_title.png и art/logo_game.png, если существуют, заменяют генератор в tools/mktitle.py."""
import sys,os
sys.path.insert(0,os.path.join(os.path.dirname(__file__)))
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)),'..'))
from PIL import Image,ImageDraw
from mklogo import LOGO,render,layout,letters,_scale
mode=sys.argv[1] if len(sys.argv)>1 else 'c64'
ZXC=[(0,0,0),(0,0,205),(205,0,0),(205,0,205),(0,205,0),(0,205,205),(205,205,0)]
PICO={1:(255,236,39),2:(255,0,77),3:(41,173,255),4:(0,228,54),5:(182,109,255),6:(255,182,0),7:(219,146,85)}
C64ZX={(151,70,160):3,(139,62,66):2,(92,178,84):4,(60,57,169):1}          # C64 цвета -> ZX ink
C64G={(151,70,160):5,(139,62,66):2,(92,178,84):4,(60,57,169):3}           # -> коды игры
ZXINK=[3,2,1,4,3,1,2,4,3,1,2]; GAMEV=[5,2,1,4,6,3,7,4,5,2,1]
os.makedirs('art',exist_ok=True)
title=Image.new('RGBA',(256,64),(255,255,255,0)); game=Image.new('RGBA',(256,32),(0,0,0,0))
if mode=='c64':
    ox=(256-LOGO.width)//2; oy=64-LOGO.height-1                      # 251x62: бок о бок, низ на строке 62 холста
    for y in range(LOGO.height):
        for x in range(LOGO.width):
            c=LOGO.getpixel((x,y))
            if c in C64ZX: title.putpixel((x+ox,y+oy),ZXC[C64ZX[c]]+(255,))
    # игра: масштаб 0,45 по покрытию, цвет — C64, по центру полосы
    h=28; sc=h/LOGO.height; w=round(LOGO.width*sc)
    ink=render(h)
    # цвет пикселя малого = цвет ближайшего исходного
    for y in range(h):
        for x in range(w):
            if ink.getpixel((x,y))==0:
                sx=min(LOGO.width-1,int((x+0.5)/sc)); sy=min(LOGO.height-1,int((y+0.5)/sc)); c=LOGO.getpixel((sx,sy))
                if c not in C64G:
                    # ближайший непустой исходный пиксель
                    best=None
                    for dy in range(-3,4):
                        for dx in range(-3,4):
                            yy=sy+dy; xx=sx+dx
                            if 0<=yy<LOGO.height and 0<=xx<LOGO.width and LOGO.getpixel((xx,yy)) in C64G: best=LOGO.getpixel((xx,yy)); break
                        if best: break
                    c=best
                if c in C64G: game.putpixel(((256-w)//2+x,2+y),PICO[C64G[c]]+(255,))
else:
    LS,LH,LC=layout(0.7); START=(32-LC)//2; TOP=64-LH-1
    for L in LS:
        for y,row in enumerate(L['mask']):
            for x,v in enumerate(row):
                if v: title.putpixel(((START+L['col0'])*8+L['xoff']+x,TOP+L['dy']+y),ZXC[ZXINK[L['id']]]+(255,))
    SS,SHH,SC=layout(0.45)
    for L in SS:
        for y,row in enumerate(L['mask']):
            for x,v in enumerate(row):
                if v: game.putpixel((((32-SC)//2+L['col0'])*8+L['xoff']+x,2+L['dy']+y),PICO[GAMEV[L['id']]]+(255,))
title.save('art/logo_title.png'); game.save('art/logo_game.png')
def guide(im,bg,name,scale):
    g=Image.new('RGB',im.size,bg); g.paste(im,(0,0),im)
    g=g.resize((im.width*scale,im.height*scale),Image.NEAREST); d=ImageDraw.Draw(g)
    for x in range(0,im.width+1,8): d.line((x*scale,0,x*scale,g.height),fill=(120,120,120) if x%64 else (255,0,0))
    for y in range(0,im.height+1,8): d.line((0,y*scale,g.width,y*scale),fill=(120,120,120))
    g.save(name)
guide(title,(255,255,255),'art/logo_title_guide.png',4); guide(game,(36,36,85),'art/logo_game_guide.png',4)
print('записано: art/logo_title.png (256x64), art/logo_game.png (256x32) и *_guide.png; режим',mode)
