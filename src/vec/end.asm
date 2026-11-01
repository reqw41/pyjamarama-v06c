; Конец игры: победа (действие 14), салют, экраны «проиграл/поздравляем/итоги», подсчёт очков. Нативный i8080 по ZX B610..B71A, B1AC, B219, B29C..B2CB, 84F4. Код — в MODSLOT_END (0xA000..).
; Интерфейс (вход/выход через память и регистры):
;   a_win              действие скрипта 14 (HL не используется); не возвращается: салют -> Screen_Congrats -> Screen_FinalScore -> jp title_return (метку определяет front.asm)
;   Screen_YouLost     экран «проиграл» -> любая клавиша -> итоги -> title_return (вызывать jp/call, обратно не вернётся)
;   Screen_Congrats / Screen_FinalScore  то же с соответствующего экрана
;   Game_CalculateScore  выход: A = процент (BCD); портит HL, B; ПОРТИТ таблицу Object_FoundTable (DEC (HL), как в ZX)
;   Game_DisplayFinalScore  шаги (Steps_Count BCD) и процент; TempStoreA — слагаемое процента
;   Fireworks          один проход салюта (10 ракет); Key_WaitAny — отпустить все, затем нажать любую (vec_kbmat/vj_fire)
; Таблица firework_ptrs (данные, 10 x 7 байт): слова начало/текущий/конец (сдвинуты на ZX_SHIFT) + цвет. Паузы салюта и тревоги — Pause_Short.

; ---- действие 14: победа ----
a_win:		call	a_win_body
		jp	Screen_Congrats
a_win_body:	call	Wally_Erase
		ld	a,1
		ld	(TempStoreA),a
		ld	b,0x19			; 25 раз звонок будильника
aw0:		push	bc
		ld	bc,0x020F
		ld	de,0x1902
		ld	hl,0x6401
		call	beep
		call	Pause_Short
		ld	bc,0x050F
		ld	de,0x1902
		ld	hl,0x6401
		call	beep
		call	Pause_Short
		pop	bc
		dec	b
		jp	nz,aw0
		call	clr_fx
		ld	hl,Furniture_FireworksBox
		ld	de,0x160E
		call	FurnitureDraw
		ld	b,0xB8
aw1:		push	bc
		call	Fireworks
		call	Pause_Short		; ZX: 10 ракет по ~6 мс = ~63 мс за проход
		pop	bc
		dec	b
		jp	nz,aw1
		ret

; ---- салют: один проход по 10 ракетам ----
Fireworks:	ld	b,10
		ld	hl,firework_ptrs
fw0:		push	bc
		ld	(fw_ent),hl
		inc	hl
		inc	hl
		ld	e,(hl)			; DE = текущий
		inc	hl
		ld	d,(hl)
		inc	hl
		ld	c,(hl)			; BC = конец
		inc	hl
		ld	b,(hl)
		ld	hl,6
		add	hl,de
		ex	de,hl			; DE = текущий + 6
		ld	a,e
		cp	c
		jp	nz,fw1
		ld	a,d
		cp	b
		jp	nz,fw1
		call	fw_reset		; дошли до конца скрипта: HL = начало
		jp	fw2
fw1:		ld	hl,(fw_ent)
		inc	hl
		inc	hl
		ld	(hl),e
		inc	hl
		ld	(hl),d
		ex	de,hl			; HL = текущий скрипт
fw2:		push	hl
		ld	hl,(fw_ent)
		ld	de,6
		add	hl,de
		ld	c,(hl)			; цвет
		pop	hl
		call	fw_one
		call	fw_one
		ld	hl,(fw_ent)
		ld	de,7
		add	hl,de
		pop	bc
		dec	b
		jp	nz,fw0
		ret
fw_ent:		dw	0

; случайный цвет (кроме синего), текущий = начало, взрыв; выход HL = начало скрипта
fw_reset:	call	rnd_a
		and	7
		cp	1
		jp	z,fw_reset
		or	0x40
		ld	hl,(fw_ent)
		ld	de,6
		add	hl,de
		ld	(hl),a
		ld	hl,(fw_ent)
		ld	e,(hl)
		inc	hl
		ld	d,(hl)
		inc	hl
		ld	(hl),e
		inc	hl
		ld	(hl),d
		push	de
		ld	bc,0x320A
		ld	de,0x0114
		ld	hl,0x7698
		call	beep
		pop	hl
		ret

