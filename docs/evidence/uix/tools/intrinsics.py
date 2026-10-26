"""Dump the intrinsic UIX type names that uib.py needs, from the 8.0 and 8.1 uixmobile.dll.

usage: intrinsics.py <8.0 uixmobile.dll> <intrinsics80.txt> <8.1 uixmobile.dll> <intrinsics81.txt>
Finds the packed name pool around 'AlphaKeyframeAnchorEdge' and the u16 offset table that
splits it, and writes one 'index<TAB>hex<TAB>name' line per type.
"""import struct,re,sys
def names(path,out):
    d=open(path,'rb').read()
    i=d.find(b'AlphaKeyframeAnchorEdge')
    s=i
    while 32<d[s-1]<127: s-=1
    e=i
    while 32<d[e]<127: e+=1
    pool=d[s:e].decode()
    # find first word length: try candidate offset tables containing 0 followed by increasing values all < len(pool) whose slices start with uppercase
    best=None
    for m in re.finditer(b'\x00\x00',d):
        o=m.start()
        if o%2: continue
        vals=[]; p=o
        while p+2<=len(d):
            v=struct.unpack_from('<H',d,p)[0]
            if vals and (v<=vals[-1] or v>len(pool)): break
            vals.append(v); p+=2
        if len(vals)>200 and all(pool[v].isupper() for v in vals if v<len(pool)):
            best=(o,vals); break
    o,vals=best
    if vals[-1]!=len(pool): vals.append(len(pool))
    nm=[pool[vals[k]:vals[k+1]] for k in range(len(vals)-1)]
    open(out,'w').write('\n'.join(f'{k}\t{hex(k)}\t{n}' for k,n in enumerate(nm))+'\n')
    print(path,'pool@',hex(s),'len',len(pool),'table@',hex(o),'names',len(nm),nm[:3],nm[-3:])
names(sys.argv[1],sys.argv[2]); names(sys.argv[3],sys.argv[4])
