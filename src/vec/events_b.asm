; События комнат B — нативный i8080 по src/model/events_b.js (сверка: tools/lockn.js, плагин tools/lockn_plugins/events_b.js).
; Интерфейс: обработчики Handler_* и Animate_MovingFloor — без входных регистров, выход — только память/журнал; a_magnet: HL = аргументы действия -> HL дальше.
; Пиксельные действия вынесены в листовые заглушки (RET): mag_xor (A = номер ряда: XOR 0x2C по байтам +0,1,3,6,8,9 от DF_lookup[ряд]+0x0F; HL, C сохранить),
; mf_rotate (две полосы по 32 байта: RRC (HL) по адресам из слов DF 91DB/91DD, см. Animate_MovingFloor ZX). Ни одна не пишет в журнал модели.

; A = индекс спрайта, HL = позиция (L = X, H = Y)
eb_bmp:		ld	(BitmapX),hl
		jp	bmp16

; A = предмет -> Z, если он в одном из карманов (HL сохраняется)
eb_pk:		push	hl
		ld	hl,Pocket1
		cp	(hl)
		jp	z,ep_x
		inc	hl
		cp	(hl)
ep_x:		pop	hl
		ret

; ---- магнитные прутья ----

Handler_MagLock:ld	a,(MagLock_Dir)
		ld	c,a
		cp	1
		ld	hl,Flag_MagLock
		ld	a,(hl)
		jp	nz,ml_open
		cp	0xB7
		ret	z
		jp	ml_go
ml_open:	cp	0x30
		ret	z
		dec	a
ml_go:		call	mag_xor
		ld	a,(hl)
		add	a,c
		ld	(hl),a
		ret

; действие 0D: замок открыт, раскраска платформ (HL не меняется)
a_magnet:	ld	a,0xFF
		ld	(MagLock_Dir),a
		push	hl
		ld	hl,ATTR+0x028D
		ld	de,-0x1E
		ld	b,5
		call	am_pair
		ld	hl,ATTR+0x0237
		ld	de,0x22
		ld	b,4
		call	am_pair
		pop	hl
		ret
am_pair:	ld	a,0x45			; B раз: 2 клетки (HL, HL+1) = 0x45, HL += DE
am_l:		call	attr_put
		inc	hl
		call	attr_put
		dec	hl
		add	hl,de
		dec	b
		jp	nz,am_l
		ret

; ---- движущийся пол ----
Handler_MovingFloor:
		ld	a,(DeathFlag)
		or	a
		ret	nz
		ld	a,0x12
		call	eb_pk
		ret	z
		ld	a,(Wally_Y)
		cp	0x91
		ret	c
		call	Wally_Erase
		ld	hl,(Wally_X)
		ld	a,l
		add	a,2
		cp	0xE8
		jp	c,mf0
		ld	a,0xE8
mf0:		ld	l,a
		ld	(Wally_X),hl
		jp	Wally_Draw

Animate_MovingFloor:
		ld	a,0x12
		call	eb_pk
		ret	z
		ld	a,(DeathFlag)
		or	a
		ret	nz
		jp	mf_rotate

; ---- падающие блоки: 5 записей по 3 байта (X, Y, vy) ----
Handler_FallingBlocks:
		ld	a,(Flag_BaddyInit)
		or	a
		jp	nz,fb_run
		ld	a,1
		ld	(Flag_BaddyInit),a
		ld	de,Block_Data
		ld	b,5
fb_i:		ld	a,(de)
		ld	l,a
		inc	de
		ld	a,(de)
		ld	h,a
		inc	de
		inc	de
		push	de
		push	bc
		ld	a,0x72
		call	eb_bmp
		pop	bc
		pop	de
		dec	b
		jp	nz,fb_i
		ld	hl,0x98E0
		ld	a,(Fire_Frame)
		jp	eb_bmp
fb_run:		ld	hl,Block_Data
		ld	b,5
