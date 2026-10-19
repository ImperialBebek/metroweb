#!/bin/sh
# Prints how the phone's own en-US string tables case a few names and
# confirmations. Run from the unpacked image's mainos/ folder:
#   sh casing.sh > casing.txt
set -e
for p in 'music\+videos' 'data sense' 'delete[^?.\x00\r\n]{0,40}\?' 'delete appointment' "can.t attach" 'tomorrow' 'yesterday'; do
  printf '== %s\n' "$p"
  rg -a -o -i --encoding utf-16le "$p" \
    Programs/MEDIA/en-us Programs/DATASMART/en-us Programs/COMMSAPPLICATIONS/en-us \
    Programs/OFFICE/en-us Programs/PHOTOS/en-us Windows/System32/EN-US 2>/dev/null \
    | sort | uniq -c | sort -rn || true
done
