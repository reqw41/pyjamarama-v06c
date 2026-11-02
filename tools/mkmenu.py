#!/usr/bin/env python3
"""Тексты меню -> src/vec/menu_txt.inc. Запись: строка, колонка, цвет ZX (ink), коды тайлов..., 0; список записей кончается 0xFF.
Русские буквы кодируются по i18n/ru.py (CODE), английский — ASCII. Использование: PJ_LANG=ru python3 tools/mkmenu.py"""
import os,sys
sys.path.insert(0,'tools')
import i18n
L=os.environ.get('PJ_LANG','ru')
EN={'head':'SELECT CONTROLS','items':['KEYBOARD','JOYSTICK','START GAME'],
 'panels':[['LEFT, RIGHT: ARROWS OR O, P','JUMP: SPACE, UP OR M','PAUSE: ENTER','BACK TO MENU: ESC','ENTER OR SPACE - ON, OFF'],
           ['JOYSTICK, PORT P:','LEFT, RIGHT - TILT','JUMP - FIRE OR UP','PAUSE: ENTER, MENU: ESC','ENTER OR FIRE - ON, OFF'],
           ['PRESS ENTER, SPACE OR FIRE','AND WALLY WILL WAKE UP IN TIME','STAR - CONTROLS ENABLED']],
 'hint':'UP, DOWN - SELECT','foot':['MICRO-GEN','VECTOR 06C VERSION','BORIS LIKHACHEV']}
if L=='en': M=EN; CODE={chr(c):c for c in range(32,91)}
else:
    T=i18n.load(L); M=T.MENU; CODE=T.CODE
def enc(s): return ','.join('0x%02X'%CODE[c] for c in s)+',0'
out=['; сгенерировано tools/mkmenu.py (не править): тексты меню']
def rec(r,c,ink,s): return '\tdb\t%d,%d,%d,%s'%(r,c,ink,enc(s))
F=M['foot']; cs='   '+F[0]   # слева место под значок копирайта (колонки 0..1 + пробел)
out.append('mn_head:\n'+rec(0,(32-len(M['head']))//2,7,M['head'])+'\n'
 +rec(19,(32-len(cs))//2,6,cs)+'\n'+rec(20,(32-len(F[1]))//2,6,F[1])+'\n'+rec(21,(32-len(F[2]))//2,6,F[2])+'\n\tdb\t0xFF')
out.append('MN_CPY_C\tEQU\t%d\t; колонка значка копирайта'%((32-len(cs))//2))
for i,s in enumerate(M['items']): out.append('mn_it%d:\tdb\t%d,6,%s'%(i,3+2*i,enc(s)))
out.append('mn_it:\tdw\tmn_it0,mn_it1,mn_it2')
for k,p in enumerate(M['panels']):
    out.append('mn_p%d:'%k+'\n'+'\n'.join(rec(10+j,0,4,s) for j,s in enumerate(p))+'\n\tdb\t0xFF')
    assert all(len(s)<=32 for s in p),p
out.append('mn_p:\tdw\tmn_p0,mn_p1,mn_p2')
open('src/vec/menu_txt.inc','w',encoding='utf-8').write('\n'.join(out)+'\n')
print('меню (%s): %d Б текста'%(L,sum(len(s) for p in M['panels'] for s in p)))
