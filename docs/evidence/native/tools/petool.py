import pefile, re, struct, sys, os
from capstone import *
from capstone.x86 import *

class PE:
    def __init__(s, path):
        s.path=path
        s.data=open(path,'rb').read()
        s.pe=pefile.PE(data=s.data, fast_load=True)
        s.base=s.pe.OPTIONAL_HEADER.ImageBase
        s.secs=[(x.Name.rstrip(b'\0').decode(), x.VirtualAddress, max(x.Misc_VirtualSize,x.SizeOfRawData), x.PointerToRawData, x.SizeOfRawData) for x in s.pe.sections]
        s.md=Cs(CS_ARCH_X86, CS_MODE_32); s.md.detail=True
        # image buffer
        size=s.pe.OPTIONAL_HEADER.SizeOfImage
        img=bytearray(size)
        img[:0x1000]=s.data[:0x1000]
        for n,va,vs,raw,rs in s.secs:
            img[va:va+rs]=s.data[raw:raw+rs][:max(0,min(rs,size-va))]
        s.img=bytes(img)
        t=[x for x in s.secs if x[0]=='.text'][0]
        s.text=(t[1],t[1]+t[2])
    def u32(s,rva): return struct.unpack_from('<I',s.img,rva)[0]
    def f32(s,rva): return struct.unpack_from('<f',s.img,rva)[0]
    def f64(s,rva): return struct.unpack_from('<d',s.img,rva)[0]
    def find_all(s,pat):
        return [m.start() for m in re.finditer(re.escape(pat), s.img)]
    def wstr(s,rva,maxl=200):
        out=[]
        for i in range(maxl):
            c=struct.unpack_from('<H',s.img,rva+2*i)[0]
            if c==0: break
            out.append(chr(c))
        return ''.join(out)
    def astr(s,rva,maxl=200):
        e=s.img.find(b'\0',rva,rva+maxl); return s.img[rva:e].decode('latin1')
    def xrefs(s,rva):
        va=struct.pack('<I',s.base+rva)
        return [m for m in s.find_all(va)]
    def dis(s,rva,n=200,stop_ret=True):
        out=[]
        code=s.img[rva:rva+n*15]
        for ins in s.md.disasm(code, s.base+rva):
            out.append(ins)
            if len(out)>=n: break
            if stop_ret and ins.mnemonic in ('ret',) : break
        return out
    def funcstart(s,rva,maxback=0x3000):
        # look back for padding+prologue
        for a in range(rva, max(s.text[0],rva-maxback), -1):
            b=s.img[a:a+5]
            if b[:5]==b'\x8b\xff\x55\x8b\xec' and s.img[a-1] in (0xcc,0x90,0xc3,0xc2,0x00) :
                return a
            if b[:3]==b'\x55\x8b\xec' and s.img[a-1] in (0xcc,0x90):
                return a
        return None

def _imports(s):
    s.pe.parse_data_directories(directories=[pefile.DIRECTORY_ENTRY['IMAGE_DIRECTORY_ENTRY_IMPORT'],pefile.DIRECTORY_ENTRY['IMAGE_DIRECTORY_ENTRY_EXPORT']])
    m={}
    for imp in getattr(s.pe,'DIRECTORY_ENTRY_IMPORT',[]):
        for i in imp.imports:
            m[i.address-s.base]= (imp.dll.decode()+'!'+(i.name.decode() if i.name else str(i.ordinal)))
    s.impmap=m
    s.expmap={}
    if hasattr(s.pe,'DIRECTORY_ENTRY_EXPORT'):
        for x in s.pe.DIRECTORY_ENTRY_EXPORT.symbols:
            if x.name: s.expmap[x.address]=x.name.decode()
PE.imports=_imports

def _isprint_w(s,rva):
    try:
        t=s.wstr(rva,80)
    except Exception: return None
    if len(t)>=3 and all(32<=ord(c)<127 for c in t): return t
    return None
def _isprint_a(s,rva):
    try: t=s.astr(rva,80)
    except Exception: return None
    if len(t)>=4 and all(32<=ord(c)<127 for c in t): return t
    return None

def _annot(s,ins):
    notes=[]
    for op in ins.operands:
        if op.type==X86_OP_IMM:
            v=op.imm & 0xffffffff
            rva=v-s.base
            if 0<rva<len(s.img):
                w=_isprint_w(s,rva)
                if w: notes.append('L"%s"'%w)
                elif rva in s.expmap: notes.append(s.expmap[rva])
            else:
                f=struct.unpack('<f',struct.pack('<I',v))[0]
                if v>0x10000 and 1e-4<abs(f)<1e7: notes.append('f=%g'%f)
                if v>=1000 and v<=100000000: notes.append('d=%d'%v)
        elif op.type==X86_OP_MEM and op.mem.base==0 and op.mem.index==0:
            rva=(op.mem.disp & 0xffffffff)-s.base
            if 0<=rva<len(s.img)-8:
                if rva in getattr(s,'impmap',{}): notes.append(s.impmap[rva])
                else:
                    sz=op.size
                    if sz==4: notes.append('[f32=%g u32=%#x]'%(s.f32(rva),s.u32(rva)))
                    elif sz==8: notes.append('[f64=%g]'%s.f64(rva))
                    else: notes.append('[f32=%g f64=%g u32=%#x]'%(s.f32(rva),s.f64(rva),s.u32(rva)))
    return notes
PE.annot=_annot

def _dump(s,rva,n=400,stop_ret=False,out=None):
    lines=[]
    for ins in s.dis(rva,n,stop_ret):
        a=s.annot(ins)
        lines.append('%08x  %-8s %-50s %s'%(ins.address-s.base, ins.mnemonic, ins.op_str, ('; '+' | '.join(a)) if a else ''))
    return '\n'.join(lines)
PE.dump=_dump
