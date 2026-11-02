; Комната: тайлы, мебель, инвентарь, отрисовка комнаты, вход, интерпретатор скриптов. Нативный i8080 по src/model/room.js (сверка: tools/lockn.js).

; ---- примитивы тайлов: пишут АТРИБУТ сами (логика читает карту), пиксели — заглушка tile_px (этап 3). Регистры сохраняются. ----
; tile: A = тайл, D = строка, E = столбец, C = цвет
tile:		push	hl
		push	de
		ld	l,d			; HL = D*32 + E + ATTR
		ld	h,0
		add	hl,hl
		add	hl,hl
		add	hl,hl
		add	hl,hl
		add	hl,hl
		ld	d,0
		add	hl,de
		ld	de,ATTR
		add	hl,de
		ld	(hl),c
		pop	de
		pop	hl
		call	tile_px
		ret
; tile_flip: то же, но вверх ногами; строка атрибута = 0x1C - D
tile_flip:	push	hl
		push	de
		ld	h,a
		ld	a,0x1C
		sub	d
		ld	l,a
		ld	a,h
		ld	h,0
		add	hl,hl
		add	hl,hl
		add	hl,hl
		add	hl,hl
		add	hl,hl
		ld	d,0
		add	hl,de
		ld	de,ATTR
		add	hl,de
		ld	(hl),c
		pop	de
		pop	hl
		call	tile_flip_px
		ret
; tile_dbl: двойная высота — атрибуты в строках D и D+1
tile_dbl:	push	hl
		push	de
		ld	h,a
		ld	l,d
		ld	a,h
		ld	h,0
		add	hl,hl
		add	hl,hl
		add	hl,hl
		add	hl,hl
		add	hl,hl
		ld	d,0
		add	hl,de
		ld	de,ATTR
		add	hl,de
		ld	(hl),c
		ld	de,32
		add	hl,de
		ld	(hl),c
		pop	de
		pop	hl
		call	tile_dbl_px
		ret

; ---- ScreenClearEffect: заливка атрибутов цветом комнаты (низ экрана) + эффект ----
clr_fx:		ld	a,(Wally_RoomNo)
		ld	e,a
		ld	d,0
		ld	hl,Room_ColourTable
		add	hl,de
		ld	a,(hl)
		ld	hl,ATTR+0xA0
		ld	bc,0x0260
cfx0:		ld	(hl),a
		inc	hl
		dec	bc
		ld	d,a
		ld	a,b
		or	c
		ld	a,d
		jp	nz,cfx0
		jp	clr_px

; ---- мебель из строки: HL = строка, D = Y, E = X, C = цвет ---------------------------------------------------
fd_flip:	db	0			; 1 — тайлы вверх ногами (команда F4 в описании комнаты)
FurnitureDraw:	ld	a,(hl)
		inc	hl
		or	a
		jp	p,fd_single
		cp	0xFF
		ret	z
		cp	0xFE
		jp	z,fd_col
		cp	0xFC
		jp	z,fd_off
		cp	0xFB
		jp	z,fd_base
		ld	b,(hl)			; повтор: B раз тайл A
		inc	hl
		ld	a,(hl)
		inc	hl
fd_rep:		call	fd_tile
		inc	e
		dec	b
		jp	nz,fd_rep
		jp	FurnitureDraw
fd_single:	call	fd_tile
		inc	e
		jp	FurnitureDraw
fd_col:		ld	c,(hl)
		inc	hl
		jp	FurnitureDraw
fd_off:		ld	a,e
		add	a,(hl)
		ld	e,a
		inc	hl
		ld	a,d
		add	a,(hl)
		ld	d,a
		inc	hl
		jp	FurnitureDraw
fd_base:	ld	a,(hl)
		ld	(TileStartPtr),a
		inc	hl
		ld	a,(hl)
		ld	(TileStartPtr+1),a
		inc	hl
		jp	FurnitureDraw
fd_tile:	push	af
		ld	a,c
		ld	(fd_c0),a
		and	7
		push	hl
		ld	hl,fd_m0
		cp	(hl)
		jp	z,fdm_a
		ld	hl,fd_m1
		cp	(hl)
		jp	nz,fdm_n
fdm_a:		inc	hl
		ld	a,c
		and	0xF8
		or	(hl)
		ld	c,a
