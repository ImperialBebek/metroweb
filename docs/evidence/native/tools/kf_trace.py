import sys
import os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from petool import *
from emu import *
S=os.path.join(os.environ['WP81_SYSTEM32'], '')  # the 8.1 emulator image's Windows/system32
p=PE(S+'WINDOWS.UI.XAML.PHONE.DLL'); p.imports()
funcs={0xec6e8:'ftol2',0x8d511:'ADDKF',0xd9a9a:'EXPEASE',0x8d4b2:'BIND',0x8ee34:'MKHSTR',0xea8c9:'new'}
class E2(Emu):
    def step(s,ins,hook):
        if ins.mnemonic in('mov','lea') and ins.operands[0].type==X86_OP_REG:
            s.src=getattr(s,'src',{}); s.src[p.md.reg_name(ins.operands[0].reg)]=ins.op_str.split(',',1)[1].strip()
        Emu.step(s,ins,hook)
out=[]
def hook(e,addr,t,ins):
    n=funcs.get(t)
    src=getattr(e,'src',{})
    if n=='ADDKF':
        st=show_struct(e,e.stk[-1] if e.stk else None)
        out.append('%x ADDKF vec=%s  t=%s value=%s ease=%s x=%s'%(addr,src.get('ecx'),fmt(st[0]),fmt(st[2]),fmt(st[4]),fmt(st[5])))
    elif n=='EXPEASE':
        d=[x for x in e.stk if isinstance(x,tuple) and x[0]=='dbl']
        out.append('%x EXPEASE exp=%s mode(ecx)=%s src=%s out(edx)=%s'%(addr,d[-1][1] if d else '?',fmt(e.r['ecx']),src.get('ecx'),src.get('edx')))
    elif n=='BIND':
        st=show_struct(e,e.stk[-1] if e.stk else None,3)
        out.append('%x BIND into=%s  target=%s path=%s vec=%s'%(addr,src.get('ecx'),*[fmt(x) for x in st]))
    elif n=='MKHSTR':
        a=e.stk[-1] if e.stk else 0
        out.append('%x HSTR %s = %s'%(addr,src.get('ecx'),p.wstr(a-p.base) if isinstance(a,int) else a))
    elif t is not None and t not in (0x26855,0x7014e,0x27f12,0x8d6eb,0xebf8e,0xebaed) and n is None:
        out.append('%x call %x'%(addr,t+p.base))
e=E2(p,funcs)
e.run(int(sys.argv[1],16),int(sys.argv[2],16),hook)
out+=e.events
print('\n'.join(out))