fb_l:		push	bc
		push	hl			; запись
		ld	e,(hl)
		inc	hl
		ld	d,(hl)
		inc	hl
		ld	c,(hl)			; C = vy
		ex	de,hl			; HL = позиция
		push	bc
		push	hl
		ld	b,2
		call	Wally_HitTest
		pop	hl
		pop	bc
		push	hl
		push	bc
		ld	a,0x72
		call	eb_bmp			; стереть
		pop	bc
		pop	hl
		ld	a,h
		add	a,c
		cp	0xB0
		jp	c,fb_nw
		call	rnd_a
		and	1
		inc	a
		ld	c,a
		ld	a,0x68
fb_nw:		pop	hl
		inc	hl
		ld	(hl),a
		inc	hl
		ld	(hl),c
		inc	hl
		ld	(BitmapY),a
		push	hl
		ld	a,0x72
		call	bmp16
		pop	hl
		pop	bc
		dec	b
		jp	nz,fb_l
		ret

; ---- огонь ----
Handler_Fire:	ld	a,0x0A
		call	eb_pk
		ret	z
		ld	a,(Fire_Frame)
		ld	hl,0x98E0
		call	eb_bmp
		ld	a,(Fire_Frame)
		inc	a
		cp	0x86
		jp	nz,fi1
		ld	a,0x81
fi1:		ld	(Fire_Frame),a
		call	bmp16
		ld	hl,0x98E0
		ld	b,0x10
		jp	Wally_HitTest

; ---- воздушный шар ----
Handler_BalloonHelp:
		ld	a,(Flag_BaddyInit)
		or	a
		jp	nz,bh_run
		ld	a,1
		ld	(Flag_BaddyInit),a
		ld	hl,0x8018
		ld	a,0x73
		call	eb_bmp
		ld	a,0x90
		ld	(BitmapY),a
		ld	a,0x74
		jp	bmp16
bh_run:		ld	hl,(Wally_X)
		ld	a,0x17
		sub	l
		cp	0xFE
		ret	c
		ld	a,h
		cp	0x98
		ret	nz
		ld	a,0x11
		call	eb_pk
		ret	nz
		ld	a,(Var_F18B)
		or	a
		ret	nz
		ld	bc,0x5080
bh_l:		push	bc
		ld	de,bh_tab
		ld	b,4
bh_s:		ld	a,(de)
		add	a,c
		ld	h,a
		inc	de
		ld	a,(de)
		inc	de
		ld	l,0x18
		push	bc
		push	de
		call	eb_bmp
		pop	de
		pop	bc
		dec	b
		jp	nz,bh_s
		call	Wally_Erase
		ld	hl,(Wally_X)
		dec	h
		ld	(Wally_X),hl
		call	Wally_Draw
		call	Pause_Short		; ZX EADF
		pop	bc
		dec	c
		dec	b
		jp	nz,bh_l
		ld	a,1
		ld	(Var_F18B),a
		ret
bh_tab:		db	0,0x73,0xFF,0x73,0x10,0x74,0x0F,0x74

; ---- хищные растения ----
Handler_SavagePlant:
		ld	a,(Flag_BaddyInit)
		or	a
		jp	nz,sp_run
		ld	a,1
		ld	(Flag_BaddyInit),a
		jp	sp_two
sp_run:		ld	a,(Flag_WaterBucket)
		or	a
		jp	z,sp_go
		ld	a,0x10
		call	eb_pk
		ret	z
		ld	a,(ObjSlot05_Bmp)
		cp	0x10
		ret	z
sp_go:		call	sp_two			; стереть
		ld	a,(SavagePlants_Bmp)
		inc	a
		cp	0x7A
		jp	nz,sp1
		ld	a,0x75
sp1:		ld	(SavagePlants_Bmp),a
		ld	b,8
		ld	hl,0xA848
		push	bc
		call	eb_bmp
		pop	bc
		ld	hl,0xA848
		call	Wally_HitTest
		push	bc
		ld	hl,0xA8A8
		ld	a,(SavagePlants_Bmp)
		call	eb_bmp
		pop	bc
		ld	hl,0xA8A8
		call	Wally_HitTest
		ld	a,(SavagePlants_Bmp)
		cp	0x75
		ret	nz
		ld	bc,0x1408
		ld	de,0x0108
		ld	hl,0x7F82
		jp	beep