fdm_n:		pop	hl
		ld	a,(fd_flip)
		or	a
		jp	nz,fdt_f
		pop	af
		call	tile
		jp	fdm_r
fdt_f:		pop	af
		call	tile_flip
fdm_r:		push	af			; A (номер тайла) должен сохраниться: повторы тайла (fd_rep) вызывают fd_tile с тем же A
		ld	a,(fd_c0)
		ld	c,a
		pop	af
		ret
fd_c0:		db	0
fd_n:		db	0
fd_m0:		db	0xFF,0			; активные замены чернил (из, в) для рисуемой мебели; 0xFF — нет
fd_m1:		db	0xFF,0

; fd_remap: по таблице rm_tab (комната | 0xFF — любая, мебель, чернила ZX из, в) ставит замены fd_m0/fd_m1 для мебели fd_n
fd_remap:	push	hl
		push	de
		push	bc
		ld	hl,rm_tab
fr_l:		ld	a,(hl)
		cp	0xFE
		jp	z,fr_end
		ld	b,a
		inc	hl
		ld	a,(fd_n)
		cp	(hl)
		jp	nz,fr_nx
		ld	a,b
		cp	0xFF
		jp	z,fr_hit
		ld	a,(Wally_RoomNo)
		cp	b
		jp	nz,fr_nx
fr_hit:		inc	hl
		ld	c,(hl)
		inc	hl
		ld	b,(hl)
		inc	hl
		ld	a,(fd_m0)
		inc	a
		jp	nz,fr_s1
		ld	a,c
		ld	(fd_m0),a
		ld	a,b
		ld	(fd_m0+1),a
		jp	fr_l
fr_s1:		ld	a,c
		ld	(fd_m1),a
		ld	a,b
		ld	(fd_m1+1),a
		jp	fr_l
fr_nx:		inc	hl
		inc	hl
		inc	hl
		jp	fr_l
fr_end:		pop	bc
		pop	de
		pop	hl
		ret
; чернила ZX: 1 синий -> белый (код 1), 4 зелёный, 5 голубой, 6 жёлтый -> оранжевый (код 6), 7 белый -> светло-коричневый
rm_tab:
		IF	RM_ON
		db	0xFF,14,7,1		; ракета — белая
		db	19,37,6,1		; шкафы в ванной — белые
		db	19,38,6,1
		db	0xFF,39,5,4		; цветы в кашпо — зелёные
		db	0xFF,40,5,4
		db	0xFF,16,4,6		; сундуки — оранжевые
		db	0xFF,19,6,1		; паутина — белая
		db	0xFF,20,6,1
		db	0xFF,8,4,6		; спинки стульев — как ножки
		ENDIF
		db	0xFE

; ---- строка двойной высоты (HL, D, E, C) ----------------------------------------------------------------
String_DrawDouble:
sd0:		ld	a,(hl)
		inc	hl
		or	a
		jp	p,sd_t
		cp	0xFF
		ret	z
		cp	0xFE
		jp	z,sd_col
		cp	0xFC
		jp	nz,sd_t
		ld	a,e
		add	a,(hl)
		ld	e,a
		inc	hl
		ld	a,d
		add	a,(hl)
		ld	d,a
		inc	hl
		jp	sd0
sd_col:		ld	c,(hl)
		inc	hl
		jp	sd0
sd_t:		call	tile_dbl
		inc	e
		jp	sd0

; ---- инвентарь -------------------------------------------------------------------------------------------
; текст предмета: HL = строка, D = Y, E = X, C = цвет (0x44 — карман 1, 0x45 — карман 2)
InventoryDrawText:
idt:		ld	a,(hl)
		inc	hl
		or	a
		jp	p,idt_t
		cp	0xFF
		jp	z,idt_end
		cp	0xFC
		jp	nz,idt_t
		ld	a,e
		add	a,(hl)
		ld	e,a
		inc	hl
		ld	a,d
		add	a,(hl)
		ld	d,a
		inc	hl
		jp	idt
idt_t:		call	tile
		inc	e
		jp	idt
idt_end:	ld	a,(hl)			; после FF: FA — предмет бывает «полный/пустой»
		cp	0xFA
		ret	nz
		ld	a,c
		cp	0x44
		jp	nz,idt_p2
		ld	a,(Pocket1)
		jp	idt_p3
