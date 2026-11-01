; Потоки игры: диспетчер событий комнаты, смерть и воскрешение Wally, ловушка с перчаткой, верёвка, GameLoop.
; Нативный i8080 по src/model/flow.js (сверка: tools/lockn.js; NOEV=1 — без обработчиков комнат). «LD SP,0 / JP GameLoop» ZX = loop_restart.

TICK_FRAMES	EQU	2			; кадров на шаг игры: 25 шагов/с (ZX по замеру 26..33: стоит 33, идёт 26)

loop_restart:	ld	sp,STACK_TOP
		jp	GameLoop

; шаг игры: девять вызовов + пауза (GameLoop ZX B354)
GameLoop:	call	pause_chk
		ld	a,(FRAMES)		; начало шага: темп держим от него (если работа дольше TICK_FRAMES — не ждём)
		ld	(tick_f0),a
		call	Wally_Handler
		call	Wally_StepCheck
		call	Wally_CheckForDeath
		call	Wally_TestObjSlot
		call	Game_PercentUpdate
		call	Room_EventCaller
		call	Game_ExitCheck
		call	Food_CheckPickup
		call	Room_TestEvents
		call	Tick_Wait
		jp	GameLoop

; ожидание конца шага: от tick_f0 должно пройти TICK_FRAMES кадров; пока ждём — продвигаем ноты (прерывания включены: при DI кадр теряется)
Tick_Wait:	ld	a,(FRAMES)
		ld	hl,tick_f0
		sub	(hl)
		cp	TICK_FRAMES
		ret	nc
		ld	a,1
		ld	(snd_busy),a
		call	snd_poll
		xor	a
		ld	(snd_busy),a
		jp	Tick_Wait
tick_f0:	db	0
inv_cheat:	db	0			; 1 — неуязвимость (F1+F3 на заставке)

; пауза внутри анимаций (смерть, воскрешение, салют, ракета...): у ZX Pause_Short = 3500 проходов по 26 тактов = 26 мс + работа цикла (~12 мс).
; У нас работа быстрее, поэтому ждём 30 мс по секундомеру ВИ53 (1,5 МГц: 0xB000 = 45056 отсчётов = 30 мс). Портит A, B (как раньше: HL, DE сохраняются).
Pause_Short:	call	pause_chk
		push	hl
		push	de
		call	snd_now
		ld	(ps_t0),hl
ps0:		ld	a,1			; в ожидании часто продвигаем ноты (звук играет таймером, ЦП только меняет делитель).
		ld	(snd_busy),a		; Прерывания НЕ отключаем: кадровое прерывание при DI теряется. На время опроса ISR свой опрос пропускает.
		call	snd_poll
		xor	a
		ld	(snd_busy),a
		call	snd_now			; HL = сейчас; прошло = t0 - сейчас (счёт вниз)
		ex	de,hl
		ld	hl,(ps_t0)
		ld	a,l
		sub	e
		ld	a,h
		sbc	a,d
		cp	0xB0
		jp	c,ps0
		pop	de
		pop	hl
		ret
ps_t0:		dw	0

; пауза по ВК: звук стихает, ждём второго нажатия ВК; АР2 (Esc) — выход на заставку (в ZX: SHIFT+SPACE)
pause_chk:	ld	a,(paused)
		or	a
		ret	z
		xor	a
		ld	(snd_ph),a
		ld	(snd_qc),a
		ld	(snd_qr),a
		call	snd_stop
pk0:		ld	a,(vec_kbmat+1)
		and	0x04
		jp	nz,title_return
		ld	a,(paused)
		or	a
		jp	nz,pk0
		ret
Game_ExitCheck:	ld	a,(vec_kbmat+1)		; АР2 (Esc) — выход на заставку
		and	0x04
		ret	z
		jp	title_return

; ---- диспетчер событий комнаты ----
Room_EventCaller:
		ld	a,(Wally_RoomNo)
		add	a,a
		ld	e,a
		ld	d,0
		ld	hl,rev_tab
		add	hl,de
		ld	e,(hl)
		inc	hl
		ld	d,(hl)
		ex	de,hl
rec1:		ld	e,(hl)
		inc	hl
		ld	d,(hl)
		inc	hl
		ld	a,d
		or	e
		ret	z
		push	hl			; указатель списка — в стек, обработчик вернётся в rec2
		ld	hl,rec2
		push	hl
		push	de
		ret