sp_two:		ld	a,(SavagePlants_Bmp)
		ld	hl,0xA848
		call	eb_bmp
		ld	a,(SavagePlants_Bmp)
		ld	hl,0xA8A8
		jp	eb_bmp

; ---- книги ----
Handler_Books:	ld	a,(Flag_BaddyInit)
		or	a
		jp	nz,bk_run
		ld	a,1
		ld	(Flag_BaddyInit),a
		ld	a,0x58
		ld	(Book1_Ypos),a
		ld	h,a
		ld	l,0x70
		ld	a,0x7A
		call	eb_bmp
		ld	a,0x77
		ld	(Book2_Ypos),a
		ld	h,a
		ld	l,0x70
		ld	a,0xC7
		jp	eb_bmp
bk_run:		ld	de,Book1_Ypos
		ld	c,0x7A
		call	bk_one
		ld	a,0x0F
		call	eb_pk
		jp	z,bk_h1
		ld	b,0x10
		call	Wally_HitTest
bk_h1:		ld	de,Book2_Ypos
		ld	c,0xC7
		call	bk_one
		ld	a,0x0F
		call	eb_pk
		ret	z
		ld	b,0x10
		jp	Wally_HitTest
; DE = &Ypos, C = спрайт; выход HL = (0x70, старый Y)
bk_one:		ld	a,(de)
		ld	h,a
		ld	l,0x70
		push	hl
		ld	a,c
		push	bc
		push	de
		call	eb_bmp
		pop	de
		pop	bc
		pop	hl
		ld	a,h
		inc	a
		cp	0x80
		jp	c,bk1
		ld	a,0x46
bk1:		ld	(de),a
		ld	(BitmapY),a
		push	hl
		ld	a,c
		call	bmp16
		pop	hl
		ret

; ---- гиря на 3 тонны ----
Handler_ThreeTon:
		ld	a,(Flag_BaddyInit)
		or	a
		jp	nz,tt_run
		ld	a,1
		ld	(Flag_BaddyInit),a
		ld	a,0x64
		ld	(Weight_Count),a
		ld	a,0x30
		ld	(Weight_Y),a
		ld	h,a
		ld	l,0x88
		call	tt_draw
tt_hit:		ld	b,2
		jp	Wally_HitTest
tt_run:		ld	hl,Weight_Count
		ld	a,(hl)
		or	a
		jp	z,tt_f
		dec	(hl)
		ret
tt_f:		ld	a,(Weight_Y)
		ld	h,a
		ld	l,0x88
		cp	0x70
		jp	z,tt_hit
		call	tt_draw			; стереть
		ld	a,(Weight_Y)
		add	a,2
		ld	(Weight_Y),a
		ld	h,a
		ld	l,0x88
		call	tt_draw
		jp	tt_hit
; HL = позиция верха; выход HL = позиция низа (Y+0x10)
tt_draw:	ld	a,0x7F
		push	hl
		call	eb_bmp
		pop	hl
		ld	a,h
		add	a,0x10
		ld	h,a
		ld	(BitmapY),a
		push	hl
		ld	a,0x80
		call	bmp16
		pop	hl
		ret

; ---- привидения: 3 записи по 4 байта (X, Y, dx, dy) ----
gh_nb:		db	0
Handler_Ghosts:	ld	a,(Flag_BaddyInit)
		or	a
		jp	nz,gh_run
		ld	a,1
		ld	(Flag_BaddyInit),a
		ld	hl,0xA064
		ld	(Ghost1),hl
		call	gh_dr
		ld	hl,0x50DC
		ld	(Ghost2),hl
		call	gh_dr
		ld	hl,0x3A30
		ld	(Ghost3),hl
gh_dr:		ld	a,(Ghost_Bitmap)
		jp	eb_bmp
gh_run:		ld	a,(Ghost_Bitmap)
		inc	a
		cp	0xBF
		jp	nz,gh1
		ld	a,0xBB
gh1:		ld	(gh_nb),a
		ld	hl,Ghost1
		ld	b,3
