"""Reader for Windows Phone 8.0/8.1 compiled UIX markup (UIB format).

Format notes (inferred; differs from the desktop Iris/Zune UIB v1012):
  header: 'UIB\x1a', u32 version (0x4cb = WP8.0, 0x4f6 = WP8.1), u8 kind (1 = shared
  _DATATABLE.UIB, 0 = markup file), u32 objectStart, u32 objectEnd, u32 (lineTable / flags),
  string uri of shared data table (u16 len, 0x8000 = 8-bit chars, 0xffff = null).
  data table only: u32 offset of string table, u16 dependency count + i32 string per dep,
  3 x u16 (zero), u16 type-import count + per type (u16 dep, then u16 intrinsic id if
  dep == 0xfffe else i32 name string), ..., u32 property-import count + (u16 type, i32 name),
  u32 size + u16 method count + u32 offsets (relative to the count) + records, ...,
  constants: u16 count + count+1 u32 offsets + records (u16 type import, u8 persist mode, body).
"""
import struct, os, re, math

HERE = os.path.dirname(os.path.abspath(__file__))

def load_intrinsics(ver):
    # The intrinsic type names come from uixmobile.dll, so the lists stay in the private
    # evidence (made by intrinsics.py); UIB_INTRINSICS can point at another folder.
    fn = {0x4cb: 'intrinsics80.txt', 0x4f6: 'intrinsics81.txt'}[ver]
    dirs = [os.environ.get('UIB_INTRINSICS', ''), HERE, os.path.join(HERE, '..', '..', 'private', 'uix', 'wp81')]
    path = next((os.path.join(p, fn) for p in dirs if p and os.path.exists(os.path.join(p, fn))), None)
    if path is None: raise FileNotFoundError('%s not found; run intrinsics.py or set UIB_INTRINSICS' % fn)
    out = {}
    for l in open(path).read().splitlines():
        if not l.strip(): continue
        k, _, n = l.split('\t'); out[int(k)] = n
    return out

class R:
    def __init__(s, d, o=0): s.d = d; s.o = o
    def u8(s): v = s.d[s.o]; s.o += 1; return v
    def u16(s): v = struct.unpack_from('<H', s.d, s.o)[0]; s.o += 2; return v
    def u32(s): v = struct.unpack_from('<I', s.d, s.o)[0]; s.o += 4; return v
    def i32(s): v = struct.unpack_from('<i', s.d, s.o)[0]; s.o += 4; return v
    def f32(s): v = struct.unpack_from('<f', s.d, s.o)[0]; s.o += 4; return v
    def str(s):
        n = s.u16()
        if n == 0xffff: return None
        if n & 0x8000:
            n &= 0x7fff; v = s.d[s.o:s.o+n].decode('latin1'); s.o += n
        else:
            v = s.d[s.o:s.o+2*n].decode('utf-16-le'); s.o += 2*n
        return v

def read_strings(d, off):
    r = R(d, off); r.u32(); n = r.i32(); base = r.o
    offs = [r.u32() for _ in range(n + 1)]
    return [R(d, base + offs[k]).str() for k in range(n)]

