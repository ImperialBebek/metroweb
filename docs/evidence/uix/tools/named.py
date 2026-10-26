"""Emit every named markup value (class property/local default) of a UIX module as TSV.

usage: named.py <module dir containing .rsrc/RCDATA> [...]
columns: module, file, owner@symtab, slot-or-index, name, type, value, file offset, source
(source: code = lazy slot initialiser bytecode, const = 8.1 constant-default table,
compact = 8.1 compact asset value table)
8.0 values come from lazy slot initialisers (jmpIfSlot/storeSlot blocks) in the object
section; WP8.1 resolution asset classes come from the compact value table (no bytecode).
"""
import os, sys, glob
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import uib

def rows(moddir):
    rc = os.path.join(moddir, '.rsrc', 'RCDATA'); mod = os.path.basename(moddir.rstrip('/'))
    dtp = os.path.join(rc, '_DATATABLE.UIB')
    try:
        dt = uib.DataTable(dtp) if os.path.exists(dtp) else None
    except Exception as e:
        dt = None; sys.stderr.write('%s: data table unreadable: %s\n' % (mod, e))
    for f in sorted(glob.glob(os.path.join(rc, '*.UIX'))):
        d = open(f, 'rb').read(); fn = os.path.basename(f)
        comp = uib.compact_class(d)
        if comp:
            for bi, (vname, vrows) in enumerate(comp):
                for k, (nm, tn, v, o) in enumerate(vrows):
                    yield (mod, fn, 'compact:%s' % vname, str(k), nm, tn, v, '%x' % o, 'compact')
            continue
        if dt is None: continue
        try:
            res = uib.class_defaults(d, dt)
        except Exception as e:
            yield (mod, fn, 'ERROR', '', str(e), '', '', ''); continue
        for tabat, names, owner, entries in res:
            for at, slot, src, val in entries:
                nm, ty = names.get(slot, ('slot%d' % slot, '?'))
                yield (mod, fn, '%s@%s' % ((owner or '?').split('@')[0], '%x' % tabat if tabat is not None else '?'),
                       str(slot), nm, ty.split('@')[0], val.replace('\t', ' '), '%x' % at, src)

if __name__ == '__main__':
    for m in sys.argv[1:]:
        for r in rows(m): print('\t'.join(r))
