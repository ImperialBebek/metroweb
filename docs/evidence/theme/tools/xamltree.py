import xml.parsers.expat, sys, json, re
class N:
    __slots__=('tag','attrs','line','children','parent','end','text')
    def __init__(s,tag,attrs,line,parent):
        s.tag=tag;s.attrs=attrs;s.line=line;s.children=[];s.parent=parent;s.end=None;s.text=''
def parse(path):
    data=open(path,'rb').read()
    p=xml.parsers.expat.ParserCreate()
    root=N('#root',{},0,None); cur=[root]
    def st(tag,attrs):
        n=N(tag,attrs,p.CurrentLineNumber,cur[-1]); cur[-1].children.append(n); cur.append(n)
    def en(tag):
        cur[-1].end=p.CurrentLineNumber; cur.pop()
    def cd(t):
        cur[-1].text+=t
    p.StartElementHandler=st; p.EndElementHandler=en; p.CharacterDataHandler=cd
    p.Parse(data,True)
    return root
def walk(n):
    yield n
    for c in n.children: yield from walk(c)
