; Wally: нативный i8080 по модели src/model/wally.js (сверка: tools/lockn.js).
; Соглашение: переменные — как в ZX (метки zxsym.inc), вывод — примитивы bmp16 (A = индекс спрайта; X, Y в BitmapX, BitmapY).

; HL = (Wally_X) -> HL = адрес атрибутов левой клетки под Wally, B = число строк клеток (4 или 5)
wg_attr:	ld	hl,(Wally_X)		; L = X, H = Y
		ld	a,h
		ld	b,4
		and	7
		jp	z,wga0
		inc	b			; не выровнен по клетке — 5 строк
wga0:		ld	a,h			; адрес = ATTR + (Y&0xF8)*4 + (X>>3)
		and	0xF8
		ld	h,0
		ld	e,a
		ld	d,0
		ld	a,l
		rrca
		rrca
		rrca
		and	0x1F
		ld	l,a			; L = столбец
		ld	h,0
		ex	de,hl			; DE = столбец, HL = (Y&0xF8)
		add	hl,hl
		add	hl,hl			; HL = (Y&0xF8)*4
		add	hl,de
		ld	de,ATTR
		add	hl,de
		ret

; два спрайта Wally 16x16 (верх и низ) в текущей позиции; индекс кадра — по PrevHead (голова)
wally_bmp:	ld	hl,(Wally_X)
		ld	(BitmapX),hl		; BitmapX = X, BitmapY = Y
		ld	a,(Wally_Frame)
		ld	c,a
		ld	a,(PrevHead)
		or	a
		jp	z,wb1
		ld	a,c
		cp	0x10
		jp	nc,wb_hi
		add	a,0x3E
		jp	wb2
wb_hi:		add	a,0x2F
		jp	wb2
wb1:		ld	a,c
wb2:		push	bc
		call	wally_half		; половина Wally: белая пижама + оранжевая кожа по MSX (wally_half)
		pop	bc
		ld	a,(BitmapY)
		add	a,0x10
		ld	(BitmapY),a
		ld	a,c
		inc	a
		jp	wally_half

Wally_Erase:	ld	a,(Wally_X)
		and	7
		ld	(Wally_ShiftValue),a
		call	wa_restore
		call	wally_bmp
		ld	a,(Wally_HeadTurned)
		ld	(PrevHead),a
		ret

; wa_restore: вернуть сохранённые цвета фона (Wally_BgColour) в карту атрибутов под Wally (только атрибуты, без пикселей); нужен и действиям, которые красят по карте (a_switch)
wa_restore:	ld	a,(Wally_ShiftValue)
		ld	c,a			; C = сдвиг
		call	wg_attr
		ld	de,Wally_BgColour
we_row:		ld	a,(de)			; вернуть сохранённые цвета фона
		ld	(hl),a
		inc	de
		inc	hl
		ld	a,(de)
		ld	(hl),a
		inc	de
		inc	hl
		ld	a,c
		or	a
		jp	z,we_x
		ld	a,(de)			; третий столбец — только при сдвиге
		ld	(hl),a
we_x:		inc	de
		ld	a,l			; следующая строка клеток: +32 (уже +2)
		add	a,30
		ld	l,a
		jp	nc,we_n
		inc	h
we_n:		dec	b
		jp	nz,we_row
		ret

Wally_Draw:	call	wally_bmp
wa_mark:	ld	a,(Wally_X)		; пометить клетки под Wally жёлтым 0x46 (прежние цвета — в Wally_BgColour)
		and	7
		ld	(Wally_ShiftValue),a
		ld	c,a
		ld	a,(Wally_Y)
		and	7
		ld	(Wally_CharAligned),a
		call	wg_attr
		ld	de,Wally_BgColour
wd_row:		ld	a,(hl)			; сохранить цвет клетки, поставить жёлтый
		ld	(de),a
		ld	(hl),0x46
		inc	de
		inc	hl
		ld	a,(hl)
		ld	(de),a
		ld	(hl),0x46
		inc	de
		inc	hl
		ld	a,c
		or	a
		jp	z,wd_x
		ld	a,(hl)
		ld	(de),a
		ld	(hl),0x46
wd_x:		inc	de
		ld	a,l
		add	a,30
		ld	l,a
		jp	nc,wd_n
		inc	h
wd_n:		dec	b
		jp	nz,wd_row
		ret