rec2:		pop	hl
		jp	rec1
; Диспетчер событий комнаты: список обработчиков на комнату (по ROOM_SEQ в src/model/flow.js), конец списка — 0.
rev_tab:
	dw	rev_00
	dw	rev_01
	dw	rev_02
	dw	rev_03
	dw	rev_04
	dw	rev_05
	dw	rev_06
	dw	rev_07
	dw	rev_08
	dw	rev_09
	dw	rev_0A
	dw	rev_0B
	dw	rev_0C
	dw	rev_0D
	dw	rev_0E
	dw	rev_0F
	dw	rev_10
	dw	rev_11
	dw	rev_12
	dw	rev_13
	dw	rev_14
	dw	rev_15
	dw	rev_16
	dw	rev_17
	dw	rev_18
	dw	rev_19
	dw	rev_1A
	dw	rev_1B
	dw	rev_1C
	dw	rev_1D
	dw	rev_1E
rev_empty:	dw	0
rev_00:	dw	Update_RollRock,0
rev_01:	dw	Update_RollBall,0
rev_02:	dw	Handler_Angels,Handler_Food,Handler_SpookyHand,0
rev_03:	dw	Handler_Chickens,0
rev_04:	dw	Handler_Darts,0
rev_05:	dw	Handler_BouncingAxe,0
rev_06:	dw	Handler_SavagePlant,0
rev_07:	dw	Update_RollBall,0
rev_08:	dw	Handler_Darts,0
rev_09:	dw	Handler_Food,Handler_BalloonHelp,Handler_SpookyHand,0
rev_0A:	dw	Handler_BouncingAxe,0
rev_0B:	dw	Handler_Angels,0
rev_0C:	dw	Handler_Angels,Handler_SpookyHand,0
rev_0D:	dw	Handler_SpookyHand,0
rev_0E:	dw	Handler_Angels,0
rev_0F:	dw	Handler_Food,Handler_Books,0
rev_10:	dw	Handler_MovingFloor,Animate_MovingFloor,Handler_SpookyHand,0
rev_11:	dw	Handler_Food,Handler_Angels,0
rev_12:	dw	Handler_BouncingAxe,0
rev_13:	dw	Handler_Darts,0
rev_14:	dw	Handler_SpookyHand,0
rev_15:	dw	Handler_Food,Handler_BouncingAxe,0
rev_16:	dw	Handler_Ghosts,0
rev_17:	dw	Handler_Ghosts,Handler_Food,0
rev_18:	dw	Handler_SpookyHand,0
rev_19:	dw	Handler_Invaders,0
rev_1A:	dw	Handler_Food,Handler_ThreeTon,0
rev_1B:	dw	Handler_ThreeTon,Handler_SpookyHand,0
rev_1C:	dw	Handler_FallingBlocks,Handler_Fire,0
rev_1D:	dw	Handler_BouncingAxe,Handler_MagLock,Handler_MagLock,Handler_MagLock,Handler_MagLock,Handler_MagLock,0
rev_1E:	dw	Inv_Update,Inv_Update,Inv_Update,Inv_Update,Inv_Update,Inv_Update,Arcade_UpdateExplosions,Inv_BulletUpdate,Arcade_UpdateBombs,0

; ---- повторы события ----
Room_EventSixTimes:
		ld	b,6
res0:		push	bc
		call	Pause_Short
		call	Room_EventCaller
		pop	bc
		dec	b
		jp	nz,res0
		ret
Events40:	ld	b,0x28
ev40:		push	bc
		call	Pause_Short
		call	Room_EventCaller
		pop	bc
		dec	b
		jp	nz,ev40
		ret

; ---- смерть ----
Wally_CheckForDeath:
		ld	a,(DeathFlag)
		or	a
		ret	z
		ld	a,(inv_cheat)		; неуязвимость (F1+F3 на заставке): смерть отменяется
		or	a
		jp	z,wcd_go
		xor	a
		ld	(DeathFlag),a
		ret
wcd_go:
		call	Wally_KnockedDown	; D = Y нижней половины лежащего Wally
		push	de
		call	Room_EventSixTimes
		call	Wally_Erase
		pop	de
		jp	Wally_Death

