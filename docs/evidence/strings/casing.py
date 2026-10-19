#!/usr/bin/env python3
"""Prints whole entries from the en-US string tables (RT_STRING) of the
emulator image's .mui files that match a few patterns, so the casing and
wording of the phone's own text can be checked. Each line is the file, the
string ID and the string. Run from the unpacked image's mainos/ folder:
  python3 casing.py > casing.txt
"""
import re
import struct
import sys
from pathlib import Path

DIRS = [
    'Programs/MEDIA/en-us', 'Programs/DATASMART/en-us', 'Programs/COMMSAPPLICATIONS/en-us',
    'Programs/OFFICE/en-us', 'Programs/PHOTOS/en-us', 'Windows/System32/EN-US',
]

APPS = 'CalendarRes|ContactsRes|MessagingRes|OnmUiRes|PhoneRes|PhotoRes'

# (heading, pattern, files to search: a regex on the path, or None for all)
PATTERNS = [
    ('names', r'^(music\+videos|data sense)$', None),
    ('app and page titles', r'^(phone|calendar|appointment|to-do|(new|edit) (appointment|to-do))$', 'CalendarRes|PhoneRes'),
    ('confirmation titles', r'^delete[^.]*\?$|^delete (appointment|call history|voicemails?)$', None),
    ('confirmation text', r'will be deleted|entire call history', APPS),
    ('attach', r"can.t attach", None),
    ('empty states and placeholders', r'^no (completed )?(appointments|to-dos)$|^untitled page$', APPS),
    ('relative days', r'^(today|tomorrow|yesterday)$', None),
]

RT_STRING = 6


def string_tables(data):
    """Yields (id, text) for every RT_STRING entry in a PE file."""
    pe = struct.unpack_from('<I', data, 0x3C)[0]
    if data[pe:pe + 4] != b'PE\0\0':
        return
    sections, opt_size = struct.unpack_from('<H', data, pe + 6)[0], struct.unpack_from('<H', data, pe + 20)[0]
    opt = pe + 24
    magic = struct.unpack_from('<H', data, opt)[0]
    dirs = opt + (96 if magic == 0x10B else 112)
    rsrc_rva = struct.unpack_from('<I', data, dirs + 2 * 8)[0]
    if not rsrc_rva:
        return
    table = opt + opt_size

    def offset(rva):
        for i in range(sections):
            s = table + 40 * i
            vsize, va, raw_size, raw = struct.unpack_from('<IIII', data, s + 8)
            if va <= rva < va + max(vsize, raw_size):
                return raw + rva - va
        raise ValueError(hex(rva))

    base = offset(rsrc_rva)

    def entries(at):
        named, ids = struct.unpack_from('<HH', data, base + at + 12)
        for i in range(named + ids):
            name, target = struct.unpack_from('<II', data, base + at + 16 + 8 * i)
            yield name, target

    for kind, sub in entries(0):
        if kind != RT_STRING or not sub & 0x80000000:
            continue
        for block, lang_dir in entries(sub & 0x7FFFFFFF):
            for _, leaf in entries(lang_dir & 0x7FFFFFFF):
                rva, size = struct.unpack_from('<II', data, base + leaf)
                at, end = offset(rva), offset(rva) + size
                for i in range(16):
                    if at >= end:
                        break
                    n = struct.unpack_from('<H', data, at)[0]
                    if n:
                        yield (block - 1) * 16 + i, data[at + 2:at + 2 + 2 * n].decode('utf-16le').rstrip('\0')
                    at += 2 + 2 * n


def main():
    rows = []
    for d in DIRS:
        for f in sorted(Path(d).glob('*.mui')):
            try:
                for sid, s in string_tables(f.read_bytes()):
                    rows.append((str(f), sid, s))
            except (struct.error, ValueError) as e:
                print(f'# skipped {f}: {e}', file=sys.stderr)
    for title, pattern, files in PATTERNS:
        print(f'== {title}: /{pattern}/i')
        rx = re.compile(pattern, re.I)
        for f, sid, s in rows:
            if (files is None or re.search(files, f)) and rx.search(s):
                print(f'{f} #{sid}: {s!r}')


main()
