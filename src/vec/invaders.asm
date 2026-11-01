; Захватчики (комната 19) и аркада (комната 1E) — нативный i8080 по src/model/invaders.js (сверка: tools/lockn.js, tools/lockn_inv_loop.js).
; Контракт:
;  * Все подпрограммы без входных регистров, вход и выход — через память данных (метки zxsym.inc); регистры не сохраняются
;    (кроме Arcade_CreateExplosions: HL = (X,Y) взрыва, сохраняет BC, DE, HL).
;  * Invaders_ExitCheck: CF=1 — Wally ушёл из аркады (комната, Room_Enter и IsArcadeMode=0 уже сделаны); вызывающий делает JP loop_restart.
;    CF=0 — остались.
;  * inv_bu — тело Inv_BulletUpdate: CF=1 — последний захватчик убит, этап сменён (ZX: LD SP,0 / JP Invaders_Loop). Inv_BulletUpdate —
;    обёртка для таблицы событий (flow.asm rev_1E): при CF=1 как ZX прыгает в Invaders_Loop (сброс стека, прерывание Wally_Death).
;  * Invaders_Step — один проход аркадного цикла ZX (F4A6..F4CD): Wally_Handler, Wally_StepCheck, 6*Inv_Update, Arcade_UpdateExplosions,
;    Invaders_ExitCheck (выход -> loop_restart без возврата), inv_bu (CF=1 -> возврат без остального), Arcade_UpdateBombs, Invaders_Pause,
;    хвостовой переход в Wally_CheckForDeath.
;  * Invaders_Loop — вечный цикл: LD SP,STACK_TOP; CALL Invaders_Step; JP Invaders_Loop. Сюда же прыгают Wally_Resurrect и a_arcade.
;  * a_arcade (действие скрипта 13, HL = аргументы, не возвращается) = arcade_enter (всё до цикла; сверяется как модель Action13_EnterAcrade)
;    + JP Invaders_Loop.
;  * inv_delay (HL = число итераций) — реальная задержка; Invaders_Pause задаёт её теми же формулами, что ZX (4*((0x18-p)*8 & 255)+1).
; Новый листовой примитив fx_noise (FX_WhiteNoise) — заглушка RET.
; Ожидания от bmp16: BitmapX/BitmapY не меняются (как у ZX Bitmap16Draw); bmp16 портит все регистры.


; fx_noise (FX_WhiteNoise) — в snd.asm: эффект ВИ53 со «случайными» периодами

; bmp16 с сохранением BC, DE, HL (A = кадр)
inv_dr:		push	bc
		push	de
		push	hl
		call	bmp16
		pop	hl
		pop	de
		pop	bc
		ret

; ================= комната 19: летящие «захватчики» =================
Handler_Invaders:
		ld	c,0x30			; C = смещение по Y: 0x30 с лазером в кармане/на предмете, иначе 0x70
		ld	a,(Flag_LaserGun)
		or	a
		jp	z,hi_no
		ld	a,(Pocket1)
		cp	0x0D
		jp	z,hi_go
		ld	a,(Pocket2)
		cp	0x0D
		jp	z,hi_go
		ld	a,(ObjSlot19)
		cp	0x0D
		jp	z,hi_go
hi_no:		ld	c,0x70
hi_go:		ld	a,c
		ld	(hi_off),a
		ld	a,(Flag_BaddyInit)
		or	a
		jp	nz,hi_run
		inc	a
		ld	(Flag_BaddyInit),a
		ld	hl,Invader_Init		; первый вход: скопировать 6 записей и нарисовать
		ld	de,Invader1
		ld	b,0x12
hi_cp:		ld	a,(hl)
		ld	(de),a
		inc	hl
		inc	de
		dec	b
		jp	nz,hi_cp
		ld	hl,Invader1
		ld	b,6
hf_lp:		push	bc
		push	hl
		ld	e,(hl)			; X
		inc	hl
		inc	hl
		ld	a,(hi_off)
		add	a,(hl)			; Y + смещение
		ld	d,a
		ex	de,hl
		ld	(BitmapX),hl
		ld	a,(Invaders_bitmap)
		call	bmp16
		pop	hl
		pop	bc
		inc	hl
		inc	hl
		inc	hl
		dec	b
		jp	nz,hf_lp
		ret