; Wally падает на пол комнаты и садится; на выходе D = пол + 0x10
Wally_KnockedDown:
		ld	a,(Wally_RoomNo)
		ld	e,a
		ld	d,0
		ld	hl,Wally_ResurectY
		add	hl,de
		ld	a,(hl)
		ld	(kd_floor),a
wk0:		call	Room_EventCaller
		call	Pause_Short
		call	Wally_Erase
		xor	a
		ld	(PrevHead),a
		ld	(Wally_HeadTurned),a
		ld	hl,(Wally_X)
		ld	a,h
		add	a,3
		ld	h,a
		ld	a,(kd_floor)
		ld	b,a
		ld	a,h
		cp	b
		jp	nc,wk1
		ld	(Wally_X),hl
		call	Wally_Draw
		jp	wk0
wk1:		ld	a,(kd_floor)
		ld	h,a			; H = пол
		ld	(Wally_X),hl
		ld	a,0x9B
		ld	(Wally_Frame),a
		call	Wally_Draw
		call	Room_EventSixTimes
		call	Wally_Erase
		ld	a,0x9D
		ld	(Wally_Frame),a
		call	Wally_Draw
		ld	a,(kd_floor)
		add	a,0x10
		ld	d,a
		ret
kd_floor:	db	0

; анимация смерти: D = Y нижней половины (ZX: D после KnockedDown); кончается воскрешением
Wally_Death:	ld	a,(Wally_X)
		sub	8
		jp	nc,wd0
		xor	a
wd0:		cp	0xE0
		jp	c,wd1
		ld	a,0xE0
wd1:		ld	l,a
		ld	h,d
		ld	(dth_pos),hl
		ld	(BitmapX),hl
		call	draw_dead
		call	Events40
wd2:		call	Room_EventCaller
		call	Pause_Short
		ld	hl,(dth_pos)
		ld	(BitmapX),hl
		call	draw_dead
		ld	hl,(dth_pos)
		dec	h
		dec	h
		ld	(dth_pos),hl
		ld	a,h
		cp	0x30
		jp	c,Wally_Resurrect
		ld	(BitmapX),hl
		call	draw_dead
		jp	wd2
dth_pos:	dw	0
draw_dead:	ld	a,0x4D			; лежащий Wally: две половинки
		call	bmp16
		ld	a,(dth_pos)
		add	a,0x10
		ld	(BitmapX),a
		ld	a,0x4E
		jp	bmp16w

; потерять жизнь; нет жизней — конец игры; иначе дымок и возврат в GameLoop
Wally_Resurrect:
		xor	a
		ld	(MilkLevel),a
		call	milk_full
		ld	hl,WallyLives
		dec	(hl)
		ld	a,(inv_cheat)		; при неуязвимости жизнь не тратится
		or	a
		jp	z,wr_nc
		inc	(hl)
wr_nc:		ld	a,(hl)
		add	a,a
		add	a,a
		add	a,a
		add	a,a
		ld	(BitmapX),a
		ld	a,0x10
		ld	(BitmapY),a
		ld	a,0x4C
		call	bmp16
		ld	a,(WallyLives)
		or	a
		jp	z,game_over
		ld	a,(Wally_RoomNo)
		ld	e,a
		ld	d,0
		ld	hl,Wally_ResurectY
		add	hl,de
		ld	a,(hl)
		ld	hl,Wally_ResurectX
		add	hl,de
		ld	l,(hl)
		ld	h,a			; H = Y, L = X
		ld	(rs_pos),hl
		ld	(BitmapX),hl
		ld	a,0x9F			; дымок появления
		call	bmp16
		call	rs_lower
		ld	a,0x9F
		call	bmp16
		call	Pause_Short
		ld	a,0x9F
		ld	(rs_frame),a
		ld	a,5
		ld	(rs_cnt),a
rs0:		call	rs_two			; рисуем кадр и следующий (XOR стирает прежний)
		ld	a,(rs_frame)
		inc	a
		ld	(rs_frame),a
		call	rs_two
		call	Room_EventCaller
		call	Pause_Short
		call	Room_EventCaller
		call	Pause_Short
		ld	hl,rs_cnt
		dec	(hl)
		jp	nz,rs0
		ld	hl,(rs_pos)
		ld	(Wally_X),hl
		call	rs_two
		xor	a
		ld	(DeathFlag),a
		call	Wally_Reset
		call	Wally_Draw
		ld	a,(Wally_RoomNo)
		cp	0x1E
		jp	c,loop_restart
		call	Invaders_Init_YPos	; аркада: заново
		call	Invaders_Init
		ld	sp,STACK_TOP
		jp	Invaders_Loop
