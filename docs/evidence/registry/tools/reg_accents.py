import sys
from Registry import Registry
def walk(hive, label):
    reg = Registry.Registry(hive)
    hits = []
    def rec(k, path):
        try: vals = k.values()
        except Exception: vals = []
        for v in vals:
            n = v.name()
            if 'Accent' in n or 'Accent' in path and 'Theme' in path or n in ('DefaultTheme', 'CurrentTheme'):
                try: val = v.value()
                except Exception: val = '?'
                if isinstance(val, bytes): val = val.hex()
                if isinstance(val, int): val = f'{val:#010x}'
                hits.append(f'{path}\\{n} = {val}')
        try: subs = k.subkeys()
        except Exception: subs = []
        for s in subs:
            rec(s, path + '\\' + s.name())
    rec(reg.root(), '')
    print(f'### {label}: {len(hits)} values')
    print('\n'.join(hits))
walk(sys.argv[1], sys.argv[2])
