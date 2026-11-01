#!/usr/bin/env python3
"""Быстрый bmp16 (src/vec/bmp16_fast.asm): развёрнутые 16 строк с таблицами сдвигов (страницы GXTAB..: R_s = x>>s, L_s = x<<(8-s) для s=1..7).
Строка спрайта (b0,b1) со сдвигом s даёт 3 байта: R[b0], L[b0]^R[b1], L[b1] (слагаемые не пересекаются -> XOR на экран по очереди); пустая строка пропускается.
Регистры при входе: HL = адрес экрана (страница колонки, L = строка), DE = байт b0 строки 0, B = страница R_s (L_s = B+1)."""
lines=[]
A=lines.append
A("; сгенерировано tools/gen_bmp16.py (не править)")
A("gx_shifted:")
for i in range(16):
    A(f"""gx_sh{i}:	ld	a,(de)
		ld	c,a
		inc	de
		ld	a,(de)
		or	c
		jp	z,gx_se{i}
		ld	a,c
		ld	a,(bc)
		xor	(hl)
		ld	(hl),a
		inc	h
		inc	b
		ld	a,(bc)
		xor	(hl)
		ld	(hl),a
		ld	a,(de)
		ld	c,a
		dec	b
		ld	a,(bc)
		xor	(hl)
		ld	(hl),a
		inc	h
		inc	b
		ld	a,(bc)
		xor	(hl)
		ld	(hl),a
		dec	h
		dec	h
		dec	b
gx_se{i}:	inc	de
		dec	l""")
A("		ret")
A("""gx_aligned:	ld	b,16			; выровненный случай (X&7 = 0) — цикл (развёртка не нужна: редкий путь, экономия памяти)
gx_al0:		ld	a,(de)
		inc	de
		xor	(hl)
		ld	(hl),a
		inc	h
		ld	a,(de)
		inc	de
		xor	(hl)
		ld	(hl),a
		dec	h
		dec	l
		dec	b
		jp	nz,gx_al0
		ret""")
open('src/vec/bmp16_gen.inc','w').write('\n'.join(lines)+'\n')
print('bmp16_gen.inc:',len(lines),'строк')
