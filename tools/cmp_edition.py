import sys,difflib
lo,hi=0x8200,0xFC97
a=open('build/lst.bin','rb').read()[lo-0x64FF:hi-0x64FF]
for name in sys.argv[1:]:
    b=open(name,'rb').read()[lo-0x4000:hi-0x4000]
    sm=difflib.SequenceMatcher(None,a,b,autojunk=False)
    ops=[o for o in sm.get_opcodes() if o[0]!='equal']
    struct=[o for o in ops if (o[2]-o[1])!=(o[4]-o[3])]
    same=sum(1 for x,y in zip(a,b) if x==y)
    print(name,'байт равно позиционно',same,'из',len(a),'| правок',len(ops),'| со сдвигом длины',len(struct))
