; Графика на плоскости 0 Вектора (этап 3, чёрно-белый): столбцовый экран, адрес = 0x8000 + колонка*256 + (223 - строка ZX), т.е. ZX-строка y -> строка Вектора y+32.
; Строки 0..191 ZX; колонки 0..31; колонка спрайта = X>>3, колонка тайла = E. Сверка по пикселям: tools/gfxcheck.js.

; bmp16: A = индекс спрайта (Bmp_Wally + 32*A), X, Y — в BitmapX, BitmapY; XOR 16x16 со сдвигом по X&7 (спрайт шире на колонку); колонки >= 32 отсекаются.
bmp16:		ld	b,a
		call	gx_plane		; gx_off = смещение страницы плоскости спрайта (0 / 0x20 / 0x40)
		ld	a,(BitmapX)
		rrca
		rrca
		rrca
		and	0x1F
		cp	0x1E			; у правого края (3 колонки могут не влезть) — медленный путь с отсечением
		ld	a,b
		jp	nc,bmp16_slow
		ld	l,a
		ld	h,0
		add	hl,hl
		add	hl,hl
		add	hl,hl
		add	hl,hl
		add	hl,hl
		ld	de,Bmp_Wally
		add	hl,de
		ex	de,hl			; DE = спрайт
		ld	a,(BitmapX)
		ld	c,a
		rrca
		rrca
		rrca
		and	0x1F
		add	a,0x80
		ld	h,a
		ld	a,(gx_off)
		add	a,h
		ld	h,a
		ld	a,(BitmapY)
		ld	b,a
		ld	a,0xDF
		sub	b
		ld	l,a
		ld	a,c
		and	7
		jp	z,gx_aligned
		add	a,a
		add	a,TAB_PAGE-2		; B = страница R_s: таблицы сдвигов с TAB_PAGE*256, R_s = TAB_PAGE-2+2s, L_s = следующая
		ld	b,a
		jp	gx_shifted
bmp16_slow:	ld	l,a
		ld	h,0
		add	hl,hl
		add	hl,hl
		add	hl,hl
		add	hl,hl
		add	hl,hl
		ld	de,Bmp_Wally
		add	hl,de
		ld	(gx_bm_sp),hl
		ld	a,(BitmapX)
		ld	c,a
		and	7
		ld	(gx_bm_s),a
		ld	a,c
		rrca
		rrca
		rrca
		and	0x1F
		add	a,0x80			; страница = 0x80 + колонка (X>>3): у ZX DF уже учитывает смещение
		ld	hl,gx_off
		add	a,(hl)			; + плоскость спрайта
		ld	(gx_bm_h),a
		ld	h,a
		ld	a,(BitmapY)
		ld	b,a
		ld	a,0xDF
		sub	b
		ld	l,a
		ld	a,(gx_off)
		add	a,0x9F
		ld	(gx_bm_lim),a		; последняя допустимая страница плоскости
		ld	a,16
		ld	(gx_bm_n),a
gx_bm_row:		push	hl
		ld	hl,(gx_bm_sp)
		ld	d,(hl)
		inc	hl
		ld	e,(hl)
		inc	hl
		ld	(gx_bm_sp),hl
		pop	hl
		ld	a,(gx_bm_s)
		or	a
		jp	z,gx_bm_al
		ld	c,a
		ld	b,0			; третий байт
gx_bm_sh:		ld	a,d
		or	a
		rra
		ld	d,a
		ld	a,e
		rra
		ld	e,a
		ld	a,b
		rra
		ld	b,a
		dec	c
		jp	nz,gx_bm_sh
		ld	a,(hl)			; колонка 0
		xor	d
		ld	(hl),a
		inc	h
		ld	a,(gx_bm_lim)
		cp	h
		jp	c,gx_bm_nx
		ld	a,(hl)			; колонка 1
		xor	e
		ld	(hl),a
		inc	h
		ld	a,(gx_bm_lim)
		cp	h
		jp	c,gx_bm_nx
		ld	a,(hl)			; колонка 2
		xor	b
		ld	(hl),a
		jp	gx_bm_nx
