#!/usr/bin/env python3
"""Образ данных Pyjamarama для Вектора: ZX 0x8200..0xFC9F -> с 0x0100 подряд без кусков кода ZX (карта сегментов в reloc.json), указатели пересчитаны.
Выход: build/vec/data.bin (с адреса 0x0100), src/vec/zxsym.inc (метки данных: Label EQU native), build/vec/reloc.json (для стенда сверки).
Источник байт — снимок V1 (build/v1/ram.bin); код ZX в образ не попадает; таблицы указателей на КОД (Test*/Action*/Update_Room*) — нулями (их строит нативный код)."""
import re,json,sys,os
sys.path.insert(0,'tools')
import i18n
LO=0x8200; HI0=0xFCA0
VBASE=0x10000; HI=VBASE+0x2000       # виртуальная область новых строк перевода: ZX-адреса >= 0x10000 (только внутри этого скрипта)
PJ_LANG=os.environ.get('PJ_LANG','ru')
RAM=open('build/v1/ram.bin','rb').read()
def zb(a): return RAM[a-0x4000]
items=[]
for l in open('ref/pyjamarama.lst',encoding='utf-8'):
    m=re.match(r'([0-9A-F]{4})  (.{40}) (\S+)\s*(.*)',l.rstrip('\n'))
    if m: items.append((int(m.group(1),16),m.group(2).strip(),m.group(3),m.group(4).split(' ;')[0].strip()))
def fixlab(s): return re.sub(r'[^A-Za-z0-9_]','_',s)
labaddr={}; datalab={}
for a,lab,mn,ops in items:
    if lab and not lab.startswith('A=ATTR'):
        labaddr[lab]=a
        if mn.startswith('DEF'): datalab[lab]=a
img=bytearray(HI-LO)
for a in range(LO,HI):
    img[a-LO]=0
# байты данных
for i,(a,lab,mn,ops) in enumerate(items):
    if not mn.startswith('DEF') or not (LO<=a<HI0): continue
    n=(items[i+1][0] if i+1<len(items) else HI0)-a
    for k in range(n):
        if a+k<HI0: img[a+k-LO]=zb(a+k)
# --- уплотнение: куски кода ZX (не DEF) в образ не попадают, данные идут подряд; карта сегментов ZX -> Вектор ---
cov=bytearray(HI-LO)
for i,(a,lab,mn,ops) in enumerate(items):
    if not mn.startswith('DEF') or not (LO<=a<HI0): continue
    n=(items[i+1][0] if i+1<len(items) else HI0)-a
    for k in range(n):
        if a+k<HI0: cov[a+k-LO]=1
# --- перевод: новые строки — в виртуальную область [VBASE..), старые строки выбрасываются (уплотнение), таблицы указателей переопределяются при пересчёте ---
OVR={}                                  # (адрес таблицы ZX, индекс) -> виртуальный адрес новой строки
TITLE_DE=0x1704
vcur=VBASE
def place(data):
    global vcur
    a=vcur; img[a-LO:a-LO+len(data)]=data; cov[a-LO:a-LO+len(data)]=b'\x01'*len(data); vcur+=len(data); return a
def drop(a):                         # старая строка: обнулить и вывести из образа
    toks,n=i18n.parse(img,a-LO)
    for k in range(n): img[a-LO+k]=0; cov[a-LO+k]=0
    return toks