gh_l:		push	bc
		push	hl
		ld	a,(hl)
		cp	0x08
		jp	z,gh_bx
		cp	0xE8
		jp	nz,gh_nx
gh_bx:		inc	hl
		inc	hl
		call	gh_neg
		dec	hl
		dec	hl
gh_nx:		inc	hl
		ld	a,(hl)
		cp	0x30
		jp	z,gh_by
		cp	0xA8
		jp	nz,gh_ny
gh_by:		inc	hl
		inc	hl
		call	gh_neg
		dec	hl
		dec	hl
gh_ny:		dec	hl
		ld	e,(hl)			; стереть на старом месте
		inc	hl
		ld	d,(hl)
		ex	de,hl
		ld	a,(Ghost_Bitmap)
		call	eb_bmp
		pop	hl
		push	hl
		ld	a,(hl)			; X += dx
		inc	hl
		inc	hl
		add	a,(hl)
		dec	hl
		dec	hl
		ld	(hl),a
		ld	c,a
		inc	hl
		ld	a,(hl)			; Y += dy
		inc	hl
		inc	hl
		add	a,(hl)
		dec	hl
		dec	hl
		ld	(hl),a
		ld	h,a
		ld	l,c
		push	hl
		ld	a,(gh_nb)
		call	eb_bmp
		pop	hl
		ld	b,1
		call	Wally_HitTest
		pop	hl
		ld	de,4
		add	hl,de
		pop	bc
		dec	b
		jp	nz,gh_l
		ld	a,(gh_nb)
		ld	(Ghost_Bitmap),a
		ret
gh_neg:		ld	a,(hl)
		cpl
		inc	a
		ld	(hl),a
		ret

; ======== цвет и пиксельные действия с учётом плоскостей (спрайты и пиксели поверх тайлов ZX красятся по цвету ячейки) ========

; cell_v: A = код цвета (gx_v) ячейки карты атрибутов под левым верхним углом спрайта (BitmapX, BitmapY)
cell_v:		ld	a,(BitmapY)
		and	0xF8
		ld	l,a
		ld	h,0
		add	hl,hl
		add	hl,hl
		ld	a,(BitmapX)
		rrca
		rrca
		rrca
		and	0x1F
		ld	e,a
		ld	d,0
		add	hl,de
		ld	de,ATTR
		add	hl,de
		ld	a,(hl)
		call	gx_setv
		ld	a,(gx_v)
		ret

; bmp16c: A = индекс спрайта; как bmp16, но XOR во ВСЕ плоскости цвета ячейки под спрайтом (так спрайт гасит/рисует то, что нарисовано тайлами, не оставляя «точек» чужого цвета).
; Портит всё (как bmp16).
bmp16c:		ld	(cb_i),a
		call	cell_v
		ld	(cb_v),a
		xor	a
		ld	(cb_o),a
cb_l:		ld	a,(cb_v)
		rrca
		ld	(cb_v),a
		jp	nc,cb_n
		ld	a,(cb_o)
		ld	(gx_fo),a
		ld	a,(cb_i)
		call	bmp16
cb_n:		ld	a,(cb_o)
		add	a,0x20
		ld	(cb_o),a
		cp	0x60
		jp	nz,cb_l
		ld	a,0xFF
		ld	(gx_fo),a
		ret
cb_i:		db	0
cb_v:		db	0
cb_o:		db	0

; attr_put: HL = адрес в карте атрибутов, A = новый атрибут -> записать и перекрасить пиксели ячейки (чернила = объединение плоскостей, плоскости — по коду цвета). Регистры сохраняются.
attr_put:	ld	(hl),a
		push	af
		push	bc
		push	de
		push	hl
		call	gx_setv
		ld	a,h
		sub	0x7C
		rlca
		rlca
		rlca
		ld	b,a
		ld	a,l
		rlca
		rlca
		rlca
		and	7
		add	a,b			; строка ячейки
		rlca
		rlca
		rlca
		ld	b,a
		ld	a,216
		sub	b
		ld	e,a			; нижняя линия ячейки
		ld	a,l
		and	0x1F
		add	a,0x80
		ld	d,a			; страница плоскости 0
		ld	a,(gx_v)
		ld	c,a
		ld	hl,ap_m
		ld	b,3
