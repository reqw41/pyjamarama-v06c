; Фронт: заставка (один раз при запуске) и меню (после заставки и после каждой игры). Нативный i8080.
; Заставка — экран ZX с idpixel.ru (tools/mktitle.py): рисунок в плоскости 0 (ZX0) + карта цветов ячеек 8x8 (ink биты 0-2, paper биты 3-5, ZX0); colorize раскладывает рисунок по плоскостям.
; Меню: выбор управления (клавиатура / джойстик «П» включаются и выключаются) и старт игры; тексты — menu_txt.inc (tools/mkmenu.py).

pal_title:	db	0x00,0x00, 0x38,0x38, 0x07,0x07, 0x3F,0x3F, 0xC0,0xC0, 0xF8,0xF8, 0xC7,0xC7, 0xFF,0xFF	; пары по индексу аппаратной палитры (порядок кодов 0,4,2,6,1,5,3,7), цвета ZX полной яркости: код = цвет ZX (0 чёрный, 1 синий, 2 красный, 3 пурпурный, 4 зелёный, 5 циан, 6 жёлтый, 7 белый)

; ---- заставка (только при запуске) ----
title_start:	ld	sp,STACK_TOP
		ld	hl,pal_title
		ld	(pal_ptr),hl
		ld	a,14			; бордюр на заставке — белый (индекс 14 = код 7, плоскости 0..2)
		ld	(bord_idx),a
		ld	a,3
		ld	(pal_load),a
		call	clear_planes12		; плоскости 1-2 (плоскость 0 целиком затрёт распаковка)
		ld	hl,title_zx0		; картинка прямо в плоскость 0
		ld	bc,0x8000
		call	dzx0
		call	fill_strips		; верх и низ (линии вне картинки ZX) — белые
		ld	hl,title_v_zx0		; карта цветов ячеек -> ATTR (игре на заставке карта не нужна: Game_Start её перезаполняет)
		ld	bc,ATTR
		call	dzx0
		call	colorize
tt_up:		call	any_key			; ждать, пока всё отпущено
		jp	nz,tt_up
tt_w:		call	frame_wait
		call	any_key
		jp	z,tt_w
		; дальше — меню

; ---- меню ----
title_return:
menu_start:	ld	sp,STACK_TOP
		xor	a
		ld	(inv_cheat),a
		ld	(paused),a
		ld	a,7			; пока кнопки отпущены не будут — новых нажатий нет (ВК с заставки не должен сразу стартовать)
		ld	(m_prev),a
		call	snd_stop
		ld	hl,pal
		ld	(pal_ptr),hl
		xor	a
		ld	(bord_idx),a		; в меню и в игре бордюр — цвет 0
		ld	a,3
		ld	(pal_load),a
		call	clear_screen
		call	draw_logo		; логотип в нижней полосе (буфер распаковки — ATTR)
		ld	hl,Bmp_Tiles		; база тайлов шрифта (в образе — ZX-адрес)
		ld	(TileStartPtr),hl
		ld	hl,mn_head
		call	mn_list
		ld	a,2			; курсор на «Начать игру»
		ld	(m_cur),a
		call	mn_redraw
mnl_loop:	call	frame_wait
		ld	a,(vec_kbmat+1)		; Ф1 + Ф3 вместе — старт с неуязвимостью
		and	0x28
		cp	0x28
		jp	nz,mnl_nc
		ld	(inv_cheat),a
		jp	mn_go
mnl_nc:		ld	a,(vec_kbmat)		; кнопки: бит 0 — вверх, 1 — вниз, 2 — выбор
		ld	b,a
		ld	c,0
		and	0x20			; стрелка вверх
		jp	z,mnl1
		inc	c
mnl1:		ld	a,b
		and	0x80			; стрелка вниз
		jp	z,mnl2
		ld	a,c
		or	2
		ld	c,a
mnl2:		ld	a,b
		and	0x04			; ВК
		jp	nz,mnl3
		ld	a,(vec_kbmat+7)		; пробел
		and	0x80
		jp	z,mnl4
mnl3:		ld	a,c
		or	4
		ld	c,a
mnl4:		in	a,(0x06)		; джойстик «П»: огонь — выбор
		ld	hl,vj_rest+1
		xor	(hl)
		ld	b,a
		and	0x30
		jp	nz,mnl5
		ld	a,b
		and	0xC0
		jp	z,mnl5
		ld	a,c
		or	4
		ld	c,a
mnl5:		ld	a,(in_state)		; джойстик влево/вправо — вверх/вниз по пунктам (в in_state же клавиши, но они тоже листают)
		ld	b,a
		and	IN_LEFT
		jp	z,mnl6
		ld	a,c
		or	1
		ld	c,a
mnl6:		ld	a,b
		and	IN_RIGHT
		jp	z,mnl7
		ld	a,c
		or	2
		ld	c,a