; ---- шаги (BCD в 4 байтах), тот же звук, что у ZX ----------------------------------------------------------
Wally_StepCheck:ld	a,(Wally_Frame)
		and	0xE7			; RES 3, RES 4: каждый 8-й кадр — шаг
		jp	nz,ws_clr
		ld	a,(Wally_StepFlag)
		or	a
		ret	nz
		ld	a,1
		ld	(Wally_StepFlag),a
Wally_StepsIncr:ld	bc,0x0701
		ld	de,0x0F01
		ld	hl,0x0404
		call	beep
		ld	hl,Steps_Count
		ld	a,(hl)
		add	a,1
		daa
		ld	(hl),a
		inc	hl
		ld	a,(hl)
		adc	a,0
		daa
		ld	(hl),a
		inc	hl
		ld	a,(hl)
		adc	a,0
		daa
		ld	(hl),a
		inc	hl
		ld	a,(hl)
		adc	a,0
		daa
		ld	(hl),a
		ret
ws_clr:		xor	a
		ld	(Wally_StepFlag),a
		ret

; ---- энергия (молоко) ------------------------------------------------------------------------------------
Energy_Countdown:
		ld	a,(IgnoreEnergy)
		or	a
		ret	nz
		ld	hl,(EnergyCounter)
		dec	hl
		ld	(EnergyCounter),hl
		ld	a,h
		or	l
		ret	nz
		ld	hl,0x012C
		ld	(EnergyCounter),hl
		ld	b,1			; потерять одну полосу

; B = на сколько строк уменьшить уровень молока (стирание строк — примитив milk_row)
Milk_DecreaseByAmount:
		ld	a,(inv_cheat)		; неуязвимость: энергия не убывает (иначе уровень уходит за 0x20 и строки молока портят экран)
		or	a
		ret	nz
		push	bc
		ld	bc,0xFF0A
		ld	de,0x0114
		ld	hl,0x3CC4
		call	beep
		pop	bc
		ld	a,(MilkLevel)
		ld	c,0xFF
		ld	e,a
		add	a,a
		add	a,e
		ld	e,a
		ld	d,0
		ld	hl,Bmp_MilkEmpty
		add	hl,de
; строки молока: B = счётчик, C = младший байт BC ZX (квирк: LDI по 3 байта уменьшает BC, заём из C портит B), HL = источник
dr_rows:	ld	a,(MilkLevel)
		push	bc
		push	hl
		call	milk_row		; A = строка, HL = 3 байта картинки
		pop	hl
		ld	de,3
		add	hl,de
		pop	bc
		ld	a,(MilkLevel)
		inc	a
		ld	(MilkLevel),a
		cp	0x20
		jp	z,dr_death		; стакан пуст
		dec	bc			; BC -= 3 (как три LDI)
		dec	bc
		dec	bc
		dec	b			; DJNZ
		jp	nz,dr_rows
		ret
dr_death:	ld	a,1
		ld	(DeathFlag),a
		ret

; B = на сколько строк долить
Wally_EnergyIncBy:
		ld	a,(MilkLevel)
		sub	b
		ld	c,a
		ld	(MilkLevel),a
		jp	nc,ei_ok
		call	milk_full		; полный стакан
		xor	a
		ld	(MilkLevel),a
		ret
ei_ok:		ld	e,a
		add	a,a
		add	a,e
		ld	e,a
		ld	d,0
		ld	hl,Bmp_MilkFull
		add	hl,de
		push	bc
		inc	b
		call	dr_rows
		pop	bc
		ld	a,c
		ld	(MilkLevel),a
		ret

; HL = (X, Y) чужого спрайта (L = X, H = Y); B = урон; попадание — минус молоко
Wally_HitTest:	ld	a,(DeathFlag)
		or	a
		ret	nz
		push	hl			; нет ld de,(nn): через HL
		ld	hl,(Wally_X)
		ex	de,hl			; E = X, D = Y
		pop	hl
		ld	a,l
		sub	e
		sub	0x0D
		cp	0xE6
		ret	c
		ld	a,h
		sub	d
		sub	0x1C
		cp	0xD6
		ret	c
		push	hl
		call	Milk_DecreaseByAmount
		pop	hl
		ret

; ---- падение -------------------------------------------------------------------------------------------
Wally_CheckFall:ld	a,(Wally_ATTR)
		cp	0x42
		jp	z,cf_sol
		cp	0x45
		jp	nz,cf_fall