; следующий кадр: стереть, сдвинуть, нарисовать, проверить удар
hi_run:		ld	a,(Invaders_bitmap)
		inc	a
		cp	0x9B
		jp	nz,hr1
		ld	a,0x99
hr1:		ld	(hi_nb),a
		ld	hl,Invader1
		ld	(hi_p),hl
		ld	b,6
hr_lp:		push	bc
		ld	hl,(hi_p)
		ld	e,(hl)			; E = X (старый)
		inc	hl
		ld	d,(hl)			; D = шаг
		inc	hl
		ld	a,(hi_off)
		add	a,(hl)
		ld	b,a			; B = Y + смещение
		ld	a,e
		cp	0x32
		jp	z,hr_rev
		cp	0xE8
		jp	nz,hr_nr
hr_rev:		ld	a,d			; у края — развернуть
		cpl
		inc	a
		ld	d,a
		dec	hl
		ld	(hl),a
hr_nr:		ld	h,b
		ld	l,e
		ld	(BitmapX),hl
		ld	a,(Invaders_bitmap)
		push	de
		push	bc
		call	bmp16
		pop	bc
		pop	de
		ld	a,e
		add	a,d
		ld	hl,(hi_p)
		ld	(hl),a			; новый X
		ld	l,a
		ld	h,b
		ld	(BitmapX),hl
		ld	a,(hi_nb)
		push	de
		push	bc
		call	bmp16
		pop	bc
		pop	de
		ld	h,b			; удар проверяется по СТАРОМУ X, как у ZX
		ld	l,e
		ld	b,3
		call	Wally_HitTest
		ld	hl,(hi_p)
		inc	hl
		inc	hl
		inc	hl
		ld	(hi_p),hl
		pop	bc
		dec	b
		jp	nz,hr_lp
		ld	a,(hi_nb)
		ld	(Invaders_bitmap),a
		ret
hi_off:		db	0
hi_nb:		db	0
hi_p:		dw	0

; ================= аркада: таблица захватчиков =================
Invaders_Init_YPos:
		ld	hl,Invaders_Data
		ld	b,8
iy0:		inc	hl
		ld	(hl),0x38
		inc	hl
		inc	hl
		ld	(hl),0x58
		inc	hl
		inc	hl
		ld	(hl),0x78
		inc	hl
		dec	b
		jp	nz,iy0
		ret

Invaders_Init_XPos:
		ld	hl,Invaders_Data
		ld	a,0x0A
		ld	b,8
ix0:		ld	(hl),a
		inc	hl
		inc	hl
		ld	(hl),a
		inc	hl
		inc	hl
		ld	(hl),a
		inc	hl
		inc	hl
		add	a,0x18
		dec	b
		jp	nz,ix0
		xor	a
		ld	(Invaders_ChangeDirFlag),a
		inc	a
		ld	(Invaders_CurrentDir),a
		ld	a,0x18
		ld	(Invaders_PauseValue),a
		ret

; нарисовать комнату аркады: номер комнаты по этапу, фон, потолок/пол/стены, Wally, все живые захватчики; очистить взрывы и бомбы
Invaders_Init:	ld	hl,(Inv_TypePtr)
		ld	de,Inv_FirstInvType
		ld	a,l
		sub	e
		ld	l,a
		ld	a,h
		sbc	a,d			; CF = заём при вычитании HL-DE
		ld	a,l
		rra
		add	a,0x1D
		ld	(Wally_RoomNo),a
		call	clr_fx
		call	Draw_CeilingWallFloor
		ld	de,0x0F00
		ld	hl,item_dc31
		call	FurnitureDraw
		call	Wally_Draw
		ld	hl,Invaders_Data
		ld	b,0x18
in_l:		ld	e,(hl)
		inc	hl
		ld	d,(hl)
		inc	hl
		ld	a,e
		cp	0xFE
		jp	z,in_n
		push	bc
		push	hl
		ex	de,hl			; HL = (X,Y), DE = указатель за записью
		ld	(BitmapX),hl
		ld	hl,(Inv_DataPtr)
		inc	hl
		ld	a,e			; указатель за записью >= Inv_DataPtr+1 — запись уже обработана в этом проходе
		sub	l
		ld	a,d
		sbc	a,h
		ld	a,(Inv_CurrentFrame)
		jp	nc,in_c
		ld	a,(Inv_NextFrame)
