import emu
_orig=emu.Emu.step
def step(s,ins,hook):
    m=ins.mnemonic; ops=ins.operands
    if not hasattr(s,'msrc'): s.msrc={}; s.src={}
    if m=='fadd' and len(ops)==1 and ops[0].type==emu.X86_OP_MEM and ops[0].mem.base==0 and (ops[0].mem.disp&0xffffffff)-s.p.base==0x25440:
        return
    if m=='mov' and ops[0].type==emu.X86_OP_MEM:
        k=s.memkey(ops[0])
        if k and k[0]=='ebp':
            if ops[1].type==emu.X86_OP_REG:
                rn=s.p.md.reg_name(ops[1].reg); s.msrc[k[1]]=s.src.get(rn,rn)
            else: s.msrc[k[1]]=ins.op_str.split(',',1)[1].strip()
    if m in('mov','lea') and ops[0].type==emu.X86_OP_REG:
        s.src[s.p.md.reg_name(ops[0].reg)]=ins.op_str.split(',',1)[1].strip()
    _orig(s,ins,hook)
emu.Emu.step=step
