; События комнат A (камень, мяч, ангелы, еда, рука, курицы, дротики, топор) — нативный i8080 по src/model/events_a.js (сверка: tools/lockn.js).
; Вызов: все подпрограммы без входных регистров; вход и выход — через память данных. Update_RollRock заканчивается JP Wally_Resurrect.
; BitmapX/Y пишутся словом (L = X, H = Y). bmp16 портит всё — вызываем через ea_draw (сохраняет A, BC, DE, HL).

ea_nb:		db	0			; новый кадр анимации на время прохода по записям
ea_draw:	push	af
		push	bc
		push	de
		push	hl
		call	bmp16
		pop	hl
		pop	de
		pop	bc
		pop	af
		ret

; ---- катящийся камень (комната 0) ----
; D = строка, E = столбец; рисует камень 8 колонок по 7 тайлов
RollRock_Draw:	ld	hl,RollRock_Tiles
		ld	(TileStartPtr),hl
		ld	hl,RollRock_Furniture
		ld	c,8
rrd0:		ld	b,7
rrd1:		ld	a,e
		cp	0x20
		jp	nc,rrd2
		push	bc
		ld	c,5
		ld	a,(hl)
		call	tile
		pop	bc
rrd2:		inc	d
		inc	hl
		dec	b
		jp	nz,rrd1
		dec	e
		ld	a,d
		sub	7
		ld	d,a
		dec	c
		jp	nz,rrd0
		ret

Update_RollRock:ld	a,(Room0_RockCount)
		or	a
		jp	z,ur0
		dec	a
		ld	(Room0_RockCount),a
		ret
ur0:		ld	b,0x26
ur1:		push	bc
		ld	a,(Var_F18A)
		ld	e,a
		ld	d,0x0E
		inc	a
		ld	(Var_F18A),a
		call	RollRock_Draw
		call	Pause_Short		; ZX E9E6: пауза между кадрами катящегося камня
		pop	bc
		dec	b
		jp	nz,ur1
		ld	a,0x1C
		ld	(Wally_RoomNo),a
		xor	a
		ld	(Var_F18A),a
		ld	(Flag_BaddyInit),a
		inc	a
		ld	(DeathFlag),a
		ld	a,0xC8
		ld	(Room0_RockCount),a
		call	clr_fx
		call	RoomDraw
		jp	Wally_Resurrect

; ---- катящийся шар ----
Update_RollBall:ld	a,(Flag_BaddyInit)
		or	a
		jp	nz,rb1
		inc	a
		ld	(Flag_BaddyInit),a
		ld	hl,0x3008
		ld	(RollBall_Position),hl
		ld	(BitmapX),hl
		ld	a,(RollBall_Bmp)
		jp	ea_draw
rb1:		ld	hl,(RollBall_Position)
		ld	(BitmapX),hl
		ld	a,(RollBall_Bmp)
		ld	b,a
		call	ea_draw
		ld	a,l
		cp	0xB0
		jp	z,rb2
		add	a,2
		ld	l,a
		sub	2
		cp	0x1A
		jp	c,rb4
		inc	h
		jp	rb4
rb2:		inc	h
		inc	h
		ld	a,h
		cp	0xAA
		jp	c,rb4
		ld	hl,0x3008
rb4:		ld	(BitmapX),hl
		ld	a,b
		push	af
		ld	a,l
		and	2
		jp	nz,rb5
		pop	af
		inc	a
		cp	0x90
		jp	nz,rb6
		ld	a,0x8D
		jp	rb6
rb5:		pop	af
rb6:		call	ea_draw
		ld	(RollBall_Bmp),a
		ld	(RollBall_Position),hl
		ld	b,0x0A
		jp	Wally_HitTest

; ---- ангелы смерти ----
Handler_Angels:	ld	a,(Flag_BaddyInit)
		or	a
		jp	nz,an1
		ld	a,1
		ld	(Flag_BaddyInit),a
		ld	a,2
		ld	(Angel1_Direction),a
		ld	(Angel2_Direction),a
		ld	(Angel3_Direction),a
		ld	hl,0x3278
		ld	(Angel1_Pos),hl
		ld	(BitmapX),hl
		ld	a,(Angel_Bmp)
		call	ea_draw
		ld	hl,0x6438
		ld	(Angel2_Pos),hl
		ld	(BitmapX),hl
		call	ea_draw
		ld	hl,0x50B8
		ld	(Angel3_Pos),hl
		ld	(BitmapX),hl
		jp	ea_draw
an1:		ld	a,(Angel_Bmp)
		inc	a
		cp	0x99
		jp	nz,an2
		ld	a,0x93
an2:		ld	(ea_nb),a
		ld	de,Angel1_Pos
		ld	b,3