in_c:		call	bmp16
		pop	hl
		pop	bc
in_n:		dec	b
		jp	nz,in_l
		ld	hl,Arcade_ExplosionSlots
in_e:		ld	a,(hl)
		cp	0xFE
		jp	z,in_b
		ld	(hl),0xFF
		inc	hl
		inc	hl
		inc	hl
		jp	in_e
in_b:		ld	b,3
		ld	hl,Arcade_BombData
in_bl:		ld	(hl),0xFF
		inc	hl
		inc	hl
		inc	hl
		dec	b
		jp	nz,in_bl
		ret

; ================= аркада: шаг одного захватчика (вызывается 6 раз за проход) =================
Inv_Update:	ld	hl,(Inv_DataPtr)
iu0:		ld	a,(hl)
		cp	0xFE
		jp	nz,iu1
		inc	hl
		inc	hl
		jp	iu0
iu1:		cp	0xFF
		jp	z,iu_wrap
		ld	c,a
		inc	hl
		ld	b,(hl)
		inc	hl
		ld	(Inv_DataPtr),hl
		dec	hl
		dec	hl
		push	hl
		ld	h,b
		ld	l,c
		ld	(BitmapX),hl
		pop	hl
		ld	a,(Invaders_CurrentDir)
		add	a,c
		ld	c,a
		ld	(hl),a
		cp	0xE8
		jp	z,iu2
		cp	0x08
		jp	nz,iu3
iu2:		ld	a,1
		ld	(Invaders_ChangeDirFlag),a
iu3:		ld	a,(Inv___Flag)
		add	a,b
		ld	b,a
		cp	0xA0
		jp	c,iu4
		ld	a,1
		ld	(DeathFlag),a
iu4:		inc	hl
		ld	(hl),b
		ld	a,(Inv_CurrentFrame)
		call	inv_dr
		ld	h,b
		ld	l,c
		ld	(BitmapX),hl
		ld	a,(Inv_NextFrame)
		call	inv_dr
		ld	h,b
		ld	l,c
		push	hl
		ld	b,2
		call	Wally_HitTest
		call	rnd_a			; ZX: LD A,R
		pop	de
		cp	8
		ret	nc
		ld	b,3			; сбросить бомбу: найти свободный слот
		ld	hl,Arcade_BombData
iu5:		ld	a,(hl)
		cp	0xFF
		jp	z,iu6
		inc	hl
		inc	hl
		inc	hl
		dec	b
		ret	z
		jp	iu5
iu6:		ld	(hl),e
		inc	hl
		ld	(hl),d
		inc	hl
		ex	de,hl
		ld	hl,Inv_BombFrame
		inc	(hl)
		ld	a,(hl)
		cp	0xC7
		jp	nz,iu7
		ld	a,0xC0
		ld	(hl),a
iu7:		ld	(de),a
		jp	bmp16
iu_wrap:	ld	hl,Invaders_Data	; конец таблицы: новый проход, следующий кадр анимации, смена направления
		ld	(Inv_DataPtr),hl
		ld	hl,(Inv_StartFrame)	; L = начало, H = конец
		ld	a,(Inv_NextFrame)
		ld	(Inv_CurrentFrame),a
		inc	a
		cp	h
		jp	nz,iw1
		ld	a,l
iw1:		ld	(Inv_NextFrame),a
		ld	a,(Invaders_ChangeDirFlag)
		add	a,a
		ld	(Inv___Flag),a
		ret	z
		xor	a
		ld	(Invaders_ChangeDirFlag),a
		ld	a,(Invaders_CurrentDir)
		cpl
		inc	a
		ld	(Invaders_CurrentDir),a
		ret

; ================= взрывы =================
; HL = (X,Y); BC, DE, HL сохраняются
Arcade_CreateExplosions:
		push	hl
		push	de
		push	bc
		ex	de,hl
		ld	hl,Arcade_ExplosionSlots