idt_p2:		ld	a,(Pocket2)
idt_p3:		ld	c,6
		ld	hl,Flag_LaserGun
		cp	0x0D
		jp	z,idt_f
		ld	hl,Flag_FuelCan
		cp	0x08
		jp	z,idt_f
		ld	hl,Flag_WaterBucket
idt_f:		inc	e
		ld	a,(hl)
		ld	hl,Str_Full
		or	a
		jp	nz,idt
		ld	hl,Str_Empty
		jp	idt

; HL = адрес текста предмета A
obj_text:
		IF	OBJ_ALT
		cp	8			; канистра / пистолет / ведро: «пустое» состояние — своё название (в ZX дописывалось EMPTY)
		jp	nz,ot_1
		ld	hl,Flag_FuelCan
		ld	de,Obj_Alt0
		jp	ot_c
ot_1:		cp	13
		jp	nz,ot_2
		ld	hl,Flag_LaserGun
		ld	de,Obj_Alt1
		jp	ot_c
ot_2:		cp	16
		jp	nz,ot_g
		ld	hl,Flag_WaterBucket
		ld	de,Obj_Alt2
ot_c:		ld	b,a
		ld	a,(hl)
		or	a
		ex	de,hl
		ret	z
		ld	a,b
ot_g:
		ENDIF
		ld	l,a
		ld	h,0
		add	hl,hl
		ld	de,ObjectTextPtrTable
		add	hl,de
		ld	a,(hl)
		inc	hl
		ld	h,(hl)
		ld	l,a
		ret

Inv_Redraw:	call	clr_inv
		ld	hl,Bmp_Tiles
		ld	(TileStartPtr),hl
		ld	a,(Pocket2)
		call	obj_text
		push	hl
		ld	a,(Pocket1)
		call	obj_text
		ld	de,0x0014-HUD_L
		ld	c,0x44
		call	InventoryDrawText
		pop	hl
		ld	de,0x0214-HUD_L
		ld	c,0x45
		call	InventoryDrawText
		ld	hl,0x0088-8*HUD_L
		ld	(BitmapX),hl
		ld	a,(Pocket1)
		add	a,0x50
		call	bmp16
		ld	hl,0x1088-8*HUD_L
		ld	(BitmapX),hl
		ld	a,(Pocket2)
		add	a,0x50
		jp	bmp16

; ---- комната --------------------------------------------------------------------------------------------
; потолок, пол, стены (тайлы 0,1,2 из Tile_Ceiling); вызывается из RoomDraw
Draw_CeilingWallFloor:
		push	bc			; как у ZX: BC, DE, HL сохраняются (цвет C переходит в мебель)
		push	de
		ld	hl,Tile_Ceiling
		ld	(TileStartPtr),hl
		ld	c,0x43
		xor	a
		ld	de,0x0500
		ld	b,0x20
dc0:		call	tile
		inc	e
		dec	b
		jp	nz,dc0
		ld	a,1
		ld	c,0x45
		ld	de,0x1700
		ld	b,0x20
dc1:		call	tile
		inc	e
		dec	b
		jp	nz,dc1
		ld	a,2
		ld	c,0x42
		ld	de,0x0600
		ld	b,0x11
dc2:		call	tile
		inc	d
		dec	b
		jp	nz,dc2
		ld	de,0x061F
		ld	b,0x11
dc3:		call	tile
		inc	d
		dec	b
		jp	nz,dc3
		pop	de
		pop	bc
		ret

RoomDraw:	ld	a,1			; на время отрисовки комнаты тайлы не очищают плоскости без цвета (экран уже очищен: clear_screen / clr_px)
		ld	(gx_fresh),a
		call	rd_body
		xor	a
		ld	(gx_fresh),a
		ret
rd_body:	ld	a,(Wally_RoomNo)
		add	a,a
		ld	e,a
		ld	d,0
		ld	hl,RoomData
		add	hl,de
		ld	e,(hl)
		inc	hl
		ld	d,(hl)
		ex	de,hl			; HL = описание комнаты
		ld	a,(hl)
		cp	0xF5
		jp	nz,rd0
		inc	hl
		push	hl
		call	Draw_CeilingWallFloor
		pop	hl