if PJ_LANG!='en':
    T=i18n.load(PJ_LANG); CODE=T.CODE
    def tbl(nm,n): return labaddr[nm],n
    # 1) предметы (ObjectTextPtrTable, 28 штук)
    ot=labaddr['ObjectTextPtrTable']
    for k,txt in enumerate(T.OBJECTS):
        old=img[ot-LO+2*k]|img[ot-LO+2*k+1]<<8; drop(old)
        OVR[(0xE48E,k)]=place(i18n.encode(i18n.lines_to_toks(txt.split('|'),CODE)))
    for k,txt in enumerate(T.OBJECTS_ALT):       # «пустые» названия — метки Obj_Alt0..2 (obj_text в room.asm, IFDEF OBJ_ALT)
        a=place(i18n.encode(i18n.lines_to_toks(txt.split('|'),CODE))); datalab['Obj_Alt%d'%k]=a
    # 2) мебель (FurniturePtrTable, индексы из i18n)
    ft=labaddr['FurniturePtrTable']; olds=[img[ft-LO+2*k]|img[ft-LO+2*k+1]<<8 for k in range(66)]
    for k,repl in T.FURNITURE.items():
        old=olds[k]; assert olds.count(old)==1,'строка мебели %d разделяется'%k
        toks=drop(old); OVR[(0x8CAA,k)]=place(i18n.encode(i18n.replace_texts(toks,repl,CODE)))
    # 3) именованные строки (ссылки из нативного кода по меткам)
    for nm,repl in T.STRINGS.items():
        old=labaddr[nm]; toks=drop(old); a=place(i18n.encode(i18n.replace_texts(toks,repl,CODE)))
        labaddr[nm]=a; datalab[nm]=a
    # 4) шрифт: глифы кириллицы в тайлы базы по умолчанию
    i18n.patch_font(img,labaddr['Bmp_Tiles']-LO,T.GLYPHS,CODE)
    TITLE_DE=0x1700|T.TITLE_COL
open('src/vec/lang.inc','w').write('TITLE_DE\tEQU\t0x%04X\n'%TITLE_DE)
open('src/vec/objalt.inc','w').write('; сгенерировано tools/mkvecdata.py: OBJ_ALT — в русской версии у канистры, пистолета и ведра название зависит от состояния\n'+('OBJ_ALT\tEQU\t%d\nHUD_L\tEQU\t%d\t; 1 — русская раскладка HUD (энергия и карманы на колонку левее, текст 13 знаков); 0 — как в ZX\nRM_ON\tEQU\t%d\t; перекраска мебели (rm_tab); PJ_STANDS=1 — выключена (стенды сверяют рисование с ZX)\n'%((0,0,0) if PJ_LANG=='en' and os.environ.get('PJ_STANDS') else ((0,0,1) if PJ_LANG=='en' else (1,1,1)))))
# выброшено из образа: таблицы настройки клавиш и текст главного меню ZX (в порту управление фиксированное, меню нет)
_names=sorted(labaddr.items(),key=lambda x:x[1])
_dead_hi=lambda nm:next(a for l,a in _names if a>labaddr[nm])
DEADL=['Game_InputAsciiTable','Game_InputSinclairValues','StrDefineKeyLeft','StrDefineKeyRight','StrDefineKeyJump','Str_MainMenu']   # меню и настройка клавиш
DEADL+=['DF_lookup','DF_lookup_Row5','DF_lookup_Row6']                                   # таблицы адресов строк экрана ZX
DEADL+=['Table_ActionFuncPtrs','Table_TestFuncPtrs','Room_UpdateVectors']                  # таблицы указателей на код ZX (нули; у нас свои таблицы)
DEADL+=['Game_InputLeft','Game_InputLeftAddr','Game_InputRight','Game_InputRightAddr','Game_InputJump','Game_InputJumpAddr','FX_WhiteNoisePtr','Music_NoteTable','Music_ScoreSheet']
DEADL+=['Demo_NextPtr','Demo_Data']        # демо ZX: записанный ввод сохраняется сжатым (build/vec/demo.zx0), пока демо не перенесено
DEAD=[]
DEMO=bytearray()
for nm in DEADL:
    lo=labaddr[nm]; hi=_dead_hi(nm); DEAD.append((lo,hi))
    if nm=='Demo_Data': DEMO=bytearray(img[lo-LO:hi-LO])
    for _a in range(lo,hi): cov[_a-LO]=0; img[_a-LO]=0
