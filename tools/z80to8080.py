#!/usr/bin/env python3
"""Pyjamarama V1: ref/pyjamarama.lst + build/v1/ram.bin -> build/vec/game_z80.asm (Z80-исходник) -> build/vec/game.asm (i8080).
Перевод Z80->i8080 делает ядро tools/vendor/z80_to_8080.py (kvalley-v06c / knightlore-v06c, публичные порты); этот скрипт только готовит исходник:
 * код (кроме заменяемого примитивами и защиты) собирается в один блок с ORG CODE_BASE; данные остаются на своих адресах ZX (этап 1: сверка);
 * данные — байты из снимка V1, слова-указатели с метками остаются символьными (код переезжает);
 * литералы-адреса получают символьные выражения (ADDR_LIT), `LD D,$58` -> ATTR>>8 (карта атрибутов), порты IN/OUT -> вызовы glue.
Запуск: python3 tools/z80to8080.py [CODE_BASE hex]   (затем sjasmplus --i8080 build/vec/game.asm)"""
import re,sys,pathlib
sys.path.insert(0,str(pathlib.Path(__file__).parent/'vendor'))
import z80_to_8080 as TR
RAM=open('build/v1/ram.bin','rb').read()          # с 0x4000
def byte(a): return RAM[a-0x4000]
CODE_BASE=int(sys.argv[1],16) if len(sys.argv)>1 else 0x0100

# не переводим: заменено примитивами Вектора / защита / (фронт переводим целиком)
SKIP=[(0xAAEE,0xAB54),(0xC115,0xC156),(0xC157,0xC19F),(0xC0B1,0xC114),(0xAFBE,0xAFE8),(0xAFEB,0xB016),(0x83C2,0x83E6),(0xE4CE,0xE4F3),(0xE230,0xE27C),
      (0xBEE1,0xBF07),(0xFC97,0xFCAC),(0x8200,0x820D)]
def skipped(a): return any(lo<=a<=hi for lo,hi in SKIP)
ADDR_LIT={0xF188:'IsArcadeMode+1',0xF18A:'Wally_HeadTurned+1',0xF18B:'Wally_HeadTurned+2',0xAE35:'Wally_BgColour+10',0xAE38:'Wally_BgColour+13',
  0x9079:'DF_lookup+14',0x91DD:'DF_lookup+0x172',0xEF70:'Dart_Bmp+1',0xC147:'TileStartPtr+1',0x5988:'ATTR+0x188',0x58A0:'ATTR+0xA0',0x5A8D:'ATTR+0x28D',
  0xE1E0:'FD_call_single+1',0xE1D8:'FD_call_repeat+1'}
EXTRA_LABEL={0xE1DF:'FD_call_single',0xE1D7:'FD_call_repeat'}
# `LD D,$58` — старший байт карты атрибутов (проверено по списку мест)
ATTR_HI_SITES=None

items=[]
for l in open('ref/pyjamarama.lst',encoding='utf-8'):
    m=re.match(r'([0-9A-F]{4})  (.{40}) (\S+)\s*(.*)',l.rstrip('\n'))
    if not m: continue
    ad,lab,mn,rest=m.groups()
    ops,_,com=rest.partition(' ;')
    items.append((int(ad,16),lab.strip(),mn,ops.strip(),com.strip()))
def fixlab(l): return re.sub(r'[^A-Za-z0-9_]','_',l)
labels={a:fixlab(l) for a,l,_,_,_ in items if l and not l.startswith('A=ATTR')}
labels[0xC093]='GetAttr'
labels[0xE5CB]='Str_Full';labels[0xE5D0]='Str_Empty'
EXTRA_LABEL_LINES=EXTRA_LABEL

def expr(s):
    s=s.replace('A=ATTR(pixel_HY, pixel_LX)','GetAttr')
    return re.sub(r'\$([0-9A-Fa-f]+)',r'0x\1',s)