rs_pos:		dw	0
rs_frame:	db	0
rs_cnt:		db	0
rs_lower:	ld	hl,(rs_pos)		; BitmapY = Y + 0x10
		ld	a,h
		add	a,0x10
		ld	(BitmapY),a
		ret
rs_two:		ld	hl,(rs_pos)		; верх и низ спрайта кадра rs_frame
		ld	(BitmapX),hl
		ld	a,(rs_frame)
		call	bmp16
		call	rs_lower
		ld	a,(rs_frame)
		jp	bmp16
game_over:	jp	Screen_YouLost		; экран «проиграл» (end.asm), после клавиши — заставка

; ---- тест 08: ловушка «боксёрская перчатка» (C = истина, NC = ложь по соглашению интерпретатора: NC — истина) ----
Test08_Box:	ld	a,(Pocket1)
		cp	0x15			; полотенце
		jp	z,tb_ok
		ld	a,(Pocket2)
		cp	0x15
		jp	z,tb_ok
		ld	a,(Wally_RoomNo)
		ld	b,a
		ld	a,(BoxingTrap_Room)
		cp	b
		jp	nz,tb_ok
		ld	sp,STACK_TOP		; ловушка не возвращается в скрипт
		ld	bc,0
		ld	de,0x0101
		ld	hl,0xE600
		call	beep
		ld	a,1
		ld	(DeathFlag),a
		ld	hl,(BoxingTrap_NextPtr)
		ld	a,(hl)
		ld	(BoxingTrap_Room),a
		inc	hl
		ld	a,(hl)
		cp	0xFF
		jp	nz,tb1
		ld	hl,BoxingTrap_Rooms
tb1:		ld	(BoxingTrap_NextPtr),hl
		ld	hl,0x98E8
		ld	(BitmapX),hl
		ld	a,0xA5
		call	bmp16
		ld	a,0xA5
		ld	(tb_spr),a
		ld	a,7
		ld	(tb_cnt),a
tb2:		call	Wally_Erase
		ld	hl,(Wally_X)
		dec	l
		dec	l
		ld	(Wally_X),hl
		call	Wally_Draw
		ld	a,(tb_spr)
		ld	hl,0x98E8
		ld	(BitmapX),hl
		call	bmp16
		ld	a,(tb_spr)
		inc	a
		ld	(tb_spr),a
		call	bmp16
		call	Pause_Short
		call	Room_EventCaller
		ld	hl,tb_cnt
		dec	(hl)
		jp	nz,tb2
		call	Wally_KnockedDown
		call	Events40
		ld	hl,0x98E8
		ld	(BitmapX),hl
		ld	a,0xAC
		call	bmp16
		call	Wally_Erase
		ld	d,0xA8
		ld	a,(MilkLevel)
		cp	0x1A
		jp	nc,Wally_Death
		xor	a
		ld	(DeathFlag),a
		ld	(Wally_JumpDir),a
		ld	(Wally_Dir),a
		ld	a,0x10
		ld	(Wally_Frame),a
		call	Wally_Draw
		ld	b,5
		call	Milk_DecreaseByAmount
		ld	a,1
		ld	(DeathFlag),a
		ld	b,10
tb3:		push	bc
		call	Pause_Short
		call	Room_EventCaller
		pop	bc
		dec	b
		jp	nz,tb3
		xor	a
		ld	(DeathFlag),a
		jp	loop_restart
tb_ok:		or	a			; NC — безопасно
		ret
tb_spr:		db	0
tb_cnt:		db	0

; ---- действие 12: верёвка и перила ----
a_rope:		push	hl
ar1:		call	Wally_Erase
		ld	a,0x10
		ld	(Wally_Frame),a
		ld	hl,(Wally_X)
		dec	h
		dec	h
		ld	(Wally_X),hl
		ld	a,h
		cp	0x70
		jp	z,ar2
		call	Wally_Draw
		call	Pause_Short
		jp	ar1