an3:		ld	a,(de)
		ld	l,a
		inc	de
		ld	a,(de)
		ld	h,a
		inc	de
		ld	a,(de)
		ld	c,a
		inc	de
		ld	(BitmapX),hl
		ld	a,h
		add	a,c
		ld	h,a
		cp	0xAA
		jp	z,an4
		cp	0x30
		jp	nz,an5
an4:		xor	a
		sub	c
		ld	c,a
an5:		dec	de
		ld	a,c
		ld	(de),a
		dec	de
		ld	a,h
		ld	(de),a
		inc	de
		inc	de
		ld	a,(Angel_Bmp)
		call	ea_draw
		ld	(BitmapX),hl
		ld	a,(ea_nb)
		call	ea_draw
		push	bc
		push	de
		ld	b,4
		call	Wally_HitTest
		pop	de
		pop	bc
		dec	b
		jp	nz,an3
		ld	a,(ea_nb)
		ld	(Angel_Bmp),a
		ret

; ---- еда ----
; Z, если в таблице у активной записи (или следующей через 0x16) комната совпала; HL -> запись
ea_food:	ld	hl,(Food_ActivePtr)
		ld	a,(Wally_RoomNo)
		cp	(hl)
		ret	z
		ld	de,0x16
		add	hl,de
		cp	(hl)
		ret
Handler_Food:	ld	a,(Flag_FoodDrawn)
		or	a
		ret	nz
		inc	a
		ld	(Flag_FoodDrawn),a
		call	ea_food
		ret	nz
		inc	hl
		ld	e,(hl)
		inc	hl
		ld	a,(hl)
		ld	d,0xA8
		ex	de,hl
		ld	(BitmapX),hl
		jp	ea_draw
Food_CheckPickup:
		call	ea_food
		ret	nz
		inc	hl
		ld	a,(Wally_X)
		sub	(hl)
		dec	a
		cp	0xFE
		ret	c
		ld	a,(Wally_Y)
		cp	0x98
		ret	nz
		ld	e,(hl)
		inc	hl
		ld	a,(hl)
		ld	d,0xA8
		ex	de,hl
		ld	(BitmapX),hl
		call	ea_draw
		ld	hl,(Food_ActivePtr)
		ld	de,3
		add	hl,de
		ld	a,(hl)
		cp	0xFF
		jp	nz,fc1
		ld	hl,Food_Table
fc1:		ld	(Food_ActivePtr),hl
		ld	b,0x0A
		call	Wally_EnergyIncBy
		ld	bc,0x643C
		ld	de,0x0128
		ld	hl,0x0103
		jp	beep

; ---- куры ----
ch_old:		ld	a,(Chicken_Bmp)
		jp	ea_draw
Handler_Chickens:
		ld	a,(Flag_BaddyInit)
		or	a
		jp	nz,ch1
		ld	a,1
		ld	(Flag_BaddyInit),a
		ld	hl,0x8088
		ld	(Chicken1_Pos),hl
		ld	(BitmapX),hl
		ld	a,0x7B
		ld	(Chicken_Bmp),a
		call	ea_draw
		ld	hl,0xA8A8
		ld	(Chicken2_Pos),hl
		ld	(BitmapX),hl
		jp	ea_draw
ch1:		ld	a,(Chicken_Bmp)
		inc	a
		cp	0x7F
		jp	nz,ch2
		ld	a,0x7B
ch2:		ld	(ea_nb),a
		ld	b,2
		ld	de,Chicken1_Pos
ch3:		ld	a,(de)
		ld	l,a
		inc	de
		ld	a,(de)
		ld	h,a
		inc	de
		ld	a,(de)
		ld	c,a
		inc	de
		ld	(BitmapX),hl
		push	bc
		push	de
		push	hl
		ld	b,1
		call	Wally_HitTest
		pop	hl
		pop	de
		pop	bc
		ld	a,h
		cp	0x80
		jp	nz,ch4
		call	ch_old
		dec	l
		dec	l
		ld	a,l
		cp	0x78
		jp	nz,ch9
		ld	h,0x82
		jp	ch9
ch4:		cp	0xA8
		jp	z,ch5
		call	ch_old
		inc	h
		inc	h
		jp	ch9
ch5:		ld	a,c
		or	a
		jp	z,ch7
		call	ch_old
		dec	l
		dec	l
		ld	a,l
		cp	0x08
		jp	nz,ch9
		jp	ch8
ch7:		call	ch_old
		inc	l
		inc	l
		ld	a,l
		cp	0xE8
		jp	nz,ch9
ch8:		ld	hl,0x80B4
ch9:		ld	(BitmapX),hl
		ld	a,(ea_nb)
		call	ea_draw
		dec	de
		dec	de
		dec	de
		ld	a,l
		ld	(de),a
		inc	de
		ld	a,h
		ld	(de),a
		inc	de
		inc	de
		dec	b
		jp	nz,ch3
		ld	a,(ea_nb)
		ld	(Chicken_Bmp),a
		ret

