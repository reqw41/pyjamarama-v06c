#!/bin/sh
# Пересборка образа: данные, заставка и логотип (art/*.png, если есть), ассемблирование. Печатает размер LOW_END.
set -e
cd "$(dirname "$0")/.."
python3 tools/mkvecdata.py | tail -1
python3 tools/mktitle.py
(cd src/vec && ~/projects/jetpac-v06c/tools/sjasmplus --nologo --i8080 --sym=../../build/vec/pyjama.sym main.asm 2>&1 | grep -v "^Pass\|warning\|include data" || true)
grep -E "^(DATA_END|LOW_END):" build/vec/pyjama.sym
