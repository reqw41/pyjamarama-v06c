; draw_logo — игровой логотип (код в плоскости 3; данные lg_* — logo_data.inc в низкой памяти)
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

