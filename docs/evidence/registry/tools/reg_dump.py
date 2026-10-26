import sys
from Registry import Registry
reg = Registry.Registry(sys.argv[1])
for path in sys.argv[2:]:
    try:
        k = reg.open(path)
        print('##', path)
        for v in k.values():
            print(' ', v.name(), '=', v.value())
    except Exception as e:
        print('##', path, 'ERR', e)