def operand_fix(mn,ops):
    # одиночный 16-битный литерал-адрес
    m=re.fullmatch(r'(.*?)\$([0-9A-Fa-f]{4})(.*)',ops)
    def sub16(txt):
        def f(mo):
            v=int(mo.group(1),16)
            return ADDR_LIT.get(v,'0x'+mo.group(1))
        return re.sub(r'\$([0-9A-Fa-f]{4})\b',f,txt)
    t=sub16(ops)
    t=t.replace('A=ATTR(pixel_HY, pixel_LX)','GetAttr').replace('"FULL"','Str_Full').replace('"EMPTY"','Str_Empty')
    t=re.sub(r'\$([0-9A-Fa-f]+)',r'0x\1',t)
    if mn=='LD' and t=='D,0x58': t='D,ATTR>>8'
    return t
def split_ops(s):
    out=[];depth=0;cur=''
    for ch in s:
        if ch=='(':depth+=1
        if ch==')':depth-=1
        if ch==',' and depth==0: out.append(cur.strip());cur=''
        else: cur+=ch
    if cur.strip(): out.append(cur.strip())
    return out

code=[]
for addr,lab,mn,ops,com in items:
    if mn.startswith('DEF') or skipped(addr): continue
    if mn=='IN':
        port=split_ops(ops)[1]; code.append((addr,'CALL io_in_fe' if port=='($FE)' else 'CALL io_in_1f' if port=='($1F)' else 'ERR')); continue
    if mn=='OUT': code.append((addr,'CALL io_out_fe')); continue
    if mn=='IM': continue
    ops2=operand_fix(mn,ops)
    code.append((addr,(mn+' '+ops2).strip()))

L=[ '; Z80-исходник Pyjamarama V1 для переводчика (сгенерировано tools/z80to8080.py)']
for addr,txt in code:
    if addr in labels: L.append(labels[addr]+':')
    if addr in EXTRA_LABEL: L.append(EXTRA_LABEL[addr]+':')
    L.append('\t'+txt.lower() if False else '\t'+txt)
z80_src='\n'.join(L)

# данные
dat=[];lastend=None;symwords=[]
for idx,(addr,lab,mn,ops,com) in enumerate(items):
    if mn not in('DEFB','DEFW','DEFM') or addr<0x7A75 or addr==0x64FF: continue
    nxt=items[idx+1][0] if idx+1<len(items) else addr+len(split_ops(ops))
    n=nxt-addr
    if n<=0: continue
    out=[]
    if lastend!=addr: out.append(f'\tORG 0x{addr:04X}')
    if addr in labels: out.append(labels[addr]+':')
    if mn=='DEFW' and re.search(r'[A-Za-z_]',ops):
        out.append('\tDW '+', '.join(operand_fix('DW',x) for x in split_ops(ops)))
        for i,x in enumerate(split_ops(ops)):
            if re.search(r'[A-Za-z_]',x): symwords.append((addr+2*i,operand_fix('DW',x)))
    else:
        out.append('\tDB '+', '.join(f'0x{byte(addr+i):02X}' for i in range(n)))
    dat.extend(out); lastend=addr+n

pathlib.Path('build/vec').mkdir(parents=True,exist_ok=True)
open('build/vec/game_z80.asm','w').write(z80_src+'\n')
i8=TR.translate(z80_src)
hdr=f"""; build/vec/game.asm — сгенерировано tools/z80to8080.py (не править). CODE_BASE=0x{CODE_BASE:04X}
\tDEVICE NOSLOT64K
ATTR\tEQU 0x5800
\tORG 0x0080\n\tINCLUDE "../../src/vec/z80rt.asm"
TitleScreenBuffer\tEQU 0x64FF
\tORG 0x{CODE_BASE:04X}
"""
open('build/vec/game.asm','w').write(hdr+i8+'\n\tINCLUDE "../../src/vec/prims.asm"\n\n'+'\n'.join(dat)+'\n\tSAVEBIN "game.bin",0,0x10000\n')
import json
json.dump(symwords,open('build/vec/symwords.json','w'))
print('Z80-исходник',len(L),'строк; i8080',len(i8.split('\n')),'строк')
