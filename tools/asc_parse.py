import struct,sys
D=open("ref/popcorn.asc","rb").read()
tempo,loop=D[0],D[1]
PO,SO,OO=struct.unpack("<HHH",D[2:8]); ln=D[8]; pos=list(D[9:9+ln])
def chan(off):
    """возвращает список событий: (тип,знач) до 0xff"""
    i=off; ev=[]; env=False
    while True:
        c=D[i]; i+=1
        if c==0xff: break
        if c<=0x55:
            ev.append(("note",c,D[i] if env else None))
            if env: i+=1
        elif c<=0x5d: ev.append(("stop",0))
        elif c==0x5e: ev.append(("brk",0))
        elif c==0x5f: ev.append(("rest",0))
        elif c<=0x9f: ev.append(("skip",c-0x60))
        elif c<=0xbf: ev.append(("smp",c-0xa0))
        elif c<=0xdf: ev.append(("orn",c-0xc0))
        elif c==0xe0: env=True; ev.append(("vol",15,"env"))
        elif c<=0xef: env=False; ev.append(("vol",c-0xe0))
        elif c==0xf0: ev.append(("noise",D[i])); i+=1
        elif c<=0xf3: ev.append(("cont",c&3))
        elif c==0xf4: ev.append(("tempo",D[i])); i+=1
        elif c in(0xf5,0xf6,0xf7,0xf9): ev.append(("gl",c,D[i])); i+=1
        elif c in(0xf8,0xfa,0xfc,0xfe): ev.append(("envt",c&15))
        elif c==0xfb: ev.append(("vslide",D[i])); i+=1
        else: ev.append(("?",c))
    return ev
if __name__=="__main__":
    print(tempo,loop,hex(PO),hex(SO),hex(OO),ln,pos)
    npat=max(pos)+1
    for p in range(npat):
        ws=struct.unpack("<3H",D[PO+p*6:PO+p*6+6])
        out=[]
        for w in ws:
            ev=chan(PO+w)
            h1=sum(1 for e in ev if e[0] in("note","stop","rest","skip"))
            n=sum(1 for e in ev if e[0] in("note","stop","rest"))
            sk=sum(e[1]+1 for e in ev if e[0]=="skip")
            out.append((len(ev),n,sk,sorted(set(e[0] for e in ev))))
        print(p,out)
