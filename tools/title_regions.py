"""Области заставки: контур (код 0) утолщается, остальное делится на связные области; печатает самые большие и рисует карту номеров."""
import sys,pickle;sys.path.insert(0,'tools')
from title_lib import *
from PIL import ImageDraw,Image
from collections import Counter
px=load_zx()
H,W=192,256
ol=[[px[y][x]==0 for x in range(W)] for y in range(H)]
D=int(sys.argv[1]) if len(sys.argv)>1 else 1
thick=[[False]*W for _ in range(H)]
for y in range(H):
    for x in range(W):
        if ol[y][x]:
            for dy in range(-D,D+1):
                for dx in range(-D,D+1):
                    if 0<=y+dy<H and 0<=x+dx<W: thick[y+dy][x+dx]=True
lab=[[-1]*W for _ in range(H)];comps=[]
for y in range(H):
    for x in range(W):
        if not thick[y][x] and lab[y][x]<0:
            i=len(comps);st=[(x,y)];lab[y][x]=i;pts=[]
            while st:
                cx,cy=st.pop();pts.append((cx,cy))
                for dx,dy in((1,0),(-1,0),(0,1),(0,-1)):
                    nx,ny=cx+dx,cy+dy
                    if 0<=nx<W and 0<=ny<H and not thick[ny][nx] and lab[ny][nx]<0:
                        lab[ny][nx]=i;st.append((nx,ny))
            comps.append(pts)
# утолщённые пиксели контура, не чёрные, приписываем ближайшей области (4 прохода)
for _ in range(D+1):
    new=[r[:] for r in lab]
    for y in range(H):
        for x in range(W):
            if lab[y][x]<0 and not ol[y][x]:
                for dx,dy in((1,0),(-1,0),(0,1),(0,-1)):
                    nx,ny=x+dx,y+dy
                    if 0<=nx<W and 0<=ny<H and lab[ny][nx]>=0: new[y][x]=lab[ny][nx];break
    lab=new
pickle.dump((lab,len(comps)),open('/tmp/regions.pkl','wb'))
sizes=sorted(((len(p),i) for i,p in enumerate(comps)),reverse=True)
print('областей',len(comps),'крупных (>=60 пикс.)',sum(1 for n,i in sizes if n>=60))
im=Image.new('RGB',(W*4,H*4),(255,255,255))
import random;random.seed(3)
cols={}
for n,i in sizes:
    cols[i]=(random.randint(90,255),random.randint(90,255),random.randint(90,255))
for y in range(H):
    for x in range(W):
        c=(0,0,0) if ol[y][x] else (cols[lab[y][x]] if lab[y][x]>=0 else (40,40,40))
        for sy in range(4):
            for sx in range(4): im.putpixel((x*4+sx,y*4+sy),c)
d=ImageDraw.Draw(im)
for rank,(n,i) in enumerate(sizes[:70]):
    xs=[p[0] for p in comps[i]];ys=[p[1] for p in comps[i]]
    cx,cy=sum(xs)//len(xs),sum(ys)//len(ys)
    # центр, лежащий внутри области
    best=min(comps[i],key=lambda p:(p[0]-cx)**2+(p[1]-cy)**2)
    d.text((best[0]*4-6,best[1]*4-4),str(rank),fill=(0,0,0))
im.save('/tmp/shots/regions.png')
pickle.dump([(len(p)) for p in comps],open('/tmp/regsz.pkl','wb'))
for rank,(n,i) in enumerate(sizes[:70]):
    c=Counter(px[y][x] for x,y in comps[i])
    print(rank,i,n,dict(c.most_common(3)))
