"""Заставка: общие функции. Исходник — ZX-экран idpixel (ref/idpixel/pyjamarama_63.png, x4) -> индексы цветов ZX 0..7 на пиксель (256x192)."""
from PIL import Image, ImageDraw
def load_zx(path='ref/idpixel/pyjamarama_63.png'):
    im=Image.open(path).convert('RGB')
    def hue(c): return (1 if c[2]>100 else 0)|(2 if c[0]>100 else 0)|(4 if c[1]>100 else 0)
    return [[hue(im.getpixel((x*4+1,y*4+1))) for x in range(256)] for y in range(192)]
ZXRGB=[(0,0,0),(0,0,255),(255,0,0),(255,0,255),(0,255,0),(0,255,255),(255,255,0),(255,255,255)]
def render(px,pal,scale=1,box=None,grid=0):
    x0,y0,x1,y1=box or (0,0,256,192)
    im=Image.new('RGB',((x1-x0)*scale,(y1-y0)*scale))
    d=im.load()
    for y in range(y0,y1):
        for x in range(x0,x1):
            c=pal[px[y][x]]
            for sy in range(scale):
                for sx in range(scale): d[(x-x0)*scale+sx,(y-y0)*scale+sy]=c
    if grid:
        dr=ImageDraw.Draw(im)
        for x in range((x0//grid+1)*grid,x1,grid): dr.line([((x-x0)*scale,0),((x-x0)*scale,6)],fill=(255,255,255)); dr.text(((x-x0)*scale+2,6),str(x),fill=(255,255,255))
        for y in range((y0//grid+1)*grid,y1,grid): dr.line([(0,(y-y0)*scale),(6,(y-y0)*scale)],fill=(255,255,255)); dr.text((8,(y-y0)*scale-4),str(y),fill=(255,255,255))
    return im
