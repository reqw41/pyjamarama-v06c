import sys;sys.path.insert(0,'tools')
from title_lib import *
import importlib.util
def load(p):
    sp=importlib.util.spec_from_file_location('m',p); m=importlib.util.module_from_spec(sp); sp.loader.exec_module(m); return m
PAL=load('art/title/palette.py').PAL
FIX=load('art/title/fixes.py')
x0,y0,x1,y1,sc=map(int,sys.argv[1:6]); out=sys.argv[6]
px=FIX.apply(load_zx())
render(px,PAL,sc,(x0,y0,x1,y1),10).save(out)