ar2:		ld	hl,(Wally_X)
		inc	l
		inc	l
		ld	(Wally_X),hl
		ld	a,l
		cp	0xE8
		jp	nc,ar3
		call	Wally_Draw
		call	Pause_Short
		call	Wally_Erase
		jp	ar2
ar3:		ld	hl,0x3038
		ld	(Wally_X),hl
		ld	a,0x0D
		ld	(Wally_RoomNo),a
		call	Wally_Reset
		ld	a,0x9B
		ld	(Wally_Frame),a
		call	Room_Enter
		ld	a,0x44
		ld	(tb_cnt),a
ar4:		call	Wally_Erase
		ld	hl,(Wally_X)
		inc	h
		inc	l
		inc	l
		ld	(Wally_X),hl
		call	Wally_Draw
		call	Pause_Short
		ld	hl,tb_cnt
		dec	(hl)
		jp	nz,ar4
		call	Wally_Erase
		ld	a,0x10
		ld	(Wally_Frame),a
		call	Wally_Draw
		pop	hl
		ret

; ---- старт новой игры (ZX Game_Start B310 после меню; меню и заставка — во фронте) ----
Game_Start:	ld	sp,STACK_TOP
		ld	a,1			; стартовая комната
		ld	(Wally_RoomNo),a
		ld	hl,Inv_f460		; аркада: тип захватчиков и кадры (числа — как у ZX)
		ld	(Inv_TypePtr),hl
		ld	hl,0x7A75
		ld	(Inv_StartFrame),hl
		ld	h,0x76
		ld	(Inv_CurrentFrame),hl
		xor	a
		ld	(Inv___Flag),a
		call	clear_screen
		call	draw_logo		; логотип «Pyjamarama» в нижней полосе (вне 192 строк ZX); буфер распаковки — ATTR, поэтому до fill_attr
		call	fill_attr
		call	Game_InitStats
		call	RoomDraw
		ld	hl,ScoreBoard_Item
		ld	de,0x0001
gs_sb:		call	FurnitureDraw
		call	Inv_Redraw
		call	LivesReset
		call	milk_full
		ld	hl,0x9858		; Y = 0x98, X = 0x58
		ld	(Wally_X),hl
		call	Wally_Draw
		jp	GameLoop

; чистый экран: пиксели плоскостей 0..2 и все атрибуты = 0x46 (жёлтые чернила)
ScreenClearSimple:
		call	clear_screen
fill_attr:	ld	hl,ATTR
		ld	bc,0x0300
scs0:		ld	(hl),0x46
		inc	hl
		dec	bc
		ld	a,b
		or	c
		jp	nz,scs0
		ret

; сбросить флаги и состояние новой игры
Game_InitStats:	xor	a
		ld	(Pocket1),a		; в кармане 1 — ключ (предмет 0)
		ld	b,0x16			; 22 байта флагов от Lift_Count: лифт, лампы, смерть, Wally...
		ld	hl,Lift_Count
gis0:		ld	(hl),a
		inc	hl
		dec	b
		jp	nz,gis0
		ld	hl,RoomObjSlot_Obj	; по предмету в каждой комнате: 2, 3, 4...
		ld	b,0x1E
		ld	a,2
gis1:		ld	(hl),a
		inc	hl
		inc	hl
		inc	hl
		inc	a
		dec	b
		jp	nz,gis1
		ld	a,1			; в кармане 2 — радио
		ld	(Pocket2),a
		ld	hl,Food_Table
		ld	(Food_ActivePtr),hl
		ld	hl,Object_FoundTable
		ld	b,0x20
		xor	a
gis2:		ld	(hl),a
		inc	hl
		inc	hl
		dec	b
		jp	nz,gis2
		ld	b,0x23			; посещённые комнаты
gis3:		ld	(hl),a
		inc	hl
		dec	b
		jp	nz,gis3
		ret

; жизни: три значка (спрайт 0x4C), WallyLives = 3
LivesReset:	ld	a,3
		ld	(WallyLives),a
		ld	b,3
lr0:		push	bc
		ld	a,b
		dec	a
		add	a,a
		add	a,a
		add	a,a
		add	a,a
		ld	l,a
		ld	h,0x10
		ld	(BitmapX),hl
		ld	a,0x4C
		call	bmp16
		pop	bc
		dec	b
		jp	nz,lr0
		ret
