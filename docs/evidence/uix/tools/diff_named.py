"""Compare two named.py dumps (for example WP8.0 and WP8.1) and list what changed.

usage: diff_named.py <old.tsv> <new.tsv> <out.tsv>
Prints a per-module summary to stdout and writes one row per changed, removed or added
name to <out.tsv>: module, change, name, old values, new values. Only the 480x800 asset
modules count; s20/s30 variants, unnamed slots and computed values are skipped.
"""
import csv, re, collections, sys

def load(path):
    d = collections.defaultdict(set)
    for row in csv.reader(open(path), delimiter='\t'):
        if len(row) < 9: continue
        mod, f, owner, slot, name, typ, val, off, src = row[:9]
        m = re.search(r'(\d+x\d+)$', mod)
        if m and m.group(1) != '480x800': continue
        if 's20' in owner or 's30' in owner: continue
        if src not in ('const', 'code', 'compact'): continue
        if name.startswith('slot') or name.startswith('?'): continue
        if val.startswith(('new ', 'lookup', 'op16', 'pushNull', 'typeof')): val = '<expr>'
        d[(mod, f, name)].add(val)
    return d

a, b = load(sys.argv[1]), load(sys.argv[2])
mods = sorted({k[0] for k in a} | {k[0] for k in b})
out = open(sys.argv[3], 'w')
print('module\tin_old\tin_new\tcommon\tremoved\tadded\tchanged')
for m in mods:
    # match by (module, name), ignoring the file, so values that moved between files still pair up
    na = {k[2]: a[k] for k in a if k[0] == m}; nb = {k[2]: b[k] for k in b if k[0] == m}
    com = set(na) & set(nb); ch = [n for n in com if na[n] != nb[n] and '<expr>' not in na[n] | nb[n]]
    print(m, len(na), len(nb), len(com), len(set(na) - set(nb)), len(set(nb) - set(na)), len(ch), sep='\t')
    for n in sorted(ch): out.write(f"{m}\tchanged\t{n}\t{'|'.join(sorted(na[n]))}\t{'|'.join(sorted(nb[n]))}\n")
    for n in sorted(set(na) - set(nb)): out.write(f"{m}\tremoved\t{n}\t{'|'.join(sorted(na[n]))}\t\n")
    for n in sorted(set(nb) - set(na)): out.write(f"{m}\tadded\t{n}\t\t{'|'.join(sorted(nb[n]))}\n")