ap_mk:		ld	a,c
		rrca
		ld	c,a
		sbc	a,a
		ld	(hl),a
		inc	hl
		dec	b
		jp	nz,ap_mk
		ld	b,8
ap_l:		ld	h,d
		ld	l,e
		ld	a,(hl)
		ld	c,a
		ld	a,h
		add	a,0x20
		ld	h,a
		ld	a,(hl)
		or	c
		ld	c,a
		ld	a,h
		add	a,0x20
		ld	h,a
		ld	a,(hl)
		or	c
		ld	c,a			; C = чернила ячейки (объединение плоскостей)
		ld	a,(ap_m+2)
		and	c
		ld	(hl),a
		ld	a,h
		sub	0x20
		ld	h,a
		ld	a,(ap_m+1)
		and	c
		ld	(hl),a
		ld	a,h
		sub	0x20
		ld	h,a
		ld	a,(ap_m)
		and	c
		ld	(hl),a
		inc	e
		dec	b
		jp	nz,ap_l
		pop	hl
		pop	de
		pop	bc
		pop	af
		ret
ap_m:		ds	3

; mag_xor: A = ряд пикселей ZX (Flag_MagLock) -> XOR 0x2C по байтам колонок 17,18,20,23,25,26 в плоскостях цвета ячейки (ZX: DF_lookup[ряд]+0x0F, +0,1,3,6,8,9). HL, C сохраняются.
mag_xor:	push	hl
		push	bc
		push	de
		ld	(mx_y),a
		ld	b,a
		ld	a,223
		sub	b
		ld	(mx_l),a
		ld	a,b
		and	0xF8
		ld	l,a
		ld	h,0
		add	hl,hl
		add	hl,hl
		ld	de,ATTR
		add	hl,de
		ld	(mx_ab),hl
		ld	hl,mx_cols
mx_k:		ld	a,(hl)
		inc	hl
		push	hl
		ld	(mx_c),a
		ld	hl,(mx_ab)
		ld	e,a
		ld	d,0
		add	hl,de
		ld	a,(hl)
		call	gx_setv
		ld	a,(gx_v)
		ld	c,a
		ld	a,(mx_c)
		add	a,0x80
		ld	d,a
		ld	a,(mx_l)
		ld	e,a
		ld	b,3
mx_p:		ld	a,c
		rrca
		ld	c,a
		jp	nc,mx_s
		ld	a,(de)
		xor	0x2C
		ld	(de),a
mx_s:		ld	a,d
		add	a,0x20
		ld	d,a
		dec	b
		jp	nz,mx_p
		pop	hl
		ld	a,(hl)
		or	a
		jp	nz,mx_k
		pop	de
		pop	bc
		pop	hl
		ret
mx_cols:	db	17,18,20,23,25,26,0
mx_y:		db	0
mx_l:		db	0
mx_c:		db	0
mx_ab:		dw	0

; mf_rotate: конвейер (ZX Animate_MovingFloor): две полосы пикселей y=184,185 (линии Вектора 39, 38) на всю ширину — каждый байт RRC; три плоскости
mf_rotate:	push	af
		push	de
		ld	d,0x80
mr_l:		ld	e,38
		ld	a,(de)
		rrca
		ld	(de),a
		inc	e
		ld	a,(de)
		rrca
		ld	(de),a
		inc	d
		ld	a,d
		cp	0xE0
		jp	nz,mr_l
		pop	de
		pop	af
		ret

; bmp16w: нижняя половина Wally (индекс A) — пижама: XOR во вторую и третью плоскости (код 110 = белый), верхняя половина идёт обычным bmp16 в плоскость 0 (жёлтая кожа).
; Портит всё (как bmp16).
bmp16w:		ld	(cb_i),a
		ld	a,0x20
		ld	(gx_fo),a
		ld	a,(cb_i)
		call	bmp16
		ld	a,0x40
		ld	(gx_fo),a
		ld	a,(cb_i)
		call	bmp16
		ld	a,0xFF
		ld	(gx_fo),a
		ret