gx_bm_al:		ld	a,(hl)
		xor	d
		ld	(hl),a
		inc	h
		ld	a,(gx_bm_lim)
		cp	h
		jp	c,gx_bm_nx
		ld	a,(hl)
		xor	e
		ld	(hl),a
gx_bm_nx:		ld	a,(gx_bm_h)
		ld	h,a
		dec	l
		ld	a,(gx_bm_n)
		dec	a
		ld	(gx_bm_n),a
		jp	nz,gx_bm_row
		ret
gx_bm_sp:		dw	0
gx_bm_s:		db	0
gx_bm_h:		db	0
gx_bm_n:		db	0
gx_bm_lim:	db	0
gx_off:		db	0
gx_fo:		db	0xFF

; gx_plane: B = индекс спрайта -> gx_off = смещение страницы плоскости (Wally и дымок — плоскость 0 (цвет 001, жёлтый); остальные движущиеся — 1 и 2 (010, 100))
gx_plane:	ld	a,(gx_fo)		; gx_fo != 0xFF — принудительная плоскость (спрайт поверх тайлов: цвет ячейки, bmp16c)
		inc	a
		jp	z,gx_pl9
		dec	a
		ld	(gx_off),a
		ret
gx_pl9:		ld	hl,gx_pt
gx_pl1:		ld	a,(hl)
		inc	hl
		cp	b
		jp	nc,gx_pl2
		inc	hl
		jp	gx_pl1
gx_pl2:		ld	a,(hl)
		ld	(gx_off),a
		ret
gx_pt:		db	0x4F,0x00, 0x6D,0x40, 0x9A,0x20, 0xA4,0x00, 0xAC,0x20, 0xBA,0x40, 0xFF,0x20

; gx_setv: A = атрибут ZX -> gx_v = код цвета (бит k = чернила в плоскости k): ZX ink 0..7 -> 0,1,2,5,4,3,6,7 (палитра в hw.asm); сохраняет BC, DE, HL
gx_setv:	and	7
		or	gx_inkv&0xFF
		push	hl
		ld	l,a
		ld	h,gx_inkv>>8
		ld	a,(hl)
		pop	hl
		ld	(gx_v),a
		ret
		ALIGN	8
gx_inkv:	db	0,1,2,5,4,3,6,7			; ZX ink -> код цвета (6 — оранжевый статики, 7 — светло-коричневый, 1 — белый: пижама Wally)
gx_v:		db	0
gx_vv:		db	0
gx_m:		db	0
gx_fresh:	db	0			; 1 — идёт RoomDraw на очищенном экране
gx_sk:		db	0

; HL = адрес растра тайла A из TileStartPtr (A*8), все регистры кроме A, HL сохраняются вызывающим
gx_tp_ptr:		ld	l,a
		ld	h,0
		add	hl,hl
		add	hl,hl
		add	hl,hl
		ex	de,hl
		ld	hl,(TileStartPtr)
		add	hl,de
		ret

; общий вход тайловых подпрограмм: A = тайл, D = строка, E = колонка. Сохраняет регистры; B = строка, C = колонка, [gx_ta] = тайл.
; Вне экрана (колонка >= 32, строка >= 24) ничего не рисуем: у ZX это запись в соседнюю память, на Векторе — в чужие плоскости/код.
gx_tenter:	ld	(gx_ta),a
		ld	b,d
		ld	c,e
		ld	a,c
		cp	32
		ret	nc
		ld	a,b
		cp	24
		ret
gx_ta:		db	0
gx_tskip:	pop	bc
		pop	de
		pop	hl
		pop	af
		ret