rd0:		ld	a,(hl)
		cp	0xFF
		jp	z,rd_obj
		cp	0xF4
		jp	z,rd_f4
		cp	0xF3
		jp	z,rd_f3
		cp	0xDE
		jp	z,rd_cond
		ld	e,a			; X, Y, номер мебели
		inc	hl
		ld	d,(hl)
		inc	hl
		ld	a,(hl)
		inc	hl
		ld	(fd_n),a
		push	hl
		push	de
		ld	l,a			; C (цвет) не трогать: он переходит между предметами мебели
		ld	h,0
		add	hl,hl
		ld	de,FurniturePtrTable
		add	hl,de
		ld	a,(hl)
		inc	hl
		ld	h,(hl)
		ld	l,a
		pop	de
rd_fd:		call	fd_remap		; перекраска отдельных предметов мебели (rm_tab)
		call	FurnitureDraw
		ld	a,0xFF
		ld	(fd_m0),a
		ld	(fd_m1),a
		pop	hl
		jp	rd0
rd_f4:		ld	a,1
		jp	rd_f
rd_f3:		xor	a
rd_f:		ld	(fd_flip),a
		inc	hl
		jp	rd0
rd_cond:	inc	hl			; DE lo hi: адрес флага; не ноль — продолжить, ноль — конец описания
		ld	e,(hl)
		inc	hl
		ld	d,(hl)
		inc	hl
		ld	a,(de)
		or	a
		jp	nz,rd0
rd_obj:		ld	a,(Wally_RoomNo)	; предмет комнаты
		ld	e,a
		add	a,a
		add	a,e
		ld	e,a
		ld	d,0
		ld	hl,Room_ObjSlots
		add	hl,de
		ld	a,(hl)
		ld	(BitmapX),a
		inc	hl
		ld	a,(hl)
		add	a,0x10
		ld	(BitmapY),a
		inc	hl
		ld	a,(hl)
		add	a,0x50
		jp	bmp16

Wally_Reset:	xor	a
		ld	(Wally_Frame),a
		ld	(PrevHead),a
		ld	(Wally_HeadTurned),a
		ld	(Wally_Falling),a
		ld	(Wally_Dir),a
		ld	(Wally_JumpDir),a
		dec	a
		ld	(Wall_LastDir),a
		ld	a,(Wally_X)
		cp	0x78
		ret	nc
		ld	a,0x10
		ld	(Wally_Frame),a
		ld	a,1
		ld	(Wall_LastDir),a
		ret

Room_Enter:	push	hl
		xor	a
		ld	(Var_F18A),a
		ld	(Flag_BaddyInit),a
		ld	(Flag_FoodDrawn),a
		ld	(Var_F18B),a
		inc	a
		ld	(MagLock_Dir),a
		ld	a,0x30
		ld	(SpookyHand),a
		ld	(Flag_MagLock),a
		ld	a,0xC8
		ld	(Room0_RockCount),a
		call	clr_fx
		call	RoomDraw
		call	Wally_Draw
		call	Inv_Redraw
		pop	hl
		ret

; посещённые комнаты и найденные предметы — для процентов в конце игры
Game_PercentUpdate:
		ld	a,(Wally_RoomNo)
		ld	e,a
		ld	d,0
		ld	hl,Room_VisitedTable
		add	hl,de
		ld	(hl),1
		ld	a,(Pocket1)
		add	a,a
		ld	e,a
		ld	hl,Object_FoundTable
		add	hl,de
		ld	(hl),1
		ld	a,(Pocket2)
		add	a,a
		ld	e,a
		ld	hl,Object_FoundTable
		add	hl,de
		ld	(hl),1
		ret

; Wally отошёл от слота предмета — снова можно брать
Wally_TestObjSlot:
		ld	a,(ObjEventPause)
		or	a
		ret	z
		call	slot_de
		ld	hl,(Wally_X)
		ld	a,(de)
		sub	l
		sub	6
		cp	0xF4
		ret	nc
		xor	a
		ld	(ObjEventPause),a
		ret

; DE = Room_ObjSlots + 3*комната; HL сохраняется
slot_de:	push	hl
		ld	a,(Wally_RoomNo)
		ld	e,a
		add	a,a
		add	a,e
		ld	e,a
		ld	d,0
		ld	hl,Room_ObjSlots
		add	hl,de
		ex	de,hl
		pop	hl
		ret

