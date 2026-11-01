; Логотип. (1) Игра: draw_logo — три плоскости (ZX0) по очереди распаковываются в ATTR (буфер 768 Б; карту атрибутов потом перезаполняет fill_attr) и копируются в нижнюю полосу экрана
; (колонки LOGO_PAGE.., линии LOGO_L0 вниз), цвет по пикселям. (2) Заставка: title_logo — пиксели логотипа, цвет которых отличается от цвета их ячейки (tools/mktitle.py), перекрашиваются по плоскостям.
		INCLUDE	"logo_cfg.inc"
draw_logo:	ld	hl,lg_tab
		xor	a
		ld	(dl_po),a
		ld	a,3
		ld	(dl_pc),a
dl_p:		ld	e,(hl)
		inc	hl
		ld	d,(hl)
		inc	hl
		push	hl
		ex	de,hl
		ld	bc,ATTR
		call	dzx0
		ld	a,(dl_po)
		add	a,LOGO_PAGE
		ld	d,a
		ld	hl,ATTR
		ld	c,LOGO_COLS
dl_c:		ld	e,LOGO_L0
		ld	b,LOGO_ROWS
dl_r:		ld	a,(hl)
		ld	(de),a
		inc	hl
		dec	e
		dec	b
		jp	nz,dl_r
		inc	d
		dec	c
		jp	nz,dl_c
		ld	a,(dl_po)
		add	a,0x20
		ld	(dl_po),a
		pop	hl
		ld	a,(dl_pc)
		dec	a
		ld	(dl_pc),a
		jp	nz,dl_p
		ret
dl_po:		db	0
dl_pc:		db	0

; title_logo: записи по 4 байта (страница плоскости 0, линия, маска бита, цвет ZX); пиксель во всех трёх плоскостях = биты цвета
title_logo:	ld	a,(tl_n)
		ld	(tl_cnt),a
		ld	hl,tl_tab
tl_e:		ld	d,(hl)
		inc	hl
		ld	e,(hl)
		inc	hl
		ld	c,(hl)
		inc	hl
		ld	b,(hl)
		inc	hl
		push	hl
		ld	l,3
tl_p:		ld	a,c
		cpl
		ld	h,a
		ld	a,(de)
		and	h
		ld	h,a
		ld	a,b
		rrca
		ld	b,a
		jp	nc,tl_s
		ld	a,h
		or	c
		ld	h,a
tl_s:		ld	a,h
		ld	(de),a
		ld	a,d
		add	a,0x20
		ld	d,a
		dec	l
		jp	nz,tl_p
		pop	hl
		ld	a,(tl_cnt)
		dec	a
		ld	(tl_cnt),a
		jp	nz,tl_e
		ret
tl_cnt:		db	0
		INCLUDE	"logo_data.inc"
		INCLUDE	"tlogo.inc"
