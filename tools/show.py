import sys,re
a=int(sys.argv[1],16);b=int(sys.argv[2],16);w=int(sys.argv[3]) if len(sys.argv)>3 else 130
for l in open('build/code.txt'):
    m=re.match(r'([0-9A-F]{4}) ',l)
    if m:
        v=int(m.group(1),16)
        if a<=v<b: print(l.rstrip()[:w])
    elif l.startswith('; =====') and a<=int(l[8:12],16)<b: print(l.rstrip()[:w])
