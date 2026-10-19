import struct,math,sys
consts={}
for line in open('/tmp/wp8-uix/ShellControls_consts.txt').read().splitlines()[1:]:
    p=line.split('\t'); consts[int(p[0])]=(p[2][2:],p[4])
strs=[eval(l.split('\t',1)[1]) for l in open('/tmp/wp8-uix/shell_strings.txt').read().split('\n')]
props={}
for l in open('/tmp/wp8-uix/shell_props.txt').read().split('\n'):
    k,t,s=l.split('\t'); props[int(k,16)]=s
TYPES={0x1e:'Animation',0x61:'RotateKeyframe',0x48:'AlphaKeyframe?',0x49:'Keyframe',0x2f:'TransformAnimation?'}
def cval(i):
    t,body=consts[i]; b=bytes.fromhex(body); t=int(t,16)
    if t==0x1c: return f'{struct.unpack("<f",b)[0]:.6g}'
    if t==0x0e: return str(struct.unpack('<i',b)[0])
    if t==0x62:
        x,y,z,a=struct.unpack('<4f',b[:16]); return f'Rot({math.degrees(a):.4g}deg axis {x:g},{y:g},{z:g})'
    if t==0x63:
        k,w=struct.unpack('<if',b); return f'Interp(type={k},w={w:g})'
    if t==0x60: return 'Vec3(%g,%g,%g)'%struct.unpack('<3f',b)
    if t==0x05: return repr(strs[struct.unpack('<i',b)[0]])
    if t==0x47: return f'AnimType={struct.unpack("<i",b)[0]}'
    return f't{t:x}:{body}'
for f in sys.argv[1:]:
    d=open(f'/tmp/wp8-uix/ShellControls/10__{f}.UIX','rb').read()
    objs,obje=struct.unpack_from('<II',d,9)
    print('=====',f)
    i=objs
    while i<obje-3:
        if d[i]==0x01 and struct.unpack_from('<H',d,i+1)[0] in (0x1e,0x2f):
            j=i; lines=[]; stack=None
            while j<obje-2:
                op=d[j]; a=struct.unpack_from('<H',d,j+1)[0]
                if op==0x01: lines.append(f'  new {TYPES.get(a,hex(a))}')
                elif op==0x25: stack=cval(a) if a in consts else f'c{a}'
                elif op in (0x0c,0x0e): lines.append(f'    {"." if op==0x0c else "+"}{props.get(a,hex(a))} = {stack if op==0x0c else ""}'); stack=None
                else: break
                j+=3
            if len(lines)>2:
                print(f'@{i:x}-{j:x} stop={d[j:j+6].hex()}'); print('\n'.join(lines))
            i=j if j>i else i+1
        else: i+=1
