; Железо Вектора-06Ц: загрузка, прерывание (палитра, кадры, клавиатура, джойстик «П»), ввод игры.
; Образцы — публичные jetpac-v06c (src/vec/main.asm) и alien8-v06c (vec_scan, vec_zxmap, vec_joy); тут ввод идёт прямо из матрицы Вектора.

STACK_TOP	EQU	0x8000			; стек растёт вниз от 0x8000: 0x7F00..0x7FFF (docs/PORT_PLAN.md, раскладка)
IN_RIGHT	EQU	0x01			; in_state: вправо, влево, прыжок (он же «огонь» в аркаде)
IN_LEFT		EQU	0x02
IN_JUMP		EQU	0x04

		ORG	0x0000
		di
		ld	sp,STACK_TOP
		jp	boot
		ORG	0x0038
		jp	isr			; RST 38h — кадровое прерывание
		ORG	CODE_BASE		; код — в плоскости 3 (0xE000..), невидима при палитре с равными парами индексов

boot:		ld	a,0x88			; ППА: порт A — скролл/ряд клавиатуры, B — бордюр/режим
		out	(0x00),a
		xor	a
		out	(0x02),a		; бордюр чёрный, режим 256
		ld	a,0xFF
		out	(0x03),a		; скролл
		ld	a,0x83			; джойстик «П»: ППИ2 83h, порт 5 = 9Fh, чтение — порт 6
		out	(0x04),a
		ld	a,0x9F
		out	(0x05),a
		in	a,(0x06)
		ld	(vj_rest+1),a		; значение покоя (шина без джойстика)
		xor	a
		ld	(FRAMES),a
		ld	a,3
		ld	(pal_load),a		; палитру грузить в VBlank
		call	snd_init		; ВИ53: секундомер и тишина
		ei			; экран не чистим: в плоскостях 1-2 лежат сжатые данные заставки (title_start)
		jp	game_main

; очистить три видимые плоскости (0x8000..0xDFFF); плоскость 3 (0xE000..) невидима и занята кодом ядра
clear_screen:	ld	hl,0x8000
		ld	bc,0x6000
		jp	cs0
clear_area:	ld	d,0x80			; весь экран, кроме логотипа (колонки LOGO_PAGE.. в каждой плоскости, строки LOGO_L0-LOGO_ROWS+1..LOGO_L0)
ca_p:		ld	a,d
		and	0x1F
		sub	LOGO_PAGE & 0x1F
		cp	LOGO_COLS
		ld	e,0
		jp	nc,ca_n
		xor	a
		ld	(de),a			; байты 0..1 колонки и всё выше логотипа
		inc	e
		ld	(de),a
		ld	e,LOGO_L0+1
ca_n:		xor	a
ca_l:		ld	(de),a
		inc	e
		jp	nz,ca_l
		inc	d
		ld	a,d
		cp	0xE0
		jp	nz,ca_p
		ret
clear_planes12:	ld	hl,0xA000		; только плоскости 1-2 (0xA000..0xDFFF)
		ld	bc,0x4000
cs0:		ld	(hl),0
		inc	hl
		dec	bc
		ld	a,b
		or	c
		jp	nz,cs0
		ret

; --- прерывание: палитра (только в VBlank), кадр, клавиатура, вход игры ----------------------------------
isr:		push	af
		push	bc
		push	de
		push	hl
		ld	a,(pal_load)		; палитра: несколько кадров подряд (защёлкивается цветом под лучом)
		or	a
		jp	z,isr_np
		dec	a
		ld	(pal_load),a
		ld	hl,(pal_ptr)
		ld	de,15
		add	hl,de
		ld	e,0x0F
isr_p0:		ld	a,e
		out	(0x02),a		; индекс — через порт бордюра
		ld	a,(hl)
		dec	hl
		out	(0x0C),a
		out	(0x0C),a
		out	(0x0C),a
		out	(0x0C),a
		dec	e
		jp	p,isr_p0
		ld	a,(bord_idx)
		out	(0x02),a		; бордюр — цвет из палитры по индексу bord_idx (в игре 0, на заставке белый)
isr_np:		ld	hl,FRAMES
		inc	(hl)
		call	vec_scan
		call	in_build
		ld	a,(vec_kbmat)		; ВК — пауза вкл/выкл (по фронту нажатия)
		and	0x04
		ld	hl,vk_prev
		ld	b,(hl)
		ld	(hl),a
		jp	z,isr_nv
		cp	b
		jp	z,isr_nv
		ld	a,(paused)
		xor	1
		ld	(paused),a
isr_nv:
		call	snd_poll_isr		; звук: продвинуть ноты (раз в кадр; в паузе игры — чаще)
		call	mus_tick		; мелодия меню (канал 1)
		pop	hl
		pop	de
		pop	bc
		pop	af
		ei
		ret

FRAMES:		db	0			; кадров по прерыванию (по модулю 256)
paused:		db	0			; 1 — пауза (ВК)
vk_prev:	db	0
pal_load:	db	3
bord_idx:	db	0			; индекс палитры бордюра
pal_ptr:	dw	pal			; текущая палитра (заставка — pal_title)
vj_fire:	db	0

