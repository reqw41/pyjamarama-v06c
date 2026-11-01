; Фронт: заставка (картинка ZX0 + мелодия на канале 1 ВИ53), цикл «заставка → игра → конец → заставка». Нативный i8080. Код — в MODSLOT_FRONT (0xC000..).
; Заставка — линейный рисунок чернилами из экрана ZX (tools/mktitle.py): картинка (плоскость 0) + карта цветов ячеек 8x8 (код цвета v, ZX0) — colorize раскладывает рисунок по плоскостям,
; палитра заставки pal_title — оригинальные цвета ZX Spectrum: карта = байт на ячейку (ink биты 0-2, paper биты 3-5), цвет ZX = код (бит 0 — плоскость 0 и т. д.). Меню/настройка клавиш/демо ZX не переносятся (управление фиксировано: docs/PORT_PLAN.md).

pal_title:	db	0x00,0x00, 0x28,0x28, 0x05,0x05, 0x2D,0x2D, 0x80,0x80, 0xA8,0xA8, 0x85,0x85, 0xAD,0xAD	; оригинальные цвета ZX (обычная яркость): код = цвет ZX (0 чёрный, 1 синий, 2 красный, 3 пурпурный, 4 зелёный, 5 циан, 6 жёлтый, 7 белый)

; ---- заставка ----
title_start:
title_return:	ld	sp,STACK_TOP
		xor	a
		ld	(inv_cheat),a		; неуязвимость включается только F1+F3 на заставке
		call	snd_stop
		call	mus_stop
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
		ld	hl,Bmp_Tiles		; база тайлов шрифта (в образе — ZX-адрес)
		ld	(TileStartPtr),hl
		ld	hl,StrAnyKey		; «PRESS A KEY TO CONTINUE» одинарным шрифтом
		ld	de,0x1704
		ld	c,0x46
		call	FurnitureDraw
		ld	hl,title_v_zx0		; карта цветов ячеек -> ATTR (поверх атрибутов надписи; игре на заставке карта не нужна: Game_Start её перезаполняет)
		ld	bc,ATTR
		call	dzx0
		call	colorize		; надпись нарисована до этого в плоскости 0 как часть рисунка: чернила — по карте
		call	title_logo		; пиксели логотипа с цветом, отличным от цвета ячейки
tt_up:		call	any_key			; ждать, пока всё отпущено
		jp	nz,tt_up
		call	mus_start
tt_loop:	ld	a,(FRAMES)
		ld	b,a
tt_w:		ld	a,(FRAMES)
		cp	b
		jp	z,tt_w
		ld	a,(vec_kbmat+1)		; F1 (0x08) + F3 (0x20) вместе — старт с неуязвимостью
		and	0x28
		cp	0x28
		jp	nz,tt_nc
		ld	(inv_cheat),a
		jp	tt_go
tt_nc:		call	any_key
		jp	nz,tt_go
		ld	a,(mus_end)		; мелодия кончилась — играть заново (демо ZX не переносится)
		or	a
		jp	z,tt_loop
		call	mus_start
		jp	tt_loop
tt_go:		call	mus_stop
		xor	a
		ld	(bord_idx),a		; в игре бордюр — цвет 0
		ld	hl,pal
		ld	(pal_ptr),hl
		ld	a,3
		ld	(pal_load),a
		jp	Game_Start

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

; ---- музыка: канал 1 ВИ53 (порт 0x0A, управляющее слово 0x76), ноты ходит ISR раз в кадр (mus_tick из прерывания) ----
; Партитура — Music_ScoreSheet из образа данных: пары (повтор, нота), 0 — конец, нота FF — пауза; каждая нота повторяется «повтор» раз, после каждого повтора — кадр тишины.
mus_start:	ld	hl,Music_ScoreSheet
		ld	(mus_p),hl
		xor	a
		ld	(mus_rep),a
		ld	(mus_end),a
		ld	(mus_ph),a
		inc	a
		ld	(mus_cnt),a		; следующий mus_tick возьмёт первую запись (фаза «пауза»)
		ld	(mus_ph),a
		ld	(mus_on),a
		ret
mus_stop:	xor	a
		ld	(mus_on),a
mus_sil:	ld	a,0x70			; канал 1: режим 0 без счёта — тишина
		out	(0x08),a
		ret
mus_tick:	ld	a,(mus_on)
		or	a
		ret	z
		ld	hl,mus_cnt
		dec	(hl)
		ret	nz
		ld	a,(mus_ph)
		or	a
		jp	nz,mus_adv
		call	mus_sil			; нота доиграла: кадр тишины
		ld	a,1
		ld	(mus_ph),a
		ld	(mus_cnt),a
		ret
mus_adv:	ld	a,(mus_rep)		; пауза кончилась: повтор или следующая запись
		or	a
		jp	z,mus_fetch
		dec	a
		ld	(mus_rep),a
		jp	mus_play
mus_fetch:	ld	hl,(mus_p)
		ld	a,(hl)
		or	a
		jp	z,mus_over
		ld	b,a			; повтор
		inc	hl
		ld	a,(hl)
		inc	hl
		ld	(mus_p),hl
		ld	(mus_note),a
		cp	0xFF
		jp	nz,mus_nn
		xor	a			; пауза 6 кадров, без повторов
		ld	(mus_rep),a
		ld	a,6
		ld	(mus_cnt),a
		jp	mus_sil
mus_nn:		ld	a,b
		dec	a
		ld	(mus_rep),a
mus_play:	ld	a,(mus_note)
		dec	a
		ld	e,a
		ld	d,0
		ld	hl,mus_n_fr
		add	hl,de
		ld	a,(hl)
		ld	(mus_cnt),a
		ld	hl,mus_n_div
		add	hl,de
		add	hl,de
		ld	a,0x76
		out	(0x08),a
		ld	a,(hl)
		out	(0x0A),a
		inc	hl
		ld	a,(hl)
		out	(0x0A),a
		xor	a
		ld	(mus_ph),a
		ret
mus_over:	xor	a
		ld	(mus_on),a
		inc	a
		ld	(mus_end),a
		jp	mus_sil
mus_on:		db	0
mus_end:	db	0
mus_ph:		db	0			; 0 — звучит нота, 1 — пауза/тишина
mus_cnt:	db	0			; кадров до смены
mus_rep:	db	0
mus_note:	db	0
mus_p:		dw	0
		INCLUDE	"music_gen.inc"

		INCLUDE	"dzx0.asm"
title_zx0:	INCBIN	"../../build/vec/title.zx0"




