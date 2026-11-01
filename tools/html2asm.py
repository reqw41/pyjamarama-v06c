"""ref/asm/*.html (SkoolKit 6) -> ref/pyjamarama.lst: 'ADDR  LABEL  INSTR ; comment'"""
import re,html,glob,sys
out=[]
for f in glob.glob('ref/asm/*.html'):
    t=open(f,encoding='utf-8').read()
    d=re.search(r'<div class="description">(.*?)</div>',t,re.S)
    desc=html.unescape(re.sub(r'<[^>]+>','',d.group(1))).strip() if d else ''
    det=re.search(r'<div class="details">(.*?)</div>',t,re.S)
    det=' '.join(html.unescape(re.sub(r'<[^>]+>',' ',det.group(1))).split()) if det else ''
    rows=re.findall(r'<tr>\s*<td class="asm-label-\d">(.*?)</td>\s*<td class="address-\d"><span id="(\d+)"></span>(\w+)</td>\s*<td class="instruction">(.*?)</td>\s*<td class="comment-\d+"[^>]*>(.*?)</td>',t,re.S)
    if not rows: continue
    a0=int(rows[0][1])
    L=[f"; ===== {desc}"]
    if det: L.append("; "+det)
    for lab,_,ad,ins,com in rows:
        cl=lambda s:' '.join(html.unescape(re.sub(r'<[^>]+>','',s)).split())
        c=cl(com)
        L.append(f"{ad:>4}  {cl(lab):<40} {cl(ins):<30}"+(f" ; {c}" if c else ""))
    out.append((a0,'\n'.join(L)))
out.sort()
open('ref/pyjamarama.lst','w').write('\n\n'.join(x for _,x in out)+'\n')
print(len(out),'блоков')
