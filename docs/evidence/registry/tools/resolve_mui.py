import sys, os, re, pefile
root, listing = sys.argv[1], sys.argv[2]
cache = {}
def find(path):
    d, f = os.path.split(path.strip('\\').replace('\\', '/'))
    base = os.path.join(root, d)
    # case-insensitive walk
    cur = root
    for part in d.split('/'):
        if not part: continue
        try: m = [x for x in os.listdir(cur) if x.lower() == part.lower()]
        except FileNotFoundError: return None
        if not m: return None
        cur = os.path.join(cur, m[0])
    for loc in ('en-us',):
        try: m = [x for x in os.listdir(cur) if x.lower() == loc]
        except FileNotFoundError: return None
        if m:
            p = os.path.join(cur, m[0])
            mm = [x for x in os.listdir(p) if x.lower() == (f + '.mui').lower()]
            if mm: return os.path.join(p, mm[0])
    return None
def strings(path):
    if path in cache: return cache[path]
    out = {}
    try:
        pe = pefile.PE(path, fast_load=True)
        pe.parse_data_directories(directories=[pefile.DIRECTORY_ENTRY['IMAGE_DIRECTORY_ENTRY_RESOURCE']])
        for t in pe.DIRECTORY_ENTRY_RESOURCE.entries:
            if t.id != 6: continue
            for blk in t.directory.entries:
                for lang in blk.directory.entries:
                    data = pe.get_data(lang.data.struct.OffsetToData, lang.data.struct.Size)
                    p = 0; base = (blk.id - 1) * 16
                    for i in range(16):
                        n = int.from_bytes(data[p:p+2], 'little'); p += 2
                        if n: out[base + i] = data[p:p+2*n].decode('utf-16le')
                        p += 2 * n
    except Exception as e:
        out = {}
    cache[path] = out
    return out
for line in open(listing):
    m = re.search(r'@(\\[^,]+),-(\d+)', line)
    if m:
        mui = find(m.group(1)); s = strings(mui).get(int(m.group(2)), '?') if mui else '?nomui'
        line = line.rstrip('\n') + f'  => {s}\n'
    sys.stdout.write(line)
