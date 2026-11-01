#!/bin/sh
# Негативный тест end.asm: портим нативный код во временной копии, стенд должен покраснеть; затем восстанавливаем и пересобираем.
cd "$(dirname "$0")/.." || exit 1
cp src/vec/end.asm /tmp/end.asm.bak
b(){ (cd src/vec && ~/projects/jetpac-v06c/tools/sjasmplus --nologo --i8080 --sym=../../build/vec/pyjama.sym main.asm >/dev/null 2>&1); }
sed -i.x 's/ld\ta,0x10$/ld\ta,0x11/' src/vec/end.asm; b
echo "порча fw_explode:"; node tools/lockn.js 30 1 Fireworks | grep -c РАСХ
cp /tmp/end.asm.bak src/vec/end.asm
sed -i.x '/^gd5:/,/^Screen_YouLost/ s/add\ta,0x30/add\ta,0x31/' src/vec/end.asm; b
echo "порча цифр процента:"; node tools/lockn.js 30 1 Game_DisplayFinalScore | grep -c РАСХ
cp /tmp/end.asm.bak src/vec/end.asm; rm -f src/vec/end.asm.x; b
echo "восстановлено:"; node tools/lockn.js 30 1 Fireworks,Game_DisplayFinalScore | grep -v покрытие
