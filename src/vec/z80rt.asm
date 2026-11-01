; Рабочие ячейки и хелперы трансляции Z80 -> i8080 (ядро из публичных kvalley-v06c / knightlore-v06c).
; Ячейки — по фиксированным адресам нулевой страницы (этап 1: сверка логики).

IL_BASE	EQU 0x0060
il_tmp	EQU IL_BASE+0
il_tmp2	EQU IL_BASE+2
il_a	EQU IL_BASE+4
z80_ix	EQU IL_BASE+5
z80_iy	EQU IL_BASE+7
z80_af_alt	EQU IL_BASE+9
z80_bc_alt	EQU IL_BASE+11
z80_de_alt	EQU IL_BASE+13
z80_hl_alt	EQU IL_BASE+15
il_outstub	EQU IL_BASE+17

vec_ldir_fwd:
            ex   (sp),hl
            ld   (il_tmp2),hl
            pop  hl
            call vl_saveaf
vlf_lp:     ld   a,(hl)
            ld   (de),a
            inc  hl
            inc  de
            dec  bc
            ld   a,b
            or   c
            jp   nz,vlf_lp
            call vl_loadaf
            push hl
            ld   hl,(il_tmp2)
            ex   (sp),hl
            ret

; AF -> il_tmp и обратно; HL и прочие регистры не трогаются. il_tmp во
; время ldir свободен: транслятор держит в нём значение только ВНУТРИ одной
; команды, через call не проносит (il_tmp2 занят адресом возврата, поэтому
; он не годится). Своих двух байт в карте нет — она плотная от $78bb до
; $7E28, дальше стек. Хранить AF в самом коде тоже нельзя: гейт «ядро цело»
; в test_boot справедливо считает это порчей ядра.
; Обмен идёт через вершину стека, адрес возврата лежит ниже и не задевается.
vl_saveaf:  push af
            ex   (sp),hl        ; HL = AF, на вершине — старый HL
            ld   (il_tmp),hl
            pop  hl
            ret

vl_loadaf:  push hl
            ld   hl,(il_tmp)
            ex   (sp),hl        ; на вершине AF, HL = старый HL
            pop  af
            ret


vec_ldir_bwd:
            ex   (sp),hl
            ld   (il_tmp2),hl
            pop  hl
            call vl_saveaf      ; lddr, как и ldir, A не трогает
vlb_lp:     ld   a,(hl)
            ld   (de),a
            dec  hl
            dec  de
            dec  bc
            ld   a,b
            or   c
            jp   nz,vlb_lp
            call vl_loadaf
            push hl
            ld   hl,(il_tmp2)
            ex   (sp),hl
            ret
