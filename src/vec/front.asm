; Фронт: заставка (один раз при запуске) и меню (после заставки и после каждой игры). Нативный i8080.
; Заставка — экран ZX с idpixel.ru (tools/mktitle.py): рисунок в плоскости 0 (ZX0) + карта цветов ячеек 8x8 (ink биты 0-2, paper биты 3-5, ZX0); colorize раскладывает рисунок по плоскостям.
; Меню: выбор управления (клавиатура / джойстик «П» включаются и выключаются) и старт игры; тексты — menu_txt.inc (tools/mkmenu.py).


MENU_SCROLL	EQU	0x2A
; ---- заставка (только при запуске) ----
title_start:	ld	sp,STACK_TOP
		ld	hl,title_tail		; начало хвоста — 16 нулей: чёрная палитра, распаковку не видно
		ld	(pal_ptr),hl
		xor	a			; бордюр на заставке — чёрный (индекс 0 = код 0, чёрный)
		ld	(bord_idx),a
		ld	a,3
		ld	(pal_load),a
		ld	c,4
tt_b:		call	frame_wait		; подождать, пока чёрная палитра загрузится
		dec	c
		jp	nz,tt_b
		ld	hl,tp_0			; плоскость 0 (поток лежит в плоскости 2)
		ld	bc,0x8000
		call	dzx0
		ld	hl,tp_1			; плоскость 1
		ld	bc,0xA000
		call	dzx0
		ld	hl,tp_2			; плоскость 2: поток лежит в конце неё же — распаковка «на месте» (вывод всегда не меньше ввода)
		ld	bc,0xC000
		call	dzx0
		ld	hl,title_tail		; хвост плоскости 2 (не сжат) на место
		ld	de,0xE000-TP_TRIM
		ld	b,TP_TRIM
tt_fl:		ld	a,(hl)
		ld	(de),a
		inc	hl
		inc	de
		dec	b
		jp	nz,tt_fl
		ld	hl,pal_fade		; плавное появление: яркость палитры 1/8 .. 8/8 (pal_title — последняя ступень)
		ld	c,8
tt_fd:		ld	(pal_ptr),hl
		ld	a,3
		ld	(pal_load),a
		ld	de,16
		add	hl,de
		ld	b,4
tt_fw:		push	bc
		call	frame_wait
		pop	bc
		dec	b
		jp	nz,tt_fw
		dec	c
		jp	nz,tt_fd
tt_up:		call	any_key			; ждать, пока всё отпущено
		jp	nz,tt_up
tt_w:		call	frame_wait
		call	any_key
		jp	z,tt_w
		call	clear_screen		; заставка убрана: логотип игры распаковывается в экран один раз и остаётся на всю игру
		call	draw_logo
		jp	title_return

; ---- меню ----
title_return:	call	mus_start		; после игры мелодия меню заново
menu_start:	ld	sp,STACK_TOP
		ld	a,MENU_SCROLL		; сдвиг экрана скроллингом: логотип из нижней полосы — наверх
		ld	(scroll_v),a
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
		xor	a			; в меню фон чёрный (как в ремейке PICO-8); в игре — прежний тёмно-синий
		ld	(pal),a
		ld	(pal+1),a
		call	clear_area		; логотип уже в экране — не трогаем
		ld	a,32+8*9+3		; белые линии-рамки над и под описанием управления (строки экрана 9 и 15)
		call	mn_rule
		ld	a,32+8*15+3
		call	mn_rule
		ld	hl,Bmp_Tiles		; база тайлов шрифта (в образе — ZX-адрес)
		ld	(TileStartPtr),hl
		ld	hl,mn_head
		call	mn_list
		call	mn_copy			; значок (c) в круге (после текста: пробелы строки его бы стёрли)
		call	mn_redraw
mnl_loop:	call	frame_wait
		ld	a,(vec_kbmat+1)		; Ф1 + Ф3 вместе — старт с неуязвимостью
		and	0x28
		cp	0x28
		jp	nz,mnl_nc
		ld	(inv_cheat),a
		jp	mn_go
