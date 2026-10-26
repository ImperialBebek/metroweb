"""Reproduce the uixrender.dll findings in winrt-native.md (8.10.14141 x86).

Usage: python3 uix_probe.py [section]   sections: camera interp kinds all (default all)
Prints short disassembly windows only; nothing is written to disk.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from petool import PE

DLL = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                   '../../mainos/Windows/system32/uixrender.dll')

def camera(s):
    print('## Camera ctor 0x72756 (object 0x160 bytes, allocated by 0x73137)')
    print(s.dump(0x72756, 40, True))
    print('## Camera default init 0x7284c')
    print(s.dump(0x7284c, 30, True))
    print('eye    @0x96f6c', [s.f32(0x96f6c + 4 * i) for i in range(3)])
    print('target @0x98540 (bss, zero-initialised)')
    print('up     @0x96f78', [s.f32(0x96f78 + 4 * i) for i in range(3)])
    print('## Projection/scale build 0x72f5f..0x73050')
    print(s.dump(0x72f5f, 60, False))

def interp(s):
    for name, rva, n in [('ExpCurve helper (w^t-1)/(w-1)', 0x259d8, 20),
                         ('Exp (vt 0xe814)', 0x25998, 20),
                         ('Log (vt 0xe808)', 0x25a20, 20),
                         ('SCurve (vt 0xe7fc)', 0x25a6c, 40),
                         ('Bounce mode wrapper (vt 0xe7b4)', 0x2611a, 70),
                         ('Bounce core', 0x2623a, 100),
                         ('Elastic mode wrapper (vt 0xe7a8)', 0x263b2, 40),
                         ('Elastic core', 0x264a7, 50),
                         ('Elastic factory', 0x20fe9, 40)]:
        print('##', name, hex(rva))
        print(s.dump(rva, n, True))

def kinds(s):
    print('## Interpolation visitor table 0xe4c8..0xe500 (handler -> class vtable)')
    for a in range(0xe4c8, 0xe504, 4):
        print('%#x -> %#x' % (a, s.u32(a) - s.base))
    print('## class vtables: [dtor, eval, ?]')
    for vt in [0xe820, 0xe814, 0xe808, 0xe7fc, 0xe7f0, 0xe7e4, 0xe7d8, 0xe7cc, 0xe7c0, 0xe7b4, 0xe7a8]:
        print('%#x eval=%#x' % (vt, s.u32(vt + 4) - s.base))

if __name__ == '__main__':
    s = PE(DLL); s.imports()
    sec = sys.argv[1] if len(sys.argv) > 1 else 'all'
    for name, fn in [('camera', camera), ('interp', interp), ('kinds', kinds)]:
        if sec in (name, 'all'):
            fn(s)
