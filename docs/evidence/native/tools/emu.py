import sys, struct
import os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from petool import *
from capstone.x86 import *

def num(x): return isinstance(x,(int,float))
def fmt(x):
    if isinstance(x,float): return '%g'%x
    if isinstance(x,int): return hex(x) if abs(x)>=0x1000 else str(x)
    return str(x)
def bin_(op,a,b):
    if num(a) and num(b):
        try:
            return {'+':a+b,'-':a-b,'*':a*b,'/':a/b if b else float('nan')}[op]
        except Exception: pass
    return '(%s%s%s)'%(fmt(a),op,fmt(b))

class Emu:
    def __init__(s,p,funcs,ret_names=None):
        s.p=p; s.funcs=funcs; s.reset()
        s.events=[]
    def reset(s):
        s.r={k:'?'+k for k in ['eax','ebx','ecx','edx','esi','edi']}
        s.m={}; s.fs=[]; s.stk=[]
    def memkey(s,op):
        mm=op.mem
        base=s.p.md.reg_name(mm.base) if mm.base else None
        if base=='ebp' and mm.index==0: return ('ebp',mm.disp)
        if base=='esp' and mm.index==0: return ('esp',mm.disp)
        if mm.base==0 and mm.index==0: return ('abs',mm.disp&0xffffffff)
        if base and mm.index==0: return ('ind',base,mm.disp)
        return None
    def rd(s,op,size=4):
        if op.type==X86_OP_IMM: return op.imm & 0xffffffff
        if op.type==X86_OP_REG:
            n=s.p.md.reg_name(op.reg)
            if n in s.r: return s.r[n]
            if n in ('al','cl','dl','bl'): return s.r[{'al':'eax','cl':'ecx','dl':'edx','bl':'ebx'}[n]]
            return '?'+n
        k=s.memkey(op)
        if k is None: return '?mem'
        if k[0]=='abs':
            rva=k[1]-s.p.base
            if 0<=rva<len(s.p.img):
                if op.size==8: return s.p.f64(rva)
                return s.p.u32(rva)
            return '?abs'
        if k[0]=='ind':
            b=s.r.get(k[1],'?')
            return '*(%s+%#x)'%(fmt(b),k[2])
        return s.m.get(k,'[%s%+#x]'%(k[0],k[1]))
    def wr(s,op,v):
        if op.type==X86_OP_REG:
            n=s.p.md.reg_name(op.reg)
            if n in s.r: s.r[n]=v
            return
        k=s.memkey(op)
        if k and k[0] in ('ebp','esp'): s.m[k]=v
    def frd(s,op):
        if op.type==X86_OP_REG:
            n=s.p.md.reg_name(op.reg)
            i=int(n[3:-1]) if n.startswith('st(') else 0
            return s.fs[i] if i<len(s.fs) else '?st'
        k=s.memkey(op)
        if k and k[0]=='abs':
            rva=k[1]-s.p.base
            return s.p.f64(rva) if op.size==8 else s.p.f32(rva)
        if k: return s.m.get(k,'[%s%+#x]'%(k[0],k[1]) if k[0]!='ind' else '*(%s+%#x)'%(s.r.get(k[1]),k[2]))
        return '?fm'
    def fpop(s):
        return s.fs.pop(0) if s.fs else '?st'
    def run(s,a,b,hook):
        off=a
        while off<b:
            ins=None
            for ins in s.p.md.disasm(s.p.img[off:b], s.p.base+off):
                s.step(ins,hook)
                off=ins.address-s.p.base+ins.size
            if off<b: off+=1
    def step(s,ins,hook):
        m=ins.mnemonic; ops=ins.operands; addr=ins.address-s.p.base
        try:
            if m=='mov' or m=='movzx':
                s.wr(ops[0],s.rd(ops[1]))
            elif m=='lea':
                k=s.memkey(ops[1])
                v=('&%s%+#x'%(k[0],k[1])) if k and k[0] in('ebp','esp') else '?lea'
                if k and k[0]=='ebp': v=('&',k[1])
                s.wr(ops[0],v)
            elif m=='and' and ops[1].type==X86_OP_IMM and ops[1].imm==0: s.wr(ops[0],0)
            elif m=='or' and ops[1].type==X86_OP_IMM and ops[1].imm==-1: s.wr(ops[0],0xffffffff)
            elif m=='xor' and ops[0].type==X86_OP_REG and ops[1].type==X86_OP_REG and ops[0].reg==ops[1].reg: s.wr(ops[0],0)
            elif m in('add','sub','imul') and len(ops)==2:
                s.wr(ops[0],bin_({'add':'+','sub':'-','imul':'*'}[m],s.rd(ops[0]),s.rd(ops[1])))
            elif m in('sbb','adc'):
                s.wr(ops[0],'hi')
            elif m=='push':
                s.stk.append(s.rd(ops[0]))
            elif m=='pop':
                s.wr(ops[0],s.stk.pop() if s.stk else '?pop')
            elif m=='fldz': s.fs.insert(0,0.0)
            elif m=='fld1': s.fs.insert(0,1.0)
            elif m=='fld': s.fs.insert(0,s.frd(ops[0]))
            elif m=='fild': 
                v=s.rd(ops[0]); s.fs.insert(0,('int(%s)'%fmt(v)) if not num(v) else float(v))
            elif m in('fst','fstp'):
                v=s.fs[0] if s.fs else '?st'
                if ops[0].type==X86_OP_REG:
                    n=s.p.md.reg_name(ops[0].reg); i=int(n[3:-1]) if '(' in n else 0
                    if i<len(s.fs): s.fs[i]=v
                else:
                    k=s.memkey(ops[0])
                    if k and k[0] in('ebp','esp'):
                        s.m[k]=v
                        if ops[0].size==8: s.m[(k[0],k[1]+4)]='hi'
                    if k and k[0]=='esp' and k[1]==0: s.stk.append(('dbl',v))
                if m=='fstp': s.fpop()
            elif m in('fmul','fadd','fsub','fdiv','fsubr','fdivr') and len(ops)==1:
                v=s.frd(ops[0]); 
                if m=='fsubr': s.fs[0]=bin_('-',v,s.fs[0])
                elif m=='fdivr': s.fs[0]=bin_('/',v,s.fs[0])
                else: s.fs[0]=bin_({'fmul':'*','fadd':'+','fsub':'-','fdiv':'/'}[m],s.fs[0],v)
            elif m in('fmulp','faddp','fsubp','fdivp','fsubrp','fdivrp'):
                n=s.p.md.reg_name(ops[0].reg) if ops else 'st(1)'; i=int(n[3:-1]) if '(' in n else 1
                a=s.fs[i] if i<len(s.fs) else '?'; b=s.fs[0] if s.fs else '?'
                o={'fmulp':'*','faddp':'+','fsubp':'-','fdivp':'/','fsubrp':'-r','fdivrp':'/r'}[m]
                if o=='-r': v=bin_('-',b,a)
                elif o=='/r': v=bin_('/',b,a)
                else: v=bin_(o,a,b)
                if i<len(s.fs): s.fs[i]=v
                s.fpop()
            elif m in('fmul','fadd','fsub','fdiv') and len(ops)==2:
                i0=int(s.p.md.reg_name(ops[0].reg)[3:-1]) if '(' in s.p.md.reg_name(ops[0].reg) else 0
                i1=int(s.p.md.reg_name(ops[1].reg)[3:-1]) if '(' in s.p.md.reg_name(ops[1].reg) else 0
                if max(i0,i1)<len(s.fs): s.fs[i0]=bin_({'fmul':'*','fadd':'+','fsub':'-','fdiv':'/'}[m],s.fs[i0],s.fs[i1])
            elif m=='fxch':
                n=s.p.md.reg_name(ops[0].reg) if ops else 'st(1)'; i=int(n[3:-1]) if '(' in n else 1
                if i<len(s.fs): s.fs[0],s.fs[i]=s.fs[i],s.fs[0]
            elif m in('fcomp','fstp_'): s.fpop()
            elif m=='fcompp': s.fpop(); s.fpop()
            elif m=='fchs': s.fs[0]=bin_('*',s.fs[0],-1.0)
            elif m=='call':
                t=ops[0].imm-s.p.base if ops[0].type==X86_OP_IMM else None
                hook(s,addr,t,ins)
                if t is not None and s.funcs.get(t)=='ftol2':
                    v=s.fpop(); s.r['eax']=('ftol(%s)'%fmt(v)) if not num(v) else int(v); s.r['edx']='hi'
                else:
                    s.r['eax']='ret@%x'%addr; s.r['ecx']='?'; s.r['edx']='?'
                s.stk=[]
            elif m.startswith('ret'):
                s.stk=[]
        except Exception as e:
            s.events.append('%x EMUERR %s %s'%(addr,ins.mnemonic,e))

def show_struct(e,ptr,n=6):
    if isinstance(ptr,tuple) and ptr[0]=='&':
        d=ptr[1]
        return [e.m.get(('ebp',d+4*i),'?') for i in range(n)]
    return ['?ptr=%s'%(ptr,)]