class DataTable:
    def __init__(self, path):
        self.path = path
        d = self.d = open(path, 'rb').read()
        r = R(d)
        assert r.u32() == 0x1a424955, 'not UIB'
        self.ver = r.u32(); self.kind = r.u8()
        assert self.kind == 1, 'not a data table'
        r.u32(); r.u32(); r.u32()
        assert r.str() is None
        self.strings = S = read_strings(d, r.u32())
        self.deps = [S[r.i32()] for _ in range(r.u16())]
        r.u16(); r.u16(); r.u16()
        intr = load_intrinsics(self.ver)
        self.types = []
        for _ in range(r.u16()):
            dep = r.u16()
            if dep == 0xfffe:
                i = r.u16(); self.types.append(intr.get(i, 'intrinsic#%d' % i))
            else:
                nm = S[r.i32()]
                src = self.deps[dep] if dep < len(self.deps) else ('self' if dep == 0xfffd else '?')
                self.types.append('%s@%s' % (nm, src.split('!')[-1].replace('.uix', '') if src else src))
        self.after_types = r.o
        self._find_props()
        self._find_consts()

    def _find_props(self):
        d = self.d; nt = len(self.types); ns = len(self.strings)
        for p in range(self.after_types, len(d) - 10):
            n = struct.unpack_from('<I', d, p)[0]
            if not (1 <= n < 5000): continue
            q = p + 4; ok = True
            for k in range(n):
                if q + 6 > len(d): ok = False; break
                t, s = struct.unpack_from('<Hi', d, q)
                if t >= nt or not (0 <= s < ns): ok = False; break
                q += 6
            if not ok: continue
            # method table must follow: u32 size, u16 count, first offset == 2 + 4*count
            size, mc = struct.unpack_from('<IH', d, q)
            if mc and struct.unpack_from('<I', d, q + 6)[0] != 2 + 4 * mc: continue
            self.props = []
            r = R(d, p + 4)
            for k in range(n):
                t = r.u16(); s = r.i32(); self.props.append((t, self.strings[s]))
            self.props_at = p
            self.methods = []
            base = q + 4
            offs = [struct.unpack_from('<I', d, base + 2 + 4 * k)[0] for k in range(mc)]
            for k in range(mc):
                rr = R(d, base + offs[k]); owner = rr.u16(); virt = rr.u8(); nm = rr.i32()
                np_ = rr.u16(); params = [rr.u16() for _ in range(np_)]
                self.methods.append((owner, self.strings[nm] if 0 <= nm < ns else '#%d' % nm, params, virt))
            self.methods_end = q + 4 + size
            return
        self.props = []; self.methods = []; self.props_at = None; self.methods_end = self.after_types

    def _find_consts(self):
        d = self.d
        for i in range(self.methods_end, len(d) - 10):
            n = struct.unpack_from('<H', d, i)[0]
            if n < 1 or i + 2 + (n + 1) * 4 > len(d): continue
            if struct.unpack_from('<I', d, i + 2)[0] != (n + 1) * 4: continue
            offs = struct.unpack_from('<%dI' % (n + 1), d, i + 2)
            if all(0 < offs[k + 1] - offs[k] < 400 for k in range(n)):
                base = i + 2
                self.consts_at = i
                self.consts = []
                for k in range(n):
                    rec = d[base + offs[k]: base + offs[k + 1]]
                    t = struct.unpack_from('<H', rec, 0)[0]
                    self.consts.append((t, rec[2], rec[3:], base + offs[k]))
                return
        self.consts = []; self.consts_at = None

    def tname(self, t):
        return self.types[t] if 0 <= t < len(self.types) else 'type#%d' % t

    def cval(self, k):
        t, mode, b, at = self.consts[k]
        tn = self.tname(t)
        if mode in (1, 2):
            s = struct.unpack_from('<i', b)[0]
            return '%s(%s%r)' % (tn, 'canonical ' if mode == 2 else '', self.strings[s] if 0 <= s < len(self.strings) else s)
        return decode_binary(tn, b, self.strings)