; tile_px: рисует 8 байт сверху вниз (замещение) в плоскости цвета gx_v (в остальных плоскостях очищает)
tile_px:	push	af
		push	hl
		push	de
		push	bc
		ld	(gx_ta),a
		ld	a,c
		call	gx_setv
		ld	a,(gx_ta)
		call	gx_tenter
		jp	nc,gx_tskip
		ld	a,(gx_ta)
		call	gx_tp_ptr
		ld	a,c
		add	a,0x80
		ld	d,a
		ld	a,(gx_fresh)		; свежий экран (RoomDraw после очистки), строка >= 5: плоскости без цвета не очищать
		or	a
		jp	z,gx_tp1
		ld	a,b
		cp	5
		sbc	a,a
		cpl
		and	1
gx_tp1:		ld	(gx_sk),a
		ld	a,b
		add	a,a
		add	a,a
		add	a,a
		ld	b,a
		ld	a,0xDF
		sub	b
		ld	e,a
		ld	a,(gx_v)
		ld	(gx_vv),a
		ld	c,3
gx_tpp:		push	de
		push	hl
		ld	a,(gx_vv)
		rrca
		ld	(gx_vv),a
		sbc	a,a
		ld	(gx_m),a
		or	a
		jp	nz,gx_tpd
		ld	a,(gx_sk)
		or	a
		jp	nz,gx_tps
gx_tpd:		ld	b,8
gx_tpx:		ld	a,(gx_m)
		and	(hl)
		ld	(de),a
		inc	hl
		dec	e
		dec	b
		jp	nz,gx_tpx
gx_tps:		pop	hl
		pop	de
		ld	a,d
		add	a,0x20
		ld	d,a
		dec	c
		jp	nz,gx_tpp
		pop	bc
		pop	de
		pop	hl
		pop	af
		ret

; tile_flip_px: вверх ногами в строке 0x1C - D (первый байт растра — в нижней линии)
tile_flip_px:	push	af
		push	hl
		push	de
		push	bc
		ld	(gx_ta),a
		ld	a,c
		call	gx_setv
		ld	b,d
		ld	c,e
		ld	a,c
		cp	32
		jp	nc,gx_tskip
		ld	a,0x1C			; строка 0x1C - D: допустима 0..23
		sub	b
		cp	24
		jp	nc,gx_tskip
		ld	h,a
		ld	a,(gx_fresh)
		or	a
		jp	z,gx_tf1
		ld	a,h
		cp	5
		sbc	a,a
		cpl
		and	1
gx_tf1:		ld	(gx_sk),a
		ld	a,h
		add	a,a
		add	a,a
		add	a,a
		ld	b,a
		ld	a,(gx_ta)
		call	gx_tp_ptr
		ld	a,c
		add	a,0x80
		ld	d,a
		ld	a,216
		sub	b
		ld	e,a
		ld	a,(gx_v)
		ld	(gx_vv),a
		ld	c,3
gx_tfp:		push	de
		push	hl
		ld	a,(gx_vv)
		rrca
		ld	(gx_vv),a
		sbc	a,a
		ld	(gx_m),a
		or	a
		jp	nz,gx_tfd
		ld	a,(gx_sk)
		or	a
		jp	nz,gx_tfs
gx_tfd:		ld	b,8
gx_tfx:		ld	a,(gx_m)
		and	(hl)
		ld	(de),a
		inc	hl
		inc	e
		dec	b
		jp	nz,gx_tfx
gx_tfs:		pop	hl
		pop	de
		ld	a,d
		add	a,0x20
		ld	d,a
		dec	c
		jp	nz,gx_tfp
		pop	bc
		pop	de
		pop	hl
		pop	af
		ret

; tile_dbl_px: растр из Bmp_Tiles, каждая линия дважды (16 линий); строка до 22 включительно
tile_dbl_px:	push	af
		push	hl
		push	de
		push	bc
		ld	(gx_ta),a
		ld	a,c
		call	gx_setv
		ld	a,(gx_ta)
		call	gx_tenter
		jp	nc,gx_tskip
		ld	a,b
		cp	23
		jp	nc,gx_tskip
		ld	a,(gx_fresh)
		or	a
		jp	z,gx_td1
		ld	a,b
		cp	5
		sbc	a,a
		cpl
		and	1