; ---- интерпретатор скриптов комнаты: байт-код (FF конец; FD — действия до FE; иначе тест с аргументами; ложный тест пропускает до FE) ----
; тест: вход HL = аргументы; выход HL после аргументов, NC = истина / C = ложь. Действие: вход/выход HL = аргументы / указатель дальше.
Room_TestEvents:
		ld	a,(Wally_RoomNo)
		add	a,a
		ld	e,a
		ld	d,0
		ld	hl,Table_RoomDataPtr
		add	hl,de
		ld	e,(hl)
		inc	hl
		ld	d,(hl)
		ex	de,hl
rt_next:	ld	a,(hl)
		inc	hl
		cp	0xFF
		ret	z
		cp	0xFD
		jp	z,rt_act
		ld	de,test_tab
		call	rt_disp
		jp	nc,rt_next
rt_scan:	ld	a,(hl)			; ложь: пропустить до FE
		inc	hl
		cp	0xFE
		jp	nz,rt_scan
		jp	rt_next
rt_act:		ld	a,(hl)
		inc	hl
		cp	0xFE
		jp	z,rt_next
		ld	de,act_tab
		call	rt_disp
		jp	rt_act
rt_disp:	add	a,a			; DE = таблица, A = номер -> переход по слову таблицы
		add	a,e
		ld	e,a
		jp	nc,rd_1
		inc	d
rd_1:		ld	a,(de)
		ld	c,a
		inc	de
		ld	a,(de)
		ld	b,a
		push	bc
		ret

test_tab:	dw	t_pos0,t_pos1,t_pocket,t_fuel,t_lifton,t_liftfl,t_liftoff,t_helpoff,t_box
act_tab:	dw	a_swap,a_pick,a_room,a_bucket,a_laser,a_nolaser,a_nobucket,a_fuel,a_nofuel
		dw	a_lifton,a_liftmv,a_liftdec,a_lights,a_magnet,a_helpon,a_helpoff
		dw	a_rocket_earth,a_rocket_moon,a_rope,a_arcade,a_win
a_unimpl:	jp	a_unimpl		; действия 0D, 10..14 — позже (магнит, ракета, верёвка, аркада, победа)
t_box:		jp	Test08_Box

get_wde:	push	hl			; DE = (Wally_X): E = X, D = Y
		ld	hl,(Wally_X)
		ex	de,hl
		pop	hl
		ret
t_pos0:		call	get_wde
		ld	a,(hl)
		inc	hl
		sub	e
		sub	9
		cp	0xEF
		jp	c,tf_skip
		ld	a,(hl)
		inc	hl
		sub	d
		sub	3
		cp	0xFA
		ret
tf_skip:	inc	hl
		scf
		ret
t_pos1:		ld	a,(ObjEventPause)
		or	a
		jp	z,t1a
		scf
		ret
t1a:		call	get_wde
		ld	a,(hl)
		inc	hl
		sub	e
		sub	3
		cp	0xFA
		jp	c,tf_skip
		ld	a,(hl)
		inc	hl
		sub	d
		sub	3
		cp	0xFA
		ret
t_pocket:	ld	a,(hl)
		inc	hl
		ld	b,a
		ld	a,(Pocket1)
		cp	b
		ret	z
		ld	a,(Pocket2)
		cp	b
		ret	z
		scf
		ret
t_fuel:		ld	a,(Flag_FuelCan)
		or	a
		ret	nz
		scf
		ret
t_lifton:	ld	a,(Lift_Count)
		or	a
		ret	nz
		scf
		ret
t_liftfl:	ld	a,(hl)
		inc	hl
		ld	b,a
		ld	a,(LiftFloorNo)
		cp	b
		ret	z
		scf
		ret
t_liftoff:	ld	a,(Lift_Count)
		or	a
		ret	z
		scf
		ret
t_helpoff:	ld	a,(Flag_HelpSwitch)
		or	a
		ret	z
		scf
		ret

Beep_PickUp:	ld	bc,0xFF0A
		ld	de,0x0114
		ld	hl,0x1401
		jp	beep

; действие 00: поменять предмет в кармане и в комнате
a_swap:		ld	a,1
		ld	(ObjEventPause),a
		ld	a,(hl)
		inc	hl
		push	hl
		ld	hl,Pocket1
		cp	(hl)
		jp	z,as0
		inc	hl
