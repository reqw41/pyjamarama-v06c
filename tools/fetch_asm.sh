#!/bin/sh
# докачка страниц дизассемблирования с Wayback (медленно, с повторами)
cd "$(dirname "$0")/../ref" || exit 1
for pass in 1 2 3; do
  for f in $(cat asm_list.txt); do
    grep -q '</html>' "$f" 2>/dev/null && continue
    curl -sL -m 90 "https://web.archive.org/web/20180901155036/http://www.luny.co.uk/pyjamarama/$f" -o "$f.tmp" && grep -q '</html>' "$f.tmp" && mv "$f.tmp" "$f" || rm -f "$f.tmp"
    sleep 1
  done
done
