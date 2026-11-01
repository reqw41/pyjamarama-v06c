"""ref/pyjamarama.lst -> build/lst.asm (sjasmplus) -> build/lst.bin: проверка дизассемблирования luny бит-в-бит"""
import re
out=["        DEVICE ZXSPECTRUM48"]
for l in open('ref/pyjamarama.lst'):
    l=l.rstrip('\n')
    if l.startswith(';') or not l.strip(): continue
    m=re.match(r'([0-9A-F]{4}) (.{40}) (.*)',l)
    if not m: continue
    ad,lab,ins=m.group(1),m.group(2).strip(),m.group(3).split(' ; ')[0].strip()
    ins=ins.replace('A=ATTR(pixel_HY, pixel_LX)','GetAttr'); ins=re.sub(r'\$([0-9A-Fa-f]+)',r'0x\1',ins)
    out.append(f"        ORG 0x{ad}")
    if lab=='A=ATTR(pixel_HY, pixel_LX)': lab='GetAttr'
    if re.fullmatch(r'[A-Za-z_]\w*',lab): out.append(f"{lab}:")
    out.append("        "+ins.rstrip(','))
out.append('        SAVEBIN "build/lst.bin",0x64FF,0x9B01')
open('build/lst.asm','w').write('\n'.join(out)+'\n')
