import struct,sys
path=sys.argv[1]
d=open(path,'rb').read()
# find constant offset table: u16 n then n+1 u32 offsets starting at 0, increasing, last offset == records size, records follow
best=None
for i in range(0,len(d)-10):
    n=struct.unpack_from('<H',d,i)[0]
    if n<5 or i+2+(n+1)*4>len(d): continue
    if struct.unpack_from('<I',d,i+2)[0]!=(n+1)*4: continue
    offs=struct.unpack_from('<%dI'%(n+1),d,i+2)
    if all(0<offs[k+1]-offs[k]<200 for k in range(n)):
        best=(i,n,offs); break
i,n,offs=best
base=i+2
print('table at',hex(i),'count',n,'records base',hex(base),'end',hex(base+offs[-1]))
for k in range(n):
    r=d[base+offs[k]:base+offs[k+1]]
    t=struct.unpack_from('<H',r,0)[0]; mode=r[2]; body=r[3:]
    desc=''
    if mode==1 or mode==2:
        desc='str#%d'%struct.unpack_from('<i',body,0)[0]
    elif len(body)%4==0 or len(body)%4==1:
        fl=[struct.unpack_from('<f',body,j)[0] for j in range(0,len(body)-3,4)]
        it=[struct.unpack_from('<i',body,j)[0] for j in range(0,len(body)-3,4)]
        desc='f='+','.join(f'{x:.6g}' for x in fl)+' i='+','.join(map(str,it))
    print(f'{k}\t@{base+offs[k]:x}\tt=0x{t:x}\tm={mode}\t{body.hex()}\t{desc}')
