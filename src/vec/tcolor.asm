; Раскраска заставки (код в плоскости 3): colorize, fill_strips, карта цветов title_v_zx0 (tools/mktitle.py)
; ---- colorize: ATTR[768] = байт на ячейку 8x8 (ink биты 0-2, paper биты 3-5; цвет ZX = код: бит k — плоскость k). Рисунок в плоскости 0 (бит 1 = чернила) раскладывается по плоскостям:
; плоскость p получает (t & ink_p) | (~t & paper_p), где ink_p, paper_p = 0xFF/0 по биту p цвета. Порядок плоскостей 1, 2, 0 (источник — плоскость 0).
; Формула: (t ^ mp) & x, где mp = paper, x = ink ^ paper плюс случай ink = paper = 1 — сплошная заливка 0xFF (cz_ff); 8 байт развёрнуты.
colorize:	ld	hl,ATTR
		ld	e,216			; самая нижняя линия Вектора ячейки в строке 0: 223-7
cz_row:		ld	d,0x80
cz_col:		ld	a,(hl)
		inc	hl
		push	hl
		call	cz_cell
		pop	hl
		inc	d
		ld	a,d
		cp	0xA0
		jp	nz,cz_col
		ld	a,e
		sub	8
		ld	e,a
		cp	24
		jp	nz,cz_row
		ret
; A = байт карты, D = страница плоскости 0, E = нижняя линия ячейки
cz_cell:	ld	(cz_v),a
		ld	a,0x20
		ld	(cz_o),a
		ld	bc,0x1002		; B = маска бита paper, C = маска бита ink (плоскость 1)
		call	cz_pl
		ld	a,0x40
		ld	(cz_o),a
		ld	bc,0x2004		; плоскость 2
		call	cz_pl
		xor	a
		ld	(cz_o),a
		ld	bc,0x0801		; плоскость 0 (на месте)
cz_pl:		ld	a,(cz_v)
		ld	l,a
		and	c
		add	a,0xFF
		sbc	a,a
		ld	h,a			; H = ink-маска
		ld	a,l
		and	b
		add	a,0xFF
		sbc	a,a
		ld	b,a			; B = paper-маска
		xor	h
		ld	c,a			; C = ink ^ paper
		ld	a,b
		and	h			; ink = paper = 1 в этой плоскости: ячейка сплошная (0xFF)
		jp	nz,cz_ff
		ld	a,(cz_o)
		add	a,d
		ld	h,a			; HL = приёмник (страница плоскости, линия E)
		ld	l,e
		ld	a,(de)			; источник — плоскость 0
		xor	b
		and	c
		ld	(hl),a
		inc	e
		inc	l
		ld	a,(de)
		xor	b
		and	c
		ld	(hl),a
		inc	e
		inc	l
		ld	a,(de)
		xor	b
		and	c
		ld	(hl),a
		inc	e
		inc	l
		ld	a,(de)
		xor	b
		and	c
		ld	(hl),a
		inc	e
		inc	l
		ld	a,(de)
		xor	b
		and	c
		ld	(hl),a
		inc	e
		inc	l
		ld	a,(de)
		xor	b
		and	c
		ld	(hl),a
		inc	e
		inc	l
		ld	a,(de)
		xor	b
		and	c
		ld	(hl),a
		inc	e
		inc	l
		ld	a,(de)
		xor	b
		and	c
		ld	(hl),a
		inc	e
		inc	l
		ld	a,e
		sub	8
		ld	e,a
		ret
cz_ff:		ld	a,(cz_o)
		add	a,d
		ld	h,a
		ld	l,e
		ld	c,8
		ld	a,0xFF
cz_f1:		ld	(hl),a
		inc	l
		dec	c
		jp	nz,cz_f1
		ret
cz_v:		db	0
cz_o:		db	0
title_v_zx0:	INCBIN	"../../build/vec/title_v.zx0"

; fill_strips: линии Вектора 224..255 и 0..31 (вне 192 строк картинки) всех колонок трёх плоскостей = 0xFF (код цвета 7: белый на заставке)
fill_strips:	ld	d,0x80
fs_c:		ld	e,0
		ld	a,0xFF
		ld	b,32
fs1:		ld	(de),a
		inc	e
		dec	b
		jp	nz,fs1
		ld	e,224
		ld	b,32
fs2:		ld	(de),a
		inc	e
		dec	b
		jp	nz,fs2
		inc	d
		ld	a,d
		cp	0xE0
		jp	nz,fs_c
		ret