mnl7:		ld	hl,m_prev		; только новые нажатия
		ld	a,(hl)
		cpl
		and	c
		ld	b,a
		ld	(hl),c
		ld	a,b
		rrca
		jp	nc,mnl_dn
		ld	a,(m_cur)		; вверх
		or	a
		jp	z,mnl_loop
		dec	a
		jp	mnl_mv
mnl_dn:		rrca
		jp	nc,mnl_sel
		ld	a,(m_cur)		; вниз
		cp	2
		jp	z,mnl_loop
		inc	a
mnl_mv:		ld	(m_cur),a
		call	mn_redraw
		jp	mnl_loop
mnl_sel:		rrca
		jp	nc,mnl_loop
		ld	a,(m_cur)		; выбор пункта
		cp	2
		jp	z,mn_go
		inc	a			; 0 -> маска 1, 1 -> маска 2
		ld	b,a
		ld	a,(in_mask)
		xor	b
		jp	nz,mnl_s1
		ld	a,3			; обе выключены — включить обе
mnl_s1:		ld	(in_mask),a
		call	mn_redraw
		jp	mnl_loop
mn_go:		call	any_key			; старт: дождаться, пока отпустят кнопки (ВК не должен стать паузой)
		jp	nz,mn_go
		xor	a
		ld	(paused),a
		ld	hl,vk_prev
		ld	(hl),a
		jp	Game_Start

; перерисовать пункты (курсор оранжевый, у включённых устройств звёздочка) и панель описания
mn_redraw:	ld	b,0
mr_i:		ld	a,(m_cur)
		cp	b
		ld	c,1			; белый
		jp	nz,mr_i1
		ld	c,6			; оранжевый (курсор)
mr_i1:		ld	hl,mn_it
		ld	e,b
		ld	d,0
		add	hl,de
		add	hl,de
		ld	e,(hl)
		inc	hl
		ld	d,(hl)
		ex	de,hl			; HL -> строка, колонка, коды
		ld	d,(hl)
		inc	hl
		inc	hl			; колонка текста — 6 (задана в mt1 ниже)
		ld	e,4			; метка курсора
		ld	a,(m_cur)
		cp	b
		ld	a,0x20
		jp	nz,mr_i2
		ld	a,'>'
mr_i2:		call	tile_px
		ld	e,6
		call	mt1
		ld	a,b
		cp	2
		jp	nc,mr_i3
		inc	a			; маска устройства: 1 — клавиатура, 2 — джойстик
		ld	h,a
		ld	c,1
		ld	e,18			; звёздочка у включённого
		ld	a,(in_mask)
		and	h
		ld	a,0x20
		jp	z,mr_i4
		ld	a,'*'
mr_i4:		call	tile_px
mr_i3:		inc	b
		ld	a,b
		cp	3
		jp	c,mr_i
		ld	a,(m_cur)		; панель
		add	a,a
		ld	e,a
		ld	d,0
		ld	hl,mn_p
		add	hl,de
		ld	e,(hl)
		inc	hl
		ld	d,(hl)
		ex	de,hl
; список записей: строка, колонка, ink, коды..., 0; конец списка — строка 0xFF
mn_list:	ld	a,(hl)
		inc	a
		ret	z
		ld	d,(hl)
		inc	hl
		ld	e,(hl)
		inc	hl
		ld	c,(hl)
		inc	hl
		call	mt1
		jp	mn_list
; mt1: D = строка, E = колонка, C = цвет, HL -> коды до нуля; хвост строки до колонки 32 забивается пробелами; HL -> после нуля
mt1:		ld	a,(hl)
		inc	hl
		or	a
		jp	z,mt2
		call	tile_px
		inc	e
		jp	mt1
mt2:		ld	a,e
		cp	32
		ret	nc
		ld	a,0x20
		call	tile_px
		inc	e
		jp	mt2

m_cur:		db	0
m_prev:		db	0

; ждать следующего кадра (прерывание)
frame_wait:	ld	a,(FRAMES)
		ld	b,a
frw1:		ld	a,(FRAMES)
		cp	b
		jp	z,frw1
		ret

; NZ — нажата любая клавиша Вектора (кроме F1/F3: они только для неуязвимости) или «огонь/вверх» джойстика
any_key:	ld	a,(vec_kbmat+1)
		and	0xD7
		ld	hl,vec_kbmat
		or	(hl)
		inc	hl
		inc	hl
		ld	b,6
ak0:		or	(hl)
		inc	hl
		dec	b
		jp	nz,ak0
		ld	b,a
		ld	a,(in_state)
		and	IN_JUMP
		or	b
		ret

title_v_zx0:	INCBIN	"../../build/vec/title_v.zx0"
		INCLUDE	"menu_txt.inc"

title_zx0:	INCBIN	"../../build/vec/title.zx0"