gx_td1:		ld	(gx_sk),a
		ld	a,(gx_ta)
		ld	l,a
		ld	h,0
		add	hl,hl
		add	hl,hl
		add	hl,hl
		ld	de,Bmp_Tiles
		add	hl,de
		ld	a,c
		add	a,0x80
		ld	d,a
		ld	a,b
		add	a,a
		add	a,a
		add	a,a
		ld	b,a
		ld	a,0xDF
		sub	b
		ld	e,a
		ld	a,(gx_v)
		ld	(gx_vv),a
		ld	c,3
gx_tdp:		push	de
		push	hl
		ld	a,(gx_vv)
		rrca
		ld	(gx_vv),a
		sbc	a,a
		ld	(gx_m),a
		or	a
		jp	nz,gx_tdd
		ld	a,(gx_sk)
		or	a
		jp	nz,gx_tds
gx_tdd:		ld	b,8
gx_tdx:		ld	a,(gx_m)
		and	(hl)
		ld	(de),a
		dec	e
		ld	(de),a
		dec	e
		inc	hl
		dec	b
		jp	nz,gx_tdx
gx_tds:		pop	hl
		pop	de
		ld	a,d
		add	a,0x20
		ld	d,a
		dec	c
		jp	nz,gx_tdp
		pop	bc
		pop	de
		pop	hl
		pop	af
		ret

; milk_row: A = линия (0..31), HL = 3 байта картинки; колонки 13..15; стакан белый — пишется во все три плоскости
milk_row:	ld	e,a
		ld	a,0xDF
		sub	e
		ld	e,a
		jp	gx_milk_row_e
; milk_full: полный стакан, 32 линии
milk_full:	ld	hl,Bmp_MilkFull
		ld	c,0xDF
		ld	b,32
gx_mf0:		ld	e,c
		call	gx_milk_row_e
		dec	c
		dec	b
		jp	nz,gx_mf0
		ret
gx_milk_row_e:	ld	d,0x8D			; HL = 3 байта; каждый — в три плоскости (страницы +0, +0x20, +0x40)
		ld	a,3
		ld	(gx_mc),a
gx_mw0:		ld	a,(hl)
		inc	hl
		ld	(de),a
		push	af
		ld	a,d
		add	a,0x20
		ld	d,a
		pop	af
		ld	(de),a
		push	af
		ld	a,d
		add	a,0x20
		ld	d,a
		pop	af
		ld	(de),a
		ld	a,d
		sub	0x3F
		ld	d,a
		ld	a,(gx_mc)
		dec	a
		ld	(gx_mc),a
		jp	nz,gx_mw0
		ret
gx_mc:		db	0

; clr_inv: очистить область инвентаря — колонки 17..31, линии 0..31, во всех трёх плоскостях
clr_inv:	ld	c,0x91
gx_ci:		ld	h,c
gx_ci0:		ld	l,0xC0
		ld	b,32
		xor	a
gx_ci1:		ld	(hl),a
		inc	l
		dec	b
		jp	nz,gx_ci1
		inc	h
		ld	a,h
		and	0x1F
		jp	nz,gx_ci0
		ld	a,c
		add	a,0x20
		ld	c,a
		cp	0xF1
		jp	nz,gx_ci
		ret

; clr_px: эффект смены комнаты (ZX двигает биты 8 раз) — результат: линии 40..191 пустые; без анимации
clr_px:		ld	h,0x80
gx_cp0:		ld	l,32			; линии 191..40 -> L = 32..183
		ld	b,152
		xor	a
gx_cp1:		ld	(hl),a
		inc	l
		dec	b
		jp	nz,gx_cp1
		inc	h
		ld	a,h
		cp	0xE0			; три плоскости подряд: страницы 0x80..0xDF
		jp	nz,gx_cp0
		ret
