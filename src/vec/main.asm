; Pyjamarama на Векторе-06Ц. Образ: данные (build/vec/data.bin, tools/mkvecdata.py) + нативный код (плоскость 3).
		DEVICE	NOSLOT64K
		ORG	0x0100
		INCBIN	"../../build/vec/data.bin"
		INCLUDE	"zxsym.inc"
		INCLUDE	"layout.inc"
		INCLUDE	"lang.inc"
		ORG	0x0000
		INCLUDE	"hw.asm"
		INCLUDE	"wally.asm"
		INCLUDE	"room.asm"
		INCLUDE	"gfx.asm"
		INCLUDE	"snd.asm"
		INCLUDE	"flow.asm"
		INCLUDE	"events_a.asm"
		INCLUDE	"invaders.asm"
		INCLUDE	"tcolor.asm"
		INCLUDE	"dzx0.asm"
		INCLUDE	"dlogo.asm"
; старт: пока сразу в игру (заставка и меню — во фронте, этап 4)
game_main:	jp	title_start
gm_w1:		ld	a,1			; для tools/sndcheck.js: цикл опроса звука вне игры (точка возврата beep)
		ld	(snd_busy),a
		call	snd_poll
		xor	a
		ld	(snd_busy),a
		jp	gm_w1

		ORG	DATA_END		; низкая память за образом данных: код модулей и таблицы сдвигов (плоскости 1-2 свободны под цвет)
		INCLUDE	"events_b.asm"
		ALIGN	256
shift_tab:	INCBIN	"../../build/vec/shift.tab"
		INCLUDE	"end.asm"
		INCLUDE	"rocket.asm"
		INCLUDE	"bmp16_gen.inc"
		INCLUDE	"front.asm"
		INCLUDE	"logo2.asm"		; логотип игры (три плоскости ZX0) и исключения цвета логотипа заставки
demo_zx0:	INCBIN	"../../build/vec/demo.zx0"	; запись ввода демо ZX (859 Б -> ZX0), пока демо не перенесено
LOW_END		EQU	$
		ASSERT	LOW_END <= 0x7C00

		SAVEBIN	"../../build/vec/pyjama.r0m",0,0x10000