print('выброшено мёртвых данных ZX: %d Б'%sum(1 for a in range(LO,HI) if not cov[a-LO] and any(lo<=a<hi for lo,hi in DEAD)))
segs=[];i=0;vec=0x100
while i<len(cov):
    if cov[i]:
        j=i
        while j<len(cov) and cov[j]:j+=1
        segs.append((i+LO,j-i,vec)); vec+=j-i; i=j
    else:i+=1
VEC_END=vec
def m(a):
    for zs,n,vs in segs:
        if zs<=a<zs+n: return vs+a-zs
    for zs,n,vs in segs:
        if a==zs+n: return vs+n          # указатель «за конец» блока
    raise ValueError('адрес ZX вне данных: %04X'%a)
def inv(v):
    for zs,n,vs in segs:
        if vs<=v<vs+n: return zs+v-vs
    raise ValueError('адрес Вектора вне данных: %04X'%v)
# --- таблицы указателей на ДАННЫЕ (числовые слова: карта сегментов) ---
PTR_TABLES=[(0x8CAA,66),(0x8D2E,30),(0xE48E,32)]   # салют (B71B) — позже, с действием победы
def w(a): return img[a-LO]|img[a+1-LO]<<8
def sw(a,v): img[a-LO]=v&255; img[a+1-LO]=(v>>8)&255
reloc=[]
for a,n in PTR_TABLES:
    for k in range(n):
        v=OVR.get((a,k),w(a+2*k))
        if v and not (LO<=v<HI): print('?? указатель вне данных',hex(a+2*k),hex(v)); continue
        if v: sw(a+2*k,m(v))
        reloc.append(dict(addr=m(a+2*k),kind='data'))
# --- салют: firework_ptrs B71B, 10 записей по 7 байт: [начало скрипта][текущий][конец] слова-указатели в данные + байт цвета ---
for k in range(10):
    for off in (0,2,4):
        a=0xB71B+7*k+off; v=w(a)
        assert LO<=v<HI,(hex(a),hex(v))
        sw(a,m(v)); reloc.append(dict(addr=m(a),kind='data'))
# --- символьные слова (DEFW с метками): данные -> сдвиг, код -> нули ---
codeptrs=[]
for i,(a,lab,mn,ops) in enumerate(items):
    if mn!='DEFW' or not (LO<=a<HI0) or not re.search(r'[A-Za-z_]',ops): continue
    if any(lo<=a<hi for lo,hi in DEAD): continue          # выброшенные таблицы
    for k,x in enumerate([t.strip() for t in ops.split(',')]):
        if not re.fullmatch(r'[A-Za-z_]\w*',x): continue
        t=labaddr.get(x)
        if t is None: print('?? нет метки',x,hex(a)); continue
        if x in datalab and LO<=t<HI:
            sw(a+2*k,m(t)); reloc.append(dict(addr=m(a+2*k),kind='data'))
        else:
            sw(a+2*k,0); codeptrs.append(dict(addr=m(a+2*k),label=x))
# --- мебель: команда FB lo hi (новая база тайлов) внутри строк мебели D2F8..E1A3 ---
fs=[]
fp=[inv(w(0x8CAA+2*k)) for k in range(66)]       # адреса строк ZX
fp.append(0xBD4F)                                 # Furniture_FireworksBox (вне таблицы 8CAA, рисуется действием победы): его FB-базы тоже пересчитать
fix=0
for z in sorted(set(fp)):
    p=z-LO
    while True:
        b=img[p]; p+=1
        if b==0xFF: break
        if b==0xFE: p+=1
        elif b==0xFC: p+=2
        elif b==0xFB:
            v=img[p]|img[p+1]<<8
            assert LO<=v<HI,(hex(z),hex(v))
            nv=m(v); img[p]=nv&255; img[p+1]=nv>>8; reloc.append(dict(addr=m(p+LO),kind='data')); p+=2; fix+=1
        elif b&0x80: p+=2