cf_sol:		ld	a,(Wally_Y)
		and	7
		jp	nz,cf_fall
		xor	a
		ld	(Wally_Falling),a
		ret
cf_fall:	call	Wally_Erase
		ld	a,(Wally_Y)
		add	a,4
		ld	(Wally_Y),a
		jp	Wally_Draw

; ---- голова: A = кадр ходьбы ---------------------------------------------------------------------------
Wally_TurnHead:	or	a
		jp	z,th2
		cp	0x10
		jp	z,th2
		cp	0x0C
		jp	z,th0
		cp	0x1C
		jp	z,th0
		ld	a,(Wally_HeadCountdown)
		or	a
		ret	z
		jp	th3
th0:		ld	a,(Wally_HeadCountdown)
		or	a
		jp	nz,th3
		ld	(Wally_HeadTurned),a	; A = 0
		call	rnd_a
		and	0x1F
		ld	(Wally_HeadCountdown),a
		ret
th2:		ld	a,(Wally_HeadCountdown)
		or	a
		jp	nz,th3
		inc	a
		ld	(Wally_HeadTurned),a
		ret
th3:		dec	a
		ld	(Wally_HeadCountdown),a
		ret

; ---- ходьба ---------------------------------------------------------------------------------------------
Wally_Move:	call	Energy_Countdown
		ld	a,(Wally_Dir)
		cp	1
		jp	z,mv_r
		ld	a,(Wally_Frame)		; влево: кадры 0,2..0x0E
		ld	c,a
		call	Wally_TurnHead
		ld	a,c
		add	a,2
		cp	0x10
		jp	c,ml1
		xor	a
		ld	(Wally_HeadTurned),a
ml1:		push	af
		call	Wally_Erase
		pop	af
		ld	(Wally_Frame),a
		ld	hl,(Wally_X)
		ld	a,l
		sub	2
		cp	7
		jp	nc,ml2
		ld	a,7
ml2:		ld	l,a
		ld	(Wally_X),hl
		jp	Wally_Draw
mv_r:		ld	a,(Wally_Frame)		; вправо: кадры 0x10..0x1E
		ld	c,a
		call	Wally_TurnHead
		ld	a,c
		cp	0x10
		jp	nc,mr5
mr4:		xor	a
		ld	(Wally_HeadTurned),a
		ld	a,0x10
		jp	mr6
mr5:		add	a,2
		cp	0x20
		jp	nc,mr4
mr6:		push	af
		call	Wally_Erase
		pop	af
		ld	(Wally_Frame),a
		ld	hl,(Wally_X)
		ld	a,l
		add	a,2
		cp	0xE9
		jp	c,mr7
		ld	a,0xE9
mr7:		ld	l,a
		ld	(Wally_X),hl
		jp	Wally_Draw

; ---- прыжок ---------------------------------------------------------------------------------------------
Wally_Jump:	ld	a,(IsArcadeMode)
		or	a
		jp	nz,Wally_ShootCreate
		call	Energy_Countdown
		ld	a,(Wally_Dir)
		or	a
		jp	nz,wj0
		ld	a,(Wall_LastDir)
		ld	(Wally_Dir),a
wj0:		ld	(Wally_JumpDir),a
		xor	a
		ld	(Wally_JumpCount),a
; один шаг прыжка по таблице (X-вектор, Y-вектор, кадр), вправо — Dir == 1
Wally_JumpHandlerEntry:
		xor	a
		ld	(Wally_HeadTurned),a
		ld	a,(Wally_JumpCount)
		ld	e,a
		add	a,a
		add	a,e
		ld	e,a
		ld	d,0
		ld	hl,Wally_JumpTable
		add	hl,de
		ld	e,(hl)			; E = dx
		inc	hl
		ld	d,(hl)			; D = dy
		inc	hl
		ld	b,(hl)			; B = кадр
		ld	a,d
		dec	a
		and	0x80
		jp	nz,j_move		; идёт вверх — столкновения с полом нет
		ld	a,(Wally_ATTR)
		cp	0x42
		jp	z,j_chk
		cp	0x45
		jp	nz,j_move
j_chk:		ld	a,(Wally_Y)
		and	7
		jp	nz,j_move
		push	bc			; стоит на опоре: только перерисовать
		call	Wally_Erase
		pop	bc
		jp	j_after
