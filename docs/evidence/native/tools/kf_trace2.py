import sys
import os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from petool import *
import emu_patch
from emu import *
S=os.path.join(os.environ['WP81_SYSTEM32'], '')  # the 8.1 emulator image's Windows/system32
p=PE(S+'WINDOWS.UI.XAML.PHONE.DLL'); p.imports()
funcs={0xec6e8:'ftol2',0x8d511:'ADDKF',0xd9a9a:'EXPEASE',0x8d4b2:'BIND',0x8ee34:'MKHSTR',0xea8c9:'new'}
out=[]
def hook(e,addr,t,ins):
    n=funcs.get(t)
    src=e.src
    if n=='ADDKF':
        ptr=e.stk[-1] if e.stk else None
        if isinstance(ptr,tuple) and ptr[0]=='&':
            d=ptr[1]
            tv=e.m.get(('ebp',d),'?'); v=e.m.get(('ebp',d+8),'?'); ez=e.msrc.get(d+0x10,'-'); x=e.msrc.get(d+0x14,'-')
            out.append('%x KF vec=%-22s t=%-34s v=%-6s ease<-%s  f14<-%s'%(addr,src.get('ecx'),fmt(tv),fmt(v),ez,x))
        else: out.append('%x KF ?'%addr)
    elif n=='EXPEASE':
        d=[x for x in e.stk if isinstance(x,tuple) and x[0]=='dbl']
        out.append('%x EXPEASE exp=%s mode(ecx)=%s out(edx)<-%s'%(addr,fmt(d[-1][1]) if d else '?',fmt(e.r['ecx']),src.get('edx')))
    elif n=='BIND':
        ptr=e.stk[-1] if e.stk else None
        if isinstance(ptr,tuple) and ptr[0]=='&':
            d=ptr[1]
            out.append('%x BIND target<-%s path<-%s vec<-%s'%(addr,e.msrc.get(d,'?'),e.msrc.get(d+4,'?'),e.msrc.get(d+8,'?')))
    elif n=='MKHSTR':
        a=e.stk[-1] if e.stk else 0
        out.append('%x HSTR %s = %s'%(addr,src.get('ecx'),p.wstr(a-p.base) if isinstance(a,int) else a))
e=Emu(p,funcs)
e.run(int(sys.argv[1],16),int(sys.argv[2],16),hook)
out+=e.events
print('\n'.join(out))