mnl_nc:		ld	a,(vec_kbmat+2)		; цифры, как в ZX: 1 — клавиатура, 2 — джойстик, 0 — начать игру (только новые нажатия)
		and	7
		ld	hl,m_prev
		ld	b,(hl)
		ld	(hl),a
		ld	c,a
		ld	a,b
		cpl
		and	c
		rrca
		jp	c,mn_go
		rrca
		jp	nc,mnl_2
		ld	a,1			; клавиатура
		jp	mnl_set
mnl_2:		rrca
		jp	nc,mnl_loop
		ld	a,2			; джойстик «П»
mnl_set:	ld	(in_mask),a
		call	mn_redraw
		jp	mnl_loop
mn_go:		call	mus_stop
		call	any_key			; старт: дождаться, пока отпустят кнопки (ВК не должен стать паузой)
		jp	nz,mn_go
		ld	a,0xFF
		ld	(scroll_v),a		; в игре без сдвига
		ld	a,0x49			; фон игры — тёмно-синий
		ld	(pal),a
		ld	(pal+1),a
		ld	a,3
		ld	(pal_load),a
		ld	hl,pal
		ld	(pal_ptr),hl
		xor	a
		ld	(paused),a
		ld	hl,vk_prev
		ld	(hl),a
		jp	Game_Start

; mn_rule: белая линия на всю ширину в строке экрана A (0 — верх), плоскость 0 (цвет 1)
mn_rule:	cpl
		ld	e,a			; e = 255 - y
		ld	d,0x80
mnr_l:		ld	a,0xFF
		ld	(de),a
		inc	d
		ld	a,d
		cp	0xA0
		jp	nz,mnr_l
		ret
; mn_copy: строка «(c) MICRO-GEN» глифами 8x8 (белые, плоскость 0): MN_CPY_N тайлов с колонки MN_CPY_C, строка 19
mn_copy:	ld	hl,mn_cpg
		ld	d,0x80+MN_CPY_C
		ld	c,MN_CPY_N
mnc_t:		ld	e,0xDF-8*19
		ld	b,8
mnc_l:		ld	a,(hl)
		ld	(de),a
		inc	hl
		dec	e
		dec	b
		jp	nz,mnc_l
		inc	d
		dec	c
		jp	nz,mnc_t
		ret
; перерисовать пункты (курсор оранжевый, у включённых устройств звёздочка) и панель описания
mn_redraw:	ld	b,0
mr_i:		ld	hl,mn_it
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
		inc	hl			; колонка текста — 6
		ld	c,1			; белый
		ld	a,b
		cp	2
		jp	nz,mr_i2
		ld	c,6			; «начать игру» — оранжевый
mr_i2:		ld	e,6
		call	mt1
		ld	a,b
		cp	2
		jp	nc,mr_i3
		inc	a			; маска устройства: 1 — клавиатура, 2 — джойстик
		ld	h,a
		ld	c,1
		ld	e,18			; звёздочка у выбранного
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
		ret
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

; ---- мелодия Олега Никитина (AY -> ВИ53, tools/mkmusic.py): канал 1 (порт 0x0A, слово 0x76) — мелодия, канал 2 (порт 0x09, слово 0xB6) — арпеджио аккордов; ноты ходит ISR раз в кадр ----
mus_start:	ld	a,MUS_PASSES-1		; сколько раз повторить после первого прохода
		ld	(m1_rep),a
		ld	(m2_rep),a
		ld	hl,mus_mel
		ld	(m1_p),hl
		ld	hl,mus_chd
		ld	(m2_p),hl
		xor	a
		ld	(m1_c),a
		ld	(m2_c),a
		ld	(m2_last),a
		inc	a
		ld	(mus_on),a
		ret
mus_stop:	xor	a
		ld	(mus_on),a
		ld	a,0x70			; режим 0 без счёта — тишина
		out	(0x08),a
		ld	a,0xB0
		out	(0x08),a
		ret
mus_tick:	ld	a,(mus_on)
		or	a
		ret	z
		ld	hl,m1_c			; ---- мелодия: пары (нота, кадров), 0 кадров — конец
		ld	a,(hl)
		or	a
		jp	nz,mt1c
		ld	hl,(m1_p)
		ld	b,(hl)
		inc	hl
		ld	a,(hl)
		inc	hl
		or	a
		jp	nz,mt1s
		ld	a,(m1_rep)		; маркер конца: ещё есть проходы — сначала; иначе концовка, а за ней второй маркер — стоп
		or	a
		jp	z,mt1e
		dec	a
		ld	(m1_rep),a
		ld	hl,mus_mel
