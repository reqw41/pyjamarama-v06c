#!/usr/bin/env python3
"""Логотип «Pyjamarama» из экрана C64 (build/title/c64_title.png, 320x200) -> 1 бит без дизеринга: любой нецветной-белый пиксель = чернила.
LOGO: прямоугольник x 37..287, y 106..167 (251x62) без Wally (правее x=80 выше строки 114 — белое). render(h): масштаб по высоте h — карта покрытия (BOX), порог 0,45."""
from PIL import Image
im=Image.open('build/title/c64_title.png').convert('RGB')
X0,Y0,X1,Y1=37,106,288,168
LOGO=im.crop((X0,Y0,X1,Y1))
for y in range(LOGO.height):
    for x in range(LOGO.width):
        if x+X0>=80 and y+Y0<114: LOGO.putpixel((x,y),(255,255,255))
def render(h=None):
    d=Image.new('F',LOGO.size); d.putdata([0.0 if p==(255,255,255) else 1.0 for p in LOGO.getdata()])
    if h and h!=LOGO.height:
        w=round(LOGO.width*h/LOGO.height); d=d.resize((w,h),Image.BOX)
    W,H=d.size; out=Image.new('1',(W,H),1)
    for y in range(H):
        for x in range(W):
            if d.getpixel((x,y))>=0.45: out.putpixel((x,y),0)
    return out

# ---------------------------------------------------------------------------------------------------------------------------------
# Раскладка по буквам: 11 букв «Pyjamarama!» — компоненты связности чернильных пикселей логотипа C64 (8 соседей), буква = её компоненты.
# Каждая буква масштабируется и кладётся в СВОИ ячейки 8 px (целое число колонок): цвет на букву без «отблесков» соседей.
W,H=LOGO.size
_ink=[[LOGO.getpixel((x,y))!=(255,255,255) for x in range(W)] for y in range(H)]
def _components():
    lab=[[0]*W for _ in range(H)]; comps=[]
    for y in range(H):
        for x in range(W):
            if _ink[y][x] and not lab[y][x]:
                st=[(y,x)]; lab[y][x]=1; px=[]
                while st:
                    cy,cx=st.pop(); px.append((cy,cx))
                    for dy in(-1,0,1):
                        for dx in(-1,0,1):
                            ny,nx=cy+dy,cx+dx
                            if 0<=ny<H and 0<=nx<W and _ink[ny][nx] and not lab[ny][nx]: lab[ny][nx]=1; st.append((ny,nx))
                comps.append(px)
    return comps
NAMES='P y j a m a r a m a !'.split()
def _letter_of(px):
    from collections import Counter
    col={(151,70,160):'p',(139,62,66):'r',(92,178,84):'g',(60,57,169):'b'}[Counter(LOGO.getpixel((p[1],p[0])) for p in px).most_common(1)[0][0]]
    x0=min(p[1] for p in px); x1=max(p[1] for p in px)
    if col=='p' and x0<5: return 0
    if col=='r' and x0<20: return 1
    if col=='r' and x0<=45: return 2
    if col=='g' and x1<70: return 3
    if col=='p' and 55<=x0<=70: return 4
    if col=='b' and 95<=x0<=105: return 5
    if col=='b' and 115<=x0<=120: return 6
    if col=='r' and 135<=x0<=142: return 7
    if col=='g' and x0>150: return 8
    if col=='b' and x0>=205: return 9
    if (col=='p' and x0>=220) or (col=='r' and x0>=235): return 10
    raise ValueError(('неопознанный компонент',col,x0,x1))
def letters():
    """список из 11 букв: {'id','x0','y0','mask'[h][w] (True = чернила) по ограничивающему прямоугольнику}"""
    byl={i:[] for i in range(11)}
    for px in _components(): byl[_letter_of(px)].append(px)
    out=[]
    for i in range(11):
        pts=[p for px in byl[i] for p in px]
        x0=min(p[1] for p in pts); x1=max(p[1] for p in pts); y0=min(p[0] for p in pts); y1=max(p[0] for p in pts)
        mask=[[False]*(x1-x0+1) for _ in range(y1-y0+1)]
        for y,x in pts: mask[y-y0][x-x0]=True
        out.append(dict(id=i,x0=x0,y0=y0,mask=mask,w=x1-x0+1,h=y1-y0+1))
    return out
def _scale(mask,s):
    """масштаб маски коэффициентом s по покрытию (порог 0,45)"""
    h=len(mask); w=len(mask[0]); nh=max(1,round(h*s)); nw=max(1,round(w*s))
    out=[[False]*nw for _ in range(nh)]
    for ty in range(nh):
        ya=ty/s; yb=(ty+1)/s
        for tx in range(nw):
            xa=tx/s; xb=(tx+1)/s; n=0; t=0
            for y in range(int(ya),min(h,int(yb)+1)):
                for x in range(int(xa),min(w,int(xb)+1)):
                    ow=min(xb,x+1)-max(xa,x); oh=min(yb,y+1)-max(ya,y)
                    if ow>0 and oh>0:
                        a=ow*oh; t+=a
                        if mask[y][x]: n+=a
            out[ty][tx]=t>0 and n/t>=0.45
    return out
def layout(s):
    """буквы масштаба s в ячейках по 8 px: список {'id','col0','ncols','dy','mask'}, высота логотипа (строк), число колонок"""
    ls=letters(); res=[]; col=0
    for L in ls:
        m=_scale(L['mask'],s); w=len(m[0]); ncols=(w+7)//8
        res.append(dict(id=L['id'],col0=col,ncols=ncols,dy=round(L['y0']*s),mask=m,xoff=(ncols*8-w)//2)); col+=ncols
    height=max(r['dy']+len(r['mask']) for r in res)
    return res,height,col