j_move:		push	bc
		push	de
		call	Wally_Erase
		pop	de
		pop	bc
		ld	hl,(Wally_X)
		ld	a,h
		add	a,d
		ld	h,a
		ld	a,(Wally_Dir)
		cp	1
		jp	z,j_right
		ld	a,l
		sub	e
		cp	7
		jp	nc,j_l
		ld	a,7
j_l:		ld	l,a
		jp	j_store
j_right:	ld	a,l
		add	a,e
		cp	0xE9
		jp	c,j_r
		ld	a,0xE9
j_r:		ld	l,a
j_store:	ld	(Wally_X),hl
j_after:	ld	a,(Wally_Dir)
		cp	1
		ld	a,b
		jp	z,j_f30
		add	a,0x20
		jp	j_fs
j_f30:		add	a,0x30
j_fs:		ld	(Wally_Frame),a
		call	Wally_Draw
		ld	hl,Wally_JumpCount
		inc	(hl)
		ld	a,(hl)
		cp	0x0C
		ret	nz
		xor	a			; прыжок окончен
		ld	(Wally_Dir),a
		ld	(Wally_JumpDir),a
		jp	Wally_StepsIncr

; в аркаде (комната 1E) прыжок = выстрел «ножом и вилкой»
Wally_ShootCreate:
		ld	a,(Inv_BulletX)
		cp	0xFF
		jp	nz,Wally_Handler_5
		ld	hl,(Wally_X)
		ld	a,h
		sub	8
		ld	h,a
		ld	(Inv_BulletX),hl
		ld	(BitmapX),hl
		ld	a,0xBF
		call	bmp16
		ld	bc,0x1E0F
		ld	de,0x010F
		ld	hl,0x08F8
		call	beep
		jp	Wally_Handler_5

; ---- главный обработчик Wally (вход: in_state из ISR) -----------------------------------------------------
Wally_Handler:	ld	a,(Wally_CharAligned)
		or	a
		jp	nz,wh0
		ld	hl,(Wally_X)		; ATTR под ногами: пиксель (Y+0x20, X+8)
		ld	a,h
		add	a,0x20
		and	0xF8
		ld	e,a
		ld	d,0
		ld	a,l
		add	a,8
		rrca
		rrca
		rrca
		and	0x1F
		ld	l,a
		ld	h,0
		ex	de,hl
		add	hl,hl
		add	hl,hl
		add	hl,de
		ld	de,ATTR
		add	hl,de
		ld	a,(hl)
		ld	(Wally_ATTR),a
		ld	a,(Wally_BgColour+10)
		ld	(Wally_ATTRAlt),a
		jp	wh1
wh0:		ld	a,(Wally_BgColour+13)
		ld	(Wally_ATTRAlt),a
		ld	(Wally_ATTR),a
wh1:		ld	a,(IsArcadeMode)
		or	a
		jp	nz,wh2
		ld	a,(Wally_JumpDir)
		or	a
		jp	nz,Wally_JumpHandlerEntry
wh2:		ld	a,(Wally_Falling)
		or	a
		jp	nz,Wally_CheckFall
		ld	a,(Wally_ATTR)
		cp	0x45
		jp	z,wh3
		cp	0x42
		jp	z,wh3
		ld	a,1
		ld	(Wally_Falling),a
		jp	Wally_CheckFall
wh3:		ld	a,(in_state)
		and	IN_JUMP
		jp	nz,Wally_Jump
Wally_Handler_5:xor	a
		ld	(Wally_Dir),a
		ld	a,(in_state)
		ld	b,a
		and	IN_RIGHT
		jp	z,h5l
		ld	a,1
		ld	(Wally_Dir),a
		ld	(Wall_LastDir),a
		jp	Wally_Move
h5l:		ld	a,b
		and	IN_LEFT
		ret	z
		ld	a,0xFF
		ld	(Wally_Dir),a
		ld	(Wall_LastDir),a
		jp	Wally_Move

; ---- примитивы (этап 2 — заглушки; стенд перехватывает PC и пишет журнал) ------------------------------
rnd_a:		ld	a,(rnd_state)		; ГПСЧ: LCG + примесь счётчика кадров
		ld	b,a
		add	a,a
		add	a,a
		add	a,b
		inc	a
		ld	(rnd_state),a
		ld	b,a
		ld	a,(FRAMES)
		xor	b
		rrca
		xor	b
		ret
rnd_state:	db	0x5A
