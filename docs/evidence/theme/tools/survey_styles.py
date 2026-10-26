import sys; sys.path.insert(0, sys.argv[1])
from xamltree import *
root=parse(sys.argv[2])
top=root.children[0]
for c in top.children:
    k=c.attrs.get('x:Key') or c.attrs.get('x:Name') or ''
    tt=c.attrs.get('TargetType','')
    nsb=sum(1 for n in walk(c) if n.tag=='Storyboard')
    print(f"{c.line}-{c.end}\t{c.tag}\t{tt}\t{k}\tSB={nsb}")
