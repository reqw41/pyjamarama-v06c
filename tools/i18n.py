"""Локализация образа данных (используется tools/mkvecdata.py): разбор и пересборка строк игры, шрифт кириллицы.
Формат строки (ZX): байты < 0x80 — тайлы (текст), 0xFE c — цвет, 0xFC dx dy — смещение курсора (знаковые), 0xFB lo hi — база тайлов, 0x80|n, t — n раз тайл t, 0xFF — конец."""
import importlib.util,os
def load(lang):
    if lang=='en': return None
    p=os.path.join(os.path.dirname(__file__),'..','i18n',lang+'.py')
    spec=importlib.util.spec_from_file_location('i18n_'+lang,p); m=importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m
def parse(img,off):
    """-> (токены, число байт); off — индекс в img"""
    p=off; toks=[]; txt=bytearray()
    def flush():
        nonlocal txt
        if txt: toks.append(('T',bytes(txt))); txt=bytearray()
    while True:
        c=img[p]; p+=1
        if c<0x80: txt.append(c); continue
        flush()
        if c==0xFF: toks.append(('FF',)); break
        if c==0xFE: toks.append(('FE',img[p])); p+=1
        elif c==0xFC:
            sx=lambda v:v-256 if v>127 else v
            toks.append(('FC',sx(img[p]),sx(img[p+1]))); p+=2
        elif c==0xFB: toks.append(('FB',img[p]|img[p+1]<<8)); p+=2
        else: toks.append(('R',c,img[p],img[p+1])); p+=2
    return toks,p-off
def encode(toks):
    out=bytearray()
    for t in toks:
        k=t[0]
        if k=='T': out+=t[1]
        elif k=='FF': out.append(0xFF)
        elif k=='FE': out+=bytes([0xFE,t[1]])
        elif k=='FC': out+=bytes([0xFC,t[1]&255,t[2]&255])
        elif k=='FB': out+=bytes([0xFB,t[1]&255,t[1]>>8])
        elif k=='R': out+=bytes([t[1],t[2],t[3]])
    return bytes(out)
def enc_text(s,CODE):
    try: return bytes(CODE[c] for c in s)
    except KeyError as e: raise SystemExit('i18n: нет символа %r в таблице кодов (текст %r)'%(e.args[0],s))
def replace_texts(toks,repl,CODE):
    """замена текстовых кусков по порядку: repl[i] = 'текст' | (текст, сдвиг) | None; следующий за куском FC корректируется, чтобы остальное осталось на местах"""
    out=[]; i=0; delta=0; pend=0
    for t in toks:
        if t[0]=='T':
            r=repl[i] if i<len(repl) else None; i+=1
            if r is None: out.append(t); delta=0; continue
            text,shift=(r,0) if isinstance(r,str) else r
            nb=enc_text(text,CODE)
            if shift: out.append(('FC',shift,0))
            out.append(('T',nb)); delta=len(t[1])-len(nb)-shift      # на сколько надо сдвинуть следующий FC
            continue
        if t[0]=='FC' and delta:
            out.append(('FC',t[1]+delta,t[2])); delta=0; continue
        out.append(t)
    if i<len(repl) and any(x is not None for x in repl[i:]): raise SystemExit('i18n: замен больше, чем текстовых кусков (%d > %d)'%(len(repl),i))
    return out
def lines_to_toks(lines,CODE):
    out=[]; 
    for k,l in enumerate(lines):
        nb=enc_text(l,CODE)
        if k: out.append(('FC',-len(prev),1))
        out.append(('T',nb)); prev=nb
    out.append(('FF',)); return out
def patch_font(img,tile_off,GLYPHS,CODE):
    for ch,rows in GLYPHS.items():
        assert len(rows)==8 and all(len(r)==8 for r in rows),ch
        o=tile_off+CODE[ch]*8
        for k,r in enumerate(rows): img[o+k]=int(r.replace('#','1').replace('.','0'),2)