mt1e:		ld	b,(hl)
		inc	hl
		ld	a,(hl)
		inc	hl
		or	a
		jp	z,mus_stop
mt1s:		ld	(m1_p),hl
		ld	(m1_c),a
		ld	a,b
		or	a
		jp	nz,mt1n
		ld	a,0x70
		out	(0x08),a
		jp	mt1c
mt1n:		call	mus_div_hl
		ld	a,0x76
		out	(0x08),a
		ld	a,(hl)
		out	(0x0A),a
		inc	hl
		ld	a,(hl)
		out	(0x0A),a
mt1c:		ld	hl,m1_c
		dec	(hl)
		ld	hl,m2_c			; ---- аккорды: тройки (длина | тип<<7, низ, середина | верх<<4), 0 — конец
		ld	a,(hl)
		or	a
		jp	nz,mt2c
		ld	hl,(m2_p)
		ld	a,(hl)
		or	a
		jp	nz,mt2s
		ld	a,(m2_rep)
		or	a
		jp	z,mt2e
		dec	a
		ld	(m2_rep),a
		ld	hl,mus_chd
		jp	mt2f
mt2e:		inc	hl			; концовка; за ней второй ноль — стоп
		ld	a,(hl)
		or	a
		jp	z,mus_stop
		jp	mt2s
mt2f:		ld	a,(hl)
mt2s:		inc	hl
		ld	b,(hl)			; низ
		inc	hl
		ld	c,(hl)
		inc	hl
		ld	(m2_p),hl
		ld	d,a
		and	0x7F
		ld	(m2_c),a
		ld	a,d
		rlca
		and	1
		add	a,5			; длина шаблона арпеджио: 5 или 6 кадров
		ld	(m2_n),a
		ld	a,b
		ld	(c_low),a
		ld	a,c
		and	15
		add	a,b
		ld	(c_mid),a
		ld	a,c
		rrca
		rrca
		rrca
		rrca
		and	15
		add	a,b
		ld	(c_top),a
		xor	a
		ld	(m2_ph),a
mt2c:		ld	hl,m2_c
		dec	(hl)
		ld	a,(m2_ph)		; нота кадра: шаблон верх, середина, низ, низ, середина[, верх]
		ld	e,a
		ld	d,0
		ld	hl,mus_pat
		add	hl,de
		ld	e,(hl)
		ld	hl,c_low
		add	hl,de
		ld	b,(hl)
		ld	a,(m2_ph)
		inc	a
		ld	hl,m2_n
		cp	(hl)
		jp	c,mt2p
		xor	a
mt2p:		ld	(m2_ph),a
		ld	a,(m2_last)		; та же нота — не трогать канал (иначе счётчик перезапускается)
		cp	b
		ret	z
		ld	a,b
		ld	(m2_last),a
		or	a
		jp	nz,mt2n
		ld	a,0xB0
		out	(0x08),a
		ret
mt2n:		call	mus_div_hl
		ld	a,0xB6
		out	(0x08),a
		ld	a,(hl)
		out	(0x09),a
		inc	hl
		ld	a,(hl)
		out	(0x09),a
		ret
mus_div_hl:	dec	a			; A = нота 1..61 -> HL -> делитель
		add	a,a
		ld	e,a
		ld	d,0
		ld	hl,mus_div
		add	hl,de
		ret
mus_pat:	db	2,1,0,0,1,2
mus_on:		db	0
MUS_PASSES	EQU	2		; мелодия играется 2 раза, потом концовка и тишина
m1_rep:		db	0
m2_rep:		db	0
m1_c:		db	0
m1_p:		dw	0
m2_c:		db	0
m2_p:		dw	0
m2_ph:		db	0
m2_n:		db	5
m2_last:	db	0
c_low:		db	0
c_mid:		db	0
c_top:		db	0
		INCLUDE	"music_gen.inc"

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

		INCLUDE	"menu_txt.inc"