; ---- дротики ----
Handler_Darts:	ld	a,(Flag_BaddyInit)
		or	a
		jp	nz,dt1
		ld	a,1
		ld	(Flag_BaddyInit),a
		ld	hl,0x8808
		ld	(Dart1_Pos),hl
		ld	(BitmapX),hl
		ld	a,(Dart_Bmp)
		call	ea_draw
		ld	hl,0xA878
		ld	(Dart2_Pos),hl
		ld	(BitmapX),hl
		jp	ea_draw
dt1:		ld	a,(Dart_Bmp)
		ld	hl,Dart_Bmp+1		; задержка анимации
		dec	(hl)
		jp	nz,dt2
		ld	(hl),2
		inc	a
		cp	0x93
		jp	nz,dt2
		ld	a,0x90
dt2:		ld	(ea_nb),a
		ld	de,Dart1_Pos
		ld	b,2
dt3:		ld	a,(de)
		ld	l,a
		inc	de
		ld	a,(de)
		ld	h,a
		inc	de
		ld	(BitmapX),hl
		ld	a,(Dart_Bmp)
		call	ea_draw
		ld	a,l
		add	a,2
		ld	l,a
		cp	0xF0
		jp	c,dt4
		ld	l,8
dt4:		ld	(BitmapX),hl
		ld	a,(ea_nb)
		call	ea_draw
		dec	de
		dec	de
		ld	a,l
		ld	(de),a
		inc	de
		inc	de
		push	bc
		push	de
		ld	b,1
		call	Wally_HitTest
		pop	de
		pop	bc
		dec	b
		jp	nz,dt3
		ld	a,(ea_nb)
		ld	(Dart_Bmp),a
		ret

; ---- прыгающий топор ----
Sound_AxeBounce:push	af
		push	bc
		push	de
		push	hl
		ld	bc,0x640A
		ld	de,0x050A
		ld	hl,0x0801
		call	beep
		pop	hl
		pop	de
		pop	bc
		pop	af
		ret
Handler_BouncingAxe:
		ld	a,(Flag_BaddyInit)
		or	a
		jp	nz,ax1
		ld	hl,0x3A64
		ld	(Axe_Position),hl
		ld	(BitmapX),hl
		ld	a,4
		ld	(Axe_VelocityY),a
		ld	a,(Axe_Bitmap)
		call	ea_draw
		ld	a,1
		ld	(Flag_BaddyInit),a
		ret
ax1:		ld	hl,(Axe_Position)
		ld	(BitmapX),hl
		ld	a,(Axe_VelocityY)
		ld	d,a
		add	a,h
		ld	h,a
		cp	0xA8
		jp	nc,ax2
		cp	0x38
		jp	nc,ax3
ax2:		xor	a
		sub	d
		ld	d,a
		call	Sound_AxeBounce
ax3:		ld	a,(Axe_Bitmap)
		call	ea_draw
		inc	l
		ld	a,l
		cp	0xE8
		jp	c,ax4
		ld	hl,0x9808
		ld	d,0xFC
ax4:		ld	(BitmapX),hl
		ld	(Axe_Position),hl
		ld	a,d
		ld	(Axe_VelocityY),a
		ld	a,l
		and	1
		ld	a,(Axe_Bitmap)
		jp	z,ax5
		inc	a
		cp	0xBB
		jp	nz,ax6
		ld	a,0xB3
ax6:		ld	(Axe_Bitmap),a
ax5:		call	ea_draw
		ld	b,5
		jp	Wally_HitTest

; ---- паучья рука ----
; DE = (X, Y) руки текущей комнаты из таблицы
sh_pos:		ld	a,(Wally_RoomNo)
		ld	b,a
		ld	hl,SpookyHand_PosTable
		ld	de,3
sp0:		ld	a,(hl)
		add	hl,de
		cp	b
		jp	nz,sp0
		dec	hl
		ld	d,(hl)
		dec	hl
		ld	e,(hl)
		ret
Handler_SpookyHand:
		ld	hl,SpookyHand
		ld	a,(hl)
		or	a
		jp	z,sh1
		dec	a
		ld	(hl),a
		ret	nz
		call	sh_pos
		ex	de,hl
		ld	(BitmapX),hl
		ld	a,0xAD
		ld	(SpookyHand_Frame),a
		jp	ea_draw
sh1:		ld	hl,SpookyHand_f26c
		dec	(hl)
		ret	nz
		ld	(hl),3
		call	sh_pos
		ex	de,hl
		ld	(BitmapX),hl
		ld	a,(SpookyHand_Frame)
		call	ea_draw
		inc	a
		cp	0xB3
		jp	nz,sh2
		ld	a,0x32
		ld	(SpookyHand),a
		ret
sh2:		ld	(SpookyHand_Frame),a
		call	ea_draw
		ld	b,2
		jp	Wally_HitTest
