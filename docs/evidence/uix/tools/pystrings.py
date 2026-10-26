"""ASCII + UTF-16LE strings with file offsets. Usage: pystrings.py FILE [regex] [minlen]"""
import sys, re
path = sys.argv[1]
pat = re.compile(sys.argv[2], re.I) if len(sys.argv) > 2 and sys.argv[2] else None
minlen = int(sys.argv[3]) if len(sys.argv) > 3 else 5
d = open(path, 'rb').read()
out = []
for m in re.finditer(rb'[\x20-\x7e]{%d,}' % minlen, d):
    out.append((m.start(), 'a', m.group().decode()))
for m in re.finditer(rb'(?:[\x20-\x7e]\x00){%d,}' % minlen, d):
    out.append((m.start(), 'u', m.group().decode('utf-16le')))
out.sort()
for off, k, s in out:
    if pat is None or pat.search(s):
        print(f"{off:08x} {k} {s}")