ce0:		ld	a,(hl)
		cp	0xFE
		jp	z,ce_n
		cp	0xFF
		jp	z,ce_f
		inc	hl
		inc	hl
		inc	hl
		jp	ce0
ce_f:		ld	(hl),e
		inc	hl
		ld	(hl),d
		inc	hl
		ld	(hl),0x9F
		ex	de,hl
		ld	(BitmapX),hl
		ld	a,0x9F
		call	bmp16
ce_n:		call	fx_noise
		pop	bc
		pop	de
		pop	hl
		ret

Arcade_UpdateExplosions:
		ld	hl,Arcade_ExplosionSlots
ue0:		ld	a,(hl)
		cp	0xFE
		ret	z
		cp	0xFF
		jp	z,ue_n
		push	hl
		ld	e,a
		inc	hl
		ld	d,(hl)
		inc	hl
		ld	a,(hl)
		ex	de,hl
		ld	(BitmapX),hl
		call	bmp16			; стереть кадр
		pop	hl
		push	hl
		inc	hl
		inc	hl
		ld	a,(hl)
		inc	a
		cp	0xA5
		jp	z,ue_e
		ld	(hl),a
		call	bmp16			; следующий кадр
		pop	hl
		jp	ue_n
ue_e:		pop	hl			; анимация кончилась — слот свободен
		ld	(hl),0xFF
ue_n:		inc	hl
		inc	hl
		inc	hl
		jp	ue0

; ================= следующий этап =================
Invaders_NextStage:
		ld	hl,(Inv_TypePtr)
		ld	a,(hl)
		cp	0xFF
		jp	nz,ns1
		ld	a,(WallyLives)
		cp	3
		jp	z,ns0
		inc	a			; жизнь +1 и значок жизни на экране
		ld	(WallyLives),a
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
ns0:		ld	hl,Inv_FirstInvType
		ld	a,(hl)
ns1:		ld	(Inv_CurrentFrame),a
		ld	(Inv_StartFrame),a
		inc	hl
		inc	a
		ld	(Inv_NextFrame),a
		ld	a,(hl)
		ld	(Inv_EndFrame),a
		inc	hl
		ld	(Inv_TypePtr),hl
		call	Invaders_Init_XPos
		call	Invaders_Init_YPos
		jp	Invaders_Init

; ================= выстрел Wally =================
Inv_BulletUpdate:
		call	inv_bu
		ret	nc
		jp	Invaders_Loop
inv_bu:		ld	hl,(Inv_BulletX)	; L = X, H = Y
		ld	a,l
		cp	0xFF
		jp	z,ib_no
		ex	de,hl			; E = X, D = Y пули
		ld	hl,Invaders_Data
		ld	b,0x18
ib0:		ld	a,(hl)
		cp	0xFE
		jp	z,ib_nx
		ld	a,e
		sub	(hl)
		sub	0x10
		cp	0xE0
		jp	c,ib_nx
		inc	hl
		ld	a,d
		sub	(hl)
		sub	0x10
		cp	0xE0
		jp	c,ib_ny
		dec	hl			; попадание: стереть пулю, убрать захватчика, стереть его, взрыв
		push	hl
		ex	de,hl
		ld	(BitmapX),hl
		ld	a,0xFF
		ld	(Inv_BulletX),a
		ld	a,0xBF
		call	bmp16
		pop	hl
		ld	e,(hl)
		ld	(hl),0xFE
		inc	hl
		ld	d,(hl)
		dec	hl			; HL = запись, DE = позиция захватчика
		push	hl
		ex	de,hl
		ld	(BitmapX),hl
		ld	hl,(Inv_DataPtr)
		dec	hl
		ex	de,hl			; DE = Inv_DataPtr-1
		pop	hl
		ld	a,l			; запись уже обработана в этом проходе (HL >= DE) — кадр Current, иначе Next
		sub	e
		ld	a,h
		sbc	a,d
		ld	a,(Inv_CurrentFrame)
		jp	nc,ib_c
		ld	a,(Inv_NextFrame)
ib_c:		call	bmp16
		ld	hl,(BitmapX)
		call	Arcade_CreateExplosions
		ld	hl,Invaders_PauseValue
		dec	(hl)
		jp	nz,ib_no
		call	Invaders_NextStage
		scf
		ret