# отдельные строки (вне таблицы мебели), которые рисует FurnitureDraw/String_DrawDouble: тот же разбор до FF
for nm in ('ScoreBoard_Item','Furniture_FireworksBox','StrAnyKey','StrLose','StrCongrats','StrFinalScore',):
    if nm not in labaddr: continue
    p=labaddr[nm]-LO
    while p<len(img):
        b=img[p]; p+=1
        if b==0xFF: break
        if b==0xFE: p+=1
        elif b==0xFC: p+=2
        elif b==0xFB:
            v=img[p]|img[p+1]<<8
            if LO<=v<HI:
                nv=m(v); img[p]=nv&255; img[p+1]=nv>>8; reloc.append(dict(addr=m(p+LO),kind='data')); fix+=1
            p+=2
print('FB-операндов пересчитано',fix)
# --- описания комнат: поток F5? ... (F4|F3)* DE lo hi | x y idx ... FF; адрес флага после DE — в раскладку Вектора ---
dfix=0
for k in range(30):
    p=inv(w(0x8D2E+2*k))-LO          # указатель в таблице уже пересчитан
    if img[p]==0xF5: p+=1
    while True:
        b=img[p]
        if b==0xFF: break
        if b in(0xF3,0xF4): p+=1; continue
        if b==0xDE:
            v=img[p+1]|img[p+2]<<8
            assert LO<=v<HI,(k,hex(v))
            nv=m(v); img[p+1]=nv&255; img[p+2]=nv>>8; reloc.append(dict(addr=m(p+1+LO),kind='data')); p+=3; dfix+=1; continue
        p+=3
print('DE-операндов пересчитано',dfix)
# StrAnyKey: цвет FE 38 (чёрные чернила на белой бумаге ZX) -> FE 07 (белые чернила: на заставке чернила чёрные во всех плоскостях); цвет статики берётся из чернил
_p=labaddr['StrAnyKey']-LO
while img[_p]!=0xFF:
    if img[_p]==0xFB: _p+=3; continue
    if img[_p]==0xFE: assert img[_p+1]==0x38; img[_p+1]=0x07; break
    _p+=1
open('build/vec/demo.bin','wb').write(bytes(DEMO))
import subprocess
subprocess.run(['tools/zx0/zx0','-f','-c','build/vec/demo.bin','build/vec/demo.zx0'],stdout=subprocess.DEVNULL)
out=bytearray(VEC_END-0x100)
for zs,n,vs in segs: out[vs-0x100:vs-0x100+n]=img[zs-LO:zs-LO+n]
open('build/vec/data.bin','wb').write(bytes(out))
with open('src/vec/zxsym.inc','w') as f:
    f.write('; сгенерировано tools/mkvecdata.py: метки данных ZX V1 в уплотнённой раскладке Вектора (карта сегментов — reloc.json)\nDATA_END\tEQU 0x%04X\n'%VEC_END)
    for lab,a in sorted(datalab.items(),key=lambda x:x[1]):
        if LO<=a<HI and not any(lo<=a<hi for lo,hi in DEAD):
            try: f.write(f'{fixlab(lab)}\tEQU 0x{m(a):04X}\n')
            except ValueError: pass                   # метка в выброшенной (переведённой) строке
    for nm,a in (('Inv_BombFrame',0xF45D),('Str_Full',0xE5CB),('Str_Empty',0xE5D0)): f.write(f'{nm}\tEQU 0x{m(a):04X}\n')
seen=set();ded=[]
for r in reloc:
    if r['addr'] not in seen: seen.add(r['addr']); ded.append(r)
reloc=ded
json.dump(dict(segs=[list(x) for x in segs],reloc=reloc,codeptrs=codeptrs),open('build/vec/reloc.json','w'))
print('образ',len(out),'Б, данные до',hex(VEC_END),'; сегментов',len(segs),'; меток данных',sum(1 for a in datalab.values() if LO<=a<HI),'; указателей на данные',len(reloc),'; на код (нулями)',len(codeptrs))
