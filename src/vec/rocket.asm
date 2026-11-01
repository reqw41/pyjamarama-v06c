; Ракета (действия скрипта 10 и 11): взлёт с Земли/Луны. Нативный i8080. Код — в низкой памяти (после events_b, см. main.asm).
; ZX (8B95/8BB1/8BCD) самомодифицирующимся кодом сдвигает 3 байта-колонки (по DF-таблице, уже +2 колонки) на строку вверх: 0x88 (Земля)
; или 0x80 (Луна) раз; Земля: колонки 24..26, строки y=48..182 (источник y+1); Луна: колонки 2..4, y=40..166.
; Вектор: строка ZX y -> L = 223-y, колонка c -> H = 0x80+c; «y+1 -> y» это байт из L-1 в L; идём от верхней y (старший L) вниз по y (убывание L).
; Вход: HL = аргументы скрипта (сохраняется), выход HL = он же (ZX после анимации идёт в Room_TestEvents_0 / Demo_10: у нас оба пути = ret в диспетчер).
; Каждые 8 сдвигов — Pause_Short (кадр).
a_rocket_earth:	push	hl			; действие 10 (HL = аргументы)
		ld	a,0x98			; H первой колонки (24)
		ld	de,0xAF87		; D = L верхней приёмной строки (223-48), E = число строк 0x87
		ld	c,0x88			; сколько сдвигов
		jp	rk_go
a_rocket_moon:	push	hl			; действие 11
		ld	a,0x82			; колонка 2
		ld	de,0xB77F		; 223-40, 0x7F строк
		ld	c,0x80
rk_go:		ld	(rk_h),a
		add	a,3
		ld	(rk_he),a
		ld	a,d
		ld	(rk_l),a
		ld	a,e
		ld	(rk_n),a
		push	bc
		call	Wally_Erase		; «Уолли залезает в ракету»
		pop	bc
rk_it:		ld	a,(rk_h)
		ld	h,a
rk_col:		ld	a,3			; три плоскости: страницы H, H+0x20, H+0x40
		ld	(rk_pl),a
rk_pp:		ld	a,(rk_l)
		ld	l,a
		ld	d,h
		ld	e,a			; DE = приёмник (строка y), HL = источник (y+1)
		dec	l
		ld	a,(rk_n)
		ld	b,a
rk_ln:		ld	a,(hl)
		ld	(de),a
		dec	l
		dec	e
		dec	b
		jp	nz,rk_ln
		ld	a,h
		add	a,0x20
		ld	h,a
		ld	a,(rk_pl)
		dec	a
		ld	(rk_pl),a
		jp	nz,rk_pp
		ld	a,h
		sub	0x5F			; назад на плоскость 0 и следующая колонка
		ld	h,a
		ld	a,(rk_he)
		cp	h
		jp	nz,rk_col
		ld	a,c
		and	7
		jp	nz,rk_np
		push	bc
		call	Pause_Short
		pop	bc
rk_np:		dec	c
		jp	nz,rk_it
		pop	hl
		ret
rk_h:		db	0
rk_he:		db	0
rk_l:		db	0
rk_n:		db	0
rk_pl:		db	0
