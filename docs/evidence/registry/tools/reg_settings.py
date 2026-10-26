import sys
from Registry import Registry
reg = Registry.Registry(sys.argv[1])
root = reg.open('Microsoft\\Settings')
info = {}
for g in root.subkeys():
    vals = {}
    for v in g.values():
        try: vals[v.name()] = v.value()
        except Exception: pass
    info[g.name().upper()] = vals
def title(guid):
    v = info.get(guid.upper(), {})
    for k in ('Title', 'DisplayName', 'Name', 'TitleResource'):
        if k in v: return str(v[k])
    return '?' + ','.join(f'{a}={b}' for a, b in list(v.items())[:4])
for g in root.subkeys():
    try: si = g.subkey('SecureItems')
    except Exception: continue
    items = sorted(((v.value(), v.name()) for v in si.values()))
    print('##', g.name(), title(g.name()))
    for order, guid in items:
        print(f'  {order:4} {guid} {title(guid)}')