ib_nx:		inc	hl
ib_ny:		inc	hl
		dec	b
		jp	nz,ib0
		ld	hl,(Inv_BulletX)		; ни с кем не столкнулась — вверх на 3
		ld	(BitmapX),hl
		ld	a,0xBF
		call	bmp16
		ld	hl,(Inv_BulletX)
		ld	a,h
		sub	3
		cp	0x30
		jp	nc,ib_up
		ld	a,0xFF
		ld	(Inv_BulletX),a
		jp	ib_no
ib_up:		ld	(Inv_BulletY),a
		ld	(BitmapY),a
		ld	a,0xBF
		call	bmp16
ib_no:		or	a
		ret

; ================= пауза шага: HL = 4*(((0x18-p)*8) & 255)+1 итераций =================
Invaders_Pause:	ld	a,(Invaders_PauseValue)
		ld	b,a
		ld	a,0x18
		sub	b
		add	a,a
		add	a,a
		add	a,a
		ld	l,a
		ld	h,0
		add	hl,hl
		add	hl,hl
		inc	hl
inv_delay:	dec	hl
		ld	a,h
		or	l
		jp	nz,inv_delay
		ret

; ================= бомбы =================
Arcade_UpdateBombs:
		ld	hl,Arcade_BombData
		ld	b,3
ub0:		ld	a,(hl)
		cp	0xFF
		jp	z,ub_n
		push	bc
		push	hl
		ld	e,a
		inc	hl
		ld	d,(hl)
		inc	hl
		ld	a,(hl)
		ex	de,hl
		ld	(BitmapX),hl
		call	bmp16			; стереть
		ld	hl,(BitmapX)
		inc	h
		inc	h
		pop	de			; DE = запись
		push	de
		ld	a,h
		cp	0xA8
		jp	c,ub_mv
		ld	a,0xFF			; долетела до низа: убрать и взорвать на прежнем месте
		ld	(de),a
		dec	h
		dec	h
		call	Arcade_CreateExplosions
		jp	ub_e
ub_mv:		inc	de
		ld	(de),a
		inc	de
		ld	(BitmapX),hl
		ld	a,(de)
		call	bmp16
		ld	hl,(BitmapX)
		ld	b,2
		call	Wally_HitTest
ub_e:		pop	hl
		pop	bc
ub_n:		inc	hl
		inc	hl
		inc	hl
		dec	b
		jp	nz,ub0
		ret

; ================= выход из аркады: влево до края =================
Invaders_ExitCheck:
		ld	a,(Wally_X)
		sub	9
		cp	0xFE
		jp	c,ib_no			; (OR A, RET) — остаёмся, CF=0
		ld	a,0x15
		ld	(Wally_RoomNo),a
		ld	hl,0x98D0
		ld	(Wally_X),hl
		call	Room_Enter
		xor	a
		ld	(IsArcadeMode),a
		scf
		ret

; ================= вход в аркаду (действие скрипта 13) =================
arcade_enter:	ld	hl,0x9810
		ld	(Wally_X),hl
		call	Wally_Reset
		call	Invaders_Init_XPos
		call	Invaders_Init_YPos
		call	Invaders_Init
		ld	a,1
		ld	(IsArcadeMode),a
		ld	a,0xFF
		ld	(Inv_BulletX),a
		ret
a_arcade:	call	arcade_enter
		jp	Invaders_Loop

; ================= аркадный цикл (ZX F4A6) =================
Invaders_Loop:	ld	sp,STACK_TOP
		call	Invaders_Step
		jp	Invaders_Loop
Invaders_Step:	call	pause_chk		; пауза по ВК в аркаде
	call	Wally_Handler
		call	Wally_StepCheck
		ld	b,6
is0:		push	bc
		call	Inv_Update
		pop	bc
		dec	b
		jp	nz,is0
		call	Arcade_UpdateExplosions
		call	Invaders_ExitCheck
		jp	c,loop_restart
		call	inv_bu
		ret	c			; этап сменён: ZX начинает проход заново
		call	Arcade_UpdateBombs
		call	Invaders_Pause
		jp	Wally_CheckForDeath