INTERP_NAMES = {}
def decode_binary(tn, b, S):
    base = tn.split('@')[0]
    try:
        if base == 'Single': return '%.6g' % struct.unpack('<f', b[:4])[0]
        if base in ('Int32',): return '%d' % struct.unpack('<i', b[:4])[0]
        if base == 'Int64': return '%d' % struct.unpack('<q', b[:8])[0]
        if base == 'Double': return '%.9g' % struct.unpack('<d', b[:8])[0]
        if base == 'Boolean': return 'true' if b[0] else 'false'
        if base == 'Byte': return '%d' % b[0]
        if base == 'String':
            s = struct.unpack_from('<i', b)[0]; return repr(S[s]) if 0 <= s < len(S) else 'str#%d' % s
        if base == 'Vector3' and len(b) >= 12: return 'Vector3(%g, %g, %g)' % struct.unpack('<3f', b[:12])
        if base == 'Vector2' and len(b) >= 8: return 'Vector2(%g, %g)' % struct.unpack('<2f', b[:8])
        if base == 'Rotation' and len(b) >= 16:
            x, y, z, a = struct.unpack('<4f', b[:16]); return 'Rotation(%.6gdeg; axis %g,%g,%g)' % (math.degrees(a), x, y, z)
        if base in ('Inset',) and len(b) >= 16: return 'Inset(%d, %d, %d, %d)' % struct.unpack('<4i', b[:16])
        if base in ('Size', 'Point') and len(b) >= 8: return '%s(%d, %d)' % ((base,) + struct.unpack('<2i', b[:8]))
        if base == 'MajorMinor' and len(b) >= 8: return 'MajorMinor(%d, %d)' % struct.unpack('<2i', b[:8])
        if base == 'Color' and len(b) >= 4: return 'Color(#%08x)' % struct.unpack('<I', b[:4])[0]
        if base == 'TimeSpan' and len(b) >= 8: return 'TimeSpan(%dticks)' % struct.unpack('<q', b[:8])[0]
        if base.endswith('Interpolation') and len(b) >= 8:
            k, w = struct.unpack('<if', b[:8]); rest = b[8:]
            extra = ',' + ','.join('%g' % x for x in struct.unpack('<%df' % (len(rest)//4), rest[:len(rest)//4*4])) if len(rest) >= 4 else ''
            return '%s(kind=%d, weight=%g%s)' % (base, k, w, extra)
    except Exception as e:
        return '%s:%s' % (tn, b.hex())
    if len(b) == 4:
        return '%s(%d)' % (tn, struct.unpack('<i', b)[0])
    return '%s:%s' % (tn, b.hex())

# opcode table (operand byte sizes), recovered from the uixn.dll interpreter (8.1) and
# checked by linear sweep: every object section of every 8.0 and 8.1 file decodes exactly.
OPS = {
 0x01: ('new', 'T'), 0x02: ('newIndirect', 'T'), 0x03: ('newParam', 'TTb'), 0x04: ('fromString', 'Ts'),
 0x05: ('fromBinary', 'T?'), 0x06: ('initInstance', 'T'), 0x07: ('initInstanceIndirect', ''),
 0x08: ('lookup', 'y'), 0x09: ('write', 'y'), 0x0a: ('writePeek', 'y'), 0x0b: ('storeSlot', 'h'),
 0x0c: ('propInit', 'P'), 0x0d: ('propInitIndirect', 'P'), 0x0e: ('listAdd', 'P'), 0x0f: ('dictAdd', 'Ps'),
 0x10: ('propAssign', 'P'), 0x11: ('propAssignStatic', 'P'), 0x12: ('op12', 'P'), 0x13: ('op13', 'P'),
 0x14: ('propGet', 'P'), 0x15: ('op15', 'P'), 0x16: ('op16', 'P'), 0x17: ('op17', 'hhh'),
 0x18: ('call', 'Mb'), 0x19: ('callPeek', 'Mb'), 0x1a: ('callStatic', 'Mb'), 0x1b: ('callPushLast', 'Mb'),
 0x1c: ('callStaticPushLast', 'Mb'), 0x1d: ('verifyCast', 'T'), 0x1e: ('op1e', 'T'), 0x1f: ('convert', 'TT'),
 0x20: ('operation', 'Tb'), 0x21: ('is', 'T'), 0x22: ('as', 'T'), 0x23: ('typeof', 'T'), 0x24: ('pushNull', ''),
 0x25: ('pushConst', 'C'), 0x26: ('pushThis', ''), 0x27: ('discard', ''), 0x28: ('return', ''), 0x29: ('returnVoid', ''),
 0x2a: ('jmpIfFalse', 'J'), 0x2b: ('jmpIfFalsePeek', 'J'), 0x2c: ('jmpIfTruePeek', 'J'), 0x2d: ('op2d', 'J'),
 0x2e: ('jmpIfSlot', 'hJ'), 0x2f: ('jmpIfNullPeek', 'J'), 0x30: ('jmp', 'J'), 0x31: ('listenerStorage', 'h'),
 0x32: ('listen', 'L'), 0x33: ('op33', 'hh'), 0x34: ('destructiveListen', 'D'), 0x35: ('debugState', 'i'),
 0x36: ('op36', 'h'), 0x37: ('op37', 'h'), 0x38: ('op38', 'bi'), 0x39: ('op39', 'i'), 0x3a: ('op3a', ''),
 0x3b: ('op3b', 'hh'), 0x3c: ('op3c', 'hh'),
}

def disasm(d, start, end, dt=None):
    i = start
    while i < end:
        op = d[i]; name, fmt = OPS[op]; j = i + 1; args = []
        for f in fmt:
            if f in 'TPMCyhs':
                v = struct.unpack_from('<H', d, j)[0]; j += 2
                if dt is not None:
                    if f == 'T': args.append(dt.tname(v))
                    elif f == 'P': args.append(('%s.%s' % (dt.tname(dt.props[v][0]).split('@')[0], dt.props[v][1])) if v < len(dt.props) else 'prop#%d' % v)
                    elif f == 'M': args.append(('%s.%s' % (dt.tname(dt.methods[v][0]).split('@')[0], dt.methods[v][1])) if v < len(dt.methods) else 'meth#%d' % v)
                    elif f == 'C': args.append(dt.cval(v) if v < len(dt.consts) else 'const#%d' % v)
                    elif f == 's': args.append(repr(dt.strings[v]) if v < len(dt.strings) else 'str#%d' % v)
                    else: args.append('%s%d' % ({'y': 'sym', 'h': '#'}[f], v))
                else: args.append(str(v))
            elif f == 'b': args.append(str(d[j])); j += 1
            elif f in 'Ji': args.append('@%x' % struct.unpack_from('<I', d, j)[0] if f == 'J' else str(struct.unpack_from('<i', d, j)[0])); j += 4
            elif f == 'L' or f == 'D':
                li, lt, wi, ho = struct.unpack_from('<HBHI', d, j); j += 9
                a = 'listener%d type%d watch%d handler@%x' % (li, lt, wi, ho)
                if f == 'D': a += ' refresh@%x' % struct.unpack_from('<I', d, j)[0]; j += 4
                if lt == 3: a += ' t=%d' % struct.unpack_from('<H', d, j)[0]; j += 2
                args.append(a)
            elif f == '?': raise ValueError('fromBinary at %x' % i)
        yield i, op, name, args
        i = j

def symbol_tables(d, end, dt):
    """Inheritable symbol tables: u32 size, u32 n, n x (i32 name, u8 origin, u16 type, u16 slot, u16 ?)."""
    ns, nt = len(dt.strings), len(dt.types); out = []
    for p in range(0, end - 8):
        size, n = struct.unpack_from('<II', d, p)
        if not (1 <= n < 2000) or size != 4 + 11 * n or p + 4 + size > end: continue
        recs = []; ok = True
        for k in range(n):
            nm, org, ty, slot, x = struct.unpack_from('<iBHHH', d, p + 8 + 11 * k)
            if not (0 <= nm < ns) or ty >= nt or org > 8: ok = False; break
            recs.append((dt.strings[nm], org, dt.tname(ty), slot))
        if ok: out.append((p, recs))
    return out

def init_runs(d, start, end, dt):
    """Lazy slot initialisers: jmpIfSlot #s,@t ... storeSlot #s (block ends at t)."""
    ins = list(disasm(d, start, end, dt)); idx = {a: k for k, (a, _, _, _) in enumerate(ins)}
    blocks = []
    for k, (a, op, nm, args) in enumerate(ins):
        if op != 0x2e: continue
        slot = int(args[0][1:]); tgt = start + int(args[1][1:], 16)
        if tgt not in idx: continue
        j = idx[tgt]
        if j - 1 > k and ins[j - 1][1] == 0x0b and ins[j - 1][3][0] == '#%d' % slot:
            blocks.append((a, slot, ins[k + 1:j - 1], tgt))
    runs = []
    for b in blocks:
        if runs and runs[-1][-1][3] == b[0]: runs[-1].append(b)
        else: runs.append([b])
    return runs

RENDER_MAX = 12
def render_block(body):
    if len(body) == 1 and body[0][1] == 0x25: return body[0][3][0]
    return ' ; '.join(('%s %s' % (n, ', '.join(a))).strip() for _, _, n, a in body[:RENDER_MAX]) + (' ; ...' if len(body) > RENDER_MAX else '')

def const_default_table(d, symtab_at, n, nconsts, objlen, window=0x1000):
    """WP8.1 per-class slot initialiser table, shortly before the symbol table:
    u32 n + n x u32 where 0xffffffff = none, 0x80000000|off = initialiser function at
    objectStart+off (runs to its 'return'), otherwise a constant-table index."""
    best = None
    ok = lambda v: v == 0xffffffff or v < nconsts or (v & 0x80000000 and (v & 0x7fffffff) < objlen)
    for p in range(symtab_at - 4 - 4 * n, max(0, symtab_at - window), -1):
        if struct.unpack_from('<I', d, p)[0] != n: continue
        vals = struct.unpack_from('<%dI' % n, d, p + 4)
        if all(ok(v) for v in vals) and any(v != 0xffffffff for v in vals):
            best = (p, vals); break
    return best

def render_function(d, start, end, dt):
    body = []
    for ins in disasm(d, start, end, dt):
        if ins[1] == 0x28: break
        body.append(ins)
    return render_block(body)

def class_defaults(d, dt):
    ver, kind, a, b, c, uri, _ = markup_header(d)
    tabs = symbol_tables(d, a, dt); runs = init_runs(d, a, b, dt)
    res = []
    assigned = {}
    for run in runs:
        rel = run[0][0] - a; pat = struct.pack('<I', rel); refs = []
        p = d.find(pat)
        while p != -1 and p < a: refs.append(p); p = d.find(pat, p + 1)
        tab = None
        for r in refs:
            cand = [t for t in tabs if t[0] > r]
            if cand: tab = min(cand, key=lambda t: t[0]); break
        assigned.setdefault(tab[0] if tab else None, []).append(run)
    for tab in tabs + [None]:
        key = tab[0] if tab else None
        names = {}
        if tab:
            for nm, org, ty, slot in tab[1]: names.setdefault(slot, (nm, ty))
        owner = None
        if tab:
            nset = set(n for n, _, _, _ in tab[1]); best = 0
            for ti in set(t for t, _ in dt.props):
                cnt = sum(1 for t, s in dt.props if t == ti and s in nset)
                if cnt > best: best = cnt; owner = dt.tname(ti)
        entries = []
        if tab and ver >= 0x4f6:
            cd = const_default_table(d, tab[0], len(tab[1]), len(dt.consts), b - a)
            if cd:
                for slot, ci in enumerate(cd[1]):
                    if ci == 0xffffffff: continue
                    if ci & 0x80000000:
                        entries.append((a + (ci & 0x7fffffff), slot, 'func', render_function(d, a + (ci & 0x7fffffff), b, dt)))
                    else:
                        entries.append((cd[0] + 4 + 4 * slot, slot, 'const', dt.cval(ci)))
        for run in assigned.get(key, []):
            for at, slot, body, tgt in run:
                entries.append((at, slot, 'code', render_block(body)))
        if entries or (tab is None and key in assigned):
            entries.sort(key=lambda x: x[1])
            res.append((key, names, owner, entries))
    return res

def compact_class(d):
    """WP8.1 resolution asset classes (e.g. UIXMobileAssets*!Constants.uix) carry no bytecode.
    One file can hold several such blocks (one per exported class).
    Header: u32 ?, u32 variantTable, u32 namesStart, u32 valueBase, u32 count;
    count x u16 intrinsic type id (optionally followed by 'JJ'); per variant a count x u16
    offset array (relative to valueBase); variant table = u16 nv + nv x (u32 nameOffset,
    u32 offsetArrayPos) with variant names ('720x1280', '720x1280s20', ...) stored as values;
    then count length-prefixed property names in declaration order.
    Returns [(variantName, [(name, type, value, fileOffset)])] or None."""
    ver = struct.unpack_from('<I', d, 4)[0]; intr = load_intrinsics(ver)
    objstart = struct.unpack_from('<I', d, 9)[0]
    out = []; p = 0x40; nblock = 0
    while p < min(len(d), objstart) - 21:
        p += 1
        a, vt, nstart, base, n = struct.unpack_from('<5I', d, p + 1)
        if not (0 < n < 20000) or not (p < vt < base < nstart <= len(d)) or a > len(d): continue
        nv = struct.unpack_from('<H', d, vt)[0]
        if not (1 <= nv < 16) or vt + 2 + 8 * nv != base: continue
        variants = [struct.unpack_from('<II', d, vt + 2 + 8 * k) for k in range(nv)]
        off0 = variants[0][1]
        tstart = off0 - 2 * n - (2 if d[off0 - 2:off0] == b'JJ' else 0)
        if tstart < p + 21 or tstart > vt: continue
        types = struct.unpack_from('<%dH' % n, d, tstart)
        r = R(d, nstart); names = [r.str() for _ in range(n)]
        for vname_off, opos in variants:
            vname = R(d, base + vname_off).str()
            offs = struct.unpack_from('<%dH' % n, d, opos)
            rows = []
            for k in range(n):
                tn = intr.get(types[k], 'intrinsic#%d' % types[k]); o = base + offs[k]
                if tn == 'String': v = repr(R(d, o).str())
                else:
                    size = {'Inset': 16, 'Size': 8, 'Point': 8, 'Vector2': 8, 'Vector3': 12, 'Vector4': 16,
                            'Rotation': 16, 'Single': 4, 'Int32': 4, 'Boolean': 1, 'Color': 4, 'Byte': 1,
                            'Double': 8, 'Int64': 8, 'MajorMinor': 8}.get(tn, 16)
                    v = decode_binary(tn, d[o:o + size], [])
                rows.append((names[k], tn, v, o))
            out.append(('b%d:%s' % (nblock, vname), rows))
        nblock += 1
        p = max(p, vt)
    return out or None

def anim_blocks(d, dt):
    """Render every object-construction chain that starts with 'new <...Animation>'."""
    ver, kind, a, b, c, uri, _ = markup_header(d)
    ins = list(disasm(d, a, b, dt)); out = []; k = 0
    while k < len(ins):
        at, op, nm, args = ins[k]
        if op == 0x01 and args[0].split('@')[0].endswith('Animation'):
            lines = []; val = None; depth = 0; j = k
            while j < len(ins):
                at2, op2, nm2, a2 = ins[j]
                if op2 == 0x01:
                    lines.append('  ' * (depth + 1) + 'new ' + a2[0].split('@')[0]); depth += 1
                elif op2 == 0x25: val = a2[0]
                elif op2 == 0x08: val = 'sym:' + a2[0]
                elif op2 in (0x14, 0x16): val = (val + ' -> ' if val else '') + a2[0]
                elif op2 == 0x0c:
                    lines.append('  ' * (depth + 1) + '.%s = %s' % (a2[0].split('.')[-1], val)); val = None
                elif op2 == 0x0e:
                    depth = max(depth - 1, 1); lines.append('  ' * (depth + 1) + '-> %s' % a2[0].split('.')[-1])
                else: break
                j += 1
            out.append((at, ins[j][0] if j < len(ins) else b, lines)); k = j
        else: k += 1
    return out

def markup_header(d):
    r = R(d); assert r.u32() == 0x1a424955
    ver = r.u32(); kind = r.u8(); a = r.u32(); b = r.u32(); c = r.u32(); uri = r.str()
    return ver, kind, a, b, c, uri, r.o

if __name__ == '__main__':
    import sys
    cmd = sys.argv[1]
    if cmd == 'strings':
        dt = DataTable(sys.argv[2])
        for k, s in enumerate(dt.strings): print('%d\t%r' % (k, s))
    elif cmd == 'types':
        dt = DataTable(sys.argv[2])
        for k, s in enumerate(dt.types): print('%x\t%s' % (k, s))
    elif cmd == 'props':
        dt = DataTable(sys.argv[2])
        for k, (t, s) in enumerate(dt.props): print('%x\t%x\t%s\t%s' % (k, t, dt.tname(t), s))
    elif cmd == 'methods':
        dt = DataTable(sys.argv[2])
        for k, (o, s, p, v) in enumerate(dt.methods): print('%x\t%s.%s(%s)%s' % (k, dt.tname(o), s, ','.join(dt.tname(x) for x in p), ' virtual' if v else ''))
    elif cmd == 'consts':
        dt = DataTable(sys.argv[2])
        print('table at %#x count %d' % (dt.consts_at, len(dt.consts)))
        for k, (t, m, b, at) in enumerate(dt.consts):
            print('%d\t@%x\t%s\tm=%d\t%s\t%s' % (k, at, dt.tname(t), m, b.hex(), dt.cval(k)))
    elif cmd == 'defaults':
        dt = DataTable(sys.argv[2])
        for f in sys.argv[3:]:
            d = open(f, 'rb').read()
            print('===== %s' % os.path.basename(f))
            for tabat, names, owner, entries in class_defaults(d, dt):
                print('-- symtab @%s  owner %s' % ('%x' % tabat if tabat is not None else '?', owner))
                for at, slot, src, val in entries:
                    nm, ty = names.get(slot, ('slot%d' % slot, '?'))
                    print('  @%06x  #%-3d %-40s %-22s %-5s = %s' % (at, slot, nm, ty.split('@')[0], src, val))
    elif cmd == 'compact':
        for f in sys.argv[2:]:
            res = compact_class(open(f, 'rb').read())
            print('===== %s  %s' % (f, 'no compact class' if res is None else '%d variants' % len(res)))
            for vname, rows in res or []:
                for k, (nm, tn, v, o) in enumerate(rows):
                    print('%s\t%d\t@%x\t%s\t%s\t%s' % (vname, k, o, nm, tn, v))
    elif cmd == 'anims':
        dt = DataTable(sys.argv[2])
        for f in sys.argv[3:]:
            print('===== %s' % os.path.splitext(os.path.basename(f))[0])
            for at, end, lines in anim_blocks(open(f, 'rb').read(), dt):
                print('@%x-%x' % (at, end)); print('\n'.join(lines))
    elif cmd == 'dis':
        dt = DataTable(sys.argv[2])
        for f in sys.argv[3:]:
            d = open(f, 'rb').read(); ver, kind, a, b, c, uri, _ = markup_header(d)
            print('===== %s  ver=%#x obj=%#x-%#x' % (os.path.basename(f), ver, a, b))
            for i, op, name, args in disasm(d, a, b, dt):
                print('%06x  %02x %-18s %s' % (i, op, name, ', '.join(args)))
