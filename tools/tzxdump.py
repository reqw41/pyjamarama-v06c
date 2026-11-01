import sys,struct
d=open(sys.argv[1],'rb').read(); out=sys.argv[2] if len(sys.argv)>2 else None
assert d[:7]==b'ZXTape!'; i=10; k=0
while i<len(d):
    t=d[i]; i+=1
    if t==0x10: n=struct.unpack('<H',d[i+2:i+4])[0]; b=d[i+4:i+4+n]; i+=4+n; kind='std'
    elif t==0x11: n=int.from_bytes(d[i+15:i+18],'little'); b=d[i+18:i+18+n]; i+=18+n; kind='turbo'
    elif t==0x14: n=int.from_bytes(d[i+7:i+10],'little'); b=d[i+10:i+10+n]; i+=10+n; kind='pure'
    elif t==0x12: i+=4; continue
    elif t==0x13: i+=1+2*d[i]; continue
    elif t in (0x24,0x23): i+=2; continue
    elif t in (0x25,0x22): continue
    elif t==0x2A: i+=4; continue
    elif t==0x20: i+=2; continue
    elif t==0x21: i+=1+d[i]; continue
    elif t==0x30: i+=1+d[i]; continue
    elif t==0x32: i+=2+struct.unpack('<H',d[i:i+2])[0]; continue
    elif t==0x35: i+=20+struct.unpack('<I',d[i+16:i+20])[0]; continue
    else: print('блок',hex(t),'?'); break
    info=''
    if b and b[0]==0 and len(b)==19: info=f"hdr type={b[1]} name={b[2:12]!r} len={int.from_bytes(b[12:14],'little')} p1={int.from_bytes(b[14:16],'little')}"
    print(k,kind,hex(t),len(b),'flag',b[0] if b else None,info)
    if out: open(f"{out}_{k}.bin",'wb').write(b)
    k+=1
