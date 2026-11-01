import re,sys
b=open('build/ram.bin','rb').read()  # с 0x4000
ok=bad=0;first=[]
for l in open('ref/pyjamarama.lst'):
    m=re.match(r'([0-9A-F]{4})\s+(?:\S+\s+)?DEFB (.*?)(?: ;|$)',l)
    if not m: continue
    a=int(m.group(1),16)
    vals=[int(x.strip().lstrip('$'),16) for x in m.group(2).split(',') if re.fullmatch(r'\s*\$[0-9A-F]+\s*',x)]
    for i,v in enumerate(vals):
        o=a+i-0x4000
        if b[o]==v: ok+=1
        else:
            bad+=1
            if len(first)<8: first.append((hex(a+i),hex(v),hex(b[o])))
print('совпало',ok,'нет',bad,first)