; палитра (цвета PICO-8 по docs/COLOR.md): индекс = p8000<<3|pA000<<2|pC000<<1|pE000 (плоскость 3 не участвует: пары равны). Код цвета v: бит k = плоскость k (0 = 0x8000, 1 = 0xA000, 2 = 0xC000):
; v=0 фон — тёмно-синий, 1 БЕЛЫЙ (пижама Wally, плоскость 0), 2 красный (движущиеся, плоскость 1; потолок, стенки), 3 голубой (пол, вода), 4 зелёный (движущиеся, плоскость 2; перила, диван),
; 5 фиолетовый (ZX-пурпурный: двери, надписи), 6 оранжевый (ZX-жёлтый статики: люстра, шкафы, предметы; кожа Wally — плоскости 1+2), 7 светло-коричневый. ZX ink -> v: 0,1,2,5,4,3,6,7 (gx_inkv). Байт палитры BBGGGRRR.
pal:		db	0x49,0x49, 0x70,0x70, 0x47,0x47, 0x2F,0x2F, 0xFF,0xFF, 0xDD,0xDD, 0xE9,0xE9, 0x66,0x66

; --- клавиатура Вектора: vec_scan -> vec_kbmat[8] (1 = нажата) ---------------------------------------------
vec_kbmat:	ds	8
kb_chg:		db	0
vec_scan:	ld	a,0x8A			; порт B на вход
		out	(0x00),a
		ld	hl,vec_kbmat
		ld	b,0xFE
		ld	c,0
vs0:		ld	a,b
		out	(0x03),a
		in	a,(0x02)
		cpl
		ld	d,a
		xor	(hl)
		or	c
		ld	c,a
		ld	(hl),d
		inc	hl
		ld	a,b
		rlca
		ld	b,a
		jp	c,vs0
		ld	a,c
		ld	(kb_chg),a
		ld	a,0x88
		out	(0x00),a
		ld	a,(scroll_v)
		out	(0x03),a		; скролл на место (порт 3 = скролл!); 0xFF — без сдвига, в меню логотип сдвинут наверх
		ld	a,(bord_idx)
		out	(0x02),a
		ret

; --- вход игры: in_state = IN_RIGHT|IN_LEFT|IN_JUMP из клавиатуры и джойстика «П» -------------------------------
; клавиши: стрелки ←/→, пробел и ↑ — прыжок; как в ZX-оригинале O/P/M (влево/вправо/прыжок); джойстик «П»: огонь — прыжок
scroll_v:	db	0xFF
in_state:	db	0
in_mask:	db	1
in_build:	ld	a,(vec_kbmat+0)		; стрелки: 0x10 влево, 0x40 вправо, 0x20 вверх
		ld	b,a
		ld	c,0
		and	0x40
		jp	z,ib1
		ld	c,IN_RIGHT
ib1:		ld	a,b
		and	0x10
		jp	z,ib2
		ld	a,c
		or	IN_LEFT
		ld	c,a
ib2:		ld	a,b
		and	0x20			; вверх
		jp	z,ib3
		ld	a,c
		or	IN_JUMP
		ld	c,a
ib3:		ld	a,(vec_kbmat+7)		; пробел
		and	0x80
		jp	z,ib4
		ld	a,c
		or	IN_JUMP
		ld	c,a
ib4:		ld	a,(vec_kbmat+6)		; P — вправо
		and	0x01
		jp	z,ib5
		ld	a,c
		or	IN_RIGHT
		ld	c,a
ib5:		ld	a,(vec_kbmat+5)		; O — влево, M — прыжок
		ld	b,a
		and	0x80
		jp	z,ib6
		ld	a,c
		or	IN_LEFT
		ld	c,a
ib6:		ld	a,b
		and	0x20
		jp	z,ib7
		ld	a,c
		or	IN_JUMP
		ld	c,a
ib7:		ld	a,(in_mask)		; бит 0 — клавиатура, бит 1 — джойстик (меню)
		ld	b,a
		rrca
		jp	c,ib7k
		ld	c,0
ib7k:		ld	a,b
		and	2
		jp	z,ib9
		in	a,(0x06)		; джойстик «П»
vj_rest:	xor	0xFF			; покой -> 1 = нажато
		ld	b,a
		and	0x30			; биты 4,5 в покое единица: иначе порта нет — не считать
		jp	nz,ib9
		ld	a,b
		and	0x0F			; 0 вправо, 1 влево, 2 вверх, 3 вниз
		ld	d,a
		and	IN_RIGHT|IN_LEFT
		or	c
		ld	c,a
		ld	a,b
		and	0xC0			; огонь (биты 6,7)
		jp	z,ib8
		ld	a,c
		or	IN_JUMP
		ld	c,a
ib8:		ld	a,d
		and	0x04			; вверх — прыжок
		jp	z,ib9
		ld	a,c
		or	IN_JUMP
		ld	c,a
ib9:		ld	a,c
		ld	(in_state),a
		ret