; одна запись скрипта [тайл, X, Y]: HL -> следующая, C = цвет
fw_one:		ld	a,(hl)
		inc	hl
		ld	e,(hl)
		inc	hl
		ld	d,(hl)
		inc	hl
		cp	0xFE
		call	z,fw_explode
		cp	0xFD
		call	z,fw_erase
		cp	0xFB
		call	z,fw_split
		inc	e
		inc	e
		jp	tile
fw_explode:	ld	a,0x10
		inc	e
		inc	e
		call	tile
		inc	a
		inc	e
		call	tile
		inc	a
		ret
fw_erase:	xor	a
		inc	e
		inc	e
		call	tile
		inc	e
		jp	tile
fw_split:	ld	a,0x13
		inc	e
		inc	e
		call	tile
		inc	e
		inc	a
		call	tile
		inc	a
		ret

; ---- ожидание клавиши: все отпущены, затем любая нажата ----
Key_WaitAny:	call	kw_any
		jp	nz,Key_WaitAny
kw1:		call	kw_any
		jp	z,kw1
		ret
kw_any:		ld	hl,vec_kbmat
		ld	b,8
		ld	a,(vj_fire)
kw2:		or	(hl)
		inc	hl
		dec	b
		jp	nz,kw2
		or	a
		ret

; ---- подсчёт процента: A = BCD ----
Game_CalculateScore:
		ld	b,0x20
		ld	hl,Object_FoundTable
		xor	a
gc0:		dec	(hl)
		jp	nz,gc1
		inc	hl
		add	a,(hl)
		daa
		jp	gc2
gc1:		inc	hl
gc2:		inc	hl
		dec	b
		jp	nz,gc0
		ld	b,0x1E
gc3:		add	a,(hl)
		daa
		inc	hl
		dec	b
		jp	nz,gc3
		ret

; ---- шаги и итоговый процент двойной высотой ----
Game_DisplayFinalScore:
		ld	hl,Steps_Count_Upper
		ld	de,0x0708
		ld	c,0x46
		ld	b,4
gd0:		ld	a,(hl)
		rrca
		rrca
		rrca
		rrca
		and	0x0F
		jp	nz,gd1
		ld	a,(Digit_LeadZeroFlag)
		or	a
		jp	z,gd2
		xor	a			; ИСПРАВЛЕНО (в ZX здесь рисовалось «1»: 100 шагов выходило «111»): нуль после значащей цифры — «0»
gd1:		add	a,0x30
		call	tile_dbl
		ld	a,1
		ld	(Digit_LeadZeroFlag),a
gd2:		inc	e
		ld	a,(hl)
		and	0x0F
		jp	nz,gd3
		ld	a,(Digit_LeadZeroFlag)
		or	a
		jp	z,gd4
		xor	a
gd3:		add	a,0x30
		call	tile_dbl
		ld	a,1
		ld	(Digit_LeadZeroFlag),a
gd4:		inc	e
		dec	hl
		dec	b
		jp	nz,gd0
		xor	a
		ld	(Digit_LeadZeroFlag),a
		ld	a,(TempStoreA)
		ld	c,a
		call	Game_CalculateScore
		ld	de,0x100E
		add	a,c
		daa
		ld	c,0x47
		cp	0x99
		jp	nz,gd5
		ld	a,0x31			; 99 -> «100»
		call	tile_dbl
		ld	a,0x30
		inc	e
		call	tile_dbl
		inc	e
		jp	tile_dbl
gd5:		ld	(TempStoreA),a
		rrca
		rrca
		rrca
		rrca
		and	0x0F
		add	a,0x30
		call	tile_dbl
		inc	e
		ld	a,(TempStoreA)
		and	0x0F
		add	a,0x30
		jp	tile_dbl

; ---- экраны ----
Screen_YouLost:	call	scr_lost
		call	Key_WaitAny
		jp	Screen_FinalScore
scr_lost:	call	ScreenClearSimple
		ld	c,0x47			; белый
		ld	hl,StrLose
		ld	de,0
		jp	String_DrawDouble
Screen_Congrats:
		call	scr_congr
		call	Key_WaitAny
Screen_FinalScore:
		call	scr_final
		call	Key_WaitAny
		jp	title_return
scr_congr:	call	ScreenClearSimple
		ld	c,0x47
		ld	hl,StrCongrats
		ld	de,0
		jp	String_DrawDouble
scr_final:	call	ScreenClearSimple
		ld	c,0x47
		ld	hl,StrFinalScore
		ld	de,0x0208
		call	String_DrawDouble
		jp	Game_DisplayFinalScore