as0:		call	slot_de
		ld	a,(de)
		ld	(BitmapX),a
		inc	de
		ld	a,(de)
		add	a,0x10
		ld	(BitmapY),a
		inc	de
		ld	c,(hl)			; предмет из кармана
		ld	a,(de)			; предмет из комнаты
		ld	(hl),a
		ld	a,c
		ld	(de),a
		push	hl
		add	a,0x50
		call	bmp16
		pop	hl
		ld	a,(hl)
		add	a,0x50
		call	bmp16
		call	Inv_Redraw
		call	Beep_PickUp
		pop	hl
		ret
; действие 01: подобрать (карман1 -> карман2 -> комната -> карман1)
a_pick:		push	hl
		ld	a,1
		ld	(ObjEventPause),a
		ld	a,(Pocket1)
		ld	b,a
		ld	a,(Pocket2)
		ld	c,a
		call	slot_de
		ld	a,(de)
		ld	(BitmapX),a
		inc	de
		ld	a,(de)
		add	a,0x10
		ld	(BitmapY),a
		inc	de
		ld	a,b
		ld	(Pocket2),a
		ld	a,(de)
		ld	(Pocket1),a
		ld	a,c
		ld	(de),a
		add	a,0x50
		call	bmp16
		ld	a,(Pocket1)
		add	a,0x50
		call	bmp16
		call	Inv_Redraw
		call	Beep_PickUp
		pop	hl
		ret
; действие 02: перейти в комнату (номер, X, Y)
a_room:		ld	a,(hl)
		inc	hl
		ld	(Wally_RoomNo),a
		ld	a,(hl)
		inc	hl
		ld	(Wally_X),a
		ld	a,(hl)
		inc	hl
		ld	(Wally_Y),a
		push	hl
		call	Wally_Reset
		ld	bc,0xC828
		ld	de,0x0128
		ld	hl,0x02FD
		call	beep
		call	Room_Enter
		pop	hl
		ret
a_bucket:	ld	a,(Flag_WaterBucket)
		or	a
		ret	nz
		ld	a,1
		ld	(Flag_WaterBucket),a
		jp	a_redraw
a_laser:	ld	a,(Flag_LaserGun)
		or	a
		ret	nz
		ld	a,1
		ld	(Flag_LaserGun),a
		jp	a_redraw
a_fuel:		ld	a,(Flag_FuelCan)
		or	a
		ret	nz
		ld	a,1
		ld	(Flag_FuelCan),a
a_redraw:	push	hl
		call	Inv_Redraw
		pop	hl
		ret
a_nolaser:	xor	a
		ld	(Flag_LaserGun),a
		ret
a_nobucket:	xor	a
		ld	(Flag_WaterBucket),a
		ret
a_nofuel:	xor	a
		ld	(Flag_FuelCan),a
		ret
a_helpoff:	xor	a
		ld	(Flag_HelpSwitch),a
		ret
a_helpon:	ld	a,1
		ld	(Flag_HelpSwitch),a
		push	hl
		ld	hl,0x6078
		jp	a_switch
a_lifton:	ld	a,4
		ld	(Lift_Count),a
		push	hl
		ld	hl,0x8878
a_switch:	ld	(BitmapX),hl		; переключатель: убрать «выкл», нарисовать «вкл», звук (XOR поверх тайлов: в плоскостях цвета ячейки — bmp16c)
		push	hl
		call	wa_restore		; под Wally в карте стоит его жёлтый 0x46 — вернуть истинные цвета клеток
		pop	hl
		ld	(BitmapX),hl
		ld	a,0x70
		call	bmp16c
		ld	a,0x71
		call	bmp16c
		call	wa_mark		; и снова пометить клетки под Wally
		ld	bc,0x320A
		ld	de,0x050A
		ld	hl,0x1414
		call	beep
		pop	hl
		ret
a_liftmv:	ld	a,(hl)
		inc	hl
		ld	(LiftFloorNo),a
		ret
a_liftdec:	ld	a,(Lift_Count)
		dec	a
		ld	(Lift_Count),a
		ret
a_lights:	ld	a,(hl)			; лампы лифта: все красные, выбранная — белая
		inc	hl
		push	hl
		ld	hl,ATTR+0x188
		ld	de,6
		ld	b,4
al0:		ld	a,0x42
		call	attr_put
		add	hl,de
		dec	b
		jp	nz,al0
		ld	l,a			; A*6
		add	a,a
		ld	e,a
		add	a,a
		add	a,e
		ld	e,a
		ld	hl,ATTR+0x188
		add	hl,de
		ld	a,0x47
		call	attr_put
		pop	hl
		ret
