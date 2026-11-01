; Звук на ВИ53 (КР580ВИ53, порты 0x08..0x0B: 0x08 — управляющее слово, 0x09 — канал 2 (тон), 0x0B — канал 0 (секундомер); тактовая 1,5 МГц).
; ZX `Beep_Effect(BC,DE,HL)` дёргал динамик из цикла и стоял. Здесь тон делает ТАЙМЕР (канал 2, режим 3 — меандр), ЦП только меняет делитель; эффект играет в фоне.
; Модель эффекта ZX: фаза 1: C периодов, перед каждым B -= H; фаза 2: D периодов при текущем B; фаза 3: E периодов, перед каждым B += L (счётчики — do-while: 0 = 256).
; Период ZX = 26*B' + 123 тактов (B' = B, 0 -> 256) @3,5 МГц  =>  в тиках ВИ53 (1,5 МГц) N = 11*B' + (B' >> 3) + 53.
; Продвигает ноты snd_poll: из ISR (каждый кадр) и из паузы игры (часто, под DI); в очереди до 4 эффектов, лишние отбрасываются.

SND_QN		EQU	4			; глубина очереди эффектов

snd_init:	ld	a,0x34			; канал 0: режим 2 (генератор частоты), делитель 0xFFFF — свободный секундомер
		out	(0x08),a
		ld	a,0xFF
		out	(0x0B),a
		out	(0x0B),a
		xor	a
		ld	(snd_ph),a
		ld	(snd_qc),a
		ld	(snd_qr),a
snd_stop:	ld	a,0xB0			; канал 2: режим 0 без загрузки счёта — выход молчит (без щелчка по завершению счёта)
		out	(0x08),a
		ret

; HL = значение секундомера (канал 0, счёт вниз)
snd_now:	xor	a
		out	(0x08),a		; защёлка канала 0
		in	a,(0x0B)
		ld	l,a
		in	a,(0x0B)
		ld	h,a
		ret

; beep: BC, DE, HL — как у ZX Beep_Effect. Ставит эффект в очередь и возвращается сразу. Портит A, BC, DE, HL.
beep:		ld	a,b			; шаг Wally у ZX — ультразвуковой щелчок (17 кГц, 0,9 мс), на ВИ53 не слышен: заменяем слышимым тиком (8 периодов ~1,8 кГц)
		cp	7
		jp	nz,sn_bp0
		ld	a,d
		cp	0x0F
		jp	nz,sn_bp0
		ld	a,h
		cp	4
		jp	nz,sn_bp0
		ld	bc,0x4601
		ld	de,0x0601
		ld	hl,0
sn_bp0:		di
		ld	a,(snd_qc)
		cp	SND_QN
		jp	nc,sn_bpend		; очередь полна — эффект теряется
		push	hl
		push	de
		push	bc
		ld	hl,snd_qr		; индекс записи = (qr + qc) & 3
		add	a,(hl)
		and	SND_QN-1
		ld	e,a
		add	a,a			; запись 6 байт: *6 = *4 + *2
		add	a,e
		add	a,a
		ld	e,a
		ld	d,0
		ld	hl,snd_q
		add	hl,de
		pop	de			; BC -> запись
		ld	(hl),e
		inc	hl
		ld	(hl),d
		inc	hl
		pop	de			; DE
		ld	(hl),e
		inc	hl
		ld	(hl),d
		inc	hl
		pop	de			; HL
		ld	(hl),e
		inc	hl
		ld	(hl),d
		ld	hl,snd_qc
		inc	(hl)
		ld	a,(snd_ph)
		or	a
		call	z,snd_poll		; был простой — запустить сразу
sn_bpend:		ei
		ret

; fx_noise: белый шум взрыва (ZX FX_WhiteNoise — 25 периодов со случайной длиной из ПЗУ). Здесь — 25 периодов, у которых B меняется шагом 0xB7 (псевдослучайно); начальное B — от секундомера.
; Сохраняет регистры. Тело в стенде lockn не исполняется (как beep).
fx_noise:	push	af
		push	bc
		push	de
		push	hl
		call	snd_now
		ld	b,l			; случайное начальное B
		ld	c,0x19
		ld	de,0x0101
		ld	hl,0xB700
		call	beep
		pop	hl
		pop	de
		pop	bc
		pop	af
		ret

; snd_poll (под DI или из ISR): догнать время — пропустить прошедшие периоды (в таймер пишется только итоговый делитель);
; в простое — взять следующий эффект из очереди
snd_poll:	ld	a,(snd_ph)
		or	a
		jp	nz,sn_run
		ld	a,(snd_qc)
		or	a
		ret	z
		call	snd_pop			; взять эффект: параметры в snd_B.., фаза 1
		call	snd_now
		ld	(snd_t0),hl
		ld	a,0xB6			; канал 2: LSB/MSB, режим 3, двоичный
		out	(0x08),a
		call	sn_adv			; первый период
sn_out:		ld	hl,(snd_n)		; записать делитель текущего периода
		ld	a,l
		out	(0x09),a
		ld	a,h
		out	(0x09),a
		xor	a
		ld	(snd_dirty),a
		ret
