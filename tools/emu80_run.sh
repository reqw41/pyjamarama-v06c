#!/bin/sh
# Запуск Pyjamarama в Emu80 (окно): rom/pyjama.r0m на платформе vector, порт MCP 19790. Управление: стрелки/пробел или O/P/M, любая клавиша на заставке.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP=~/projects/emu80v4/Emu80qt-mcp.app/Contents/MacOS
TMP="${TMPDIR:-/tmp}/pyjama_emu80"; mkdir -p "$TMP"
pkill -f "Emu80qt-mcp.*pyjama" 2>/dev/null || true
cp "$ROOT/build/vec/pyjama.r0m" "$TMP/pyjama.r0m"
cd "$APP"
QT_PLUGIN_PATH=/opt/homebrew/share/qt/plugins EMU80_MCP_PORT=19790 nohup ./Emu80qt-mcp --platform vector --run "$TMP/pyjama.r0m" >"$TMP/emu80.log" 2>&1 &
echo "Emu80 запущен: vector pyjama.r0m (MCP порт 19790)"