sn_run:		call	snd_now			; DE = прошло = t0 - сейчас (счётчик идёт вниз)
		ex	de,hl
		ld	hl,(snd_t0)
		ld	a,l
		sub	e
		ld	e,a
		ld	a,h
		sbc	a,d
		ld	d,a
sn_loop:	ld	hl,(snd_n)
		ld	a,e
		sub	l
		ld	a,d
		sbc	a,h
		jp	c,sn_done		; период ещё идёт
		ld	a,e			; прошло -= N
		sub	l
		ld	e,a
		ld	a,d
		sbc	a,h
		ld	d,a
		ex	de,hl			; HL = остаток, DE = N
		push	hl
		ld	hl,(snd_t0)		; t0 -= N
		ld	a,l
		sub	e
		ld	l,a
		ld	a,h
		sbc	a,d
		ld	h,a
		ld	(snd_t0),hl
		call	sn_adv			; следующий период (или конец)
		pop	de
		jp	nc,sn_loop
		jp	snd_poll		; эффект кончился: возможно, есть следующий в очереди
sn_done:	ld	a,(snd_dirty)
		or	a
		ret	z
		jp	sn_out

; следующий период: обновить B, счётчики и N (в таймер не пишет, ставит snd_dirty); CF=1 — эффект закончился (тишина)
sn_adv:		ld	a,(snd_ph)
		cp	4
		jp	z,sn_end
		cp	2
		jp	z,sn_p2
		jp	nc,sn_p3
		ld	a,(snd_B)		; фаза 1: B -= H
		ld	hl,snd_H
		sub	(hl)
		ld	(snd_B),a
		ld	hl,snd_C
		dec	(hl)
		jp	nz,sn_play
		ld	a,2
		ld	(snd_ph),a
		jp	sn_play
sn_p2:		ld	hl,snd_D		; фаза 2: период при текущем B
		dec	(hl)
		jp	nz,sn_play
		ld	a,3
		ld	(snd_ph),a
		jp	sn_play
sn_p3:		ld	a,(snd_B)		; фаза 3: B += L
		ld	hl,snd_L
		add	a,(hl)
		ld	(snd_B),a
		ld	hl,snd_E
		dec	(hl)
		jp	nz,sn_play
		ld	a,4			; последний период — после него конец
		ld	(snd_ph),a
sn_play:	call	snd_div			; HL = N
		ld	(snd_n),hl
		ld	a,1
		ld	(snd_dirty),a
		or	a			; CF = 0
		ret
sn_end:		xor	a
		ld	(snd_ph),a
		ld	(snd_dirty),a
		call	snd_stop
		scf
		ret

; HL = N для текущего B (см. шапку)
snd_div:	ld	a,(snd_B)
		ld	e,a
		ld	d,0
		or	a
		jp	nz,sn_sd0
		inc	d			; B = 0 -> 256
sn_sd0:		ld	h,d
		ld	l,e
		add	hl,hl			; 11*B' = ((B'*2*2 + B')*2 + B')
		add	hl,hl
		add	hl,de
		add	hl,hl
		add	hl,de
		push	hl
		ld	a,d			; B' >> 3
		or	a
		rra
		ld	h,a
		ld	a,e
		rra
		ld	l,a
		ld	a,h
		or	a
		rra
		ld	h,a
		ld	a,l
		rra
		ld	l,a
		ld	a,h
		or	a
		rra
		ld	h,a
		ld	a,l
		rra
		ld	l,a
		pop	de
		add	hl,de
		ld	de,53
		add	hl,de
		ret

; достать эффект из очереди в snd_B/C/D/E/H/L, фаза 1; qr++, qc--
snd_pop:	ld	a,(snd_qr)
		ld	e,a
		add	a,a
		add	a,e
		add	a,a
		ld	e,a
		ld	d,0
		ld	hl,snd_q
		add	hl,de
		ld	a,(hl)			; C
		ld	(snd_C),a
		inc	hl
		ld	a,(hl)			; B
		ld	(snd_B),a
		inc	hl
		ld	a,(hl)			; E
		ld	(snd_E),a
		inc	hl
		ld	a,(hl)			; D
		ld	(snd_D),a
		inc	hl
		ld	a,(hl)			; L
		ld	(snd_L),a
		inc	hl
		ld	a,(hl)			; H
		ld	(snd_H),a
		ld	a,(snd_qr)
		inc	a
		and	SND_QN-1
		ld	(snd_qr),a
		ld	hl,snd_qc
		dec	(hl)
		ld	a,1
		ld	(snd_ph),a
		ret

snd_q:		ds	6*SND_QN
snd_qc:		db	0			; эффектов в очереди
snd_qr:		db	0			; индекс чтения
snd_ph:		db	0			; 0 — тишина, 1..3 — фаза, 4 — последний период
snd_B:		db	0
snd_C:		db	0
snd_D:		db	0
snd_E:		db	0
snd_H:		db	0
snd_L:		db	0
snd_t0:		dw	0
snd_n:		dw	0
snd_busy:	db	0			; 1 — основной код сейчас в snd_poll: ISR свой опрос пропускает
snd_dirty:	db	0			; период сменился, делитель в таймер ещё не записан

; из ISR: пропустить, если основной код опрашивает звук сам
snd_poll_isr:	ld	a,(snd_busy)
		or	a
		ret	nz
		jp	snd_poll
